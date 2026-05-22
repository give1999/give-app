import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'data_hash',
      description: 'Вычислить хеш строки. Поддерживает md5, sha1, sha256, sha512.',
      parameters: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Строка для хеширования',
          },
          algorithm: {
            type: 'string',
            enum: ['md5', 'sha1', 'sha256', 'sha512'],
            description: 'Алгоритм хеширования (по умолчанию sha256)',
            default: 'sha256',
          },
        },
        required: ['input'],
      },
    },
  },
  permission: 'safe',
  category: 'data',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validateHashAlgorithm, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    const algo = validateHashAlgorithm(args.algorithm || 'sha256');
    const escapedInput = shellEscapeSingle(args.input);
    const result = await sandboxManager.execInSandbox(
      `echo -n ${escapedInput} | ${algo}sum | cut -d' ' -f1`,
      '/workspace',
      5
    );
    return JSON.stringify(result);
  },
};

registerTool(tool);