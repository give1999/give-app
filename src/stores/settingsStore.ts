import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings } from '@/src/types';
import type { CapsCache } from '@/src/lib/modelCapabilities';

const DEFAULT_SYSTEM_PROMPT =
  'Ты — Give, полезный AI-ассистент. Отвечай кратко и по делу.';

interface SettingsState extends Omit<AppSettings, 'theme'> {
  models: string[];
  modelCaps: CapsCache;
  setApiKey: (key: string) => void;
  setBaseUrl: (url: string) => void;
  setModel: (model: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setModels: (models: string[]) => void;
  setModelCaps: (caps: CapsCache) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      baseUrl: '',
      model: '',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      models: [],
      modelCaps: {},

      setApiKey: (apiKey) => set({ apiKey }),
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setModel: (model) => set({ model }),
      setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
      setModels: (models) => set({ models }),
      setModelCaps: (modelCaps) => set({ modelCaps }),
    }),
    {
      name: 'give-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
