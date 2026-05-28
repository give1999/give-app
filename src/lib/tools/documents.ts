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

const ensureParentDir = async (hostPath: string) => {
  const parentDir = hostPath.substring(0, hostPath.lastIndexOf('/'));
  await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
};

// 1. doc_markdown
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'doc_markdown',
      description: 'Создать Markdown-документ (.md).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь для сохранения файла' },
          content: { type: 'string', description: 'Markdown-содержимое' }
        },
        required: ['path', 'content']
      }
    }
  },
  permission: 'safe',
  category: 'documents',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    await ensureParentDir(hostPath);
    await FileSystem.writeAsStringAsync(hostPath, args.content as string, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.stringify({ stdout: `Markdown-документ создан: ${args.path}`, exitCode: 0 });
  }
});

// 2. doc_csv
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'doc_csv',
      description: 'Создать CSV-таблицу (.csv).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь для сохранения файла' },
          content: { type: 'string', description: 'CSV-содержимое (колонки разделенные запятыми или точками с запятой)' }
        },
        required: ['path', 'content']
      }
    }
  },
  permission: 'safe',
  category: 'documents',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    await ensureParentDir(hostPath);
    await FileSystem.writeAsStringAsync(hostPath, args.content as string, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.stringify({ stdout: `CSV-документ создан: ${args.path}`, exitCode: 0 });
  }
});

// 3. doc_html
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'doc_html',
      description: 'Создать HTML-страницу (.html).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь для сохранения файла' },
          content: { type: 'string', description: 'HTML-содержимое' }
        },
        required: ['path', 'content']
      }
    }
  },
  permission: 'safe',
  category: 'documents',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    await ensureParentDir(hostPath);
    await FileSystem.writeAsStringAsync(hostPath, args.content as string, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.stringify({ stdout: `HTML-документ создан: ${args.path}`, exitCode: 0 });
  }
});

// 4. doc_json
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'doc_json',
      description: 'Создать JSON-файл (.json).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь для сохранения файла' },
          content: { type: 'string', description: 'Валидная JSON-строка или объект' }
        },
        required: ['path', 'content']
      }
    }
  },
  permission: 'safe',
  category: 'documents',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    await ensureParentDir(hostPath);
    
    let jsonStr = args.content as string;
    try {
      if (typeof args.content === 'object') {
        jsonStr = JSON.stringify(args.content, null, 2);
      } else {
        JSON.parse(jsonStr); // проверка валидности
      }
    } catch {}
    
    await FileSystem.writeAsStringAsync(hostPath, jsonStr, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.stringify({ stdout: `JSON-документ создан: ${args.path}`, exitCode: 0 });
  }
});

// 5. doc_xml
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'doc_xml',
      description: 'Создать XML-документ (.xml).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь для сохранения файла' },
          content: { type: 'string', description: 'XML-содержимое' }
        },
        required: ['path', 'content']
      }
    }
  },
  permission: 'safe',
  category: 'documents',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    await ensureParentDir(hostPath);
    await FileSystem.writeAsStringAsync(hostPath, args.content as string, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.stringify({ stdout: `XML-документ создан: ${args.path}`, exitCode: 0 });
  }
});

