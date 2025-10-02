import path from 'path';
import fs from 'fs-extra';
import { launchBrowser, newPage, saveScreenshot } from './browserAgent.js';
import { AIAgent } from './aiAgent.js';
export async function runSmartCrawl(seed, profile, outDir) {
    const browser = await launchBrowser();
    const page = await newPage(browser);
    fs.ensureDirSync(outDir);
    fs.ensureDirSync(path.join(outDir, 'images'));
    // Initialize AI Agent
    const aiAgent = new AIAgent('demo.realworld.show');
    // Sign up flow
    console.log('🚀 Starting smart crawl with AI agent...');
    console.log('📝 Signing up with new account');
    await page.goto(seed, { waitUntil: 'networkidle' });
    const registerUrl = seed.replace('#/login', '#/register');
    await page.goto(registerUrl, { waitUntil: 'networkidle' });
    // Fill signup form
    await page.fill('input[placeholder="Username"]', profile.username);
    await page.fill('input[placeholder="Email"]', profile.email);
    await page.fill('input[placeholder="Password"]', profile.password);
    await page.click('button:has-text("Sign up")');
    await page.waitForLoadState('networkidle');
    console.log('✅ Signed up successfully, now starting AI-powered exploration');
    // Initialize data structures
    const nodes = [];
    const edges = [];
    const urlQueue = [];
    // Add main page to queue
    const mainUrl = 'https://demo.realworld.show/#/';
    urlQueue.push(mainUrl);
    let pageCount = 0;
    const maxPages = 30; // Reasonable limit
    while (urlQueue.length > 0 && pageCount < maxPages) {
        const currentUrl = urlQueue.shift();
        if (aiAgent.hasVisited(currentUrl)) {
            continue;
        }
        console.log(`\n🔍 Exploring page ${pageCount + 1}/${maxPages}: ${currentUrl}`);
        try {
            // Navigate to page
            await page.goto(currentUrl, { waitUntil: 'networkidle' });
            aiAgent.addVisitedUrl(currentUrl);
            // Take screenshot
            const screenshot = await saveScreenshot(page, path.join(outDir, 'images'), `page_${pageCount + 1}.png`);
            // AI Analysis
            const analysis = await aiAgent.analyzePage(page);
            console.log(`🤖 AI Analysis: ${analysis.pageType} page with ${analysis.interactiveElements.length} interactive elements`);
            // Create node
            const nodeId = `n_${pageCount}`;
            const node = {
                id: nodeId,
                url: currentUrl,
                title: await page.title(),
                screenshot: screenshot,
                pageType: analysis.pageType,
                interactiveElements: analysis.interactiveElements.length,
                formFields: analysis.formFields.length,
                aiAnalysis: analysis
            };
            nodes.push(node);
            // Execute AI-suggested actions
            const newUrls = await aiAgent.executeActions(page, analysis);
            // Add new URLs to queue (filter out already visited)
            for (const newUrl of newUrls) {
                if (!aiAgent.hasVisited(newUrl) && !urlQueue.includes(newUrl)) {
                    urlQueue.push(newUrl);
                    console.log(`➕ Added to queue: ${newUrl}`);
                }
            }
            // Create edges for navigation
            for (const newUrl of newUrls) {
                const edge = {
                    id: `e_${edges.length}`,
                    source: nodeId,
                    dest: `n_${pageCount + 1}`,
                    action: 'AI-suggested navigation',
                    timestamp: new Date().toISOString()
                };
                edges.push(edge);
            }
            pageCount++;
            // Save progress periodically
            if (pageCount % 5 === 0) {
                const progress = {
                    metadata: {
                        seed,
                        profile,
                        ts: new Date().toISOString(),
                        aiPowered: true,
                        pagesDiscovered: pageCount,
                        urlsInQueue: urlQueue.length
                    },
                    nodes,
                    edges
                };
                fs.writeFileSync(path.join(outDir, 'map.json'), JSON.stringify(progress, null, 2));
                console.log(`💾 Progress saved: ${pageCount} pages discovered`);
            }
        }
        catch (error) {
            console.error(`❌ Error exploring ${currentUrl}:`, error);
        }
    }
    // Final save
    const finalResult = {
        metadata: {
            seed,
            profile,
            ts: new Date().toISOString(),
            aiPowered: true,
            totalPages: pageCount,
            visitedUrls: aiAgent.getVisitedCount()
        },
        nodes,
        edges
    };
    fs.writeFileSync(path.join(outDir, 'map.json'), JSON.stringify(finalResult, null, 2));
    console.log(`\n🎉 Smart crawl completed!`);
    console.log(`📊 Results: ${pageCount} pages discovered`);
    console.log(`🔗 Total URLs visited: ${aiAgent.getVisitedCount()}`);
    console.log(`💾 Results saved to: ${outDir}`);
    await browser.close();
}
