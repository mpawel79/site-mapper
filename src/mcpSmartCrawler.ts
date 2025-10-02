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
  logoutButtons?: any[];
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

export async function runMCPSmartCrawl(seed: string, profile: any, outDir: string, geminiApiKey: string, config: any) {
  const browser = await launchBrowser(config);
  const page = await newPage(browser);
  fs.ensureDirSync(outDir);
  fs.ensureDirSync(path.join(outDir, 'images'));
  
  // Log session information
  const sessionInfo = {
    sessionDir: path.basename(outDir),
    startTime: new Date().toISOString(),
    baseUrl: config.crawler.baseUrl,
    domain: config.crawler.baseUrl.replace(/^https?:\/\//, '').replace(/^www\./, '')
  };
  
  console.log(`📁 Session: ${sessionInfo.sessionDir}`);
  console.log(`🕐 Started: ${sessionInfo.startTime}`);
  console.log(`🌐 Domain: ${sessionInfo.domain}`);

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
  const maxPages = config.crawler.maxPages;
  
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
      await page.goto(todoItem.url, { waitUntil: 'networkidle', timeout: config.crawler.timeout });
      
      // Wait for page to fully load
      await page.waitForTimeout(config.crawler.waitForLoad);
      
      // Add visual indicator in browser
      await page.evaluate((visualConfig) => {
        const indicator = document.createElement('div');
        indicator.id = 'mcp-agent-indicator';
        indicator.style.cssText = `
          position: fixed;
          top: 10px;
          right: 10px;
          background: ${visualConfig.indicatorColor};
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
        
        // Remove after configured duration
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, visualConfig.duration);
      }, {
        indicatorColor: config.visual.indicatorColor,
        duration: config.crawler.visualIndicatorDuration
      });
      
      // Take screenshot with timestamp
      const timestamp = Date.now();
      const screenshot = await saveScreenshot(page, path.join(outDir, 'images'), `${timestamp}_page_${pageCount + 1}.png`);
      
      // Add initial page visit step
      addCrawlStep(
        crawlState,
        'page_visit',
        todoItem.url,
        await page.title(),
        screenshot,
        `Visited page: ${todoItem.title}`,
        undefined,
        false,
        undefined,
        undefined
      );
      
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
      const newTodoItems = await executeMCPActions(page, mcpAnalysis, todoItem.url, navigationTree, outDir, crawlState, config);
      
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
      if (pageCount % config.output.progressSaveInterval === 0) {
        const progress = {
          metadata: {
            seed,
            profile,
            ts: new Date().toISOString(),
            mcpPowered: true,
            geminiApiKey: geminiApiKey.substring(0, 10) + '...',
            pagesDiscovered: pageCount,
            todoQueueSize: navigationTree.todoQueue.length,
            visitedUrls: navigationTree.visitedUrls.size,
            totalSteps: crawlState.stepCounter,
            sessionInfo: {
              sessionDir: sessionInfo.sessionDir,
              startTime: sessionInfo.startTime,
              baseUrl: sessionInfo.baseUrl,
              domain: sessionInfo.domain
            }
          },
          nodes,
          edges,
          navigationTree: {
            currentPage: navigationTree.currentPage,
            todoQueue: navigationTree.todoQueue,
            visitedUrls: Array.from(navigationTree.visitedUrls),
            navigationPath: navigationTree.navigationPath,
            mcpContext: navigationTree.mcpContext
          },
          crawlState: {
            steps: crawlState.steps,
            currentStepId: crawlState.currentStepId,
            stepCounter: crawlState.stepCounter
          }
        };
        fs.writeFileSync(path.join(outDir, 'map.json'), JSON.stringify(progress, null, 2));
        console.log(`💾 MCP Progress saved: ${pageCount} pages discovered, ${crawlState.stepCounter} steps recorded`);
      }
      
    } catch (error) {
      console.error(`❌ Error exploring ${todoItem.url}:`, error);
      // Continue with next item
    }
  }
  
  // Handle logout as final step
  await handleLogoutAsFinalStep(page, navigationTree, outDir, crawlState);
  
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
      todoQueueSize: navigationTree.todoQueue.length,
      totalSteps: crawlState.stepCounter,
      sessionInfo: {
        sessionDir: sessionInfo.sessionDir,
        startTime: sessionInfo.startTime,
        endTime: new Date().toISOString(),
        baseUrl: sessionInfo.baseUrl,
        domain: sessionInfo.domain
      }
    },
    nodes, 
    edges,
    navigationTree: {
      currentPage: navigationTree.currentPage,
      todoQueue: navigationTree.todoQueue,
      visitedUrls: Array.from(navigationTree.visitedUrls),
      navigationPath: navigationTree.navigationPath,
      mcpContext: navigationTree.mcpContext
    },
    crawlState: {
      steps: crawlState.steps,
      currentStepId: crawlState.currentStepId,
      stepCounter: crawlState.stepCounter
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

// Helper function to generate intelligent form data based on agent suggestions
function generateIntelligentFormData(placeholder: string, name: string, id: string, type: string, label: string, config: any): string {
  const context = `${placeholder} ${name} ${id} ${label}`.toLowerCase();
  const agentSuggestions = config.agent_suggestions;
  
  // Find matching situation based on context
  const matchingSuggestion = agentSuggestions.find((suggestion: any) => {
    const given = suggestion.given.toLowerCase();
    const when = suggestion.when.toLowerCase();
    const then = suggestion.then.toLowerCase();
    
    // Check if context matches any part of the suggestion
    return context.includes('sign') && given.includes('sign up') ||
           context.includes('login') && given.includes('login') ||
           context.includes('article') && given.includes('article') ||
           context.includes('comment') && given.includes('comment') ||
           context.includes('profile') && given.includes('profile') ||
           context.includes('search') && given.includes('search') ||
           context.includes('contact') && given.includes('contact') ||
           context.includes('newsletter') && given.includes('newsletter');
  });
  
  if (matchingSuggestion) {
    // Extract data from the "then" clause
    const thenClause = matchingSuggestion.then;
    
    // Email fields
    if (type === 'email' || context.includes('email') || context.includes('e-mail')) {
      const emailMatch = thenClause.match(/email:\s*([^\s,]+)/);
      return emailMatch ? emailMatch[1] : 'test@example.com';
    }
    
    // Password fields
    if (type === 'password' || context.includes('password') || context.includes('pass')) {
      const passwordMatch = thenClause.match(/password:\s*([^\s,]+)/);
      return passwordMatch ? passwordMatch[1] : 'TestPassword123!';
    }
    
    // Username fields
    if (context.includes('username') || context.includes('user') || context.includes('login')) {
      const usernameMatch = thenClause.match(/username:\s*([^\s,]+)/);
      return usernameMatch ? usernameMatch[1] : 'testuser';
    }
    
    // Title fields
    if (context.includes('title') || context.includes('subject') || context.includes('headline')) {
      const titleMatch = thenClause.match(/title:\s*([^,]+)/);
      return titleMatch ? titleMatch[1].trim() : 'Test Article Title';
    }
    
    // Comment/Content fields
    if (type === 'textarea' || context.includes('comment') || context.includes('message') || context.includes('content')) {
      const commentMatch = thenClause.match(/comment:\s*([^,]+)/);
      const contentMatch = thenClause.match(/content:\s*([^,]+)/);
      const messageMatch = thenClause.match(/message:\s*([^,]+)/);
      
      if (commentMatch) return commentMatch[1].trim();
      if (contentMatch) return contentMatch[1].trim();
      if (messageMatch) return messageMatch[1].trim();
      return 'This is a test comment for web crawling purposes.';
    }
    
    // Name fields
    if (context.includes('name') || context.includes('first') || context.includes('last')) {
      const nameMatch = thenClause.match(/name:\s*([^,]+)/);
      return nameMatch ? nameMatch[1].trim() : 'John Doe';
    }
    
    // Search fields
    if (context.includes('search') || context.includes('query')) {
      const searchMatch = thenClause.match(/query:\s*([^,]+)/);
      return searchMatch ? searchMatch[1].trim() : 'test search query';
    }
  }
  
  // Fallback to type-based defaults
  switch (type) {
    case 'email':
      return 'test@example.com';
    case 'password':
      return 'TestPassword123!';
    case 'url':
      return 'https://example.com';
    case 'number':
      return '123';
    case 'tel':
      return '+1-555-123-4567';
    case 'date':
      return '1990-01-01';
    case 'time':
      return '12:00';
    case 'textarea':
      return 'This is a test comment for web crawling purposes.';
    default:
      return 'Test Input Data';
  }
}

// Helper function to handle logout as final step
async function handleLogoutAsFinalStep(page: any, navigationTree: NavigationTree, outDir: string, crawlState: CrawlState) {
  if (navigationTree.logoutButtons && navigationTree.logoutButtons.length > 0) {
    console.log(`\n🚪 Final step: Handling logout/sign out`);
    
    try {
      // Take screenshot before logout
      const beforeLogoutTimestamp = Date.now();
      const beforeLogoutScreenshot = await saveScreenshot(page, path.join(outDir, 'images'), `${beforeLogoutTimestamp}_before_logout.png`);
      
      // Add step for logout attempt
      addCrawlStep(
        crawlState,
        'logout_attempt',
        page.url(),
        await page.title(),
        beforeLogoutScreenshot,
        `Attempting to logout/sign out as final step`,
        undefined,
        false,
        undefined,
        undefined
      );
      
      // Try to click the first logout button
      const logoutButton = navigationTree.logoutButtons[0];
      if (logoutButton && await logoutButton.isVisible()) {
        // Highlight the logout button
        await logoutButton.evaluate((el: any) => {
          el.style.border = '3px solid #FF5722';
          el.style.backgroundColor = 'rgba(255, 87, 34, 0.2)';
          el.style.transition = 'all 0.3s ease';
        });
        
        console.log(`🚪 Clicking logout/sign out button...`);
        await logoutButton.click();
        await page.waitForTimeout(3000); // Wait for logout
        
        // Take screenshot after logout
        const afterLogoutTimestamp = Date.now();
        const afterLogoutScreenshot = await saveScreenshot(page, path.join(outDir, 'images'), `${afterLogoutTimestamp}_after_logout.png`);
        
        // Add step for successful logout
        addCrawlStep(
          crawlState,
          'logout_success',
          page.url(),
          await page.title(),
          afterLogoutScreenshot,
          `Successfully logged out/signed out`,
          undefined,
          false,
          undefined,
          undefined
        );
        
        console.log(`✅ Logout/sign out completed successfully`);
      } else {
        console.log(`⚠️ Logout button not visible or accessible`);
        
        // Add step for logout failure
        addCrawlStep(
          crawlState,
          'logout_failed',
          page.url(),
          await page.title(),
          beforeLogoutScreenshot,
          `Logout button not accessible`,
          undefined,
          false,
          undefined,
          undefined
        );
      }
    } catch (error) {
      console.log(`❌ Error during logout: ${error}`);
      
      // Take screenshot for error case
      const errorTimestamp = Date.now();
      const errorScreenshot = await saveScreenshot(page, path.join(outDir, 'images'), `${errorTimestamp}_logout_error.png`);
      
      // Add step for logout error
      addCrawlStep(
        crawlState,
        'logout_error',
        page.url(),
        await page.title(),
        errorScreenshot,
        `Error during logout: ${error}`,
        undefined,
        false,
        undefined,
        undefined
      );
    }
  } else {
    console.log(`ℹ️ No logout/sign out buttons found - skipping logout step`);
  }
}

// Helper function to execute MCP-suggested actions
async function executeMCPActions(page: any, mcpAnalysis: any, currentUrl: string, navigationTree: NavigationTree, outDir: string, crawlState: CrawlState, config: any): Promise<TodoItem[]> {
  const newTodoItems: TodoItem[] = [];
  
  // Check for logout/sign out buttons first (these should be clicked last)
  const logoutSelectors = config.logout.detectionSelectors.join(', ');
  const logoutButtons = await page.$$(logoutSelectors);
  
  if (logoutButtons.length > 0) {
    console.log(`🚪 Found ${logoutButtons.length} logout/sign out buttons - will be clicked as final step`);
    // Store logout buttons for later use
    navigationTree.logoutButtons = logoutButtons;
  }

  // Enhanced form filling with 2 items and submission
  if (mcpAnalysis.formFields && mcpAnalysis.formFields.length > 0) {
    console.log(`📝 MCP Agent found ${mcpAnalysis.formFields.length} form fields to fill`);
    
    // Take screenshot BEFORE form filling
    const beforeFillTimestamp = Date.now();
    const beforeFillScreenshot = await saveScreenshot(page, path.join(outDir, 'images'), `${beforeFillTimestamp}_form_before_fill.png`);
    console.log(`📸 Screenshot taken BEFORE form filling: ${beforeFillScreenshot}`);
    
    // Add step for form filling start
    addCrawlStep(
      crawlState,
      'form_fill_start',
      currentUrl,
      await page.title(),
      beforeFillScreenshot,
      `Starting to fill ${mcpAnalysis.formFields.length} form fields`,
      mcpAnalysis.formFields,
      false,
      undefined,
      mcpAnalysis
    );
    
    // Enhanced form filling with intelligent data based on placeholders and form purpose
    for (const field of mcpAnalysis.formFields) {
      try {
        const element = await page.$(field.selector);
        if (element && await element.isVisible()) {
          // Get additional context from the element
          const placeholder = await element.getAttribute('placeholder') || '';
          const name = await element.getAttribute('name') || '';
          const id = await element.getAttribute('id') || '';
          const type = await element.getAttribute('type') || 'text';
          
          // Generate intelligent data based on context
          const intelligentValue = generateIntelligentFormData(placeholder, name, id, type, field.label, config);
          
          await element.fill(intelligentValue);
          console.log(`📝 MCP filled ${field.label} (${placeholder || name || id}) with: ${intelligentValue}`);
          
          // Take screenshot after each field is filled
          const fieldTimestamp = Date.now();
          const fieldScreenshot = await saveScreenshot(page, path.join(outDir, 'images'), `${fieldTimestamp}_form_field_filled_${field.label.replace(/\s+/g, '_')}.png`);
          
          addCrawlStep(
            crawlState,
            'form_field_filled',
            currentUrl,
            await page.title(),
            fieldScreenshot,
            `Filled field: ${field.label} (${placeholder || name || id}) with: ${intelligentValue}`,
            [field],
            false,
            undefined,
            mcpAnalysis
          );
        }
      } catch (error) {
        console.log(`❌ Could not fill field ${field.selector}: ${error}`);
        
        // Take screenshot of error state
        const errorTimestamp = Date.now();
        const errorScreenshot = await saveScreenshot(page, path.join(outDir, 'images'), `${errorTimestamp}_form_field_error_${field.label.replace(/\s+/g, '_')}.png`);
        
        addCrawlStep(
          crawlState,
          'form_field_error',
          currentUrl,
          await page.title(),
          errorScreenshot,
          `Error filling field: ${field.label} - ${error}`,
          [field],
          false,
          undefined,
          mcpAnalysis
        );
      }
    }
    
    // Take screenshot AFTER all fields are filled
    const afterFillTimestamp = Date.now();
    const afterFillScreenshot = await saveScreenshot(page, path.join(outDir, 'images'), `${afterFillTimestamp}_form_after_fill.png`);
    console.log(`📸 Screenshot taken AFTER form filling: ${afterFillScreenshot}`);
    
    // Add step for form filling completion
    addCrawlStep(
      crawlState,
      'form_fill_complete',
      currentUrl,
      await page.title(),
      afterFillScreenshot,
      `Completed filling ${mcpAnalysis.formFields.length} form fields`,
      mcpAnalysis.formFields,
      false,
      undefined,
      mcpAnalysis
    );
    
    // Look for submit buttons and submit forms
    const submitButtons = await page.$$('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Post"), button:has-text("Create"), button:has-text("Save")');
    
    if (submitButtons.length > 0) {
      console.log(`🎯 MCP Agent found ${submitButtons.length} submit buttons`);
      
      // Try to submit up to configured limit
      for (let i = 0; i < Math.min(config.crawler.formSubmissionLimit, submitButtons.length); i++) {
        try {
          const submitButton = submitButtons[i];
          if (await submitButton.isVisible()) {
            // Highlight the submit button
            await submitButton.evaluate((el: any, visualConfig: any) => {
              el.style.border = `3px solid ${visualConfig.formHighlightColor}`;
              el.style.backgroundColor = visualConfig.formHighlightBackground;
              el.style.transition = 'all 0.3s ease';
            }, {
              formHighlightColor: config.visual.formHighlightColor,
              formHighlightBackground: config.visual.formHighlightBackground
            });
            
            console.log(`🚀 MCP Agent submitting form ${i + 1}/${config.crawler.formSubmissionLimit}...`);
            await submitButton.click();
            await page.waitForTimeout(config.crawler.waitForLoad); // Wait for submission
            
            // Take screenshot AFTER form submission
            const afterSubmitTimestamp = Date.now();
            const afterSubmitScreenshot = await saveScreenshot(page, path.join(outDir, 'images'), `${afterSubmitTimestamp}_form_after_submit_${i + 1}.png`);
            console.log(`📸 Screenshot taken AFTER form ${i + 1} submission: ${afterSubmitScreenshot}`);
            
            // Add step for form submission
            addCrawlStep(
              crawlState,
              'form_submit',
              currentUrl,
              await page.title(),
              afterSubmitScreenshot,
              `Submitted form ${i + 1}/2`,
              mcpAnalysis.formFields,
              true,
              undefined,
              mcpAnalysis
            );
            
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
