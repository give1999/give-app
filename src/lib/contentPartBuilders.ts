import * as FileSystem from 'expo-file-system/legacy';
import type { Attachment } from '@/src/types';

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

type ContentPartBuilder = (att: Attachment) => Promise<ChatContentPart>;

export const CONTENT_PART_BUILDERS: Record<string, ContentPartBuilder> = {
  image: async (att) => {
    const base64 = await FileSystem.readAsStringAsync(att.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return {
      type: 'image_url',
      image_url: { url: `data:${att.mimeType};base64,${base64}`, detail: 'auto' },
    };
  },
  file: async (att) => ({
    type: 'text',
    text: `[Файл: ${att.name} (${att.mimeType})]`,
  }),
};

export async function buildContent(
  text: string,
  attachments: Attachment[],
): Promise<{ parts: ChatContentPart[]; warnings: string[] }> {
  const warnings: string[] = [];
  const parts: ChatContentPart[] = [];

  if (text) parts.push({ type: 'text', text });

  for (const att of attachments) {
    const builder = CONTENT_PART_BUILDERS[att.type];
    if (!builder) {
      warnings.push(`Неизвестный тип вложения: ${att.type}`);
      continue;
    }
    try {
      parts.push(await builder(att));
    } catch {
      warnings.push(`Не удалось обработать: ${att.name}`);
    }
  }

  if (parts.length === 0) {
    warnings.push('Все вложения были пропущены');
    parts.push({ type: 'text', text: text || '(пустое сообщение)' });
  }

  return { parts, warnings };
}
