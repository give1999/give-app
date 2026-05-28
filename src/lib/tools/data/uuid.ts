import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'data_uuid',
      description: 'Сгенерировать UUID (Universally Unique Identifier).',
      parameters: {
        type: 'object',
        properties: {
          version: {
            type: 'string',
            enum: ['v4', 'v7'],
            description: 'Версия UUID (по умолчанию v4)',
            default: 'v4',
          },
          count: {
            type: 'number',
            description: 'Количество UUID для генерации (по умолчанию 1)',
            default: 1,
          },
        },
        required: [],
      },
    },
  },
  permission: 'safe',
  category: 'data',
  execute: async (args) => {
    const count = Math.max(1, Math.min(100, args.count || 1));
    const uuids: string[] = [];
    for (let i = 0; i < count; i++) {
      if (args.version === 'v7') {
        const timestamp = Date.now();
        const bytes = new Uint8Array(16);
        try {
          // @ts-ignore
          crypto.getRandomValues(bytes);
        } catch {
          for (let j = 0; j < 16; j++) bytes[j] = Math.floor(Math.random() * 256);
        }
        bytes[0] = (timestamp / 0x10000000000) & 0xff;
        bytes[1] = (timestamp / 0x100000000) & 0xff;
        bytes[2] = (timestamp / 0x1000000) & 0xff;
        bytes[3] = (timestamp / 0x10000) & 0xff;
        bytes[4] = (timestamp / 0x100) & 0xff;
        bytes[5] = timestamp & 0xff;
        bytes[6] = (bytes[6] & 0x0f) | 0x70;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        uuids.push(`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`);
      } else {
        // Криптографически стойкий UUID v4
        const bytes = new Uint8Array(16);
        try {
          // @ts-ignore
          crypto.getRandomValues(bytes);
        } catch {
          for (let j = 0; j < 16; j++) bytes[j] = Math.floor(Math.random() * 256);
        }
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        uuids.push(`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`);
      }
    }
    return JSON.stringify({ uuids, count });
  },
};

registerTool(tool);