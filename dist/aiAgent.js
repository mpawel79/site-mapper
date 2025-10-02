import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI('AIzaSyDAxKG31sXT0Ph5xhJa5m61KdoiEWeL5G0');
export class AIAgent {
    constructor(domain) {
        this.visitedUrls = new Set();
        this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        this.domain = domain;
    }
    async analyzePage(page) {
        console.log('🤖 AI Agent analyzing page...');
        // Get page content and structure
        const pageContent = await this.extractPageContent(page);
        const pageStructure = await this.extractPageStructure(page);
        const prompt = `
    Analyze this web page and provide detailed analysis for web crawling:

    PAGE CONTENT:
    ${pageContent}

    PAGE STRUCTURE:
    ${pageStructure}

    Please analyze this page and provide:
    1. What type of page this is (login, article, profile, settings, etc.)
    2. All interactive elements (buttons, links, forms) with their purposes
    3. Form fields that need to be filled with dummy data
    4. Navigation options to explore other pages
    5. Suggested actions to take on this page

    Focus on finding ways to navigate deeper into the site and discover new pages.
    For forms, suggest realistic dummy data to fill.
    For navigation, prioritize links that lead to new content areas.

    Respond in JSON format with this structure:
    {
      "pageType": "string",
      "interactiveElements": [
        {
          "selector": "string",
          "type": "button|link|form|input",
          "text": "string", 
          "purpose": "string",
          "action": "string"
        }
      ],
      "formFields": [
        {
          "selector": "string",
          "type": "string",
          "label": "string", 
          "placeholder": "string",
          "required": boolean,
          "suggestedValue": "string"
        }
      ],
      "navigationOptions": [
        {
          "selector": "string",
          "text": "string",
          "destination": "string",
          "priority": number
        }
      ],
      "suggestedActions": ["string"]
    }
    `;
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            else {
                throw new Error('No JSON found in response');
            }
        }
        catch (error) {
            console.error('Error analyzing page with AI:', error);
            return this.getFallbackAnalysis(page);
        }
    }
    async extractPageContent(page) {
        return await page.evaluate(() => {
            // Remove script and style elements
            const scripts = document.querySelectorAll('script, style');
            scripts.forEach(el => el.remove());
            // Get text content
            const text = document.body.innerText;
            // Get page title and headings
            const title = document.title;
            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                .map(h => h.textContent?.trim())
                .filter(Boolean);
            return `Title: ${title}\nHeadings: ${headings.join(', ')}\nContent: ${text.slice(0, 2000)}`;
        });
    }
    async extractPageStructure(page) {
        return await page.evaluate(() => {
            const elements = [];
            // Get all interactive elements
            const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
                .map(el => ({
                tag: el.tagName,
                text: el.textContent?.trim() || el.getAttribute('value') || '',
                id: el.id,
                class: el.className,
                type: el.getAttribute('type')
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
    async getFallbackAnalysis(page) {
        console.log('🔄 Using fallback analysis (no AI)');
        // Extract basic page information without AI
        const interactiveElements = await page.evaluate(() => {
            const elements = [];
            // Get all clickable elements
            const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
            const links = Array.from(document.querySelectorAll('a[href]'));
            const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
            buttons.forEach((el, i) => {
                elements.push({
                    selector: `button:nth-of-type(${i + 1})`,
                    type: 'button',
                    text: el.textContent?.trim() || el.getAttribute('value') || '',
                    purpose: 'navigation or action',
                    action: 'click'
                });
            });
            links.forEach((el, i) => {
                const href = el.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('#')) {
                    elements.push({
                        selector: `a:nth-of-type(${i + 1})`,
                        type: 'link',
                        text: el.textContent?.trim() || '',
                        purpose: 'navigation',
                        action: 'click'
                    });
                }
            });
            return elements;
        });
        const formFields = await page.evaluate(() => {
            const fields = [];
            const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
            inputs.forEach((input, i) => {
                const type = input.getAttribute('type') || input.tagName.toLowerCase();
                const name = input.getAttribute('name') || '';
                const placeholder = input.getAttribute('placeholder') || '';
                let suggestedValue = '';
                if (type === 'email')
                    suggestedValue = 'test@example.com';
                else if (type === 'password')
                    suggestedValue = 'password123';
                else if (type === 'text' && name.includes('username'))
                    suggestedValue = 'testuser';
                else if (type === 'text' && name.includes('title'))
                    suggestedValue = 'Test Article Title';
                else if (type === 'textarea')
                    suggestedValue = 'This is a test article content for web crawling purposes.';
                else if (type === 'text')
                    suggestedValue = 'Test Value';
                fields.push({
                    selector: `${input.tagName.toLowerCase()}:nth-of-type(${i + 1})`,
                    type: type,
                    label: name || placeholder,
                    placeholder: placeholder,
                    required: input.hasAttribute('required'),
                    suggestedValue: suggestedValue
                });
            });
            return fields;
        });
        const navigationOptions = await page.evaluate(() => {
            const options = [];
            const links = Array.from(document.querySelectorAll('a[href]'));
            links.forEach((link, i) => {
                const href = link.getAttribute('href');
                const text = link.textContent?.trim();
                if (href && text && !href.startsWith('http') && !href.startsWith('#')) {
                    let priority = 1;
                    if (text.toLowerCase().includes('article'))
                        priority = 5;
                    else if (text.toLowerCase().includes('profile'))
                        priority = 4;
                    else if (text.toLowerCase().includes('settings'))
                        priority = 3;
                    else if (text.toLowerCase().includes('editor'))
                        priority = 4;
                    options.push({
                        selector: `a:nth-of-type(${i + 1})`,
                        text: text,
                        destination: href,
                        priority: priority
                    });
                }
            });
            return options.sort((a, b) => b.priority - a.priority);
        });
        return {
            pageType: 'webpage',
            interactiveElements: interactiveElements,
            suggestedActions: [
                'Fill any visible forms with test data',
                'Click on navigation links',
                'Explore article links',
                'Check user profiles'
            ],
            formFields: formFields,
            navigationOptions: navigationOptions
        };
    }
    async executeActions(page, analysis) {
        const newUrls = [];
        console.log(`🎯 Executing ${analysis.suggestedActions.length} suggested actions`);
        // Fill forms with dummy data
        for (const field of analysis.formFields) {
            try {
                const element = await page.$(field.selector);
                if (element) {
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
        for (const navOption of sortedNavOptions.slice(0, 5)) { // Limit to top 5
            try {
                const element = await page.$(navOption.selector);
                if (element && await element.isVisible()) {
                    const currentUrl = page.url();
                    await element.click();
                    await page.waitForTimeout(2000);
                    const newUrl = page.url();
                    if (newUrl !== currentUrl && this.isWithinDomain(newUrl)) {
                        newUrls.push(newUrl);
                        console.log(`🔗 Navigated to: ${newUrl}`);
                    }
                }
            }
            catch (error) {
                console.log(`❌ Could not click ${navOption.text}: ${error}`);
            }
        }
        // Click on interactive elements
        for (const element of analysis.interactiveElements.slice(0, 3)) { // Limit to top 3
            try {
                const el = await page.$(element.selector);
                if (el && await el.isVisible()) {
                    const currentUrl = page.url();
                    await el.click();
                    await page.waitForTimeout(2000);
                    const newUrl = page.url();
                    if (newUrl !== currentUrl && this.isWithinDomain(newUrl)) {
                        newUrls.push(newUrl);
                        console.log(`🎯 Clicked ${element.text}: ${newUrl}`);
                    }
                }
            }
            catch (error) {
                console.log(`❌ Could not interact with ${element.text}: ${error}`);
            }
        }
        return newUrls;
    }
    isWithinDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.includes(this.domain) || urlObj.hostname === this.domain;
        }
        catch {
            return false;
        }
    }
    addVisitedUrl(url) {
        this.visitedUrls.add(url);
    }
    hasVisited(url) {
        return this.visitedUrls.has(url);
    }
    getVisitedCount() {
        return this.visitedUrls.size;
    }
}
