import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing, radius } from '../design/theme';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      <View style={styles.content}>
        <View style={styles.illustration}>
          <View style={styles.illustrationBox}>
            <Ionicons name="apps" size={80} color="#8E8E93" />
          </View>
        </View>

        <Text style={styles.title}>Добро пожаловать в Star</Text>
        <Text style={styles.desc}>
          Ваш персональный AI-ассистент, готовый помочь в любое время
        </Text>

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.replace('/' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.btnPrimaryText}>Начать</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
              onPress={() => router.navigate('/login' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.btnSecondaryText}>У меня есть аккаунт</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: 32 },
  illustration: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  illustrationBox: {
    width: 180, height: 180,
    backgroundColor: '#1C1C1E',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography['3xl'].fontSize,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  desc: {
    fontSize: typography.lg.fontSize,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing['2xl'],
  },
  btnPrimary: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  btnPrimaryText: { fontSize: 17, fontWeight: '600', color: '#000000' },
  btnSecondary: {
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#38383A',
  },
  btnSecondaryText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
});
