import React, { useState, useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Pressable, Image, useWindowDimensions, Clipboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';
import { spacing, radius, typography } from '../design/theme';
import type { Attachment, ToolCallDisplay, AgentIteration } from '@/src/types';
import FullscreenImageViewer from './FullscreenImageViewer';
import ReasoningTicker from './ReasoningTicker';
import ToolCallBubble from './ToolCallBubble';

interface MessageBubbleProps {
  id: string;
  text: string;
  reasoning?: string;
  isUser?: boolean;
  isAI?: boolean;
  attachments?: Attachment[];
  isGenerating?: boolean;
  toolCallDisplays?: ToolCallDisplay[];
  agentIterations?: AgentIteration[];
  streamingReasoning?: string;
  onRegenerate?: (id: string) => void;
  onEdit?: (id: string) => void;
}

function MessageBubbleInner({ id, text, reasoning, isUser, isAI, attachments, isGenerating, toolCallDisplays, agentIterations, streamingReasoning, onRegenerate, onEdit }: MessageBubbleProps) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const copyAnim = useSharedValue(0); // 0 = обычная иконка, 1 = галочка
  const actionsHeight = useSharedValue(0);
  const actionsOpacity = useSharedValue(0);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const imageMaxWidth = Math.min(250, screenWidth * 0.65);

  const toggleActions = () => {
    if (showActions) {
      actionsHeight.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) });
      actionsOpacity.value = withTiming(0, { duration: 150 });
      setShowActions(false);
    } else {
      setShowActions(true);
      actionsHeight.value = withTiming(28, { duration: 250, easing: Easing.out(Easing.cubic) });
      actionsOpacity.value = withTiming(1, { duration: 200 });
    }
  };

  const actionsAnimatedStyle = useAnimatedStyle(() => ({
    height: actionsHeight.value,
    opacity: actionsOpacity.value,
    overflow: 'hidden',
    marginTop: actionsHeight.value > 0 ? spacing.xs : 0,
  }));

  const copyIconStyle = useAnimatedStyle(() => ({
    color: copyAnim.value === 0 ? '#8E8E93' : '#FFFFFF',
    transform: [{ scale: 1 + copyAnim.value * 0.2 }],
  }));

  const renderAttachments = () => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <View style={[styles.attachmentsWrap, text ? styles.attachmentsWithText : null]}>
        {attachments.map((att) =>
          att.type === 'image' ? (
            <Pressable
              key={att.id}
              android_ripple={{ color: 'rgba(255,255,255,0.06)', borderless: true }}
              onPress={() => setViewerImage(att.uri)}
            >
              <Image
                source={{ uri: att.uri }}
                style={[
                  { width: imageMaxWidth, height: imageMaxWidth * 0.75, borderRadius: radius.lg, backgroundColor: '#2C2C2E' },
                  att.width && att.height
                    ? { aspectRatio: att.width / att.height }
                    : undefined,
                ]}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <View key={att.id} style={[styles.fileCard, { maxWidth: imageMaxWidth }]}>
              <View style={styles.fileIconBox}>
                <Ionicons name="document-outline" size={24} color="#8E8E93" />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>{att.name}</Text>
                {att.size != null && (
                  <Text style={styles.fileSize}>{formatSize(att.size)}</Text>
                )}
              </View>
            </View>
          ),
        )}
      </View>
    );
  };

  const handleCopy = () => {
    Clipboard.setString(text);
    setCopied(true);
    copyAnim.value = withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 800 }),
      withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }),
    );
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1300);
  };

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  return (
    <View style={isUser ? styles.userBubble : styles.aiContainer}>
      {isUser ? (
        <Pressable
          android_ripple={{ color: 'rgba(255,255,255,0.08)', borderless: false }}
          onPress={toggleActions}
          style={styles.userBubbleInner}
        >
          {renderAttachments()}
          {text ? <Text style={styles.userText}>{text}</Text> : null}
          <Animated.View style={[styles.actionsRow, actionsAnimatedStyle]} pointerEvents={showActions ? 'auto' : 'none'}>
            <Pressable style={styles.actionBtn} onPress={handleCopy} android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}>
              <Animated.View style={copyIconStyle}>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#FFFFFF' : '#8E8E93'} />
              </Animated.View>
            </Pressable>
            {onEdit ? (
              <Pressable style={styles.actionBtn} onPress={() => onEdit?.(id)} android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}>
                <Ionicons name="create-outline" size={16} color="#8E8E93" />
              </Pressable>
            ) : null}
          </Animated.View>
        </Pressable>
      ) : (
        <>
          {isAI ? (
            <View style={styles.timelineContainer}>
              {(() => {
                const events: Array<{
                  id: string;
                  type: 'reasoning' | 'tool' | 'content' | 'final';
                  data: any;
                  isComment?: boolean;
                  isLast: boolean;
                }> = [];

                // 1. Agent iteration events
                agentIterations?.forEach((iter, iterIdx) => {
                  const isLastIter = iterIdx === (agentIterations?.length ?? 0) - 1;
                  if (iter.reasoning) {
                    events.push({ id: `${iter.id}-reasoning`, type: 'reasoning', data: iter.reasoning, isLast: isLastIter });
                  }
                  // Сначала пушим инструменты текущей итерации
                  if (iter.toolCallDisplays) {
                    iter.toolCallDisplays.forEach((tc) => {
                      events.push({ id: `${iter.id}-tool-${tc.id}`, type: 'tool', data: tc, isLast: isLastIter });
                    });
                  }
                  // Затем пушим текст текущей итерации
                  if (iter.content) {
                    events.push({ id: `${iter.id}-content`, type: 'content', data: iter.content, isComment: true, isLast: isLastIter });
                  }
                });

                // 2. Legacy reasoning (only if no agentIterations)
                if (!agentIterations?.length && reasoning) {
                  events.push({ id: `${id}-reasoning`, type: 'reasoning', data: reasoning, isLast: false });
                }

                // 3. Legacy tool calls (only if no agentIterations)
                if (!agentIterations?.length && toolCallDisplays?.length) {
                  toolCallDisplays.forEach((tc) => {
                    events.push({ id: `${id}-tool-${tc.id}`, type: 'tool', data: tc, isLast: false });
                  });
                }

                // 4. Streaming reasoning
                if (streamingReasoning) {
                  events.push({ id: 'streaming-reasoning', type: 'reasoning', data: streamingReasoning, isLast: true });
                }

                // 5. Final answer text
                if (text) {
                  events.push({ id: `${id}-final`, type: 'final', data: text, isLast: true });
                }

                return events.map((evt, evtIdx) => (
                  <View key={evt.id} style={styles.timelineItem}>
                    <View style={styles.timelineLine}>
                      <View style={[styles.timelineDot, evtIdx === events.length - 1 && isGenerating && styles.timelineDotActive]} />
                      {evtIdx < events.length - 1 && <View style={styles.timelineConnector} />}
                    </View>

                    <View style={styles.timelineContent}>
                      {evt.type === 'reasoning' && (
                        <View style={styles.timelineStep}>
                          {evt.id === 'streaming-reasoning' ? (
                            <ReasoningTicker reasoning={evt.data} isGenerating={true} />
                          ) : showReasoning ? (
                            <>
                              <Pressable
                                style={styles.reasoningToggle}
                                onPress={() => setShowReasoning(false)}
                                android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}
                              >
                                <Text style={styles.reasoningToggleText}>Размышление</Text>
                                <Ionicons name="chevron-down" size={16} color="#8E8E93" />
                              </Pressable>
                              <View style={styles.reasoningBlock}>
                                <Markdown style={reasoningMarkdownStyles}>{evt.data.replace(/^\s*<think>\s*/i, '')}</Markdown>
                              </View>
                            </>
                          ) : (
                            <Pressable
                              style={styles.reasoningToggle}
                              onPress={() => setShowReasoning(true)}
                              android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}
                            >
                              <Text style={styles.reasoningToggleText}>Размышление</Text>
                              <Ionicons name="chevron-up" size={16} color="#8E8E93" style={{ marginLeft: 6 }} />
                            </Pressable>
                          )}
                        </View>
                      )}

                      {evt.type === 'tool' && (
                        <View style={styles.timelineStep}>
                          <ToolCallBubble display={evt.data} category={evt.data.category || 'sandbox'} />
                        </View>
                      )}

                      {evt.type === 'content' && (
                        <View style={[styles.timelineStep, styles.timelineComment]}>
                          <View style={styles.markdownWrap}>
                            <Markdown style={markdownStyles}>{evt.data.replace(/\*$/g, '\\*')}</Markdown>
                          </View>
                        </View>
                      )}

                      {evt.type === 'final' && (
                        <View style={styles.timelineStep}>
                          <View style={styles.markdownWrap}>
                            <Markdown style={markdownStyles}>{evt.data.replace(/\*$/g, '\\*')}</Markdown>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                ));
              })()}
            </View>
          ) : null}

          {isAI && !isGenerating ? (
            <View style={styles.actionsRow}>
              {text ? (
                <Pressable style={styles.actionBtn} onPress={handleCopy} android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}>
                  <Animated.View style={copyIconStyle}>
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#FFFFFF' : '#8E8E93'} />
                  </Animated.View>
                </Pressable>
              ) : null}
              {onRegenerate ? (
                <Pressable style={styles.actionBtn} onPress={() => onRegenerate?.(id)} android_ripple={{ color: 'rgba(255,255,255,0.12)', borderless: true }}>
                  <Ionicons name="refresh" size={16} color="#8E8E93" />
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </>
      )}

      <FullscreenImageViewer uri={viewerImage} onClose={() => setViewerImage(null)} />
    </View>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MessageBubble = memo(MessageBubbleInner, (prev, next) => {
  if (prev.id !== next.id) return false;
  if (prev.text !== next.text) return false;
  if (prev.reasoning !== next.reasoning) return false;
  if (prev.isUser !== next.isUser) return false;
  if (prev.isAI !== next.isAI) return false;
  if (prev.isGenerating !== next.isGenerating) return false;
  if (prev.streamingReasoning !== next.streamingReasoning) return false;
  // agentIterations compare
  const pai = prev.agentIterations;
  const nai = next.agentIterations;
  if (pai === nai) {
    // same ref or both undefined
  } else if (!pai || !nai || pai.length !== nai.length) {
    return false;
  } else {
    for (let i = 0; i < pai.length; i++) {
      if (pai[i] !== nai[i]) return false;
    }
  }
  // toolCallDisplays shallow compare
  const pd = prev.toolCallDisplays;
  const nd = next.toolCallDisplays;
  if (pd === nd) {
    // ok
  } else if (!pd || !nd || pd.length !== nd.length) {
    return false;
  } else {
    for (let i = 0; i < pd.length; i++) {
      if (pd[i] !== nd[i]) return false;
    }
  }
  // attachments shallow compare
  const pa = prev.attachments;
  const na = next.attachments;
  if (pa === na) {
    // ok
  } else if (!pa || !na || pa.length !== na.length) {
    return false;
  } else {
    for (let i = 0; i < pa.length; i++) {
      if (pa[i] !== na[i]) return false;
    }
  }
  // Skip callback comparison — they're stable now
  return true;
});

export default MessageBubble;

const markdownStyles = {
  body: {
    color: '#FFFFFF',
    fontSize: typography.lg.fontSize,
    lineHeight: typography.lg.lineHeight,
  },
  paragraph: {
    color: '#FFFFFF',
    fontSize: typography.lg.fontSize,
    lineHeight: typography.lg.lineHeight,
    marginTop: 0,
    marginBottom: 8,
  },
  heading1: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  heading3: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  heading4: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
  },
  heading5: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  heading6: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  strong: {
    color: '#FFFFFF',
    fontWeight: 'bold' as const,
  },
  em: {
    color: '#FFFFFF',
    fontStyle: 'italic' as const,
  },
  link: {
    color: '#0A84FF',
    textDecorationLine: 'underline' as const,
  },
  blockquote: {
    backgroundColor: '#1C1C1E',
    borderLeftWidth: 4,
    borderLeftColor: '#8E8E93',
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    color: '#FFFFFF',
    fontSize: typography.lg.fontSize,
    lineHeight: typography.lg.lineHeight,
    marginVertical: 2,
  },
  code_inline: {
    backgroundColor: '#2C2C2E',
    color: '#FF9F0A',
    fontFamily: 'monospace',
    fontSize: typography.lg.fontSize,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: '#1C1C1E',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 14,
    padding: 12,
    borderRadius: radius.md,
    marginVertical: 8,
  },
  fence: {
    backgroundColor: '#1C1C1E',
    color: '#FFFFFF',
    fontFamily: 'monospace',
    fontSize: 14,
    padding: 12,
    borderRadius: radius.md,
    marginVertical: 8,
  },
  hr: {
    backgroundColor: '#38383A',
    height: 1,
    marginVertical: 12,
  },
};

const reasoningMarkdownStyles = {
  body: {
    color: '#A0A0A0',
    fontSize: 15,
    lineHeight: 22,
  },
  paragraph: {
    color: '#A0A0A0',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 0,
    marginBottom: 6,
  },
  heading1: {
    color: '#C0C0C0',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  heading2: {
    color: '#C0C0C0',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  heading3: {
    color: '#C0C0C0',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  heading4: {
    color: '#C0C0C0',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  heading5: {
    color: '#C0C0C0',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
  },
  heading6: {
    color: '#C0C0C0',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
  },
  strong: {
    color: '#B0B0B0',
    fontWeight: 'bold' as const,
  },
  em: {
    color: '#A0A0A0',
    fontStyle: 'italic' as const,
  },
  link: {
    color: '#0A84FF',
    textDecorationLine: 'underline' as const,
  },
  blockquote: {
    backgroundColor: '#1C1C1E',
    borderLeftWidth: 3,
    borderLeftColor: '#8E8E93',
    paddingLeft: 10,
    paddingVertical: 6,
    marginVertical: 6,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    color: '#A0A0A0',
    fontSize: 15,
    lineHeight: 22,
    marginVertical: 2,
  },
  code_inline: {
    backgroundColor: '#2C2C2E',
    color: '#FF9F0A',
    fontFamily: 'monospace',
    fontSize: 14,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: '#1C1C1E',
    color: '#A0A0A0',
    fontFamily: 'monospace',
    fontSize: 13,
    padding: 10,
    borderRadius: radius.md,
    marginVertical: 6,
  },
  fence: {
    backgroundColor: '#1C1C1E',
    color: '#A0A0A0',
    fontFamily: 'monospace',
    fontSize: 13,
    padding: 10,
    borderRadius: radius.md,
    marginVertical: 6,
  },
  hr: {
    backgroundColor: '#38383A',
    height: 1,
    marginVertical: 8,
  },
};

const styles = StyleSheet.create({
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  userBubbleInner: {
    width: '100%',
  },
  userText: {
    color: '#FFFFFF',
    fontSize: typography.lg.fontSize,
    lineHeight: typography.lg.lineHeight,
  },
  aiContainer: {
    alignSelf: 'stretch',
    marginBottom: spacing.md,
  },
  reasoningWrapper: {
    marginBottom: spacing.md,
  },
  reasoningToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  reasoningToggleText: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  reasoningBlock: {
    borderLeftWidth: 2,
    borderLeftColor: '#38383A',
    paddingLeft: 12,
    marginTop: 2,
    alignSelf: 'stretch',
  },
  reasoningText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#A0A0A0',
  },
  markdownWrap: {
    maxWidth: '100%',
  },
  toolCallsContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  streamingText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    padding: 4,
    borderRadius: radius.sm,
  },
  // Attachment styles
  attachmentsWrap: {
    gap: spacing.sm,
  },
  attachmentsWithText: {
    marginBottom: spacing.sm,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#2C2C2E',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  fileIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: typography.base.fontSize,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  fileSize: {
    fontSize: typography.sm.fontSize,
    color: '#8E8E93',
    marginTop: 2,
  },
  // Timeline styles
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineLine: {
    width: 20,
    alignItems: 'center',
    marginRight: 12,
    flexDirection: 'column',
    alignSelf: 'stretch',
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8E8E93',
    marginTop: 6,
  },
  timelineDotActive: {
    backgroundColor: '#30D158',
  },
  timelineConnector: {
    width: 1,
    flex: 1,
    backgroundColor: '#38383A',
    marginTop: 2,
    marginBottom: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineStep: {
    marginBottom: 8,
  },
  timelineComment: {
    opacity: 0.6,
  },
});
