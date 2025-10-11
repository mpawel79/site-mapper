#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

interface Step {
  id: string;
  stepNumber: number;
  timestamp: string;
  action: string;
  url: string;
  title: string;
  description: string;
  formSubmission?: boolean;
  formFields?: any[];
  previousStepId?: string;
  nextStepId?: string;
  screenshot?: string;
}

interface MapData {
  metadata: {
    seed: string;
    profile?: {
      username: string;
      email: string;
      password: string;
    };
    totalSteps: number;
    sessionInfo: {
      sessionDir: string;
      startTime: string;
      endTime: string;
      baseUrl: string;
      domain: string;
    };
  };
  crawlState: {
    steps: Step[];
  };
}

interface Workflow {
  userJourneyName: string;
  useCaseName: string;
  stepsIds: string[];
  actions: string;
  inputs: string[];
  outputs: string[];
  comment: string;
  complexity: number;
}

class WorkflowIdentifier {
  private mapData: MapData;
  private workflows: Workflow[] = [];
  private mapFilePath: string;

  constructor(mapFilePath: string) {
    this.mapFilePath = mapFilePath;
    this.mapData = this.loadMapData(mapFilePath);
    this.identifyWorkflows();
  }

  private loadMapData(mapFilePath: string): MapData {
    try {
      const data = fs.readFileSync(mapFilePath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Validate the structure
      if (!parsed.metadata) {
        throw new Error('Invalid map.json: missing metadata section');
      }
      
      if (!parsed.metadata.sessionInfo) {
        throw new Error('Invalid map.json: missing sessionInfo in metadata. This appears to be an old format map file.');
      }
      
      if (!parsed.crawlState || !parsed.crawlState.steps) {
        throw new Error('Invalid map.json: missing crawlState.steps section');
      }
      
      return parsed as MapData;
    } catch (error) {
      console.error(`❌ Error loading map file: ${error}`);
      console.log('');
      console.log('The map.json file must be from a recent crawling session with the correct format.');
      console.log('Make sure you are pointing to a session directory that contains a valid map.json file.');
      process.exit(1);
    }
  }

  private identifyWorkflows(): void {
    const steps = this.mapData.crawlState.steps;
    const workflows: Workflow[] = [];

    // Group steps into potential workflows based on patterns
    const workflowPatterns = this.identifyWorkflowPatterns(steps);
    
    for (const pattern of workflowPatterns) {
      const workflow = this.createWorkflow(pattern);
      if (workflow) {
        workflows.push(workflow);
      }
    }

    // Sort by complexity (simplest to most complicated)
    this.workflows = workflows.sort((a, b) => a.complexity - b.complexity);
  }

  private identifyWorkflowPatterns(steps: Step[]): Step[][] {
    const patterns: Step[][] = [];
    const baseUrl = this.mapData.metadata.sessionInfo.baseUrl;
    const homeUrl = baseUrl + '/#/';
    
    // Find the starting step (usually step_1 or first page_visit to base URL)
    const startStep = steps.find(step => 
      step.action === 'page_visit' && 
      (step.url === baseUrl || step.url === homeUrl || step.url.includes(baseUrl))
    ) || steps[0];
    
    if (!startStep) return patterns;

    let currentPattern: Step[] = [];
    let inFormFlow = false;
    let formStartStep: Step | null = null;
    let hasStartedFromBase = false;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Check if this is a new workflow starting point
      const isNewWorkflowStart = this.isNewWorkflowStart(step, baseUrl, homeUrl);
      
      if (isNewWorkflowStart && currentPattern.length > 0) {
        // Complete current pattern and start new one
        if (this.isCompleteWorkflow(currentPattern)) {
          patterns.push([...currentPattern]);
        }
        currentPattern = [];
        inFormFlow = false;
        formStartStep = null;
        hasStartedFromBase = false;
      }
      
      // Start new workflow from base URL if not already started
      if (currentPattern.length === 0) {
        // Always start from the base URL step
        currentPattern = [startStep];
        hasStartedFromBase = true;
      }
      
      // Detect complete form workflows (start -> fill -> complete -> submit)
      if (step.action === 'form_fill_start') {
        if (!inFormFlow) {
          inFormFlow = true;
          formStartStep = step;
          currentPattern.push(step);
        } else {
          currentPattern.push(step);
        }
      } else if (step.action === 'form_fill_complete' || step.action === 'form_submit') {
        if (inFormFlow && formStartStep) {
          currentPattern.push(step);
          // Only add as pattern if it's a complete workflow
          if (step.action === 'form_submit' || (step.action === 'form_fill_complete' && this.isCompleteFormWorkflow(currentPattern))) {
            patterns.push([...currentPattern]);
            currentPattern = [];
            inFormFlow = false;
            formStartStep = null;
            hasStartedFromBase = false;
          }
        }
      } else if (step.action === 'page_visit' && !inFormFlow) {
        // Add navigation steps to current pattern
        currentPattern.push(step);
      } else if (step.action === 'navigate' || step.action.includes('click') || step.action === 'form_field_filled') {
        if (inFormFlow || currentPattern.length > 0) {
          currentPattern.push(step);
        }
      }
    }

    // Add any remaining pattern
    if (currentPattern.length > 0 && this.isCompleteWorkflow(currentPattern)) {
      patterns.push(currentPattern);
    }

    return patterns.filter(pattern => pattern.length > 0);
  }

