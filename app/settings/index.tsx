import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { spacing, radius, typography } from '@/src/design/theme';

export default function SettingsIndexScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
        <Text style={styles.navTitle}>Настройки</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/settings/provider')}
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="server-outline" size={22} color="#007AFF" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Настройки</Text>
            <Text style={styles.menuDesc}>API ключ, URL, выбор модели</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/settings/personalization')}
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="person-outline" size={22} color="#007AFF" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Персонализация</Text>
            <Text style={styles.menuDesc}>Инструкции для модели, системный промпт</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/settings/sandbox')}
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
        >
          <View style={styles.menuIcon}>
            <Ionicons name="server-outline" size={22} color="#FF9F0A" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>Агент</Text>
            <Text style={styles.menuDesc}>Песочница, среды, пакеты, фоновая среда</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
        </Pressable>
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
  scrollContent: { padding: spacing.xl, gap: spacing.sm },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,122,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuInfo: { flex: 1 },
  menuTitle: {
    fontSize: typography.base.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  menuDesc: {
    fontSize: typography.sm.fontSize,
    color: '#8E8E93',
  },
});
