import { create } from 'zustand';

interface StreamingState {
  streamingMessageId: string | null;
  streamingConversationId: string | null;
  streamingContent: string;
  streamingReasoning: string;
  isStreaming: boolean;
  isCancelled: boolean;
  currentIterationIndex: number;
  iterationStartTime: number;

  startStreaming: (convId: string, msgId: string) => void;
  resumeStreaming: (convId: string, msgId: string) => void;
  nextIteration: () => void;
  appendContent: (chunk: string) => void;
  appendReasoning: (chunk: string) => void;
  commitContentOnly: () => void;
  commitToStore: () => void;
  cancelStreaming: () => void;
}

export const useStreamingStore = create<StreamingState>()((set, get) => ({
  streamingMessageId: null,
  streamingConversationId: null,
  streamingContent: '',
  streamingReasoning: '',
  isStreaming: false,
  isCancelled: false,
  currentIterationIndex: 0,
  iterationStartTime: 0,

  startStreaming: (convId, msgId) => set({
    streamingConversationId: convId,
    streamingMessageId: msgId,
    streamingContent: '',
    streamingReasoning: '',
    isStreaming: true,
    isCancelled: false,
    currentIterationIndex: 0,
    iterationStartTime: Date.now(),
  }),

  resumeStreaming: (convId, msgId) => set({
    streamingConversationId: convId,
    streamingMessageId: msgId,
    isStreaming: true,
    isCancelled: false,
  }),

  nextIteration: () => set((s) => ({
    currentIterationIndex: s.currentIterationIndex + 1,
    streamingContent: '',
    streamingReasoning: '',
    iterationStartTime: Date.now(),
  })),

  appendContent: (chunk) => set((s) => ({
    streamingContent: s.streamingContent + chunk,
  })),

  appendReasoning: (chunk) => set((s) => ({
    streamingReasoning: s.streamingReasoning + chunk,
  })),

  commitContentOnly: () => {
    const state = get();
    const { streamingConversationId, streamingMessageId, streamingContent, streamingReasoning, currentIterationIndex } = state;
    if (streamingConversationId && streamingMessageId) {
      const { useChatStore } = require('./chatStore');
      // Читаем toolCallDisplays из текущего сообщения, чтобы перенести в итерацию
      const conv = useChatStore.getState().conversations.find((c: any) => c.id === streamingConversationId);
      const msg = conv?.messages.find((m: any) => m.id === streamingMessageId);
      const toolCallDisplays = msg?.toolCallDisplays ? [...msg.toolCallDisplays] : undefined;
      const iteration = {
        id: `${streamingMessageId}-iter-${currentIterationIndex}`,
        index: currentIterationIndex,
        reasoning: streamingReasoning || undefined,
        content: streamingContent,
        toolCallDisplays,
        timestamp: Date.now(),
      };
      useChatStore.getState().addAgentIteration(
        streamingConversationId, streamingMessageId, iteration
      );
    }
    // НЕ сбрасываем streamingContent, streamingReasoning, streamingMessageId, isStreaming
    // Контент продолжает накапливаться для следующей итерации
  },

  commitToStore: () => {
    const state = get();
    // Если стриминг был отменён, commitToStore уже вызван из cancelStreaming
    if (state.isCancelled) {
      set({
        streamingMessageId: null,
        streamingConversationId: null,
        streamingContent: '',
        streamingReasoning: '',
        isStreaming: false,
        isCancelled: false,
        currentIterationIndex: 0,
        iterationStartTime: 0,
      });
      return;
    }
    const { streamingConversationId, streamingMessageId, streamingContent, streamingReasoning } = state;
    if (streamingConversationId && streamingMessageId) {
      const { useChatStore } = require('./chatStore');
      // Финальный ответ сохраняем в message.content, НЕ в agentIterations
      if (streamingContent) {
        useChatStore.getState().updateMessageContent(
          streamingConversationId, streamingMessageId, streamingContent
        );
      }
      if (streamingReasoning) {
        useChatStore.getState().updateMessageReasoning(
          streamingConversationId, streamingMessageId, streamingReasoning
        );
      }
    }
    set({
      streamingMessageId: null,
      streamingConversationId: null,
      streamingContent: '',
      streamingReasoning: '',
      isStreaming: false,
      currentIterationIndex: 0,
    });
  },

  cancelStreaming: () => {
    set({ isCancelled: true });
    get().commitToStore();
  },
}));