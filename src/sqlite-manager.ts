import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'fs';
import { join } from 'path';
import { 
  DatabaseInfo, 
  TableInfo, 
  ColumnInfo, 
  IndexInfo, 
  QueryResult, 
  DatabaseOperationResult 
} from './types.js';

export class SQLiteManager {
  private connections: Map<string, sqlite3.Database> = new Map();
  private databasesPath: string;
  private defaultDatabaseName: string = 'memory';

  constructor(databasesPath: string = './databases') {
    this.databasesPath = databasesPath;
    this.ensureDatabasesDirectory();
    this.initializeDefaultDatabase();
  }

  private ensureDatabasesDirectory(): void {
    if (!existsSync(this.databasesPath)) {
      mkdirSync(this.databasesPath, { recursive: true });
    }
  }

  private async initializeDefaultDatabase(): Promise<void> {
    try {
      const dbPath = this.getDatabasePath(this.defaultDatabaseName);
      if (!existsSync(dbPath)) {
        const db = new sqlite3.Database(dbPath);
        await new Promise<void>((resolve, reject) => {
          db.close((err) => (err ? reject(err) : resolve()));
        });
      }
    } catch (error) {
      console.error('Failed to initialize default database:', error);
    }
  }

  private getDatabasePath(name: string): string {
    return join(this.databasesPath, `${name}.db`);
  }

  private async getConnection(name: string): Promise<sqlite3.Database> {
    if (!this.connections.has(name)) {
      const dbPath = this.getDatabasePath(name);
      const db = new sqlite3.Database(dbPath);
      this.connections.set(name, db);
    }
    return this.connections.get(name)!;
  }

  async createDatabase(name: string): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const dbPath = this.getDatabasePath(name);
      
      if (existsSync(dbPath)) {
        return {
          success: false,
          message: `Database '${name}' already exists`,
          error: 'Database already exists'
        };
      }

      const db = new sqlite3.Database(dbPath);
      await new Promise<void>((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
      });

