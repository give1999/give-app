import * as FileSystem from 'expo-file-system/legacy';
import { registerTool } from './registry';
import type { Tool } from './registry';
import { useChatStore } from '@/src/stores/chatStore';

const getHostPath = (sandboxPath: string, conversationId: string, workspacePath: string): string => {
  let clean = sandboxPath.trim();
  if (clean.includes('/environments/')) {
    const idx = clean.indexOf('/environments/');
    const rest = clean.substring(idx + '/environments/'.length);
    const parts = rest.split('/');
    parts.shift();
    clean = '/' + parts.join('/');
  }
  clean = clean.replace(/^\/+/, '');
  
  const baseDir = (FileSystem.documentDirectory || '').replace(/\/$/, '') + '/sandbox';
  
  if (clean.startsWith('workspace/')) {
    return `${baseDir}/environments/${conversationId}/${clean}`;
  }
  if (clean === 'workspace') {
    return `${baseDir}/environments/${conversationId}/workspace`;
  }
  if (clean.startsWith('home/')) {
    return `${baseDir}/environments/${conversationId}/${clean}`;
  }
  if (clean === 'home') {
    return `${baseDir}/environments/${conversationId}/home`;
  }
  if (clean.startsWith('inbox/') || clean.startsWith('outbox/') || clean.startsWith('tmp/') || clean.startsWith('var/')) {
    return `${baseDir}/environments/${conversationId}/${clean}`;
  }
  if (clean === 'inbox' || clean === 'outbox' || clean === 'tmp' || clean === 'var') {
    return `${baseDir}/environments/${conversationId}/${clean}`;
  }
  
  return `${baseDir}/environments/${conversationId}/workspace/${clean}`;
};

// 1. file_create
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'file_create',
      description: 'Создать новый файл с текстовым содержимым.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь к файлу, например /workspace/file.txt' },
          content: { type: 'string', description: 'Текстовое содержимое файла' }
        },
        required: ['path', 'content']
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    
    // Обеспечить создание родительской директории
    const parentDir = hostPath.substring(0, hostPath.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
    
    await FileSystem.writeAsStringAsync(hostPath, args.content as string, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.stringify({ stdout: `Файл успешно создан: ${args.path}`, exitCode: 0 });
  }
});

// 2. file_read
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'file_read',
      description: 'Прочитать содержимое файла.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь к файлу в песочнице' }
        },
        required: ['path']
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    
    const info = await FileSystem.getInfoAsync(hostPath);
    if (!info.exists || info.isDirectory) {
      return JSON.stringify({ error: `Файл не найден: ${args.path}`, exitCode: 1 });
    }
    
    const stdout = await FileSystem.readAsStringAsync(hostPath, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.stringify({ stdout, exitCode: 0 });
  }
});

// 3. file_write
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'file_write',
      description: 'Записать или дописать (append) содержимое в файл.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь к файлу' },
          content: { type: 'string', description: 'Данные для записи' },
          append: { type: 'boolean', description: 'Дописать в конец файла, если true (по умолчанию false)' }
        },
        required: ['path', 'content']
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    
    const parentDir = hostPath.substring(0, hostPath.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
    
    let finalContent = args.content as string;
    if (args.append) {
      const info = await FileSystem.getInfoAsync(hostPath);
      if (info.exists && !info.isDirectory) {
        const existing = await FileSystem.readAsStringAsync(hostPath, { encoding: FileSystem.EncodingType.UTF8 });
        finalContent = existing + finalContent;
      }
    }
    
    await FileSystem.writeAsStringAsync(hostPath, finalContent, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.stringify({ stdout: `Данные успешно записаны в: ${args.path}`, exitCode: 0 });
  }
});

// 4. file_delete
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'file_delete',
      description: 'Удалить файл или директорию.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь для удаления' }
        },
        required: ['path']
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    
    await FileSystem.deleteAsync(hostPath, { idempotent: true });
    return JSON.stringify({ stdout: `Успешно удалено: ${args.path}`, exitCode: 0 });
  }
});

// 5. file_move
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'file_move',
      description: 'Переместить или переименовать файл или директорию.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Исходный путь' },
          destination: { type: 'string', description: 'Целевой путь' }
        },
        required: ['source', 'destination']
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const srcHost = getHostPath(args.source as string, convId, workspacePath);
    const destHost = getHostPath(args.destination as string, convId, workspacePath);
    
    const parentDir = destHost.substring(0, destHost.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
    
    await FileSystem.moveAsync({ from: srcHost, to: destHost });
    return JSON.stringify({ stdout: `Перемещено из ${args.source} в ${args.destination}`, exitCode: 0 });
  }
});

// 6. file_copy
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'file_copy',
      description: 'Скопировать файл.',
      parameters: {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Путь к исходному файлу' },
          destination: { type: 'string', description: 'Путь назначения' }
        },
        required: ['source', 'destination']
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const srcHost = getHostPath(args.source as string, convId, workspacePath);
    const destHost = getHostPath(args.destination as string, convId, workspacePath);
    
    const parentDir = destHost.substring(0, destHost.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
    
    await FileSystem.copyAsync({ from: srcHost, to: destHost });
    return JSON.stringify({ stdout: `Скопировано из ${args.source} в ${args.destination}`, exitCode: 0 });
  }
});

