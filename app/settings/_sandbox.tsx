import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { spacing, radius, typography } from '@/src/design/theme';
import { useSettingsStore } from '@/src/stores/settingsStore';

export default function SandboxSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const daemonEnabled = useSettingsStore((s) => s.sandboxDaemonEnabled);
  const daemonMode = useSettingsStore((s) => s.sandboxDaemonMode);
  const maxEnvironments = useSettingsStore((s) => s.sandboxMaxEnvironments);
  const maxEnvSizeMb = useSettingsStore((s) => s.sandboxMaxEnvironmentSizeMb);
  const maxTotalSizeMb = useSettingsStore((s) => s.sandboxMaxTotalSizeMb);
  const autoCleanTmp = useSettingsStore((s) => s.sandboxAutoCleanTmp);

  const setDaemonEnabled = useSettingsStore((s) => s.setSandboxDaemonEnabled);
  const setDaemonMode = useSettingsStore((s) => s.setSandboxDaemonMode);
  const setMaxEnvironments = useSettingsStore((s) => s.setSandboxMaxEnvironments);
  const setMaxEnvSizeMb = useSettingsStore((s) => s.setSandboxMaxEnvironmentSizeMb);
  const setMaxTotalSizeMb = useSettingsStore((s) => s.setSandboxMaxTotalSizeMb);
  const setAutoCleanTmp = useSettingsStore((s) => s.setSandboxAutoCleanTmp);

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
        <Text style={styles.navTitle}>Агент</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Использование */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="storage" size={18} color="#8E8E93" />
            <Text style={styles.sectionTitle}>Использование</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '0%' }]} />
            </View>
            <Text style={styles.progressText}>0 MB из {maxTotalSizeMb} MB</Text>
            <View style={styles.statsRow}>
              <Text style={styles.statText}>Активных сред: 0</Text>
              <Text style={styles.statText}>Заморожено: 0</Text>
            </View>
          </View>
        </View>

        {/* Навигация */}
        <View style={styles.section}>
          <Pressable style={styles.menuItem} onPress={() => router.push('/settings/sandbox/environments')} android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
            <Ionicons name="home-outline" size={20} color="#007AFF" />
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Среды чатов</Text>
              <Text style={styles.menuDesc}>Управление средами</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </Pressable>

          <Pressable style={styles.menuItem} onPress={() => router.push('/settings/sandbox/packages')} android_ripple={{ color: 'rgba(255,255,255,0.1)' }}>
            <Ionicons name="cube-outline" size={20} color="#007AFF" />
            <View style={styles.menuInfo}>
              <Text style={styles.menuTitle}>Пакеты</Text>
              <Text style={styles.menuDesc}>Установленные программы</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
          </Pressable>
        </View>

        {/* Фоновая среда */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sync-outline" size={18} color="#8E8E93" />
            <Text style={styles.sectionTitle}>Фоновая среда</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Фоновая среда</Text>
                <Text style={styles.switchDesc}>Выполнение долгих задач</Text>
              </View>
              <Switch value={daemonEnabled} onValueChange={setDaemonEnabled} trackColor={{ false: '#3A3A3C', true: '#007AFF' }} thumbColor="#FFFFFF" />
            </View>

            {daemonEnabled && (
              <View style={styles.radioGroup}>
                <Pressable style={styles.radioItem} onPress={() => setDaemonMode('screen_on')} android_ripple={{ color: 'rgba(255,255,255,0.05)' }}>
                  <Ionicons name={daemonMode === 'screen_on' ? 'radio-button-on' : 'radio-button-off'} size={20} color={daemonMode === 'screen_on' ? '#007AFF' : '#8E8E93'} />
                  <Text style={styles.radioText}>Только когда экран включен</Text>
                </Pressable>
                <Pressable style={styles.radioItem} onPress={() => setDaemonMode('always')} android_ripple={{ color: 'rgba(255,255,255,0.05)' }}>
                  <Ionicons name={daemonMode === 'always' ? 'radio-button-on' : 'radio-button-off'} size={20} color={daemonMode === 'always' ? '#007AFF' : '#8E8E93'} />
                  <Text style={styles.radioText}>Всегда (с уведомлением)</Text>
                </Pressable>
                <Pressable style={styles.radioItem} onPress={() => setDaemonMode('charging')} android_ripple={{ color: 'rgba(255,255,255,0.05)' }}>
                  <Ionicons name={daemonMode === 'charging' ? 'radio-button-on' : 'radio-button-off'} size={20} color={daemonMode === 'charging' ? '#007AFF' : '#8E8E93'} />
                  <Text style={styles.radioText}>Только на зарядке</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Лимиты */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={18} color="#8E8E93" />
            <Text style={styles.sectionTitle}>Лимиты</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Макс. размер среды</Text>
              <Text style={styles.limitValue}>{maxEnvSizeMb} MB</Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Макс. общий размер</Text>
              <Text style={styles.limitValue}>{maxTotalSizeMb} MB</Text>
            </View>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Макс. количество сред</Text>
              <Text style={styles.limitValue}>{maxEnvironments}</Text>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchTitle}>Автоочистка /tmp</Text>
              <Switch value={autoCleanTmp} onValueChange={setAutoCleanTmp} trackColor={{ false: '#3A3A3C', true: '#007AFF' }} thumbColor="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* Обслуживание */}
        <View style={styles.section}>
          <Pressable style={[styles.dangerBtn]} android_ripple={{ color: 'rgba(255,69,58,0.2)' }}>
            <Ionicons name="trash-outline" size={18} color="#FF453A" />
            <Text style={styles.dangerBtnText}>Очистить все среды</Text>
          </Pressable>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={18} color="#8E8E93" />
              <Text style={styles.infoText}>Proot Linux, v1</Text>
            </View>
          </View>
        </View>
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
  scrollContent: { padding: spacing.xl, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.xs },
  sectionTitle: { fontSize: typography.sm.fontSize, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#1C1C1E', borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  progressBar: { height: 6, backgroundColor: '#3A3A3C', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 3 },
  progressText: { fontSize: typography.xs.fontSize, color: '#8E8E93' },
  statsRow: { flexDirection: 'row', gap: spacing.lg },
  statText: { fontSize: typography.xs.fontSize, color: '#8E8E93' },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: typography.base.fontSize, fontWeight: '500', color: '#FFFFFF' },
  menuDesc: { fontSize: typography.sm.fontSize, color: '#8E8E93', marginTop: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchInfo: { flex: 1 },
  switchTitle: { fontSize: typography.base.fontSize, fontWeight: '500', color: '#FFFFFF' },
  switchDesc: { fontSize: typography.sm.fontSize, color: '#8E8E93', marginTop: 2 },
  radioGroup: { gap: spacing.sm, marginTop: spacing.sm },
  radioItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  radioText: { fontSize: typography.base.fontSize, color: '#FFFFFF' },
  limitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  limitLabel: { fontSize: typography.base.fontSize, color: '#FFFFFF' },
  limitValue: { fontSize: typography.base.fontSize, color: '#8E8E93', fontWeight: '500' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: '#1C1C1E', borderRadius: radius.lg, padding: spacing.lg },
  dangerBtnText: { fontSize: typography.base.fontSize, fontWeight: '500', color: '#FF453A' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { fontSize: typography.sm.fontSize, color: '#8E8E93' },
});