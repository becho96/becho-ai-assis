/**
 * Perplexity API client wrapper
 */

export class PerplexityClient {
  private apiKey: string
  private baseUrl = 'https://api.perplexity.ai'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async search(query: string, model: string = 'sonar') {
    if (!this.apiKey) {
      throw new Error('Perplexity API key not configured')
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Perplexity API error: ${error}`)
    }

    return response.json() as Promise<any>
  }
}
