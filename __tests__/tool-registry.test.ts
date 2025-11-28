import { ToolRegistry } from '../src/tools/tool-registry';

describe('ToolRegistry', () => {
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    toolRegistry = new ToolRegistry();
  });

  describe('Tool Listing', () => {
    test('should list all available tools', () => {
      const tools = toolRegistry.listTools();

      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);

      // Check that all tools have required properties
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
      });
    });

    test('should include database tools', () => {
      const tools = toolRegistry.listTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('execute_sql');
      expect(toolNames).toContain('query_data');
      expect(toolNames).toContain('insert_data');
      expect(toolNames).toContain('update_data');
      expect(toolNames).toContain('delete_data');
      expect(toolNames).toContain('import_data');
      expect(toolNames).toContain('export_data');
    });

    test('should include memory tools', () => {
      const tools = toolRegistry.listTools();
      const toolNames = tools.map(t => t.name);

      expect(toolNames).toContain('initialize_memory');
      expect(toolNames).toContain('create_entity');
      expect(toolNames).toContain('create_relation');
      expect(toolNames).toContain('add_observation');
      expect(toolNames).toContain('delete_entity');
      expect(toolNames).toContain('delete_observation');
      expect(toolNames).toContain('delete_relation');
      expect(toolNames).toContain('read_graph');
      expect(toolNames).toContain('search_nodes');
      expect(toolNames).toContain('open_node');
    });

    test('should have exactly 17 tools', () => {
      const tools = toolRegistry.listTools();
      expect(tools).toHaveLength(17);
    });
  });

  describe('Tool Schema Validation', () => {
    test('should have valid schema for execute_sql tool', () => {
      const tools = toolRegistry.listTools();
      const executeSqlTool = tools.find(t => t.name === 'execute_sql');

      expect(executeSqlTool).toBeDefined();
      expect(executeSqlTool!.inputSchema).toHaveProperty('type', 'object');
      expect(executeSqlTool!.inputSchema.properties).toHaveProperty('query');
      expect(executeSqlTool!.inputSchema.properties).toHaveProperty('parameters');
    });

    test('should have valid schema for create_entity tool', () => {
      const tools = toolRegistry.listTools();
      const createEntityTool = tools.find(t => t.name === 'create_entity');

      expect(createEntityTool).toBeDefined();
      expect(createEntityTool!.inputSchema).toHaveProperty('type', 'object');
      expect(createEntityTool!.inputSchema.properties).toHaveProperty('entities');
    });
  });
});
