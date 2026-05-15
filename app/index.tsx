import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Keyboard, PanResponder, TouchableOpacity, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Header from '@/src/components/Header';
import Drawer from '@/src/components/Drawer';
import ChatInput from '@/src/components/ChatInput';
import AttachmentMenu from '@/src/components/AttachmentMenu';
import AttachmentPreview from '@/src/components/AttachmentPreview';
import MessageBubble from '@/src/components/MessageBubble';
import SettingsScreen from '@/src/screens/SettingsScreen';
import { spacing, radius, typography } from '@/src/design/theme';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { useChatStore } from '@/src/stores/chatStore';
import { useAttachmentPicker } from '@/src/hooks/useAttachmentPicker';
import { streamChatCompletion, generateChatTitle, type ChatMessage } from '@/src/lib/api';
import { buildContent } from '@/src/lib/contentPartBuilders';
import { canSendAttachments } from '@/src/lib/modelCapabilities';
import type { Attachment } from '@/src/types';

interface DisplayMessage {
  id: string;
  text: string;
  reasoning?: string;
  isUser?: boolean;
  isAI?: boolean;
  attachments?: Attachment[];
}

function toDisplayMessages(messages: { id: string; role: string; content: string; reasoning?: string; attachments?: Attachment[] }[]): DisplayMessage[] {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      id: m.id,
      text: m.content,
      reasoning: m.reasoning,
      attachments: m.attachments,
      isUser: m.role === 'user',
      isAI: m.role === 'assistant',
    }));
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [inputValue, setInputValue] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isLoadingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const [kbHeight, setKbHeight] = useState(0);
  const isAtBottomRef = useRef(true);
  const autoFollowRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const lastOffsetY = useRef(0);
  const lastLayoutH = useRef(0);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const { pickImage, takePhoto, pickFile } = useAttachmentPicker();

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

  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const createConversation = useChatStore((s) => s.createConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessageContent = useChatStore((s) => s.updateMessageContent);
  const updateMessageReasoning = useChatStore((s) => s.updateMessageReasoning);
  const updateConversationTitle = useChatStore((s) => s.updateConversationTitle);
  const systemPrompt = useSettingsStore((s) => s.systemPrompt);
  const apiKey = useSettingsStore((s) => s.apiKey);
  const baseUrl = useSettingsStore((s) => s.baseUrl);
  const model = useSettingsStore((s) => s.model);
  const modelCaps = useSettingsStore((s) => s.modelCaps);

  const currentConv = conversations.find((c) => c.id === activeConversationId);
  const hasMessages = !!currentConv && currentConv.messages.some((m) => m.role !== 'system');
  const messages = toDisplayMessages(currentConv?.messages ?? []);
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
      setShowSettings(true);
      return;
    }

    // Проверка совместимости модели с вложениями
    if (hasAttachments && model) {
      const check = canSendAttachments(model, modelCaps, pendingAttachments);
      if (!check.allowed) {
        Alert.alert('Несовместимая модель', check.reason, [
          { text: 'ОК', style: 'default' },
          { text: 'Сменить модель', onPress: () => setShowSettings(true) },
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

    const aiMsg = addMessage(convId, { conversationId: convId, role: 'assistant', content: '' });
    isLoadingRef.current = true;
    setIsLoading(true);

    let accumulated = '';
    let accumulatedReasoning = '';

    try {
      const { parts } = await buildContent(text, sentAttachments);
      const msgs: ChatMessage[] = [
        ...chatHistoryRef.current.map((m) => ({ role: m.role as any, content: m.content })),
        { role: 'user' as const, content: parts },
      ];
      const { abort } = streamChatCompletion(
        { baseUrl, apiKey, model, systemPrompt },
        msgs,
        (chunk) => {
          accumulated += chunk;
          updateMessageContent(convId, aiMsg.id, accumulated);
          if (autoFollowRef.current) {
            scrollRef.current?.scrollToEnd({ animated: false });
          }
        },
        () => { abortRef.current = null; isLoadingRef.current = false; setIsLoading(false); autoFollowRef.current = false; },
        async () => {
          abortRef.current = null;
          isLoadingRef.current = false;
          setIsLoading(false);
          autoFollowRef.current = false;
          const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
          const final = conv?.messages.find((m) => m.id === aiMsg.id);
          console.log('[TitleGen] onDone called. conv?.title:', conv?.title, 'titleGenerated:', conv?.titleGenerated, 'final content length:', final?.content?.length);
          const nonSystemMessages = conv?.messages.filter((m) => m.role !== 'system') ?? [];
          if (final && conv?.title === 'Новый чат' && conv?.titleGenerated === false && nonSystemMessages.length <= 2) {
            try {
              const chatHistory = conv.messages
                .filter((m) => m.role !== 'system')
                .map((m) => ({ role: m.role, content: m.content }));
              const availableModels = useSettingsStore.getState().models;
              console.log('[TitleGen] Calling generateChatTitle with', chatHistory.length, 'messages, models:', availableModels.length);
              const result = await generateChatTitle(
                { baseUrl, apiKey, model, systemPrompt },
                chatHistory,
                availableModels
              );
              console.log('[TitleGen] Result:', result);
              if (result?.title) {
                updateConversationTitle(convId, result.title);
              } else {
                updateConversationTitle(convId, text.slice(0, 40) || 'Новый чат');
              }
            } catch (e) {
              console.log('[TitleGen] Error generating title:', e);
              updateConversationTitle(convId, text.slice(0, 40) || 'Новый чат');
            }
          }
        },
        undefined,
        (reasoning) => {
          accumulatedReasoning += reasoning;
          updateMessageReasoning(convId, aiMsg.id, accumulatedReasoning);
          if (autoFollowRef.current) {
            scrollRef.current?.scrollToEnd({ animated: false });
          }
        },
      );
      abortRef.current = abort;
    } catch {
      isLoadingRef.current = false;
      setIsLoading(false);
      autoFollowRef.current = false;
    }
  }, [inputValue, isLoading, apiKey, baseUrl, model, systemPrompt, activeConversationId, pendingAttachments, createConversation, addMessage, updateMessageContent, updateMessageReasoning, updateConversationTitle]);

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
    abortRef.current?.();
    abortRef.current = null;
    isLoadingRef.current = false;
    setIsLoading(false);
    autoFollowRef.current = false;
  }, []);

  const handleSelectChat = useCallback((id: string) => {
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

  if (showSettings) {
    return <SettingsScreen onClose={() => setShowSettings(false)} />;
  }

  const CHAT_INPUT_HEIGHT = spacing.button;
  const CHAT_INPUT_BOTTOM_PAD = Platform.OS === 'ios' ? Math.max(insets.bottom, spacing.xs) : 30;
  const SCROLL_BTN_OFFSET = spacing.sm;
  const CONTENT_BOTTOM_GAP = spacing.sm;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header onMenuPress={() => setShowDrawer(true)} onNewChat={handleNewChat} />

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
              {messages.map((msg) => <MessageBubble key={msg.id} {...msg} />)}
            </View>
          )}
        </ScrollView>

        <AttachmentMenu visible={showMenu} onClose={() => setShowMenu(false)} onSelect={handleAttachment} visionEnabled={modelCaps[model]?.vision !== false} />

        {showScrollBtn ? (
          <View style={[styles.scrollBtnWrap, { bottom: CONTENT_BOTTOM_GAP + CHAT_INPUT_HEIGHT + CHAT_INPUT_BOTTOM_PAD + SCROLL_BTN_OFFSET }]}>
            <TouchableOpacity
              style={styles.scrollBtn}
              onPress={handleScrollBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
            </TouchableOpacity>
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
        onOpenSettings={() => { setShowDrawer(false); setShowSettings(true); }}
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
  flex: { flex: 1 },
  content: { flex: 1 },
  contentInner: { flexGrow: 1, paddingHorizontal: spacing.lg },
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
