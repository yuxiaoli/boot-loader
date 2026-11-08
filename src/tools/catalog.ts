import manifest from './manifest.json';
import { FigletWorker, type ToolRuntime } from './worker-client';

export type ToolDefinition = Readonly<(typeof manifest.tools)[number]>;

// Only reviewed, compiled adapters can run. The manifest supplies package metadata,
// never module URLs or executable code. New adapters must be added here in code.
export const toolRuntimeFactories: Readonly<Record<string, () => ToolRuntime>> = Object.freeze({
  'figlet-browser-v1': () => new FigletWorker(),
});
export function validateToolManifest(value: unknown): boolean {
  const record = (row: unknown): row is Record<string, unknown> => !!row && typeof row === 'object' && !Array.isArray(row);
  const exactKeys = (row: object, keys: string[]) => Object.keys(row).length === keys.length && keys.every(key => Object.hasOwn(row, key));
  if (!record(value) || value.version !== 1 || !exactKeys(value, ['version', 'tools']) || !Array.isArray(value.tools)) return false;
  const ids = new Set<string>(), commands = new Set<string>();
  for (const tool of value.tools) {
    if (!record(tool) || !exactKeys(tool, ['id', 'version', 'adapter', 'command', 'description']) ||
        typeof tool.id !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(tool.id) ||
        typeof tool.command !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(tool.command) ||
        ![tool.version, tool.adapter, tool.description].every(text => typeof text === 'string' && text.length > 0 && text.length <= 200 && !/[\x00-\x1f\x7f-\x9f]/.test(text)) ||
        ids.has(tool.id) || commands.has(tool.command)) return false;
    ids.add(tool.id); commands.add(tool.command);
  }
  return JSON.stringify(value) === JSON.stringify(manifest);
}

export const trustedTools: readonly ToolDefinition[] = Object.freeze(
  validateToolManifest(manifest)
    ? manifest.tools.filter(tool => Object.hasOwn(toolRuntimeFactories, tool.adapter)).map(tool => Object.freeze(tool))
    : [],
);
