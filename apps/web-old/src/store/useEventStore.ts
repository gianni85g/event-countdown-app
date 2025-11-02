import { createEventStore } from "@moments/shared";

const localStorageAdapter = {
  getItem: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }
};

export const useEventStore = createEventStore(localStorageAdapter);

