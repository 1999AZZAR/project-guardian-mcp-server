import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SQLiteManager } from './sqlite-manager.js';
import { ImportExportManager } from './import-export.js';
import { MemoryManager } from './memory-manager.js';

// Modular imports
import { allTools } from './tools/tool-registry.js';
import { projectGuardianResources } from './resources/resource-registry.js';
import { ResourceHandlers } from './resources/resource-registry.js';
import { projectGuardianPrompts } from './prompts/prompt-registry.js';
import { PromptHandlers } from './prompts/prompt-registry.js';
import { RequestHandlers } from './handlers/request-handlers.js';

export class DatabaseMCPServer {
  private server: Server;
  private sqliteManager: SQLiteManager;
  private importExportManager: ImportExportManager;
  private memoryManager: MemoryManager;
  private resourceHandlers: ResourceHandlers;
  private promptHandlers: PromptHandlers;
  private requestHandlers: RequestHandlers;

  constructor() {
    // Use only memory.db for all operations
    this.sqliteManager = new SQLiteManager('.');
    this.importExportManager = new ImportExportManager(this.sqliteManager);
    this.memoryManager = new MemoryManager(this.sqliteManager);

    // Initialize modular handlers
    this.resourceHandlers = new ResourceHandlers(this.memoryManager, this.sqliteManager);
    this.promptHandlers = new PromptHandlers();
    this.requestHandlers = new RequestHandlers(this.sqliteManager, this.memoryManager, this.importExportManager);

    this.server = new Server(
      {
        name: 'project-guardian-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
    this.setupErrorHandling();
    this.initializeMemorySystem();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: allTools,
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.requestHandlers.handleToolCall(name, args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }, null, 2)
          }],
          isError: true,
        };
      }
    });
  }


  private setupResourceHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: projectGuardianResources,
      };
    });

    // Read specific resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        const content = await this.resourceHandlers.handleReadResource(uri);
        return {
          contents: [{
            uri,
            mimeType: uri.includes('best-practices') ? 'text/markdown' : 'application/json',
            text: content,
          }],
        };
      } catch (error) {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              error: `Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }),
          }],
          isError: true,
        };
      }
    });
  }

  private async initializeMemorySystem(): Promise<void> {
    try {
      await this.memoryManager.initializeMemoryDatabase();
      console.error('Memory system initialized successfully');
    } catch (error) {
      console.error('Failed to initialize memory system:', error);
    }
  }

  private setupPromptHandlers(): void {
    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: projectGuardianPrompts,
      };
    });

    // Get specific prompts
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;

      try {
        const content = await this.promptHandlers.handleGetPrompt(name, args);
        return {
          description: `Generated prompt for ${name}`,
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: content,
            },
          }],
        };
      } catch (error) {
        return {
          description: `Error generating prompt for ${name}`,
          messages: [{
            role: 'user',
            content: {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          }],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.sqliteManager.closeAllConnections();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.sqliteManager.closeAllConnections();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Project Guardian MCP server running on stdio');
  }
}
