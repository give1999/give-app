import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'sandbox_list_pkgs',
      description: 'Показать установленные пакеты в песочнице.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'Фильтр по имени пакета',
          },
        },
        required: [],
      },
    },
  },
  permission: 'safe',
  category: 'sandbox',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    try {
      const filter = args.filter ? ` | grep -i ${shellEscapeSingle(args.filter)}` : '';
      const result = await sandboxManager.execInSandbox(
        `dpkg -l | tail -n +6 | awk '{print $2, $3}'${filter}`,
        '/workspace',
        30
      );
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);