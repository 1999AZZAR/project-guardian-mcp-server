import { ResourceRegistry } from '../src/resources/resource-registry';
import { MemoryManager } from '../src/memory-manager';
import { SQLiteManager } from '../src/sqlite-manager';
import { existsSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';

describe('ResourceRegistry', () => {
  let sqliteManager: SQLiteManager;
  let memoryManager: MemoryManager;
  let resourceRegistry: ResourceRegistry;
  let testDbPath: string;

  beforeEach(async () => {
    // Use unique test directory for each test to avoid conflicts
    testDbPath = `./test-databases-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sqliteManager = new SQLiteManager(testDbPath);
    memoryManager = new MemoryManager(sqliteManager);
    resourceRegistry = new ResourceRegistry(memoryManager, sqliteManager);

    await memoryManager.initializeMemoryDatabase();
  });

  afterEach(async () => {
    await sqliteManager.closeAllConnections();
    // Clean up test database directory
    try {
      if (existsSync(testDbPath)) {
        const fs = require('fs');
        const files = fs.readdirSync(testDbPath);
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

  describe('Resource Listing', () => {
    test('should list all available resources', () => {
      const resources = resourceRegistry.listResources();

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.length).toBeGreaterThan(0);

      // Check that all resources have required properties
      resources.forEach(resource => {
        expect(resource).toHaveProperty('uri');
        expect(resource).toHaveProperty('name');
        expect(resource).toHaveProperty('description');
        expect(resource).toHaveProperty('mimeType');
        expect(typeof resource.uri).toBe('string');
        expect(typeof resource.name).toBe('string');
        expect(typeof resource.description).toBe('string');
        expect(typeof resource.mimeType).toBe('string');
      });
    });

    test('should have exactly 11 resources', () => {
      const resources = resourceRegistry.listResources();
      expect(resources).toHaveLength(11);
    });

    test('should include expected resource URIs', () => {
      const resources = resourceRegistry.listResources();
      const uris = resources.map(r => r.uri);

      expect(uris).toContain('project-guardian://templates/entity-types');
      expect(uris).toContain('project-guardian://templates/relationship-types');
      expect(uris).toContain('project-guardian://status/current-graph');
      expect(uris).toContain('project-guardian://metrics/project-stats');
    });
  });

  describe('Resource Reading', () => {
    test('should read entity types template', async () => {
      const result = await resourceRegistry.handleReadResource('project-guardian://templates/entity-types');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('entity');
      expect(result).toContain('project');
    });

    test('should read relationship types template', async () => {
      const result = await resourceRegistry.handleReadResource('project-guardian://templates/relationship-types');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('relationship');
      expect(result).toContain('depends_on');
    });

    test('should read current graph status', async () => {
      const result = await resourceRegistry.handleReadResource('project-guardian://status/current-graph');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('graph');
    });

    test('should read project metrics', async () => {
      const result = await resourceRegistry.handleReadResource('project-guardian://metrics/project-stats');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('statistics');
    });

    test('should handle non-existent resource', async () => {
      const result = await resourceRegistry.handleReadResource('project-guardian://non-existent');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('not found');
    });
  });
});
