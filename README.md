# Project Guardian MCP

A focused Model Context Protocol (MCP) server designed as your project's memory system and workflow guardian. This server provides streamlined database operations and advanced knowledge graph capabilities for intelligent project management, with exactly 17 tools, 10 resources, and 27 prompts to maintain clarity and focus.

## Features

### Project Guardian Memory System
- **Knowledge Graph**: Maintain project entities, relationships, and observations
- **Entity Management**: Projects, tasks, people, resources with rich metadata
- **Relationship Mapping**: Dependencies, ownership, blockers, and connections
- **Observation Tracking**: Contextual notes and progress updates
- **Semantic Search**: Full-text search across all project knowledge
- **Memory Persistence**: Automatic persistence in SQLite database

### Streamlined Database Operations
- **Single Database**: Uses only `memory.db` for all operations
- **Core CRUD**: Essential database operations (query, insert, update, delete)
- **SQL Execution**: Direct SQL query execution
- **Data Transfer**: Import/export CSV and JSON files
- **17 Tools Total**: Focused toolset for maximum clarity

### AI Guidance System
- **10 Resources**: Templates, best practices, cached data, and comprehensive project status
- **27 Prompts**: Comprehensive pre-built workflows for all aspects of project management
- **Expert Guidance**: Step-by-step instructions for complex operations
- **Contextual Help**: Adaptive prompts based on user needs
- **Knowledge Base**: Comprehensive project management wisdom

### Advanced Features
- **Schema Validation**: Comprehensive input validation with Zod schemas
- **Error Handling**: Detailed error messages and graceful failure handling
- **Connection Management**: Automatic connection pooling and cleanup
- **File Integration**: Seamless integration with filesystem operations
- **Performance**: Optimized for large datasets and batch operations

### Enterprise Features
- **TypeScript**: Fully typed with comprehensive error handling
- **Input Validation**: Zod schema validation for all parameters
- **Error Recovery**: Graceful error handling with detailed error messages
- **Resource Management**: Automatic cleanup of connections and resources
- **Testing**: Comprehensive Jest test suite with high coverage

## Requirements

- **Node.js**: >= 18.0.0
- **npm**: Latest stable version
- **SQLite3**: Automatically installed as dependency

## Installation

