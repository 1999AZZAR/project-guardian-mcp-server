import { PromptRegistry } from '../src/prompts/prompt-registry';
import { MemoryManager } from '../src/memory-manager';
import { SQLiteManager } from '../src/sqlite-manager';
import { existsSync, unlinkSync, rmdirSync } from 'fs';
import { join } from 'path';

describe('PromptRegistry', () => {
  let sqliteManager: SQLiteManager;
  let memoryManager: MemoryManager;
  let promptRegistry: PromptRegistry;
  let testDbPath: string;

  beforeEach(async () => {
    // Use unique test directory for each test to avoid conflicts
    testDbPath = `./test-databases-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sqliteManager = new SQLiteManager(testDbPath);
    memoryManager = new MemoryManager(sqliteManager);
    promptRegistry = new PromptRegistry(memoryManager, sqliteManager);

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

  describe('Prompt Listing', () => {
    test('should list all available prompts', () => {
      const prompts = promptRegistry.listPrompts();

      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBeGreaterThan(0);

      // Check that all prompts have required properties
      prompts.forEach(prompt => {
        expect(prompt).toHaveProperty('name');
        expect(prompt).toHaveProperty('description');
        expect(prompt).toHaveProperty('arguments');
        expect(typeof prompt.name).toBe('string');
        expect(typeof prompt.description).toBe('string');
        expect(Array.isArray(prompt.arguments)).toBe(true);
      });
    });

    test('should have exactly 28 prompts', () => {
      const prompts = promptRegistry.listPrompts();
      expect(prompts).toHaveLength(28);
    });

    test('should include expected prompt names', () => {
      const prompts = promptRegistry.listPrompts();
      const names = prompts.map(p => p.name);

      expect(names).toContain('project-setup');
      expect(names).toContain('sprint-planning');
      expect(names).toContain('progress-update');
      expect(names).toContain('code-review');
      expect(names).toContain('bug-tracking');
      expect(names).toContain('release-planning');
    });
  });

  describe('Prompt Handling', () => {
    test('should handle project-setup prompt', async () => {
      const result = await promptRegistry.handleGetPrompt('project-setup', {
        project_name: 'Test Project',
        team_members: 'Alice, Bob, Charlie'
      });

      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('messages');
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0]).toHaveProperty('role');
      expect(result.messages[0]).toHaveProperty('content');
    });

    test('should handle prompt with missing arguments', async () => {
      const result = await promptRegistry.handleGetPrompt('project-setup', {});

      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('messages');
      expect(result.messages[0].content).toContain('project_name');
    });

    test('should handle sprint-planning prompt', async () => {
      const result = await promptRegistry.handleGetPrompt('sprint-planning', {
        sprint_name: 'Sprint 1',
        duration_days: '14'
      });

      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('messages');
      expect(result.messages[0].content).toContain('Sprint 1');
    });

    test('should handle non-existent prompt', async () => {
      const result = await promptRegistry.handleGetPrompt('non-existent-prompt', {});

      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('messages');
      expect(result.messages[0].content).toContain('not found');
    });
  });

  describe('Prompt Categories', () => {
    test('should include project management prompts', () => {
      const prompts = promptRegistry.listPrompts();
      const names = prompts.map(p => p.name);

      const projectPrompts = [
        'project-setup', 'sprint-planning', 'progress-update', 'retrospective'
      ];

      projectPrompts.forEach(prompt => {
        expect(names).toContain(prompt);
      });
    });

    test('should include quality management prompts', () => {
      const prompts = promptRegistry.listPrompts();
      const names = prompts.map(p => p.name);

      const qualityPrompts = [
        'code-review', 'bug-tracking', 'technical-debt-assessment'
      ];

      qualityPrompts.forEach(prompt => {
        expect(names).toContain(prompt);
      });
    });

    test('should include release management prompts', () => {
      const prompts = promptRegistry.listPrompts();
      const names = prompts.map(p => p.name);

      const releasePrompts = [
        'release-planning'
      ];

      releasePrompts.forEach(prompt => {
        expect(names).toContain(prompt);
      });
    });
  });
});
