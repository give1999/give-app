import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Keyboard, PanResponder, Pressable, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import Header from '@/src/components/Header';
import type { ModelDropdownHandle } from '@/src/components/ModelDropdown';
import Drawer from '@/src/components/Drawer';
import ChatInput from '@/src/components/ChatInput';
import AttachmentMenu from '@/src/components/AttachmentMenu';
import AttachmentPreview from '@/src/components/AttachmentPreview';
import MessageBubble from '@/src/components/MessageBubble';
import { spacing, radius, typography } from '@/src/design/theme';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useChatStore } from '@/src/stores/chatStore';
import { useStreamingStore } from '@/src/stores/streamingStore';
import { useAttachmentPicker } from '@/src/hooks/useAttachmentPicker';
import { streamChatCompletion, generateChatTitle, type ChatMessage } from '@/src/lib/api';
import { buildContent } from '@/src/lib/contentPartBuilders';
import { canSendAttachments } from '@/src/lib/modelCapabilities';
import { loadSystemPromptFromFile } from '@/src/lib/systemPrompt';
import { getAllToolDefinitions, executeTool, getToolCategory } from '@/src/lib/tools';
import type { ToolCall, Conversation, Message, AgentIteration } from '@/src/types';
import type { Attachment, ToolCallDisplay } from '@/src/types';

interface DisplayMessage {
  id: string;
  text: string;
  reasoning?: string;
  isUser?: boolean;
  isAI?: boolean;
  attachments?: Attachment[];
  toolCallDisplays?: ToolCallDisplay[];
  agentIterations?: AgentIteration[];
}

function toolCallDisplaysEqual(a?: ToolCallDisplay[] | null, b?: ToolCallDisplay[] | null): boolean {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].status !== b[i].status || a[i].result !== b[i].result || a[i].error !== b[i].error) return false;
  }
  return true;
}

