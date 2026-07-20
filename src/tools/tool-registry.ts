import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { databaseTools } from './database-tools.js';
import { memoryTools } from './memory-tools.js';
import { guidanceTools } from './guidance-tools.js';

export const allTools: Tool[] = [
  ...databaseTools,
  ...memoryTools,
  ...guidanceTools,
];

export { databaseTools, memoryTools, guidanceTools };
