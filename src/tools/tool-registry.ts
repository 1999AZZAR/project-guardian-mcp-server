import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { databaseTools } from './database-tools.js';
import { memoryTools } from './memory-tools.js';

export const allTools: Tool[] = [
  ...databaseTools,
  ...memoryTools,
];

export { databaseTools, memoryTools };
