/**
 * Telegram User Client (MTProto)
 *
 * Provides access to Telegram Client API for reading chat history.
 * Uses telegram library for MTProto protocol.
 */

import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'

export interface ChatMessage {
  id: string
  sender_id: string
  sender_name: string
  sender_username?: string
  content: string
  timestamp: Date
}

export interface ChatInfo {
  id: string
  username?: string
  title: string
  type: 'user' | 'group' | 'channel'
  participants_count?: number
}

export class TelegramUserClient {
  private client: TelegramClient
  private session: StringSession

  constructor(apiId: string, apiHash: string, sessionString: string = '') {
    this.session = new StringSession(sessionString)
    this.client = new TelegramClient(this.session, parseInt(apiId), apiHash, {
      connectionRetries: 5,
    })
  }

  /**
   * Connect and authorize the client
   */
  async connect(): Promise<void> {
    await this.client.connect()
  }

  /**
   * Get session string for storage
   */
  getSessionString(): string {
    return this.client.session.save() as any as string
  }

  /**
   * Get chat history from a user, group, or channel
   */
  async getChatHistory(
    username: string,
    limit: number = 100,
    daysBack: number = 7
  ): Promise<ChatMessage[]> {
    try {
      // Remove @ if present
      const cleanUsername = username.startsWith('@') ? username.slice(1) : username

      // Get entity (user, group, or channel)
      const entity = await this.client.getEntity(cleanUsername)

      // Calculate offset date
      const offsetDate = new Date()
      offsetDate.setDate(offsetDate.getDate() - daysBack)

      // Get messages
      const messages = await this.client.getMessages(entity, {
        limit,
        offsetDate: Math.floor(offsetDate.getTime() / 1000),
      })

      // Format messages
      const formattedMessages: ChatMessage[] = []

      for (const message of messages) {
        if (!message || !message.message) {
          continue
        }

        // Get sender info
        let senderName = 'Unknown'
        let senderUsername: string | undefined
        let senderId = message.senderId?.toString() || 'unknown'

        if (message.sender) {
          const sender = message.sender as any
          if (sender.firstName || sender.lastName) {
            senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ')
          }
          if (sender.username) {
            senderUsername = sender.username
          }
          if (sender.id) {
            senderId = sender.id.toString()
          }
        }

        formattedMessages.push({
          id: message.id.toString(),
          sender_id: senderId,
          sender_name: senderName,
          sender_username: senderUsername,
          content: message.message,
          timestamp: new Date(message.date * 1000),
        })
      }

      // Reverse to get chronological order
      return formattedMessages.reverse()
    } catch (error: any) {
      throw new Error(`Failed to get chat history: ${error.message}`)
    }
  }

  /**
   * Search for a user by username
   */
  async searchUser(username: string): Promise<ChatInfo | null> {
    try {
      const cleanUsername = username.startsWith('@') ? username.slice(1) : username

      const entity = await this.client.getEntity(cleanUsername)

      if (!entity) {
        return null
      }

      const entityObj = entity as any

      return {
        id: entityObj.id?.toString() || 'unknown',
        username: entityObj.username,
        title: entityObj.title || [entityObj.firstName, entityObj.lastName].filter(Boolean).join(' '),
        type: entityObj.broadcast ? 'channel' : entityObj.megagroup || entityObj.gigagroup ? 'group' : 'user',
        participants_count: entityObj.participantsCount,
      }
    } catch (error: any) {
      return null
    }
  }

  /**
   * Get chat info
   */
  async getChatInfo(username: string): Promise<ChatInfo | null> {
    return this.searchUser(username)
  }

  /**
   * Disconnect the client
   */
  async disconnect(): Promise<void> {
    await this.client.disconnect()
  }
}
