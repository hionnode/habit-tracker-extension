// Habit management and calculations

const Habits = {
  // Generate a unique ID
  generateId() {
    return 'habit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  },

  // Create a new habit
  createHabit(name, type, target = 1) {
    return {
      id: this.generateId(),
      name: name.trim(),
      type: type,
      target: type === 'binary' ? 1 : Math.max(1, target),
      createdAt: Storage.formatDate(new Date())
    };
  },

  // Check if a habit entry is completed
  isCompleted(entry, habit) {
    if (!entry) return false;
    if (habit.type === 'binary') {
      return entry.completed === true;
    }
    return entry.value >= habit.target;
  },

  // Calculate streak for a habit
  async calculateStreak(habitId) {
    const habits = await Storage.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;

    const entries = await Storage.getAllEntries();
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if completed today
    const todayStr = Storage.formatDate(today);
    const todayEntry = entries[todayStr]?.[habitId];
    const completedToday = this.isCompleted(todayEntry, habit);

    // Start from yesterday if today not complete
    let checkDate = new Date(today);
    if (!completedToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive completed days
    while (true) {
      const dateStr = Storage.formatDate(checkDate);
      const entry = entries[dateStr]?.[habitId];

      // Don't count days before habit was created
      if (dateStr < habit.createdAt) break;

      if (this.isCompleted(entry, habit)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  },

  // Get completion rate for a specific date
  async getCompletionRate(dateStr) {
    const habits = await Storage.getHabits();
    if (habits.length === 0) return 0;

    const entries = await Storage.getAllEntries();
    const dayEntries = entries[dateStr] || {};

    // Only count habits that existed on that date
    const activeHabits = habits.filter(h => h.createdAt <= dateStr);
    if (activeHabits.length === 0) return 0;

    let completed = 0;
    for (const habit of activeHabits) {
      const entry = dayEntries[habit.id];
      if (this.isCompleted(entry, habit)) {
        completed++;
      }
    }

    return completed / activeHabits.length;
  },

  // Get color based on completion rate
  getColor(completionRate, isFuture = false) {
    if (isFuture) {
      return '#2a2a2a'; // Grey for future
    }

    if (completionRate === 0) {
      return '#ff4444'; // Red for 0%
    }

    // Interpolate between red, yellow, and green
    if (completionRate <= 0.5) {
      return this.interpolateColor('#ff4444', '#ffcc00', completionRate * 2);
    }
    return this.interpolateColor('#ffcc00', '#50c878', (completionRate - 0.5) * 2);
  },

  // Interpolate between two hex colors
  interpolateColor(color1, color2, factor) {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);

    return `rgb(${r}, ${g}, ${b})`;
  },

  // Convert hex to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
};
