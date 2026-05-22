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
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validateCount, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    const count = validateCount(args.count, 1, 20);
    const escapedQuery = shellEscapeSingle(args.query);
    const result = await sandboxManager.execInSandbox(
      `python3 -c "
import urllib.request, json, urllib.parse
q = urllib.parse.quote(${escapedQuery})
url = f'https://api.duckduckgo.com/?q={q}&format=json&no_html=1'
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read())
    results = []
    for r in (data.get('RelatedTopics') or [])[:${count}]:
        if isinstance(r, dict) and 'Text' in r:
            results.append({'title': r['Text'][:100], 'url': r.get('FirstURL', '')})
    print(json.dumps(results, ensure_ascii=False))
except Exception as e:
    print(json.dumps({'error': str(e)}")
"`,
      '/workspace',
      30
    );
    return JSON.stringify(result);
  },
};

registerTool(tool);