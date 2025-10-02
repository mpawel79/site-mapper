import { chromium, Browser, Page } from 'playwright';
import fs from 'fs';
import path from 'path';

export async function launchBrowser(config?: any): Promise<Browser> {
  // Use config if provided, otherwise fall back to environment variables
  const headless = config?.browser?.headless ?? (process.env.HEADLESS === 'true' ? true : false);
  const slowMo = config?.browser?.slowMo ?? (process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 1000);
  const devtools = config?.browser?.devtools ?? (process.env.DEVTOOLS === 'true' ? true : false);
  const args = config?.browser?.args ?? [
    '--start-maximized',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--allow-running-insecure-content'
  ];

  console.log(`🖥️ Launching browser: ${headless ? 'headless' : 'headed'} mode`);
  console.log(`⏱️ Slow motion: ${slowMo}ms delay between actions`);

  return await chromium.launch({
    headless,
    slowMo,
    devtools,
    args
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
