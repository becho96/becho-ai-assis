#!/usr/bin/env tsx

/**
 * Setup Notion databases with proper schemas
 */

import { Client } from '@notionhq/client'
import { config } from 'dotenv'
import {
  KNOWLEDGE_BASE_SCHEMA,
  TASKS_SCHEMA,
  DAILY_LOG_SCHEMA,
} from '../src/types/notion.js'

config()

const NOTION_API_KEY = process.env.NOTION_API_KEY
const NOTION_PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID

if (!NOTION_API_KEY) {
  console.error('❌ NOTION_API_KEY not found in environment variables')
  process.exit(1)
}

const notion = new Client({ auth: NOTION_API_KEY })

async function createDatabase(
  title: string,
  properties: Record<string, any>
) {
  console.log(`\n📊 Creating database: ${title}`)

  try {
    let parent

    if (NOTION_PARENT_PAGE_ID) {
      parent = { page_id: NOTION_PARENT_PAGE_ID }
    } else {
      // If no parent page specified, search for existing pages
      const search = await notion.search({
        filter: { property: 'object', value: 'page' },
        page_size: 1,
      })

      if (search.results.length === 0) {
        console.error(
          '❌ No parent page found. Please create a page in Notion first or set NOTION_PARENT_PAGE_ID'
        )
        process.exit(1)
      }

      parent = { page_id: search.results[0].id }
      console.log(`   Using parent page: ${search.results[0].id}`)
    }

    const database = await notion.databases.create({
      parent,
      title: [
        {
          type: 'text',
          text: { content: title },
        },
      ],
      properties,
    })

    console.log(`   ✅ Created: ${database.id}`)
    console.log(`   📋 Add this to your .env file:`)

    if (title === 'Knowledge Base') {
      console.log(`   NOTION_KNOWLEDGE_DB_ID=${database.id}`)
    } else if (title === 'Tasks') {
      console.log(`   NOTION_TASKS_DB_ID=${database.id}`)
    } else if (title === 'Daily Log') {
      console.log(`   NOTION_DAILY_LOG_DB_ID=${database.id}`)
    }

    return database
  } catch (error) {
    if (error instanceof Error) {
      console.error(`   ❌ Failed to create database: ${error.message}`)
    }
    throw error
  }
}

async function setupNotionDatabases() {
  console.log('🚀 Setting up Notion databases...')
  console.log('🔑 Using API key:', NOTION_API_KEY?.substring(0, 15) + '...')

  try {
    // Create Knowledge Base
    await createDatabase('Knowledge Base', KNOWLEDGE_BASE_SCHEMA)

    // Create Tasks
    await createDatabase('Tasks', TASKS_SCHEMA)

    // Create Daily Log
    await createDatabase('Daily Log', DAILY_LOG_SCHEMA)

    console.log('\n✅ All databases created successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Copy the database IDs above to your .env file')
    console.log('2. Share each database with your Notion integration')
    console.log(
      '   (Click "..." on each database → Add connections → Select your integration)'
    )
  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  }
}

setupNotionDatabases()
