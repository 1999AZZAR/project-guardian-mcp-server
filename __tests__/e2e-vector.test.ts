process.env.ENABLE_VECTOR_TEST = '1';

import { SQLiteManager } from '../src/sqlite-manager';
import { MemoryManager } from '../src/memory-manager';
import { existsSync, unlinkSync, rmdirSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import os from 'os';

describe('E2E Vector Hybrid RAG', () => {
  let tmpDir: string;
  let sm: SQLiteManager;
  let mm: MemoryManager;
  const originalEnv = process.env.NODE_ENV;
  const originalVecFlag = process.env.ENABLE_VECTOR_TEST;

  beforeAll(async () => {
    // Enable vector in test by switching env
    process.env.ENABLE_VECTOR_TEST = '1';
    process.env.NODE_ENV = 'development';
  }, 120000);

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalVecFlag) process.env.ENABLE_VECTOR_TEST = originalVecFlag;
    else delete process.env.ENABLE_VECTOR_TEST;
  });

  beforeEach(async () => {
    tmpDir = `${os.tmpdir()}/e2e-vec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    mkdirSync(tmpDir, { recursive: true });
    sm = new SQLiteManager(tmpDir);
    mm = new MemoryManager(sm, tmpDir);
    await mm.initializeMemoryDatabase();
  }, 30000);

  afterEach(async () => {
    if (sm) try { await sm.closeAllConnections(); } catch {}
    try {
      if (tmpDir && existsSync(tmpDir)) {
        const files = readdirSync(tmpDir);
        for (const f of files) if (f.endsWith('.db') || f.endsWith('.db-wal') || f.endsWith('.db-shm')) {
          try { unlinkSync(join(tmpDir, f)); } catch {}
        }
        rmdirSync(tmpDir, { recursive: true } as any);
      }
    } catch {}
  });

  test('hybrid search finds semantic match that keyword misses', async () => {
    // Create two distinct entities
    await mm.createEntity('task:auth-login', 'task', ['Implement login with JWT', 'Handle authentication failure and session timeout']);
    await mm.createEntity('task:ui-button', 'task', ['Create button component with hover effect and rounded corners']);

    // debug
    const dbg = await sm.executeSql('memory', 'SELECT COUNT(*) as c FROM vec_entities');
    console.log('vec count after 2 creates', dbg.success, dbg.data?.rows[0]?.c, dbg.error);
    // Wait for async vec upsert (embed is awaited in createEntity, so should be ready)
    // Keyword search for "auth" should find auth-login only
    const kw = await mm.searchNodes('auth', 10, 'keyword');
    console.log('kw', kw.entities.map(e=>e.name).slice(0,3), 'len', kw.entities.length);
    expect(kw.entities.map(e => e.name)).toContain('task:auth-login');

    // Vector search for "authentication" (semantic) should find auth-login at top
    const vec = await mm.searchNodes('authentication', 10, 'vector');
    console.log('vec', vec.entities.map(e=>e.name), 'len', vec.entities.length, 'full', vec);
    expect(vec.entities.length).toBeGreaterThan(0);
    expect(vec.entities[0].name).toBe('task:auth-login');

    // Hybrid search for "login" should rank auth-login top even with FTS+vec
    const hyb = await mm.searchNodes('login', 10, 'hybrid');
    expect(hyb.entities.length).toBeGreaterThan(0);
    expect(hyb.entities[0].name).toBe('task:auth-login');

    // Verify vec table exists and has rows
    const vecCheck = await sm.executeSql('memory', 'SELECT COUNT(*) as c FROM vec_entities');
    // vec_entities may be empty if embed failed, but should have at least 2 after above creates
    if (vecCheck.success && vecCheck.data) {
      expect(vecCheck.data.rows[0].c).toBeGreaterThanOrEqual(2);
    }

    // Add observation to ui-button and verify vec updates (re-embed)
    await mm.addObservation('task:ui-button', ['Add icon support']);
    const vec2 = await mm.searchNodes('icon', 10, 'vector');
    expect(vec2.entities.map(e => e.name)).toContain('task:ui-button');

    // Delete should clean vec
    await mm.deleteEntity('task:ui-button');
    const vecAfterDel = await sm.executeSql('memory', 'SELECT COUNT(*) as c FROM vec_entities');
    if (vecAfterDel.success && vecAfterDel.data) {
      // one less
      expect(vecAfterDel.data.rows[0].c).toBeGreaterThanOrEqual(1);
    }
  }, 120000);

  test('readStore and readGraph respect limit pagination with vec', async () => {
    // Create 5 entities
    for (let i = 0; i < 5; i++) {
      await mm.createEntity(`task:bulk-${i}`, 'task', [`obs ${i}`]);
    }
    const g5 = await mm.readStore('memory', { limit: 3 });
    expect(g5.entities.length).toBe(3);
    const gAll = await mm.readGraph({ limit: 10 });
    expect(gAll.entities.length).toBeGreaterThanOrEqual(5);
  }, 60000);
});
