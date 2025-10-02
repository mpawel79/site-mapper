import { ensureDirSync } from 'fs-extra';
import path from 'path';
import { runMCPSmartCrawl } from './mcpSmartCrawler.js';

const OUT = path.resolve(process.cwd(), 'out');
ensureDirSync(OUT);

async function main() {
  const seed = 'https://demo.realworld.show/#/login';
  // create new account for signup
  const profile = {
    username: `testuser_${Date.now()}`,
    email: `test+${Date.now()}@example.com`,
    password: 'Password123!'
  };

  // Gemini API key for MCP integration
  const geminiApiKey = 'AIzaSyDAxKG31sXT0Ph5xhJa5m61KdoiEWeL5G0';
  
  console.log('🤖 Starting MCP-powered smart crawl for', seed);
  console.log('📧 Creating new account:', profile.email);
  console.log('🔑 Using Gemini API key for MCP integration');
  await runMCPSmartCrawl(seed, profile, OUT, geminiApiKey);
  console.log('✅ MCP crawl completed. Results in', OUT);
}

main().catch(err => { console.error(err); process.exit(1); });
