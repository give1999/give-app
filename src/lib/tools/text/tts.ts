import { registerTool } from '../registry';
import type { Tool } from '../registry';
import * as FileSystem from 'expo-file-system/legacy';
import { useChatStore } from '@/src/stores/chatStore';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'text_tts',
      description: 'Синтез речи (Text-to-Speech). Преобразует текст в аудиофайл .mp3.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Текст для озвучивания',
          },
          language: {
            type: 'string',
            description: 'Код языка (например, "ru" или "en", по умолчанию "ru")',
            default: 'ru',
          },
        },
        required: ['text'],
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
      
      const text = args.text as string;
      const lang = (args.language as string || 'ru').trim();
      
      const q = encodeURIComponent(text);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${q}`;
      
      const sandboxPath = `/workspace/tts_${Date.now()}.mp3`;
      
      let clean = sandboxPath.trim().replace(/^\/+/, '');
      const baseDir = (FileSystem.documentDirectory || '').replace(/\/$/, '') + '/sandbox';
      const hostPath = `${baseDir}/environments/${convId}/${clean}`;
      
      const parentDir = hostPath.substring(0, hostPath.lastIndexOf('/'));
      await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
      
      await FileSystem.downloadAsync(url, hostPath);
      
      return JSON.stringify({ stdout: `TTS completed. Audio saved to: ${sandboxPath}`, exitCode: 0 });
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);