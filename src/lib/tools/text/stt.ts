import { registerTool } from '../registry';
import type { Tool } from '../registry';
import * as FileSystem from 'expo-file-system/legacy';
import { useChatStore } from '@/src/stores/chatStore';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'text_stt',
      description: 'Распознавание речи (Speech-to-Text). Преобразует аудио в текст. (Внимание: Локальный Whisper не предустановлен в этой версии песочницы).',
      parameters: {
        type: 'object',
        properties: {
          audioPath: {
            type: 'string',
            description: 'Путь к аудиофайлу в песочнице',
          },
          language: {
            type: 'string',
            description: 'Код языка (по умолчанию "ru")',
            default: 'ru',
          },
        },
        required: ['audioPath'],
      },
    },
  },
  permission: 'safe',
  category: 'text',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    try {
      await sandboxManager.initialize();
      const workspacePath = sandboxManager.getWorkspacePathSync();
      const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
      
      const audioPath = args.audioPath as string;
      const clean = audioPath.trim().replace(/^\/+/, '');
      const hostPath = `${workspacePath}/environments/${convId}/${clean}`;
      
      const fileInfo = await FileSystem.getInfoAsync(hostPath);
      
      if (!fileInfo.exists) {
        return JSON.stringify({
          error: `Файл не найден по пути: ${audioPath}`,
          exitCode: 1
        });
      }
      
      return JSON.stringify({
        error: `Локальный инструмент распознавания речи (Whisper) не установлен в данной минимальной песочнице BusyBox. Файл ${audioPath} успешно обнаружен (${fileInfo.size} байт), но не может быть обработан локально. Пожалуйста, используйте текстовый ввод или подключите внешние API-интеграции.`,
        exitCode: 127
      });
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);