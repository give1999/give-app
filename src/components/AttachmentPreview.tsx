import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, typography } from '@/src/design/theme';
import type { Attachment } from '@/src/types';

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export default function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (attachments.length > 0) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
    }
  }, [attachments.length, fadeAnim, slideAnim]);

  if (attachments.length === 0) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {attachments.map((att) => (
          <View key={att.id} style={styles.chip}>
            {att.type === 'image' ? (
              <Image source={{ uri: att.uri }} style={styles.thumb} />
            ) : (
              <View style={styles.fileThumb}>
                <Ionicons name="document-outline" size={22} color="#8E8E93" />
              </View>
            )}

            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemove(att.id)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>

            {att.type === 'file' && (
              <Text style={styles.fileName} numberOfLines={1}>
                {att.name}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  scrollContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    position: 'relative',
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: '#2C2C2E',
  },
  fileThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#1C1C1E',
    borderRadius: radius.full,
  },
  fileName: {
    fontSize: typography.xs.fontSize,
    color: '#8E8E93',
    marginTop: 4,
    maxWidth: 56,
    textAlign: 'center',
  },
});