function toDisplayMessages(messages: { id: string; role: string; content: string; reasoning?: string; attachments?: Attachment[]; toolCallDisplays?: ToolCallDisplay[]; agentIterations?: AgentIteration[] }[]): DisplayMessage[] {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      id: m.id,
      text: m.content,
      reasoning: m.reasoning,
      attachments: m.attachments,
      isUser: m.role === 'user',
      isAI: m.role === 'assistant',
      toolCallDisplays: m.toolCallDisplays,
      agentIterations: m.agentIterations,
    }));
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const abortAgentRef = useRef({ aborted: false });
  const scrollRafRef = useRef<number | null>(null);
  const [kbHeight, setKbHeight] = useState(0);
  const isAtBottomRef = useRef(true);
  const autoFollowRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const lastOffsetY = useRef(0);
  const lastLayoutH = useRef(0);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isSystemPromptLoaded, setIsSystemPromptLoaded] = useState(false);
  const modelDropdownRef = useRef<ModelDropdownHandle>(null);
  const { pickImage, takePhoto, pickFile } = useAttachmentPicker();

  const scheduleScrollToEnd = useCallback(() => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: false });
      scrollRafRef.current = null;
    });
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKbHeight(e.endCoordinates.height);
      if (isAtBottomRef.current) {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKbHeight(0);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Загружаем системный промпт из файла при старте (всегда, поверх persist)
  useEffect(() => {
    loadSystemPromptFromFile().then((prompt) => {
      useSettingsStore.getState().setSystemPrompt(prompt);
      setIsSystemPromptLoaded(true);
    });
  }, []);

  const drawerResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_evt) => _evt.nativeEvent.pageX < 40,
      onMoveShouldSetPanResponder: (_evt, gestureState) =>
        gestureState.dx > 20 && Math.abs(gestureState.dy) < Math.abs(gestureState.dx * 2),
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dx > 40) {
          setShowDrawer(true);
        }
      },
    }),
  ).current;

  const streamingMsgId = useStreamingStore((s) => s.streamingMessageId);
  const streamingContent = useStreamingStore((s) => s.streamingContent);
  const streamingReasoning = useStreamingStore((s) => s.streamingReasoning);

  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const createConversation = useChatStore((s) => s.createConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessageContent = useChatStore((s) => s.updateMessageContent);
  const updateMessageReasoning = useChatStore((s) => s.updateMessageReasoning);
  const updateMessageToolCalls = useChatStore((s) => s.updateMessageToolCalls);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const updateConversationTitle = useChatStore((s) => s.updateConversationTitle);
  const systemPrompt = useSettingsStore((s) => s.systemPrompt);
  const customSystemPrompt = useSettingsStore((s) => s.customSystemPrompt);
  const instructionsEnabled = useSettingsStore((s) => s.instructionsEnabled);
  const instructions = useSettingsStore((s) => s.instructions);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const baseUrl = useSettingsStore((s) => s.baseUrl);
  const model = useSettingsStore((s) => s.model);
  const modelCaps = useSettingsStore((s) => s.modelCaps);

  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const currentConv = conversations.find((c) => c.id === activeConversationId);
  const hasMessages = !!currentConv && currentConv.messages.some((m) => m.role !== 'system');
  const prevMessagesRef = useRef<DisplayMessage[]>([]);
  const messages = useMemo(() => {
    const raw = (currentConv?.messages ?? []).filter((m) => m.role !== 'system');
    const prev = prevMessagesRef.current;
    const result: DisplayMessage[] = [];

    const agentIterationsEqual = (a?: any[], b?: any[]) => {
      if (a === b) return true;
      if (!a && !b) return true;
      if (!a || !b) return false;
      if (a.length !== b.length) return false;
      for (let j = 0; j < a.length; j++) {
        if (a[j].id !== b[j].id || a[j].content !== b[j].content || a[j].reasoning !== b[j].reasoning) return false;
      }
      return true;
    };

    for (let i = 0; i < raw.length; i++) {
      const m = raw[i];
      const prevMsg = prev[i];
      // Use streaming data for the currently streaming message
      const displayText = m.id === streamingMsgId ? streamingContent : m.content;
      const displayReasoning = m.id === streamingMsgId ? streamingReasoning : m.reasoning;

      if (prevMsg && prevMsg.id === m.id && prevMsg.text === displayText && prevMsg.reasoning === displayReasoning && toolCallDisplaysEqual(prevMsg.toolCallDisplays, m.toolCallDisplays) && agentIterationsEqual(prevMsg.agentIterations, m.agentIterations)) {
        result.push(prevMsg);
      } else {
        if (m.role === 'assistant' && m.toolCallDisplays) {
          console.log(`[toDisplayMessages] 🎨 Rebuilding msg=${m.id} toolCallDisplays=${m.toolCallDisplays.length} textLen=${displayText.length}`);
        }
        result.push({
          id: m.id,
          text: displayText,
          reasoning: displayReasoning,
          attachments: m.attachments,
          isUser: m.role === 'user',
          isAI: m.role === 'assistant',
          toolCallDisplays: m.toolCallDisplays,
          agentIterations: m.agentIterations,
        });
      }
    }

    prevMessagesRef.current = result;
    return result;
  }, [currentConv?.messages, streamingMsgId, streamingContent, streamingReasoning]);
  const chatHistoryRef = useRef<{ role: string; content: string }[]>([]);

  useEffect(() => {
    if (currentConv) {
      chatHistoryRef.current = currentConv.messages
        .filter((m) => m.role !== 'system' && (m.content.length > 0 || (m.attachments && m.attachments.length > 0)))
        .map((m) => ({ role: m.role, content: m.content }));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [activeConversationId]);

  const handleScrollBtn = useCallback(() => {
    if (isLoading) {
      autoFollowRef.current = true;
      isAtBottomRef.current = true;
      setShowScrollBtn(false);
      scrollRef.current?.scrollToEnd({ animated: true });
    } else {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [isLoading]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    const hasAttachments = pendingAttachments.length > 0;
    if (!text && !hasAttachments) return;
    if (isLoadingRef.current) return;

    if (!apiKey || !baseUrl) {
      router.push('/settings');
      return;
    }

    if (!model) {
      modelDropdownRef.current?.openDropdown();
      return;
    }

    // Проверка совместимости модели с вложениями
    if (hasAttachments && model) {
      const check = canSendAttachments(model, modelCaps, pendingAttachments);
      if (!check.allowed) {
        Alert.alert('Несовместимая модель', check.reason, [
          { text: 'ОК', style: 'default' },
          { text: 'Сменить модель', onPress: () => router.push('/settings') },
        ]);
        return;
      }
    }

    let convId = activeConversationId;
    if (!convId) {
      const conv = createConversation(systemPrompt);
      convId = conv.id;
    }

    const userMsg = addMessage(convId, {
      conversationId: convId,
      role: 'user',
      content: text,
      attachments: hasAttachments ? pendingAttachments : undefined,
    });
    const sentAttachments = hasAttachments ? [...pendingAttachments] : [];
    setInputValue('');
    setPendingAttachments([]);
    autoFollowRef.current = false;

    // Обновляем chatHistoryRef с новым сообщением пользователя
    chatHistoryRef.current = [
      ...chatHistoryRef.current,
      { role: 'user', content: text },
    ];

    const aiMsg = addMessage(convId, { conversationId: convId, role: 'assistant', content: '' });
    useStreamingStore.getState().startStreaming(convId, aiMsg.id);
    isLoadingRef.current = true;
    setIsLoading(true);

    // Agent loop: abort signal
    abortAgentRef.current = { aborted: false };

    let contentRaf: ReturnType<typeof requestAnimationFrame> | null = null;
    let reasoningRaf: ReturnType<typeof requestAnimationFrame> | null = null;
    let pendingContent = '';
    let pendingReasoning = '';

    const flushContent = () => {
      contentRaf = null;
      if (pendingContent) {
        useStreamingStore.getState().appendContent(pendingContent);
        pendingContent = '';
      }
    };
    const flushReasoning = () => {
      reasoningRaf = null;
      if (pendingReasoning) {
        useStreamingStore.getState().appendReasoning(pendingReasoning);
        pendingReasoning = '';
      }
    };

    const config = { baseUrl, apiKey, model, systemPrompt, customSystemPrompt, instructionsEnabled, instructions };

    try {
      const { parts } = await buildContent(text, sentAttachments);
      let currentMessages: ChatMessage[] = [
        ...chatHistoryRef.current.map((m) => ({ role: m.role as any, content: m.content })),
        { role: 'user' as const, content: parts },
      ];

      const tools = getAllToolDefinitions();
      console.log(`[AgentLoop] 🚀 START convId="${convId}" toolsCount=${tools.length} model="${model}"`);
      let isFirstIteration = true;

      // === Agent Loop ===
      while (!abortAgentRef.current.aborted) {
        let iterationContent = '';
        let iterationReasoning = '';
        const toolCalls: ToolCall[] = [];
        let finishReason: string | undefined;
        console.log(`[AgentLoop] 🔄 ITERATION #${isFirstIteration ? 1 : 'N'} messagesCount=${currentMessages.length}`);

        if (!isFirstIteration) {
          // Продолжаем стриминг в тот же aiMsg
          useStreamingStore.getState().resumeStreaming(convId, aiMsg.id);
        }
        isFirstIteration = false;

        // Стримим запрос к модели
        await new Promise<void>((resolve, reject) => {
          const { abort } = streamChatCompletion(
            config,
            currentMessages,
            (chunk) => {
              iterationContent += chunk;
              pendingContent += chunk;
              if (!contentRaf) {
                contentRaf = requestAnimationFrame(flushContent);
              }
              if (autoFollowRef.current) {
                scheduleScrollToEnd();
              }
            },
            (error) => {
              console.error(`[AgentLoop] ❌ streamChatCompletion error: ${error}`);
              reject(new Error(error));
            },
            (fr) => {
              finishReason = fr;
              console.log(`[AgentLoop] ✅ streamChatCompletion done finishReason="${fr}" contentLen=${iterationContent.length} reasoningLen=${iterationReasoning.length}`);
              resolve();
            },
            undefined,
            (r) => {
              iterationReasoning += r;
              pendingReasoning += r;
              if (!reasoningRaf) {
                reasoningRaf = requestAnimationFrame(flushReasoning);
              }
              if (autoFollowRef.current) {
                scheduleScrollToEnd();
              }
            },
            (toolCall) => {
              console.log(`[AgentLoop] 🔧 TOOL_CALL received id="${toolCall.id}" name="${toolCall.function?.name}" argsPreview="${toolCall.function?.arguments?.slice(0, 200)}"`);
              toolCalls.push(toolCall);
            },
            tools.length > 0 ? tools : undefined,
          );
          abortRef.current = abort;
        });

        // Если нет tool_calls — финальный ответ, выходим из цикла
        if (toolCalls.length === 0 || abortAgentRef.current.aborted) {
          console.log(`[AgentLoop] 🏁 EXIT noToolCalls=${toolCalls.length === 0} aborted=${abortAgentRef.current.aborted}`);
          break;
        }

        console.log(`[AgentLoop] 🔧 EXECUTING ${toolCalls.length} tool call(s): ${toolCalls.map(tc => tc.function?.name).join(', ')}`);

        // Создаём ToolCallDisplay[] со статусом 'pending' для UI
        const initialDisplays: ToolCallDisplay[] = toolCalls.map((tc) => {
          let args: Record<string, unknown>;
          try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
          return {
            id: tc.id,
            name: tc.function.name,
            args,
            status: 'pending' as const,
            startedAt: Date.now(),
            category: getToolCategory(tc.function.name),
          };
        });

        // Обновляем сообщение ассистента — добавляем toolCallDisplays
        console.log(`[AgentLoop] 🎨 Setting toolCallDisplays on msg=${aiMsg.id} count=${initialDisplays.length} names=${initialDisplays.map(d => d.name).join(',')}`);
        updateMessageToolCalls(convId!, aiMsg.id, initialDisplays);

        // Хелпер: обновить один элемент в массиве через функциональное обновление стора
        const updateSingleDisplay = (index: number, patch: Partial<ToolCallDisplay>) => {
          useChatStore.setState((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === convId
                ? {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === aiMsg.id
                        ? {
                            ...m,
                            toolCallDisplays: (m.toolCallDisplays ?? initialDisplays).map(
                              (d: ToolCallDisplay, i: number) => i === index ? { ...d, ...patch } : d
                            ),
                          }
                        : m
                    ),
                    updatedAt: Date.now(),
                  }
                : c
            ),
          }));
        };

        // Выполняем tool calls параллельно с обновлением статусов
        const execPromises = toolCalls.map(async (tc, index) => {
          let args: Record<string, unknown>;
          try {
            args = JSON.parse(tc.function.arguments);
          } catch (e) {
            console.error(`[AgentLoop] ❌ Failed to parse args for "${tc.function.name}": ${e}`);
            args = {};
          }

          // Обновляем статус на 'running'
          updateSingleDisplay(index, { status: 'running' });

          console.log(`[AgentLoop] ➡️  EXECUTING tool="${tc.function.name}" args=${JSON.stringify(args).slice(0, 300)}`);
          const result = await executeTool(tc.function.name, args);
          console.log(`[AgentLoop] ✅ EXECUTED tool="${tc.function.name}" success=${result.success} resultPreview="${result.result?.slice(0, 200)}" error="${result.error || 'none'}"`);

          // Обновляем статус на 'completed' или 'error'
          updateSingleDisplay(index, {
            status: result.success ? 'completed' : 'error',
            result: result.result,
            error: result.error,
            finishedAt: Date.now(),
            category: result.category,
          });

          return {
            toolCallId: tc.id,
            content: result.success ? result.result : `Error: ${result.error}`,
          };
        });

        const results = await Promise.all(execPromises);
        console.log(`[AgentLoop] 📊 All ${results.length} tool(s) executed, committing to store...`);

        // Коммитим текущий контент перед следующим запросом
        flushContent();
        flushReasoning();
        console.log(`[AgentLoop] 💾 commitContentOnly — streamingContent.length=${useStreamingStore.getState().streamingContent.length} toolCallDisplays still on msg? checking...`);
        useStreamingStore.getState().commitContentOnly();
        // Проверяем, что toolCallDisplays не затёрлись после commitContentOnly
        const convAfterCommit = useChatStore.getState().conversations.find((c: Conversation) => c.id === convId);
        const msgAfterCommit = convAfterCommit?.messages.find((m: Message) => m.id === aiMsg.id);
        console.log(`[AgentLoop] 💾 After commitContentOnly: msg.content.length=${msgAfterCommit?.content?.length} toolCallDisplays=${msgAfterCommit?.toolCallDisplays?.length ?? 'undefined'}`);

        // Добавляем ассистентское сообщение с tool_calls в историю
        currentMessages.push({
          role: 'assistant',
          content: iterationContent || null,
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        });
        console.log(`[AgentLoop] 📝 Added assistant msg with ${toolCalls.length} tool_call(s) to history`);

        // Добавляем tool_results
        for (const r of results) {
          currentMessages.push({
            role: 'tool',
            tool_call_id: r.toolCallId,
            content: r.content,
          });
        }
        console.log(`[AgentLoop] 📝 Added ${results.length} tool_result(s) to history, totalMessages=${currentMessages.length}`);

        // Инкрементируем индекс и очищаем буферы для следующей итерации
        useStreamingStore.getState().nextIteration();
      }

      console.log(`[AgentLoop] 🏁 LOOP ENDED`);
      // Финальный коммит
      flushContent();
      flushReasoning();
      abortRef.current = null;
      useStreamingStore.getState().commitToStore();
      isLoadingRef.current = false;
      setIsLoading(false);
      autoFollowRef.current = false;

      // Генерация заголовка
      const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
      const final = conv?.messages.find((m) => m.id === aiMsg.id);
      const nonSystemMessages = conv?.messages.filter((m) => m.role !== 'system') ?? [];
      if (final && conv?.title === 'Новый чат' && conv?.titleGenerated === false && nonSystemMessages.length <= 2) {
        try {
          const chatHistory = conv.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({ role: m.role, content: m.content }));
          const availableModels = useSettingsStore.getState().models;
          const result = await generateChatTitle(
            { baseUrl, apiKey, model, systemPrompt },
            chatHistory,
            availableModels
          );
          if (result?.title) {
            updateConversationTitle(convId, result.title);
          } else {
            updateConversationTitle(convId, text.slice(0, 40) || 'Новый чат');
          }
        } catch (e) {
          updateConversationTitle(convId, text.slice(0, 40) || 'Новый чат');
        }
      }
    } catch (e: any) {
      flushContent();
      flushReasoning();
      abortRef.current = null;
      useStreamingStore.getState().appendContent(`\n\n⚠️ ${e?.message || 'Ошибка'}`);
      useStreamingStore.getState().commitToStore();
      isLoadingRef.current = false;
      setIsLoading(false);
      autoFollowRef.current = false;
    }
  }, [inputValue, isLoading, apiKey, baseUrl, model, systemPrompt, customSystemPrompt, instructionsEnabled, instructions, activeConversationId, pendingAttachments, createConversation, addMessage, updateMessageContent, updateMessageReasoning, updateConversationTitle]);

  const handleNewChat = useCallback(() => {
    const currentConv = conversations.find((c) => c.id === activeConversationId);
    const hasUserMessages = currentConv?.messages.some((m) => m.role === 'user');
    if (!hasUserMessages) {
      setShowDrawer(false);
      return;
    }
    chatHistoryRef.current = [];
    createConversation(systemPrompt);
    setShowDrawer(false);
  }, [createConversation, systemPrompt, activeConversationId, conversations]);

  const handleStop = useCallback(() => {
    abortAgentRef.current.aborted = true;  // Прерываем agent loop
    abortRef.current?.();                    // Прерываем текущий запрос
    abortRef.current = null;
    useStreamingStore.getState().cancelStreaming();
    isLoadingRef.current = false;
    setIsLoading(false);
    autoFollowRef.current = false;
  }, []);

  const handleRegenerate = useCallback((msgId: string) => {
    if (isLoadingRef.current) {
      abortAgentRef.current.aborted = true;
      abortRef.current?.();
      abortRef.current = null;
      useStreamingStore.getState().cancelStreaming();
      isLoadingRef.current = false;
      setIsLoading(false);
      autoFollowRef.current = false;
    }
    const convId = activeConversationId;
    if (!convId) return;
    const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
    if (!conv) return;

    // Находим индекс AI-сообщения и удаляем его и все последующие
    const msgIndex = conv.messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;

    const messagesToRemove = conv.messages.slice(msgIndex).map((m) => m.id);
    for (const id of messagesToRemove) {
      removeMessage(convId, id);
    }

    // Обновляем chatHistoryRef — убираем удалённые сообщения
    const remaining = conv.messages.slice(0, msgIndex);
    chatHistoryRef.current = remaining
      .filter((m) => m.role !== 'system' && (m.content.length > 0 || (m.attachments && m.attachments.length > 0)))
      .map((m) => ({ role: m.role, content: m.content }));

    // Создаём новое AI-сообщение и запускаем agent loop
    const aiMsg = addMessage(convId, { conversationId: convId, role: 'assistant', content: '' });
    useStreamingStore.getState().startStreaming(convId, aiMsg.id);
    isLoadingRef.current = true;
    setIsLoading(true);
    autoFollowRef.current = true;
    abortAgentRef.current = { aborted: false };

    let contentRaf: ReturnType<typeof requestAnimationFrame> | null = null;
    let reasoningRaf: ReturnType<typeof requestAnimationFrame> | null = null;
    let pendingContent = '';
    let pendingReasoning = '';

    const flushContent = () => {
      contentRaf = null;
      if (pendingContent) {
        useStreamingStore.getState().appendContent(pendingContent);
        pendingContent = '';
      }
    };
    const flushReasoning = () => {
      reasoningRaf = null;
      if (pendingReasoning) {
        useStreamingStore.getState().appendReasoning(pendingReasoning);
        pendingReasoning = '';
      }
    };

    const config = { baseUrl, apiKey, model, systemPrompt, customSystemPrompt, instructionsEnabled, instructions };

    const runRegenerate = async () => {
      try {
        let currentMessages: ChatMessage[] = [
          ...chatHistoryRef.current.map((m) => ({ role: m.role as any, content: m.content })),
        ];
        const tools = getAllToolDefinitions();
        let isFirstIteration = true;

        while (!abortAgentRef.current.aborted) {
          let iterationContent = '';
          const toolCalls: ToolCall[] = [];
          let finishReason: string | undefined;

          if (!isFirstIteration) {
            useStreamingStore.getState().resumeStreaming(convId, aiMsg.id);
          }
          isFirstIteration = false;

          await new Promise<void>((resolve, reject) => {
            const { abort } = streamChatCompletion(
              config,
              currentMessages,
              (chunk) => {
                iterationContent += chunk;
                pendingContent += chunk;
                if (!contentRaf) contentRaf = requestAnimationFrame(flushContent);
                if (autoFollowRef.current) scheduleScrollToEnd();
              },
              (error) => { reject(new Error(error)); },
              (fr) => { finishReason = fr; resolve(); },
              undefined,
              (r) => {
                pendingReasoning += r;
                if (!reasoningRaf) reasoningRaf = requestAnimationFrame(flushReasoning);
                if (autoFollowRef.current) scheduleScrollToEnd();
              },
              (toolCall) => { toolCalls.push(toolCall); },
              tools.length > 0 ? tools : undefined,
            );
            abortRef.current = abort;
          });

          if (toolCalls.length === 0 || abortAgentRef.current.aborted) break;

          // Создаём ToolCallDisplay[] со статусом 'pending' для UI
          const initialDisplays: ToolCallDisplay[] = toolCalls.map((tc) => {
            let args: Record<string, unknown>;
            try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
            return {
              id: tc.id,
              name: tc.function.name,
              args,
              status: 'pending' as const,
              startedAt: Date.now(),
              category: getToolCategory(tc.function.name),
            };
          });

          updateMessageToolCalls(convId!, aiMsg.id, initialDisplays);

          const updateSingleDisplay = (index: number, patch: Partial<ToolCallDisplay>) => {
            useChatStore.setState((state) => ({
              conversations: state.conversations.map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === aiMsg.id
                          ? {
                              ...m,
                              toolCallDisplays: (m.toolCallDisplays ?? initialDisplays).map(
                                (d: ToolCallDisplay, i: number) => i === index ? { ...d, ...patch } : d
                              ),
                            }
                          : m
                      ),
                      updatedAt: Date.now(),
                    }
                  : c
              ),
            }));
          };

          const execPromises = toolCalls.map(async (tc, index) => {
            let args: Record<string, unknown>;
            try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

            updateSingleDisplay(index, { status: 'running' });
            const result = await executeTool(tc.function.name, args);
            updateSingleDisplay(index, {
              status: result.success ? 'completed' : 'error',
              result: result.result,
              error: result.error,
              finishedAt: Date.now(),
              category: result.category,
            });

            return { toolCallId: tc.id, content: result.success ? result.result : `Error: ${result.error}` };
          });
          const results = await Promise.all(execPromises);

          flushContent();
          flushReasoning();
          useStreamingStore.getState().commitContentOnly();

          currentMessages.push({
            role: 'assistant',
            content: iterationContent || null,
            tool_calls: toolCalls.map(tc => ({
              id: tc.id, type: 'function' as const,
              function: { name: tc.function.name, arguments: tc.function.arguments },
            })),
          });
          for (const r of results) {
            currentMessages.push({ role: 'tool', tool_call_id: r.toolCallId, content: r.content });
          }
          // Инкрементируем индекс и очищаем буферы для следующей итерации
          useStreamingStore.getState().nextIteration();
        }

        flushContent();
        flushReasoning();
        abortRef.current = null;
        useStreamingStore.getState().commitToStore();
        isLoadingRef.current = false;
        setIsLoading(false);
        autoFollowRef.current = false;
      } catch (e: any) {
        flushContent();
        flushReasoning();
        abortRef.current = null;
        useStreamingStore.getState().appendContent(`\n\n⚠️ ${e?.message || 'Ошибка'}`);
        useStreamingStore.getState().commitToStore();
        isLoadingRef.current = false;
        setIsLoading(false);
        autoFollowRef.current = false;
      }
    };

    runRegenerate();
  }, [activeConversationId, isLoading, apiKey, baseUrl, model, systemPrompt, customSystemPrompt, instructionsEnabled, instructions, removeMessage, addMessage, updateMessageContent, updateMessageReasoning]);

  const handleEdit = useCallback((msgId: string) => {
    if (isLoadingRef.current) {
      abortAgentRef.current.aborted = true;
      abortRef.current?.();
      abortRef.current = null;
      useStreamingStore.getState().cancelStreaming();
      isLoadingRef.current = false;
      setIsLoading(false);
      autoFollowRef.current = false;
    }
    const convId = activeConversationId;
    if (!convId) return;
    const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
    if (!conv) return;

    // Находим редактируемое сообщение
    const msgIndex = conv.messages.findIndex((m) => m.id === msgId);
    if (msgIndex === -1) return;

    const editMsg = conv.messages[msgIndex];
    const editText = editMsg.content;

    // Удаляем это сообщение и все последующие
    const messagesToRemove = conv.messages.slice(msgIndex).map((m) => m.id);
    for (const id of messagesToRemove) {
      removeMessage(convId, id);
    }

    // Обновляем chatHistoryRef
    const remaining = conv.messages.slice(0, msgIndex);
    chatHistoryRef.current = remaining
      .filter((m) => m.role !== 'system' && (m.content.length > 0 || (m.attachments && m.attachments.length > 0)))
      .map((m) => ({ role: m.role, content: m.content }));

    // Помещаем текст в поле ввода
    setInputValue(editText);
  }, [activeConversationId, isLoading, removeMessage]);

  const handleSelectChat = useCallback((id: string) => {
    // Прервать стриминг при переключении чата, чтобы не записать данные в неправильный чат
    if (isLoadingRef.current) {
      abortAgentRef.current.aborted = true;
      abortRef.current?.();
      abortRef.current = null;
      useStreamingStore.getState().cancelStreaming();
      isLoadingRef.current = false;
      setIsLoading(false);
      autoFollowRef.current = false;
    }
    setActiveConversation(id);
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      chatHistoryRef.current = conv.messages
        .filter((m) => m.role !== 'system' && (m.content.length > 0 || (m.attachments && m.attachments.length > 0)))
        .map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }));
    }
    setShowDrawer(false);
  }, [setActiveConversation, conversations]);

  const handleAttachment = useCallback(async (type: 'photo' | 'file' | 'camera') => {
    setShowMenu(false);

    let newAttachments: Attachment[] = [];
    if (type === 'photo') {
      newAttachments = await pickImage();
    } else if (type === 'camera') {
      newAttachments = await takePhoto();
    } else if (type === 'file') {
      newAttachments = await pickFile();
    }

    if (newAttachments.length > 0) {
      setPendingAttachments((prev) => [...prev, ...newAttachments]);
    }
  }, [pickImage, takePhoto, pickFile]);

  const CHAT_INPUT_HEIGHT = spacing.button;
  const CHAT_INPUT_BOTTOM_PAD = Platform.OS === 'ios' ? Math.max(insets.bottom, spacing.xs) : 30;
  const SCROLL_BTN_OFFSET = spacing.sm;
  const CONTENT_BOTTOM_GAP = spacing.sm;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header onMenuPress={() => setShowDrawer(true)} onNewChat={handleNewChat} modelDropdownRef={modelDropdownRef} />

      <View style={[styles.flex, { marginBottom: kbHeight }]} {...drawerResponder.panHandlers}>
        <ScrollView
          ref={scrollRef}
          style={styles.content}
          contentContainerStyle={[styles.contentInner, { paddingBottom: CONTENT_BOTTOM_GAP + CHAT_INPUT_HEIGHT + CHAT_INPUT_BOTTOM_PAD }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollEndDrag={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            lastOffsetY.current = contentOffset.y;
            lastLayoutH.current = layoutMeasurement.height;
            const atBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
            isAtBottomRef.current = atBottom;
            setShowScrollBtn(!atBottom);
            if (!atBottom && autoFollowRef.current) {
              autoFollowRef.current = false;
            }
          }}
          onMomentumScrollEnd={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            lastOffsetY.current = contentOffset.y;
            lastLayoutH.current = layoutMeasurement.height;
            const atBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
            isAtBottomRef.current = atBottom;
            setShowScrollBtn(!atBottom);
            if (!atBottom && autoFollowRef.current) {
              autoFollowRef.current = false;
            }
          }}
          onContentSizeChange={(_w, h) => {
            if (lastLayoutH.current === 0 && lastOffsetY.current === 0) return;
            const atBottom = lastLayoutH.current + lastOffsetY.current >= h - 50;
            if (!atBottom) {
              setShowScrollBtn(true);
            }
          }}
        >
          {!hasMessages ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubble-outline" size={28} color="#8E8E93" />
              </View>
              <Text style={styles.emptyTitle}>Чем могу помочь?</Text>
              <Text style={styles.emptyDesc}>Напишите задачу</Text>
            </View>
          ) : (
            <View style={styles.messages}>
              {messages.map((msg, index) => (
                <MessageBubble
                  key={msg.id}
                  {...msg}
                  isGenerating={isLoading && msg.isAI && index === messages.length - 1}
                  onRegenerate={msg.isAI ? handleRegenerate : undefined}
                  onEdit={msg.isUser ? handleEdit : undefined}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <AttachmentMenu visible={showMenu} onClose={() => setShowMenu(false)} onSelect={handleAttachment} visionEnabled={modelCaps[model]?.vision !== false} />

        {showScrollBtn ? (
          <View style={[styles.scrollBtnWrap, { bottom: CONTENT_BOTTOM_GAP + CHAT_INPUT_HEIGHT + CHAT_INPUT_BOTTOM_PAD + SCROLL_BTN_OFFSET }]}>
            <Pressable
              style={styles.scrollBtn}
              onPress={handleScrollBtn}
              android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}
            >
              <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.inputOverlay}>
          <AttachmentPreview
            attachments={pendingAttachments}
            onRemove={(id) => setPendingAttachments((prev) => prev.filter((a) => a.id !== id))}
          />
          <ChatInput
            value={inputValue}
            onChangeText={setInputValue}
            onSend={handleSend}
            onAttachment={() => setShowMenu(!showMenu)}
            onStop={handleStop}
            disabled={isLoading}
            hasAttachments={pendingAttachments.length > 0}
          />
        </View>
      </View>

      <Drawer
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        onOpenSettings={() => { setShowDrawer(false); router.push('/settings'); }}
        chats={conversations.map((c) => ({ id: c.id, title: c.title, titleGenerated: c.titleGenerated }))}
        activeChatId={activeConversationId ?? 'new'}
        onSelectChat={(id) => handleSelectChat(id)}
        onDeleteChat={(id) => deleteConversation(id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1, backgroundColor: '#000000' },
  content: { flex: 1, backgroundColor: '#000000' },
  contentInner: { flexGrow: 1, paddingHorizontal: spacing.lg, backgroundColor: '#000000' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg, marginBottom: 60 },
  emptyIcon: { width: 56, height: 56, borderRadius: radius.xl, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: typography['2xl'].fontSize, fontWeight: '600', color: '#FFFFFF' },
  emptyDesc: { fontSize: typography.lg.fontSize, color: '#8E8E93', textAlign: 'center', lineHeight: 24 },
  messages: { paddingVertical: spacing.lg },
  inputOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollBtnWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  scrollBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
});