1. **Clone the repository:**
```bash
git clone https://github.com/1999AZZAR/project-guardian-mcp-server.git
cd project-guardian-mcp-server
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the project:**
```bash
npm run build
```

4. **Test the server:**
```bash
npm start
```


## Available Tools

This MCP server provides **exactly 17 focused tools** for project guardianship:

### Database Operations (7 tools)

#### `execute_sql` - Execute SQL Query
Execute raw SQL queries on memory.db.

**Parameters:**
- `query` (required): SQL query string
- `parameters` (optional): Query parameters array

#### `query_data` - Query Table Data
Query data from memory.db tables with filtering and pagination.

**Parameters:**
- `table` (required): Table name
- `conditions` (optional): WHERE conditions object
- `limit` (optional): Maximum rows to return
- `offset` (optional): Number of rows to skip
- `orderBy` (optional): Column to sort by
- `orderDirection` (optional): Sort direction ("ASC" or "DESC")

#### `insert_data` - Insert Records
Insert records into memory.db table.

**Parameters:**
- `table` (required): Table name
- `records` (required): Array of record objects to insert

#### `update_data` - Update Records
Update records in memory.db table.

**Parameters:**
- `table` (required): Table name
- `conditions` (required): WHERE conditions for records to update
- `updates` (required): Fields to update

#### `delete_data` - Delete Records
Delete records from memory.db table.

**Parameters:**
- `table` (required): Table name
- `conditions` (required): WHERE conditions for records to delete

#### `import_data` - Import Data
Import data from CSV or JSON file into memory.db table.

**Parameters:**
- `table` (required): Target table name
- `filePath` (required): Path to source file
- `format` (optional): File format ("csv" or "json")
- `options` (optional): Import options (delimiter, hasHeader)

#### `export_data` - Export Data
Export memory.db table data to CSV or JSON file.

**Parameters:**
- `table` (required): Source table name
- `filePath` (required): Output file path
- `format` (optional): Output format ("csv" or "json")
- `conditions` (optional): WHERE conditions to filter export
- `options` (optional): Export options (delimiter, includeHeader)

### Project Guardian Memory Tools (10 tools)

#### `initialize_memory` - Initialize Memory System
Set up the project memory database schema and tables.

**Parameters:** None

#### `create_entity` - Create Project Entities
Create entities in the project knowledge graph (supports single or batch).

**Parameters:**
- `entities` (required): Array of entity objects
  - `name`: Entity name
  - `entityType`: Type (project, task, person, resource)
  - `observations`: Array of notes about the entity

#### `create_relation` - Create Entity Relationships
Create relationships between project entities (supports single or batch).

**Parameters:**
- `relations` (required): Array of relation objects
  - `from`: Source entity name
  - `to`: Target entity name
  - `relationType`: Relationship type (depends_on, blocks, owns, etc.)

#### `add_observation` - Add Entity Observations
Add observations/notes to project entities (supports single or batch).

**Parameters:**
- `observations` (required): Array of observation objects
  - `entityName`: Target entity name
  - `contents`: Array of observation strings to add

#### `delete_entity` - Delete Project Entities
Remove entities and their relations from project memory (supports single or batch).

**Parameters:**
- `entityNames` (required): Array of entity names to delete

#### `delete_observation` - Remove Entity Observations
Remove specific observations from entities (supports single or batch).

**Parameters:**
- `deletions` (required): Array of deletion objects
  - `entityName`: Target entity name
  - `observations`: Array of observation strings to remove

#### `delete_relation` - Delete Entity Relationships
Remove relationships between project entities (supports single or batch).

**Parameters:**
- `relations` (required): Array of relation objects to delete
  - `from`: Source entity name
  - `to`: Target entity name
  - `relationType`: Relationship type to delete

#### `read_graph` - Read Project Knowledge Graph
Retrieve the entire project knowledge graph with all entities and relationships.

**Parameters:** None

#### `search_nodes` - Search Project Knowledge
Search for entities and relations matching a query across names, types, and content.

**Parameters:**
- `query` (required): Search term

#### `open_node` - Get Entity Details
Retrieve detailed information about project entities (supports single or batch).

**Parameters:**
- `names` (required): Array of entity names to retrieve

## AI Guidance System

Project Guardian MCP includes comprehensive resources and prompts to help AI models effectively use the toolset for project management.

### Available Resources

Project Guardian provides **10 key resources** that AI models can read to understand project management concepts, access cached data, and get comprehensive project insights:

#### `project-guardian://templates/entity-types`
Standard entity types for project management with examples and usage guidelines.

#### `project-guardian://templates/relationship-types`
Common relationship types between project entities with practical examples.

#### `project-guardian://templates/project-workflows`
Standard workflows for using Project Guardian tools in different scenarios.

#### `project-guardian://templates/best-practices`
Comprehensive best practices guide for effective project knowledge management.

#### `project-guardian://status/current-graph`
Current state of the project knowledge graph with summary statistics.

#### `project-guardian://cache/recent-activities`
Recently performed project management activities and updates for tracking progress.

#### `project-guardian://cache/workflow-templates`
Frequently used workflow templates with examples and implementation guidance.

#### `project-guardian://metrics/project-stats`
Statistical overview of project entities, relationships, and activities with health metrics.

#### `project-guardian://cache/team-members`
Cached information about project team members and their roles within the organization.

#### `project-guardian://status/recent-changes`
Recent additions, updates, and modifications to the knowledge graph for audit and monitoring.

### Available Prompts

Project Guardian offers **27 specialized prompts** covering all aspects of comprehensive project management, from basic setup to advanced enterprise workflows:

#### Core Project Management
#### `project-setup` - Project Initialization
**Arguments:**
- `project_name` (required): Name of the project
- `team_members` (optional): Comma-separated list of team members

Provides step-by-step guidance for setting up a new project structure with appropriate entities and relationships.

#### `sprint-planning` - Sprint Planning
**Arguments:**
- `sprint_name` (required): Name/number of the sprint
- `duration_days` (optional): Sprint duration in days

Guides through comprehensive sprint planning including task breakdown, dependencies, and capacity planning.

#### `progress-update` - Progress Tracking
**Arguments:**
- `task_name` (required): Name of the task to update
- `progress_notes` (required): Progress update description

Structured process for updating task progress and managing dependencies.

#### `retrospective` - Project Retrospective
**Arguments:**
- `time_period` (required): Time period being reviewed (e.g., "last sprint", "Q1")

Comprehensive retrospective process including data analysis, pattern identification, and improvement action creation.

