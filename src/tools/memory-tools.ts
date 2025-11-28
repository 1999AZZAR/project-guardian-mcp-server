import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const memoryTools: Tool[] = [
  // Project Guardian Memory Tools (10 tools)
  {
    name: 'initialize_memory',
    description: 'Initialize the project memory system and database schema',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_entity',
    description: 'Create entity/entities in the project knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Entity name' },
              entityType: { type: 'string', description: 'Type (project, task, person, resource)' },
              observations: { type: 'array', items: { type: 'string' }, description: 'Notes about the entity' },
            },
            required: ['name', 'entityType', 'observations'],
          },
          minItems: 1,
          description: 'Array of entities to create (supports single or batch)',
        },
      },
      required: ['entities'],
    },
  },
  {
    name: 'create_relation',
    description: 'Create relation(s) between project entities',
    inputSchema: {
      type: 'object',
      properties: {
        relations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'Source entity name' },
              to: { type: 'string', description: 'Target entity name' },
              relationType: { type: 'string', description: 'Relationship type (depends_on, blocks, owns, etc.)' },
            },
            required: ['from', 'to', 'relationType'],
          },
          minItems: 1,
          description: 'Array of relations to create (supports single or batch)',
        },
      },
      required: ['relations'],
    },
  },
  {
    name: 'add_observation',
    description: 'Add observation(s) to project entity/entities',
    inputSchema: {
      type: 'object',
      properties: {
        observations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entityName: { type: 'string', description: 'Entity name' },
              contents: { type: 'array', items: { type: 'string' }, description: 'Observations to add' },
            },
            required: ['entityName', 'contents'],
          },
          minItems: 1,
          description: 'Array of observation updates (supports single or batch)',
        },
      },
      required: ['observations'],
    },
  },
  {
    name: 'delete_entity',
    description: 'Delete entity/entities and their relations from project memory',
    inputSchema: {
      type: 'object',
      properties: {
        entityNames: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          description: 'Names of entities to delete (supports single or batch)',
        },
      },
      required: ['entityNames'],
    },
  },
  {
    name: 'delete_observation',
    description: 'Remove specific observation(s) from entity/entities',
    inputSchema: {
      type: 'object',
      properties: {
        deletions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entityName: { type: 'string', description: 'Entity name' },
              observations: { type: 'array', items: { type: 'string' }, description: 'Observations to remove' },
            },
            required: ['entityName', 'observations'],
          },
          minItems: 1,
          description: 'Array of observation deletions (supports single or batch)',
        },
      },
      required: ['deletions'],
    },
  },
  {
    name: 'delete_relation',
    description: 'Delete relation(s) between project entities',
    inputSchema: {
      type: 'object',
      properties: {
        relations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'Source entity name' },
              to: { type: 'string', description: 'Target entity name' },
              relationType: { type: 'string', description: 'Relationship type to delete' },
            },
            required: ['from', 'to', 'relationType'],
          },
          minItems: 1,
          description: 'Array of relations to delete (supports single or batch)',
        },
      },
      required: ['relations'],
    },
  },
  {
    name: 'read_graph',
    description: 'Read the entire project knowledge graph',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'search_nodes',
    description: 'Search project entities and relations by query',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term for entities and relations' },
      },
      required: ['query'],
    },
  },
  {
    name: 'open_node',
    description: 'Get detailed information about project entity/entities',
    inputSchema: {
      type: 'object',
      properties: {
        names: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          description: 'Entity names to retrieve (supports single or batch)',
        },
      },
      required: ['names'],
    },
  },
];
