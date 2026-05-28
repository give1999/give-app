import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'code_run_js',
      description: 'Выполнить JavaScript-код. Результат — stdout программы (перехваченные логи console.log) и возвращаемое значение.',
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
    try {
      const code = args.code as string;
      const logs: string[] = [];
      
      const originalLog = console.log;
      console.log = (...logArgs) => {
        logs.push(logArgs.map(x => {
          if (x === null) return 'null';
          if (x === undefined) return 'undefined';
          return typeof x === 'object' ? JSON.stringify(x) : String(x);
        }).join(' '));
      };
      
      try {
        const val = new Function(code)();
        console.log = originalLog;
        
        let stdout = logs.join('\n');
        if (val !== undefined) {
          stdout += (stdout ? '\n' : '') + `Return value: ${typeof val === 'object' ? JSON.stringify(val) : String(val)}`;
        }
        return JSON.stringify({ stdout, exitCode: 0 });
      } catch (innerErr: any) {
        console.log = originalLog;
        return JSON.stringify({ error: innerErr.message, exitCode: 1 });
      }
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);