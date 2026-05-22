import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, UserInstruction, ModelConfig } from '@/src/types';
import type { CapsCache } from '@/src/lib/modelCapabilities';

const DEFAULT_SYSTEM_PROMPT =
  'Ты — Star, полезный AI-ассистент. Отвечай кратко и по делу.';

interface SettingsState extends Omit<AppSettings, 'theme'> {
  models: string[];
  modelCaps: CapsCache;
  // Sandbox settings
  sandboxDaemonEnabled: boolean;
  sandboxDaemonMode: 'always' | 'screen_on' | 'charging';
  sandboxDaemonTimeoutMs: number;
  sandboxMaxEnvironments: number;
  sandboxMaxEnvironmentSizeMb: number;
  sandboxMaxTotalSizeMb: number;
  sandboxAutoCleanTmp: boolean;
  setApiKey: (key: string) => void;
  setBaseUrl: (url: string) => void;
  setModel: (model: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setCustomSystemPrompt: (prompt: string) => void;
  setInstructionsEnabled: (enabled: boolean) => void;
  addInstruction: (text: string) => void;
  updateInstruction: (id: string, text: string) => void;
  deleteInstruction: (id: string) => void;
  toggleInstruction: (id: string) => void;
  setModels: (models: string[]) => void;
  setModelCaps: (caps: CapsCache) => void;
  toggleModelVisibility: (id: string) => void;
  reorderModels: (fromIndex: number, toIndex: number) => void;
  syncModelConfigs: (models: string[]) => void;
  setSandboxDaemonEnabled: (enabled: boolean) => void;
  setSandboxDaemonMode: (mode: 'always' | 'screen_on' | 'charging') => void;
  setSandboxMaxEnvironments: (n: number) => void;
  setSandboxMaxEnvironmentSizeMb: (n: number) => void;
  setSandboxMaxTotalSizeMb: (n: number) => void;
  setSandboxAutoCleanTmp: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      baseUrl: '',
      model: '',
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      customSystemPrompt: '',
      instructionsEnabled: true,
      instructions: [],
      models: [],
      modelCaps: {},
      modelConfigs: [],
      // Sandbox defaults
      sandboxDaemonEnabled: false,
      sandboxDaemonMode: 'screen_on',
      sandboxDaemonTimeoutMs: 300000,
      sandboxMaxEnvironments: 20,
      sandboxMaxEnvironmentSizeMb: 200,
      sandboxMaxTotalSizeMb: 2000,
      sandboxAutoCleanTmp: true,

      setApiKey: (apiKey) => set({ apiKey }),
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setModel: (model) => set({ model }),
      setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
      setCustomSystemPrompt: (customSystemPrompt) => set({ customSystemPrompt }),
      setInstructionsEnabled: (instructionsEnabled) => set({ instructionsEnabled }),
      addInstruction: (text) =>
        set((state) => ({
          instructions: [
            ...state.instructions,
            {
              id: Math.random().toString(36).substring(2, 9),
              text,
              enabled: true,
              order: state.instructions.length,
            },
          ],
        })),
      updateInstruction: (id, text) =>
        set((state) => ({
          instructions: state.instructions.map((i) =>
            i.id === id ? { ...i, text } : i
          ),
        })),
      deleteInstruction: (id) =>
        set((state) => ({
          instructions: state.instructions.filter((i) => i.id !== id),
        })),
      toggleInstruction: (id) =>
        set((state) => ({
          instructions: state.instructions.map((i) =>
            i.id === id ? { ...i, enabled: !i.enabled } : i
          ),
        })),
      setModels: (models) => set({ models }),
      setModelCaps: (modelCaps) => set({ modelCaps }),
      toggleModelVisibility: (id) =>
        set((state) => ({
          modelConfigs: state.modelConfigs.map((c) =>
            c.id === id ? { ...c, visible: !c.visible } : c
          ),
        })),
      reorderModels: (fromIndex, toIndex) =>
        set((state) => {
          const configs = [...state.modelConfigs];
          const [removed] = configs.splice(fromIndex, 1);
          configs.splice(toIndex, 0, removed);
          return {
            modelConfigs: configs.map((c, i) => ({ ...c, order: i })),
          };
        }),
      syncModelConfigs: (models) =>
        set((state) => {
          const existing = new Map(state.modelConfigs.map((c) => [c.id, c]));
          const configs: ModelConfig[] = models.map((id, i) => ({
            id,
            visible: existing.get(id)?.visible ?? true,
            order: i,
          }));
          return { modelConfigs: configs };
        }),
      setSandboxDaemonEnabled: (sandboxDaemonEnabled) => set({ sandboxDaemonEnabled }),
      setSandboxDaemonMode: (sandboxDaemonMode) => set({ sandboxDaemonMode }),
      setSandboxMaxEnvironments: (sandboxMaxEnvironments) => set({ sandboxMaxEnvironments }),
      setSandboxMaxEnvironmentSizeMb: (sandboxMaxEnvironmentSizeMb) => set({ sandboxMaxEnvironmentSizeMb }),
      setSandboxMaxTotalSizeMb: (sandboxMaxTotalSizeMb) => set({ sandboxMaxTotalSizeMb }),
      setSandboxAutoCleanTmp: (sandboxAutoCleanTmp) => set({ sandboxAutoCleanTmp }),
    }),
    {
      name: 'star-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
