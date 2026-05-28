import { registerTool } from '../registry';
import type { Tool } from '../registry';

const CONVERSION_MAP: Record<string, Record<string, number>> = {
  length: {
    m: 1,
    km: 1000,
    cm: 0.01,
    mm: 0.001,
    mi: 1609.344,
    yd: 0.9144,
    ft: 0.3048,
    in: 0.0254
  },
  weight: {
    g: 1,
    kg: 1000,
    mg: 0.001,
    lb: 453.59237,
    oz: 28.349523,
    ton: 1000000
  },
  volume: {
    l: 1,
    ml: 0.001,
    gal: 3.78541178,
    qt: 0.946352946,
    pt: 0.473176473,
    cup: 0.24,
    m3: 1000
  }
};

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
            description: 'Исходная единица, например "km" или "C"',
          },
          to: {
            type: 'string',
            description: 'Целевая единица, например "mi" или "F"',
          },
        },
        required: ['value', 'from', 'to'],
      },
    },
  },
  permission: 'safe',
  category: 'data',
  execute: async (args) => {
    try {
      const numValue = Number(args.value);
      if (isNaN(numValue)) {
        return JSON.stringify({ error: 'Invalid numeric value', exitCode: 1 });
      }

      const f = (args.from as string).toLowerCase().trim();
      const t = (args.to as string).toLowerCase().trim();

      // Температурный конвертер (особый случай)
      if ((f === 'c' || f === 'f' || f === 'k') && (t === 'c' || t === 'f' || t === 'k')) {
        let celsius = numValue;
        if (f === 'f') celsius = ((numValue - 32) * 5) / 9;
        if (f === 'k') celsius = numValue - 273.15;

        let resultVal = celsius;
        if (t === 'f') resultVal = (celsius * 9) / 5 + 32;
        if (t === 'k') resultVal = celsius + 273.15;

        return JSON.stringify({ stdout: `${numValue} ${args.from} = ${resultVal.toFixed(4)} ${args.to}`, exitCode: 0 });
      }

      // Поиск подходящей категории для остальных единиц
      for (const [category, units] of Object.entries(CONVERSION_MAP)) {
        if (units[f] !== undefined && units[t] !== undefined) {
          const baseValue = numValue * units[f];
          const resultVal = baseValue / units[t];
          return JSON.stringify({ stdout: `${numValue} ${args.from} = ${resultVal.toFixed(4)} ${args.to}`, exitCode: 0 });
        }
      }

      return JSON.stringify({ error: `Unsupported conversion from ${args.from} to ${args.to}`, exitCode: 1 });
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);