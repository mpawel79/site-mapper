import { chromium, firefox, webkit, Browser, Page, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

// Global counter for generating unique IDs
let screenshotIdCounter = 0;

// Function to generate unique screenshot ID
export function generateScreenshotId(): string {
  return `screenshot_${++screenshotIdCounter}`;
}

export async function launchBrowser(config?: any): Promise<Browser> {
  // Use config if provided, otherwise fall back to environment variables
  const headless = config?.browser?.headless ?? (process.env.HEADLESS === 'true' ? true : false);
  const slowMo = config?.browser?.slowMo ?? (process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 1000);
  const devtools = config?.browser?.devtools ?? (process.env.DEVTOOLS === 'true' ? true : false);
  const browserType = config?.browser?.browserType ?? 'chromium';
  const args = config?.browser?.args ?? [
    '--start-maximized',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--allow-running-insecure-content'
  ];

  console.log(`🖥️ Launching browser: ${browserType} in ${headless ? 'headless' : 'headed'} mode`);
  console.log(`⏱️ Slow motion: ${slowMo}ms delay between actions`);

  // Select browser type
  let browserLauncher;
  switch (browserType.toLowerCase()) {
    case 'firefox':
      browserLauncher = firefox;
      break;
    case 'webkit':
      browserLauncher = webkit;
      break;
    case 'chromium':
    default:
      browserLauncher = chromium;
      break;
  }

  return await browserLauncher.launch({
    headless,
    slowMo,
    devtools,
    args
  });
}

export async function newPage(browser: Browser, config?: any): Promise<Page> {
  // Get browser context options from config
  let contextOptions: any = {};
  
  // Viewport configuration
  if (config?.browser?.viewport) {
    contextOptions.viewport = {
      width: config.browser.viewport.width,
      height: config.browser.viewport.height,
      deviceScaleFactor: config.browser.viewport.deviceScaleFactor || 1
    };
    console.log(`📱 Viewport: ${config.browser.viewport.width}x${config.browser.viewport.height} (scale: ${config.browser.viewport.deviceScaleFactor})`);
  }
  
  // Device emulation
  if (config?.browser?.device) {
    const deviceName = config.browser.device;
    if (devices[deviceName]) {
      contextOptions = { ...contextOptions, ...devices[deviceName] };
      console.log(`📱 Device emulation: ${deviceName}`);
    } else {
      console.log(`⚠️ Unknown device: ${deviceName}, using default viewport`);
    }
  }
  
  // User agent
  if (config?.browser?.userAgent) {
    contextOptions.userAgent = config.browser.userAgent;
    console.log(`🌐 User Agent: ${config.browser.userAgent.substring(0, 50)}...`);
  }
  
  // Locale
  if (config?.browser?.locale) {
    contextOptions.locale = config.browser.locale;
    console.log(`🌍 Locale: ${config.browser.locale}`);
  }
  
  // Timezone
  if (config?.browser?.timezone) {
    contextOptions.timezoneId = config.browser.timezone;
    console.log(`🕐 Timezone: ${config.browser.timezone}`);
  }
  
  // Geolocation
  if (config?.browser?.geolocation) {
    contextOptions.geolocation = config.browser.geolocation;
    console.log(`📍 Geolocation: ${JSON.stringify(config.browser.geolocation)}`);
  }
  
  // Permissions
  if (config?.browser?.permissions && config.browser.permissions.length > 0) {
    contextOptions.permissions = config.browser.permissions;
    console.log(`🔐 Permissions: ${config.browser.permissions.join(', ')}`);
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  return page;
}

export async function saveScreenshot(page: Page, outDir: string, name: string, nodeId?: string) {
  const screenshotId = nodeId || generateScreenshotId();
  const timestamp = Date.now();
  
  // Extract the base name and extension
  const nameParts = name.split('.');
  const extension = nameParts.pop() || 'png';
  const baseName = nameParts.join('.');
  
  // Create new filename with pattern: {timestamp}_{nodeId}_{action_type}_{descriptive_name}.png
  const newName = `${timestamp}_${screenshotId}_${baseName}.${extension}`;
  const p = path.join(outDir, newName);
  
  await page.screenshot({ path: p, fullPage: true });
  return p;
}

export async function saveElementScreenshot(page: Page, el: any, outDir: string, name: string, nodeId?: string) {
  const screenshotId = nodeId || generateScreenshotId();
  const timestamp = Date.now();
  
  // Extract the base name and extension
  const nameParts = name.split('.');
  const extension = nameParts.pop() || 'png';
  const baseName = nameParts.join('.');
  
  // Create new filename with pattern: {timestamp}_{nodeId}_{action_type}_{descriptive_name}.png
  const newName = `${timestamp}_${screenshotId}_${baseName}.${extension}`;
  const p = path.join(outDir, newName);
  
  try {
    await el.screenshot({ path: p });
    return p;
  } catch (e) {
    return null;
  }
}
