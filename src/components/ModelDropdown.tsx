import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { spacing, radius, typography } from '@/src/design/theme';
import type { CapsCache } from '@/src/lib/modelCapabilities';

export default function ModelDropdown() {
  const [open, setOpen] = useState(false);
  const model = useSettingsStore((s) => s.model);
  const models = useSettingsStore((s) => s.models);
  const modelCaps = useSettingsStore((s) => s.modelCaps);
  const setModel = useSettingsStore((s) => s.setModel);

  const renderIcons = (caps: CapsCache[string] | undefined) => {
    if (!caps) return null;
    return (
      <View style={styles.icons}>
        {caps.vision && <Ionicons name="image-outline" size={14} color="#8E8E93" />}
        {caps.files && <Ionicons name="document-text-outline" size={14} color="#8E8E93" />}
      </View>
    );
  };

  if (models.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.text} numberOfLines={1}>Новый чат</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.header}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.text} numberOfLines={1}>
            {model || 'Выберите модель'}
          </Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdownWrapper}>
            <View style={styles.dropdown}>
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {models.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.item, model === m && styles.itemActive]}
                    onPress={() => { setModel(m); setOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemRow}>
                      <Text style={[styles.itemText, model === m && styles.itemTextActive]} numberOfLines={1}>
                        {m}
                      </Text>
                      {renderIcons(modelCaps[m])}
                    </View>
                    {model === m && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    fontSize: typography.lg.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 56,
  },
  dropdownWrapper: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    position: 'absolute',
    top: 56,
    left: 0,
  },
  dropdown: {
    width: 240,
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  list: {
    paddingVertical: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  itemActive: {
    backgroundColor: '#007AFF',
  },
  itemRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemText: {
    fontSize: typography.base.fontSize,
    color: '#FFFFFF',
  },
  itemTextActive: {
    fontWeight: '600',
  },
});
