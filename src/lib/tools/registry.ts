import type { ToolDefinition } from '@/src/types';

export interface Tool {
  definition: ToolDefinition;
  execute: (args: Record<string, unknown>) => Promise<string>;
  /** ВСЕ инструменты safe — агент имеет полную свободу в песочнице */
  permission: 'safe' | 'ask_once' | 'ask_always';
  /** Категория для группировки и иконок */
  category: string;
}

const registry = new Map<string, Tool>();

export function registerTool(tool: Tool): void {
  if (registry.has(tool.definition.function.name)) {
    console.warn(`[ToolRegistry] Tool "${tool.definition.function.name}" already registered, overwriting`);
  }
  registry.set(tool.definition.function.name, tool);
}

export function getTool(name: string): Tool | undefined {
  return registry.get(name);
}

export function getAllToolDefinitions(): ToolDefinition[] {
  return Array.from(registry.values()).map(t => t.definition);
}

export function getAllTools(): Tool[] {
  return Array.from(registry.values());
}

export function getToolsByCategory(category: string): Tool[] {
  return Array.from(registry.values()).filter(t => t.category === category);
}

export function getToolCategory(name: string): string {
  const tool = registry.get(name);
  return tool?.category ?? 'unknown';
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result: string; error?: string; category: string }> {
  console.log(`[ToolExecute] ➡️  START name="${name}" args=${JSON.stringify(args).slice(0, 500)}`);
  const tool = registry.get(name);
  if (!tool) {
    console.error(`[ToolExecute] ❌ Tool not found: "${name}"`);
    return { success: false, result: '', error: `Неизвестный инструмент: ${name}`, category: 'unknown' };
  }
  console.log(`[ToolExecute] ℹ️  Found tool "${name}" category="${tool.category}" permission="${tool.permission}"`);
  try {
    const result = await tool.execute(args);
    console.log(`[ToolExecute] ✅ SUCCESS name="${name}" resultLength=${result.length} resultPreview=${result.slice(0, 200)}`);
    return { success: true, result, category: tool.category };
  } catch (e: any) {
    console.error(`[ToolExecute] ❌ ERROR name="${name}" error="${e?.message ?? 'Unknown'}" stack="${e?.stack?.slice(0, 300) ?? 'N/A'}"`);
    return { success: false, result: '', error: e?.message ?? 'Неизвестная ошибка', category: tool.category };
  }
}