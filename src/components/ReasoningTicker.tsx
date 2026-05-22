import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ReasoningTickerProps {
  reasoning: string;
  isGenerating?: boolean;
  /** Цвет фона для градиентных масок (по умолчанию #000000) */
  backgroundColor?: string;
}

const CONTAINER_WIDTH = 130;
const FADE_WIDTH = 28;
const LERP = 0.12; // каждый кадр проходим 12% оставшегося пути
const CHUNK_SIZE = 150; // символов в чанке — не превышает лимит текстуры OpenGL

export default function ReasoningTicker({
  reasoning,
  isGenerating,
  backgroundColor = '#000000',
}: ReasoningTickerProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const textWidthRef = useRef(0);
  const currentXRef = useRef(0);

  const flatText = reasoning.replace(/\s+/g, ' ');

  // Разбиваем длинный текст на безопасные чанки по 150 символов.
  // Каждый <Text> — отдельная текстура, не превышающая лимит OpenGL (~4096px).
  // ScrollView horizontal даёт бесконечное пространство — текст не переносится.
  const textChunks = useMemo(() => {
    const chunks: string[] = [];
    for (let i = 0; i < flatText.length; i += CHUNK_SIZE) {
      chunks.push(flatText.slice(i, i + CHUNK_SIZE));
    }
    return chunks;
  }, [flatText]);

  // onLayout на обёртке даёт точную суммарную ширину всех чанков
  const handleLayout = useCallback((e: any) => {
    textWidthRef.current = e.nativeEvent.layout.width;
  }, []);

  // RAF-lerp loop: плавно догоняем новые токены.
  // Сброс: если текст очистился — мгновенно в 0.
  useEffect(() => {
    if (flatText.length === 0) {
      currentXRef.current = 0;
      translateX.setValue(0);
      textWidthRef.current = 0;
      return;
    }

    if (!isGenerating) return;

    let rafId: number;
    const loop = () => {
      const overflow = Math.max(0, textWidthRef.current - CONTAINER_WIDTH);
      const targetX = -overflow;
      currentXRef.current += (targetX - currentXRef.current) * LERP;
      // Math.round убирает субпиксельное размытие
      translateX.setValue(Math.round(currentXRef.current));
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafId);
  }, [isGenerating, translateX, flatText.length]);

  return (
    <View style={styles.container}>
      {/* ScrollView создаёт бесконечный холст — текст не сжимается */}
      <ScrollView
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        pointerEvents="none"
      >
        <Animated.View
          onLayout={handleLayout}
          style={[
            styles.track,
            { transform: [{ translateX }] },
          ]}
        >
          {/* Рендерим безопасные чанки друг за другом */}
          {textChunks.map((chunk, index) => (
            <Text key={index} style={styles.text}>
              {chunk}
            </Text>
          ))}
          {isGenerating && <Text style={styles.cursor}>▎</Text>}
        </Animated.View>
      </ScrollView>

      {/* Градиентные маски с настраиваемым цветом фона */}
      <LinearGradient
        colors={[backgroundColor, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fadeMask, styles.fadeLeft]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', backgroundColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fadeMask, styles.fadeRight]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_WIDTH,
    height: 32,
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
  },
  text: {
    fontSize: 15,
    color: '#D0D0D0',
    lineHeight: 32,
  },
  cursor: {
    color: '#0A84FF',
    fontSize: 15,
    lineHeight: 32,
    marginLeft: 2,
  },
  fadeMask: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
  },
  fadeLeft: {
    left: 0,
  },
  fadeRight: {
    right: 0,
  },
});
