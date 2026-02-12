import { describe, it, expect } from 'vitest';

// Storage is loaded globally via setup.js

describe('Storage', () => {
  // ---- Pure functions ----

  describe('formatDate', () => {
    it('formats a date as YYYY-MM-DD', () => {
      expect(Storage.formatDate(new Date(2025, 0, 1))).toBe('2025-01-01');
    });

    it('zero-pads single-digit months and days', () => {
      expect(Storage.formatDate(new Date(2025, 2, 5))).toBe('2025-03-05');
    });

    it('handles end of year', () => {
      expect(Storage.formatDate(new Date(2025, 11, 31))).toBe('2025-12-31');
    });

    it('accepts a date string', () => {
      expect(Storage.formatDate('2025-06-15')).toBe('2025-06-15');
    });
  });

  describe('sanitizeString', () => {
    it('returns empty string for non-string input', () => {
      expect(Storage.sanitizeString(null)).toBe('');
      expect(Storage.sanitizeString(undefined)).toBe('');
      expect(Storage.sanitizeString(42)).toBe('');
    });

    it('strips HTML tags', () => {
      expect(Storage.sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    it('strips nested HTML tags', () => {
      expect(Storage.sanitizeString('<b><i>hello</i></b>')).toBe('hello');
    });

    it('removes control characters', () => {
      expect(Storage.sanitizeString('hello\x00world\x1F')).toBe('helloworld');
    });

    it('trims whitespace', () => {
      expect(Storage.sanitizeString('  hello  ')).toBe('hello');
    });

    it('truncates to 200 characters', () => {
      const long = 'a'.repeat(300);
      expect(Storage.sanitizeString(long)).toHaveLength(200);
    });

    it('passes through clean strings unchanged', () => {
      expect(Storage.sanitizeString('Exercise daily')).toBe('Exercise daily');
    });
  });

  describe('isValidDateString', () => {
    it('returns true for valid YYYY-MM-DD format', () => {
      expect(Storage.isValidDateString('2025-01-15')).toBe(true);
    });

    it('returns false for non-string input', () => {
      expect(Storage.isValidDateString(null)).toBe(false);
      expect(Storage.isValidDateString(123)).toBe(false);
    });

    it('returns false for wrong format', () => {
      expect(Storage.isValidDateString('01-15-2025')).toBe(false);
      expect(Storage.isValidDateString('2025/01/15')).toBe(false);
      expect(Storage.isValidDateString('2025-1-5')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(Storage.isValidDateString('')).toBe(false);
    });
  });

  // ---- Async functions (chrome.storage mock) ----

  describe('saveHabit', () => {
    it('saves a new habit', async () => {
      const habit = { id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: '2025-01-01' };
      await Storage.saveHabit(habit);

      const habits = await Storage.getHabits();
      expect(habits).toHaveLength(1);
      expect(habits[0].name).toBe('Read');
    });

    it('updates an existing habit by id', async () => {
      const habit = { id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: '2025-01-01' };
      await Storage.saveHabit(habit);

      const updated = { ...habit, name: 'Read Books' };
      await Storage.saveHabit(updated);

      const habits = await Storage.getHabits();
      expect(habits).toHaveLength(1);
      expect(habits[0].name).toBe('Read Books');
    });

    it('enforces MAX_HABITS limit', async () => {
      for (let i = 0; i < Storage.MAX_HABITS; i++) {
        await Storage.saveHabit({ id: `h${i}`, name: `Habit ${i}`, type: 'binary', target: 1, createdAt: '2025-01-01' });
      }

      await expect(
        Storage.saveHabit({ id: 'h99', name: 'One Too Many', type: 'binary', target: 1, createdAt: '2025-01-01' })
      ).rejects.toThrow(/Maximum of 5 habits/);
    });

    it('allows updating when at max habits', async () => {
      for (let i = 0; i < Storage.MAX_HABITS; i++) {
        await Storage.saveHabit({ id: `h${i}`, name: `Habit ${i}`, type: 'binary', target: 1, createdAt: '2025-01-01' });
      }

      // Updating existing should not throw
      await Storage.saveHabit({ id: 'h0', name: 'Updated', type: 'binary', target: 1, createdAt: '2025-01-01' });
      const habits = await Storage.getHabits();
      expect(habits).toHaveLength(5);
      expect(habits[0].name).toBe('Updated');
    });
  });

  describe('deleteHabit', () => {
    it('removes habit and its entries', async () => {
      await Storage.saveHabit({ id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: '2025-01-01' });
      await Storage.saveEntry('2025-01-01', 'h1', 1);

      await Storage.deleteHabit('h1');

      const habits = await Storage.getHabits();
      expect(habits).toHaveLength(0);

      const entries = await Storage.getAllEntries();
      expect(entries['2025-01-01']).toBeUndefined();
    });
  });

  describe('importData', () => {
    it('imports valid data', async () => {
      const data = {
        habits: [{ id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: '2025-01-01' }],
        entries: {
          '2025-01-01': { h1: { completed: true, value: 1 } },
        },
      };

      const result = await Storage.importData(JSON.stringify(data));
      expect(result).toBe(true);

      const habits = await Storage.getHabits();
      expect(habits).toHaveLength(1);
      expect(habits[0].name).toBe('Read');
    });

    it('sanitizes habit names on import', async () => {
      const data = {
        habits: [{ id: 'h1', name: '<script>xss</script>', type: 'binary', target: 1, createdAt: '2025-01-01' }],
        entries: {},
      };

      await Storage.importData(JSON.stringify(data));
      const habits = await Storage.getHabits();
      expect(habits[0].name).toBe('xss');
    });

    it('rejects data with missing habits array', async () => {
      await expect(
        Storage.importData(JSON.stringify({ entries: {} }))
      ).rejects.toThrow(/habits must be an array/);
    });

    it('rejects data with missing entries object', async () => {
      await expect(
        Storage.importData(JSON.stringify({ habits: [] }))
      ).rejects.toThrow(/entries must be an object/);
    });

    it('rejects invalid habit type', async () => {
      const data = {
        habits: [{ id: 'h1', name: 'Bad', type: 'invalid', target: 1, createdAt: '2025-01-01' }],
        entries: {},
      };

      await expect(Storage.importData(JSON.stringify(data))).rejects.toThrow(/Invalid habit type/);
    });

    it('rejects invalid JSON', async () => {
      await expect(Storage.importData('not json')).rejects.toThrow();
    });

    it('skips entries with invalid date keys', async () => {
      const data = {
        habits: [{ id: 'h1', name: 'Read', type: 'binary', target: 1, createdAt: '2025-01-01' }],
        entries: {
          'bad-date': { h1: { completed: true, value: 1 } },
          '2025-01-01': { h1: { completed: true, value: 1 } },
        },
      };

      await Storage.importData(JSON.stringify(data));
      const entries = await Storage.getAllEntries();
      expect(Object.keys(entries)).toEqual(['2025-01-01']);
    });

    it('normalizes target to at least 1', async () => {
      const data = {
        habits: [{ id: 'h1', name: 'Read', type: 'count', target: -5, createdAt: '2025-01-01' }],
        entries: {},
      };

      await Storage.importData(JSON.stringify(data));
      const habits = await Storage.getHabits();
      expect(habits[0].target).toBe(1);
    });

    it('floors fractional target values', async () => {
      const data = {
        habits: [{ id: 'h1', name: 'Read', type: 'count', target: 3.7, createdAt: '2025-01-01' }],
        entries: {},
      };

      await Storage.importData(JSON.stringify(data));
      const habits = await Storage.getHabits();
      expect(habits[0].target).toBe(3);
    });
  });

  describe('streak freezes', () => {
    it('adds and checks a streak freeze', async () => {
      await Storage.addStreakFreeze('h1', '2025-01-05');
      expect(await Storage.hasStreakFreeze('h1', '2025-01-05')).toBe(true);
      expect(await Storage.hasStreakFreeze('h1', '2025-01-06')).toBe(false);
    });

    it('does not add duplicate freeze dates', async () => {
      await Storage.addStreakFreeze('h1', '2025-01-05');
      await Storage.addStreakFreeze('h1', '2025-01-05');
      const freezes = await Storage.getStreakFreezes();
      expect(freezes['h1']).toHaveLength(1);
    });

    it('removes a streak freeze', async () => {
      await Storage.addStreakFreeze('h1', '2025-01-05');
      await Storage.removeStreakFreeze('h1', '2025-01-05');
      expect(await Storage.hasStreakFreeze('h1', '2025-01-05')).toBe(false);
    });
  });
});
