import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { spacing, radius, typography } from '@/src/design/theme';

export default function SystemPromptScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const systemPrompt = useSettingsStore((s) => s.systemPrompt);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <Pressable
          style={styles.navBtn}
          onPress={() => router.back()}
          android_ripple={{ color: 'rgba(255,255,255,0.1)', radius: 24 }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.navTitle}>Системный промпт</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.section}>БАЗОВАЯ ИНСТРУКЦИЯ ДЛЯ AI-МОДЕЛИ</Text>
        <Text style={styles.description}>
          Этот промпт задаёт базовое поведение ассистента. Он зашит в приложение и не может быть изменён.
          {'\n\n'}
          Приоритет системного промпта выше, чем у пользовательских инструкций.
        </Text>

        <View style={styles.card}>
          <Text style={styles.promptText} selectable>
            {systemPrompt}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  nav: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  navBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: typography.lg.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: { flex: 1 },
  scrollContent: { padding: spacing.xl, gap: spacing.lg },
  section: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.sm.fontSize,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  promptText: {
    fontSize: typography.base.fontSize,
    color: '#FFFFFF',
    lineHeight: 24,
  },
});