  private isNewWorkflowStart(step: Step, baseUrl: string, homeUrl: string): boolean {
    // Check if this step represents a new workflow starting point
    if (step.action === 'page_visit') {
      const url = step.url;
      // New workflow if visiting a different main section
      if (url.includes('/article/') && !url.includes('/editor')) return true;
      if (url.includes('/profile/')) return true;
      if (url.includes('/settings')) return true;
      if (url.includes('/editor')) return true;
      if (url === baseUrl || url === homeUrl) return true;
    }
    return false;
  }

  private isCompleteWorkflow(pattern: Step[]): boolean {
    if (pattern.length === 0) return false;
    
    // A complete workflow should have at least 2 steps and end with a meaningful action
    const lastStep = pattern[pattern.length - 1];
    const meaningfulEndActions = ['form_fill_complete', 'form_submit', 'page_visit', 'navigate'];
    
    return pattern.length >= 2 && meaningfulEndActions.includes(lastStep.action);
  }

  private isCompleteFormWorkflow(steps: Step[]): boolean {
    const actions = steps.map(s => s.action);
    return actions.includes('form_fill_start') && 
           (actions.includes('form_fill_complete') || actions.includes('form_submit'));
  }

  private createWorkflow(steps: Step[]): Workflow | null {
    if (steps.length === 0) return null;

    const firstStep = steps[0];
    const lastStep = steps[steps.length - 1];
    
    // Determine workflow type based on actions and URLs
    const workflowInfo = this.classifyWorkflow(steps);
    
    // Extract inputs and outputs
    const inputs = this.extractInputs(steps);
    const outputs = this.extractOutputs(steps);
    
    // Calculate complexity
    const complexity = this.calculateComplexity(steps);
    
    // Build actions string
    const actions = this.buildActionsString(steps);

    return {
      userJourneyName: workflowInfo.userJourney,
      useCaseName: workflowInfo.useCase,
      stepsIds: steps.map(s => s.id),
      actions,
      inputs,
      outputs,
      comment: workflowInfo.comment,
      complexity
    };
  }

  private classifyWorkflow(steps: Step[]): { userJourney: string; useCase: string; comment: string } {
    const actions = steps.map(s => s.action).join(' ');
    const urls = steps.map(s => s.url).join(' ');
    const firstUrl = steps[0]?.url || '';
    const lastUrl = steps[steps.length - 1]?.url || '';
    
    // Find the destination page (where the main action happens)
    const destinationStep = steps.find(step => 
      step.url.includes('/article/') || 
      step.url.includes('/profile/') || 
      step.url.includes('/settings') || 
      step.url.includes('/editor')
    );
    
    const destinationUrl = destinationStep?.url || lastUrl;
    
    // Comment on article workflow
    if (destinationUrl.includes('article') && !destinationUrl.includes('editor') && actions.includes('form_fill') && actions.includes('form_submit')) {
      return {
        userJourney: 'Content Interaction',
        useCase: 'Comment on Article',
        comment: 'User reads an article and adds a comment'
      };
    }
    
    // Profile update workflow
    if (destinationUrl.includes('profile') && actions.includes('form_fill')) {
      return {
        userJourney: 'Profile Management',
        useCase: 'Update Profile',
        comment: 'User updates their profile information'
      };
    }
    
    // Settings update workflow
    if (destinationUrl.includes('settings') && actions.includes('form_fill')) {
      return {
        userJourney: 'Profile Management',
        useCase: 'Update Settings',
        comment: 'User updates their account settings'
      };
    }
    
    // Article creation workflow
    if (destinationUrl.includes('editor') && actions.includes('form_fill')) {
      return {
        userJourney: 'Content Creation',
        useCase: 'Create Article',
        comment: 'User creates and publishes a new article'
      };
    }
    
    // Login workflow
    if (destinationUrl.includes('login') || (actions.includes('form_fill') && destinationUrl.includes('auth'))) {
      return {
        userJourney: 'Authentication',
        useCase: 'User Login',
        comment: 'User authenticates to access the application'
      };
    }
    
    // Registration workflow
    if (destinationUrl.includes('register') || destinationUrl.includes('signup') || 
        (actions.includes('form_fill') && destinationUrl.includes('auth') && !destinationUrl.includes('login'))) {
      return {
        userJourney: 'Authentication',
        useCase: 'User Registration',
        comment: 'New user creates an account'
      };
    }
    
    // Article viewing workflow
    if (destinationUrl.includes('article') && !destinationUrl.includes('editor') && !actions.includes('form_fill')) {
      return {
        userJourney: 'Content Consumption',
        useCase: 'View Article',
        comment: 'User reads an article'
      };
    }
    
    // Profile viewing workflow
    if (destinationUrl.includes('profile') && !actions.includes('form_fill')) {
      return {
        userJourney: 'Content Consumption',
        useCase: 'View Profile',
        comment: 'User views another user\'s profile'
      };
    }
    
    // Home page interaction workflow
    if (destinationUrl.includes('#/') && !destinationUrl.includes('article') && !destinationUrl.includes('profile') && !destinationUrl.includes('settings') && !destinationUrl.includes('editor')) {
      if (actions.includes('form_fill')) {
        return {
          userJourney: 'Data Entry',
          useCase: 'Fill Form on Home Page',
          comment: 'User fills out a form on the home page'
        };
      } else {
        return {
          userJourney: 'Navigation',
          useCase: 'Browse Home Page',
          comment: 'User navigates the home page'
        };
      }
    }
    
    // General navigation workflow
    if (actions.includes('page_visit') || actions.includes('navigate')) {
      return {
        userJourney: 'Navigation',
        useCase: 'Browse Content',
        comment: 'User navigates through the application'
      };
    }
    
    // Form submission workflow
    if (actions.includes('form_fill') || actions.includes('form_submit')) {
      return {
        userJourney: 'Data Entry',
        useCase: 'Submit Form',
        comment: 'User fills out and submits a form'
      };
    }
    
    return {
      userJourney: 'Unknown',
      useCase: 'Unknown Workflow',
      comment: 'Unclassified workflow pattern'
    };
  }

