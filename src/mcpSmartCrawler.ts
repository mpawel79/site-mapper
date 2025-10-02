import path from 'path';
import fs from 'fs-extra';
import { launchBrowser, newPage, saveScreenshot, saveElementScreenshot } from './browserAgent.js';
import { MCPAgent } from './mcpAgent.js';

interface TodoItem {
  url: string;
  title: string;
  priority: number;
  source: string;
  action: string;
  visited: boolean;
  timestamp: Date;
  mcpAnalysis?: any;
}

interface NavigationTree {
  currentPage: string;
  todoQueue: TodoItem[];
  visitedUrls: Set<string>;
  navigationPath: string[];
  mcpContext: any;
}

interface CrawlStep {
  id: string;
  stepNumber: number;
  timestamp: string;
  action: string;
  url: string;
  title: string;
  screenshot: string;
  description: string;
  previousStepId?: string;
  nextStepId?: string;
  formFields?: any[];
  formSubmission?: boolean;
  navigationTarget?: string;
  mcpAnalysis?: any;
}

interface CrawlState {
  steps: CrawlStep[];
  currentStepId?: string;
  stepCounter: number;
}

export async function runMCPSmartCrawl(seed: string, profile: any, outDir: string, geminiApiKey: string) {
  const browser = await launchBrowser();
  const page = await newPage(browser);
  fs.ensureDirSync(outDir);
  fs.ensureDirSync(path.join(outDir, 'images'));

  // Initialize MCP Agent with Gemini API key
  const mcpAgent = new MCPAgent(geminiApiKey);
  
  // Sign up flow
  console.log('🚀 Starting MCP-powered smart crawl...');
  console.log('📝 Signing up with new account');
  console.log('🖥️ Browser will open in headed mode - you can watch the automation!');
  await page.goto(seed, { waitUntil: 'networkidle', timeout: 10000 });
  
  const registerUrl = seed.replace('#/login', '#/register');
  await page.goto(registerUrl, { waitUntil: 'networkidle', timeout: 10000 });
  
  // Fill signup form
  await page.fill('input[placeholder="Username"]', profile.username);
  await page.fill('input[placeholder="Email"]', profile.email);
  await page.fill('input[placeholder="Password"]', profile.password);
  await page.click('button:has-text("Sign up")');
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  
  console.log('✅ Signed up successfully, now starting MCP-powered exploration');

  // Initialize navigation tree with MCP context
  const navigationTree: NavigationTree = {
    currentPage: '',
    todoQueue: [],
    visitedUrls: new Set(),
    navigationPath: [],
    mcpContext: {
      crawlingStrategy: 'intelligent_exploration',
      optimizationLevel: 'high',
      aiPowered: true
    }
  };

  // Initialize crawl state tracking
  const crawlState: CrawlState = {
    steps: [],
    currentStepId: undefined,
    stepCounter: 0
  };

  // Initialize data structures
  const nodes: any[] = [];
  const edges: any[] = [];
  
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
  const maxPages = 50;
  
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
    
    console.log(`\n🔍 [${pageCount + 1}/${maxPages}] MCP Exploring: ${todoItem.title}`);
    console.log(`📍 Current page: ${todoItem.url}`);
    console.log(`📋 TODO Queue: ${navigationTree.todoQueue.filter(item => !item.visited).length} items remaining`);
    
    try {
      // Navigate to page with proper waiting
      console.log(`⏳ Navigating to ${todoItem.url}...`);
      console.log(`🖥️ Watch the browser - it will navigate to: ${todoItem.title}`);
      await page.goto(todoItem.url, { waitUntil: 'networkidle', timeout: 10000 });
      
      // Wait for page to fully load
      await page.waitForTimeout(2000);
      
      // Add visual indicator in browser
      await page.evaluate(() => {
        const indicator = document.createElement('div');
        indicator.id = 'mcp-agent-indicator';
        indicator.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          background: #4CAF50;
          color: white;
          padding: 10px;
          border-radius: 5px;
          z-index: 10000;
          font-family: Arial, sans-serif;
          font-size: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        indicator.textContent = '🤖 MCP Agent Active';
        document.body.appendChild(indicator);
        
        // Remove after 3 seconds
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 3000);
      });
      
      // Take screenshot
      const screenshot = await saveScreenshot(page, path.join(outDir, 'images'), `page_${pageCount + 1}.png`);
      
      // MCP Agent Analysis
      console.log('🤖 MCP Agent analyzing page...');
      const pageContent = await extractPageContent(page);
      const pageStructure = await extractPageStructure(page);
      
      const mcpAnalysis = await mcpAgent.analyzePageWithMCP(pageContent, pageStructure, todoItem.url);
      todoItem.mcpAnalysis = mcpAnalysis;
      
      console.log(`📊 MCP Analysis: ${mcpAnalysis.pageType} page with ${mcpAnalysis.interactiveElements?.length || 0} interactive elements`);
      console.log(`🎯 Crawling Strategy: ${mcpAnalysis.crawlingStrategy}`);
      console.log(`⭐ Estimated Value: ${mcpAnalysis.estimatedValue}/10`);
      
      // Create node with MCP analysis
      const nodeId = `n_${pageCount}`;
      const node = {
        id: nodeId,
        url: todoItem.url,
        title: await page.title(),
        screenshot: screenshot,
        pageType: mcpAnalysis.pageType,
        crawlingStrategy: mcpAnalysis.crawlingStrategy,
        estimatedValue: mcpAnalysis.estimatedValue,
        interactiveElements: mcpAnalysis.interactiveElements?.length || 0,
        formFields: mcpAnalysis.formFields?.length || 0,
        mcpAnalysis: mcpAnalysis,
        timestamp: new Date().toISOString()
      };
      nodes.push(node);
      
      // Execute MCP-suggested actions and gather new TODO items
      console.log('🎯 Executing MCP-suggested actions...');
      const newTodoItems = await executeMCPActions(page, mcpAnalysis, todoItem.url, navigationTree, outDir);
      
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
          mcpOptimized: true,
          timestamp: new Date().toISOString()
        };
        edges.push(edge);
      }
      
      pageCount++;
      
      // Generate MCP crawling plan periodically
      if (pageCount % 5 === 0) {
        console.log('📋 Generating MCP crawling plan...');
        const crawlingPlan = await mcpAgent.generateCrawlingPlan(
          nodes.map(n => ({ url: n.url, title: n.title, type: n.pageType })),
          `Explored ${pageCount} pages, ${navigationTree.todoQueue.length} remaining`
        );
        console.log(`🎯 MCP Plan: ${crawlingPlan.crawlingPlan?.strategy}`);
      }
      
      // Output current status
      console.log(`\n📈 MCP Status Update:`);
      console.log(`   📍 Current: ${todoItem.title}`);
      console.log(`   📋 TODO Queue: ${navigationTree.todoQueue.filter(item => !item.visited).length} items`);
      console.log(`   🔗 Visited: ${navigationTree.visitedUrls.size} pages`);
      console.log(`   📊 Progress: ${pageCount}/${maxPages} pages`);
      console.log(`   🤖 MCP Strategy: ${mcpAnalysis.crawlingStrategy}`);
      
      // Save progress periodically
      if (pageCount % 5 === 0) {
        const progress = {
          metadata: { 
            seed, 
            profile, 
            ts: new Date().toISOString(),
            mcpPowered: true,
            geminiApiKey: geminiApiKey.substring(0, 10) + '...',
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
            navigationPath: navigationTree.navigationPath,
            mcpContext: navigationTree.mcpContext
          }
        };
        fs.writeFileSync(path.join(outDir, 'map.json'), JSON.stringify(progress, null, 2));
        console.log(`💾 MCP Progress saved: ${pageCount} pages discovered`);
      }
      
    } catch (error) {
      console.error(`❌ Error exploring ${todoItem.url}:`, error);
      // Continue with next item
    }
  }
  
  // Final save with MCP context
  const finalResult = {
    metadata: { 
      seed, 
      profile, 
      ts: new Date().toISOString(),
      mcpPowered: true,
      geminiApiKey: geminiApiKey.substring(0, 10) + '...',
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
      navigationPath: navigationTree.navigationPath,
      mcpContext: navigationTree.mcpContext
    }
  };
  
  fs.writeFileSync(path.join(outDir, 'map.json'), JSON.stringify(finalResult, null, 2));
  
  console.log(`\n🎉 MCP Smart crawl completed!`);
  console.log(`📊 Results: ${pageCount} pages discovered`);
  console.log(`🔗 Total URLs visited: ${navigationTree.visitedUrls.size}`);
  console.log(`📋 TODO Queue: ${navigationTree.todoQueue.length} items`);
  console.log(`🤖 MCP-powered exploration completed`);
  console.log(`💾 Results saved to: ${outDir}`);
  
  await browser.close();
}

