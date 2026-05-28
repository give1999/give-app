import { registerTool } from '../registry';
import type { Tool } from '../registry';
import { Buffer } from 'buffer';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'data_encode',
      description: 'Кодировать/декодировать данные. Поддерживает base64, url, html.',
      parameters: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Строка для кодирования/декодирования',
          },
          format: {
            type: 'string',
            enum: ['base64_encode', 'base64_decode', 'url_encode', 'url_decode', 'html_encode', 'html_decode'],
            description: 'Формат кодирования',
          },
        },
        required: ['input', 'format'],
      },
    },
  },
  permission: 'safe',
  category: 'data',
  execute: async (args) => {
    try {
      const input = args.input as string;
      let stdout = '';
      
      switch (args.format) {
        case 'base64_encode':
          stdout = Buffer.from(input, 'utf-8').toString('base64');
          break;
        case 'base64_decode':
          stdout = Buffer.from(input, 'base64').toString('utf-8');
          break;
        case 'url_encode':
          stdout = encodeURIComponent(input);
          break;
        case 'url_decode':
          stdout = decodeURIComponent(input);
          break;
        case 'html_encode':
          stdout = input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
          break;
        case 'html_decode':
          stdout = input
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#39;/g, "'");
          break;
        default:
          return JSON.stringify({ error: `Unknown format: ${args.format}`, exitCode: 1 });
      }
      return JSON.stringify({ stdout, exitCode: 0 });
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);