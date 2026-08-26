import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { projectGuardianPrompts } from '../prompts/prompt-definitions.js';

export const guidanceTools: Tool[] = [
  {
    name: 'get_project_guidance',
    description: 'Invoke a project guidance framework to receive specialized instructions and checklists for specific workflows (e.g., project-setup, sprint-planning, code-review, etc.). This allows the AI to autonomously fetch and follow established project management protocols.',
    inputSchema: {
      type: 'object',
      properties: {
        guidance_name: {
          type: 'string',
          description: 'The name of the guidance framework to invoke.',
          enum: projectGuardianPrompts.map(p => p.name),
        },
        arguments: {
          type: 'object',
          description: 'Optional arguments required by the specific guidance framework.',
        },
      },
      required: ['guidance_name'],
    },
  },
];
