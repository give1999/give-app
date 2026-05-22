// ============================================
// Model Capabilities — Lazy Detection with Permanent Cache
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const CAPS_CACHE_KEY = 'star-model-caps-v1';

export interface ModelCapabilities {
  vision: boolean;
  files: boolean;
}

export type CapsCache = Record<string, ModelCapabilities>;

/** 1×1 прозрачный PNG в base64 (минимальный тестовый образ) */
const DUMMY_IMAGE_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** Загружает кэш capabilities из AsyncStorage */
export async function loadCapsCache(): Promise<CapsCache> {
  try {
    const raw = await AsyncStorage.getItem(CAPS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Сохраняет кэш capabilities в AsyncStorage (навсегда) */
export async function saveCapsCache(cache: CapsCache): Promise<void> {
  await AsyncStorage.setItem(CAPS_CACHE_KEY, JSON.stringify(cache));
}

/** Возвращает модели, для которых ещё нет записи в кэше */
export function findUntestedModels(modelIds: string[], cache: CapsCache): string[] {
  return modelIds.filter((id) => !cache[id]);
}

/** Тестирует одну модель на поддержку файлов: отправляет dummy text/plain */
export async function testModelFiles(
  modelId: string,
  config: { apiKey: string; baseUrl: string }
): Promise<boolean> {
  const url = config.baseUrl.replace(/\/+$/, '') + '/chat/completions';

  const body = {
    model: modelId,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'hi' },
          {
            type: 'image_url',
            image_url: { url: 'data:text/plain;base64,SGVsbG8gV29ybGQ=' },
          },
        ],
      },
    ],
    max_tokens: 1,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const lower = text.toLowerCase();
      if (
        lower.includes('file') ||
        lower.includes('document') ||
        lower.includes('unsupported') ||
        lower.includes('not supported') ||
        lower.includes('invalid content')
      ) {
        return false;
      }
      return true;
    }
    return true;
  } catch {
    return false;
  }
}

/** Тестирует одну модель: отправляет dummy-изображение, смотрит на ответ */
export async function testModelVision(
  modelId: string,
  config: { apiKey: string; baseUrl: string }
): Promise<ModelCapabilities> {
  const url = config.baseUrl.replace(/\/+$/, '') + '/chat/completions';

  const body = {
    model: modelId,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'hi' },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${DUMMY_IMAGE_B64}` },
          },
        ],
      },
    ],
    max_tokens: 1,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const lower = text.toLowerCase();
      if (
        lower.includes('image') ||
        lower.includes('vision') ||
        lower.includes('multimodal') ||
        lower.includes('unsupported') ||
        lower.includes('not supported') ||
        lower.includes('invalid content') ||
        lower.includes('content type')
      ) {
        return { vision: false, files: false };
      }
      return { vision: true, files: false };
    }

    return { vision: true, files: false };
  } catch {
    return { vision: false, files: false };
  }
}

/** Проверяет, можно ли отправить вложения данной модели */
export function canSendAttachments(
  modelId: string,
  cache: CapsCache,
  attachments: { type: 'image' | 'file' }[]
): { allowed: boolean; reason?: string } {
  const caps = cache[modelId];
  if (!caps) {
    return {
      allowed: false,
      reason: `Модель «${modelId}» ещё не протестирована. Зайдите в настройки для проверки.`,
    };
  }

  const hasImages = attachments.some((a) => a.type === 'image');

  if (hasImages && !caps.vision) {
    return {
      allowed: false,
      reason: `Модель «${modelId}» не поддерживает изображения. Выберите другую модель.`,
    };
  }

  return { allowed: true };
}
