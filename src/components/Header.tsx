import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../design/theme';
import { useTheme } from '@/hooks/use-theme';
import ModelDropdown from './ModelDropdown';

interface HeaderProps {
  onMenuPress?: () => void;
  onNewChat?: () => void;
}

export default function Header({ onMenuPress, onNewChat }: HeaderProps) {
  const t = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: t.border }]}>
      <View style={styles.row}>
        {onMenuPress ? (
          <TouchableOpacity style={styles.btn} onPress={onMenuPress} activeOpacity={0.6}>
            <Ionicons name="menu" size={24} color={t.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.btn} />
        )}

        <ModelDropdown />

        {onNewChat ? (
          <TouchableOpacity style={styles.btn} onPress={onNewChat} activeOpacity={0.6}>
            <Ionicons name="create" size={22} color="#8E8E93" />
          </TouchableOpacity>
        ) : (
          <View style={styles.btn} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: spacing.nav,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btn: {
    width: spacing.button,
    height: spacing.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