#### Quality & Process Management
#### `code-review` - Code Review Process
**Arguments:**
- `pull_request_title` (required): Title of the pull request being reviewed
- `reviewer_name` (optional): Name of the reviewer

Structured code review process with technical checklists, issue documentation, and approval workflows.

#### `bug-tracking` - Bug Management
**Arguments:**
- `bug_description` (required): Description of the bug or issue
- `severity_level` (optional): Critical, High, Medium, or Low severity

Complete bug tracking workflow from discovery to resolution with impact analysis and stakeholder communication.

#### `technical-debt-assessment` - Technical Debt Analysis
**Arguments:**
- `component_name` (required): Name of the component or codebase being assessed
- `assessment_scope` (optional): Scope of assessment (file, module, system)

Comprehensive technical debt identification, prioritization, and remediation planning.

#### Release & Deployment Management
#### `release-planning` - Release Planning
**Arguments:**
- `release_version` (required): Version number for the release (e.g., "v2.1.0")
- `release_date` (optional): Target release date

Complete release planning process including quality gates, risk assessment, and deployment coordination.

#### Risk & Change Management
#### `risk-assessment` - Risk Management
**Arguments:**
- `risk_description` (required): Description of the risk
- `impact_level` (optional): High, Medium, or Low impact

Complete workflow for documenting risks, identifying impacts, and developing mitigation strategies.

#### `change-management` - Change Control
**Arguments:**
- `change_description` (required): Description of the proposed change
- `impact_assessment` (optional): High, Medium, or Low impact assessment

Structured change management process with impact analysis, approval workflows, and implementation tracking.

#### Team & Resource Management
#### `team-productivity` - Productivity Analysis
**Arguments:**
- `timeframe` (required): Time period to analyze (week, month, quarter)
- `focus_area` (optional): Area to focus on (velocity, quality, collaboration)

Team productivity assessment with performance metrics, root cause analysis, and improvement planning.

#### `resource-allocation` - Resource Planning
**Arguments:**
- `resource_type` (required): Type of resource (human, infrastructure, budget)
- `planning_horizon` (optional): Planning timeframe (sprint, quarter, year)

Resource allocation optimization with capacity planning, gap analysis, and utilization tracking.

#### Documentation & Communication
#### `stakeholder-communication` - Communication Management
**Arguments:**
- `communication_type` (required): Type of communication (status_update, issue_alert, milestone_reached)
- `audience` (optional): Target audience (team, management, client, all)

Stakeholder communication planning and execution with audience-specific strategies and effectiveness tracking.

#### `documentation-management` - Documentation Updates
**Arguments:**
- `documentation_type` (required): Type of documentation (api, user_guide, technical_spec)
- `update_reason` (optional): Reason for documentation update

Documentation maintenance process with content planning, review workflows, and publishing coordination.

#### Requirements & Planning Management
#### `requirements-gathering` - Requirements Gathering
**Arguments:**
- `requirement_type` (required): Type of requirements (functional, non-functional, business, technical)
- `stakeholders` (optional): Comma-separated list of key stakeholders

Guides through comprehensive requirements gathering process with stakeholder management and requirement categorization.

#### `user-story-management` - User Story Management
**Arguments:**
- `feature_name` (required): Name of the feature or epic
- `user_role` (optional): Primary user role (e.g., "customer", "admin", "developer")

Structured process for creating, managing, and prioritizing user stories with acceptance criteria and dependencies.

#### Quality & Technical Management
#### `testing-strategy` - Testing Strategy Development
**Arguments:**
- `application_type` (required): Type of application (web, mobile, api, desktop)
- `criticality_level` (optional): Business criticality (critical, high, medium, low)

Comprehensive testing strategy development including automated testing, quality gates, and risk-based testing.

#### `security-assessment` - Security Assessment
**Arguments:**
- `assessment_scope` (required): Scope of security assessment (application, infrastructure, data)
- `compliance_requirements` (optional): Compliance standards (GDPR, HIPAA, SOC2, etc.)

Security assessment framework with vulnerability management, compliance verification, and security controls implementation.

#### `performance-optimization` - Performance Optimization
**Arguments:**
- `performance_metric` (required): Primary metric to optimize (response_time, throughput, resource_usage)
- `optimization_goal` (optional): Specific performance target or improvement percentage

Performance monitoring setup, bottleneck identification, and optimization implementation with continuous monitoring.

