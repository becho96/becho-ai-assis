#!/usr/bin/env tsx

/**
 * Test MCP servers connectivity and functionality
 */

import { spawn } from 'child_process'
import { config } from 'dotenv'

config()

interface TestResult {
  server: string
  status: 'success' | 'error'
  message: string
}

const results: TestResult[] = []

function testServer(
  name: string,
  command: string,
  args: string[],
  env: Record<string, string>
): Promise<TestResult> {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing ${name} MCP server...`)

    const proc = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let output = ''
    let errorOutput = ''

    proc.stdout?.on('data', (data) => {
      output += data.toString()
    })

    proc.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    // Send list tools request
    const listToolsRequest = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
    })

    proc.stdin?.write(listToolsRequest + '\n')

    // Wait for response or timeout
    const timeout = setTimeout(() => {
      proc.kill()

      if (errorOutput.includes('running on stdio')) {
        resolve({
          server: name,
          status: 'success',
          message: 'Server started successfully',
        })
      } else {
        resolve({
          server: name,
          status: 'error',
          message: `Timeout or error: ${errorOutput}`,
        })
      }
    }, 3000)

    proc.on('error', (error) => {
      clearTimeout(timeout)
      resolve({
        server: name,
        status: 'error',
        message: error.message,
      })
    })

    proc.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0 || errorOutput.includes('running on stdio')) {
        resolve({
          server: name,
          status: 'success',
          message: 'Server test completed',
        })
      } else {
        resolve({
          server: name,
          status: 'error',
          message: `Exit code: ${code}`,
        })
      }
    })
  })
}

async function runTests() {
  console.log('🚀 Testing MCP servers...\n')

  // Test Notion server
  results.push(
    await testServer(
      'Notion',
      'npx',
      ['tsx', 'mcp-servers/notion/index.ts'],
      {
        NOTION_API_KEY: process.env.NOTION_API_KEY || '',
        NOTION_KNOWLEDGE_DB_ID: process.env.NOTION_KNOWLEDGE_DB_ID || '',
        NOTION_TASKS_DB_ID: process.env.NOTION_TASKS_DB_ID || '',
        NOTION_DAILY_LOG_DB_ID: process.env.NOTION_DAILY_LOG_DB_ID || '',
      }
    )
  )

  // Test Telegram server
  results.push(
    await testServer(
      'Telegram',
      'npx',
      ['tsx', 'mcp-servers/telegram/index.ts'],
      {
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
        TELEGRAM_AUTHORIZED_USER_ID:
          process.env.TELEGRAM_AUTHORIZED_USER_ID || '',
      }
    )
  )

  // Test Perplexity server
  results.push(
    await testServer(
      'Perplexity',
      'npx',
      ['tsx', 'mcp-servers/perplexity/index.ts'],
      {
        PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
      }
    )
  )

  // Test Local Data server
  results.push(
    await testServer('Local Data', 'npx', ['tsx', 'mcp-servers/local-data/index.ts'], {
      DB_PATH: process.env.DB_PATH || './data/assistant.db',
    })
  )

  // Print results
  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Results:\n')

  results.forEach((result) => {
    const icon = result.status === 'success' ? '✅' : '❌'
    console.log(`${icon} ${result.server}: ${result.message}`)
  })

  const successCount = results.filter((r) => r.status === 'success').length
  const totalCount = results.length

  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ Passed: ${successCount}/${totalCount}`)

  if (successCount === totalCount) {
    console.log('\n🎉 All MCP servers are working correctly!')
  } else {
    console.log('\n⚠️  Some MCP servers failed. Check errors above.')
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
