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
    await page.goto(seed, { waitUntil: 'networkidle', timeout: 10000 });
    const registerUrl = seed.replace('#/login', '#/register');
    await page.goto(registerUrl, { waitUntil: 'networkidle', timeout: 10000 });
    // Fill signup form
    await page.fill('input[placeholder="Username"]', profile.username);
    await page.fill('input[placeholder="Email"]', profile.email);
    await page.fill('input[placeholder="Password"]', profile.password);
    await page.click('button:has-text("Sign up")');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    console.log('✅ Signed up successfully, now starting AI-powered exploration');
    // Initialize navigation tree
    const navigationTree = {
        currentPage: '',
        todoQueue: [],
        visitedUrls: new Set(),
        navigationPath: []
    };
    // Initialize data structures
    const nodes = [];
    const edges = [];
    // Add main page to TODO queue
    const mainUrl = 'https://demo.realworld.show/#/';
    navigationTree.todoQueue.push({
        url: mainUrl,
        title: 'Home Page',
        priority: 10,
        source: 'initial',
        action: 'navigate',
        visited: false,
        timestamp: new Date()
    });
    let pageCount = 0;
    const maxPages = 50; // Increased limit
    while (navigationTree.todoQueue.length > 0 && pageCount < maxPages) {
        // Get next item from TODO queue (highest priority first)
        const todoItem = navigationTree.todoQueue
            .filter(item => !item.visited)
            .sort((a, b) => b.priority - a.priority)[0];
        if (!todoItem) {
            console.log('✅ No more unvisited items in TODO queue');
            break;
        }
        // Mark as visited
        todoItem.visited = true;
        navigationTree.visitedUrls.add(todoItem.url);
        navigationTree.currentPage = todoItem.url;
        navigationTree.navigationPath.push(todoItem.url);
        console.log(`\n🔍 [${pageCount + 1}/${maxPages}] Exploring: ${todoItem.title}`);
        console.log(`📍 Current page: ${todoItem.url}`);
        console.log(`📋 TODO Queue: ${navigationTree.todoQueue.filter(item => !item.visited).length} items remaining`);
        try {
            // Navigate to page with proper waiting
            console.log(`⏳ Navigating to ${todoItem.url}...`);
            await page.goto(todoItem.url, { waitUntil: 'networkidle', timeout: 10000 });
            // Wait for page to fully load
            await page.waitForTimeout(2000);
            // Create node ID first
            const nodeId = `n_${pageCount}`;
            // Take screenshot with node ID
            const screenshot = await saveScreenshot(page, path.join(outDir, 'images'), `page_${pageCount + 1}.png`, nodeId);
            // AI Analysis
            console.log('🤖 Analyzing page with AI...');
            const analysis = await aiAgent.analyzePage(page);
            console.log(`📊 Analysis: ${analysis.pageType} page with ${analysis.interactiveElements.length} interactive elements`);
            // Create node (nodeId already created above)
            const node = {
                id: nodeId,
                url: todoItem.url,
                title: await page.title(),
                screenshot: screenshot,
                pageType: analysis.pageType,
                interactiveElements: analysis.interactiveElements.length,
                formFields: analysis.formFields.length,
                aiAnalysis: analysis,
                timestamp: new Date().toISOString()
            };
            nodes.push(node);
            // Execute AI-suggested actions and gather new TODO items
            console.log('🎯 Executing actions and gathering new TODO items...');
            const newTodoItems = await executeActionsAndGatherTodos(page, analysis, todoItem.url, navigationTree);
            // Add new TODO items to queue
            for (const newItem of newTodoItems) {
                if (!navigationTree.visitedUrls.has(newItem.url) &&
                    !navigationTree.todoQueue.some(item => item.url === newItem.url)) {
                    navigationTree.todoQueue.push(newItem);
                    console.log(`➕ Added to TODO: ${newItem.title} (${newItem.url}) - Priority: ${newItem.priority}`);
                }
            }
            // Create edges for navigation
            for (const newItem of newTodoItems) {
                const edge = {
                    id: `e_${edges.length}`,
                    source: nodeId,
                    dest: newItem.url,
                    action: newItem.action,
                    priority: newItem.priority,
                    timestamp: new Date().toISOString()
                };
                edges.push(edge);
            }
            pageCount++;
            // Output current status
            console.log(`\n📈 Status Update:`);
            console.log(`   📍 Current: ${todoItem.title}`);
            console.log(`   📋 TODO Queue: ${navigationTree.todoQueue.filter(item => !item.visited).length} items`);
            console.log(`   🔗 Visited: ${navigationTree.visitedUrls.size} pages`);
            console.log(`   📊 Progress: ${pageCount}/${maxPages} pages`);
            // Save progress periodically
            if (pageCount % 5 === 0) {
                const progress = {
                    metadata: {
                        seed,
                        profile,
                        ts: new Date().toISOString(),
                        aiPowered: true,
                        pagesDiscovered: pageCount,
                        todoQueueSize: navigationTree.todoQueue.length,
                        visitedUrls: navigationTree.visitedUrls.size
                    },
                    nodes,
                    edges,
                    navigationTree: {
                        currentPage: navigationTree.currentPage,
                        todoQueue: navigationTree.todoQueue,
                        visitedUrls: Array.from(navigationTree.visitedUrls),
                        navigationPath: navigationTree.navigationPath
                    }
                };
                fs.writeFileSync(path.join(outDir, 'map.json'), JSON.stringify(progress, null, 2));
                console.log(`💾 Progress saved: ${pageCount} pages discovered`);
            }
        }
        catch (error) {
            console.error(`❌ Error exploring ${todoItem.url}:`, error);
            // Continue with next item
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
            visitedUrls: navigationTree.visitedUrls.size,
            todoQueueSize: navigationTree.todoQueue.length
        },
        nodes,
        edges,
        navigationTree: {
            currentPage: navigationTree.currentPage,
            todoQueue: navigationTree.todoQueue,
            visitedUrls: Array.from(navigationTree.visitedUrls),
            navigationPath: navigationTree.navigationPath
        }
    };
    fs.writeFileSync(path.join(outDir, 'map.json'), JSON.stringify(finalResult, null, 2));
    console.log(`\n🎉 Smart crawl completed!`);
    console.log(`📊 Results: ${pageCount} pages discovered`);
    console.log(`🔗 Total URLs visited: ${navigationTree.visitedUrls.size}`);
    console.log(`📋 TODO Queue: ${navigationTree.todoQueue.length} items`);
    console.log(`💾 Results saved to: ${outDir}`);
    await browser.close();
}
// Helper function to execute actions and gather new TODO items
async function executeActionsAndGatherTodos(page, analysis, currentUrl, navigationTree) {
    const newTodoItems = [];
    // Fill forms with dummy data
    for (const field of analysis.formFields) {
        try {
            const element = await page.$(field.selector);
            if (element && await element.isVisible()) {
                await element.fill(field.suggestedValue);
                console.log(`📝 Filled ${field.label} with: ${field.suggestedValue}`);
            }
        }
        catch (error) {
            console.log(`❌ Could not fill field ${field.selector}: ${error}`);
        }
    }
    // Click on navigation options (prioritized)
    const sortedNavOptions = analysis.navigationOptions.sort((a, b) => b.priority - a.priority);
    for (const navOption of sortedNavOptions.slice(0, 10)) { // Limit to top 10
        try {
            const element = await page.$(navOption.selector);
            if (element && await element.isVisible()) {
                const currentUrlBefore = page.url();
                await element.click();
                await page.waitForTimeout(3000); // Wait for navigation
                const newUrl = page.url();
                if (newUrl !== currentUrlBefore && !navigationTree.visitedUrls.has(newUrl)) {
                    const todoItem = {
                        url: newUrl,
                        title: navOption.text || await page.title(),
                        priority: navOption.priority,
                        source: currentUrl,
                        action: `clicked: ${navOption.text}`,
                        visited: false,
                        timestamp: new Date()
                    };
                    newTodoItems.push(todoItem);
                    console.log(`🔗 Discovered: ${navOption.text} -> ${newUrl}`);
                }
                // Go back to continue exploring
                try {
                    await page.goBack();
                    await page.waitForLoadState('networkidle', { timeout: 10000 });
                }
                catch (e) {
                    console.log(`Could not go back, staying on current page`);
                }
            }
        }
        catch (error) {
            console.log(`❌ Could not click ${navOption.text}: ${error}`);
        }
    }
    // Click on interactive elements
    for (const element of analysis.interactiveElements.slice(0, 5)) { // Limit to top 5
        try {
            const el = await page.$(element.selector);
            if (el && await el.isVisible()) {
                const currentUrlBefore = page.url();
                await el.click();
                await page.waitForTimeout(3000);
                const newUrl = page.url();
                if (newUrl !== currentUrlBefore && !navigationTree.visitedUrls.has(newUrl)) {
                    const todoItem = {
                        url: newUrl,
                        title: element.text || await page.title(),
                        priority: 3,
                        source: currentUrl,
                        action: `clicked: ${element.text}`,
                        visited: false,
                        timestamp: new Date()
                    };
                    newTodoItems.push(todoItem);
                    console.log(`🎯 Discovered: ${element.text} -> ${newUrl}`);
                }
                // Go back to continue exploring
                try {
                    await page.goBack();
                    await page.waitForLoadState('networkidle', { timeout: 10000 });
                }
                catch (e) {
                    console.log(`Could not go back, staying on current page`);
                }
            }
        }
        catch (error) {
            console.log(`❌ Could not interact with ${element.text}: ${error}`);
        }
    }
    return newTodoItems;
}
