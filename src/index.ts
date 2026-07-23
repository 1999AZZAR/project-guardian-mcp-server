#!/usr/bin/env node

import { DatabaseMCPServer } from './server.js';

async function main() {
  const server = new DatabaseMCPServer();
  await server.run();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});