# Advanced Web Crawler with MCP Integration

A sophisticated web crawling agent that combines Playwright automation with Google Gemini AI to intelligently explore websites, fill forms, and document the entire process with comprehensive screenshots and state tracking.

## 🚀 Features

- **AI-Powered Analysis**: Google Gemini integration for intelligent page analysis
- **Intelligent Form Filling**: Context-aware data generation based on field purpose
- **Comprehensive Screenshot Documentation**: Timestamped captures at every interaction stage
- **Step-by-Step State Tracking**: Complete interaction timeline with linked steps
- **Logout Handling**: Final step execution for logout/sign out buttons
- **Visual Browser Feedback**: Headed mode with element highlighting

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key

## 🛠️ Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd trys
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env_example .env
   ```
   
   Edit `.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Configure the crawler**
   
   Edit `config.json` to customize:
   - Base URL to crawl
   - Browser settings
   - AI model preferences
   - Output directories

5. **Install Playwright browsers**
   ```bash
   npm run prepare-playwright
   ```

## 🚀 Usage

### Basic Usage
```bash
npm start
```

### Different Modes
```bash
# Headed mode (default)
npm start

# Headless mode
npm run start:headless

# Slow motion for observation
npm run start:slow
```

### Environment Variables
- `GEMINI_API_KEY`: Your Google Gemini API key
- `HEADLESS`: Set to `true` for headless mode
- `SLOW_MO`: Delay between actions in milliseconds
- `DEVTOOLS`: Set to `true` to open browser devtools

## ⚙️ Configuration

### config.json
```json
{
  "crawler": {
    "baseUrl": "https://demo.realworld.show",
    "loginUrl": "https://demo.realworld.show/#/login",
    "maxPages": 50,
    "timeout": 10000
  },
  "ai": {
    "modelName": "gemini-pro",
    "fallbackModels": ["gemini-1.5-flash", "gemini-1.5-pro"]
  },
  "browser": {
    "headless": false,
    "slowMo": 1000
  }
}
```

## 📊 Output

The crawler generates:
- **Screenshots**: Timestamped images of every interaction
- **map.json**: Complete state documentation with linked steps
- **Step tracking**: Detailed interaction timeline

### Screenshot Naming
- `{timestamp}_page_{number}.png` - Page visits
- `{timestamp}_form_before_fill.png` - Before form filling
- `{timestamp}_form_after_fill.png` - After form filling
- `{timestamp}_form_field_filled_{field}.png` - Individual field fills
- `{timestamp}_form_after_submit_{number}.png` - Form submissions

## 🎯 Step Types

- `page_visit` - Initial page navigation
- `form_fill_start` - Beginning of form filling
- `form_field_filled` - Individual field completion with intelligent data
- `form_fill_complete` - All fields completed
- `form_submit` - Form submission
- `logout_attempt` - Logout button click attempt
- `logout_success` - Successful logout
- `logout_failed` - Logout button not accessible

## 🧠 Intelligent Form Filling

The crawler analyzes field context to generate appropriate data:

- **Comment fields**: "This is a test comment for web crawling purposes."
- **Title fields**: "Test Article Title"
- **URL fields**: "https://example.com"
- **Email fields**: "test@example.com"
- **Password fields**: "TestPassword123!"
- **Bio fields**: Contextual bio content
- **Address fields**: Complete address information

## 🔧 Development

### Project Structure
```
src/
├── cli.ts              # Main entry point
├── mcpSmartCrawler.ts  # Main crawler logic
├── mcpAgent.ts         # AI agent integration
├── browserAgent.ts     # Browser management
└── formFiller.ts       # Form interaction utilities
```

### Scripts
- `npm start` - Run with default settings
- `npm run start:headed` - Run in headed mode
- `npm run start:headless` - Run in headless mode
- `npm run start:slow` - Run with 2-second delays
- `npm run build` - Compile TypeScript
- `npm run prepare-playwright` - Install Playwright browsers

## 📈 Performance

Typical run results:
- **Pages Discovered**: 5-50 pages per run
- **Steps Recorded**: 20-100+ steps per run
- **Screenshots Captured**: 1-3 per step
- **Form Interactions**: 2-6 forms per page

## 🛡️ Error Handling

- **Robust Fallback System**: Continues when AI is unavailable
- **Visual Error Indicators**: Red borders for failed interactions
- **Error Screenshots**: Captures error states with timestamps
- **Graceful Continuation**: Continues despite individual failures

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions, please open an issue on the repository.

---

*This crawler represents a state-of-the-art web automation solution combining AI intelligence with comprehensive documentation and error handling.*