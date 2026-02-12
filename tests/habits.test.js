import { describe, it, expect } from 'vitest';

// Habits and Storage are loaded globally via setup.js

describe('Habits', () => {
  // ---- Pure functions ----

  describe('createHabit', () => {
    it('creates a binary habit with target 1', () => {
      const habit = Habits.createHabit('Exercise', 'binary');
      expect(habit.name).toBe('Exercise');
      expect(habit.type).toBe('binary');
      expect(habit.target).toBe(1);
      expect(habit.id).toMatch(/^habit-/);
      expect(Storage.isValidDateString(habit.createdAt)).toBe(true);
    });

    it('creates a count habit with custom target', () => {
      const habit = Habits.createHabit('Water', 'count', 8);
      expect(habit.type).toBe('count');
      expect(habit.target).toBe(8);
    });

    it('forces target to 1 for binary habits regardless of input', () => {
      const habit = Habits.createHabit('Read', 'binary', 10);
      expect(habit.target).toBe(1);
    });

    it('enforces minimum target of 1 for count habits', () => {
      const habit = Habits.createHabit('Water', 'count', 0);
      expect(habit.target).toBe(1);
    });

    it('trims whitespace from name', () => {
      const habit = Habits.createHabit('  Exercise  ', 'binary');
      expect(habit.name).toBe('Exercise');
    });
  });

  describe('isCompleted', () => {
    it('returns false for null entry', () => {
      expect(Habits.isCompleted(null, { type: 'binary' })).toBe(false);
    });

    it('returns false for undefined entry', () => {
      expect(Habits.isCompleted(undefined, { type: 'binary' })).toBe(false);
    });

    it('returns true for completed binary entry', () => {
      expect(Habits.isCompleted({ completed: true, value: 1 }, { type: 'binary' })).toBe(true);
    });

    it('returns false for incomplete binary entry', () => {
      expect(Habits.isCompleted({ completed: false, value: 0 }, { type: 'binary' })).toBe(false);
    });

    it('returns true when count meets target', () => {
      expect(Habits.isCompleted({ completed: true, value: 8 }, { type: 'count', target: 8 })).toBe(true);
    });

    it('returns true when count exceeds target', () => {
      expect(Habits.isCompleted({ completed: true, value: 10 }, { type: 'count', target: 8 })).toBe(true);
    });

    it('returns false when count is below target', () => {
      expect(Habits.isCompleted({ completed: false, value: 5 }, { type: 'count', target: 8 })).toBe(false);
    });
  });

  describe('hexToRgb', () => {
    it('parses a hex color with hash', () => {
      expect(Habits.hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('parses a hex color without hash', () => {
      expect(Habits.hexToRgb('00ff00')).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('parses white', () => {
      expect(Habits.hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('parses black', () => {
      expect(Habits.hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('returns null for invalid input', () => {
      expect(Habits.hexToRgb('not-a-color')).toBeNull();
    });
  });

  describe('interpolateColor', () => {
    it('returns first color at factor 0', () => {
      expect(Habits.interpolateColor('#ff0000', '#00ff00', 0)).toBe('rgb(255, 0, 0)');
    });

    it('returns second color at factor 1', () => {
      expect(Habits.interpolateColor('#ff0000', '#00ff00', 1)).toBe('rgb(0, 255, 0)');
    });

    it('returns midpoint at factor 0.5', () => {
      const result = Habits.interpolateColor('#000000', '#ffffff', 0.5);
      expect(result).toBe('rgb(128, 128, 128)');
    });
  });

  describe('getColor', () => {
    it('returns grey for future dates', () => {
      expect(Habits.getColor(0, true)).toBe('#2a2a2a');
      expect(Habits.getColor(1, true)).toBe('#2a2a2a');
    });

    it('returns amber/coral for 0% completion', () => {
      expect(Habits.getColor(0, false)).toBe('#e07850');
    });

    it('returns an rgb color for partial completion', () => {
      const color = Habits.getColor(0.5, false);
      expect(color).toMatch(/^rgb\(/);
    });

    it('returns an rgb color for 100% completion', () => {
      const color = Habits.getColor(1, false);
      expect(color).toMatch(/^rgb\(/);
    });
  });

  // ---- Async functions (with chrome.storage mock) ----

  describe('calculateStreak', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = Storage.formatDate(today);

    function daysAgo(n) {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return Storage.formatDate(d);
    }

    it('returns 0 for nonexistent habit', async () => {
      expect(await Habits.calculateStreak('nonexistent')).toBe(0);
    });

    it('returns 1 when only today is completed', async () => {
      const habit = { id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: daysAgo(10) };
      await Storage.saveHabit(habit);
      await Storage.saveEntry(todayStr, 'h1', 1);

      expect(await Habits.calculateStreak('h1')).toBe(1);
    });

    it('counts consecutive days including today', async () => {
      const habit = { id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: daysAgo(10) };
      await Storage.saveHabit(habit);

      // Complete today and previous 2 days
      await Storage.saveEntry(todayStr, 'h1', 1);
      await Storage.saveEntry(daysAgo(1), 'h1', 1);
      await Storage.saveEntry(daysAgo(2), 'h1', 1);

      expect(await Habits.calculateStreak('h1')).toBe(3);
    });

    it('breaks streak on missed day', async () => {
      const habit = { id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: daysAgo(10) };
      await Storage.saveHabit(habit);

      await Storage.saveEntry(todayStr, 'h1', 1);
      await Storage.saveEntry(daysAgo(1), 'h1', 1);
      // daysAgo(2) is missed
      await Storage.saveEntry(daysAgo(3), 'h1', 1);

      expect(await Habits.calculateStreak('h1')).toBe(2);
    });

    it('counts streak from yesterday when today not completed', async () => {
      const habit = { id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: daysAgo(10) };
      await Storage.saveHabit(habit);

      // Don't complete today, but complete yesterday and day before
      await Storage.saveEntry(daysAgo(1), 'h1', 1);
      await Storage.saveEntry(daysAgo(2), 'h1', 1);

      expect(await Habits.calculateStreak('h1')).toBe(2);
    });

    it('respects streak freeze (frozen day does not break streak)', async () => {
      const habit = { id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: daysAgo(10) };
      await Storage.saveHabit(habit);

      await Storage.saveEntry(todayStr, 'h1', 1);
      // daysAgo(1) is missed but frozen
      await Storage.addStreakFreeze('h1', daysAgo(1));
      await Storage.saveEntry(daysAgo(2), 'h1', 1);

      // Streak: today + daysAgo(2) = 2 (freeze bridges the gap but doesn't add)
      expect(await Habits.calculateStreak('h1')).toBe(2);
    });

    it('does not count days before habit createdAt', async () => {
      const habit = { id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: daysAgo(2) };
      await Storage.saveHabit(habit);

      await Storage.saveEntry(todayStr, 'h1', 1);
      await Storage.saveEntry(daysAgo(1), 'h1', 1);
      await Storage.saveEntry(daysAgo(2), 'h1', 1);
      // daysAgo(3) entry should be ignored since habit was created daysAgo(2)
      await Storage.saveEntry(daysAgo(3), 'h1', 1);

      expect(await Habits.calculateStreak('h1')).toBe(3);
    });
  });

  describe('calculateBestStreak', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = Storage.formatDate(today);

    function daysAgo(n) {
      const d = new Date(today);
      d.setDate(d.getDate() - n);
      return Storage.formatDate(d);
    }

    it('returns 0 for nonexistent habit', async () => {
      expect(await Habits.calculateBestStreak('nonexistent')).toBe(0);
    });

    it('finds the best streak across history', async () => {
      const habit = { id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: daysAgo(10) };
      await Storage.saveHabit(habit);

      // Old streak of 3
      await Storage.saveEntry(daysAgo(10), 'h1', 1);
      await Storage.saveEntry(daysAgo(9), 'h1', 1);
      await Storage.saveEntry(daysAgo(8), 'h1', 1);
      // Gap
      // Current streak of 2
      await Storage.saveEntry(daysAgo(1), 'h1', 1);
      await Storage.saveEntry(todayStr, 'h1', 1);

      expect(await Habits.calculateBestStreak('h1')).toBe(3);
    });

    it('returns current streak if it is the best', async () => {
      const habit = { id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: daysAgo(5) };
      await Storage.saveHabit(habit);

      // 4-day streak up to today
      await Storage.saveEntry(daysAgo(3), 'h1', 1);
      await Storage.saveEntry(daysAgo(2), 'h1', 1);
      await Storage.saveEntry(daysAgo(1), 'h1', 1);
      await Storage.saveEntry(todayStr, 'h1', 1);

      expect(await Habits.calculateBestStreak('h1')).toBe(4);
    });
  });
});
