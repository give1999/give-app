import * as FileSystem from 'expo-file-system/legacy';
import type { Attachment } from '@/src/types';

export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

type ContentPartBuilder = (att: Attachment) => Promise<ChatContentPart>;

const TEXT_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/xml',
  'text/html',
  'text/css',
  'application/javascript',
  'text/javascript',
  'application/typescript',
];

const TEXT_EXTENSIONS = [
  '.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html', '.htm',
  '.css', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp',
  '.h', '.hpp', '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt',
  '.sql', '.yaml', '.yml', '.ini', '.cfg', '.conf', '.log', '.sh',
  '.bash', '.zsh', '.ps1', '.bat', '.cmd', '.dockerfile', '.gitignore',
];

function isTextFile(mimeType: string, name: string): boolean {
  const lowerMime = mimeType.toLowerCase();
  if (TEXT_MIME_TYPES.some((t) => lowerMime.includes(t))) return true;
  const lowerName = name.toLowerCase();
  if (TEXT_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) return true;
  if (lowerMime.startsWith('text/')) return true;
  return false;
}

const MAX_FILE_CONTENT_LENGTH = 50000; // ~50KB of text

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
  file: async (att) => {
    if (isTextFile(att.mimeType, att.name)) {
      try {
        let content = await FileSystem.readAsStringAsync(att.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        if (content.length > MAX_FILE_CONTENT_LENGTH) {
          content = content.slice(0, MAX_FILE_CONTENT_LENGTH) + '\n\n[... файл слишком большой, показана только первая часть]';
        }
        return {
          type: 'text',
          text: `Файл: ${att.name}\n\n\`\`\`\n${content}\n\`\`\``,
        };
      } catch {
        // fallback to description if reading fails
      }
    }
    return {
      type: 'text',
      text: `[Файл: ${att.name} (${att.mimeType})]`,
    };
  },
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
