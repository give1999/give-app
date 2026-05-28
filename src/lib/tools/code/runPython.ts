import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'code_run_python',
      description: 'Выполнить Python-код в песочнице. Код запускается через python3. (Внимание: Python не предустановлен в этой версии песочницы).',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'Python-код для выполнения',
          },
          timeout: {
            type: 'number',
            description: 'Таймаут в секундах (по умолчанию 30)',
            default: 30,
          },
        },
        required: ['code'],
      },
    },
  },
  permission: 'safe',
  category: 'code',
  execute: async (args) => {
    return JSON.stringify({
      error: 'Интерпретатор Python (python3) не установлен в данной минимальной песочнице BusyBox. Пожалуйста, используйте JavaScript (инструмент code_run_js) для выполнения вычислений и запуска вашего скрипта.',
      exitCode: 127
    });
  },
};

registerTool(tool);