import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Conversation, Message } from '@/src/types';
import { genId } from '@/src/lib/id';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;

  createConversation: (systemPrompt: string) => Conversation;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (convId: string, message: Omit<Message, 'id' | 'timestamp'>) => Message;
  updateMessageContent: (convId: string, msgId: string, content: string) => void;
  updateMessageReasoning: (convId: string, msgId: string, reasoning: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  getActiveConversation: () => Conversation | null;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,

      createConversation: (systemPrompt) => {
        const now = Date.now();
        const conv: Conversation = {
          id: genId(),
          title: 'Новый чат',
          titleGenerated: false,
          messages: [
            {
              id: genId(),
              conversationId: '',
              role: 'system',
              content: systemPrompt,
              timestamp: now,
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
        // fix self-reference
        conv.messages[0].conversationId = conv.id;

        set((state) => ({
          conversations: [conv, ...state.conversations],
          activeConversationId: conv.id,
        }));
        return conv;
      },

      deleteConversation: (id) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id);
          const nextActive =
            state.activeConversationId === id
              ? (filtered[0]?.id ?? null)
              : state.activeConversationId;
          return { conversations: filtered, activeConversationId: nextActive };
        });
      },

      setActiveConversation: (id) => set({ activeConversationId: id }),

      addMessage: (convId, msg) => {
        const message: Message = {
          ...msg,
          id: genId(),
          timestamp: Date.now(),
        };

        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convId
              ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
              : c
          ),
        }));
        return message;
      },

      updateMessageContent: (convId, msgId, content) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === msgId ? { ...m, content } : m
                  ),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },

      updateMessageReasoning: (convId, msgId, reasoning) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === msgId ? { ...m, reasoning } : m
                  ),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },

          updateConversationTitle: (id: string, title: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, titleGenerated: true } : c
          ),
        }));
      },

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId) ?? null;
      },
    }),
    {
      name: 'give-chats',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