// Helper function to add a step to crawl state
function addCrawlStep(
  crawlState: CrawlState,
  action: string,
  url: string,
  title: string,
  screenshot: string,
  description: string,
  formFields?: any[],
  formSubmission?: boolean,
  navigationTarget?: string,
  mcpAnalysis?: any
): string {
  crawlState.stepCounter++;
  const stepId = `step_${crawlState.stepCounter}`;
  const timestamp = new Date().toISOString();
  
  const step: CrawlStep = {
    id: stepId,
    stepNumber: crawlState.stepCounter,
    timestamp: timestamp,
    action: action,
    url: url,
    title: title,
    screenshot: screenshot,
    description: description,
    previousStepId: crawlState.currentStepId,
    formFields: formFields,
    formSubmission: formSubmission,
    navigationTarget: navigationTarget,
    mcpAnalysis: mcpAnalysis
  };
  
  // Link previous step to this one
  if (crawlState.currentStepId) {
    const previousStep = crawlState.steps.find(s => s.id === crawlState.currentStepId);
    if (previousStep) {
      previousStep.nextStepId = stepId;
    }
  }
  
  crawlState.steps.push(step);
  crawlState.currentStepId = stepId;
  
  console.log(`📝 Added step ${crawlState.stepCounter}: ${action} - ${description}`);
  return stepId;
}

