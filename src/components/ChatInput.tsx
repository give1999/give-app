import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, Animated, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, radius, sizes, typography } from '../design/theme';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachment: () => void;
  onStop: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
  hasAttachments?: boolean;
}

function ChatInput({ value, onChangeText, onSend, onAttachment, onStop, autoFocus, disabled, hasAttachments }: ChatInputProps) {
  const insets = useSafeAreaInsets();
  const [inputHeight, setInputHeight] = useState(36);
  const canSend = (value.trim().length > 0 || !!hasAttachments) && !disabled;

  const sendAnim = useRef(new Animated.Value(disabled ? 0 : 1)).current;
  const stopAnim = useRef(new Animated.Value(disabled ? 1 : 0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const activeAnim = useRef(new Animated.Value(canSend ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(activeAnim, {
      toValue: canSend ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [canSend, activeAnim]);

  const sendBgColor = activeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#003D99', '#007AFF'],
  });

  const pressIn = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      damping: 12,
      stiffness: 300,
    }).start();
  }, [pressAnim]);

  const pressOut = useCallback(() => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 200,
    }).start();
  }, [pressAnim]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(sendAnim, {
        toValue: disabled ? 0 : 1,
        useNativeDriver: true,
        damping: 14,
        stiffness: 180,
      }),
      Animated.spring(stopAnim, {
        toValue: disabled ? 1 : 0,
        useNativeDriver: true,
        damping: 14,
        stiffness: 180,
      }),
    ]).start();
  }, [disabled, sendAnim, stopAnim]);

  return (
    <View style={[styles.dock, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, spacing.xs) : 30 }]}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.circleBtn} onPress={onAttachment} activeOpacity={0.7} disabled={disabled}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={[styles.inputBox, { height: Math.min(160, Math.max(48, inputHeight + 12)) }]}>
          <TextInput
            style={[styles.input, { height: Math.min(140, Math.max(36, inputHeight)) }, disabled && { opacity: 0.5 }]}
            placeholder="Сообщение..."
            placeholderTextColor="#8E8E93"
            value={value}
            onChangeText={onChangeText}
            multiline
            maxLength={2000}
            autoFocus={autoFocus}
            returnKeyType="default"
            editable={!disabled}
            onContentSizeChange={(e) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setInputHeight(e.nativeEvent.contentSize.height);
            }}
          />
        </View>

        <View style={styles.btnSlot}>
          <Animated.View
            style={[
              styles.btnOverlay,
              {
                opacity: stopAnim,
                transform: [{ scale: stopAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
              },
            ]}
            pointerEvents={disabled ? 'auto' : 'none'}
          >
            <TouchableOpacity
              style={styles.stopBtn}
              onPress={onStop}
              onPressIn={pressIn}
              onPressOut={pressOut}
              activeOpacity={1}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="square" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              styles.btnOverlay,
              {
                opacity: sendAnim,
                transform: [
                  { scale: Animated.multiply(
                    sendAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
                    pressAnim,
                  ) },
                ],
              },
            ]}
            pointerEvents={disabled ? 'none' : 'auto'}
          >
            <Animated.View style={[styles.sendBtn, { backgroundColor: sendBgColor }]}>
              <TouchableOpacity
                onPress={canSend ? onSend : undefined}
                onPressIn={pressIn}
                onPressOut={pressOut}
                activeOpacity={1}
                style={styles.sendTouch}
              >
                <Ionicons name="arrow-up" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  circleBtn: {
    width: sizes.btnCircle,
    height: sizes.btnCircle,
    borderRadius: sizes.btnCircle / 2,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#38383A',
    marginBottom: 2,
  },
  inputBox: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    paddingHorizontal: spacing.lg + 2,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#38383A',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    fontSize: typography.lg.fontSize,
    color: '#FFFFFF',
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  sendBtn: {
    width: sizes.btnCircle,
    height: sizes.btnCircle,
    borderRadius: sizes.btnCircle / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sendTouch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    width: sizes.btnCircle,
    height: sizes.btnCircle,
    borderRadius: radius.md,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSlot: {
    width: sizes.btnCircle,
    height: sizes.btnCircle,
    marginBottom: 2,
  },
  btnOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default ChatInput;
