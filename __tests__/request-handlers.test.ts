import { RequestHandlers } from '../src/handlers/request-handlers';
import { SQLiteManager } from '../src/sqlite-manager';
import { ImportExportManager } from '../src/import-export';
import { MemoryManager } from '../src/memory-manager';
import { PromptHandlers } from '../src/prompts/prompt-handlers';
import { existsSync, unlinkSync, rmdirSync, readdirSync } from 'fs';
import { join } from 'path';

describe('RequestHandlers', () => {
  let sqliteManager: SQLiteManager;
  let importExportManager: ImportExportManager;
  let memoryManager: MemoryManager;
  let requestHandlers: RequestHandlers;
  let testDbPath: string;

  beforeEach(async () => {
    // Use unique test directory for each test to avoid conflicts
    testDbPath = `./test-databases-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sqliteManager = new SQLiteManager(testDbPath);
    importExportManager = new ImportExportManager(sqliteManager);
    memoryManager = new MemoryManager(sqliteManager);
    requestHandlers = new RequestHandlers(
      sqliteManager,
      memoryManager,
      importExportManager,
      new PromptHandlers()
    );

    await memoryManager.initializeMemoryDatabase();
    await sqliteManager.createDatabase('test_db');
  });

  afterEach(async () => {
    await sqliteManager.closeAllConnections();
    // Clean up test database directory
    try {
      if (existsSync(testDbPath)) {
        const files = readdirSync(testDbPath);
        for (const file of files) {
          if (file.endsWith('.db')) {
            unlinkSync(join(testDbPath, file));
          }
        }
        rmdirSync(testDbPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Database Tool Handling', () => {
    test('should handle execute_sql tool', async () => {
      const result = await requestHandlers.handleToolCall('execute_sql', {
        query: 'SELECT 1 as test',
        parameters: []
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('rows');
    });

    test('should handle query_data tool', async () => {
      // Create test table
      const schema = {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT' }
        ]
      };
      await sqliteManager.createTable('memory', 'test_table', schema);

      const result = await requestHandlers.handleToolCall('query_data', {
        table: 'test_table',
        conditions: {},
        limit: 10
      });

      expect(result).toHaveProperty('success', true);
    });

    test('should handle insert_data tool', async () => {
      // Create test table
      const schema = {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT' }
        ]
      };
      await sqliteManager.createTable('memory', 'test_table', schema);

      const result = await requestHandlers.handleToolCall('insert_data', {
        table: 'test_table',
        records: [{ id: 1, name: 'Test' }]
      });

      expect(result).toHaveProperty('success', true);
    });

    test('should handle update_data tool', async () => {
      // Create test table and insert data
      const schema = {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT' }
        ]
      };
      await sqliteManager.createTable('memory', 'test_table', schema);
      await sqliteManager.insertData('memory', 'test_table', [{ id: 1, name: 'Test' }]);

      const result = await requestHandlers.handleToolCall('update_data', {
        table: 'test_table',
        conditions: { id: 1 },
        updates: { name: 'Updated Test' }
      });

      expect(result).toHaveProperty('success', true);
    });

    test('should handle delete_data tool', async () => {
      // Create test table and insert data
      const schema = {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT' }
        ]
      };
      await sqliteManager.createTable('memory', 'test_table', schema);
      await sqliteManager.insertData('memory', 'test_table', [{ id: 1, name: 'Test' }]);

      const result = await requestHandlers.handleToolCall('delete_data', {
        table: 'test_table',
        conditions: { id: 1 }
      });

      expect(result).toHaveProperty('success', true);
    });
  });

  describe('Memory Tool Handling', () => {
    test('should handle initialize_memory tool', async () => {
      const result = await requestHandlers.handleToolCall('initialize_memory', {});

      expect(result).toHaveProperty('success', true);
    });

    test('should handle create_entity tool', async () => {
      const result = await requestHandlers.handleToolCall('create_entity', {
        entities: [{
          name: 'test_project',
          entityType: 'project',
          observations: ['Test project']
        }]
      });

      expect(result).toHaveProperty('success', true);
    });

    test('should handle read_graph tool', async () => {
      const result = await requestHandlers.handleToolCall('read_graph', {});

      expect(result).toHaveProperty('success', true);
    });

    test('should handle search_nodes tool', async () => {
      const result = await requestHandlers.handleToolCall('search_nodes', {
        query: 'test'
      });

      expect(result).toHaveProperty('success', true);
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent tool', async () => {
      await expect(requestHandlers.handleToolCall('non_existent_tool', {}))
        .rejects.toThrow('Unknown tool: non_existent_tool');
    });

    test('should handle invalid tool arguments', async () => {
      await expect(requestHandlers.handleToolCall('query_data', {
        // Missing required 'table' parameter
        conditions: {}
      })).rejects.toThrow('Tool execution failed');
    });
  });

  describe('Import/Export Tool Handling', () => {
    test('should handle export_data tool', async () => {
      // Create test table and insert data
      const schema = {
        columns: [
          { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY'] },
          { name: 'name', type: 'TEXT' }
        ]
      };
      await sqliteManager.createTable('memory', 'test_table', schema);
      await sqliteManager.insertData('memory', 'test_table', [{ id: 1, name: 'Test' }]);

      const result = await requestHandlers.handleToolCall('export_data', {
        table: 'test_table',
        filePath: './export_test.csv',
        format: 'csv'
      });

      expect(result).toHaveProperty('success', true);

      // Clean up
      if (existsSync('./export_test.csv')) {
        unlinkSync('./export_test.csv');
      }
    });
  });
});
