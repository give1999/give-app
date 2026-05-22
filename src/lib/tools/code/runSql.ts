import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'code_run_sql',
      description: 'Выполнить SQL-запрос в песочнице. Использует sqlite3. База данных создаётся автоматически в /workspace.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL-запрос для выполнения',
          },
          database: {
            type: 'string',
            description: 'Путь к файлу БД (по умолчанию /workspace/data.db)',
            default: '/workspace/data.db',
          },
        },
        required: ['query'],
      },
    },
  },
  permission: 'safe',
  category: 'code',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validateSandboxPath, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    try {
      const db = validateSandboxPath(args.database || '/workspace/data.db');
      // Записать SQL в файл, затем выполнить — безопаснее чем inline
      const sqlRandom = (() => {
        try { const b = new Uint8Array(4); crypto.getRandomValues(b); return Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); }
        catch { return Date.now().toString(36); }
      })();
      const sqlPath = `/workspace/_run_${Date.now()}_${sqlRandom}.sql`;
      const delimiter = `STAR_HEREDOC_${Date.now()}_${sqlRandom}_SQL`;
      if (args.query.includes(delimiter)) {
        return JSON.stringify({ error: 'Query contains reserved delimiter string', exitCode: 1 });
      }
      const writeCmd = `cat << '${delimiter}' > ${shellEscapeSingle(sqlPath)}\n${args.query}\n${delimiter}`;
      await sandboxManager.execInSandbox(writeCmd, '/workspace', 5);
      const result = await sandboxManager.execInSandbox(
        `sqlite3 -header -column ${shellEscapeSingle(db)} < ${shellEscapeSingle(sqlPath)} && rm -f ${shellEscapeSingle(sqlPath)}`,
        '/workspace',
        30
      );
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);