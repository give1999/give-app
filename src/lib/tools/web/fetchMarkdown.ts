import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'web_fetch_markdown',
      description: 'Скачать содержимое веб-страницы и конвертировать в Markdown. Удобно для чтения статей и документации.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL страницы для скачивания',
          },
        },
        required: ['url'],
      },
    },
  },
  permission: 'safe',
  category: 'web',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validateUrl, shellEscapeSingle } = require('@/src/lib/sandbox/shellSanitize');
    try {
      validateUrl(args.url);
      const escapedUrl = shellEscapeSingle(args.url);
      const result = await sandboxManager.execInSandbox(
        `python3 -c "
import urllib.request
from html.parser import HTMLParser

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.skip = False
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'nav', 'footer'): self.skip = True
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'nav', 'footer'): self.skip = False
    def handle_data(self, data):
        if not self.skip: self.text.append(data.strip())

try:
    req = urllib.request.Request(${escapedUrl}, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8', errors='ignore')
    p = TextExtractor()
    p.feed(html)
    print('\\n'.join(t for t in p.text if t)[:20000])
except Exception as e:
    print(f'Error: {e}')
"`,
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