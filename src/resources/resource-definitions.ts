import { Resource } from '@modelcontextprotocol/sdk/types.js';

export const projectGuardianResources: Resource[] = [
  {
    uri: 'project-guardian://templates/entity-types',
    name: 'Project Entity Types',
    description: 'Standard entity types for project management',
    mimeType: 'application/json',
  },
  {
    uri: 'project-guardian://templates/relationship-types',
    name: 'Project Relationship Types',
    description: 'Common relationship types between project entities',
    mimeType: 'application/json',
  },
  {
    uri: 'project-guardian://templates/project-workflows',
    name: 'Project Management Workflows',
    description: 'Standard workflows for using Project Guardian tools',
    mimeType: 'application/json',
  },
  {
    uri: 'project-guardian://templates/best-practices',
    name: 'Best Practices Guide',
    description: 'Guidelines for effective project knowledge management',
    mimeType: 'text/markdown',
  },
  {
    uri: 'project-guardian://status/current-graph',
    name: 'Current Knowledge Graph',
    description: 'Current state of the project knowledge graph',
    mimeType: 'application/json',
  },
  {
    uri: 'project-guardian://cache/recent-activities',
    name: 'Recent Project Activities',
    description: 'Recently performed project management activities and updates',
    mimeType: 'application/json',
  },
  {
    uri: 'project-guardian://cache/workflow-templates',
    name: 'Cached Workflow Templates',
    description: 'Frequently used workflow templates with examples',
    mimeType: 'application/json',
  },
  {
    uri: 'project-guardian://metrics/project-stats',
    name: 'Project Statistics',
    description: 'Statistical overview of project entities, relationships, and activities',
    mimeType: 'application/json',
  },
  {
    uri: 'project-guardian://cache/team-members',
    name: 'Team Members Cache',
    description: 'Cached information about project team members and their roles',
    mimeType: 'application/json',
  },
  {
    uri: 'project-guardian://status/recent-changes',
    name: 'Recent Knowledge Graph Changes',
    description: 'Recent additions, updates, and modifications to the knowledge graph',
    mimeType: 'application/json',
  },
];
