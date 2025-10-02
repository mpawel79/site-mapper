# Advanced Web Crawler with MCP Integration

## Overview
This is a sophisticated web crawling agent that combines Playwright automation with Google Gemini AI to intelligently explore websites, fill forms, and document the entire process with comprehensive screenshots and state tracking.

## 🚀 Key Features

### 1. **AI-Powered Page Analysis**
- **Google Gemini Integration**: Uses Gemini API for intelligent page analysis
- **Fallback Analysis**: Robust fallback when AI is unavailable
- **Smart Element Detection**: Identifies interactive elements, forms, and navigation options
- **Priority-Based Exploration**: Ranks pages and actions by importance

### 2. **Intelligent Form Interaction**
- **Context-Aware Form Filling**: Analyzes placeholders, names, IDs, and field types to generate appropriate data
- **Smart Data Generation**: Creates realistic test data based on field purpose:
  - **Comment fields**: "This is a test comment for web crawling purposes."
  - **Title fields**: "Test Article Title"
  - **URL fields**: "https://example.com"
  - **Email fields**: "test@example.com"
  - **Password fields**: "TestPassword123!"
  - **Bio fields**: Contextual bio content
  - **Address fields**: Complete address information
  - **Phone fields**: "+1-555-123-4567"
- **Multi-Field Form Filling**: Automatically fills text, email, password, textarea, URL, number, date, and time fields
- **Form Submission**: Submits up to 2 forms per page with visual feedback
- **Error Handling**: Captures screenshots when form filling fails

### 3. **Advanced Screenshot Documentation**
- **Timestamped Screenshots**: All images start with timestamp for proper sequencing
- **Multi-Stage Capture**: Screenshots at every interaction stage:
  - Before form filling
  - After each field is filled
  - After form completion
  - After form submission
- **Error State Capture**: Screenshots when interactions fail
- **Visual Feedback**: Element highlighting during interactions

### 4. **Intelligent Navigation**
- **Priority-Based Queue**: TODO queue with priority scoring
- **Visited URL Tracking**: Prevents infinite loops
- **Navigation Tree**: Complete path tracking with links between steps
- **Smart Link Discovery**: Finds and prioritizes high-value content

### 5. **Step-by-Step State Tracking**
- **Complete Step Documentation**: Every interaction recorded as a step
- **Linked Navigation**: Each step knows its previous and next step
- **Detailed Descriptions**: Clear descriptions of what happened with context
- **Intelligent Form Field Tracking**: Individual field interactions with smart data generation
- **Context-Aware Logging**: Shows field placeholders and generated data
- **Action Types**: Categorized actions (page_visit, form_fill, form_submit, logout_attempt, etc.)

### 6. **Logout Handling**
- **Final Step Execution**: Logout/sign out buttons clicked as the last step
- **Multiple Detection Methods**: Finds logout buttons by text, links, and data attributes
- **Graceful Error Handling**: Handles cases where logout buttons aren't accessible

### 7. **Visual Browser Feedback**
- **Headed Mode**: Browser runs in headed mode for visual verification
- **Element Highlighting**: Interactive elements highlighted before clicking
- **Progress Indicators**: Visual indicators showing agent activity
- **Slow Motion**: Configurable delays for better observation

## 🏗️ Architecture

### Core Components

#### 1. **MCP Agent (`mcpAgent.ts`)**
- Google Gemini API integration
- Page content analysis
- Fallback analysis when AI unavailable
- Model selection with fallback chain

#### 2. **Smart Crawler (`mcpSmartCrawler.ts`)**
- Main orchestration logic
- TODO queue management
- Step tracking and state management
- Logout handling

#### 3. **Browser Agent (`browserAgent.ts`)**
- Playwright browser management
- Screenshot capture
- Element interaction utilities

#### 4. **Form Filler (`formFiller.ts`)**
- Form field detection
- Dummy data generation
- Form submission handling

### Data Structures

#### **CrawlStep Interface**
```typescript
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
```

#### **NavigationTree Interface**
```typescript
interface NavigationTree {
  currentPage: string;
  todoQueue: TodoItem[];
  visitedUrls: Set<string>;
  navigationPath: string[];
  mcpContext: any;
  logoutButtons?: any[];
}
```

## 📊 Output Structure

### **map.json Structure**
```json
{
  "metadata": {
    "mcpPowered": true,
    "totalPages": 5,
    "totalSteps": 26,
    "visitedUrls": 5
  },
  "crawlState": {
    "steps": [...],
    "currentStepId": "step_26",
    "stepCounter": 26
  },
  "navigationTree": {
    "currentPage": "...",
    "todoQueue": [...],
    "visitedUrls": [...],
    "navigationPath": [...]
  }
}
```

