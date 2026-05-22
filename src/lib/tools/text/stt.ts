import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'text_stt',
      description: 'Распознавание речи (Speech-to-Text). Преобразует аудио в текст.',
      parameters: {
        type: 'object',
        properties: {
          audioPath: {
            type: 'string',
            description: 'Путь к аудиофайлу в песочнице',
          },
          language: {
            type: 'string',
            description: 'Код языка (по умолчанию "ru")',
            default: 'ru',
          },
        },
        required: ['audioPath'],
      },
    },
  },
  permission: 'safe',
  category: 'text',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validateLanguageCode, validateSandboxPath, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    try {
      const lang = validateLanguageCode(args.language || 'ru');
      const audioPath = validateSandboxPath(args.audioPath);
      const result = await sandboxManager.execInSandbox(
        `whisper --language ${shellEscapeSingle(lang)} --model tiny ${shellEscapeSingle(audioPath)} 2>/dev/null || echo 'STT not available - install whisper'`,
        '/workspace',
        120
      );
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);