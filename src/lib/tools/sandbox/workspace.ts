import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'sandbox_workspace',
      description: 'Управление рабочим пространством: получить текущую директорию, сменить директорию, показать структуру файлов.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['pwd', 'cd', 'tree'],
            description: 'Действие: pwd — текущая директория, cd — сменить, tree — структура файлов',
          },
          path: {
            type: 'string',
            description: 'Путь (для cd и tree)',
          },
        },
        required: ['action'],
      },
    },
  },
  permission: 'safe',
  category: 'sandbox',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validateSandboxPath, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    let cmd: string;
    try {
      switch (args.action) {
        case 'pwd':
          cmd = 'pwd';
          break;
        case 'cd': {
          const path = validateSandboxPath(args.path || '/workspace');
          cmd = `cd ${shellEscapeSingle(path)} && pwd`;
          break;
        }
        case 'tree': {
          const path = validateSandboxPath(args.path || '/workspace');
          cmd = `find ${shellEscapeSingle(path)} -maxdepth 3 -not -path '*/proc/*' -not -path '*/sys/*' -not -path '*/dev/*' 2>/dev/null | head -100`;
          break;
        }
        default:
          cmd = 'pwd';
      }
      const result = await sandboxManager.execInSandbox(cmd, '/workspace', 10);
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);