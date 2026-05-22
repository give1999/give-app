import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'data_generate_password',
      description: 'Сгенерировать случайный пароль заданной длины и сложности.',
      parameters: {
        type: 'object',
        properties: {
          length: {
            type: 'number',
            description: 'Длина пароля (по умолчанию 16)',
            default: 16,
          },
          uppercase: {
            type: 'boolean',
            description: 'Включить заглавные буквы (по умолчанию true)',
            default: true,
          },
          numbers: {
            type: 'boolean',
            description: 'Включить цифры (по умолчанию true)',
            default: true,
          },
          symbols: {
            type: 'boolean',
            description: 'Включить спецсимволы (по умолчанию true)',
            default: true,
          },
        },
        required: [],
      },
    },
  },
  permission: 'safe',
  category: 'data',
  execute: async (args) => {
    const len = args.length || 16;
    let chars = 'abcdefghijklmnopqrstuvwxyz';
    if (args.uppercase !== false) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (args.numbers !== false) chars += '0123456789';
    if (args.symbols !== false) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    // Rejection sampling для устранения modulo bias
    const max = 256 - (256 % chars.length);
    let generated = 0;
    while (generated < len) {
      const arr = new Uint8Array(len - generated);
      try {
        // @ts-ignore - crypto is available in RN with polyfill
        crypto.getRandomValues(arr);
      } catch {
        // Fallback для сред без crypto
        for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      }
      for (let i = 0; i < arr.length && generated < len; i++) {
        if (arr[i] < max) {
          password += chars[arr[i] % chars.length];
          generated++;
        }
      }
    }
    return JSON.stringify({ password, length: len });
  },
};

registerTool(tool);