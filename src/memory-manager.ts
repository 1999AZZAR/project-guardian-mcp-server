import { SQLiteManager } from './sqlite-manager.js';
import { Entity, Relation, KnowledgeGraph, SearchResult } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import { exec, execFile, spawn } from 'child_process';
import { promisify } from 'util';
import { homedir } from 'os';
import { createInterface } from 'readline';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export class MemoryManager {
  private sqliteManager: SQLiteManager;
  private memoryDbName: string = 'memory';
  private targetRoot: string;
  private centralDbPath: string;

  constructor(sqliteManager: SQLiteManager, targetRoot?: string) {
    this.sqliteManager = sqliteManager;
    this.targetRoot = targetRoot ?? process.cwd();
    this.centralDbPath = process.env.GUARDIAN_CENTRAL_DB || path.join(process.env.HOME || homedir(), 'memory.db');
  }

  setTargetRoot(targetRoot: string): void {
    this.targetRoot = targetRoot;
  }

  private async ensureCentralSchema(): Promise<void> {
    await this.sqliteManager.createTable(this.centralDbPath, 'entities', {
      columns: [
        { name: 'name', type: 'TEXT', constraints: ['PRIMARY KEY', 'NOT NULL'] },
        { name: 'entity_type', type: 'TEXT', constraints: ['NOT NULL'] },
        { name: 'observations', type: 'TEXT', constraints: ['NOT NULL'] },
        { name: 'created_at', type: 'TEXT', constraints: ['NOT NULL'] },
        { name: 'updated_at', type: 'TEXT', constraints: ['NOT NULL'] }
      ]
    });
    await this.sqliteManager.createTable(this.centralDbPath, 'relations', {
      columns: [
        { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY', 'AUTOINCREMENT'] },
        { name: 'from_entity', type: 'TEXT', constraints: ['NOT NULL'] },
        { name: 'to_entity', type: 'TEXT', constraints: ['NOT NULL'] },
        { name: 'relation_type', type: 'TEXT', constraints: ['NOT NULL'] },
        { name: 'created_at', type: 'TEXT', constraints: ['NOT NULL'] }
      ],
      indexes: [
        { name: 'idx_central_relations_unique', columns: ['from_entity', 'to_entity', 'relation_type'], unique: true }
      ]
    });
  }

  async syncToCentral(): Promise<{ entities: number; relations: number }> {
    const graph = await this.readGraph();
    if (graph.entities.length === 0 && graph.relations.length === 0) {
      return { entities: 0, relations: 0 };
    }

    await this.ensureCentralSchema();

    for (const entity of graph.entities) {
      await this.sqliteManager.executeSql(
        this.centralDbPath,
        `INSERT OR REPLACE INTO entities (name, entity_type, observations, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
        [entity.name, entity.entityType, JSON.stringify(entity.observations), entity.createdAt, entity.updatedAt]
      );
    }

    for (const relation of graph.relations) {
      await this.sqliteManager.executeSql(
        this.centralDbPath,
        `INSERT OR IGNORE INTO relations (from_entity, to_entity, relation_type, created_at) VALUES (?, ?, ?, ?)`,
        [relation.from, relation.to, relation.relationType, relation.createdAt]
      );
    }

    return { entities: graph.entities.length, relations: graph.relations.length };
  }

  private async syncToCentralSafe(): Promise<void> {
    try {
      await this.syncToCentral();
    } catch (err) {
      console.warn('Central memory sync failed:', err);
    }
  }

  async setupProjectFiles(): Promise<void> {
    const manageProjectFiles = process.env.NODE_ENV !== 'test';
    if (!manageProjectFiles) return;

    const targetRoot = this.targetRoot;

    // Pre-commit hook initialization — only on explicit request
    try {
      await execAsync('which pre-commit');
      await execAsync('git rev-parse --git-dir 2>/dev/null', { cwd: targetRoot });
    } catch {
      throw new Error('pre-commit and a Git repository are required in the project root');
    }

    try {
      const preCommitConfigPath = path.join(targetRoot, '.pre-commit-config.yaml');

      if (!fs.existsSync(preCommitConfigPath)) {
        const hasPython = fs.existsSync(path.join(targetRoot, 'requirements.txt')) ||
                          fs.existsSync(path.join(targetRoot, 'pyproject.toml')) ||
                          fs.existsSync(path.join(targetRoot, 'setup.py'));
        const hasNode = fs.existsSync(path.join(targetRoot, 'package.json'));

        const repos = [`  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
        args: [--maxkb=500]
      - id: check-merge-conflict
      - id: detect-private-key`];

        if (hasPython) {
          repos.push(`  - repo: https://github.com/psf/black
    rev: 24.4.2
    hooks:
      - id: black
        args: [--line-length=100]

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.11.0
    hooks:
      - id: ruff
        args: [--fix]`);
        }

        if (hasNode) {
          repos.push(`  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.1.0
    hooks:
      - id: prettier
        types_or: [javascript, jsx, ts, tsx, css, less, html, json, markdown]`);
        }

        repos.push(`  - repo: local
    hooks:
      - id: project-guardian-auto-combine
        name: Auto-combine scattered memory.db files
        entry: >
            bash -c 'find . -mindepth 2 -type f -name memory.db | while read db; do sqlite3 memory.db "ATTACH DATABASE \\"$db\\" AS nested; INSERT OR IGNORE INTO entities SELECT * FROM nested.entities; INSERT OR IGNORE INTO relations SELECT * FROM nested.relations;"; rm "$db"; done'
        language: system
        always_run: true
        pass_filenames: false`);

        const preCommitContent = `repos:\n${repos.join('\n\n')}\n`;
        fs.writeFileSync(preCommitConfigPath, preCommitContent, 'utf8');
        const ac = new AbortController();
        const timeoutId = setTimeout(() => ac.abort(), 30000);
        try {
          await execFileAsync('pre-commit', ['install'], { cwd: targetRoot, signal: ac.signal });
        } finally {
          clearTimeout(timeoutId);
        }
      }
    } catch (err) {
      throw new Error(`Failed to set up pre-commit hooks: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Gitignore initialization — append only entries that are not already ignored
    try {
      const guardianEntries = [
        'memory.db',
        'memory.db-journal',
        '.claude/',
        '.vscode/',
        '.idea/',
        '.gemini/',
        '.cursor/',
        '.env',
        '.env.*',
        '!.env.example',
      ];
      const gitignorePath = path.join(targetRoot, '.gitignore');
      const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
      const missing = guardianEntries.filter(entry => !existing.split(/\r?\n/).some(line => line.trim() === entry));
      if (missing.length > 0) {
        const block = `\n# Project Guardian\n${missing.join('\n')}\n`;
        if (!fs.existsSync(gitignorePath)) {
          fs.writeFileSync(gitignorePath, `# Project Guardian\n${guardianEntries.join('\n')}\n`, 'utf8');
        } else {
          fs.appendFileSync(gitignorePath, block, 'utf8');
        }
      }
    } catch (err) {
      console.warn('Failed to update .gitignore:', err);
    }
  }

  async initializeMemoryDatabase(): Promise<void> {
    // Note: Database will be created automatically when first accessed
    const manageProjectFiles = process.env.NODE_ENV !== 'test';

    const targetRoot = this.targetRoot;

    // Create entities table
    const entitiesResult = await this.sqliteManager.createTable(this.memoryDbName, 'entities', {
      columns: [
        { name: 'name', type: 'TEXT', constraints: ['PRIMARY KEY', 'NOT NULL'] },
        { name: 'entity_type', type: 'TEXT', constraints: ['NOT NULL'] },
        { name: 'observations', type: 'TEXT', constraints: ['NOT NULL'] }, // JSON array
        { name: 'created_at', type: 'TEXT', constraints: ['NOT NULL'] },
        { name: 'updated_at', type: 'TEXT', constraints: ['NOT NULL'] }
      ]
    });

    if (!entitiesResult.success) {
      throw new Error(`Failed to create entities table: ${entitiesResult.error || entitiesResult.message}`);
    }

    // Create relations table
    const relationsResult = await this.sqliteManager.createTable(this.memoryDbName, 'relations', {
      columns: [
        { name: 'id', type: 'INTEGER', constraints: ['PRIMARY KEY', 'AUTOINCREMENT'] },
        { name: 'from_entity', type: 'TEXT', constraints: ['NOT NULL'] },
        { name: 'to_entity', type: 'TEXT', constraints: ['NOT NULL'] },
        { name: 'relation_type', type: 'TEXT', constraints: ['NOT NULL'] },
        { name: 'created_at', type: 'TEXT', constraints: ['NOT NULL'] }
      ],
      indexes: [
        { name: 'idx_relations_from', columns: ['from_entity'] },
        { name: 'idx_relations_to', columns: ['to_entity'] },
        { name: 'idx_relations_type', columns: ['relation_type'] }
      ]
    });

    if (!relationsResult.success) {
      throw new Error(`Failed to create relations table: ${relationsResult.error || relationsResult.message}`);
    }

    // Create indexes for better search performance
    const typeIndexResult = await this.sqliteManager.executeSql(this.memoryDbName,
      'CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type)'
    );
    if (!typeIndexResult.success) {
      console.warn('Failed to create entity type index:', typeIndexResult.error);
    }

    const updatedIndexResult = await this.sqliteManager.executeSql(this.memoryDbName,
      'CREATE INDEX IF NOT EXISTS idx_entities_updated ON entities(updated_at)'
    );
    if (!updatedIndexResult.success) {
      console.warn('Failed to create entity updated index:', updatedIndexResult.error);
    }

    // Scattered DB consolidation — DESTRUCTIVE (merges nested memory.db files
    // into the root and deletes them, destroying per-project isolation).
    // Disabled by default; opt in with GUARDIAN_AUTO_MERGE=1.
    if (manageProjectFiles && process.env.GUARDIAN_AUTO_MERGE === '1' && targetRoot !== (process.env.HOME || '')) {
      const rootDbPath = path.join(targetRoot, 'memory.db');
      let mergeCount = 0;
      const MAX_MERGE = 100;

      const findProcess = spawn('find', [targetRoot, '-mindepth', '2', '-type', 'f', '-name', 'memory.db']);
      const rl = createInterface({ input: findProcess.stdout });

      try {
        for await (const line of rl) {
          if (mergeCount >= MAX_MERGE) {
            console.warn(`Scattered DB merge capped at ${MAX_MERGE} files, skipping rest`);
            findProcess.kill();
            break;
          }
          const dbPath = line.trim();
          if (!dbPath || dbPath === rootDbPath) continue;
          
          try {
            const escapedPath = dbPath.replace(/'/g, "''");
            await this.sqliteManager.executeSql(this.memoryDbName, `ATTACH DATABASE '${escapedPath}' AS nested`);
            await this.sqliteManager.executeSql(this.memoryDbName, `INSERT OR IGNORE INTO entities SELECT * FROM nested.entities`);
            await this.sqliteManager.executeSql(this.memoryDbName, `INSERT OR IGNORE INTO relations SELECT * FROM nested.relations`);
            await this.sqliteManager.executeSql(this.memoryDbName, `DETACH DATABASE nested`);
            
            fs.unlinkSync(dbPath);
            mergeCount++;
          } catch (mergeErr) {
            console.error(`Failed to merge scattered database ${dbPath}:`, mergeErr);
            try { await this.sqliteManager.executeSql(this.memoryDbName, `DETACH DATABASE nested`); } catch (e) {}
          }
        }
      } catch (e) {
        console.warn('Scattered DB scan failed:', e);
      }
    }
  }

  async createEntity(name: string, entityType: string, observations: string[]): Promise<Entity> {
    const now = new Date().toISOString();

    // Check if entity already exists
    const existing = await this.sqliteManager.queryData(this.memoryDbName, 'entities', { name });
    if (existing.success && existing.data && existing.data.rows.length > 0) {
      throw new Error(`Entity '${name}' already exists`);
    }

    const observationsJson = JSON.stringify(observations);

    const insertResult = await this.sqliteManager.insertData(this.memoryDbName, 'entities', [{
      name,
      entity_type: entityType,
      observations: observationsJson,
      created_at: now,
      updated_at: now
    }]);

    if (!insertResult.success) {
      throw new Error(`Failed to create entity: ${insertResult.error || insertResult.message}`);
    }

    return {
      name,
      entityType,
      observations,
      createdAt: now,
      updatedAt: now
    };
  }

  async createEntities(entities: Array<{ name: string; entityType: string; observations: string[] }>): Promise<Entity[]> {
    const results: Entity[] = [];

    for (const entity of entities) {
      try {
        const created = await this.createEntity(entity.name, entity.entityType, entity.observations);
        results.push(created);
      } catch (error) {
        console.error(`Failed to create entity ${entity.name}:`, error);
      }
    }

    if (results.length > 0) await this.syncToCentralSafe();
    return results;
  }

  async createRelation(from: string, to: string, relationType: string): Promise<Relation> {
    // Verify entities exist
    const fromEntity = await this.sqliteManager.queryData(this.memoryDbName, 'entities', { name: from });
    const toEntity = await this.sqliteManager.queryData(this.memoryDbName, 'entities', { name: to });

    if (!fromEntity.success || !fromEntity.data || fromEntity.data.rows.length === 0) {
      throw new Error(`Entity '${from}' does not exist`);
    }
    if (!toEntity.success || !toEntity.data || toEntity.data.rows.length === 0) {
      throw new Error(`Entity '${to}' does not exist`);
    }

    const now = new Date().toISOString();

    const insertResult = await this.sqliteManager.insertData(this.memoryDbName, 'relations', [{
      from_entity: from,
      to_entity: to,
      relation_type: relationType,
      created_at: now
    }]);

    if (!insertResult.success) {
      throw new Error(`Failed to create relation: ${insertResult.error || insertResult.message}`);
    }

    return {
      from,
      to,
      relationType,
      createdAt: now
    };
  }

  async createRelations(relations: Array<{ from: string; to: string; relationType: string }>): Promise<Relation[]> {
    const results: Relation[] = [];

    for (const relation of relations) {
      try {
        const created = await this.createRelation(relation.from, relation.to, relation.relationType);
        results.push(created);
      } catch (error) {
        console.error(`Failed to create relation ${relation.from} -> ${relation.to}:`, error);
      }
    }

    if (results.length > 0) await this.syncToCentralSafe();
    return results;
  }

  async addObservation(entityName: string, contents: string[]): Promise<Entity> {
    // Get current entity
    const result = await this.sqliteManager.queryData(this.memoryDbName, 'entities', { name: entityName });
    if (!result.success || !result.data || result.data.rows.length === 0) {
      throw new Error(`Entity '${entityName}' does not exist`);
    }

    const entity = result.data.rows[0];
    const currentObservations = this.safeParseObservations(entity.observations);
    const updatedObservations = [...currentObservations, ...contents];
    const now = new Date().toISOString();

    await this.sqliteManager.updateData(
      this.memoryDbName,
      'entities',
      { name: entityName },
      {
        observations: JSON.stringify(updatedObservations),
        updated_at: now
      }
    );

    return {
      name: entity.name,
      entityType: entity.entity_type,
      observations: updatedObservations,
      createdAt: entity.created_at,
      updatedAt: now
    };
  }

  async addObservations(observations: Array<{ entityName: string; contents: string[] }>): Promise<Entity[]> {
    const results: Entity[] = [];

    for (const obs of observations) {
      try {
        const updated = await this.addObservation(obs.entityName, obs.contents);
        results.push(updated);
      } catch (error) {
        console.error(`Failed to add observations to entity ${obs.entityName}:`, error);
      }
    }

    if (results.length > 0) await this.syncToCentralSafe();
    return results;
  }

  async deleteEntity(entityName: string): Promise<void> {
    await this.sqliteManager.executeSql(this.memoryDbName, 'BEGIN TRANSACTION');
    try {
      await this.sqliteManager.deleteData(this.memoryDbName, 'relations',
        { from_entity: entityName });
      await this.sqliteManager.deleteData(this.memoryDbName, 'relations',
        { to_entity: entityName });
      await this.sqliteManager.deleteData(this.memoryDbName, 'entities',
        { name: entityName });
      await this.sqliteManager.executeSql(this.memoryDbName, 'COMMIT');
    } catch (error) {
      await this.sqliteManager.executeSql(this.memoryDbName, 'ROLLBACK');
      throw error;
    }
  }

  async deleteEntities(entityNames: string[]): Promise<void> {
    for (const name of entityNames) {
      await this.deleteEntity(name);
    }
    await this.syncToCentralSafe();
  }

  async deleteObservation(entityName: string, observations: string[]): Promise<Entity> {
    // Get current entity
    const result = await this.sqliteManager.queryData(this.memoryDbName, 'entities', { name: entityName });
    if (!result.success || !result.data || result.data.rows.length === 0) {
      throw new Error(`Entity '${entityName}' does not exist`);
    }

    const entity = result.data.rows[0];
    const currentObservations = this.safeParseObservations(entity.observations);
    const updatedObservations = currentObservations.filter((obs: string) => !observations.includes(obs));
    const now = new Date().toISOString();

    await this.sqliteManager.updateData(
      this.memoryDbName,
      'entities',
      { name: entityName },
      {
        observations: JSON.stringify(updatedObservations),
        updated_at: now
      }
    );

    return {
      name: entity.name,
      entityType: entity.entity_type,
      observations: updatedObservations,
      createdAt: entity.created_at,
      updatedAt: now
    };
  }

  async deleteObservations(deletions: Array<{ entityName: string; observations: string[] }>): Promise<Entity[]> {
    const results: Entity[] = [];

    for (const deletion of deletions) {
      try {
        const updated = await this.deleteObservation(deletion.entityName, deletion.observations);
        results.push(updated);
      } catch (error) {
        console.error(`Failed to delete observations from entity ${deletion.entityName}:`, error);
      }
    }

    if (results.length > 0) await this.syncToCentralSafe();
    return results;
  }

  async deleteRelation(from: string, to: string, relationType: string): Promise<void> {
    await this.sqliteManager.deleteData(this.memoryDbName, 'relations', {
      from_entity: from,
      to_entity: to,
      relation_type: relationType
    });
  }

  async deleteRelations(relations: Array<{ from: string; to: string; relationType: string }>): Promise<void> {
    for (const relation of relations) {
      await this.deleteRelation(relation.from, relation.to, relation.relationType);
    }
    await this.syncToCentralSafe();
  }

  async readGraph(): Promise<KnowledgeGraph> {
    // Get all entities
    const entitiesResult = await this.sqliteManager.queryData(this.memoryDbName, 'entities', {});
    const entities: Entity[] = (entitiesResult.success && entitiesResult.data)
      ? entitiesResult.data.rows.map((row: any) => ({
          name: row.name,
          entityType: row.entity_type,
          observations: this.safeParseObservations(row.observations),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      : [];

    // Get all relations
    const relationsResult = await this.sqliteManager.queryData(this.memoryDbName, 'relations', {});
    const relations: Relation[] = (relationsResult.success && relationsResult.data)
      ? relationsResult.data.rows.map((row: any) => ({
          from: row.from_entity,
          to: row.to_entity,
          relationType: row.relation_type,
          createdAt: row.created_at
        }))
      : [];

    return { entities, relations };
  }

  async searchNodes(query: string): Promise<SearchResult> {
    const searchTerm = `%${query.toLowerCase()}%`;

    // Search entities by name, type, or observations
    const entitiesQuery = `
      SELECT * FROM entities
      WHERE LOWER(name) LIKE ? OR LOWER(entity_type) LIKE ? OR LOWER(observations) LIKE ?
    `;
    const entitiesResult = await this.sqliteManager.executeSql(this.memoryDbName, entitiesQuery,
      [searchTerm, searchTerm, searchTerm]);

    const entities: Entity[] = (entitiesResult.success && entitiesResult.data)
      ? entitiesResult.data.rows.map((row: any) => ({
          name: row.name,
          entityType: row.entity_type,
          observations: this.safeParseObservations(row.observations),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        }))
      : [];

    // Search relations by relation type
    const relationsQuery = `
      SELECT * FROM relations
      WHERE LOWER(relation_type) LIKE ? OR LOWER(from_entity) LIKE ? OR LOWER(to_entity) LIKE ?
    `;
    const relationsResult = await this.sqliteManager.executeSql(this.memoryDbName, relationsQuery,
      [searchTerm, searchTerm, searchTerm]);

    const relations: Relation[] = (relationsResult.success && relationsResult.data)
      ? relationsResult.data.rows.map((row: any) => ({
          from: row.from_entity,
          to: row.to_entity,
          relationType: row.relation_type,
          createdAt: row.created_at
        }))
      : [];

    return { entities, relations };
  }

  async openNode(name: string): Promise<Entity | null> {
    const result = await this.sqliteManager.queryData(this.memoryDbName, 'entities', { name });
    if (!result.success || !result.data || result.data.rows.length === 0) {
      return null;
    }

    const row = result.data.rows[0];
    return {
      name: row.name,
      entityType: row.entity_type,
      observations: this.safeParseObservations(row.observations),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private safeParseObservations(json: string): string[] {
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }

  async openNodes(names: string[]): Promise<Entity[]> {
    const entities: Entity[] = [];

    for (const name of names) {
      const entity = await this.openNode(name);
      if (entity) {
        entities.push(entity);
      }
    }

    return entities;
  }
}
