import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'daemon_status',
      description: 'Получить статус фоновой задачи по taskId.',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'string',
            description: 'ID задачи, полученный из daemon_submit',
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
    const task = daemonManager.getTask(args.taskId);
    if (!task) {
      return JSON.stringify({ error: 'Task not found', taskId: args.taskId });
    }
    return JSON.stringify({ taskId: task.id, status: task.status, result: task.result, error: task.error });
  },
};

registerTool(tool);