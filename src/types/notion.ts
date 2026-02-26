/**
 * Notion type definitions
 */

export interface NotionDatabaseSchema {
  parent: {
    type: 'page_id'
    page_id: string
  }
  title: Array<{
    type: 'text'
    text: {
      content: string
    }
  }>
  properties: Record<string, NotionPropertySchema>
}

export interface NotionPropertySchema {
  type: string
  [key: string]: unknown
}

export const KNOWLEDGE_BASE_SCHEMA = {
  Title: { title: {} },
  Category: {
    select: {
      options: [
        { name: 'work', color: 'blue' },
        { name: 'personal', color: 'green' },
        { name: 'learning', color: 'purple' },
        { name: 'health', color: 'pink' },
        { name: 'finance', color: 'yellow' },
        { name: 'other', color: 'gray' },
      ],
    },
  },
  Tags: {
    multi_select: {
      options: [
        { name: 'important', color: 'red' },
        { name: 'idea', color: 'yellow' },
        { name: 'reference', color: 'blue' },
        { name: 'todo', color: 'orange' },
      ],
    },
  },
  Source: { url: {} },
  Status: {
    select: {
      options: [
        { name: 'draft', color: 'gray' },
        { name: 'active', color: 'green' },
        { name: 'archived', color: 'red' },
      ],
    },
  },
  Created: { created_time: {} },
  Updated: { last_edited_time: {} },
}

export const TASKS_SCHEMA = {
  Title: { title: {} },
  Status: {
    select: {
      options: [
        { name: 'todo', color: 'red' },
        { name: 'in_progress', color: 'yellow' },
        { name: 'done', color: 'green' },
        { name: 'cancelled', color: 'gray' },
      ],
    },
  },
  Priority: {
    select: {
      options: [
        { name: 'high', color: 'red' },
        { name: 'medium', color: 'yellow' },
        { name: 'low', color: 'gray' },
      ],
    },
  },
  'Due Date': { date: {} },
  Reminder: { date: {} },
  Assignee: { rich_text: {} },
  Notes: { rich_text: {} },
  Created: { created_time: {} },
}

export const DAILY_LOG_SCHEMA = {
  Date: { title: {} },
  Summary: { rich_text: {} },
  Mood: {
    select: {
      options: [
        { name: 'excellent', color: 'green' },
        { name: 'good', color: 'blue' },
        { name: 'neutral', color: 'yellow' },
        { name: 'tired', color: 'orange' },
        { name: 'stressed', color: 'red' },
      ],
    },
  },
  Energy: {
    select: {
      options: [
        { name: 'high', color: 'green' },
        { name: 'medium', color: 'yellow' },
        { name: 'low', color: 'red' },
      ],
    },
  },
  Created: { created_time: {} },
}
