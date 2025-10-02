import { ensureDirSync } from 'fs-extra';
import path from 'path';
import { runSmartCrawl } from './smartCrawler.js';
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
    console.log('🤖 Starting AI-powered smart crawl for', seed);
    console.log('📧 Creating new account:', profile.email);
    await runSmartCrawl(seed, profile, OUT);
    console.log('✅ Done. Results in', OUT);
}
main().catch(err => { console.error(err); process.exit(1); });
