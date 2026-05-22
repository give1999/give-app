import { registerTool } from '../registry';
import type { Tool } from '../registry';

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'sandbox_install_pkg',
      description: 'Установить пакет в песочницу через apt (Debian/Ubuntu). Используй для установки python3, nodejs, ffmpeg, imagemagick и т.д.',
      parameters: {
        type: 'object',
        properties: {
          package: {
            type: 'string',
            description: 'Имя пакета, например python3',
          },
          yes: {
            type: 'boolean',
            description: 'Автоматически подтверждать установку (по умолчанию true)',
            default: true,
          },
        },
        required: ['package'],
      },
    },
  },
  permission: 'safe',
  category: 'sandbox',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    const { validatePackageName, shellEscapeDouble } = require('@/src/lib/sandbox/shellSanitize');
    try {
      validatePackageName(args.package);
      const yesFlag = args.yes !== false ? '-y' : '';
      const result = await sandboxManager.execInSandbox(
        `apt-get update && apt-get install ${yesFlag} ${shellEscapeDouble(args.package)}`,
        '/workspace',
        300
      );
      return JSON.stringify(result);
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);