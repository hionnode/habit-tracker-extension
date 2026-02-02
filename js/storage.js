// Storage layer for habit tracker using chrome.storage.local

const Storage = {
  // Get all data from storage
  async getData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['habits', 'entries', 'streakFreezes'], (result) => {
        resolve({
          habits: result.habits || [],
          entries: result.entries || {},
          streakFreezes: result.streakFreezes || {} // { habitId: ['YYYY-MM-DD', ...] }
        });
      });
    });
  },

  // Get all habits
  async getHabits() {
    const data = await this.getData();
    return data.habits;
  },

  // Maximum number of habits allowed
  MAX_HABITS: 5,

  // Save a habit (add or update)
  async saveHabit(habit) {
    const data = await this.getData();
    const index = data.habits.findIndex(h => h.id === habit.id);

    if (index >= 0) {
      // Update existing habit
      data.habits[index] = habit;
    } else {
      // Check limit before adding new habit
      if (data.habits.length >= this.MAX_HABITS) {
        throw new Error(`Maximum of ${this.MAX_HABITS} habits reached`);
      }
      data.habits.push(habit);
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ habits: data.habits }, resolve);
    });
  },

  // Delete a habit
  async deleteHabit(id) {
    const data = await this.getData();
    data.habits = data.habits.filter(h => h.id !== id);

    // Also remove entries for this habit
    for (const date in data.entries) {
      if (data.entries[date][id]) {
        delete data.entries[date][id];
      }
      // Clean up empty date entries
      if (Object.keys(data.entries[date]).length === 0) {
        delete data.entries[date];
      }
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({
        habits: data.habits,
        entries: data.entries
      }, resolve);
    });
  },

  // Get entries for a date range
  async getEntries(startDate, endDate) {
    const data = await this.getData();
    const entries = {};

    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = this.formatDate(d);
      if (data.entries[dateStr]) {
        entries[dateStr] = data.entries[dateStr];
      }
    }

    return entries;
  },

  // Get all entries
  async getAllEntries() {
    const data = await this.getData();
    return data.entries;
  },

  // Save an entry for a specific date and habit
  async saveEntry(date, habitId, value) {
    const data = await this.getData();

    if (!data.entries[date]) {
      data.entries[date] = {};
    }

    const habit = data.habits.find(h => h.id === habitId);
    if (!habit) return;

    const completed = habit.type === 'binary'
      ? value >= 1
      : value >= habit.target;

    data.entries[date][habitId] = {
      completed,
      value: Number(value)
    };

    return new Promise((resolve) => {
      chrome.storage.local.set({ entries: data.entries }, resolve);
    });
  },

  // Export all data as JSON
  async exportData() {
    const data = await this.getData();
    return JSON.stringify(data, null, 2);
  },

  // Sanitize a string to prevent XSS (strips HTML tags and control chars)
  sanitizeString(str) {
    if (typeof str !== 'string') return '';
    // Remove HTML tags, control characters, and trim
    return str
      .replace(/<[^>]*>/g, '')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim()
      .substring(0, 200); // Limit length
  },

  // Validate date format YYYY-MM-DD
  isValidDateString(str) {
    if (typeof str !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(str);
  },

  // Import data from JSON
  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // Validate structure
      if (!Array.isArray(data.habits)) {
        throw new Error('Invalid data: habits must be an array');
      }
      if (typeof data.entries !== 'object' || data.entries === null) {
        throw new Error('Invalid data: entries must be an object');
      }

      // Validate and sanitize habits
      const sanitizedHabits = [];
      for (const habit of data.habits) {
        if (!habit.id || !habit.name || !habit.type) {
          throw new Error('Invalid habit structure');
        }
        if (!['binary', 'count'].includes(habit.type)) {
          throw new Error('Invalid habit type');
        }

        // Sanitize string fields
        sanitizedHabits.push({
          id: this.sanitizeString(habit.id),
          name: this.sanitizeString(habit.name),
          type: habit.type,
          target: typeof habit.target === 'number' ? Math.max(1, Math.floor(habit.target)) : 1,
          createdAt: this.isValidDateString(habit.createdAt) ? habit.createdAt : this.formatDate(new Date())
        });
      }

      // Validate and sanitize entries
      const sanitizedEntries = {};
      for (const [dateKey, dayEntries] of Object.entries(data.entries)) {
        // Validate date key format
        if (!this.isValidDateString(dateKey)) continue;

        if (typeof dayEntries !== 'object' || dayEntries === null) continue;

        sanitizedEntries[dateKey] = {};
        for (const [habitId, entry] of Object.entries(dayEntries)) {
          // Validate habitId exists in habits
          const sanitizedHabitId = this.sanitizeString(habitId);
          if (!sanitizedHabits.some(h => h.id === sanitizedHabitId)) continue;

          // Validate entry structure
          if (typeof entry !== 'object' || entry === null) continue;

          sanitizedEntries[dateKey][sanitizedHabitId] = {
            completed: Boolean(entry.completed),
            value: typeof entry.value === 'number' ? Math.max(0, Math.floor(entry.value)) : 0
          };
        }

        // Remove empty date entries
        if (Object.keys(sanitizedEntries[dateKey]).length === 0) {
          delete sanitizedEntries[dateKey];
        }
      }

      return new Promise((resolve) => {
        chrome.storage.local.set({
          habits: sanitizedHabits,
          entries: sanitizedEntries
        }, () => resolve(true));
      });
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  },

  // Format date as YYYY-MM-DD
  formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // ============== Website Tracking Methods ==============

  // Default website categories
  DEFAULT_CATEGORIES: [
    { id: 'cat-1', name: 'Productivity', color: '#4a9eff', isDefault: true },
    { id: 'cat-2', name: 'Code', color: '#50c878', isDefault: true },
    { id: 'cat-3', name: 'Social Media', color: '#ff9500', isDefault: true },
    { id: 'cat-4', name: 'Entertainment', color: '#ff4444', isDefault: true }
  ],

  // Get website categories
  async getWebsiteCategories() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['websiteCategories'], (result) => {
        resolve(result.websiteCategories || this.DEFAULT_CATEGORIES);
      });
    });
  },

  // Save website categories
  async saveWebsiteCategories(categories) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ websiteCategories: categories }, resolve);
    });
  },

  // Add or update a category
  async saveWebsiteCategory(category) {
    const categories = await this.getWebsiteCategories();
    const index = categories.findIndex(c => c.id === category.id);

    if (index >= 0) {
      categories[index] = category;
    } else {
      categories.push(category);
    }

    return this.saveWebsiteCategories(categories);
  },

  // Delete a category
  async deleteWebsiteCategory(categoryId) {
    const categories = await this.getWebsiteCategories();
    const filtered = categories.filter(c => c.id !== categoryId);
    return this.saveWebsiteCategories(filtered);
  },

  // Get website settings (category assignments, custom names)
  async getWebsiteSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['websiteSettings'], (result) => {
        resolve(result.websiteSettings || {});
      });
    });
  },

  // Set settings for a specific website
  async setWebsiteSetting(domain, setting) {
    const settings = await this.getWebsiteSettings();
    settings[domain] = { ...settings[domain], ...setting };
    return new Promise((resolve) => {
      chrome.storage.local.set({ websiteSettings: settings }, resolve);
    });
  },

  // Get website entries for a date range
  async getWebsiteEntries(startDate, endDate) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['websiteEntries'], (result) => {
        const allEntries = result.websiteEntries || {};
        const entries = {};

        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = this.formatDate(d);
          if (allEntries[dateStr]) {
            entries[dateStr] = allEntries[dateStr];
          }
        }

        resolve(entries);
      });
    });
  },

  // Get all website entries
  async getAllWebsiteEntries() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['websiteEntries'], (result) => {
        resolve(result.websiteEntries || {});
      });
    });
  },

  // Update website time (used by background script)
  async updateWebsiteTime(date, domain, seconds, favicon) {
    const allEntries = await this.getAllWebsiteEntries();

    if (!allEntries[date]) {
      allEntries[date] = {};
    }

    if (!allEntries[date][domain]) {
      allEntries[date][domain] = { totalSeconds: 0, favicon: null };
    }

    allEntries[date][domain].totalSeconds += seconds;
    if (favicon) {
      allEntries[date][domain].favicon = favicon;
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ websiteEntries: allEntries }, resolve);
    });
  },

  // ============== Streak Freeze Methods ==============

  // Get streak freezes for all habits
  async getStreakFreezes() {
    const data = await this.getData();
    return data.streakFreezes;
  },

  // Add a streak freeze for a habit on a specific date
  async addStreakFreeze(habitId, date) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['streakFreezes'], (result) => {
        const freezes = result.streakFreezes || {};
        if (!freezes[habitId]) {
          freezes[habitId] = [];
        }
        if (!freezes[habitId].includes(date)) {
          freezes[habitId].push(date);
        }
        chrome.storage.local.set({ streakFreezes: freezes }, resolve);
      });
    });
  },

  // Remove a streak freeze
  async removeStreakFreeze(habitId, date) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['streakFreezes'], (result) => {
        const freezes = result.streakFreezes || {};
        if (freezes[habitId]) {
          freezes[habitId] = freezes[habitId].filter(d => d !== date);
        }
        chrome.storage.local.set({ streakFreezes: freezes }, resolve);
      });
    });
  },

  // Check if a date has a streak freeze for a habit
  async hasStreakFreeze(habitId, date) {
    const freezes = await this.getStreakFreezes();
    return freezes[habitId]?.includes(date) || false;
  }
};
