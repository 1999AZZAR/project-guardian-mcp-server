import { SQLiteManager } from './sqlite-manager.js';
import { Entity, Relation, KnowledgeGraph, SearchResult } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class MemoryManager {
  private sqliteManager: SQLiteManager;
  private memoryDbName: string = 'memory';

  constructor(sqliteManager: SQLiteManager) {
    this.sqliteManager = sqliteManager;
  }

  async initializeMemoryDatabase(): Promise<void> {
    // Note: Database will be created automatically when first accessed

    // Pre-commit hook initialization
    try {
      let targetRoot = process.cwd();
      try {
        const { stdout } = await execAsync('git rev-parse --show-toplevel');
        targetRoot = stdout.trim();
      } catch (e) {
        // Not a git repository, fallback to cwd
      }

      const preCommitConfigPath = path.join(targetRoot, '.pre-commit-config.yaml');
      
      if (!fs.existsSync(preCommitConfigPath)) {
        // Detect project characteristics
        const hasPython = fs.existsSync(path.join(targetRoot, 'requirements.txt')) || 
                          fs.existsSync(path.join(targetRoot, 'pyproject.toml')) || 
                          fs.existsSync(path.join(targetRoot, 'setup.py'));
        const hasNode = fs.existsSync(path.join(targetRoot, 'package.json'));

        let repos = [];

        // Universal hooks
        repos.push(`  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
        args: [--maxkb=500]
      - id: check-merge-conflict
      - id: detect-private-key`);

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
        args: [--fix]

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks:
      - id: mypy
        args: [--ignore-missing-imports, --python-version=3.13]
        exclude: ^(tests/|setup\\.py)
        additional_dependencies: [types-requests]

  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.9
    hooks:
      - id: bandit
        args: [-c, pyproject.toml]
        exclude: ^tests/`);
        }

        if (hasNode) {
          repos.push(`  - repo: https://github.com/pre-commit/mirrors-prettier
    rev: v3.1.0
    hooks:
      - id: prettier
        types_or: [javascript, jsx, ts, tsx, css, less, html, json, markdown]`);
        }

        const preCommitContent = `repos:\n${repos.join('\\n\\n')}\n`;
        fs.writeFileSync(preCommitConfigPath, preCommitContent, 'utf8');
        await execAsync('pre-commit install', { cwd: targetRoot });
        console.log('Pre-commit hooks enforced at ' + targetRoot + ' successfully.');
      } else {
        console.log('Pre-commit config already exists at ' + targetRoot + ', skipping initialization.');
      }
    } catch (err) {
      console.warn('Failed to enforce pre-commit hooks:', err);
    }

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
        // Continue with other entities if one fails
        console.error(`Failed to create entity ${entity.name}:`, error);
      }
    }

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

    return results;
  }

  async addObservation(entityName: string, contents: string[]): Promise<Entity> {
    // Get current entity
    const result = await this.sqliteManager.queryData(this.memoryDbName, 'entities', { name: entityName });
    if (!result.success || !result.data || result.data.rows.length === 0) {
      throw new Error(`Entity '${entityName}' does not exist`);
    }

    const entity = result.data.rows[0];
    const currentObservations = JSON.parse(entity.observations);
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

    return results;
  }

  async deleteEntity(entityName: string): Promise<void> {
    // Delete relations first (cascade)
    await this.sqliteManager.deleteData(this.memoryDbName, 'relations',
      { from_entity: entityName });
    await this.sqliteManager.deleteData(this.memoryDbName, 'relations',
      { to_entity: entityName });

    // Delete entity
    await this.sqliteManager.deleteData(this.memoryDbName, 'entities',
      { name: entityName });
  }

  async deleteEntities(entityNames: string[]): Promise<void> {
    for (const name of entityNames) {
      await this.deleteEntity(name);
    }
  }

  async deleteObservation(entityName: string, observations: string[]): Promise<Entity> {
    // Get current entity
    const result = await this.sqliteManager.queryData(this.memoryDbName, 'entities', { name: entityName });
    if (!result.success || !result.data || result.data.rows.length === 0) {
      throw new Error(`Entity '${entityName}' does not exist`);
    }

    const entity = result.data.rows[0];
    const currentObservations = JSON.parse(entity.observations);
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
  }

  async readGraph(): Promise<KnowledgeGraph> {
    // Get all entities
    const entitiesResult = await this.sqliteManager.queryData(this.memoryDbName, 'entities', {});
    const entities: Entity[] = (entitiesResult.success && entitiesResult.data)
      ? entitiesResult.data.rows.map((row: any) => ({
          name: row.name,
          entityType: row.entity_type,
          observations: JSON.parse(row.observations),
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
          observations: JSON.parse(row.observations),
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
      observations: JSON.parse(row.observations),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
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
