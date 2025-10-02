import { ensureDirSync } from 'fs-extra';
import path from 'path';
import fs from 'fs';
import { runMCPSmartCrawl } from './mcpSmartCrawler.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Load configuration
const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'config.json'), 'utf8'));

// Create session-specific output directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const baseUrl = config.crawler.baseUrl;
const domain = baseUrl.replace(/^https?:\/\//, '').replace(/^www\./, '');
const sessionDir = `session_${timestamp}__${domain}`;
const OUT = path.resolve(process.cwd(), 'out', sessionDir);
ensureDirSync(OUT);

async function main() {
  // Get configuration from config.json
  const seed = config.crawler.loginUrl;
  const baseUrl = config.crawler.baseUrl;
  
  // create new account for signup
  const profile = {
    username: `testuser_${Date.now()}`,
    email: `test+${Date.now()}@example.com`,
    password: 'Password123!'
  };

  // Get Gemini API key from environment
  const geminiApiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiApiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment variables');
    console.log('📝 Please create a .env file with your Gemini API key');
    console.log('📝 See .env_example for reference');
    process.exit(1);
  }

  console.log('🤖 Starting MCP-powered smart crawl for', seed);
  console.log('🌐 Base URL:', baseUrl);
  console.log('📁 Session Directory:', sessionDir);
  console.log('📂 Output Path:', OUT);
  console.log('📧 Creating new account:', profile.email);
  console.log('🔑 Using Gemini API key for MCP integration');
  console.log('⚙️ Configuration loaded from config.json');
  
  await runMCPSmartCrawl(seed, profile, OUT, geminiApiKey, config);
  console.log('✅ MCP crawl completed. Results in', OUT);
}

main().catch(err => { console.error(err); process.exit(1); });
