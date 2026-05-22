import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'text_tts',
      description: 'Синтез речи (Text-to-Speech). Преобразует текст в аудио.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Текст для озвучивания',
          },
          language: {
            type: 'string',
            description: 'Код языка (по умолчанию "ru")',
            default: 'ru',
          },
        },
        required: ['text'],
      },
    },
  },
  permission: 'safe',
  category: 'text',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validateLanguageCode, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    try {
      const lang = validateLanguageCode(args.language || 'ru');
      const escapedText = shellEscapeSingle(args.text);
      const result = await sandboxManager.execInSandbox(
        `python3 -c "import subprocess; subprocess.run(['espeak', '-v', ${shellEscapeSingle(lang)}, ${escapedText}], check=True)" 2>/dev/null && echo 'TTS completed' || echo 'TTS not available - install espeak'`,
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