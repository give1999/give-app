import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Поиск в интернете. Возвращает список релевантных результатов с заголовками и ссылками.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Поисковый запрос',
          },
          count: {
            type: 'number',
            description: 'Количество результатов (по умолчанию 5)',
            default: 5,
          },
        },
        required: ['query'],
      },
    },
  },
  permission: 'safe',
  category: 'web',
  execute: async (args) => {
    try {
      const query = args.query as string;
      const count = Math.max(1, Math.min(20, (args.count as number) || 5));
      const q = encodeURIComponent(query);
      
      const res = await fetch(`https://api.duckduckgo.com/?q=${q}&format=json&no_html=1`);
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }
      
      const data = await res.json();
      const results: Array<{ title: string; url: string }> = [];
      
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics) {
          if (results.length >= count) break;
          if (topic.Text) {
            results.push({
              title: topic.Text.slice(0, 100),
              url: topic.FirstURL || '',
            });
          }
        }
      }
      
      return JSON.stringify({ stdout: JSON.stringify(results, null, 2), exitCode: 0 });
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);