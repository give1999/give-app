import { registerTool } from '../registry';
import type { Tool } from '../registry';

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
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    const escapedInput = shellEscapeSingle(args.input);
    let cmd: string;
    switch (args.format) {
      case 'base64_encode':
        cmd = `echo -n ${escapedInput} | base64`;
        break;
      case 'base64_decode':
        cmd = `echo ${escapedInput} | base64 -d`;
        break;
      case 'url_encode':
        cmd = `python3 -c "import urllib.parse; print(urllib.parse.quote(${escapedInput}))"`;
        break;
      case 'url_decode':
        cmd = `python3 -c "import urllib.parse; print(urllib.parse.unquote(${escapedInput}))"`;
        break;
      case 'html_encode':
        cmd = `python3 -c "import html; print(html.escape(${escapedInput}))"`;
        break;
      case 'html_decode':
        cmd = `python3 -c "import html; print(html.unescape(${escapedInput}))"`;
        break;
      default:
        return JSON.stringify({ error: `Unknown format: ${args.format}` });
    }
    const result = await sandboxManager.execInSandbox(cmd, '/workspace', 5);
    return JSON.stringify(result);
  },
};

registerTool(tool);