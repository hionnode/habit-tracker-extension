// In-memory mock for chrome.storage.local

export function createChromeMock() {
  let store = {};

  const mock = {
    storage: {
      local: {
        async get(keys) {
          if (keys === null || keys === undefined) {
            return { ...store };
          }

          if (typeof keys === 'string') {
            return { [keys]: store[keys] };
          }

          if (Array.isArray(keys)) {
            const result = {};
            for (const key of keys) {
              if (key in store) {
                result[key] = store[key];
              }
            }
            return result;
          }

          // Object with defaults
          if (typeof keys === 'object') {
            const result = {};
            for (const [key, defaultValue] of Object.entries(keys)) {
              result[key] = key in store ? store[key] : defaultValue;
            }
            return result;
          }

          return {};
        },

        async set(items) {
          for (const [key, value] of Object.entries(items)) {
            store[key] = JSON.parse(JSON.stringify(value));
          }
        },

        async remove(keys) {
          const keyList = typeof keys === 'string' ? [keys] : keys;
          for (const key of keyList) {
            delete store[key];
          }
        },

        async clear() {
          store = {};
        },
      },
    },
  };

  // Expose reset for beforeEach
  mock._reset = () => {
    store = {};
  };

  return mock;
}