// Helper function to execute MCP-suggested actions
async function executeMCPActions(page: any, mcpAnalysis: any, currentUrl: string, navigationTree: NavigationTree, outDir: string): Promise<TodoItem[]> {
  const newTodoItems: TodoItem[] = [];
  
  // Enhanced form filling with 2 items and submission
  if (mcpAnalysis.formFields && mcpAnalysis.formFields.length > 0) {
    console.log(`📝 MCP Agent found ${mcpAnalysis.formFields.length} form fields to fill`);
    
    // Take screenshot BEFORE form filling
    const beforeFillScreenshot = await saveScreenshot(page, path.join(outDir, 'images'), `form_before_fill_${Date.now()}.png`);
    console.log(`📸 Screenshot taken BEFORE form filling: ${beforeFillScreenshot}`);
    
    // Fill forms with MCP-suggested dummy data
    for (const field of mcpAnalysis.formFields) {
      try {
        const element = await page.$(field.selector);
        if (element && await element.isVisible()) {
          await element.fill(field.suggestedValue);
          console.log(`📝 MCP filled ${field.label} with: ${field.suggestedValue}`);
        }
      } catch (error) {
        console.log(`❌ Could not fill field ${field.selector}: ${error}`);
      }
    }
    
    // Take screenshot AFTER all fields are filled
    const afterFillScreenshot = await saveScreenshot(page, path.join(outDir, 'images'), `form_after_fill_${Date.now()}.png`);
    console.log(`📸 Screenshot taken AFTER form filling: ${afterFillScreenshot}`);
    
    // Look for submit buttons and submit forms
    const submitButtons = await page.$$('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Post"), button:has-text("Create"), button:has-text("Save")');
    
    if (submitButtons.length > 0) {
      console.log(`🎯 MCP Agent found ${submitButtons.length} submit buttons`);
      
      // Try to submit up to 2 forms
      for (let i = 0; i < Math.min(2, submitButtons.length); i++) {
        try {
          const submitButton = submitButtons[i];
          if (await submitButton.isVisible()) {
            // Highlight the submit button
            await submitButton.evaluate((el: any) => {
              el.style.border = '3px solid #4CAF50';
              el.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
              el.style.transition = 'all 0.3s ease';
            });
            
            console.log(`🚀 MCP Agent submitting form ${i + 1}/2...`);
            await submitButton.click();
            await page.waitForTimeout(3000); // Wait for submission
            
            // Take screenshot AFTER form submission
            const afterSubmitScreenshot = await saveScreenshot(page, path.join(outDir, 'images'), `form_after_submit_${i + 1}_${Date.now()}.png`);
            console.log(`📸 Screenshot taken AFTER form ${i + 1} submission: ${afterSubmitScreenshot}`);
            
            // Check if we navigated to a new page
            const newUrl = page.url();
            if (newUrl !== currentUrl && !navigationTree.visitedUrls.has(newUrl)) {
              const todoItem: TodoItem = {
                url: newUrl,
                title: `Form submission result ${i + 1}`,
                priority: 5,
                source: currentUrl,
                action: `form_submitted_${i + 1}`,
                visited: false,
                timestamp: new Date()
              };
              newTodoItems.push(todoItem);
              console.log(`✅ Form ${i + 1} submitted successfully, navigated to: ${newUrl}`);
            } else {
              console.log(`📝 Form ${i + 1} submitted, staying on same page`);
            }
            
            // Go back if we navigated away
            if (newUrl !== currentUrl) {
              try {
                await page.goBack();
                await page.waitForLoadState('networkidle', { timeout: 10000 });
                console.log(`↩️ Returned to original page after form submission`);
              } catch (e) {
                console.log(`Could not go back after form submission`);
              }
            }
          }
        } catch (error) {
          console.log(`❌ Could not submit form ${i + 1}: ${error}`);
        }
      }
    } else {
      console.log(`📝 No submit buttons found, forms filled but not submitted`);
    }
  }
  
  // Execute navigation priorities from MCP analysis
  if (mcpAnalysis.navigationPriorities) {
    const sortedNavOptions = mcpAnalysis.navigationPriorities.sort((a: any, b: any) => b.priority - a.priority);
    
    for (const navOption of sortedNavOptions.slice(0, 10)) {
      try {
        const element = await page.$(navOption.selector);
        if (element && await element.isVisible()) {
          // Add visual highlight before clicking
          await element.evaluate((el: any) => {
            el.style.border = '3px solid #FF5722';
            el.style.backgroundColor = 'rgba(255, 87, 34, 0.2)';
            el.style.transition = 'all 0.3s ease';
          });
          
          console.log(`🎯 MCP Agent clicking: ${navOption.text}`);
          const currentUrlBefore = page.url();
          await element.click();
          await page.waitForTimeout(3000);
          
          const newUrl = page.url();
          if (newUrl !== currentUrlBefore && !navigationTree.visitedUrls.has(newUrl)) {
            const todoItem: TodoItem = {
              url: newUrl,
              title: navOption.text || await page.title(),
              priority: navOption.priority,
              source: currentUrl,
              action: `MCP-clicked: ${navOption.text}`,
              visited: false,
              timestamp: new Date()
            };
            newTodoItems.push(todoItem);
            console.log(`🔗 MCP discovered: ${navOption.text} -> ${newUrl} (${navOption.reason})`);
          }
          
          // Go back to continue exploring
          try {
            await page.goBack();
            await page.waitForLoadState('networkidle', { timeout: 10000 });
          } catch (e) {
            console.log(`Could not go back, staying on current page`);
          }
        }
      } catch (error) {
        console.log(`❌ Could not click ${navOption.text}: ${error}`);
      }
    }
  }
  
  // Execute interactive elements from MCP analysis
  if (mcpAnalysis.interactiveElements) {
    for (const element of mcpAnalysis.interactiveElements.slice(0, 5)) {
      try {
        const el = await page.$(element.selector);
        if (el && await el.isVisible()) {
          const currentUrlBefore = page.url();
          await el.click();
          await page.waitForTimeout(3000);
          
          const newUrl = page.url();
          if (newUrl !== currentUrlBefore && !navigationTree.visitedUrls.has(newUrl)) {
            const todoItem: TodoItem = {
              url: newUrl,
              title: element.text || await page.title(),
              priority: element.priority || 3,
              source: currentUrl,
              action: `MCP-interacted: ${element.text}`,
              visited: false,
              timestamp: new Date()
            };
            newTodoItems.push(todoItem);
            console.log(`🎯 MCP discovered: ${element.text} -> ${newUrl}`);
          }
          
          // Go back to continue exploring
          try {
            await page.goBack();
            await page.waitForLoadState('networkidle', { timeout: 10000 });
          } catch (e) {
            console.log(`Could not go back, staying on current page`);
          }
        }
      } catch (error) {
        console.log(`❌ Could not interact with ${element.text}: ${error}`);
      }
    }
  }
  
  return newTodoItems;
}

