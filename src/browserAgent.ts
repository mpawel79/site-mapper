import { chromium, Browser, Page } from 'playwright';
import fs from 'fs';
import path from 'path';

export async function launchBrowser(): Promise<Browser> {
  // Default to headed mode for MCP integration
  const headless = process.env.HEADLESS === 'true' ? true : false;
  const slowMo = process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 1000; // Default 1 second delay
  const devtools = process.env.DEVTOOLS === 'true' ? true : false;
  
  console.log(`🖥️ Launching browser: ${headless ? 'headless' : 'headed'} mode`);
  console.log(`⏱️ Slow motion: ${slowMo}ms delay between actions`);
  
  return await chromium.launch({ 
    headless, 
    slowMo, 
    devtools, 
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--allow-running-insecure-content'
    ] 
  });
}

export async function newPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  return page;
}

export async function saveScreenshot(page: Page, outDir: string, name: string) {
  const p = path.join(outDir, name);
  await page.screenshot({ path: p, fullPage: true });
  return p;
}

export async function saveElementScreenshot(page: Page, el: any, outDir: string, name: string) {
  const p = path.join(outDir, name);
  try {
    await el.screenshot({ path: p });
    return p;
  } catch (e) {
    return null;
  }
}
