import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'text_regex',
      description: 'Выполнить регулярное выражение над текстом. Поддерживает поиск, замену и разбиение.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Текст для обработки',
          },
          pattern: {
            type: 'string',
            description: 'Регулярное выражение',
          },
          action: {
            type: 'string',
            enum: ['match', 'replace', 'split'],
            description: 'Действие: match — найти совпадения, replace — заменить, split — разбить',
          },
          replacement: {
            type: 'string',
            description: 'Строка замены (для action=replace)',
          },
        },
        required: ['text', 'pattern', 'action'],
      },
    },
  },
  permission: 'safe',
  category: 'text',
  execute: async (args) => {
    const text = args.text;
    const pattern = args.pattern;
    // Защита от ReDoS — ограничение длины
    if (text.length > 100000) {
      return JSON.stringify({ error: 'Text too long (max 100000 chars)' });
    }
    if (pattern.length > 500) {
      return JSON.stringify({ error: 'Pattern too long (max 500 chars)' });
    }
    let result: any;
    try {
      const regex = new RegExp(pattern, 'g');
      switch (args.action) {
        case 'match': {
          const matches: string[] = [];
          let m: RegExpExecArray | null;
          let safetyCounter = 0;
          while ((m = regex.exec(text)) !== null && safetyCounter < 10000) {
            matches.push(m[0]);
            // Предотвратить бесконечный цикл при zero-length match
            if (m[0].length === 0) regex.lastIndex++;
            safetyCounter++;
          }
          result = { matches, count: matches.length };
          break;
        }
        case 'replace': {
          const replaced = text.replace(regex, args.replacement || '');
          result = { result: replaced };
          break;
        }
        case 'split': {
          const parts = text.split(regex);
          result = { parts, count: parts.length };
          break;
        }
        default:
          result = { error: 'Unknown action' };
      }
    } catch (e: any) {
      result = { error: e.message };
    }
    return JSON.stringify(result);
  },
};

registerTool(tool);