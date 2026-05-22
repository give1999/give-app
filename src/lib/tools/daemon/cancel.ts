import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'daemon_cancel',
      description: 'Отменить фоновую задачу по taskId.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'ID задачи для отмены',
          },
        },
        required: ['taskId'],
      },
    },
  },
  permission: 'safe',
  category: 'daemon',
  execute: async (args) => {
    const { daemonManager } = require('@/src/lib/sandbox/DaemonManager');
    const cancelled = daemonManager.cancelTask(args.taskId);
    return JSON.stringify({ taskId: args.taskId, cancelled });
  },
};

registerTool(tool);