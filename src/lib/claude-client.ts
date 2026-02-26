/**
 * Claude Client with MCP Tools Support
 *
 * This module provides a wrapper around Anthropic SDK that integrates
 * with MCP (Model Context Protocol) servers to enable tool use.
 */

import Anthropic from '@anthropic-ai/sdk'
import { spawn } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'

export interface MCPTool {
  name: string
  description: string
  input_schema: Record<string, any>
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeResponse {
  content: string
  tool_calls?: ToolCall[]
  stop_reason: string
}

export interface ToolCall {
  tool: string
  input: Record<string, any>
  result: string
}

/**
 * Claude Client with MCP tool support
 */
export class ClaudeClient {
  private client: Anthropic
  private mcpTools: Map<string, MCPTool>

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    })
    this.mcpTools = new Map()
  }

  /**
   * Load available MCP tools from .claude.json configuration
   */
  async loadMCPTools(): Promise<void> {
    const configPath = join(process.cwd(), '.claude.json')
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))

    // For each MCP server, get available tools
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      const tools = await this.getMCPServerTools(serverName, serverConfig as any)
      tools.forEach(tool => {
        this.mcpTools.set(tool.name, tool)
      })
    }
  }

  /**
   * Get tools from a specific MCP server
   */
  private async getMCPServerTools(
    serverName: string,
    config: { command: string; args: string[]; env?: Record<string, string> }
  ): Promise<MCPTool[]> {
    return new Promise((resolve, _reject) => {
      const env = {
        ...process.env,
        ...config.env
      }

      const proc = spawn(config.command, [...config.args, '--list-tools'], {
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', data => {
        stdout += data.toString()
      })

      proc.stderr.on('data', data => {
        stderr += data.toString()
      })

      proc.on('close', code => {
        if (code !== 0) {
          console.error(`MCP server ${serverName} error:`, stderr)
          resolve([])
          return
        }

        try {
          const tools = JSON.parse(stdout)
          resolve(tools)
        } catch (error) {
          console.error(`Failed to parse tools from ${serverName}:`, error)
          resolve([])
        }
      })

      setTimeout(() => {
        proc.kill()
        resolve([])
      }, 5000)
    })
  }

  /**
   * Call a specific MCP tool
   */
  async callMCPTool(toolName: string, input: Record<string, any>): Promise<string> {
    const configPath = join(process.cwd(), '.claude.json')
    const config = JSON.parse(readFileSync(configPath, 'utf-8'))

    // Find which server provides this tool
    let serverConfig: any = null

    for (const [name, cfg] of Object.entries(config.mcpServers)) {
      // Check if this server provides the tool
      // For now, we'll use a naming convention: tool names are prefixed with server name
      if (toolName.startsWith(name) || this.mcpTools.get(toolName)) {
        serverConfig = cfg
        void name
        break
      }
    }

    if (!serverConfig) {
      throw new Error(`No MCP server found for tool: ${toolName}`)
    }

    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        ...(serverConfig as any).env
      }

      const proc = spawn(
        (serverConfig as any).command,
        [...(serverConfig as any).args, '--call-tool', toolName, JSON.stringify(input)],
        {
          env,
          stdio: ['pipe', 'pipe', 'pipe']
        }
      )

      let stdout = ''
      let stderr = ''

      proc.stdout.on('data', data => {
        stdout += data.toString()
      })

      proc.stderr.on('data', data => {
        stderr += data.toString()
      })

      proc.on('close', code => {
        if (code !== 0) {
          reject(new Error(`Tool ${toolName} failed: ${stderr}`))
          return
        }

        try {
          const result = JSON.parse(stdout)
          resolve(result.content || JSON.stringify(result))
        } catch (error) {
          resolve(stdout)
        }
      })

      setTimeout(() => {
        proc.kill()
        reject(new Error(`Tool ${toolName} timed out`))
      }, 30000)
    })
  }

  /**
   * Send a message to Claude with MCP tool support
   */
  async sendMessage(
    systemPrompt: string,
    userMessage: string,
    conversationHistory: ConversationMessage[] = [],
    maxIterations = 5
  ): Promise<ClaudeResponse> {
    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: userMessage
      }
    ]

    // Convert MCP tools to Anthropic tool format
    const tools: Anthropic.Tool[] = Array.from(this.mcpTools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema as Anthropic.Tool.InputSchema
    }))

    let finalResponse: ClaudeResponse = {
      content: '',
      tool_calls: [],
      stop_reason: ''
    }

    // Agentic loop: allow Claude to use tools iteratively
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: tools.length > 0 ? tools : undefined
      })

      // Check stop reason
      if (response.stop_reason === 'end_turn') {
        // Claude finished without needing tools
        const textContent = response.content.find(block => block.type === 'text')
        finalResponse.content = textContent && 'text' in textContent ? textContent.text : ''
        finalResponse.stop_reason = response.stop_reason
        break
      }

      if (response.stop_reason === 'tool_use') {
        // Claude wants to use tools
        const toolUseBlocks = response.content.filter(
          block => block.type === 'tool_use'
        ) as Anthropic.ToolUseBlock[]

        if (toolUseBlocks.length === 0) {
          // No tool use blocks, treat as end
          const textContent = response.content.find(block => block.type === 'text')
          finalResponse.content = textContent && 'text' in textContent ? textContent.text : ''
          finalResponse.stop_reason = response.stop_reason
          break
        }

        // Execute each tool
        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const toolUse of toolUseBlocks) {
          try {
            const toolInput = toolUse.input as Record<string, any>
            const result = await this.callMCPTool(toolUse.name, toolInput)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result
            })

            finalResponse.tool_calls?.push({
              tool: toolUse.name,
              input: toolInput,
              result
            })
          } catch (error: any) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Error: ${error.message}`,
              is_error: true
            })
          }
        }

        // Add assistant response + tool results to conversation
        messages.push({
          role: 'assistant',
          content: response.content
        })

        messages.push({
          role: 'user',
          content: toolResults
        })

        // Continue loop to get next response
        continue
      }

      // Other stop reasons (max_tokens, stop_sequence, etc)
      const textContent = response.content.find(block => block.type === 'text')
      finalResponse.content = textContent && 'text' in textContent ? textContent.text : ''
      finalResponse.stop_reason = response.stop_reason || ''
      break
    }

    return finalResponse
  }

  /**
   * Get available MCP tools
   */
  getAvailableTools(): MCPTool[] {
    return Array.from(this.mcpTools.values())
  }
}
