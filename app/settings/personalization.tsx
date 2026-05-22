import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { spacing, radius, typography } from '@/src/design/theme';
import type { UserInstruction } from '@/src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PersonalizationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const instructionsEnabled = useSettingsStore((s) => s.instructionsEnabled);
  const instructions = useSettingsStore((s) => s.instructions);
  const setInstructionsEnabled = useSettingsStore((s) => s.setInstructionsEnabled);
  const addInstruction = useSettingsStore((s) => s.addInstruction);
  const updateInstruction = useSettingsStore((s) => s.updateInstruction);
  const deleteInstruction = useSettingsStore((s) => s.deleteInstruction);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Bubble menu state
  const [bubbleMenu, setBubbleMenu] = useState<{
    visible: boolean;
    instruction: UserInstruction | null;
    x: number;
    y: number;
  }>({ visible: false, instruction: null, x: 0, y: 0 });

  const bubbleScale = useSharedValue(0);
  const bubbleOpacity = useSharedValue(0);

  const showBubbleMenu = (instruction: UserInstruction, x: number, y: number) => {
    setBubbleMenu({ visible: true, instruction, x, y });
    bubbleScale.value = 0.85;
    bubbleOpacity.value = 0;
    bubbleScale.value = withSpring(1, { damping: 30, stiffness: 180, mass: 0.8 });
    bubbleOpacity.value = withTiming(1, { duration: 150 });
  };

  const hideBubbleMenu = () => {
    bubbleScale.value = withSpring(0, { damping: 30, stiffness: 180, mass: 0.8 });
    bubbleOpacity.value = withTiming(0, { duration: 100 }, () => {
      runOnJS(setBubbleMenu)({ visible: false, instruction: null, x: 0, y: 0 });
    });
  };

  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
    opacity: bubbleOpacity.value,
    transformOrigin: 'top right',
  }));

  const handleAdd = () => {
    setEditingId(null);
    setEditText('');
    setModalVisible(true);
  };

  const handleEdit = (instruction: UserInstruction) => {
    hideBubbleMenu();
    setTimeout(() => {
      setEditingId(instruction.id);
      setEditText(instruction.text);
      setModalVisible(true);
    }, 250);
  };

  const handleDelete = (id: string) => {
    hideBubbleMenu();
    setTimeout(() => {
      deleteInstruction(id);
    }, 250);
  };

  const handleSave = () => {
    const trimmed = editText.trim();
    if (!trimmed) return;

    if (editingId) {
      updateInstruction(editingId, trimmed);
    } else {
      addInstruction(trimmed);
    }
    setModalVisible(false);
  };

  const handleMenuPress = (instruction: UserInstruction, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    showBubbleMenu(instruction, pageX, pageY);
  };

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
        <Text style={styles.navTitle}>Персонализация</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Глобальный переключатель */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Инструкции для модели</Text>
            <Text style={styles.toggleDesc}>
              {instructionsEnabled
                ? 'Инструкции активны и будут отправляться с каждым запросом'
                : 'Инструкции отключены и не будут отправляться'}
            </Text>
          </View>
          <Switch
            value={instructionsEnabled}
            onValueChange={setInstructionsEnabled}
            trackColor={{ false: '#38383A', true: '#007AFF' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Кнопка добавления */}
        <Pressable
          style={styles.addBtn}
          onPress={handleAdd}
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
        >
          <Ionicons name="add-circle-outline" size={22} color="#007AFF" />
          <Text style={styles.addBtnText}>Добавить инструкцию</Text>
        </Pressable>

        {/* Список инструкций */}
        {instructions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color="#38383A" />
            <Text style={styles.emptyText}>Нет инструкций</Text>
            <Text style={styles.emptySubtext}>
              Добавьте инструкции, чтобы настроить поведение модели под себя
            </Text>
          </View>
        ) : (
          instructions.map((instruction) => (
            <Animated.View
              key={instruction.id}
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={styles.card}
            >
              <View style={styles.cardRow}>
                <Text style={[styles.cardText, { flex: 1 }]} numberOfLines={4}>
                  {instruction.text}
                </Text>
                <Pressable
                  style={styles.cardMenu}
                  onPress={(e) => handleMenuPress(instruction, e)}
                  android_ripple={{ color: 'rgba(255,255,255,0.1)', radius: 16 }}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color="#8E8E93" />
                </Pressable>
              </View>
            </Animated.View>
          ))
        )}

        {/* Кнопка перехода к системному промпту */}
        <Pressable
          style={styles.linkBtn}
          onPress={() => router.push('/system-prompt')}
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
        >
          <Text style={styles.linkText}>Системный промпт</Text>
          <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
        </Pressable>
      </ScrollView>

      {/* Bubble меню */}
      {bubbleMenu.visible && (
        <TouchableWithoutFeedback onPress={hideBubbleMenu}>
          <View style={styles.bubbleOverlay}>
            <Animated.View
              style={[
                styles.bubbleContainer,
                {
                  left: Math.min(bubbleMenu.x - 140, SCREEN_WIDTH - 180),
                  top: bubbleMenu.y - 100,
                },
                bubbleAnimatedStyle,
              ]}
            >
              <Pressable
                style={styles.bubbleItem}
                onPress={() => bubbleMenu.instruction && handleEdit(bubbleMenu.instruction)}
                android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
              >
                <Ionicons name="pencil" size={18} color="#FFFFFF" />
                <Text style={styles.bubbleItemText}>Редактировать</Text>
              </Pressable>
              <View style={styles.bubbleDivider} />
              <Pressable
                style={styles.bubbleItem}
                onPress={() => bubbleMenu.instruction && handleDelete(bubbleMenu.instruction.id)}
                android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
              >
                <Ionicons name="trash-outline" size={18} color="#FF453A" />
                <Text style={[styles.bubbleItemText, styles.bubbleItemDanger]}>Удалить</Text>
              </Pressable>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      )}

      {/* Модалка добавления/редактирования */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View
            entering={SlideInDown.duration(250)}
            exiting={SlideOutDown.duration(150)}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Редактировать инструкцию' : 'Новая инструкция'}
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                android_ripple={{ color: 'rgba(255,255,255,0.1)', radius: 16 }}
              >
                <Ionicons name="close" size={24} color="#8E8E93" />
              </Pressable>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Введите текст инструкции..."
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={5}
              autoFocus
              value={editText}
              onChangeText={setEditText}
              textAlignVertical="top"
            />

            <Pressable
              style={[
                styles.modalSaveBtn,
                !editText.trim() && styles.modalSaveBtnDisabled,
              ]}
              onPress={handleSave}
              disabled={!editText.trim()}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Text
                style={[
                  styles.modalSaveBtnText,
                  !editText.trim() && styles.modalSaveBtnTextDisabled,
                ]}
              >
                Сохранить
              </Text>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
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
  scrollContent: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing['3xl'] },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  toggleInfo: { flex: 1, marginRight: spacing.md },
  toggleLabel: {
    fontSize: typography.base.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  toggleDesc: {
    fontSize: typography.sm.fontSize,
    color: '#8E8E93',
    lineHeight: 18,
  },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  addBtnText: {
    fontSize: typography.base.fontSize,
    color: '#007AFF',
    fontWeight: '500',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.base.fontSize,
    color: '#8E8E93',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: typography.sm.fontSize,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.xl,
  },

  // Card
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardMenu: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  cardText: {
    fontSize: typography.base.fontSize,
    color: '#FFFFFF',
    lineHeight: 22,
  },

  // Bubble menu
  bubbleOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  bubbleContainer: {
    position: 'absolute',
    backgroundColor: '#2C2C2E',
    borderRadius: radius.lg,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  bubbleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bubbleItemText: {
    fontSize: typography.base.fontSize,
    color: '#FFFFFF',
  },
  bubbleItemDanger: {
    color: '#FF453A',
  },
  bubbleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#38383A',
    marginHorizontal: spacing.lg,
  },

  // Link button
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  linkText: {
    fontSize: typography.base.fontSize,
    color: '#FFFFFF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    gap: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: typography.lg.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: typography.base.fontSize,
    color: '#FFFFFF',
    minHeight: 120,
    lineHeight: 22,
  },
  modalSaveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: radius['2xl'],
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalSaveBtnDisabled: {
    backgroundColor: '#38383A',
  },
  modalSaveBtnText: {
    fontSize: typography.base.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSaveBtnTextDisabled: {
    color: '#8E8E93',
  },
});
