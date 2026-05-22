import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import type { ToolCallDisplay, ToolCallStatus } from '@/src/types';
import { toolCallColors, toolCategoryIcons, spacing, radius, typography } from '@/src/design/theme';

interface ToolCallBubbleProps {
  display: ToolCallDisplay;
  category?: string;
}

const statusIcons: Record<ToolCallStatus, { name: string; color: string }> = {
  pending: { name: 'ellipse-outline', color: toolCallColors.iconPending },
  running: { name: 'sync-outline', color: toolCallColors.iconRunning },
  completed: { name: 'checkmark-circle', color: toolCallColors.iconDone },
  error: { name: 'close-circle', color: toolCallColors.iconError },
};

const statusLabels: Record<ToolCallStatus, string> = {
  pending: 'Ожидание...',
  running: 'Выполняется...',
  completed: 'Выполнено',
  error: 'Ошибка',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function ToolCallBubble({ display, category = 'sandbox' }: ToolCallBubbleProps) {
  const [expanded, setExpanded] = useState(true);
  const effectiveCategory = display.category || category;
  const statusIcon = statusIcons[display.status];
  const categoryIcon = toolCategoryIcons[effectiveCategory] || 'construct-outline';
  const duration = display.finishedAt ? display.finishedAt - display.startedAt : 0;

  const resultText = display.result
    ? display.result.length > 500
      ? display.result.slice(0, 500) + '...'
      : display.result
    : null;

  const errorText = display.error
    ? display.error.length > 200
      ? display.error.slice(0, 200) + '...'
      : display.error
    : null;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
      {/* Header */}
      <Pressable
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
      >
        <Ionicons name={categoryIcon as any} size={16} color={statusIcon.color} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {display.name}
        </Text>
        <Ionicons
          name={statusIcon.name as any}
          size={16}
          color={statusIcon.color}
        />
        {display.status === 'completed' && duration > 0 && (
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
        )}
        <Ionicons
          name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={14}
          color={toolCallColors.textSecondary}
        />
      </Pressable>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.body}>
          {/* Arguments */}
          {Object.keys(display.args).length > 0 && (
            <View style={styles.argsBlock}>
              {Object.entries(display.args).map(([key, value]) => (
                <Text key={key} style={styles.argLine} numberOfLines={2}>
                  <Text style={styles.argKey}>{key}:</Text>{' '}
                  <Text style={styles.argValue}>
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </Text>
                </Text>
              ))}
            </View>
          )}

          {/* Result */}
          {resultText && (
            <ScrollView style={styles.resultScroll} nestedScrollEnabled>
              <Text style={display.status === 'error' ? styles.errorText : styles.resultText}>
                {errorText || resultText}
              </Text>
            </ScrollView>
          )}

          {/* Status line */}
          <View style={styles.statusLine}>
            <Ionicons name={statusIcon.name as any} size={12} color={statusIcon.color} />
            <Text style={[styles.statusText, { color: statusIcon.color }]}>
              {statusLabels[display.status]}
              {display.status === 'completed' && duration > 0 && ` (${formatDuration(duration)})`}
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: toolCallColors.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: toolCallColors.border,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: toolCallColors.headerBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sm.fontSize,
    fontWeight: '500',
    color: toolCallColors.textPrimary,
  },
  duration: {
    fontSize: typography.xs.fontSize,
    color: toolCallColors.textSecondary,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  argsBlock: {
    backgroundColor: toolCallColors.codeBg,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 2,
  },
  argLine: {
    fontSize: typography.xs.fontSize,
    fontFamily: 'monospace',
    color: toolCallColors.codeText,
  },
  argKey: {
    fontWeight: '600',
    color: toolCallColors.textSecondary,
  },
  argValue: {
    color: toolCallColors.codeText,
  },
  resultScroll: {
    maxHeight: 200,
    backgroundColor: toolCallColors.codeBg,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  resultText: {
    fontSize: typography.xs.fontSize,
    fontFamily: 'monospace',
    color: toolCallColors.codeText,
  },
  errorText: {
    fontSize: typography.xs.fontSize,
    fontFamily: 'monospace',
    color: toolCallColors.iconError,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: typography.xs.fontSize,
  },
});