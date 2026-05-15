import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { spacing, radius, typography } from '../design/theme';
import type { Attachment } from '@/src/types';
import FullscreenImageViewer from './FullscreenImageViewer';

interface MessageBubbleProps {
  text: string;
  reasoning?: string;
  isUser?: boolean;
  isAI?: boolean;
  attachments?: Attachment[];
}

export default function MessageBubble({ text, reasoning, isUser, isAI, attachments }: MessageBubbleProps) {
  const [showReasoning, setShowReasoning] = useState(true);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const imageMaxWidth = Math.min(250, screenWidth * 0.65);

  const renderAttachments = () => {
    if (!attachments || attachments.length === 0) return null;

    return (
      <View style={[styles.attachmentsWrap, text ? styles.attachmentsWithText : null]}>
        {attachments.map((att) =>
          att.type === 'image' ? (
            <TouchableOpacity
              key={att.id}
              activeOpacity={0.9}
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
            </TouchableOpacity>
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

  return (
    <View style={isUser ? styles.userBubble : styles.aiContainer}>
      {isUser ? (
        <>
          {renderAttachments()}
          {text ? <Text style={styles.userText}>{text}</Text> : null}
        </>
      ) : (
        <>
          {reasoning ? (
            <View style={styles.reasoningWrapper}>
              <TouchableOpacity
                style={styles.reasoningToggle}
                onPress={() => setShowReasoning((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={styles.reasoningToggleText}>Размышление</Text>
                <Ionicons
                  name={showReasoning ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color="#8E8E93"
                />
              </TouchableOpacity>

              {showReasoning ? (
                <View style={styles.reasoningBlock}>
                  <Text style={styles.reasoningText}>{reasoning}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {renderAttachments()}

          {text ? (
            <View style={styles.markdownWrap}>
              <Markdown style={markdownStyles}>{text}</Markdown>
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

const styles = StyleSheet.create({
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
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
});