// 7. file_info
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'file_info',
      description: 'Получить информацию о файле (размер, дата изменения, тип).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь к файлу' }
        },
        required: ['path']
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    
    const info = await FileSystem.getInfoAsync(hostPath, { size: true });
    if (!info.exists) {
      return JSON.stringify({ error: `Файл не найден: ${args.path}`, exitCode: 1 });
    }
    
    return JSON.stringify({
      stdout: JSON.stringify({
        exists: info.exists,
        isDirectory: info.isDirectory,
        size: info.isDirectory ? 0 : (info as any).size,
        modificationTime: (info as any).modificationTime || Date.now(),
        uri: info.uri
      }, null, 2),
      exitCode: 0
    });
  }
});

// 8. dir_list
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'dir_list',
      description: 'Показать список файлов и папок в директории.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь к папке (по умолчанию /workspace)', default: '/workspace' }
        }
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath((args.path as string) || '/workspace', convId, workspacePath);
    
    const info = await FileSystem.getInfoAsync(hostPath);
    if (!info.exists || !info.isDirectory) {
      return JSON.stringify({ error: `Директория не найдена: ${args.path || '/workspace'}`, exitCode: 1 });
    }
    
    const files = await FileSystem.readDirectoryAsync(hostPath);
    const stdout = files.length > 0 ? files.join('\n') : 'Директория пуста';
    return JSON.stringify({ stdout, exitCode: 0 });
  }
});

// 9. dir_create
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'dir_create',
      description: 'Создать новую папку.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь к создаваемой папке' }
        },
        required: ['path']
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    
    await FileSystem.makeDirectoryAsync(hostPath, { intermediates: true });
    return JSON.stringify({ stdout: `Директория создана: ${args.path}`, exitCode: 0 });
  }
});

// 10. file_search
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'file_search',
      description: 'Поиск файлов по имени/маске в песочнице.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Имя или маска файла, например "data.json" или "*.py"' },
          path: { type: 'string', description: 'Стартовая папка поиска (по умолчанию /workspace)', default: '/workspace' }
        },
        required: ['pattern']
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    
    const startPath = (args.path as string) || '/workspace';
    const pattern = args.pattern as string;
    
    // Здесь проще и надежнее запустить find через терминал песочницы, так как find уже есть в busybox
    const cmd = `find ${shellEscapeSingle(startPath)} -name ${shellEscapeSingle(pattern)}`;
    const result = await sandboxManager.execInSandbox(cmd, '/workspace', 15);
    return JSON.stringify(result);
  }
});

// 11. file_download
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'file_download',
      description: 'Скачать файл по URL-адресу из интернета в песочницу.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL файла для скачивания' },
          path: { type: 'string', description: 'Путь для сохранения файла, например /workspace/downloaded.zip' }
        },
        required: ['url', 'path']
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    
    const parentDir = hostPath.substring(0, hostPath.lastIndexOf('/'));
    await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
    
    await FileSystem.downloadAsync(args.url as string, hostPath);
    return JSON.stringify({ stdout: `Файл успешно скачан в: ${args.path}`, exitCode: 0 });
  }
});

// 12. archive_create
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'archive_create',
      description: 'Создать ZIP-архив.',
      parameters: {
        type: 'object',
        properties: {
          archivePath: { type: 'string', description: 'Путь к создаваемому ZIP-файлу, например /workspace/archive.zip' },
          paths: { type: 'array', items: { type: 'string' }, description: 'Массив путей к файлам/папкам для архивации' }
        },
        required: ['archivePath', 'paths']
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    
    const archivePath = args.archivePath as string;
    const paths = args.paths as string[];
    
    const escapedPaths = paths.map(p => shellEscapeSingle(p)).join(' ');
    // Используем zip из busybox
    const cmd = `zip -r ${shellEscapeSingle(archivePath)} ${escapedPaths}`;
    const result = await sandboxManager.execInSandbox(cmd, '/workspace', 60);
    return JSON.stringify(result);
  }
});

// 13. archive_extract
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'archive_extract',
      description: 'Распаковать ZIP-архив.',
      parameters: {
        type: 'object',
        properties: {
          archivePath: { type: 'string', description: 'Путь к ZIP-архиву' },
          destination: { type: 'string', description: 'Путь к папке назначения (по умолчанию /workspace)', default: '/workspace' }
        },
        required: ['archivePath']
      }
    }
  },
  permission: 'safe',
  category: 'filesystem',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    
    const archivePath = args.archivePath as string;
    const dest = (args.destination as string) || '/workspace';
    
    // Создаем директорию назначения на всякий случай
    await sandboxManager.execInSandbox(`mkdir -p ${shellEscapeSingle(dest)}`, '/workspace', 5);
    
    // Используем unzip из busybox
    const cmd = `unzip -o ${shellEscapeSingle(archivePath)} -d ${shellEscapeSingle(dest)}`;
    const result = await sandboxManager.execInSandbox(cmd, '/workspace', 60);
    return JSON.stringify(result);
  }
});
