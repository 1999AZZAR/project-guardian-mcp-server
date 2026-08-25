import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { databaseTools } from './database-tools.js';
import { memoryTools } from './memory-tools.js';
import { guidanceTools } from './guidance-tools.js';
import { runtimeTools } from './runtime-tools.js';

export const allTools: Tool[] = [
  ...databaseTools,
  ...memoryTools,
  ...guidanceTools,
  ...runtimeTools,
  {
    name: 'start_ui',
    description: 'Start the Project Guardian Web UI server on demand. Automatically searches for a free port and returns the local HTTP URL.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

;
