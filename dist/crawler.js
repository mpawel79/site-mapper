import path from 'path';
import fs from 'fs-extra';
import { launchBrowser, newPage, saveScreenshot, saveElementScreenshot } from './browserAgent.js';
import { extractActions } from './actionExtractor.js';
import { fillAndSubmitIfForm } from './formFiller.js';
export async function runCrawlWithAuth(seed, profile, outDir) {
    const browser = await launchBrowser();
    const page = await newPage(browser);
    fs.ensureDirSync(outDir);
    fs.ensureDirSync(path.join(outDir, 'images'));
    // Sign up flow (this will automatically log us in)
    console.log('Signing up with new account');
    await page.goto(seed, { waitUntil: 'networkidle' });
    // Navigate to signup page
    const registerUrl = seed.replace('#/login', '#/register');
    await page.goto(registerUrl, { waitUntil: 'networkidle' });
    // Fill signup form
    await page.fill('input[placeholder="Username"]', profile.username);
    await page.fill('input[placeholder="Email"]', profile.email);
    await page.fill('input[placeholder="Password"]', profile.password);
    await page.click('button:has-text("Sign up")');
    await page.waitForLoadState('networkidle');
    console.log('Signed up successfully, now on main page');
    // capture main page
    const mainShot = await saveScreenshot(page, path.join(outDir, 'images'), 'main_page.png');
    console.log(`Current URL: ${page.url()}`);
    console.log(`Page title: ${await page.title()}`);
    // extract actions
    const actions = await extractActions(page);
    const edges = [];
    const nodes = [];
    const visitedUrls = new Set();
    nodes.push({ id: 'n_main', url: page.url(), title: await page.title(), screenshot: mainShot });
    visitedUrls.add(page.url());
    console.log(`Found ${actions.length} actions to explore`);
    // click on all actions to map the entire site
    for (let i = 0; i < actions.length; i++) {
        const a = actions[i];
        console.log(`Exploring action ${i + 1}/${actions.length}: ${a.name || 'unnamed'}`);
        const el = await page.$(a.selector);
        const elShot = await saveElementScreenshot(page, el, path.join(outDir, 'images'), `action_${i + 1}_${a.name || 'el'}.png`);
        // try to click (if it's a form, fill)
        await fillAndSubmitIfForm(page, el, profile);
        try {
            if (el)
                await el.click();
        }
        catch (e) {
            console.log(`Could not click element: ${e}`);
            continue;
        }
        await page.waitForTimeout(2000); // wait longer for page to load
        const destUrl = page.url();
        // only add if we haven't visited this URL before
        if (!visitedUrls.has(destUrl)) {
            const nodeId = `n_${i + 1}`;
            const shot = await saveScreenshot(page, path.join(outDir, 'images'), `page_${i + 1}.png`);
            nodes.push({ id: nodeId, url: destUrl, title: await page.title(), screenshot: shot });
            edges.push({ id: `e_${i + 1}`, source: 'n_main', dest: nodeId, action: a, element_screenshot: elShot });
            visitedUrls.add(destUrl);
            console.log(`Added new page: ${destUrl}`);
            // extract actions from this new page and add them to our queue
            const newActions = await extractActions(page);
            console.log(`Found ${newActions.length} additional actions on this page`);
            actions.push(...newActions);
        }
        else {
            console.log(`Already visited: ${destUrl}`);
        }
        // go back to main page
        try {
            await page.goBack();
            await page.waitForLoadState('networkidle');
        }
        catch (e) {
            console.log(`Could not go back, navigating to main page`);
            await page.goto(seed, { waitUntil: 'networkidle' });
        }
    }
    const out = { metadata: { seed, profile, ts: new Date().toISOString() }, nodes, edges };
    fs.writeFileSync(path.join(outDir, 'map.json'), JSON.stringify(out, null, 2));
    await browser.close();
}
