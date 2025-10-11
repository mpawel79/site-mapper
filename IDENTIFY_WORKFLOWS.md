# Identify Workflows Script

This script analyzes map.json files from crawling sessions to identify distinct user journeys and workflows.

## Usage

```bash
npm run identify-workflows <path-to-map.json>
```

Example:
```bash
npm run identify-workflows out/session_2025-10-02T04-17-22__demo.realworld.show/map.json
```

## Features

The script analyzes map.json files and:

1. **Identifies distinct user journeys** - Groups related steps into meaningful workflows
2. **Classifies use cases** - Automatically categorizes workflows (login, registration, article creation, etc.)
3. **Sorts by complexity** - Orders workflows from simplest to most complicated
4. **Generates detailed reports** - Provides comprehensive analysis in table format
5. **Exports to multiple formats** - Generates both CSV and Markdown files automatically

## Output Format

The script generates:

1. **Console Report**: Real-time analysis displayed in terminal
2. **CSV File**: Structured data for spreadsheet analysis
3. **Markdown File**: Detailed report with formatting and sections

### Data Fields

- **User Journey Name**: High-level category (Authentication, Content Creation, etc.)
- **Use Case Name**: Specific workflow (User Login, Create Article, etc.)
- **Steps IDs**: IDs of the steps involved in the workflow
- **Actions**: Page and area actions in sequence format
- **Inputs**: Form data and user inputs
- **Outputs**: Results and outcomes
- **Comment**: Description of what the workflow accomplishes
- **Complexity**: Numerical complexity score for sorting

## Workflow Types Detected

- **Authentication**: Login, Registration
- **Content Creation**: Article creation, content publishing
- **Content Consumption**: Article viewing, profile viewing
- **Content Interaction**: Commenting on articles
- **Profile Management**: Profile updates, settings changes
- **Data Entry**: Form submissions
- **Navigation**: Page browsing

## Complexity Calculation

Workflows are sorted by complexity based on:
- Number of steps
- Form interactions (weighted higher)
- Navigation complexity
- Number of unique pages visited

## Example Output

### Console Output
```
=== WORKFLOW ANALYSIS REPORT ===

Session: session_2025-10-02T04-17-22__demo.realworld.show
Total Steps: 26
Identified Workflows: 5

| User Journey | Use Case | Steps IDs | Actions | Inputs | Outputs | Comment |
|--------------|----------|----------|---------|--------|---------|---------|
| Data Entry | Fill Form on Home Page | step_2, step_3 | HomePage.FormArea(form_fill_start) ->... | text: Test Input Data; email: test@example.com... | None | User fills out a form on th... |

=== OUTPUT FILES GENERATED ===
CSV: out/session_2025-10-02T04-17-22__demo.realworld.show/workflows_session_2025-10-02T04-17-22__demo.realworld.show_2025-10-09T02-44-19-899Z.csv
MD:  out/session_2025-10-02T04-17-22__demo.realworld.show/workflows_session_2025-10-02T04-17-22__demo.realworld.show_2025-10-09T02-44-19-899Z.md
```

### Generated Files

- **CSV File**: Contains structured data with all workflow details in spreadsheet format
- **Markdown File**: Comprehensive report with sections, tables, and detailed analysis

## File Naming Convention

Generated files are stored in the same directory as the input map.json file and follow this pattern:
- `workflows_{session_name}_{timestamp}.csv`
- `workflows_{session_name}_{timestamp}.md`

For example, if analyzing `out/session_2025-10-02T04-17-22__demo.realworld.show/map.json`, the output files will be created in `out/session_2025-10-02T04-17-22__demo.realworld.show/` directory.

## Requirements

- Node.js with TypeScript support
- Map.json files from crawling sessions
- npm dependencies installed
