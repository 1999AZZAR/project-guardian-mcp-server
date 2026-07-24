import { Tool } from '@modelcontextprotocol/sdk/types.js';

const object = (properties: Record<string, object>, required: string[] = []) => ({
  type: 'object' as const, properties, required, additionalProperties: false,
});

export const runtimeTools: Tool[] = [
  { name: 'get_session_context', description: 'Summarize active tasks, open bugs, recent changes, and blockers from project memory', inputSchema: object({ limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 } }) },
  { name: 'analyze_git_changes', description: 'Analyze bounded Git changes and untracked files in the current workspace', inputSchema: object({ commit: { type: 'string' }, since: { type: 'string', default: '1' }, includeUntracked: { type: 'boolean', default: true }, maxFiles: { type: 'integer', minimum: 1, maximum: 500, default: 100 } }) },
  { name: 'inspect_untrusted_text', description: 'Normalize untrusted text and detect common prompt-injection indicators', inputSchema: object({ text: { type: 'string', description: 'Untrusted text, maximum 256 KiB' } }, ['text']) },
  { name: 'scan_project_secrets', description: 'Scan a workspace-relative path for likely hardcoded credentials without exposing values', inputSchema: object({ path: { type: 'string', default: '.' }, exclude: { type: 'array', items: { type: 'string' } }, maxFindings: { type: 'integer', minimum: 1, maximum: 500, default: 100 } }) },
  { name: 'scan_container_image', description: 'Scan a container image for HIGH and CRITICAL vulnerabilities using Trivy', inputSchema: object({ image: { type: 'string' }, maxFindings: { type: 'integer', minimum: 1, maximum: 500, default: 100 } }, ['image']) },
  { name: 'cache_get', description: 'Get a value from the optional Redis companion cache', inputSchema: object({ key: { type: 'string' } }, ['key']) },
  { name: 'cache_set', description: 'Set a value in the optional Redis companion cache', inputSchema: object({ key: { type: 'string' }, value: { type: 'string' }, ttlSeconds: { type: 'integer', minimum: 1, maximum: 604800 } }, ['key', 'value']) },
  { name: 'cache_delete', description: 'Delete a value from the optional Redis companion cache', inputSchema: object({ key: { type: 'string' } }, ['key']) },
  { name: 'cache_scan', description: 'Scan namespaced keys in the optional Redis companion cache', inputSchema: object({ pattern: { type: 'string', default: 'mema:*' }, cursor: { type: 'integer', minimum: 0, default: 0 }, count: { type: 'integer', minimum: 1, maximum: 200, default: 100 } }) },
];
