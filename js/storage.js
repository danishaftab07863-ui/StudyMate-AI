
const Storage = {
    get(key, fallback = []) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (error) {
            console.error("Storage read error:", error);
            return fallback;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error("Storage save error:", error);
            return false;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    }
};
