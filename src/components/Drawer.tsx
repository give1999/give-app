import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Animated, Pressable, LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vibration } from 'react-native';
import { spacing, radius, typography } from '../design/theme';

const DRAWER_WIDTH = 280;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ChatItem {
  id: string;
  title: string;
  titleGenerated?: boolean;
  preview?: string;
}

interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  chats: ChatItem[];
  activeChatId?: string;
  onSelectChat: (id: string) => void;
  onDeleteChat?: (id: string) => void;
}

function AnimatedChatTitle({ title, titleGenerated }: { title: string; titleGenerated?: boolean }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  // Только чаты с явным titleGenerated === false (созданные сейчас), не undefined (старые)
  const isGenerating = title === 'Новый чат' && titleGenerated === false;

  useEffect(() => {
    if (isGenerating) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => { pulse.stop(); };
    } else {
      // Плавное появление готового заголовка
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [title, isGenerating]);

  if (isGenerating) {
    return (
      <Animated.Text style={[styles.chatTitle, { opacity: pulseAnim }]} numberOfLines={1}>
        Новый чат
      </Animated.Text>
    );
  }

  return (
    <Animated.Text style={[styles.chatTitle, { opacity: fadeAnim }]} numberOfLines={1}>
      {title}
    </Animated.Text>
  );
}

export default function Drawer({
  visible, onClose, onOpenSettings,
  chats, activeChatId, onSelectChat, onDeleteChat,
}: DrawerProps) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const menuTranslateX = useRef(new Animated.Value(20)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }),
        Animated.timing(overlayOpacity, { toValue: 0.5, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      setMenuChatId(null);
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, overlayOpacity, translateX]);

  const showMenu = useCallback((chatId: string) => {
    Vibration.vibrate(10);
    setMenuChatId(chatId);
    menuTranslateX.setValue(20);
    menuOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(menuTranslateX, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(menuOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [menuTranslateX, menuOpacity]);

  const closeMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(menuTranslateX, { toValue: 20, duration: 120, useNativeDriver: true }),
      Animated.timing(menuOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setMenuChatId(null);
    });
  }, [menuTranslateX, menuOpacity]);

  const handleDelete = useCallback(() => {
    const idToDelete = menuChatId;
    Animated.parallel([
      Animated.timing(menuTranslateX, { toValue: 20, duration: 120, useNativeDriver: true }),
      Animated.timing(menuOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) {
        setMenuChatId(null);
        if (idToDelete && onDeleteChat) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onDeleteChat(idToDelete);
        }
      }
    });
  }, [menuChatId, menuTranslateX, menuOpacity, onDeleteChat]);

  return (
    <View style={styles.container} pointerEvents={visible ? 'auto' : 'none'}>
      <Pressable
        style={styles.overlay}
        onPress={visible ? onClose : undefined}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Animated.View style={[styles.overlayBg, { opacity: overlayOpacity }]} />
      </Pressable>

      <Animated.View
        style={[styles.drawerWrap, { transform: [{ translateX }] }]}
      >
        {/* 1) Shield — самый нижний слой, ловит все касания «куда угодно» */}
        {menuChatId !== null && (
          <Pressable style={styles.menuShield} onPress={closeMenu} />
        )}

        {/* 2) Контент — пропускает касания к детям (кнопки, чаты), но сам не перехватывает.
              Касание на пустое место проваливается через box-none → в shield */}
        <View style={styles.contentLayer} pointerEvents={menuChatId !== null ? 'box-none' : 'auto'}>
          <TouchableOpacity style={styles.profileHeader} onPress={onOpenSettings} activeOpacity={0.7}>
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Ionicons name="git-network" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>Провайдер</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            </View>
          </TouchableOpacity>

          <ScrollView
            style={styles.chatList}
            showsVerticalScrollIndicator={false}
            onScroll={closeMenu}
            scrollEventThrottle={16}
          >
            {chats.map((chat) => (
              <View key={chat.id} style={styles.chatItemWrap}>
                <Pressable
                  style={({ pressed }) => [
                    styles.chatItem,
                    activeChatId === chat.id && styles.chatItemActive,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    if (menuChatId) { closeMenu(); return; }
                    onSelectChat(chat.id); onClose();
                  }}
                  onLongPress={() => showMenu(chat.id)}
                  delayLongPress={400}
                >
                  <View style={styles.chatPreview}>
                    <AnimatedChatTitle title={chat.title} titleGenerated={chat.titleGenerated} />
                    {chat.preview ? (
                      <Text style={styles.chatSubtitle} numberOfLines={1}>{chat.preview}</Text>
                    ) : null}
                  </View>
                </Pressable>

                {/* 3) Кнопка удаления — внутри chatItemWrap, позиция привязана к строке */}
                {menuChatId === chat.id && (
                  <Animated.View
                    style={[
                      styles.deleteMenu,
                      { opacity: menuOpacity, transform: [{ translateX: menuTranslateX }] },
                    ]}
                    pointerEvents="box-none"
                  >
                    <TouchableOpacity style={styles.inlineBtn} onPress={handleDelete} activeOpacity={0.7}>
                      <Ionicons name="trash-outline" size={18} color="#FF453A" />
                      <Text style={styles.inlineText}>Удалить</Text>
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  drawerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  /* Shield — полный оверлей drawer, ловит касания на пустое место */
  menuShield: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  /* Контент-слой — box-none когда меню открыто: сам не ловит, дети ловят */
  contentLayer: {
    flex: 1,
    zIndex: 20,
  },
  profileHeader: {
    paddingTop: 40,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  userName: {
    fontSize: typography.lg.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatItemWrap: {
    position: 'relative',
  },
  chatList: { flex: 1, paddingVertical: 0 },
  sectionTitle: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: '#000000',
  },
  chatItemActive: {
    backgroundColor: '#1C1C1E',
  },
  chatPreview: {
    flex: 1,
    overflow: 'hidden',
  },
  chatTitle: {
    fontSize: typography.lg.fontSize,
    color: '#FFFFFF',
  },
  chatSubtitle: {
    fontSize: typography.sm.fontSize,
    color: '#8E8E93',
    marginTop: 1,
  },
  deleteMenu: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    zIndex: 30,
    justifyContent: 'center',
  },
  inlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: '#2C2C2E',
    borderRadius: radius.md,
  },
  inlineText: {
    fontSize: typography.sm.fontSize,
    color: '#FF453A',
    fontWeight: '600',
  },
});