import { SQLiteManager } from '../sqlite-manager.js';
import { MemoryManager } from '../memory-manager.js';
import { ImportExportManager } from '../import-export.js';
import { PromptHandlers } from '../prompts/prompt-handlers.js';
import { z } from 'zod';
import {
  ExecuteSqlSchema, QueryDataSchema, InsertDataSchema, UpdateDataSchema,
  DeleteDataSchema, ImportFromFileSchema, ExportToFileSchema,
  CreateEntitiesSchema, CreateRelationsSchema, AddObservationsSchema,
  DeleteEntitiesSchema, DeleteObservationsSchema, DeleteRelationsSchema,
  SearchNodesSchema, OpenNodesSchema
} from '../types.js';
import {
  AnalyzeGitChangesSchema, CacheDeleteSchema, CacheGetSchema, CacheScanSchema, CacheSetSchema,
  GetSessionContextSchema, InspectUntrustedTextSchema, ScanContainerImageSchema, ScanProjectSecretsSchema,
} from '../types.js';
import { RuntimeCapabilities } from '../runtime/runtime-capabilities.js';

const toolSchemas: Record<string, z.ZodSchema> = {
  execute_sql: ExecuteSqlSchema.omit({ database: true }),
  query_data: QueryDataSchema.omit({ database: true }),
  insert_data: InsertDataSchema.omit({ database: true }),
  update_data: UpdateDataSchema.omit({ database: true }),
  delete_data: DeleteDataSchema.omit({ database: true }),
  import_data: ImportFromFileSchema.omit({ database: true }),
  export_data: ExportToFileSchema.omit({ database: true }),
  create_entity: CreateEntitiesSchema,
  create_relation: CreateRelationsSchema,
  add_observation: AddObservationsSchema,
  delete_entity: DeleteEntitiesSchema,
  delete_observation: DeleteObservationsSchema,
  delete_relation: DeleteRelationsSchema,
  search_nodes: SearchNodesSchema,
  open_node: OpenNodesSchema,
  get_session_context: GetSessionContextSchema,
  analyze_git_changes: AnalyzeGitChangesSchema,
  inspect_untrusted_text: InspectUntrustedTextSchema,
  scan_project_secrets: ScanProjectSecretsSchema,
  scan_container_image: ScanContainerImageSchema,
  cache_get: CacheGetSchema,
  cache_set: CacheSetSchema,
  cache_delete: CacheDeleteSchema,
  cache_scan: CacheScanSchema,
};

const runtimeToolNames = new Set([
  'get_session_context', 'analyze_git_changes', 'inspect_untrusted_text',
  'scan_project_secrets', 'scan_container_image', 'cache_get', 'cache_set',
  'cache_delete', 'cache_scan',
]);

export class RequestHandlers {
  constructor(
    private sqliteManager: SQLiteManager,
    private memoryManager: MemoryManager,
    private importExportManager: ImportExportManager,
    private promptHandlers: PromptHandlers,
    private runtimeCapabilities?: RuntimeCapabilities
  ) {}

  async handleToolCall(name: string, args: any): Promise<any> {
    try {
      const schema = toolSchemas[name];
      if (schema) {
        args = schema.parse(args);
      }

      if (['execute_sql', 'query_data', 'insert_data', 'update_data', 'delete_data', 'import_data', 'export_data'].includes(name)) {
        return await this.handleDatabaseTool(name, args);
      }

      if (['initialize_memory', 'create_entity', 'create_relation', 'add_observation', 'delete_entity', 'delete_observation', 'delete_relation', 'read_graph', 'search_nodes', 'open_node'].includes(name)) {
        return await this.handleMemoryTool(name, args);
      }

      if (name === 'get_project_guidance') {
        const guidanceContent = await this.promptHandlers.handleGetPrompt(args.guidance_name, args.arguments || {});
        return {
          success: true,
          data: {
            guidance_name: args.guidance_name,
            instructions: guidanceContent
          },
          message: `Successfully loaded guidance for ${args.guidance_name}`
        };
      }

      if (runtimeToolNames.has(name)) {
        if (!this.runtimeCapabilities) throw new Error('Runtime companions are unavailable');
        return { success: true, data: await this.handleRuntimeTool(name, args) };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
      throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async handleRuntimeTool(name: string, args: any): Promise<unknown> {
    switch (name) {
      case 'get_session_context': return this.runtimeCapabilities!.getSessionContext(args);
      case 'analyze_git_changes': return this.runtimeCapabilities!.analyzeGitChanges(args);
      case 'inspect_untrusted_text': return this.runtimeCapabilities!.inspectUntrustedText(args);
      case 'scan_project_secrets': return this.runtimeCapabilities!.scanProjectSecrets(args);
      case 'scan_container_image': return this.runtimeCapabilities!.scanContainerImage(args);
      case 'cache_get': return this.runtimeCapabilities!.cacheGet(args);
      case 'cache_set': return this.runtimeCapabilities!.cacheSet(args);
      case 'cache_delete': return this.runtimeCapabilities!.cacheDelete(args);
      case 'cache_scan': return this.runtimeCapabilities!.cacheScan(args);
      default: throw new Error(`Unknown runtime tool: ${name}`);
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

      case 'create_entity': {
        const entities = await this.memoryManager.createEntities(args.entities);
        const failedEntities = args.entities.length - entities.length;
        return {
          success: true, data: entities,
          message: failedEntities > 0
            ? `Created ${entities.length}/${args.entities.length} entities (${failedEntities} failed)`
            : `Created ${entities.length} entities`
        };
      }

      case 'create_relation': {
        const relations = await this.memoryManager.createRelations(args.relations);
        const failedRelations = args.relations.length - relations.length;
        return {
          success: true, data: relations,
          message: failedRelations > 0
            ? `Created ${relations.length}/${args.relations.length} relations (${failedRelations} failed)`
            : `Created ${relations.length} relations`
        };
      }

      case 'add_observation': {
        const obsResults = await this.memoryManager.addObservations(args.observations);
        const failedObs = args.observations.length - obsResults.length;
        return {
          success: true,
          message: failedObs > 0
            ? `Added observations to ${obsResults.length}/${args.observations.length} entities (${failedObs} failed)`
            : `Added observations to ${args.observations.length} entities`
        };
      }

      case 'delete_entity':
        await this.memoryManager.deleteEntities(args.entityNames);
        return { success: true, message: `Deleted ${args.entityNames.length} entities` };

      case 'delete_observation': {
        const delResults = await this.memoryManager.deleteObservations(args.deletions);
        const failedDel = args.deletions.length - delResults.length;
        return {
          success: true,
          message: failedDel > 0
            ? `Deleted observations from ${delResults.length}/${args.deletions.length} entities (${failedDel} failed)`
            : `Deleted observations from ${args.deletions.length} entities`
        };
      }

      case 'delete_relation':
        await this.memoryManager.deleteRelations(args.relations);
        return { success: true, message: `Deleted ${args.relations.length} relations` };

      case 'read_graph': {
        const graph = await this.memoryManager.readGraph();
        return { success: true, data: graph };
      }

      case 'search_nodes': {
        const searchResult = await this.memoryManager.searchNodes(args.query);
        return { success: true, data: searchResult };
      }

      case 'open_node': {
        const entitiesDetails = await this.memoryManager.openNodes(args.names);
        return { success: true, data: entitiesDetails };
      }
    }
  }
}