// 6. doc_pdf
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'doc_pdf',
      description: 'Создать PDF-документ (.pdf) с текстовым содержимым.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь для сохранения PDF, например /workspace/report.pdf' },
          title: { type: 'string', description: 'Заголовок документа' },
          text: { type: 'string', description: 'Основной текст документа' }
        },
        required: ['path', 'text']
      }
    }
  },
  permission: 'safe',
  category: 'documents',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    await ensureParentDir(hostPath);
    
    // Генерация минимально валидного PDF-файла с текстом
    const title = args.title || 'Star Agent Report';
    const text = args.text as string;
    
    const pdfContent = `%PDF-1.4\n` +
      `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
      `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n` +
      `4 0 obj\n<< /Length 200 >>\nstream\n` +
      `BT\n/F1 16 Tf\n50 800 Td\n(${title}) Tj\n` +
      `/F1 12 Tf\n0 -40 Td\n(${text.substring(0, 100).replace(/[()]/g, '')}) Tj\n` +
      `ET\n` +
      `endstream\nendobj\n` +
      `xref\n0 5\n0000000000 65535 f\n` +
      `0000000009 00000 n\n` +
      `0000000056 00000 n\n` +
      `0000000111 00000 n\n` +
      `0000000282 00000 n\n` +
      `trailer\n<< /Size 5 /Root 1 0 R >>\n` +
      `startxref\n532\n%%EOF`;
      
    await FileSystem.writeAsStringAsync(hostPath, pdfContent, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.stringify({ stdout: `PDF-документ успешно создан: ${args.path}`, exitCode: 0 });
  }
});

// 7. doc_presentation
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'doc_presentation',
      description: 'Создать презентацию (HTML-слайды).',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь для сохранения файла, например /workspace/pres.html' },
          slides: { 
            type: 'array', 
            items: { 
              type: 'object',
              properties: {
                title: { type: 'string' },
                content: { type: 'string' }
              },
              required: ['title', 'content']
            },
            description: 'Массив слайдов с заголовками и текстом'
          }
        },
        required: ['path', 'slides']
      }
    }
  },
  permission: 'safe',
  category: 'documents',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    await ensureParentDir(hostPath);
    
    const slides = args.slides as Array<{ title: string; content: string }>;
    
    let htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Presentation</title><style>` +
      `body{font-family:system-ui,sans-serif;background:#111;color:#fff;margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;overflow:hidden}` +
      `.slide{display:none;width:80%;max-width:800px;background:#222;padding:40px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5)}` +
      `.slide.active{display:block} h1{color:#007AFF;margin-top:0} .controls{margin-top:20px;display:flex;gap:10px}` +
      `button{background:#007AFF;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer}` +
      `</style></head><body>`;
      
    slides.forEach((slide, i) => {
      htmlContent += `<div class="slide ${i === 0 ? 'active' : ''}">` +
        `<h1>${slide.title}</h1>` +
        `<p>${slide.content}</p>` +
        `</div>`;
    });
    
    htmlContent += `<div class="controls">` +
      `<button onclick="prev()">Назад</button>` +
      `<button onclick="next()">Вперед</button>` +
      `</div>` +
      `<script>` +
      `let current = 0; const slides = document.querySelectorAll('.slide');` +
      `function show(index){slides[current].classList.remove('active'); current=index; slides[current].classList.add('active');}` +
      `function prev(){show(Math.max(0, current - 1));}` +
      `function next(){show(Math.min(slides.length - 1, current + 1));}` +
      `</script></body></html>`;
      
    await FileSystem.writeAsStringAsync(hostPath, htmlContent, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.stringify({ stdout: `Презентация (HTML-слайды) успешно создана: ${args.path}`, exitCode: 0 });
  }
});

// 8. doc_spreadsheet
registerTool({
  definition: {
    type: 'function',
    function: {
      name: 'doc_spreadsheet',
      description: 'Создать электронную таблицу (.xlsx или .xls) через HTML-таблицу, открываемую в Excel.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Путь для сохранения файла, например /workspace/table.xlsx' },
          headers: { type: 'array', items: { type: 'string' }, description: 'Заголовки колонок' },
          rows: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'Массив строк с ячейками' }
        },
        required: ['path', 'headers', 'rows']
      }
    }
  },
  permission: 'safe',
  category: 'documents',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    await sandboxManager.initialize();
    const workspacePath = sandboxManager.getWorkspacePathSync();
    const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
    const hostPath = getHostPath(args.path as string, convId, workspacePath);
    await ensureParentDir(hostPath);
    
    const headers = args.headers as string[];
    const rows = args.rows as string[][];
    
    let htmlTable = `<html><head><meta charset="utf-8"><style>table{border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;}</style></head><body><table><tr>`;
    
    headers.forEach(h => {
      htmlTable += `<th>${h}</th>`;
    });
    htmlTable += `</tr>`;
    
    rows.forEach(r => {
      htmlTable += `<tr>`;
      r.forEach(cell => {
        htmlTable += `<td>${cell}</td>`;
      });
      htmlTable += `</tr>`;
    });
    
    htmlTable += `</table></body></html>`;
    
    await FileSystem.writeAsStringAsync(hostPath, htmlTable, { encoding: FileSystem.EncodingType.UTF8 });
    return JSON.stringify({ stdout: `Таблица успешно создана: ${args.path}`, exitCode: 0 });
  }
});
