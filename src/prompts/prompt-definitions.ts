import { Prompt } from '@modelcontextprotocol/sdk/types.js';

// Core Project Management
export const projectGuardianPrompts: Prompt[] = [
  {
    name: 'project-setup',
    description: 'Project Initialization - Set up a new project structure with appropriate entities and relationships',
    arguments: [
      {
        name: 'project_name',
        description: 'Name of the project',
        required: true,
      },
      {
        name: 'team_members',
        description: 'Comma-separated list of team members',
        required: false,
      },
    ],
  },
  {
    name: 'sprint-planning',
    description: 'Sprint Planning - Comprehensive sprint planning including task breakdown, dependencies, and capacity planning',
    arguments: [
      {
        name: 'sprint_name',
        description: 'Name/number of the sprint',
        required: true,
      },
      {
        name: 'duration_days',
        description: 'Sprint duration in days',
        required: false,
      },
    ],
  },
  {
    name: 'progress-update',
    description: 'Progress Tracking - Update task progress and manage dependencies',
    arguments: [
      {
        name: 'task_name',
        description: 'Name of the task to update',
        required: true,
      },
      {
        name: 'progress_notes',
        description: 'Progress update description',
        required: true,
      },
    ],
  },
  {
    name: 'retrospective',
    description: 'Project Retrospective - Comprehensive retrospective including data analysis, pattern identification, and improvement actions',
    arguments: [
      {
        name: 'time_period',
        description: 'Time period being reviewed (e.g., "last sprint", "Q1")',
        required: true,
      },
    ],
  },

  // Quality & Process Management
  {
    name: 'code-review',
    description: 'Code Review Process - Structured code review with technical checklists, issue documentation, and approval workflows',
    arguments: [
      {
        name: 'pull_request_title',
        description: 'Title of the pull request being reviewed',
        required: true,
      },
      {
        name: 'reviewer_name',
        description: 'Name of the reviewer',
        required: false,
      },
    ],
  },
  {
    name: 'bug-tracking',
    description: 'Bug Management - Complete bug tracking workflow from discovery to resolution with impact analysis',
    arguments: [
      {
        name: 'bug_description',
        description: 'Description of the bug or issue',
        required: true,
      },
      {
        name: 'severity_level',
        description: 'Critical, High, Medium, or Low severity',
        required: false,
      },
    ],
  },
  {
    name: 'technical-debt-assessment',
    description: 'Technical Debt Analysis - Comprehensive technical debt identification, prioritization, and remediation planning',
    arguments: [
      {
        name: 'component_name',
        description: 'Name of the component or codebase being assessed',
        required: true,
      },
      {
        name: 'assessment_scope',
        description: 'Scope of assessment (file, module, system)',
        required: false,
      },
    ],
  },

  // Release & Deployment Management
  {
    name: 'release-planning',
    description: 'Release Planning - Complete release planning including quality gates, risk assessment, and deployment coordination',
    arguments: [
      {
        name: 'release_version',
        description: 'Version number for the release (e.g., "v2.1.0")',
        required: true,
      },
      {
        name: 'release_date',
        description: 'Target release date',
        required: false,
      },
    ],
  },

  // Risk & Change Management
  {
    name: 'risk-assessment',
    description: 'Risk Management - Complete workflow for documenting risks, identifying impacts, and developing mitigation strategies',
    arguments: [
      {
        name: 'risk_description',
        description: 'Description of the risk',
        required: true,
      },
      {
        name: 'impact_level',
        description: 'High, Medium, or Low impact',
        required: false,
      },
    ],
  },
  {
    name: 'change-management',
    description: 'Change Control - Structured change management with impact analysis, approval workflows, and implementation tracking',
    arguments: [
      {
        name: 'change_description',
        description: 'Description of the proposed change',
        required: true,
      },
      {
        name: 'impact_assessment',
        description: 'High, Medium, or Low impact assessment',
        required: false,
      },
    ],
  },

  // Team & Resource Management
  {
    name: 'team-productivity',
    description: 'Productivity Analysis - Team productivity assessment with performance metrics, root cause analysis, and improvement planning',
    arguments: [
      {
        name: 'timeframe',
        description: 'Time period to analyze (week, month, quarter)',
        required: true,
      },
      {
        name: 'focus_area',
        description: 'Area to focus on (velocity, quality, collaboration)',
        required: false,
      },
    ],
  },
  {
    name: 'resource-allocation',
    description: 'Resource Planning - Resource allocation optimization with capacity planning, gap analysis, and utilization tracking',
    arguments: [
      {
        name: 'resource_type',
        description: 'Type of resource (human, infrastructure, budget)',
        required: true,
      },
      {
        name: 'planning_horizon',
        description: 'Planning timeframe (sprint, quarter, year)',
        required: false,
      },
    ],
  },

  // Documentation & Communication
  {
    name: 'stakeholder-communication',
    description: 'Communication Management - Stakeholder communication planning with audience-specific strategies and effectiveness tracking',
    arguments: [
      {
        name: 'communication_type',
        description: 'Type of communication (status_update, issue_alert, milestone_reached)',
        required: true,
      },
      {
        name: 'audience',
        description: 'Target audience (team, management, client, all)',
        required: false,
      },
    ],
  },
  {
    name: 'documentation-management',
    description: 'Documentation Updates - Documentation maintenance with content planning, review workflows, and publishing coordination',
    arguments: [
      {
        name: 'documentation_type',
        description: 'Type of documentation (api, user_guide, technical_spec)',
        required: true,
      },
      {
        name: 'update_reason',
        description: 'Reason for documentation update',
        required: false,
      },
    ],
  },

  // Requirements & Planning Management
  {
    name: 'requirements-gathering',
    description: 'Requirements Gathering - Comprehensive requirements gathering with stakeholder management and requirement categorization',
    arguments: [
      {
        name: 'requirement_type',
        description: 'Type of requirements (functional, non-functional, business, technical)',
        required: true,
      },
      {
        name: 'stakeholders',
        description: 'Comma-separated list of key stakeholders',
        required: false,
      },
    ],
  },
  {
    name: 'user-story-management',
    description: 'User Story Management - Structured process for creating, managing, and prioritizing user stories with acceptance criteria',
    arguments: [
      {
        name: 'feature_name',
        description: 'Name of the feature or epic',
        required: true,
      },
      {
        name: 'user_role',
        description: 'Primary user role (e.g., "customer", "admin", "developer")',
        required: false,
      },
    ],
  },

  // Quality & Technical Management
  {
    name: 'testing-strategy',
    description: 'Testing Strategy Development - Comprehensive testing strategy with automated testing, quality gates, and risk-based testing',
    arguments: [
      {
        name: 'application_type',
        description: 'Type of application (web, mobile, api, desktop)',
        required: true,
      },
      {
        name: 'criticality_level',
        description: 'Business criticality (critical, high, medium, low)',
        required: false,
      },
    ],
  },
  {
    name: 'security-assessment',
    description: 'Security Assessment - Security assessment framework with vulnerability management, compliance verification, and controls implementation',
    arguments: [
      {
        name: 'assessment_scope',
        description: 'Scope of security assessment (application, infrastructure, data)',
        required: true,
      },
      {
        name: 'compliance_requirements',
        description: 'Compliance standards (GDPR, HIPAA, SOC2, etc.)',
        required: false,
      },
    ],
  },
  {
    name: 'performance-optimization',
    description: 'Performance Optimization - Performance monitoring setup, bottleneck identification, and optimization with continuous monitoring',
    arguments: [
      {
        name: 'performance_metric',
        description: 'Primary metric to optimize (response_time, throughput, resource_usage)',
        required: true,
      },
      {
        name: 'optimization_goal',
        description: 'Specific performance target or improvement percentage',
        required: false,
      },
    ],
  },

  // CI/CD & Architecture
  {
    name: 'ci-cd-setup',
    description: 'CI/CD Pipeline Setup - Complete CI/CD pipeline setup including quality gates, rollback procedures, and security integration',
    arguments: [
      {
        name: 'pipeline_type',
        description: 'Type of pipeline (build, test, deploy, full_ci_cd)',
        required: true,
      },
      {
        name: 'target_platform',
        description: 'Deployment target (aws, azure, gcp, kubernetes, heroku)',
        required: false,
      },
    ],
  },
  {
    name: 'architecture-review',
    description: 'Architecture Review - Architectural assessment with design pattern analysis, technology stack evaluation, and improvement recommendations',
    arguments: [
      {
        name: 'architecture_type',
        description: 'Type of architecture (microservices, monolithic, serverless, hybrid)',
        required: true,
      },
      {
        name: 'review_focus',
        description: 'Primary focus area (scalability, security, maintainability, performance)',
        required: false,
      },
    ],
  },

  // Knowledge & Team Management
  {
    name: 'knowledge-transfer',
    description: 'Knowledge Transfer - Knowledge transfer planning with session management, documentation, and effectiveness validation',
    arguments: [
      {
        name: 'knowledge_domain',
        description: 'Domain of knowledge (technical, process, business)',
        required: true,
      },
      {
        name: 'transfer_recipients',
        description: 'Who needs to receive the knowledge (team, individual, department)',
        required: false,
      },
    ],
  },
  {
    name: 'vendor-management',
    description: 'Vendor Management - Vendor relationship management including contract tracking, performance monitoring, and cost optimization',
    arguments: [
      {
        name: 'vendor_type',
        description: 'Type of vendor service (cloud, development, consulting, infrastructure)',
        required: true,
      },
      {
        name: 'contract_value',
        description: 'Contract value range (small, medium, large, enterprise)',
        required: false,
      },
    ],
  },

  // Incident & Crisis Management
  {
    name: 'incident-response',
    description: 'Incident Response - Incident response framework with containment, recovery, root cause analysis, and post-incident review',
    arguments: [
      {
        name: 'incident_severity',
        description: 'Severity level (critical, high, medium, low)',
        required: true,
      },
      {
        name: 'incident_type',
        description: 'Type of incident (security, performance, functionality, availability)',
        required: false,
      },
    ],
  },

  // Financial & Resource Management
  {
    name: 'cost-management',
    description: 'Cost Management - Cost monitoring, optimization strategies, and budget management with forecasting and reporting',
    arguments: [
      {
        name: 'cost_category',
        description: 'Primary cost category (infrastructure, personnel, tools, licenses)',
        required: true,
      },
      {
        name: 'budget_constraint',
        description: 'Budget constraint level (strict, flexible, unlimited)',
        required: false,
      },
    ],
  },

  // Customer & Innovation Management
  {
    name: 'customer-feedback',
    description: 'Customer Feedback Management - Customer feedback collection, analysis, and action planning with continuous improvement cycles',
    arguments: [
      {
        name: 'feedback_channel',
        description: 'Primary feedback channel (survey, support, reviews, analytics)',
        required: true,
      },
      {
        name: 'feedback_focus',
        description: 'Focus area (usability, features, performance, support)',
        required: false,
      },
    ],
  },
  {
    name: 'innovation-planning',
    description: 'Innovation Planning - Innovation management framework with idea generation, experimentation, and success measurement',
    arguments: [
      {
        name: 'innovation_type',
        description: 'Type of innovation (product, process, technology, business_model)',
        required: true,
      },
      {
        name: 'risk_tolerance',
        description: 'Risk tolerance level (conservative, moderate, aggressive)',
        required: false,
      },
    ],
  },
];
