import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'web_fetch_markdown',
      description: 'Скачать содержимое веб-страницы и конвертировать в Markdown. Удобно для чтения статей и документации.',
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
      const html = await res.text();
      
      // Простая очистка HTML от скриптов, стилей и тегов для извлечения текста
      let cleanText = html
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, '')
        .replace(/<footer[^>]*>([\s\S]*?)<\/footer>/gi, '')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .join('\n');
      
      const stdout = cleanText.slice(0, 20000);
      return JSON.stringify({ stdout, exitCode: 0 });
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);