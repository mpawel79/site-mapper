import { chromium } from 'playwright';
import path from 'path';
export async function launchBrowser() {
    const headless = process.env.HEADLESS === 'false' ? false : true;
    const slowMo = process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 0;
    const devtools = process.env.DEVTOOLS === 'true' ? true : false;
    return await chromium.launch({ headless, slowMo, devtools, args: ['--start-maximized'] });
}
export async function newPage(browser) {
    const context = await browser.newContext();
    const page = await context.newPage();
    return page;
}
export async function saveScreenshot(page, outDir, name) {
    const p = path.join(outDir, name);
    await page.screenshot({ path: p, fullPage: true });
    return p;
}
export async function saveElementScreenshot(page, el, outDir, name) {
    const p = path.join(outDir, name);
    try {
        await el.screenshot({ path: p });
        return p;
    }
    catch (e) {
        return null;
    }
}
