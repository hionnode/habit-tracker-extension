import { describe, it, expect } from 'vitest';

// Websites and Storage are loaded globally via setup.js

describe('Websites', () => {
  // ---- Pure functions ----

  describe('formatTime', () => {
    it('formats seconds under a minute', () => {
      expect(Websites.formatTime(45)).toBe('45s');
    });

    it('formats exact minutes', () => {
      expect(Websites.formatTime(60)).toBe('1m');
      expect(Websites.formatTime(300)).toBe('5m');
    });

    it('formats hours and minutes', () => {
      expect(Websites.formatTime(3660)).toBe('1h 1m');
    });

    it('formats exact hours without minutes', () => {
      expect(Websites.formatTime(3600)).toBe('1h');
      expect(Websites.formatTime(7200)).toBe('2h');
    });

    it('formats zero seconds', () => {
      expect(Websites.formatTime(0)).toBe('0s');
    });

    it('formats large values', () => {
      expect(Websites.formatTime(86400)).toBe('24h');
    });
  });

  describe('formatTimeLimit', () => {
    it('returns "No limit" for null', () => {
      expect(Websites.formatTimeLimit(null)).toBe('No limit');
    });

    it('returns "No limit" for undefined', () => {
      expect(Websites.formatTimeLimit(undefined)).toBe('No limit');
    });

    it('formats seconds when limit is set', () => {
      expect(Websites.formatTimeLimit(3600)).toBe('1h');
      expect(Websites.formatTimeLimit(1800)).toBe('30m');
    });
  });

  // ---- Async functions (with chrome.storage mock) ----

  describe('isBlocked', () => {
    it('returns false when no limit is set', async () => {
      expect(await Websites.isBlocked('example.com')).toBe(false);
    });

    it('returns false when under limit', async () => {
      const today = Storage.formatDate(new Date());

      // Set a 1-hour limit
      await Storage.setWebsiteSetting('example.com', { dailyLimitSeconds: 3600 });
      // Record 30 minutes of usage
      await Storage.updateWebsiteTime(today, 'example.com', 1800, null);

      expect(await Websites.isBlocked('example.com')).toBe(false);
    });

    it('returns true when limit is exactly reached', async () => {
      const today = Storage.formatDate(new Date());

      await Storage.setWebsiteSetting('example.com', { dailyLimitSeconds: 3600 });
      await Storage.updateWebsiteTime(today, 'example.com', 3600, null);

      expect(await Websites.isBlocked('example.com')).toBe(true);
    });

    it('returns true when limit is exceeded', async () => {
      const today = Storage.formatDate(new Date());

      await Storage.setWebsiteSetting('example.com', { dailyLimitSeconds: 3600 });
      await Storage.updateWebsiteTime(today, 'example.com', 4000, null);

      expect(await Websites.isBlocked('example.com')).toBe(true);
    });
  });

  describe('getRemainingTime', () => {
    it('returns null when no limit is set', async () => {
      expect(await Websites.getRemainingTime('example.com')).toBeNull();
    });

    it('returns full limit when no usage', async () => {
      await Storage.setWebsiteSetting('example.com', { dailyLimitSeconds: 3600 });

      expect(await Websites.getRemainingTime('example.com')).toBe(3600);
    });

    it('returns remaining time after partial usage', async () => {
      const today = Storage.formatDate(new Date());

      await Storage.setWebsiteSetting('example.com', { dailyLimitSeconds: 3600 });
      await Storage.updateWebsiteTime(today, 'example.com', 1000, null);

      expect(await Websites.getRemainingTime('example.com')).toBe(2600);
    });

    it('returns 0 when limit exceeded (never negative)', async () => {
      const today = Storage.formatDate(new Date());

      await Storage.setWebsiteSetting('example.com', { dailyLimitSeconds: 3600 });
      await Storage.updateWebsiteTime(today, 'example.com', 5000, null);

      expect(await Websites.getRemainingTime('example.com')).toBe(0);
    });
  });

  describe('DEFAULT_DOMAIN_CATEGORIES', () => {
    it('categorizes github.com as Code', () => {
      expect(Websites.DEFAULT_DOMAIN_CATEGORIES['github.com']).toBe('cat-2');
    });

    it('categorizes youtube.com as Entertainment', () => {
      expect(Websites.DEFAULT_DOMAIN_CATEGORIES['youtube.com']).toBe('cat-4');
    });

    it('categorizes twitter.com as Social Media', () => {
      expect(Websites.DEFAULT_DOMAIN_CATEGORIES['twitter.com']).toBe('cat-3');
    });

    it('categorizes notion.so as Productivity', () => {
      expect(Websites.DEFAULT_DOMAIN_CATEGORIES['notion.so']).toBe('cat-1');
    });
  });
});
