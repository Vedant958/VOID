import { MMKV } from 'react-native-mmkv';

let storageInstance: MMKV | null = null;
const memoryFallback = new Map<string, string>();

try {
  storageInstance = new MMKV({ id: 'void-music-storage' });
} catch (e) {
  console.warn('MMKV initialization failed, using memory fallback:', e);
}

export const storage = {
  getString: (key: string): string | undefined => {
    if (storageInstance) {
      return storageInstance.getString(key);
    }
    return memoryFallback.get(key);
  },
  
  set: (key: string, value: string) => {
    if (storageInstance) {
      storageInstance.set(key, value);
    } else {
      memoryFallback.set(key, value);
    }
  },
  
  delete: (key: string) => {
    if (storageInstance) {
      storageInstance.delete(key);
    } else {
      memoryFallback.delete(key);
    }
  },
  
  getJSON: <T>(key: string, defaultValue: T): T => {
    const raw = storage.getString(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  },
  
  setJSON: <T>(key: string, value: T) => {
    storage.set(key, JSON.stringify(value));
  },
};
