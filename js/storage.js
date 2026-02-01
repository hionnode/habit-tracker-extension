// Storage layer for habit tracker using chrome.storage.local

const Storage = {
  // Get all data from storage
  async getData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['habits', 'entries'], (result) => {
        resolve({
          habits: result.habits || [],
          entries: result.entries || {}
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

  // Import data from JSON
  async importData(jsonString) {
    try {
      const data = JSON.parse(jsonString);

      // Validate structure
      if (!Array.isArray(data.habits)) {
        throw new Error('Invalid data: habits must be an array');
      }
      if (typeof data.entries !== 'object') {
        throw new Error('Invalid data: entries must be an object');
      }

      // Validate habits
      for (const habit of data.habits) {
        if (!habit.id || !habit.name || !habit.type) {
          throw new Error('Invalid habit structure');
        }
        if (!['binary', 'count'].includes(habit.type)) {
          throw new Error('Invalid habit type');
        }
      }

      return new Promise((resolve) => {
        chrome.storage.local.set({
          habits: data.habits,
          entries: data.entries
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
  }
};
