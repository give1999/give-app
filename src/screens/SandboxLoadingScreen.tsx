import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, typography } from '@/src/design/theme';

interface SandboxLoadingScreenProps {
  progress: number;
}

export default function SandboxLoadingScreen({ progress }: SandboxLoadingScreenProps) {
  const percent = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="terminal-outline" size={48} color="#007AFF" />
      </View>

      <Text style={styles.title}>Подготовка среды агента</Text>

      <View style={styles.progressWrap}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.progressText}>{percent}%</Text>
      </View>

      {progress > 0 && (
        <Text style={styles.statusText}>Скачивание образа Linux...</Text>
      )}

      <Text style={styles.hintText}>
        Это выполняется только один раз
      </Text>

      <ActivityIndicator size="small" color="#007AFF" style={styles.spinner} />
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
    backgroundColor: 'rgba(0,122,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.xl.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  progressWrap: {
    width: '100%',
    maxWidth: 280,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#3A3A3C',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: typography.sm.fontSize,
    color: '#8E8E93',
    textAlign: 'center',
  },
  statusText: {
    fontSize: typography.base.fontSize,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  hintText: {
    fontSize: typography.sm.fontSize,
    color: '#8E8E93',
    textAlign: 'center',
  },
  spinner: {
    marginTop: spacing.lg,
  },
});