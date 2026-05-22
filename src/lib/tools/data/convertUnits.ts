import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'calc_convert_units',
      description: 'Конвертировать единицы измерения (длина, вес, температура, объём и т.д.).',
      parameters: {
        type: 'object',
        properties: {
          value: {
            type: 'number',
            description: 'Значение для конвертации',
          },
          from: {
            type: 'string',
            description: 'Исходная единица, например "km"',
          },
          to: {
            type: 'string',
            description: 'Целевая единица, например "mi"',
          },
        },
        required: ['value', 'from', 'to'],
      },
    },
  },
  permission: 'safe',
  category: 'data',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validatePackageName, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    try {
      // Валидация единиц измерения (аналогично имени пакета)
      validatePackageName(args.from);
      validatePackageName(args.to);
      const numValue = Number(args.value);
      if (isNaN(numValue)) {
        return JSON.stringify({ error: 'Invalid numeric value', exitCode: 1 });
      }
      const result = await sandboxManager.execInSandbox(
        `python3 -c "from pint import UnitRegistry; ureg = UnitRegistry(); q = ${numValue} * ureg(${shellEscapeSingle(args.from)}); print(q.to(${shellEscapeSingle(args.to)}))" 2>/dev/null || echo 'Unit conversion not available'`,
        '/workspace',
        15
      );
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);