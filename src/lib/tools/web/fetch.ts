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
    try {
      const url = args.url as string;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      const text = await res.text();
      const stdout = text.slice(0, 50000);
      return JSON.stringify({ stdout, exitCode: 0 });
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);