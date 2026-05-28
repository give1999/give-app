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
    try {
      const expr = args.expression as string;
      if (expr.length > 500) {
        return JSON.stringify({ error: 'Expression too long (max 500 chars)', exitCode: 1 });
      }
      
      let sanitized = expr.toLowerCase().replace(/\^/g, '**');
      
      const functions = ['sqrt', 'sin', 'cos', 'tan', 'log', 'pow', 'abs', 'exp'];
      for (const fn of functions) {
        const regex = new RegExp(`\\b${fn}\\(`, 'g');
        sanitized = sanitized.replace(regex, `Math.${fn}(`);
      }
      
      sanitized = sanitized.replace(/\bpi\b/g, 'Math.PI');
      sanitized = sanitized.replace(/\be\b/g, 'Math.E');
      
      const letters = sanitized.replace(/[0-9+\-*/%().\s,]|Math\.[a-z]+/gi, '');
      if (letters.length > 0) {
        return JSON.stringify({ error: 'Unsupported character or operation in expression', exitCode: 1 });
      }
      
      const val = new Function(`return (${sanitized})`)();
      return JSON.stringify({ stdout: String(val), exitCode: 0 });
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);