import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, typography } from '@/src/design/theme';

interface SandboxErrorScreenProps {
  error: string | null;
  onRetry: () => void;
  onSkip: () => void;
}

export default function SandboxErrorScreen({ error, onRetry, onSkip }: SandboxErrorScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="warning-outline" size={48} color="#FF453A" />
      </View>

      <Text style={styles.title}>Не удалось загрузить среду агента</Text>

      <Text style={styles.errorText}>
        {error || 'Проверьте подключение к интернету'}
      </Text>

      <Pressable
        style={styles.retryBtn}
        onPress={onRetry}
        android_ripple={{ color: 'rgba(0,122,255,0.2)' }}
      >
        <Ionicons name="refresh-outline" size={18} color="#007AFF" />
        <Text style={styles.retryBtnText}>Повторить</Text>
      </Pressable>

      <Pressable
        style={styles.skipBtn}
        onPress={onSkip}
        android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
      >
        <Text style={styles.skipBtnText}>Пропустить (только чат)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,69,58,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.xl.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: typography.base.fontSize,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,122,255,0.15)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  retryBtnText: {
    fontSize: typography.base.fontSize,
    fontWeight: '600',
    color: '#007AFF',
  },
  skipBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  skipBtnText: {
    fontSize: typography.base.fontSize,
    color: '#8E8E93',
  },
});