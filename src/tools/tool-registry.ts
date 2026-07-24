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
];

export { databaseTools, memoryTools, guidanceTools, runtimeTools };
