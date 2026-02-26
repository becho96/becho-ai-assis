#!/usr/bin/env tsx
/**
 * Test script for Orchestrator v2
 */

import { spawn } from 'child_process'
import { join } from 'path'

const CHAT_ID = process.env.TELEGRAM_AUTHORIZED_USER_ID || 'test_chat'
const TEST_MESSAGES = [
  'Привет!',
  'Запиши: сегодня была отличная встреча с инвестором',
  'Создай задачу: отправить отчёт до пятницы',
  'Найди информацию про Claude 4',
  'Что у меня на сегодня?'
]

async function testMessage(message: string): Promise<void> {
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📨 Testing message: "${message}"`)
  console.log('='.repeat(80))

  return new Promise((resolve, reject) => {
    const proc = spawn(
      'npx',
      ['tsx', join(process.cwd(), 'scripts', 'invoke-orchestrator-v2.ts'), CHAT_ID, message],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env
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
        console.error('❌ Error:', stderr)
        reject(new Error(stderr))
        return
      }

      try {
        const result = JSON.parse(stdout)
        console.log('\n✅ Response:')
        console.log(result.response)
        console.log('\n⏱️ Timestamp:', result.timestamp)
        resolve()
      } catch (error) {
        console.log('\n📄 Raw output:', stdout)
        resolve()
      }
    })
  })
}

async function main() {
  console.log('🧪 Testing Orchestrator v2 with Claude API\n')

  // Test each message
  for (const message of TEST_MESSAGES) {
    try {
      await testMessage(message)
      // Wait 1 second between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error: any) {
      console.error('Test failed:', error.message)
    }
  }

  console.log('\n✅ All tests completed!')
}

main()
