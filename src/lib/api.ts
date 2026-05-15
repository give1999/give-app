import type { ProviderSettings } from '@/src/types';
import type { ChatContentPart } from './contentPartBuilders';

export interface ModelInfo {
  id: string;
  created?: number;
  owned_by?: string;
}

export interface ModelsResponse {
  object: string;
  data: ModelInfo[];
}

function normalizeUrl(url: string): string {
  url = url.trim();
  // убираем trailing slash
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
}

export async function fetchModels(
  config: Pick<ProviderSettings, 'apiKey' | 'baseUrl'>
): Promise<ModelsResponse> {
  const { apiKey, baseUrl } = config;
  const url = `${normalizeUrl(baseUrl)}/models`;
  console.log('[API] Fetching models from:', url);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  console.log('[API] Response status:', response.status);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.log('[API] Error response:', text);
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }

  const data = (await response.json()) as ModelsResponse;
  console.log('[API] Models count:', data.data?.length);
  return data;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ChatContentPart[];
}

export function streamChatCompletion(
  config: ProviderSettings,
  messages: ChatMessage[],
  onToken: (token: string) => void,
  onError: (error: string) => void,
  onDone: () => void,
  onModelInfo?: (info: { model: string; usage?: unknown }) => void,
  onReasoning?: (reasoning: string) => void
): { abort: () => void } {
  const { apiKey, baseUrl, model } = config;
  const url = `${normalizeUrl(baseUrl)}/chat/completions`;

  const xhr = new XMLHttpRequest();
  let buffer = '';
  let lineBuffer = '';
  let finished = false;

  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accept', 'text/event-stream');
  xhr.setRequestHeader('Authorization', `Bearer ${apiKey.trim()}`);

  xhr.onprogress = () => {
    if (finished) return;
    const newData = xhr.responseText.substring(buffer.length);
    buffer = xhr.responseText;

    lineBuffer += newData;
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() || ''; // сохраняем неполную строку

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;

      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') {
        finished = true;
        onDone();
        return;
      }

      try {
        const parsed = JSON.parse(data);
        const choice = parsed.choices?.[0];
        const token = choice?.delta?.content;
        if (token) {
          onToken(token);
        }
        const reasoning = choice?.delta?.reasoning_content ?? choice?.delta?.reasoning;
        if (reasoning && onReasoning) {
          onReasoning(reasoning);
        }
        if (parsed.model && onModelInfo) {
          onModelInfo({ model: parsed.model, usage: parsed.usage });
        }
      } catch {
        // ignore malformed JSON
      }
    }
  };

  xhr.onload = () => {
    if (finished) return;
    if (xhr.status >= 200 && xhr.status < 300) {
      finished = true;
      onDone();
    } else {
      finished = true;
      onError(`HTTP ${xhr.status}: ${xhr.responseText || xhr.statusText}`);
    }
  };

  xhr.onerror = () => {
    if (finished) return;
    finished = true;
    onError('Ошибка соединения');
  };

  xhr.ontimeout = () => {
    if (finished) return;
    finished = true;
    onError('Таймаут соединения');
  };

  const body = JSON.stringify({
    model: model || 'gpt-4o',
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
  });



  xhr.send(body);

  return {
    abort: () => {
      finished = true;
      xhr.abort();
    },
  };
}

export async function generateChatTitle(
  config: ProviderSettings,
  chatMessages: { role: string; content: string }[],
  availableModels: string[]
): Promise<{ title: string; usedModel: string } | null> {
  const { apiKey, baseUrl, model } = config;
  const url = `${normalizeUrl(baseUrl)}/chat/completions`;

  const systemPrompt =
    'Ты генератор заголовков. На основе всего диалога напиши один короткий заголовок на русском языке (1–2 слова, максимум 20 букв). Только заголовок, без пояснений, без кавычек, без reasoning.';

  const titleMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...chatMessages
      .filter((m) => m.role !== 'system')
      .slice(-6)
      .map((m) => ({ role: m.role as any, content: m.content.slice(0, 300) })),
    {
      role: 'user',
      content: 'Сгенерируй короткий заголовок для этого диалога (3–6 слов на русском).',
    },
  ];

  const modelsToTry = [model, ...availableModels.filter((m) => m !== model)].filter(Boolean);

  for (const tryModel of modelsToTry) {
    try {
      console.log('[TitleGen] Trying model:', tryModel);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: tryModel,
          messages: titleMessages,
          stream: false,
          temperature: 0.3,
          max_tokens: 64,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.log('[TitleGen] API error for', tryModel, ':', response.status, text);
        continue;
      }

      const data = (await response.json()) as {
        choices?: {
          message?: { content?: string; reasoning?: string };
          finish_reason?: string;
        }[];
      };
      console.log('[TitleGen] Raw response from', tryModel, ':', JSON.stringify(data).slice(0, 600));

      const choice = data.choices?.[0];
      let title = choice?.message?.content?.trim() ?? '';

      // fallback: если content пустой но есть reasoning
      if (!title && choice?.message?.reasoning) {
        title = choice.message.reasoning.trim();
      }

      title = title.replace(/^["']|["']$/g, '').trim();
      console.log('[TitleGen] Extracted title:', title);

      // Валидация
      if (isValidTitle(title)) {
        return { title, usedModel: tryModel };
      }
      console.log('[TitleGen] Title invalid, trying next model...');
    } catch (e) {
      console.log('[TitleGen] Exception for', tryModel, ':', e);
    }
  }

  console.log('[TitleGen] All models failed');
  return null;
}

function isValidTitle(title: string): boolean {
  if (!title) return false;
  if (title.length < 2 || title.length > 25) return false;
  const wordCount = title.trim().split(/\s+/).length;
  if (wordCount < 1 || wordCount > 3) return false;
  // Не должно быть JSON, кода, многострочного текста
  if (title.includes('{') || title.includes('}') || title.includes('[') || title.includes(']')) return false;
  if (title.includes('\n') || title.includes('\r')) return false;
  if (title.startsWith('//') || title.startsWith('/*') || title.startsWith('#')) return false;
  // Не должно быть английских слов длиннее 20 символов (признак бреда)
  const words = title.split(/\s+/);
  if (words.some((w) => /^[a-zA-Z]+$/.test(w) && w.length > 20)) return false;
  return true;
}