### **Screenshot Naming Convention**
- `{timestamp}_page_{number}.png` - Page visits
- `{timestamp}_form_before_fill.png` - Before form filling
- `{timestamp}_form_after_fill.png` - After form filling
- `{timestamp}_form_field_filled_{field}.png` - Individual field fills
- `{timestamp}_form_after_submit_{number}.png` - Form submissions
- `{timestamp}_before_logout.png` - Before logout
- `{timestamp}_after_logout.png` - After logout

## 🎯 Step Types

### **Page Interaction Steps**
- `page_visit` - Initial page navigation
- `form_fill_start` - Beginning of form filling
- `form_field_filled` - Individual field completion with intelligent data
- `form_fill_complete` - All fields completed
- `form_submit` - Form submission
- `logout_attempt` - Logout button click attempt
- `logout_success` - Successful logout
- `logout_failed` - Logout button not accessible
- `logout_error` - Error during logout

### **Intelligent Form Field Examples**
- **Comment Field**: `"Filled field: text area (Write a comment...) with: This is a test comment for web crawling purposes."`
- **Title Field**: `"Filled field: text input (Article Title) with: Test Article Title"`
- **URL Field**: `"Filled field: text input (URL of profile picture) with: https://example.com"`
- **Email Field**: `"Filled field: email input (Email) with: test@example.com"`
- **Password Field**: `"Filled field: password input (New Password) with: TestPassword123!"`

## 🔧 Configuration

### **Environment Variables**
- `HEADLESS` - Run browser in headless mode
- `SLOW_MO` - Delay between actions (milliseconds)
- `DEVTOOLS` - Open browser devtools

### **Scripts**
- `npm start` - Run with default settings
- `npm run start:headed` - Run in headed mode
- `npm run start:headless` - Run in headless mode
- `npm run start:slow` - Run with 2-second delays

## 🚀 Usage Examples

### **Basic Usage**
```bash
npm start
```

### **Headed Mode with Visual Feedback**
```bash
npm run start:headed
```

### **Slow Motion for Observation**
```bash
npm run start:slow
```

## 📈 Performance Metrics

### **Typical Run Results**
- **Pages Discovered**: 5-50 pages per run
- **Steps Recorded**: 20-100+ steps per run
- **Screenshots Captured**: 1-3 per step
- **Form Interactions**: 2-6 forms per page
- **Navigation Links**: 3-10 per page

### **Step Breakdown Example**
- Page visits: 5 steps
- Form filling: 15 steps
- Form submissions: 2 steps
- Navigation: 3 steps
- Logout: 1 step
- **Total**: 26 steps

## 🛡️ Error Handling

### **Robust Fallback System**
- **AI Unavailable**: Falls back to rule-based analysis
- **Form Filling Errors**: Captures error screenshots
- **Navigation Failures**: Continues with next item
- **Logout Failures**: Graceful handling with documentation

### **Visual Error Indicators**
- Red borders for failed interactions
- Error screenshots with timestamps
- Detailed error descriptions in steps
- Continuation despite errors

## 🔍 Advanced Features

### **Smart Element Detection**
- CSS selector generation
- Element visibility checks
- Interactive element prioritization
- Form field type detection

### **Intelligent Data Generation**
- **Context-Aware Analysis**: Analyzes placeholders, names, IDs, and field types
- **Smart Data Selection**: Generates appropriate data based on field purpose
- **Realistic Test Values**: Contextually appropriate dummy data
- **Field-Specific Intelligence**: Different data for comments, titles, URLs, emails, etc.
- **Validation-Aware Inputs**: Generates data that passes common validation rules

### **State Persistence**
- Periodic progress saves
- Complete state restoration
- Step-by-step replay capability
- Navigation path reconstruction

## 🎉 Benefits

1. **Complete Documentation**: Every interaction captured with screenshots
2. **Reproducible Results**: Step-by-step replay capability
3. **Visual Verification**: Headed mode for human observation
4. **Intelligent Exploration**: AI-powered page analysis
5. **Smart Form Filling**: Context-aware data generation based on field purpose
6. **Comprehensive Coverage**: Forms, navigation, and logout handling
7. **Error Resilience**: Continues despite failures
8. **State Tracking**: Complete interaction timeline with intelligent context
9. **Professional Output**: Structured JSON with linked steps and smart data
10. **Context-Aware Intelligence**: Understands field purpose and generates appropriate data

## 🔮 Future Enhancements

- **Multi-domain Support**: Cross-domain navigation
- **Custom Data Sets**: User-defined test data with templates
- **Advanced AI Context**: Even smarter field analysis with machine learning
- **Report Generation**: HTML/PDF reports with intelligent form analysis
- **API Integration**: REST API for remote control
- **Cloud Deployment**: Scalable cloud execution
- **Performance Optimization**: Faster execution with parallel processing
- **Custom Selectors**: User-defined element detection
- **Form Validation Testing**: Test form validation rules intelligently
- **Multi-language Support**: International form field detection

---

*This crawler represents a state-of-the-art web automation solution combining AI intelligence with comprehensive documentation and error handling.*
