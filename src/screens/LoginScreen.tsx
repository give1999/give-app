import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing, radius } from '../design/theme';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      <View style={styles.content}>
        <Text style={styles.title}>Вход</Text>
        <Text style={styles.desc}>Войдите в свой аккаунт</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#8E8E93"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Пароль</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#8E8E93"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.replace('/' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.btnPrimaryText}>Войти</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.btnSecondaryText}>Назад</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { paddingHorizontal: spacing.xl },
  title: {
    fontSize: typography['4xl'].fontSize,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  desc: {
    fontSize: typography.lg.fontSize,
    color: '#8E8E93',
    marginBottom: spacing['2xl'],
  },
  field: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: typography.lg.fontSize,
    color: '#FFFFFF',
  },
  btnPrimary: {
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
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