// Helper functions for page content extraction
async function extractPageContent(page: any): Promise<string> {
  return await page.evaluate(() => {
    const scripts = document.querySelectorAll('script, style');
    scripts.forEach(el => el.remove());
    
    const text = document.body.innerText;
    const title = document.title;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => h.textContent?.trim())
      .filter(Boolean);
    
    return `Title: ${title}\nHeadings: ${headings.join(', ')}\nContent: ${text.slice(0, 2000)}`;
  });
}

async function extractPageStructure(page: any): Promise<string> {
  return await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
      .map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim() || el.getAttribute('value') || '',
        id: el.id,
        class: el.className
      }));
    
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(el => ({
        tag: el.tagName,
        text: el.textContent?.trim(),
        href: el.getAttribute('href'),
        id: el.id,
        class: el.className
      }));
    
    const forms = Array.from(document.querySelectorAll('form'))
      .map(form => ({
        tag: form.tagName,
        action: form.getAttribute('action'),
        method: form.getAttribute('method'),
        inputs: Array.from(form.querySelectorAll('input, textarea, select'))
          .map(input => ({
            type: input.getAttribute('type') || input.tagName,
            name: input.getAttribute('name'),
            placeholder: input.getAttribute('placeholder'),
            required: input.hasAttribute('required')
          }))
      }));
    
    return JSON.stringify({ buttons, links, forms }, null, 2);
  });
}