  private extractInputs(steps: Step[]): string[] {
    const inputs: string[] = [];
    
    for (const step of steps) {
      if (step.formFields) {
        for (const field of step.formFields) {
          if (field.suggestedValue) {
            inputs.push(`${field.type}: ${field.suggestedValue}`);
          }
        }
      }
    }
    
    return inputs;
  }

  private extractOutputs(steps: Step[]): string[] {
    const outputs: string[] = [];
    
    for (const step of steps) {
      if (step.formSubmission) {
        outputs.push('Form submitted successfully');
      }
      if (step.action === 'form_submit') {
        outputs.push('Data saved to system');
      }
      if (step.action === 'navigate') {
        outputs.push(`Navigated to: ${step.title}`);
      }
    }
    
    return outputs;
  }

  private calculateComplexity(steps: Step[]): number {
    let complexity = 0;
    
    // Base complexity from number of steps
    complexity += steps.length;
    
    // Add complexity for form interactions
    const formSteps = steps.filter(s => s.action.includes('form'));
    complexity += formSteps.length * 2;
    
    // Add complexity for navigation
    const navSteps = steps.filter(s => s.action === 'navigate' || s.action.includes('click'));
    complexity += navSteps.length;
    
    // Add complexity for multiple pages
    const uniqueUrls = new Set(steps.map(s => s.url));
    complexity += uniqueUrls.size;
    
    return complexity;
  }

  private buildActionsString(steps: Step[]): string {
    const actionStrings: string[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const pageName = this.extractPageName(step.url);
      const areaName = this.extractAreaName(step);
      const action = step.action;
      
      actionStrings.push(`${pageName}.${areaName}(${action})`);
    }
    
    return actionStrings.join(' -> ');
  }

  private extractPageName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const hash = urlObj.hash;
      
      // Check hash for SPA routes
      if (hash.includes('login')) return 'LoginPage';
      if (hash.includes('register')) return 'RegisterPage';
      if (hash.includes('editor')) return 'EditorPage';
      if (hash.includes('settings')) return 'SettingsPage';
      if (hash.includes('profile')) return 'ProfilePage';
      if (hash.includes('article')) return 'ArticlePage';
      if (hash === '#/' || hash === '#' || pathname === '/') return 'HomePage';
      
      // Check pathname for traditional routes
      if (pathname.includes('login')) return 'LoginPage';
      if (pathname.includes('register')) return 'RegisterPage';
      if (pathname.includes('editor')) return 'EditorPage';
      if (pathname.includes('settings')) return 'SettingsPage';
      if (pathname.includes('profile')) return 'ProfilePage';
      if (pathname.includes('article')) return 'ArticlePage';
      
