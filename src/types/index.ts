// ============================================
// Star App — Core Types
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

/** Одна итерация агента внутри сообщения ассистента */
export interface AgentIteration {
  id: string;           // stable key для React
  index: number;        // 0, 1, 2...
  reasoning?: string;
  content: string;
  toolCallDisplays?: ToolCallDisplay[];
  timestamp: number;
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
  toolCalls?: ToolCall[];              // tool_calls от ассистента
  toolCallId?: string;                 // для role='tool' — ссылка на tool call
  toolCallDisplays?: ToolCallDisplay[]; // массив UI-карточек инструментов (legacy/fallback)
  agentIterations?: AgentIteration[];   // цепочка итераций агента
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

/** Пользовательская инструкция для модели */
export interface UserInstruction {
  id: string;
  text: string;
  enabled: boolean;
  order: number;
}

/** Конфигурация модели (видимость и порядок) */
export interface ModelConfig {
  id: string;
  visible: boolean;
  order: number;
}

/** Настройки AI-провайдера, которые вводит пользователь */
export interface ProviderSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  systemPrompt: string;          // из файла assets/system-prompt.txt, read-only
  customSystemPrompt: string;    // редактируется пользователем в настройках
  instructionsEnabled: boolean;  // глобальный выключатель инструкций
  instructions: UserInstruction[];
  modelConfigs: ModelConfig[];  // видимость и порядок моделей
}

/** Все настройки приложения */
export interface AppSettings extends ProviderSettings {
  // тема всегда тёмная, переключения нет
}

// === Tool Calling Types ===

/** Определение инструмента (отправляется модели) */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
        default?: unknown;
      }>;
      required?: string[];
    };
  };
}

/** Вызов инструмента моделью */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON-строка с параметрами
  };
}

/** Результат выполнения инструмента */
export interface ToolResult {
  toolCallId: string;
  role: 'tool';
  content: string; // JSON или текст
}

/** Статус выполнения tool */
export type ToolCallStatus = 'pending' | 'running' | 'completed' | 'error';

/** Отображение tool call в UI */
export interface ToolCallDisplay {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: ToolCallStatus;
  result?: string;
  error?: string;
  startedAt: number;
  finishedAt?: number;
  category?: string;
}

// === Sandbox Types ===

/** Статус среды */
export type EnvironmentStatus = 'active' | 'frozen' | 'initializing';

/** Состояние среды */
export interface EnvironmentState {
  conversationId: string;
  status: EnvironmentStatus;
  workspacePath: string;
  homePath: string;
  inboxPath: string;
  outboxPath: string;
  tmpPath: string;
  createdAt: number;
  lastActiveAt: number;
  diskUsageBytes: number;
  frozenSnapshot?: {
    cwd: string;
    env: Record<string, string>;
  };
}

/** Результат выполнения shell-команды */
export interface SandboxExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

/** Фоновая задача */
export interface DaemonTask {
  id: string;
  chatId: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  result?: SandboxExecResult;
  error?: string;
}

/** Настройки песочницы */
export interface SandboxSettings {
  daemonEnabled: boolean;
  daemonMode: 'always' | 'screen_on' | 'charging';
  daemonTimeoutMs: number;
  maxEnvironments: number;
  maxEnvironmentSizeMb: number;
  maxTotalSizeMb: number;
  autoCleanTmp: boolean;
}
