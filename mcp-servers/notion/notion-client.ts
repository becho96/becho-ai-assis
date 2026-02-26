/**
 * Notion API client wrapper
 */

import { Client } from '@notionhq/client'

export interface NotionConfig {
  knowledgeDbId?: string
  tasksDbId?: string
  dailyLogDbId?: string
}

export class NotionClient {
  private client: Client
  private config: NotionConfig

  constructor(auth: string, config: NotionConfig = {}) {
    this.client = new Client({ auth })
    this.config = config
  }

  getClient() {
    return this.client
  }

  getDatabaseId(database: 'knowledge' | 'tasks' | 'daily_log'): string {
    const map = {
      knowledge: this.config.knowledgeDbId,
      tasks: this.config.tasksDbId,
      daily_log: this.config.dailyLogDbId,
    }

    const id = map[database]
    if (!id) {
      throw new Error(
        `Database ID for "${database}" not configured in environment`
      )
    }

    return id
  }

  async search(query: string, filter?: 'page' | 'database') {
    const searchParams: any = {
      query,
    }

    if (filter) {
      searchParams.filter = {
        property: 'object',
        value: filter,
      }
    }

    return this.client.search(searchParams)
  }

  async createPage(databaseId: string, properties: any, content?: string) {
    const pageData: any = {
      parent: { database_id: databaseId },
      properties,
    }

    if (content) {
      pageData.children = [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: { content },
              },
            ],
          },
        },
      ]
    }

    return this.client.pages.create(pageData)
  }

  async updatePage(pageId: string, properties?: any) {
    return this.client.pages.update({
      page_id: pageId,
      properties: properties || {},
    })
  }

  async queryDatabase(
    databaseId: string,
    filter?: any,
    sorts?: any[],
    limit = 10
  ) {
    const query: any = {
      database_id: databaseId,
      page_size: limit,
    }

    if (filter) {
      query.filter = filter
    }

    if (sorts) {
      query.sorts = sorts
    }

    return this.client.databases.query(query)
  }

  async getPage(pageId: string) {
    return this.client.pages.retrieve({ page_id: pageId })
  }

  async archivePage(pageId: string) {
    return this.client.pages.update({
      page_id: pageId,
      archived: true,
    })
  }
}
