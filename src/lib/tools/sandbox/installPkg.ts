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
    return JSON.stringify({
      error: 'Менеджер пакетов apt-get не поддерживается в данной минимальной песочнице BusyBox. Все базовые системные утилиты Linux уже предустановлены в окружении.',
      exitCode: 127
    });
  },
};

registerTool(tool);