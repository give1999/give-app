import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'sandbox_env',
      description: 'Установить или получить переменные окружения в песочнице. Без аргументов — показывает все переменные.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['set', 'get', 'list'],
            description: 'Действие: set — установить, get — получить, list — показать все',
          },
          name: {
            type: 'string',
            description: 'Имя переменной окружения',
          },
          value: {
            type: 'string',
            description: 'Значение переменной (для action=set)',
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
    const { validateEnvName, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    let cmd: string;
    try {
      switch (args.action) {
        case 'set': {
          validateEnvName(args.name);
          const escapedValue = shellEscapeSingle(args.value || '');
          cmd = `export ${args.name}=${escapedValue} && echo ${shellEscapeSingle(args.name + ' set')}`;
          break;
        }
        case 'get': {
          validateEnvName(args.name);
          cmd = `printenv ${shellEscapeSingle(args.name)} || echo '<unset>'`;
          break;
        }
        case 'list':
        default:
          // Выводим только безопасные переменные, исключая потенциально чувствительные (точное совпадание имени)
          cmd = 'env | grep -v -E "^(API|KEY|TOKEN|SECRET|PASS|AUTH|CREDENTIAL)_" | sort';
          break;
      }
      const result = await sandboxManager.execInSandbox(cmd, '/workspace', 10);
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message });
    }
  },
};

registerTool(tool);