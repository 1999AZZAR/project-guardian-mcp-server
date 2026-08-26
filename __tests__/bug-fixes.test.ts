import { SQLiteManager } from '../src/sqlite-manager';
import { existsSync, unlinkSync, rmdirSync, readdirSync } from 'fs';
import { join } from 'path';
import { jest } from '@jest/globals';

describe('Bug Fixes (C1-C3, H1-H3, M1-M2)', () => {

  describe('H3: connection leak — createDatabase closes properly', () => {
    let sqliteManager: SQLiteManager;
    let testDbPath: string;

    beforeEach(() => {
      testDbPath = `./test-fixes-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sqliteManager = new SQLiteManager(testDbPath);
    });

    afterEach(async () => {
      await sqliteManager.closeAllConnections();
      if (existsSync(testDbPath)) {
        const files = readdirSync(testDbPath);
        for (const file of files) {
          if (file.endsWith('.db')) unlinkSync(join(testDbPath, file));
        }
        rmdirSync(testDbPath);
      }
    });

    test('createDatabase does not leak connections', async () => {
      const connCountBefore = (sqliteManager as any).connections.size;
      await sqliteManager.createDatabase('test_leak');
      const connCountAfter = (sqliteManager as any).connections.size;
      expect(connCountAfter).toBe(connCountBefore);
    });

    test('createDatabase creates a usable file', async () => {
      const result = await sqliteManager.createDatabase('test_usable');
      expect(result.success).toBe(true);
      expect(existsSync(result.data.path)).toBe(true);
    });
  });



  describe('C1: server does not hang in home dir', () => {
    test('initializeMemoryDatabase skips find in home directory', async () => {
      const testDir = './test-fixes-' + Date.now();
      const sm = new SQLiteManager(testDir);
      const mm = new (await import('../src/memory-manager')).MemoryManager(sm);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      process.env.HOME = '/nonexistent-home-dir';
      await mm.initializeMemoryDatabase();

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
      await sm.closeAllConnections();
      if (existsSync(testDir)) {
        try {
          const files = readdirSync(testDir);
          for (const f of files) if (f.endsWith('.db')) unlinkSync(join(testDir, f));
          rmdirSync(testDir);
        } catch {}
      }
      delete process.env.HOME;
    }, 10000);
  });
});
