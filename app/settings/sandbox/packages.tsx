import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { spacing, radius, typography } from '@/src/design/theme';

interface InstalledPackage {
  name: string;
  version: string;
  sizeMb: number;
}

export default function SandboxPackagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [packages, setPackages] = useState<InstalledPackage[]>([]);

  const handleDelete = useCallback((pkg: InstalledPackage) => {
    Alert.alert(
      'Удалить пакет?',
      `Пакет «${pkg.name}» будет удалён из песочницы.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            setPackages((prev) => prev.filter((p) => p.name !== pkg.name));
          },
        },
      ]
    );
  }, []);

  const totalSize = packages.reduce((sum, p) => sum + p.sizeMb, 0);

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
        <Text style={styles.navTitle}>Пакеты</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {packages.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{packages.length} пакетов</Text>
            <Text style={styles.summaryText}>{totalSize} MB</Text>
          </View>
        )}

        {packages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#3A3A3C" />
            <Text style={styles.emptyTitle}>Нет пакетов</Text>
            <Text style={styles.emptyDesc}>
              Пакеты устанавливаются через sandbox_install_pkg или автоматически агентом
            </Text>
          </View>
        ) : (
          packages.map((pkg) => (
            <View key={pkg.name} style={styles.pkgCard}>
              <View style={styles.pkgInfo}>
                <Text style={styles.pkgName}>{pkg.name}</Text>
                <Text style={styles.pkgVersion}>{pkg.version}</Text>
              </View>
              <View style={styles.pkgMeta}>
                <Text style={styles.pkgSize}>{pkg.sizeMb} MB</Text>
                <Pressable
                  style={styles.pkgDeleteBtn}
                  onPress={() => handleDelete(pkg)}
                  android_ripple={{ color: 'rgba(255,69,58,0.2)' }}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF453A" />
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
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  summaryText: { fontSize: typography.base.fontSize, color: '#8E8E93', fontWeight: '500' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: spacing.md },
  emptyTitle: { fontSize: typography.xl.fontSize, fontWeight: '600', color: '#8E8E93' },
  emptyDesc: { fontSize: typography.base.fontSize, color: '#636366', textAlign: 'center', maxWidth: 260 },
  pkgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  pkgInfo: { flex: 1, gap: 2 },
  pkgName: { fontSize: typography.base.fontSize, fontWeight: '500', color: '#FFFFFF' },
  pkgVersion: { fontSize: typography.sm.fontSize, color: '#8E8E93' },
  pkgMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pkgSize: { fontSize: typography.sm.fontSize, color: '#8E8E93' },
  pkgDeleteBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
});