import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { fetchModels } from '@/src/lib/api';
import {
  loadCapsCache,
  saveCapsCache,
  findUntestedModels,
  testModelVision,
  testModelFiles,
} from '@/src/lib/modelCapabilities';
import { spacing, radius, typography } from '@/src/design/theme';
import type { CapsCache } from '@/src/lib/modelCapabilities';

interface ModelItem {
  key: string;
  id: string;
  visible: boolean;
}

const AnimatedView = Animated.View;

function ModelCard({
  item,
  drag,
  visible,
  caps,
  renderIcons,
  toggleModelVisibility,
}: {
  item: ModelItem;
  drag: () => void;
  visible: boolean;
  caps: CapsCache[string] | undefined;
  renderIcons: (caps: CapsCache[string] | undefined) => React.ReactNode;
  toggleModelVisibility: (id: string) => void;
}) {
  const opacity = useSharedValue(visible ? 1 : 0.9);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0.9, { duration: 200 });
  }, [visible, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedView
      style={[
        styles.modelCard,
        animatedStyle,
      ]}
    >
      <Pressable
        onPressIn={drag}
        style={styles.dragHandle}
        android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true }}
      >
        <MaterialCommunityIcons name="drag" size={20} color="#8E8E93" />
      </Pressable>

      <View style={styles.modelInfo}>
        <View style={styles.modelRow}>
          <Text style={[styles.modelName, !visible && styles.modelNameDimmed]} numberOfLines={1}>
            {item.id}
          </Text>
          {renderIcons(caps)}
        </View>
      </View>

      <Switch
        value={visible}
        onValueChange={() => toggleModelVisibility(item.id)}
        trackColor={{ false: '#3A3A3C', true: '#34C759' }}
        thumbColor="#FFFFFF"
      />
    </AnimatedView>
  );
}

export default function ProviderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const apiKey = useSettingsStore((s) => s.apiKey);
  const baseUrl = useSettingsStore((s) => s.baseUrl);
  const models = useSettingsStore((s) => s.models);
  const modelCaps = useSettingsStore((s) => s.modelCaps);
  const modelConfigs = useSettingsStore((s) => s.modelConfigs);

  const setApiKey = useSettingsStore((s) => s.setApiKey);
  const setBaseUrl = useSettingsStore((s) => s.setBaseUrl);
  const setModelsStore = useSettingsStore((s) => s.setModels);
  const setModelCaps = useSettingsStore((s) => s.setModelCaps);
  const syncModelConfigs = useSettingsStore((s) => s.syncModelConfigs);
  const toggleModelVisibility = useSettingsStore((s) => s.toggleModelVisibility);
  const reorderModels = useSettingsStore((s) => s.reorderModels);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (modelConfigs.length === 0 && models.length > 0) {
      syncModelConfigs(models);
    }
  }, [modelConfigs.length, models.length, models, syncModelConfigs]);

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
      syncModelConfigs(modelIds);

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
        router.back();
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

  const renderIcons = useCallback(
    (caps: CapsCache[string] | undefined) => {
      if (!caps) return null;
      return (
        <View style={styles.icons}>
          {caps.vision && (
            <Ionicons name="image-outline" size={14} color="#8E8E93" />
          )}
          {caps.files && (
            <Ionicons name="document-text-outline" size={14} color="#8E8E93" />
          )}
        </View>
      );
    },
    []
  );

  const renderItem = useCallback(
    ({ item, drag }: { item: ModelItem; drag: () => void }) => {
      const config = modelConfigs.find((c) => c.id === item.id);
      const visible = config?.visible ?? true;
      const caps = modelCaps[item.id];

      return (
        <ModelCard
          item={item}
          drag={drag}
          visible={visible}
          caps={caps}
          renderIcons={renderIcons}
          toggleModelVisibility={toggleModelVisibility}
        />
      );
    },
    [modelConfigs, modelCaps, toggleModelVisibility, renderIcons]
  );

  const data: ModelItem[] = models.map((id) => {
    const config = modelConfigs.find((c) => c.id === id);
    return { key: id, id, visible: config?.visible ?? true };
  });

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
        <Text style={styles.navTitle}>Настройки</Text>
        <View style={styles.navBtn} />
      </View>

      <View style={styles.content}>
        <View style={styles.formSection}>
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

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.saveBtn, !canSave && styles.saveBtnInactive]}
            onPress={handleSave}
            disabled={loading || !canSave}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextInactive]}>
                Сохранить
              </Text>
            )}
          </Pressable>
        </View>

        {data.length > 0 && (
          <View style={styles.modelsSection}>
            <Text style={styles.section}>Модели</Text>
            <Text style={styles.hint}>Нажмите ⋮⋮ и перетащите для смены порядка</Text>

            <DraggableFlatList
              data={data}
              onDragEnd={({ from, to }) => reorderModels(from, to)}
              keyExtractor={(item) => item.key}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              activationDistance={10}
            />
          </View>
        )}
      </View>
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
  formSection: { padding: spacing.xl, gap: spacing.lg },
  modelsSection: { flex: 1, paddingHorizontal: spacing.xl },
  section: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  hint: {
    fontSize: typography.sm.fontSize,
    color: '#8E8E93',
    marginBottom: spacing.md,
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
  listContent: { gap: spacing.sm, paddingBottom: 120 },
  modelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  modelCardActive: {
    backgroundColor: '#2C2C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modelCardDimmed: {
    backgroundColor: '#111111',
    opacity: 0.9,
  },
  dragHandle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modelName: {
    fontSize: typography.base.fontSize,
    color: '#FFFFFF',
    flex: 1,
  },
  modelNameDimmed: {
    color: '#8E8E93',
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