      return 'HomePage';
    } catch {
      return 'HomePage';
    }
  }

  private extractAreaName(step: Step): string {
    if (step.action.includes('form')) return 'FormArea';
    if (step.action.includes('click')) return 'InteractiveArea';
    if (step.action === 'navigate') return 'NavigationArea';
    if (step.action === 'page_visit') return 'PageArea';
    
    return 'GeneralArea';
  }

  public generateReport(): void {
    console.log('\n=== WORKFLOW ANALYSIS REPORT ===\n');
    console.log(`Session: ${this.mapData.metadata.sessionInfo.sessionDir}`);
    console.log(`Total Steps: ${this.mapData.metadata.totalSteps}`);
    console.log(`Identified Workflows: ${this.workflows.length}\n`);
    
    // Print table header
    console.log('| User Journey | Use Case | Steps IDs | Actions | Inputs | Outputs | Comment |');
    console.log('|--------------|----------|----------|---------|--------|---------|---------|');
    
    // Print each workflow
    for (const workflow of this.workflows) {
      const stepsIds = workflow.stepsIds.join(', ');
      const inputs = workflow.inputs.length > 0 ? workflow.inputs.slice(0, 2).join('; ') + (workflow.inputs.length > 2 ? '...' : '') : 'None';
      const outputs = workflow.outputs.length > 0 ? workflow.outputs.join('; ') : 'None';
      const actions = workflow.actions; // Show full actions without truncation
      const comment = workflow.comment.length > 30 ? 
        workflow.comment.substring(0, 27) + '...' : workflow.comment;
      
      console.log(`| ${workflow.userJourneyName} | ${workflow.useCaseName} | ${stepsIds} | ${actions} | ${inputs} | ${outputs} | ${comment} |`);
    }
    
    console.log('\n=== COMPLEXITY ANALYSIS ===\n');
    console.log('Workflows sorted by complexity (simplest to most complicated):\n');
    
    for (let i = 0; i < this.workflows.length; i++) {
      const workflow = this.workflows[i];
      console.log(`${i + 1}. ${workflow.useCaseName} (Complexity: ${workflow.complexity})`);
      console.log(`   Journey: ${workflow.userJourneyName}`);
      console.log(`   Steps: ${workflow.stepsIds.length}`);
      console.log(`   Comment: ${workflow.comment}\n`);
    }

    // Generate output files
    this.generateOutputFiles();
  }

  private generateOutputFiles(): void {
    const sessionDir = this.mapData.metadata.sessionInfo.sessionDir;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.dirname(this.mapFilePath);
    
    // Generate CSV file
    this.generateCSV(sessionDir, timestamp, outputDir);
    
    // Generate Markdown file
    this.generateMarkdown(sessionDir, timestamp, outputDir);
    
    // Generate HTML file
    this.generateHTML(sessionDir, timestamp, outputDir);
    
    console.log('\n=== OUTPUT FILES GENERATED ===');
    console.log(`CSV: ${path.join(outputDir, `workflows_${sessionDir}_${timestamp}.csv`)}`);
    console.log(`MD:  ${path.join(outputDir, `workflows_${sessionDir}_${timestamp}.md`)}`);
    console.log(`HTML: ${path.join(outputDir, `workflows_${sessionDir}_${timestamp}.html`)}`);
  }

  private generateCSV(sessionDir: string, timestamp: string, outputDir: string): void {
    const csvContent = this.createCSVContent();
    const csvFilename = `workflows_${sessionDir}_${timestamp}.csv`;
    const csvPath = path.join(outputDir, csvFilename);
    
    fs.writeFileSync(csvPath, csvContent, 'utf8');
  }

  private createCSVContent(): string {
    const headers = [
      'User Journey',
      'Use Case', 
      'Steps IDs',
      'Actions',
      'Inputs',
      'Outputs',
      'Comment',
      'Complexity'
    ];
    
    const rows = this.workflows.map(workflow => [
      this.escapeCSV(workflow.userJourneyName),
      this.escapeCSV(workflow.useCaseName),
      this.escapeCSV(workflow.stepsIds.join(', ')),
      this.escapeCSV(workflow.actions),
      this.escapeCSV(workflow.inputs.join('; ')),
      this.escapeCSV(workflow.outputs.join('; ')),
      this.escapeCSV(workflow.comment),
      workflow.complexity.toString()
    ]);
    
    const csvLines = [headers.join(','), ...rows.map(row => row.join(','))];
    return csvLines.join('\n');
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private generateMarkdown(sessionDir: string, timestamp: string, outputDir: string): void {
    const mdContent = this.createMarkdownContent();
    const mdFilename = `workflows_${sessionDir}_${timestamp}.md`;
    const mdPath = path.join(outputDir, mdFilename);
    
    fs.writeFileSync(mdPath, mdContent, 'utf8');
  }

  private createMarkdownContent(): string {
    const sessionInfo = this.mapData.metadata.sessionInfo;
    const metadata = this.mapData.metadata;
    
    let content = `# Workflow Analysis Report\n\n`;
    content += `**Session:** ${sessionInfo.sessionDir}\n`;
    content += `**Start Time:** ${sessionInfo.startTime}\n`;
    content += `**End Time:** ${sessionInfo.endTime}\n`;
    content += `**Base URL:** ${sessionInfo.baseUrl}\n`;
    content += `**Total Steps:** ${metadata.totalSteps}\n`;
    content += `**Identified Workflows:** ${this.workflows.length}\n\n`;
    
    content += `## Workflow Summary\n\n`;
    content += `| User Journey | Use Case | Steps IDs | Actions | Inputs | Outputs | Comment |\n`;
    content += `|--------------|----------|----------|---------|--------|---------|---------|\n`;
    
    for (const workflow of this.workflows) {
      const stepsIds = workflow.stepsIds.join(', ');
      const inputs = workflow.inputs.length > 0 ? workflow.inputs.slice(0, 3).join('; ') + (workflow.inputs.length > 3 ? '...' : '') : 'None';
      const outputs = workflow.outputs.length > 0 ? workflow.outputs.join('; ') : 'None';
      const actions = workflow.actions; // Show full actions without truncation
      const comment = workflow.comment.length > 40 ? 
        workflow.comment.substring(0, 37) + '...' : workflow.comment;
      
      content += `| ${workflow.userJourneyName} | ${workflow.useCaseName} | ${stepsIds} | ${actions} | ${inputs} | ${outputs} | ${comment} |\n`;
    }
    
    content += `\n## Complexity Analysis\n\n`;
    content += `Workflows sorted by complexity (simplest to most complicated):\n\n`;
    
    for (let i = 0; i < this.workflows.length; i++) {
      const workflow = this.workflows[i];
      content += `### ${i + 1}. ${workflow.useCaseName}\n\n`;
      content += `- **Journey:** ${workflow.userJourneyName}\n`;
      content += `- **Complexity:** ${workflow.complexity}\n`;
      content += `- **Steps:** ${workflow.stepsIds.length}\n`;
      content += `- **Step IDs:** ${workflow.stepsIds.join(', ')}\n`;
      content += `- **Actions:** ${workflow.actions}\n`;
      content += `- **Inputs:** ${workflow.inputs.length > 0 ? workflow.inputs.join('; ') : 'None'}\n`;
      content += `- **Outputs:** ${workflow.outputs.length > 0 ? workflow.outputs.join('; ') : 'None'}\n`;
      content += `- **Description:** ${workflow.comment}\n\n`;
    }
    
    content += `## Detailed Workflow Analysis\n\n`;
    
    // Group by user journey
    const journeyGroups = this.workflows.reduce((groups, workflow) => {
      if (!groups[workflow.userJourneyName]) {
        groups[workflow.userJourneyName] = [];
      }
      groups[workflow.userJourneyName].push(workflow);
      return groups;
    }, {} as Record<string, Workflow[]>);
    
    for (const [journey, workflows] of Object.entries(journeyGroups)) {
      content += `### ${journey}\n\n`;
      content += `Found ${workflows.length} workflow(s) in this journey:\n\n`;
      
      for (const workflow of workflows) {
        content += `#### ${workflow.useCaseName}\n\n`;
        content += `- **Complexity:** ${workflow.complexity}\n`;
        content += `- **Steps:** ${workflow.stepsIds.join(' → ')}\n`;
        content += `- **Actions:** ${workflow.actions}\n`;
        content += `- **Description:** ${workflow.comment}\n\n`;
      }
    }
    
    content += `---\n`;
    content += `*Generated on ${new Date().toISOString()}*\n`;
    
    return content;
  }

  private generateHTML(sessionDir: string, timestamp: string, outputDir: string): void {
    const htmlContent = this.createHTMLContent();
    const htmlFilename = `workflows_${sessionDir}_${timestamp}.html`;
    const htmlPath = path.join(outputDir, htmlFilename);
    
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  }

  private createHTMLContent(): string {
    const sessionInfo = this.mapData.metadata.sessionInfo;
    const metadata = this.mapData.metadata;
    
    let content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Analysis Report - ${sessionInfo.sessionDir}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 2.5em;
        }
        .header p {
            margin: 5px 0;
            opacity: 0.9;
        }
        .summary {
            background: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .summary h2 {
            color: #667eea;
            margin-top: 0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .summary-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .summary-item h3 {
            margin: 0 0 5px 0;
            color: #495057;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .summary-item p {
            margin: 0;
            font-size: 1.2em;
            font-weight: 600;
            color: #333;
        }
        .workflow-table {
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .workflow-table table {
            width: 100%;
            border-collapse: collapse;
        }
        .workflow-table th {
            background: #667eea;
            color: white;
            padding: 15px 10px;
            text-align: left;
            font-weight: 600;
        }
        .workflow-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #e9ecef;
        }
        .workflow-table tr:hover {
            background-color: #f8f9fa;
        }
        .complexity-section {
            background: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .complexity-section h2 {
            color: #667eea;
            margin-top: 0;
        }
        .workflow-item {
            background: #f8f9fa;
            padding: 20px;
            margin: 15px 0;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .workflow-item h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .workflow-item p {
            margin: 5px 0;
            color: #666;
        }
        .journey-section {
            background: white;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .journey-section h2 {
            color: #667eea;
            margin-top: 0;
        }
        .journey-group {
            margin: 20px 0;
        }
        .journey-group h3 {
            color: #495057;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 10px;
        }
        .workflow-detail {
            background: #f8f9fa;
            padding: 15px;
            margin: 10px 0;
            border-radius: 6px;
            border-left: 3px solid #667eea;
        }
        .workflow-detail h4 {
            margin: 0 0 8px 0;
            color: #333;
        }
        .workflow-detail p {
            margin: 4px 0;
            color: #666;
            font-size: 0.9em;
        }
        .footer {
            text-align: center;
            color: #666;
            margin-top: 40px;
            padding: 20px;
            border-top: 1px solid #e9ecef;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge-navigation { background: #e3f2fd; color: #1976d2; }
        .badge-content { background: #f3e5f5; color: #7b1fa2; }
        .badge-profile { background: #e8f5e8; color: #388e3c; }
        .badge-auth { background: #fff3e0; color: #f57c00; }
        .badge-data { background: #fce4ec; color: #c2185b; }
        .badge-unknown { background: #f5f5f5; color: #757575; }
        .screenshots-container {
            display: flex;
            flex-direction: row;
            gap: 8px;
            max-width: 300px;
            align-items: center;
        }
        .screenshot-thumbnail {
            position: relative;
            width: 80px;
            height: 50px;
            border-radius: 6px;
            overflow: hidden;
            cursor: pointer;
            border: 2px solid #e9ecef;
            transition: all 0.3s ease;
            flex-shrink: 0;
        }
        .screenshot-thumbnail:hover {
            border-color: #667eea;
            transform: scale(1.05);
            z-index: 10;
        }
        .screenshot-thumbnail:hover::after {
            content: '';
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            height: 200px;
            background: white;
            border: 3px solid #667eea;
            border-radius: 8px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            z-index: 1000;
            pointer-events: none;
        }
        .screenshot-thumbnail:hover .screenshot-img {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            height: 200px;
            object-fit: cover;
            border-radius: 5px;
            z-index: 1001;
            pointer-events: none;
        }
        .screenshot-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            transition: all 0.3s ease;
        }
        .screenshot-caption {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.7);
            color: white;
            font-size: 0.7em;
            padding: 2px 4px;
            text-align: center;
            font-weight: 600;
        }
        .no-screenshots {
            color: #666;
            font-style: italic;
            font-size: 0.9em;
        }
        .more-screenshots {
            background: #667eea;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: 600;
            text-align: center;
        }
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.8);
            cursor: pointer;
        }
        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 90%;
            max-height: 90%;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .modal-image {
            width: 100%;
            height: auto;
            display: block;
        }
        .modal-caption {
            padding: 15px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
            font-weight: 600;
            color: #333;
        }
        .close {
            position: absolute;
            top: 10px;
            right: 15px;
            color: white;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            z-index: 1001;
        }
        .close:hover {
            color: #ccc;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Workflow Analysis Report</h1>
        <p><strong>Session:</strong> ${sessionInfo.sessionDir}</p>
        <p><strong>Start Time:</strong> ${sessionInfo.startTime}</p>
        <p><strong>End Time:</strong> ${sessionInfo.endTime}</p>
        <p><strong>Base URL:</strong> ${sessionInfo.baseUrl}</p>
    </div>

    <div class="summary">
        <h2>📊 Summary</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <h3>Total Steps</h3>
                <p>${metadata.totalSteps}</p>
            </div>
            <div class="summary-item">
                <h3>Identified Workflows</h3>
                <p>${this.workflows.length}</p>
            </div>
            <div class="summary-item">
                <h3>User Journeys</h3>
                <p>${new Set(this.workflows.map(w => w.userJourneyName)).size}</p>
            </div>
            <div class="summary-item">
                <h3>Average Complexity</h3>
                <p>${Math.round(this.workflows.reduce((sum, w) => sum + w.complexity, 0) / this.workflows.length)}</p>
            </div>
        </div>
    </div>

    <div class="workflow-table">
        <h2 style="padding: 20px; margin: 0; color: #667eea;">📋 Workflow Overview</h2>
        <table>
            <thead>
                <tr>
                    <th>User Journey</th>
                    <th>Use Case</th>
                    <th>Steps IDs</th>
                    <th>Actions</th>
                    <th>Inputs</th>
                    <th>Outputs</th>
                    <th>Comment</th>
                    <th>Complexity</th>
                    <th>Flow Screenshots</th>
                </tr>
            </thead>
            <tbody>`;

    // Add workflow rows
    for (const workflow of this.workflows) {
      const stepsIds = workflow.stepsIds.join(', ');
      const inputs = workflow.inputs.length > 0 ? workflow.inputs.slice(0, 3).join('; ') + (workflow.inputs.length > 3 ? '...' : '') : 'None';
      const outputs = workflow.outputs.length > 0 ? workflow.outputs.join('; ') : 'None';
      const actions = workflow.actions;
      const comment = workflow.comment.length > 40 ? 
        workflow.comment.substring(0, 37) + '...' : workflow.comment;
      
      const journeyClass = this.getJourneyClass(workflow.userJourneyName);
      const screenshots = this.getWorkflowScreenshots(workflow);
      
      content += `
                <tr>
                    <td><span class="badge badge-${journeyClass}">${workflow.userJourneyName}</span></td>
                    <td>${workflow.useCaseName}</td>
                    <td>${stepsIds}</td>
                    <td>${actions}</td>
                    <td>${inputs}</td>
                    <td>${outputs}</td>
                    <td>${comment}</td>
                    <td>${workflow.complexity}</td>
                    <td>${screenshots}</td>
                </tr>`;
    }

    content += `
            </tbody>
        </table>
    </div>

    <div class="complexity-section">
        <h2>📈 Complexity Analysis</h2>
        <p>Workflows sorted by complexity (simplest to most complicated):</p>`;

    // Add complexity analysis
    for (let i = 0; i < this.workflows.length; i++) {
      const workflow = this.workflows[i];
      content += `
        <div class="workflow-item">
            <h3>${i + 1}. ${workflow.useCaseName} <span class="badge badge-${this.getJourneyClass(workflow.userJourneyName)}">${workflow.userJourneyName}</span></h3>
            <p><strong>Complexity:</strong> ${workflow.complexity}</p>
            <p><strong>Steps:</strong> ${workflow.stepsIds.length}</p>
            <p><strong>Description:</strong> ${workflow.comment}</p>
        </div>`;
    }

    content += `
    </div>

    <div class="journey-section">
        <h2>🎯 Detailed Workflow Analysis</h2>`;

    // Group by user journey
    const journeyGroups = this.workflows.reduce((groups, workflow) => {
      if (!groups[workflow.userJourneyName]) {
        groups[workflow.userJourneyName] = [];
      }
      groups[workflow.userJourneyName].push(workflow);
      return groups;
    }, {} as Record<string, Workflow[]>);

    for (const [journey, workflows] of Object.entries(journeyGroups)) {
      content += `
        <div class="journey-group">
            <h3>${journey} <span class="badge badge-${this.getJourneyClass(journey)}">${workflows.length} workflow(s)</span></h3>`;
      
      for (const workflow of workflows) {
        content += `
            <div class="workflow-detail">
                <h4>${workflow.useCaseName}</h4>
                <p><strong>Complexity:</strong> ${workflow.complexity}</p>
                <p><strong>Steps:</strong> ${workflow.stepsIds.join(' → ')}</p>
                <p><strong>Actions:</strong> ${workflow.actions}</p>
                <p><strong>Description:</strong> ${workflow.comment}</p>
            </div>`;
      }
      
      content += `
        </div>`;
    }

    content += `
    </div>

    <div class="footer">
        <p>Generated on ${new Date().toISOString()}</p>
        <p>Workflow Analysis Tool - Automated User Journey Detection</p>
    </div>

    <!-- Screenshot Modal -->
    <div id="screenshotModal" class="modal" onclick="closeScreenshotModal()">
        <div class="modal-content" onclick="event.stopPropagation()">
            <span class="close" onclick="closeScreenshotModal()">&times;</span>
            <img id="modalImage" class="modal-image" src="" alt="">
            <div id="modalCaption" class="modal-caption"></div>
        </div>
    </div>

    <script>
        function openScreenshotModal(imageSrc, caption) {
            const modal = document.getElementById('screenshotModal');
            const modalImage = document.getElementById('modalImage');
            const modalCaption = document.getElementById('modalCaption');
            
            modalImage.src = imageSrc;
            modalCaption.textContent = caption;
            modal.style.display = 'block';
            
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }
        
        function closeScreenshotModal() {
            const modal = document.getElementById('screenshotModal');
            modal.style.display = 'none';
            
            // Restore body scroll
            document.body.style.overflow = 'auto';
        }
        
        // Close modal when pressing Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeScreenshotModal();
            }
        });
    </script>
</body>
</html>`;

    return content;
  }

  private getJourneyClass(journeyName: string): string {
    const journeyMap: Record<string, string> = {
      'Navigation': 'navigation',
      'Content Consumption': 'content',
      'Content Creation': 'content',
      'Profile Management': 'profile',
      'Authentication': 'auth',
      'Data Entry': 'data',
      'Unknown': 'unknown'
    };
    return journeyMap[journeyName] || 'unknown';
  }

  private getWorkflowScreenshots(workflow: Workflow): string {
    const sessionDir = this.mapData.metadata.sessionInfo.sessionDir;
    const imagesDir = path.join(path.dirname(this.mapFilePath), 'images');
    
    // Get all steps for this workflow
    const workflowSteps = this.mapData.crawlState.steps.filter(step => 
      workflow.stepsIds.includes(step.id)
    );
    
    let screenshotsHtml = '<div class="screenshots-container">';
    let screenshotCount = 0;
    const maxScreenshots = 3; // Limit to 3 screenshots per workflow for table display
    
    for (const step of workflowSteps) {
      if (screenshotCount >= maxScreenshots) break;
      
      if (step.screenshot) {
        // Extract just the filename from the full path
        const screenshotPath = step.screenshot;
        const filename = path.basename(screenshotPath);
        
        // Check if the image file exists in the images directory
        const imagePath = path.join(imagesDir, filename);
        if (fs.existsSync(imagePath)) {
          const relativePath = `images/${filename}`;
          const altText = `${step.id}: ${step.action}`;
          
          screenshotsHtml += `
            <div class="screenshot-thumbnail">
              <img src="${relativePath}" 
                   alt="${altText}" 
                   title="${altText}"
                   class="screenshot-img"
                   loading="lazy">
              <div class="screenshot-caption">${step.id}</div>
            </div>`;
          screenshotCount++;
        }
      }
    }
    
    if (screenshotCount === 0) {
      screenshotsHtml += '<span class="no-screenshots">No screenshots available</span>';
    } else if (workflowSteps.length > maxScreenshots) {
      screenshotsHtml += `<div class="more-screenshots">+${workflowSteps.length - maxScreenshots} more</div>`;
    }
    
    screenshotsHtml += '</div>';
    return screenshotsHtml;
  }

  public getWorkflows(): Workflow[] {
    return this.workflows;
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Error: Session directory is required');
    console.log('');
    console.log('Usage: npm run identify-workflows <session-directory>');
    console.log('');
    console.log('Examples:');
    console.log('  npm run identify-workflows out/session_2025-10-11T16-45-16__demo.realworld.show');
    console.log('  npm run identify-workflows out/session_2025-10-08T23-05-01__demo.realworld.show');
    console.log('');
    console.log('This command only performs analysis of existing map.json files - no crawling is performed.');
    process.exit(1);
  }
  
  const sessionDir = args[0];
  
  // Check if directory exists
  if (!fs.existsSync(sessionDir)) {
    console.error(`❌ Error: Session directory '${sessionDir}' does not exist`);
    console.log('');
    console.log('Available session directories:');
    try {
      const outDir = 'out';
      if (fs.existsSync(outDir)) {
        const sessions = fs.readdirSync(outDir)
          .filter(item => fs.statSync(path.join(outDir, item)).isDirectory())
          .filter(item => item.startsWith('session_'))
          .sort()
          .reverse(); // Most recent first
        
        if (sessions.length > 0) {
          sessions.forEach(session => console.log(`  - ${session}`));
        } else {
          console.log('  No session directories found in out/');
        }
      } else {
        console.log('  No out/ directory found');
      }
    } catch (error) {
      console.log('  Could not list available sessions');
    }
    process.exit(1);
  }
  
  // Check if map.json exists in the directory
  const mapFilePath = path.join(sessionDir, 'map.json');
  if (!fs.existsSync(mapFilePath)) {
    console.error(`❌ Error: map.json file not found in '${sessionDir}'`);
    console.log('');
    console.log('The specified directory must contain a map.json file from a previous crawling session.');
    process.exit(1);
  }
  
  console.log(`🔍 Analyzing workflows in: ${sessionDir}`);
  console.log(`📄 Using map file: ${mapFilePath}`);
  console.log('');
  
  try {
    const identifier = new WorkflowIdentifier(mapFilePath);
    identifier.generateReport();
  } catch (error) {
    console.error(`❌ Error analyzing workflows: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('identify-workflows.ts')) {
  main();
}

export { WorkflowIdentifier, Workflow };
