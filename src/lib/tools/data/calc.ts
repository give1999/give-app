import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'calc_math',
      description: 'Вычислить математическое выражение. Поддерживает базовые операции, функции, константы.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Математическое выражение, например "2^10 + sqrt(144)"',
          },
        },
        required: ['expression'],
      },
    },
  },
  permission: 'safe',
  category: 'data',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    try {
      // Ограничить длину выражения для безопасности
      if (args.expression.length > 500) {
        return JSON.stringify({ error: 'Expression too long (max 500 chars)', exitCode: 1 });
      }
      const escapedExpr = shellEscapeSingle(args.expression);
      const result = await sandboxManager.execInSandbox(
        `python3 -c "import math; print(eval(${escapedExpr}, {'__builtins__': {}}, {**math.__dict__, 'sqrt': math.sqrt, 'pow': math.pow, 'log': math.log, 'log2': math.log2, 'log10': math.log10, 'sin': math.sin, 'cos': math.cos, 'tan': math.tan, 'pi': math.pi, 'e': math.e}))"`,
        '/workspace',
        10
      );
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);