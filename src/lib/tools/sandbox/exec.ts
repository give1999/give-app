import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'sandbox_exec',
      description: 'Выполнить shell-команду в изолированной песочнице. Используй для работы с файлами, установки пакетов, запуска скриптов. Команда выполняется в bash-окружении с полными правами внутри песочницы.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell-команда для выполнения (bash)',
          },
          cwd: {
            type: 'string',
            description: 'Рабочая директория (по умолчанию /workspace)',
          },
          timeout: {
            type: 'number',
            description: 'Таймаут в секундах. ОБЯЗАТЕЛЬНЫЙ параметр — всегда указывай. Максимум 300 для обычных команд, 3600 для daemon.',
          },
        },
        required: ['command', 'timeout'],
      },
    },
  },
  permission: 'safe',
  category: 'sandbox',
  execute: async (args) => {
    console.log(`[sandbox_exec] ➡️  START command="${args.command?.toString().slice(0, 100)}" cwd="${args.cwd || '/workspace'}" timeout=${args.timeout || 30}`);
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validateCwd, validateTimeout } = require('@/src/lib/sandbox/shellSanitize');
    try {
      const cwd = validateCwd(args.cwd || '/workspace');
      const timeout = validateTimeout(args.timeout || 30);
      console.log(`[sandbox_exec] ℹ️  Validated cwd="${cwd}" timeout=${timeout}`);
      const result = await sandboxManager.execInSandbox(
        args.command,
        cwd,
        timeout
      );
      console.log(`[sandbox_exec] ✅ DONE exitCode=${result.exitCode} stdoutLen=${result.stdout?.length || 0} stderrLen=${result.stderr?.length || 0}`);
      return JSON.stringify(result);
    } catch (e: any) {
      console.error(`[sandbox_exec] ❌ ERROR: ${e.message}`);
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);