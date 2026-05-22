import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'code_run_js',
      description: 'Выполнить JavaScript-код в песочнице. Код запускается через nodejs. Результат — stdout программы.',
      parameters: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'JavaScript-код для выполнения',
          },
          timeout: {
            type: 'number',
            description: 'Таймаут в секундах (по умолчанию 30)',
            default: 30,
          },
        },
        required: ['code'],
      },
    },
  },
  permission: 'safe',
  category: 'code',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { shellEscapeSingle, validateTimeout } = require('@/src/lib/sandbox/shellSanitize');
    try {
      const timeout = validateTimeout(args.timeout || 30);
      // Записать код в файл, затем выполнить — безопаснее чем node -e '...'
      const scriptRandom = (() => {
        try { const b = new Uint8Array(4); crypto.getRandomValues(b); return Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); }
        catch { return Date.now().toString(36); }
      })();
      const scriptPath = `/workspace/_run_${Date.now()}_${scriptRandom}.js`;
      const delimiter = `STAR_HEREDOC_${Date.now()}_${scriptRandom}_JS`;
      if (args.code.includes(delimiter)) {
        return JSON.stringify({ error: 'Code contains reserved delimiter string', exitCode: 1 });
      }
      const writeCmd = `cat << '${delimiter}' > ${shellEscapeSingle(scriptPath)}\n${args.code}\n${delimiter}`;
      await sandboxManager.execInSandbox(writeCmd, '/workspace', 5);
      const result = await sandboxManager.execInSandbox(
        `node ${shellEscapeSingle(scriptPath)} && rm -f ${shellEscapeSingle(scriptPath)}`,
        '/workspace',
        timeout
      );
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);