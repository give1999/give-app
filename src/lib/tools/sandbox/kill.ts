import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'sandbox_kill',
      description: 'Завершить запущенный процесс (sandbox_spawn) по его processId.',
      parameters: {
        type: 'object',
        properties: {
          processId: {
            type: 'string',
            description: 'ID процесса для завершения',
          },
        },
        required: ['processId'],
      },
    },
  },
  permission: 'safe',
  category: 'sandbox',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validatePid } = require('@/src/lib/sandbox/shellSanitize');
    try {
      const pid = validatePid(args.processId);
      const result = await sandboxManager.execInSandbox(
        `kill ${pid} 2>/dev/null && echo 'Process killed' || echo 'Process not found'`,
        '/workspace',
        5
      );
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message });
    }
  },
};

registerTool(tool);