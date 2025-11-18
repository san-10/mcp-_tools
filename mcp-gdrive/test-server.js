// Quick test to verify the server starts correctly
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, 'dist', 'index.js');

console.log('Starting MCP server...');
console.log('Server path:', serverPath);

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CLIENT_ID: process.env.CLIENT_ID || '38186857502-fr0ojprui92maf07lss68edhel21uqou.apps.googleusercontent.com',
    CLIENT_SECRET: process.env.CLIENT_SECRET || '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',
    GDRIVE_CREDS_DIR: process.env.GDRIVE_CREDS_DIR || path.join(__dirname, 'creds'),
  }
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code || 0);
});

