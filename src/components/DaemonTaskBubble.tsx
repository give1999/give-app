import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { DaemonTask } from '@/src/types';
import { daemonTaskColors, spacing, radius, typography } from '@/src/design/theme';

interface DaemonTaskBubbleProps {
  task: DaemonTask;
  onCancel?: (taskId: string) => void;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes > 0) return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  return `${seconds}s`;
}

export default function DaemonTaskBubble({ task, onCancel }: DaemonTaskBubbleProps) {
  const isRunning = task.status === 'running';
  const isCompleted = task.status === 'completed';
  const isError = task.status === 'error';

  const statusIcon = isCompleted
    ? 'checkmark-circle'
    : isError
    ? 'close-circle'
    : 'time-outline';

  const statusColor = isCompleted
    ? daemonTaskColors.progressFill
    : isError
    ? daemonTaskColors.buttonDanger
    : daemonTaskColors.textSecondary;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name={statusIcon as any} size={16} color={statusColor} />
        <Text style={styles.headerTitle}>
          {isCompleted ? 'Фоновое задание завершено' : isError ? 'Фоновое задание — ошибка' : 'Фоновое задание'}
        </Text>
      </View>

      {/* Task info */}
      <View style={styles.body}>
        <Text style={styles.commandText} numberOfLines={2}>
          {task.command}
        </Text>

        {/* Progress indicator for running tasks */}
        {isRunning && (
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color={daemonTaskColors.progressFill} />
            <Text style={styles.progressText}>Выполняется...</Text>
          </View>
        )}

        {/* Result for completed tasks */}
        {isCompleted && task.result && (
          <View style={styles.resultBlock}>
            <Text style={styles.resultText} numberOfLines={3}>
              {task.result.stdout?.slice(0, 200) || 'Готово'}
            </Text>
            {task.result.durationMs > 0 && (
              <Text style={styles.durationText}>
                Время: {formatDuration(task.result.durationMs)}
              </Text>
            )}
          </View>
        )}

        {/* Error */}
        {isError && task.error && (
          <Text style={styles.errorText} numberOfLines={2}>
            {task.error}
          </Text>
        )}

        {/* Actions */}
        {(isRunning || task.status === 'pending') && onCancel && (
          <Pressable
            style={styles.cancelBtn}
            onPress={() => onCancel(task.id)}
            android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
          >
            <Ionicons name="close-circle-outline" size={14} color={daemonTaskColors.buttonDanger} />
            <Text style={styles.cancelBtnText}>Отменить</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: daemonTaskColors.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: daemonTaskColors.border,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sm.fontSize,
    fontWeight: '500',
    color: daemonTaskColors.textPrimary,
  },
  body: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  commandText: {
    fontSize: typography.xs.fontSize,
    fontFamily: 'monospace',
    color: daemonTaskColors.textSecondary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressText: {
    fontSize: typography.xs.fontSize,
    color: daemonTaskColors.textSecondary,
  },
  resultBlock: {
    gap: spacing.xs,
  },
  resultText: {
    fontSize: typography.xs.fontSize,
    fontFamily: 'monospace',
    color: '#30D158',
  },
  durationText: {
    fontSize: typography.xs.fontSize,
    color: daemonTaskColors.textSecondary,
  },
  errorText: {
    fontSize: typography.xs.fontSize,
    color: daemonTaskColors.buttonDanger,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  cancelBtnText: {
    fontSize: typography.xs.fontSize,
    color: daemonTaskColors.buttonDanger,
  },
});