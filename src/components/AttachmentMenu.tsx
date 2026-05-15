import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, typography } from '../design/theme';

type MenuAction = 'photo' | 'file' | 'camera';

interface AttachmentMenuProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: MenuAction) => void;
  visionEnabled?: boolean;
}

export default function AttachmentMenu({ visible, onClose, onSelect, visionEnabled }: AttachmentMenuProps) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 8 }),
      ]).start();
    } else {
      scale.setValue(0.9);
      opacity.setValue(0);
      translateY.setValue(8);
    }
  }, [visible, scale, opacity, translateY]);

  if (!visible) return null;

  const items: { type: MenuAction; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { type: 'photo', icon: 'image-outline', label: 'Фото' },
    { type: 'file', icon: 'document-outline', label: 'Файл' },
    { type: 'camera', icon: 'camera-outline', label: 'Камера' },
  ];

  return (
    <Pressable style={styles.wrapper} onPress={onClose}>
      <Animated.View
        style={[
          styles.menu,
          {
            opacity,
            transform: [{ scale }, { translateY }],
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.menuInner} pointerEvents="auto">
          {items.map((item) => {
            const disabled = (item.type === 'photo' || item.type === 'camera') && visionEnabled === false;
            return (
              <TouchableOpacity
                key={item.type}
                style={[styles.item, disabled && styles.itemDisabled]}
                activeOpacity={disabled ? 1 : 0.7}
                onPress={disabled ? undefined : () => { onSelect(item.type); onClose(); }}
              >
                <View style={[styles.iconBox, disabled && styles.iconBoxDisabled]}>
                  <Ionicons name={item.icon} size={18} color={disabled ? '#8E8E93' : '#FFFFFF'} />
                </View>
                <Text style={[styles.label, disabled && styles.labelDisabled]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  menu: {
    position: 'absolute',
    bottom: 82,
    left: spacing.lg,
  },
  menuInner: {
    backgroundColor: '#1C1C1E',
    borderRadius: radius['3xl'],
    padding: spacing.sm,
    minWidth: 180,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius['2xl'],
  },
  itemDisabled: {
    opacity: 0.5,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDisabled: {
    backgroundColor: '#1C1C1E',
  },
  label: {
    fontSize: typography.base.fontSize,
    color: '#FFFFFF',
  },
  labelDisabled: {
    color: '#8E8E93',
  },
});
