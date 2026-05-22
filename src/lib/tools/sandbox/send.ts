import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'sandbox_send',
      description: 'Отправить текст в stdin запущенного процесса (sandbox_spawn). Используй для подтверждений (Y/n), ввода данных, отправки Ctrl+C (\\x03) и Ctrl+D (\\x04).',
      parameters: {
        type: 'object',
        properties: {
          processId: {
            type: 'string',
            description: 'ID процесса, полученный из sandbox_spawn',
          },
          input: {
            type: 'string',
            description: 'Текст для отправки в stdin процесса',
          },
        },
        required: ['processId', 'input'],
      },
    },
  },
  permission: 'safe',
  category: 'sandbox',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validatePid, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    try {
      validatePid(args.processId);
      const escapedInput = shellEscapeSingle(args.input);
      const result = await sandboxManager.execInSandbox(
        `echo ${escapedInput} | /proc/${args.processId}/fd/0 2>/dev/null || echo 'Process not found'`,
        '/workspace',
        5
      );
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);