import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'Скачать содержимое веб-страницы по URL. Возвращает HTML-код страницы.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL страницы для скачивания',
          },
        },
        required: ['url'],
      },
    },
  },
  permission: 'safe',
  category: 'web',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validateUrl, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    try {
      validateUrl(args.url);
      const escapedUrl = shellEscapeSingle(args.url);
      const result = await sandboxManager.execInSandbox(
        `curl -sL --max-time 30 ${escapedUrl} | head -c 50000`,
        '/workspace',
        35
      );
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);