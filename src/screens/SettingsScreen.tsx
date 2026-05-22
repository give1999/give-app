import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { typography, spacing, radius } from '../design/theme';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { fetchModels } from '@/src/lib/api';
import { loadCapsCache, saveCapsCache, findUntestedModels, testModelVision, testModelFiles } from '@/src/lib/modelCapabilities';

interface SettingsScreenProps {
  onClose: () => void;
}

export default function SettingsScreen({ onClose }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const apiKey = useSettingsStore((s) => s.apiKey);
  const baseUrl = useSettingsStore((s) => s.baseUrl);
  const customSystemPrompt = useSettingsStore((s) => s.customSystemPrompt);
  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setBaseUrl = useSettingsStore((s) => s.setBaseUrl);
  const setCustomSystemPrompt = useSettingsStore((s) => s.setCustomSystemPrompt);
  const setModelsStore = useSettingsStore((s) => s.setModels);
  const setModelCaps = useSettingsStore((s) => s.setModelCaps);
  const currentModel = useSettingsStore((s) => s.model);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = baseUrl.trim().replace(/\/+$/, '').endsWith('/v1');

  const handleSave = async () => {
    const url = baseUrl.trim().replace(/\/+$/, '');
    if (!url.endsWith('/v1')) {
      setError('URL должен заканчиваться на /v1');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchModels({ apiKey, baseUrl });
      const modelIds = res.data.map((m) => m.id);
      setModelsStore(modelIds);

      // Lazy detection: тестируем только новые модели
      const cache = await loadCapsCache();
      const untested = findUntestedModels(modelIds, cache);
      if (untested.length > 0) {
        for (const mId of untested) {
          const visionCaps = await testModelVision(mId, { apiKey, baseUrl });
          const filesCaps = await testModelFiles(mId, { apiKey, baseUrl });
          cache[mId] = { vision: visionCaps.vision, files: filesCaps };
        }
        await saveCapsCache(cache);
        setModelCaps(cache);
      }

      if (modelIds.length === 0) {
        setError('У этого провайдера нет доступных моделей');
      } else {
        onClose();
      }
    } catch (err: any) {
      const msg = err.message || 'Не удалось получить список моделей';
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        setError('Введите API ключ для получения списка моделей');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <TouchableOpacity style={styles.navBtn} onPress={onClose}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Настройки</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Подключение агента</Text>

        <View style={styles.field}>
          <Text style={styles.label}>API ключ</Text>
          <TextInput
            style={styles.input}
            placeholder="sk-..."
            placeholderTextColor="#8E8E93"
            secureTextEntry
            value={apiKey}
            onChangeText={setApiKey}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Базовый URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://api.openai.com/v1"
            placeholderTextColor="#8E8E93"
            autoCapitalize="none"
            value={baseUrl}
            onChangeText={setBaseUrl}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Мои инструкции</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Дополнительные инструкции для модели..."
            placeholderTextColor="#8E8E93"
            multiline
            numberOfLines={4}
            value={customSystemPrompt}
            onChangeText={setCustomSystemPrompt}
          />
        </View>

        <Pressable
          style={styles.linkBtn}
          onPress={() => router.push('/system-prompt')}
          android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
        >
          <Text style={styles.linkText}>Системный промпт</Text>
          <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
        </Pressable>

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnInactive]}
          onPress={handleSave}
          disabled={loading || !canSave}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextInactive]}>Сохранить</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
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
  scrollContent: { padding: spacing.xl, gap: spacing.lg },
  section: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  field: { gap: spacing.sm },
  label: {
    fontSize: typography.sm.fontSize,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.base.fontSize,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#FF453A',
    fontSize: typography.sm.fontSize,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: radius['2xl'],
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveBtnInactive: {
    backgroundColor: '#1C1C1E',
  },
  saveBtnText: {
    fontSize: typography.lg.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveBtnTextInactive: {
    color: '#8E8E93',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  linkText: {
    fontSize: typography.base.fontSize,
    color: '#FFFFFF',
  },
});
