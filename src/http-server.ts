import express from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupProxy } from './lib/proxy.js';

setupProxy();

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Orchestrator endpoint
app.post('/api/orchestrator', async (req, res) => {
  try {
    const { telegram_chat_id, user_message } = req.body;

    if (!telegram_chat_id || !user_message) {
      res.status(400).json({
        error: 'Missing required fields: telegram_chat_id, user_message'
      });
      return;
    }

    console.log(`[${new Date().toISOString()}] Processing message from chat ${telegram_chat_id}`);

    const scriptPath = path.join(projectRoot, 'scripts', 'invoke-orchestrator-v2.ts');

    const { stdout, stderr } = await execFileAsync(
      'npx',
      ['tsx', scriptPath, String(telegram_chat_id), user_message],
      {
        cwd: projectRoot,
        timeout: 60000, // 60 seconds timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      }
    );

    if (stderr) {
      console.error('Script stderr:', stderr);
    }

    // Parse the JSON response from the script
    // Extract only JSON lines (ignore ANSI colored logs from gramJS)
    let response;
    try {
      const lines = stdout.split('\n').filter(line => line.trim());
      // Find the last line that starts with { and parse it
      const jsonLine = lines.reverse().find(line => line.trim().startsWith('{'));

      if (!jsonLine) {
        console.error('No JSON found in script output:', stdout);
        throw new Error('Invalid JSON response from orchestrator');
      }

      response = JSON.parse(jsonLine);
    } catch (parseError) {
      console.error('Failed to parse script output:', stdout);
      throw new Error('Invalid JSON response from orchestrator');
    }

    res.json(response);
  } catch (error) {
    console.error('Orchestrator error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error instanceof Error ? error.message : 'Unknown error',
      response: 'Извините, произошла ошибка при обработке сообщения. Попробуйте ещё раз.'
    });
  }
});

// Daily digest endpoint
app.post('/api/daily-digest', async (req, res) => {
  try {
    const { type } = req.body; // 'morning' or 'evening'

    if (!type || !['morning', 'evening'].includes(type)) {
      res.status(400).json({
        error: 'Invalid digest type. Must be "morning" or "evening"'
      });
      return;
    }

    console.log(`[${new Date().toISOString()}] Generating ${type} digest`);

    const scriptPath = path.join(projectRoot, 'scripts', 'invoke-daily-digest.ts');

    const { stdout, stderr } = await execFileAsync(
      'npx',
      ['tsx', scriptPath, type],
      {
        cwd: projectRoot,
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024
      }
    );

    if (stderr) {
      console.error('Script stderr:', stderr);
    }

    let response;
    try {
      response = JSON.parse(stdout);
    } catch (parseError) {
      console.error('Failed to parse script output:', stdout);
      throw new Error('Invalid JSON response from daily-digest');
    }

    res.json(response);
  } catch (error) {
    console.error('Daily digest error:', error);
    res.status(500).json({
      error: 'Failed to generate digest',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

const PORT = process.env.HTTP_SERVER_PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Becho AI HTTP Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Orchestrator: POST http://localhost:${PORT}/api/orchestrator`);
  console.log(`   Daily Digest: POST http://localhost:${PORT}/api/daily-digest`);
});
