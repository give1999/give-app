import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'text_translate',
      description: 'Перевести текст между языками.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Текст для перевода',
          },
          from: {
            type: 'string',
            description: 'Исходный язык (например "ru")',
          },
          to: {
            type: 'string',
            description: 'Целевой язык (например "en")',
          },
        },
        required: ['text', 'to'],
      },
    },
  },
  permission: 'safe',
  category: 'text',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validateLanguageCode, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    try {
      const to = validateLanguageCode(args.to);
      const from = args.from ? validateLanguageCode(args.from) : 'auto';
      const escapedText = shellEscapeSingle(args.text);
      const result = await sandboxManager.execInSandbox(
        `python3 -c "from translate import Translator; t = Translator(from_lang=${shellEscapeSingle(from)}, to_lang=${shellEscapeSingle(to)}); print(t.translate(${escapedText}))" 2>/dev/null || echo 'Translation not available - install translate'`,
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