import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SQLiteManager } from '../sqlite-manager.js';
import { MemoryManager } from '../memory-manager.js';
import { ImportExportManager } from '../import-export.js';

export class RequestHandlers {
  constructor(
    private sqliteManager: SQLiteManager,
    private memoryManager: MemoryManager,
    private importExportManager: ImportExportManager
  ) {}

  async handleToolCall(name: string, args: any): Promise<any> {
    try {
      // Database operations
      if (['execute_sql', 'query_data', 'insert_data', 'update_data', 'delete_data', 'import_data', 'export_data'].includes(name)) {
        return await this.handleDatabaseTool(name, args);
      }

      // Memory operations
      if (['initialize_memory', 'create_entity', 'create_relation', 'add_observation', 'delete_entity', 'delete_observation', 'delete_relation', 'read_graph', 'search_nodes', 'open_node'].includes(name)) {
        return await this.handleMemoryTool(name, args);
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
      throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleDatabaseTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'execute_sql':
        return await this.sqliteManager.executeSql('memory', args.query, args.parameters);

      case 'query_data':
        return await this.sqliteManager.queryData(
          'memory',
          args.table,
          args.conditions,
          args.limit,
          args.offset,
          args.orderBy,
          args.orderDirection
        );

      case 'insert_data':
        return await this.sqliteManager.insertData('memory', args.table, args.records);

      case 'update_data':
        return await this.sqliteManager.updateData('memory', args.table, args.conditions, args.updates);

      case 'delete_data':
        return await this.sqliteManager.deleteData('memory', args.table, args.conditions);

      case 'import_data':
        return await this.importExportManager.importFromFile(
          'memory',
          args.table,
          args.filePath,
          args.format,
          args.options
        );

      case 'export_data':
        return await this.importExportManager.exportToFile(
          'memory',
          args.table,
          args.filePath,
          args.format,
          args.conditions,
          args.options
        );
    }
  }

  private async handleMemoryTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'initialize_memory':
        await this.memoryManager.initializeMemoryDatabase();
        return { success: true, message: 'Memory system initialized successfully' };

      case 'create_entity':
        const entities = await this.memoryManager.createEntities(args.entities);
        return { success: true, data: entities, message: `Created ${entities.length} entities` };

      case 'create_relation':
        const relations = await this.memoryManager.createRelations(args.relations);
        return { success: true, data: relations, message: `Created ${relations.length} relations` };

      case 'add_observation':
        await this.memoryManager.addObservations(args.observations);
        return { success: true, message: `Added observations to ${args.observations.length} entities` };

      case 'delete_entity':
        await this.memoryManager.deleteEntities(args.entityNames);
        return { success: true, message: `Deleted ${args.entityNames.length} entities` };

      case 'delete_observation':
        await this.memoryManager.deleteObservations(args.deletions);
        return { success: true, message: `Deleted observations from ${args.deletions.length} entities` };

      case 'delete_relation':
        await this.memoryManager.deleteRelations(args.relations);
        return { success: true, message: `Deleted ${args.relations.length} relations` };

      case 'read_graph':
        const graph = await this.memoryManager.readGraph();
        return { success: true, data: graph };

      case 'search_nodes':
        const searchResult = await this.memoryManager.searchNodes(args.query);
        return { success: true, data: searchResult };

      case 'open_node':
        const entitiesDetails = await this.memoryManager.openNodes(args.names);
        return { success: true, data: entitiesDetails };
    }
  }
}
