import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'give:';

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {
      // silently ignore write failures
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      // silently ignore
    }
  },
};
