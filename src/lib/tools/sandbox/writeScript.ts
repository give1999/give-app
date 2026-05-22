import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'sandbox_write_script',
      description: 'Создать исполняемый скрипт в песочнице. Файл автоматически получает права на исполнение (chmod +x).',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Путь к файлу, например /workspace/run.sh',
          },
          content: {
            type: 'string',
            description: 'Содержимое скрипта',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  permission: 'safe',
  category: 'sandbox',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validateSandboxPath, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    try {
      validateSandboxPath(args.path);
      const escapedPath = shellEscapeSingle(args.path);
      // Криптографически стойкий delimiter + проверка на collision
      const randomBytes = (() => {
        try {
          const bytes = new Uint8Array(8);
          crypto.getRandomValues(bytes);
          return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        } catch { return Date.now().toString(36); }
      })();
      const delimiter = `STAR_EOF_${Date.now()}_${randomBytes}`;
      if (args.content.includes(delimiter)) {
        return JSON.stringify({ error: 'Content contains reserved delimiter string', exitCode: 1 });
      }
      const cmd = `cat > ${escapedPath} << '${delimiter}'\n${args.content}\n${delimiter}\nchmod +x ${escapedPath} && echo 'Script created'`;
      const result = await sandboxManager.execInSandbox(cmd, '/workspace', 10);
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message });
    }
  },
};

registerTool(tool);