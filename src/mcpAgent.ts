import { GoogleGenerativeAI } from '@google/generative-ai';

// MCP Agent that integrates with Playwright MCP and Gemini
export class MCPAgent {
  private geminiModel: any;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    const genAI = new GoogleGenerativeAI(apiKey);
    // Try different model names in order of preference
    const modelNames = ['gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    
    for (const modelName of modelNames) {
      try {
        this.geminiModel = genAI.getGenerativeModel({ model: modelName });
        console.log(`✅ Using Gemini model: ${modelName}`);
        break;
      } catch (error) {
        console.log(`❌ Model ${modelName} not available, trying next...`);
        continue;
      }
    }
    
    if (!this.geminiModel) {
      console.log('⚠️ No Gemini models available, using fallback analysis');
    }
  }

  async analyzePageWithMCP(pageContent: string, pageStructure: string, currentUrl: string): Promise<any> {
    console.log('🤖 MCP Agent analyzing page with Gemini...');
    
    const prompt = `
    You are an advanced web crawling agent using Playwright MCP. Analyze this web page and provide intelligent crawling decisions:

    CURRENT URL: ${currentUrl}
    
    PAGE CONTENT:
    ${pageContent}
    
    PAGE STRUCTURE:
    ${pageStructure}
    
    As an MCP-powered agent, provide:
    1. Page type classification (home, article, profile, settings, login, etc.)
    2. Interactive elements analysis with smart selectors
    3. Form fields with appropriate dummy data suggestions
    4. Navigation priorities (what to explore first)
    5. Crawling strategy for this specific page
    6. Page name extraction (main heading or title)
    7. Area name identification (form areas, navigation areas, content sections)
    
    Focus on:
    - Finding the most valuable content to explore
    - Identifying navigation patterns
    - Suggesting realistic form interactions
    - Prioritizing user-generated content (articles, profiles)
    - Avoiding infinite loops and external links
    
    Respond with a JSON structure:
    {
      "pageType": "string",
      "pageName": "string",
      "areaName": "string",
      "crawlingStrategy": "string",
      "interactiveElements": [
        {
          "selector": "string",
          "type": "button|link|form|input",
          "text": "string",
          "purpose": "string",
          "priority": number,
          "action": "string"
        }
      ],
      "formFields": [
        {
          "selector": "string",
          "type": "string",
          "label": "string",
          "suggestedValue": "string",
          "required": boolean
        }
      ],
      "navigationPriorities": [
        {
          "selector": "string",
          "text": "string",
          "destination": "string",
          "priority": number,
          "reason": "string"
        }
      ],
      "nextActions": ["string"],
      "estimatedValue": number
    }
    `;

    if (!this.geminiModel) {
      console.log('🔄 Using fallback analysis (no Gemini model)');
      return this.getFallbackAnalysis();
    }
    
    try {
      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        console.log(`🧠 MCP Analysis: ${analysis.pageType} page with ${analysis.interactiveElements?.length || 0} elements`);
        console.log(`📊 Estimated Value: ${analysis.estimatedValue}/10`);
        return analysis;
      } else {
        throw new Error('No JSON found in Gemini response');
      }
    } catch (error) {
      // Suppress detailed error messages for cleaner output
      console.log('🔄 Gemini API unavailable, using intelligent fallback analysis');
      return this.getFallbackAnalysis();
    }
  }

  async generateCrawlingPlan(discoveredPages: any[], currentContext: string): Promise<any> {
    console.log('📋 MCP Agent generating crawling plan...');
    
    const prompt = `
    As an MCP-powered web crawling agent, create an intelligent crawling plan:

    CURRENT CONTEXT: ${currentContext}
    
    DISCOVERED PAGES: ${JSON.stringify(discoveredPages, null, 2)}
    
    Generate a strategic crawling plan that:
    1. Prioritizes high-value content (articles, user profiles, settings)
    2. Avoids duplicate exploration
    3. Maximizes coverage of the site
    4. Uses efficient navigation patterns
    5. Handles authentication and forms intelligently
    
    Provide a JSON response:
    {
      "crawlingPlan": {
        "priority": ["high", "medium", "low"],
        "strategy": "string",
        "estimatedTime": "string",
        "riskFactors": ["string"]
      },
      "nextActions": [
        {
          "action": "string",
          "target": "string",
          "priority": number,
          "reason": "string"
        }
      ],
      "optimization": {
        "parallelCrawling": boolean,
        "smartWaiting": boolean,
        "formHandling": "string"
      }
    }
    `;

    try {
      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in plan response');
      }
    } catch (error) {
      console.error('❌ MCP Plan generation error:', error);
      return this.getFallbackPlan();
    }
  }

  async optimizeNavigation(currentPath: string[], availableOptions: any[]): Promise<any> {
    console.log('🧭 MCP Agent optimizing navigation...');
    
    const prompt = `
    Optimize navigation for web crawling using MCP capabilities:

    CURRENT PATH: ${JSON.stringify(currentPath)}
    AVAILABLE OPTIONS: ${JSON.stringify(availableOptions)}
    
    Provide navigation optimization:
    1. Best next steps to maximize site coverage
    2. Avoid redundant paths
    3. Prioritize unexplored areas
    4. Handle dynamic content and SPAs
    
    JSON response:
    {
      "optimizedPath": ["string"],
      "nextTargets": [
        {
          "url": "string",
          "priority": number,
          "reason": "string"
        }
      ],
      "efficiency": number,
      "coverage": number
    }
    `;

    try {
      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in optimization response');
      }
    } catch (error) {
      console.error('❌ MCP Navigation optimization error:', error);
      return this.getFallbackOptimization();
    }
  }

  private getFallbackAnalysis(): any {
    return {
      pageType: 'webpage',
      pageName: 'Unknown Page',
      areaName: 'Main Content Area',
      crawlingStrategy: 'intelligent_fallback_exploration',
      interactiveElements: [
        {
          selector: 'a[href]:not([href^="http"]):not([href^="#"])',
          type: 'link',
          text: 'internal navigation links',
          purpose: 'page navigation',
          priority: 6,
          action: 'click'
        },
        {
          selector: 'button:not([disabled])',
          type: 'button',
          text: 'interactive buttons',
          purpose: 'user interaction',
          priority: 5,
          action: 'click'
        },
        {
          selector: 'input[type="submit"]',
          type: 'submit',
          text: 'form submission',
          purpose: 'form interaction',
          priority: 4,
          action: 'click'
        }
      ],
      formFields: [
        {
          selector: 'input[type="text"]:not([readonly])',
          type: 'text',
          label: 'text input',
          suggestedValue: 'Test Input Data',
          required: false
        },
        {
          selector: 'input[type="email"]:not([readonly])',
          type: 'email',
          label: 'email input',
          suggestedValue: 'test@example.com',
          required: false
        },
        {
          selector: 'input[type="password"]:not([readonly])',
          type: 'password',
          label: 'password input',
          suggestedValue: 'TestPassword123',
          required: false
        },
        {
          selector: 'textarea:not([readonly])',
          type: 'textarea',
          label: 'text area',
          suggestedValue: 'This is a test comment for web crawling purposes.',
          required: false
        },
        {
          selector: 'input[type="url"]:not([readonly])',
          type: 'url',
          label: 'URL input',
          suggestedValue: 'https://example.com',
          required: false
        },
        {
          selector: 'input[type="number"]:not([readonly])',
          type: 'number',
          label: 'number input',
          suggestedValue: '123',
          required: false
        }
      ],
      navigationPriorities: [
        {
          selector: 'a[href*="article"]',
          text: 'article links',
          destination: 'article pages',
          priority: 9,
          reason: 'high-value content - articles contain the most information'
        },
        {
          selector: 'a[href*="profile"]',
          text: 'profile links',
          destination: 'user profiles',
          priority: 8,
          reason: 'user-generated content - profiles show user activity'
        },
        {
          selector: 'a[href*="editor"]',
          text: 'editor links',
          destination: 'content creation',
          priority: 7,
          reason: 'content creation interface'
        },
        {
          selector: 'a[href*="settings"]',
          text: 'settings links',
          destination: 'user settings',
          priority: 6,
          reason: 'user preferences and configuration'
        },
        {
          selector: 'a[href]:not([href*="article"]):not([href*="profile"]):not([href*="editor"]):not([href*="settings"])',
          text: 'other navigation links',
          destination: 'other pages',
          priority: 4,
          reason: 'general navigation'
        }
      ],
      nextActions: [
        'Prioritize article and profile links for maximum content discovery',
        'Fill any visible forms with realistic test data',
        'Click on interactive buttons and elements',
        'Explore navigation menus and links',
        'Look for user-generated content areas'
      ],
      estimatedValue: 7
    };
  }

  private getFallbackPlan(): any {
    return {
      crawlingPlan: {
        priority: ['high', 'medium', 'low'],
        strategy: 'systematic exploration',
        estimatedTime: '10-15 minutes',
        riskFactors: ['dynamic content', 'authentication required']
      },
      nextActions: [
        {
          action: 'explore_links',
          target: 'navigation',
          priority: 8,
          reason: 'Discover new pages'
        }
      ],
      optimization: {
        parallelCrawling: false,
        smartWaiting: true,
        formHandling: 'fill_with_dummy_data'
      }
    };
  }

  private getFallbackOptimization(): any {
    return {
      optimizedPath: [],
      nextTargets: [],
      efficiency: 0.5,
      coverage: 0.3
    };
  }
}
