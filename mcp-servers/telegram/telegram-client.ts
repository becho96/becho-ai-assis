/**
 * Telegram Bot API client wrapper
 */

export class TelegramClient {
  private botToken: string
  private authorizedUserId?: string

  constructor(botToken: string, authorizedUserId?: string) {
    this.botToken = botToken
    this.authorizedUserId = authorizedUserId
  }

  private async apiCall(method: string, params: any = {}) {
    const url = `https://api.telegram.org/bot${this.botToken}/${method}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    const data: any = await response.json()

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`)
    }

    return data.result
  }

  async sendMessage(
    chatId: string,
    text: string,
    parseMode: string = 'Markdown'
  ) {
    return this.apiCall('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    })
  }

  getAuthorizedChatId(): string {
    if (!this.authorizedUserId) {
      throw new Error('TELEGRAM_AUTHORIZED_USER_ID not configured')
    }
    return this.authorizedUserId
  }
}
