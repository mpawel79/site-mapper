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
  
  // Test Gemini API connection before starting crawl
  console.log('🧪 Testing Gemini API connection...');
  let apiWorking = false;
  let workingModel = null;
  
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    // Try primary model first
    const primaryModel = config.ai.modelName;
    console.log(`🔍 Testing primary model: ${primaryModel}`);
    
    try {
      const model = genAI.getGenerativeModel({ model: primaryModel });
      const testPrompt = "Hello, this is a test. Please respond with 'API connection successful'.";
      const result = await model.generateContent(testPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ Primary model ${primaryModel} working successfully`);
      console.log(`📝 Test response: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
      apiWorking = true;
      workingModel = primaryModel;
    } catch (primaryError: any) {
      console.log(`⚠️ Primary model ${primaryModel} failed: ${primaryError.message}`);
      
      // Try fallback models
      const fallbackModels = config.ai.fallbackModels || ['gemini-1.5-flash', 'gemini-1.5-pro'];
      console.log(`🔄 Trying fallback models: ${fallbackModels.join(', ')}`);
      
      for (const fallbackModel of fallbackModels) {
        try {
          console.log(`🔍 Testing fallback model: ${fallbackModel}`);
          const model = genAI.getGenerativeModel({ model: fallbackModel });
          const testPrompt = "Hello, this is a test. Please respond with 'API connection successful'.";
          const result = await model.generateContent(testPrompt);
          const response = await result.response;
          const text = response.text();
          
          console.log(`✅ Fallback model ${fallbackModel} working successfully`);
          console.log(`📝 Test response: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
          apiWorking = true;
          workingModel = fallbackModel;
          break;
        } catch (fallbackError: any) {
          console.log(`⚠️ Fallback model ${fallbackModel} failed: ${fallbackError.message}`);
        }
      }
    }
    
    if (!apiWorking) {
      console.error('❌ All Gemini models failed to connect');
      console.log('🔄 Will continue with fallback analysis mode only');
      console.log('💡 Check your API key and model configuration in config.json');
      console.log('💡 Available models: gemini-1.5-flash, gemini-1.5-pro, gemini-pro');
    } else {
      console.log(`🎉 Gemini API ready with model: ${workingModel}`);
    }
  } catch (error: any) {
    console.error('❌ Gemini API initialization failed:', error.message);
    console.log('🔄 Will continue with fallback analysis mode');
    console.log('💡 Check your API key and model configuration in config.json');
  }
  
  await runMCPSmartCrawl(seed, profile, OUT, geminiApiKey, config);
  console.log('✅ MCP crawl completed. Results in', OUT);
}

main().catch(err => { console.error(err); process.exit(1); });
