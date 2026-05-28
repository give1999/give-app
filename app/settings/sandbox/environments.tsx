import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { spacing, radius, typography } from '@/src/design/theme';
import { sandboxManager } from '@/src/lib/sandbox/SandboxManager';
import { useChatStore } from '@/src/stores/chatStore';

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
  const [loading, setLoading] = useState(true);

  const loadEnvs = useCallback(async () => {
    try {
      setLoading(true);
      await sandboxManager.initialize();
      const list = await sandboxManager.listEnvironments();
      const conversations = useChatStore.getState().conversations;
      const mapped = list.map((env) => {
        let title = '';
        if (env.conversationId === '_daemon') {
          title = 'Фоновый демон ИИ';
        } else if (env.conversationId === 'default') {
          title = 'Общая среда (по умолчанию)';
        } else {
          const chat = conversations.find((c) => c.id === env.conversationId);
          title = chat ? chat.title : `Чат (${env.conversationId.slice(0, 8)})`;
        }
        return {
          id: env.conversationId,
          chatTitle: title,
          status: env.status,
          diskUsageMb: Math.round((env.diskUsageBytes / 1024 / 1024) * 10) / 10,
          createdAt: env.createdAt,
        };
      });
      setEnvironments(mapped);
    } catch (e) {
      console.error('Failed to load environments:', e);
      Alert.alert('Ошибка', 'Не удалось загрузить список сред');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEnvs();
  }, [loadEnvs]);

  const handleDelete = useCallback((env: Environment) => {
    Alert.alert(
      'Удалить среду?',
      `Среда чата «${env.chatTitle}» будет удалена. Это действие нельзя отменить.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await sandboxManager.deleteEnvironment(env.id);
              await loadEnvs();
            } catch (e) {
              console.error('Failed to delete environment:', e);
              Alert.alert('Ошибка', 'Не удалось удалить среду');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [loadEnvs]);

  const handleFreeze = useCallback(async (env: Environment) => {
    try {
      setLoading(true);
      if (env.status === 'active') {
        await sandboxManager.freezeEnvironment(env.id);
      } else {
        await sandboxManager.setActiveEnvironment(env.id);
      }
      await loadEnvs();
    } catch (e) {
      console.error('Failed to change environment status:', e);
      Alert.alert('Ошибка', 'Не удалось изменить состояние среды');
    } finally {
      setLoading(false);
    }
  }, [loadEnvs]);

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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Загрузка сред...</Text>
          </View>
        ) : environments.length === 0 ? (
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
                <Text style={styles.envTitle} numberOfLines={1} ellipsizeMode="tail">
                  {env.chatTitle}
                </Text>
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
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: spacing.md },
  loadingText: { fontSize: typography.base.fontSize, color: '#8E8E93' },
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
  envActionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flex: 1, justifyContent: 'center' },
  envActionText: { fontSize: typography.sm.fontSize, fontWeight: '500', color: '#007AFF' },
  deleteBtn: {},
});