#### `ci-cd-setup` - CI/CD Pipeline Setup
**Arguments:**
- `pipeline_type` (required): Type of pipeline (build, test, deploy, full_ci_cd)
- `target_platform` (optional): Deployment target (aws, azure, gcp, kubernetes, heroku)

Complete CI/CD pipeline setup including quality gates, rollback procedures, and security integration.

#### `architecture-review` - Architecture Review
**Arguments:**
- `architecture_type` (required): Type of architecture (microservices, monolithic, serverless, hybrid)
- `review_focus` (optional): Primary focus area (scalability, security, maintainability, performance)

Architectural assessment framework with design pattern analysis, technology stack evaluation, and improvement recommendations.

#### Knowledge & Team Management
#### `knowledge-transfer` - Knowledge Transfer
**Arguments:**
- `knowledge_domain` (required): Domain of knowledge (technical, process, business)
- `transfer_recipients` (optional): Who needs to receive the knowledge (team, individual, department)

Knowledge transfer planning and execution with session management, documentation, and effectiveness validation.

#### `vendor-management` - Vendor Management
**Arguments:**
- `vendor_type` (required): Type of vendor service (cloud, development, consulting, infrastructure)
- `contract_value` (optional): Contract value range (small, medium, large, enterprise)

Vendor relationship management including contract tracking, performance monitoring, and cost optimization.

#### Incident & Crisis Management
#### `incident-response` - Incident Response
**Arguments:**
- `incident_severity` (required): Severity level (critical, high, medium, low)
- `incident_type` (optional): Type of incident (security, performance, functionality, availability)

Incident response framework with containment, recovery, root cause analysis, and post-incident review.

#### Financial & Resource Management
#### `cost-management` - Cost Management
**Arguments:**
- `cost_category` (required): Primary cost category (infrastructure, personnel, tools, licenses)
- `budget_constraint` (optional): Budget constraint level (strict, flexible, unlimited)

Cost monitoring, optimization strategies, and budget management with forecasting and reporting.

#### Customer & Innovation Management
#### `customer-feedback` - Customer Feedback Management
**Arguments:**
- `feedback_channel` (required): Primary feedback channel (survey, support, reviews, analytics)
- `feedback_focus` (optional): Focus area (usability, features, performance, support)

Customer feedback collection, analysis, and action planning with continuous improvement cycles.

#### `innovation-planning` - Innovation Planning
**Arguments:**
- `innovation_type` (required): Type of innovation (product, process, technology, business_model)
- `risk_tolerance` (optional): Risk tolerance level (conservative, moderate, aggressive)

Innovation management framework with idea generation, experimentation, and success measurement.

### How AI Models Use Guidance

1. **Discovery**: List available resources and prompts to understand capabilities
2. **Learning**: Read relevant resources to understand project management concepts
3. **Planning**: Use appropriate prompts for complex workflows
4. **Execution**: Follow structured guidance to use tools effectively
5. **Verification**: Check results and iterate as needed

This guidance system ensures AI models can provide expert-level project management assistance using the Project Guardian toolset.

## Usage Examples

### Project Guardian Setup

```typescript
// Initialize the project memory system
const initResult = await mcpClient.callTool('initialize_memory', {});

// Create your first project entities
const entityResult = await mcpClient.callTool('create_entity', {
  entities: [
    {
      name: 'web_platform',
      entityType: 'project',
      observations: ['Main web application platform', 'React + Node.js stack', 'Q2 2024 delivery']
    },
    {
      name: 'user_authentication',
      entityType: 'feature',
      observations: ['OAuth2 implementation', 'Google/GitHub providers', 'JWT tokens']
    }
  ]
});

// Establish project relationships
const relationResult = await mcpClient.callTool('create_relation', {
  relations: [
    {
      from: 'user_authentication',
      to: 'web_platform',
      relationType: 'part_of'
    }
  ]
});
```

### Project Management Workflow

```typescript
// Add progress observations
await mcpClient.callTool('add_observation', {
  observations: [
    {
      entityName: 'user_authentication',
      contents: [
        'Completed OAuth2 setup for Google provider',
        'JWT implementation finished',
        'Unit tests passing at 95% coverage'
      ]
    }
  ]
});

// Search project knowledge
const searchResult = await mcpClient.callTool('search_nodes', {
  query: 'authentication'
});

// Read entire project knowledge graph
const graphResult = await mcpClient.callTool('read_graph', {});

// Get detailed entity information
const entityDetails = await mcpClient.callTool('open_node', {
  names: ['user_authentication', 'web_platform']
});
```

