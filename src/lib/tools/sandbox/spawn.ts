import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'sandbox_spawn',
      description: 'Запустить долгий или интерактивный процесс в песочнице. Возвращает processId для дальнейшего взаимодействия через sandbox_send и sandbox_kill.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Команда для запуска',
          },
          cwd: {
            type: 'string',
            description: 'Рабочая директория (по умолчанию /workspace)',
          },
        },
        required: ['command'],
      },
    },
  },
  permission: 'safe',
  category: 'sandbox',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validateCwd } = require('@/src/lib/sandbox/shellSanitize');
    try {
      const cwd = validateCwd(args.cwd || '/workspace');
      // Запускаем процесс с большим таймаутом (daemon-режим)
      const result = await sandboxManager.execInSandbox(
        args.command,
        cwd,
        3600 // 1 час для daemon-процессов
      );
      return JSON.stringify({
        processId: result.exitCode !== undefined ? `proc_${Date.now()}` : null,
        ...result,
      });
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);