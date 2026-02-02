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

  // Calculate streak for a habit (accounts for freeze days)
  async calculateStreak(habitId) {
    const habits = await Storage.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;

    const entries = await Storage.getAllEntries();
    const freezes = await Storage.getStreakFreezes();
    const habitFreezes = freezes[habitId] || [];

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if completed today
    const todayStr = Storage.formatDate(today);
    const todayEntry = entries[todayStr]?.[habitId];
    const completedToday = this.isCompleted(todayEntry, habit);
    const todayFrozen = habitFreezes.includes(todayStr);

    // Start from yesterday if today not complete and not frozen
    let checkDate = new Date(today);
    if (completedToday) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (todayFrozen) {
      // Today is frozen, count it but don't add to streak
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive completed days (or frozen days)
    while (true) {
      const dateStr = Storage.formatDate(checkDate);
      const entry = entries[dateStr]?.[habitId];
      const isFrozen = habitFreezes.includes(dateStr);

      // Don't count days before habit was created
      if (dateStr < habit.createdAt) break;

      if (this.isCompleted(entry, habit)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (isFrozen) {
        // Frozen day doesn't break streak but doesn't add to it
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
  // Uses softer amber for missed days (growth-oriented) instead of harsh red (shame-based)
  getColor(completionRate, isFuture = false) {
    if (isFuture) {
      return '#2a2a2a'; // Grey for future
    }

    if (completionRate === 0) {
      return '#e07850'; // Softer amber/coral for 0% (growth-oriented, not shame-inducing)
    }

    // Interpolate between amber, yellow, and green
    if (completionRate <= 0.5) {
      return this.interpolateColor('#e07850', '#ffcc00', completionRate * 2);
    }
    return this.interpolateColor('#ffcc00', '#50c878', (completionRate - 0.5) * 2);
  },

// Calculate best (longest) historical streak for a habit
  async calculateBestStreak(habitId) {
    const habits = await Storage.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return 0;

    const entries = await Storage.getAllEntries();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = Storage.formatDate(today);

    // Start from habit creation date
    const startDate = new Date(habit.createdAt);
    startDate.setHours(0, 0, 0, 0);

    let bestStreak = 0;
    let currentStreak = 0;
    let checkDate = new Date(startDate);

    while (checkDate <= today) {
      const dateStr = Storage.formatDate(checkDate);
      const entry = entries[dateStr]?.[habitId];

      if (this.isCompleted(entry, habit)) {
        currentStreak++;
        if (currentStreak > bestStreak) {
          bestStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }

      checkDate.setDate(checkDate.getDate() + 1);
    }

    return bestStreak;
  },

  // Get completion statistics for a habit
  async getCompletionStats(habitId) {
    const habits = await Storage.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return { completionRate: 0, totalDays: 0, completedDays: 0 };

    const entries = await Storage.getAllEntries();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from habit creation date
    const startDate = new Date(habit.createdAt);
    startDate.setHours(0, 0, 0, 0);

    let totalDays = 0;
    let completedDays = 0;
    let checkDate = new Date(startDate);

    while (checkDate <= today) {
      const dateStr = Storage.formatDate(checkDate);
      totalDays++;

      const entry = entries[dateStr]?.[habitId];
      if (this.isCompleted(entry, habit)) {
        completedDays++;
      }

      checkDate.setDate(checkDate.getDate() + 1);
    }

    const completionRate = totalDays > 0 ? completedDays / totalDays : 0;

    return {
      completionRate,
      totalDays,
      completedDays
    };
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