### Database Operations

```typescript
// Execute custom SQL queries
const sqlResult = await mcpClient.callTool('execute_sql', {
  query: 'SELECT * FROM entities WHERE entity_type = ?',
  parameters: ['project']
});

// Query project data
const queryResult = await mcpClient.callTool('query_data', {
  table: 'entities',
  conditions: { entity_type: 'task' },
  limit: 10
});

// Import/export data
const importResult = await mcpClient.callTool('import_data', {
  table: 'project_data',
  filePath: './project_backup.csv',
  format: 'csv'
});
```

## Configuration

### For Cursor IDE

Add this server to your Cursor MCP configuration (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "project-guardian": {
      "command": "node",
      "args": ["/path/to/project-guardian-mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

### For Claude Desktop

Add this server to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "project-guardian": {
      "command": "node",
      "args": ["/path/to/project-guardian-mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

## Project Structure

```
project-guardian-mcp-server/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server orchestrator (161 lines, fully modularized)
│   ├── memory-manager.ts     # Knowledge graph and entity management
│   ├── sqlite-manager.ts     # Database operations and connection management
│   ├── import-export.ts      # CSV/JSON data import and export functionality
│   ├── types.ts              # TypeScript type definitions and schemas
│   ├── handlers/
│   │   └── request-handlers.ts # Central tool execution dispatcher
│   ├── tools/
│   │   ├── tool-registry.ts     # Tool definitions and listing
│   │   ├── database-tools.ts    # Database operation tool schemas
│   │   └── memory-tools.ts      # Memory management tool schemas
│   ├── resources/
│   │   ├── resource-registry.ts  # Resource definitions and handlers
│   │   ├── resource-definitions.ts # Static resource metadata
│   │   └── resource-handlers.ts   # Dynamic resource content generation
│   └── prompts/
│       ├── prompt-registry.ts    # Prompt definitions and handlers
│       ├── prompt-definitions.ts # Static prompt metadata
│       └── prompt-handlers.ts    # Dynamic prompt content generation
├── __tests__/                # Comprehensive test suite
│   ├── tool-registry.test.ts
│   ├── resource-registry.test.ts
│   ├── prompt-registry.test.ts
│   ├── request-handlers.test.ts
│   ├── import-export.test.ts
│   └── sqlite-manager.test.ts
├── dist/                     # Compiled JavaScript output (optimized for production)
├── memory.db                 # SQLite database file (created on first run)
├── package.json              # Project dependencies and scripts
├── package.prod.json         # Production-only dependencies for smaller bundle
├── tsconfig.json            # TypeScript configuration
├── jest.config.js           # Test configuration
└── README.md                # This documentation
```

### Key Components

- **server.ts**: Clean orchestrator (161 lines) coordinating modular components
- **handlers/request-handlers.ts**: Central dispatcher routing tool calls to appropriate managers
- **tools/**: Tool definition and registration system (17 tools total)
  - `tool-registry.ts`: Lists all available tools
  - `database-tools.ts`: Database operation schemas (7 tools)
  - `memory-tools.ts`: Memory management schemas (10 tools)
- **resources/**: Resource management system (11 resources total)
  - `resource-registry.ts`: Resource listing and content serving
  - `resource-definitions.ts`: Static resource metadata
  - `resource-handlers.ts`: Dynamic content generation
- **prompts/**: Prompt management system (28 prompts total)
  - `prompt-registry.ts`: Prompt listing and content serving
  - `prompt-definitions.ts`: Static prompt metadata
  - `prompt-handlers.ts`: Dynamic prompt generation with context
- **memory-manager.ts**: Knowledge graph operations for entities, relationships, and observations
- **sqlite-manager.ts**: Database abstraction layer with connection pooling and schema management
- **import-export.ts**: Data transfer utilities for CSV and JSON formats
- **types.ts**: Zod schemas for input validation and TypeScript type safety

## Development

1. **Clone the repository:**
```bash
git clone https://github.com/1999AZZAR/project-guardian-mcp-server.git
cd project-guardian-mcp-server
```

2. **Install dependencies:**
```bash
npm install
```

3. **Build the project:**
```bash
npm run build
```

4. **Test the server:**
```bash
npm start
```

## License

MIT License - see LICENSE file for details.
