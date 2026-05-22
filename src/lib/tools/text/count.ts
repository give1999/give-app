import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'text_count',
      description: 'Подсчитать символы, слова, строки и абзацы в тексте.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Текст для анализа',
          },
        },
        required: ['text'],
      },
    },
  },
  permission: 'safe',
  category: 'text',
  execute: async (args) => {
    const text = args.text;
    const chars = text.length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const lines = text.split('\n').length;
    const paragraphs = text.split(/\n\s*\n/).filter(Boolean).length;
    return JSON.stringify({ chars, words, lines, paragraphs });
  },
};

registerTool(tool);