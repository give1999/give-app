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
    try {
      const text = args.text as string;
      const to = (args.to as string || 'en').trim();
      const from = (args.from as string || 'auto').trim();
      
      const q = encodeURIComponent(text);
      const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${from}|${to}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      
      const data = await res.json();
      const stdout = data.responseData?.translatedText || 'Translation failed';
      
      return JSON.stringify({ stdout, exitCode: 0 });
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);