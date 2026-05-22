import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { spacing, radius, typography } from '@/src/design/theme';

interface Environment {
  id: string;
  chatTitle: string;
  status: 'active' | 'frozen';
  diskUsageMb: number;
  createdAt: number;
}

export default function SandboxEnvironmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [environments, setEnvironments] = useState<Environment[]>([]);

  const handleDelete = useCallback((env: Environment) => {
    Alert.alert(
      'Удалить среду?',
      `Среда чата «${env.chatTitle}» будет удалена. Это действие нельзя отменить.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            setEnvironments((prev) => prev.filter((e) => e.id !== env.id));
          },
        },
      ]
    );
  }, []);

  const handleFreeze = useCallback((env: Environment) => {
    setEnvironments((prev) =>
      prev.map((e) =>
        e.id === env.id
          ? { ...e, status: e.status === 'active' ? 'frozen' : 'active' }
          : e
      )
    );
  }, []);

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
        <Text style={styles.navTitle}>Среды чатов</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {environments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={48} color="#3A3A3C" />
            <Text style={styles.emptyTitle}>Нет сред</Text>
            <Text style={styles.emptyDesc}>
              Среды создаются автоматически при использовании инструментов агента в чатах
            </Text>
          </View>
        ) : (
          environments.map((env) => (
            <View key={env.id} style={styles.envCard}>
              <View style={styles.envHeader}>
                <View style={[styles.statusDot, { backgroundColor: env.status === 'active' ? '#30D158' : '#8E8E93' }]} />
                <Text style={styles.envTitle}>{env.chatTitle}</Text>
              </View>

              <View style={styles.envMeta}>
                <Text style={styles.envMetaText}>
                  {env.status === 'active' ? 'Активна' : 'Заморожена'}
                </Text>
                <Text style={styles.envMetaText}>{env.diskUsageMb} MB</Text>
              </View>

              <View style={styles.envActions}>
                <Pressable
                  style={styles.envActionBtn}
                  onPress={() => handleFreeze(env)}
                  android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
                >
                  <Ionicons
                    name={env.status === 'active' ? 'snow-outline' : 'play-outline'}
                    size={18}
                    color="#007AFF"
                  />
                  <Text style={styles.envActionText}>
                    {env.status === 'active' ? 'Заморозить' : 'Разморозить'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.envActionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(env)}
                  android_ripple={{ color: 'rgba(255,69,58,0.2)' }}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF453A" />
                  <Text style={[styles.envActionText, { color: '#FF453A' }]}>Удалить</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  nav: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  navBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: typography.lg.fontSize, fontWeight: '600', color: '#FFFFFF' },
  content: { flex: 1 },
  scrollContent: { padding: spacing.xl, gap: spacing.md },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: spacing.md },
  emptyTitle: { fontSize: typography.xl.fontSize, fontWeight: '600', color: '#8E8E93' },
  emptyDesc: { fontSize: typography.base.fontSize, color: '#636366', textAlign: 'center', maxWidth: 260 },
  envCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  envHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  envTitle: { fontSize: typography.base.fontSize, fontWeight: '500', color: '#FFFFFF', flex: 1 },
  envMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  envMetaText: { fontSize: typography.sm.fontSize, color: '#8E8E93' },
  envActions: { flexDirection: 'row', gap: spacing.md, borderTopColor: '#2C2C2E', borderTopWidth: 1, paddingTop: spacing.md },
  envActionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  envActionText: { fontSize: typography.sm.fontSize, fontWeight: '500', color: '#007AFF' },
  deleteBtn: {},
});