      const executionTime = Date.now() - startTime;
      return {
        success: true,
        message: `Database '${name}' created successfully`,
        data: { name, path: dbPath },
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create database '${name}'`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async listDatabases(): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const databases: DatabaseInfo[] = [];

      if (existsSync(this.databasesPath)) {
        const { readdirSync } = await import('fs');
        const files = readdirSync(this.databasesPath);
        
        for (const file of files) {
          if (file.endsWith('.db')) {
            const name = file.replace('.db', '');
            const path = join(this.databasesPath, file);
            const stats = statSync(path);
            
            databases.push({
              name,
              type: 'sqlite',
              path,
              size: stats.size,
              createdAt: stats.birthtime.toISOString(),
              modifiedAt: stats.mtime.toISOString()
            });
          }
        }
      }

      const executionTime = Date.now() - startTime;
      return {
        success: true,
        message: `Found ${databases.length} databases`,
        data: databases,
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to list databases',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async dropDatabase(name: string): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const dbPath = this.getDatabasePath(name);
      
      if (!existsSync(dbPath)) {
        return {
          success: false,
          message: `Database '${name}' does not exist`,
          error: 'Database not found'
        };
      }

      await this.closeConnection(name);
      const { unlinkSync } = await import('fs');
      unlinkSync(dbPath);
      
      const executionTime = Date.now() - startTime;
      return {
        success: true,
        message: `Database '${name}' dropped successfully`,
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to drop database '${name}'`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createTable(
    database: string, 
    tableName: string, 
    schema: any
  ): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const db = await this.getConnection(database);
      
      // Build CREATE TABLE SQL
      let sql = `CREATE TABLE IF NOT EXISTS ${tableName} (`;
      const columns: string[] = [];
      
      for (const column of schema.columns) {
        let columnDef = `${column.name} ${column.type}`;
        
        if (column.constraints) {
          columnDef += ' ' + column.constraints.join(' ');
        }
        
        if (column.defaultValue) {
          columnDef += ` DEFAULT ${column.defaultValue}`;
        }
        
        columns.push(columnDef);
      }
      
      sql += columns.join(', ');
      
      if (schema.primaryKey && schema.primaryKey.length > 0) {
        sql += `, PRIMARY KEY (${schema.primaryKey.join(', ')})`;
      }
      
      sql += ')';
      
      await this.runQuery(db, sql);
      
      // Create indexes if specified
      if (schema.indexes) {
        for (const index of schema.indexes) {
          const indexSql = `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ${index.name} ON ${tableName} (${index.columns.join(', ')})`;
          await this.runQuery(db, indexSql);
        }
      }
      
      const executionTime = Date.now() - startTime;
      return {
        success: true,
        message: `Table '${tableName}' created successfully`,
        executionTime
      };
    } catch (error) {
      console.error(`Failed to create table '${tableName}':`, error);
      return {
        success: false,
        message: `Failed to create table '${tableName}'`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async listTables(database: string): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const db = await this.getConnection(database);
      
      const result = await this.query(db, `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      const tables = result.rows.map((row: any) => row.name);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        message: `Found ${tables.length} tables`,
        data: tables,
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to list tables',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async describeTable(database: string, tableName: string): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const db = await this.getConnection(database);
      
      // Get table schema
      const schemaResult = await this.query(db, `PRAGMA table_info(${tableName})`);
      
      const columns: ColumnInfo[] = schemaResult.rows.map((row: any) => ({
        name: row.name,
        type: row.type,
        nullable: row.notnull === 0,
        defaultValue: row.dflt_value,
        constraints: []
      }));
      
      // Get indexes
      const indexesResult = await this.query(db, `PRAGMA index_list(${tableName})`);
      const indexes: IndexInfo[] = [];
      
      for (const indexRow of indexesResult.rows) {
        const indexColumnsResult = await this.query(db, `PRAGMA index_info(${indexRow.name})`);
        indexes.push({
          name: indexRow.name,
          columns: indexColumnsResult.rows.map((col: any) => col.name),
          unique: indexRow.unique === 1,
          type: indexRow.type || 'btree'
        });
      }
      
      // Get row count
      const countResult = await this.query(db, `SELECT COUNT(*) as count FROM ${tableName}`);
      const rowCount = countResult.rows[0].count;
      
      const tableInfo: TableInfo = {
        name: tableName,
        columns,
        indexes,
        rowCount,
        size: 0 // SQLite doesn't provide table size easily
      };
      
      const executionTime = Date.now() - startTime;
      return {
        success: true,
        message: `Table '${tableName}' described successfully`,
        data: tableInfo,
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to describe table '${tableName}'`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async dropTable(database: string, tableName: string): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const db = await this.getConnection(database);
      
      await this.runQuery(db, `DROP TABLE IF EXISTS ${tableName}`);
      
      const executionTime = Date.now() - startTime;
      return {
        success: true,
        message: `Table '${tableName}' dropped successfully`,
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to drop table '${tableName}'`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async insertData(database: string, tableName: string, records: any[]): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const db = await this.getConnection(database);
      
      if (records.length === 0) {
        return {
          success: false,
          message: 'No records to insert',
          error: 'Empty records array'
        };
      }
      
      const columns = Object.keys(records[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      
      let insertedCount = 0;
      for (const record of records) {
        const values = columns.map(col => record[col]);
        await this.runQuery(db, sql, values);
        insertedCount++;
      }
      
      const executionTime = Date.now() - startTime;
      return {
        success: true,
        message: `${insertedCount} records inserted successfully`,
        data: { insertedCount },
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to insert data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async queryData(
    database: string, 
    tableName: string, 
    conditions?: any, 
    limit?: number, 
    offset?: number,
    orderBy?: string,
    orderDirection?: string
  ): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const db = await this.getConnection(database);
      
      let sql = `SELECT * FROM ${tableName}`;
      const params: any[] = [];
      
      if (conditions && Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }
      
      if (orderBy) {
        sql += ` ORDER BY ${orderBy} ${orderDirection || 'ASC'}`;
      }
      
      if (limit) {
        sql += ` LIMIT ${limit}`;
        if (offset) {
          sql += ` OFFSET ${offset}`;
        }
      }
      
      const result = await this.query(db, sql, params);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        message: `Query executed successfully`,
        data: {
          columns: result.columns,
          rows: result.rows,
          rowCount: result.rowCount
        },
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to query data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateData(database: string, tableName: string, conditions: any, updates: any): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const db = await this.getConnection(database);
      
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      
      const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
      const params = [...Object.values(updates), ...Object.values(conditions)];
      
      const result = await this.runQuery(db, sql, params);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        message: `${result.changes} records updated successfully`,
        data: { changes: result.changes },
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteData(database: string, tableName: string, conditions: any): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const db = await this.getConnection(database);
      
      const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
      const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
      const params = Object.values(conditions);
      
      const result = await this.runQuery(db, sql, params);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        message: `${result.changes} records deleted successfully`,
        data: { changes: result.changes },
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async countRecords(database: string, tableName: string, conditions?: any): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const db = await this.getConnection(database);
      
      let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
      const params: any[] = [];
      
      if (conditions) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        params.push(...Object.values(conditions));
      }
      
      const result = await this.query(db, sql, params);
      const count = result.rows[0].count;
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        message: `Count: ${count}`,
        data: { count },
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to count records',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async executeSql(database: string, query: string, parameters?: any[]): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const db = await this.getConnection(database);
      
      // Check if it's a SELECT query
      const isSelect = query.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        const result = await this.query(db, query, parameters);
        const executionTime = Date.now() - startTime;
        
        return {
          success: true,
          message: 'SQL query executed successfully',
          data: {
            columns: result.columns,
            rows: result.rows,
            rowCount: result.rowCount
          },
          executionTime
        };
      } else {
        const result = await this.runQuery(db, query, parameters);
        const executionTime = Date.now() - startTime;
        
        return {
          success: true,
          message: 'SQL query executed successfully',
          data: { changes: result.changes },
          executionTime
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to execute SQL query',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async backupDatabase(database: string, backupPath: string): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      const dbPath = this.getDatabasePath(database);
      
      if (!existsSync(dbPath)) {
        return {
          success: false,
          message: `Database '${database}' does not exist`,
          error: 'Database not found'
        };
      }
      
      const { copyFileSync } = await import('fs');
      copyFileSync(dbPath, backupPath);
      
      const executionTime = Date.now() - startTime;
      return {
        success: true,
        message: `Database '${database}' backed up successfully`,
        data: { backupPath },
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to backup database',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async restoreDatabase(backupPath: string, databaseName: string): Promise<DatabaseOperationResult> {
    try {
      const startTime = Date.now();
      
      if (!existsSync(backupPath)) {
        return {
          success: false,
          message: `Backup file '${backupPath}' does not exist`,
          error: 'Backup file not found'
        };
      }
      
      const dbPath = this.getDatabasePath(databaseName);
      const { copyFileSync } = await import('fs');
      copyFileSync(backupPath, dbPath);
      
      const executionTime = Date.now() - startTime;
      return {
        success: true,
        message: `Database '${databaseName}' restored successfully`,
        data: { databaseName, path: dbPath },
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to restore database',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper methods
  private async query(db: sqlite3.Database, sql: string, params: any[] = []): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        const executionTime = Date.now() - startTime;
        const columns = rows.length > 0 ? Object.keys(rows[0] as any) : [];
        
        resolve({
          columns,
          rows: rows || [],
          rowCount: rows ? rows.length : 0,
          executionTime
        });
      });
    });
  }

  private async runQuery(db: sqlite3.Database, sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this);
      });
    });
  }

  async closeConnection(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (connection) {
      return new Promise((resolve) => {
        connection.close((err) => {
          if (err) {
            console.error(`Error closing connection for ${name}:`, err);
          }
          this.connections.delete(name);
          resolve();
        });
      });
    }
  }

  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.keys()).map(name => this.closeConnection(name));
    await Promise.all(closePromises);
  }
}