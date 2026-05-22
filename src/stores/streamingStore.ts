import { create } from 'zustand';

interface StreamingState {
  streamingMessageId: string | null;
  streamingConversationId: string | null;
  streamingContent: string;
  streamingReasoning: string;
  isStreaming: boolean;
  isCancelled: boolean;

  startStreaming: (convId: string, msgId: string) => void;
  resumeStreaming: (convId: string, msgId: string) => void;
  appendContent: (chunk: string) => void;
  appendReasoning: (chunk: string) => void;
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

  startStreaming: (convId, msgId) => set({
    streamingConversationId: convId,
    streamingMessageId: msgId,
    streamingContent: '',
    streamingReasoning: '',
    isStreaming: true,
    isCancelled: false,
  }),

  resumeStreaming: (convId, msgId) => set({
    streamingConversationId: convId,
    streamingMessageId: msgId,
    // НЕ сбрасываем streamingContent — продолжаем в то же сообщение
    isStreaming: true,
    isCancelled: false,
  }),

  appendContent: (chunk) => set((s) => ({
    streamingContent: s.streamingContent + chunk,
  })),

  appendReasoning: (chunk) => set((s) => ({
    streamingReasoning: s.streamingReasoning + chunk,
  })),

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
      });
      return;
    }
    const { streamingConversationId, streamingMessageId, streamingContent, streamingReasoning } = state;
    if (streamingConversationId && streamingMessageId) {
      // Import will be used at call site — we use useChatStore.getState() there
      const { useChatStore } = require('./chatStore');
      useChatStore.getState().updateMessageContent(
        streamingConversationId, streamingMessageId, streamingContent
      );
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
    });
  },

  cancelStreaming: () => {
    set({ isCancelled: true });
    get().commitToStore();
  },
}));