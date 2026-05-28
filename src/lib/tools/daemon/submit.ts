import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'daemon_submit',
      description: 'Отправить фоновую задачу в daemon. Задача выполняется в фоновой среде, не блокируя чат. Возвращает taskId для отслеживания.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell-команда для фонового выполнения',
          },
          description: {
            type: 'string',
            description: 'Описание задачи для отображения в UI',
          },
        },
        required: ['command'],
      },
    },
  },
  permission: 'safe',
  category: 'daemon',
  execute: async (args) => {
    const { daemonManager } = require('@/src/lib/sandbox/DaemonManager');
    const taskId = await daemonManager.submitTask(
      'default',
      args.command
    );
    const task = daemonManager.getTask(taskId);
    if (!task) throw new Error('Не удалось создать задачу');
    return JSON.stringify({ taskId: task.id, status: task.status });
  },
};

registerTool(tool);