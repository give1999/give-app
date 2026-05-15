// ============================================
// Give App — Core Types
// ============================================

/** Роль отправителя в чате */
export type MessageRole = 'user' | 'assistant' | 'system';

/** Тип вложения */
export type AttachmentType = 'image' | 'file';

/** Вложение в сообщении */
export interface Attachment {
  id: string;
  uri: string;
  type: AttachmentType;
  mimeType: string;
  name: string;
  width?: number;
  height?: number;
  size?: number;
}

/** Одно сообщение в чате */
export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  reasoning?: string;
  attachments?: Attachment[];
  timestamp: number;
}

/** Один чат (диалог) */
export interface Conversation {
  id: string;
  title: string;
  titleGenerated?: boolean;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

/** Настройки AI-провайдера, которые вводит пользователь */
export interface ProviderSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;
}

/** Все настройки приложения */
export interface AppSettings extends ProviderSettings {
  // тема всегда тёмная, переключения нет
}
