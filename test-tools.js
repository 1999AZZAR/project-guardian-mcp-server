#!/usr/bin/env node

// Simple test script for Project-Guardian MCP tools over stdio
import { spawn } from 'child_process';

async function testProjectGuardianTools() {
  console.log('Testing Project-Guardian MCP tools...');

  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  let responseBuffer = '';

  server.stdout.on('data', (data) => {
    responseBuffer += data.toString();
  });

  server.on('error', (error) => {
    console.error('Failed to start MCP server process:', error);
  });

  server.on('exit', (code, signal) => {
    console.log(`MCP server process exited with code=${code} signal=${signal ?? 'none'}`);
  });

  const writeRequest = (req) => {
    server.stdin.write(JSON.stringify(req) + '\n');
  };

  // 1) Initialize the MCP server
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: {},
        prompts: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  writeRequest(initRequest);

  // 2) After a short delay, list tools
  setTimeout(() => {
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    writeRequest(listToolsRequest);
  }, 300);

  // 3) After another delay, call a simple tool (initialize_memory)
  setTimeout(() => {
    const callToolRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'initialize_memory',
        arguments: {}
      }
    };

    writeRequest(callToolRequest);
  }, 700);

  // 4) Print a slice of the collected responses and shut down
  setTimeout(() => {
    console.log('Response snippet:\n', responseBuffer.substring(0, 2000) + '...');

    setTimeout(() => {
      server.kill();
      console.log('Tool test completed');
    }, 500);
  }, 2000);
}

testProjectGuardianTools().catch((error) => {
  console.error('Tool test failed:', error);
  process.exit(1);
});

