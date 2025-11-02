import { createEventStore } from "@moments/shared";
import AsyncStorage from "@react-native-async-storage/async-storage";

const asyncStorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  }
};

export const useEventStore = createEventStore(asyncStorageAdapter);

