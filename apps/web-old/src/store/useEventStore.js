import { createEventStore } from "@moments/shared";
const localStorageAdapter = {
    getItem: (key) => {
        try {
            return window.localStorage.getItem(key);
        }
        catch {
            return null;
        }
    },
    setItem: (key, value) => {
        try {
            window.localStorage.setItem(key, value);
        }
        catch { }
    },
    removeItem: (key) => {
        try {
            window.localStorage.removeItem(key);
        }
        catch { }
    }
};
export const useEventStore = createEventStore(localStorageAdapter);
