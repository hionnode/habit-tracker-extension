import { describe, it, expect } from 'vitest';

// Chart and Habits are loaded globally via setup.js

describe('Chart', () => {
  describe('getDayOfYear', () => {
    it('returns 1 for January 1st', () => {
      expect(Chart.getDayOfYear(new Date(2025, 0, 1))).toBe(1);
    });

    it('returns 32 for February 1st (non-leap year)', () => {
      expect(Chart.getDayOfYear(new Date(2025, 1, 1))).toBe(32);
    });

    it('returns 365 for December 31st (non-leap year)', () => {
      expect(Chart.getDayOfYear(new Date(2025, 11, 31))).toBe(365);
    });

    it('returns 366 for December 31st of a leap year', () => {
      expect(Chart.getDayOfYear(new Date(2024, 11, 31))).toBe(366);
    });

    it('returns 60 for March 1st of a leap year', () => {
      expect(Chart.getDayOfYear(new Date(2024, 2, 1))).toBe(61);
    });
  });

  describe('getPatternId', () => {
    it('returns null for future dates', () => {
      expect(Chart.getPatternId(0, true)).toBeNull();
      expect(Chart.getPatternId(0.5, true)).toBeNull();
      expect(Chart.getPatternId(1, true)).toBeNull();
    });

    it('returns pattern-none for 0% rate', () => {
      expect(Chart.getPatternId(0, false)).toBe('pattern-none');
    });

    it('returns pattern-partial for partial completion', () => {
      expect(Chart.getPatternId(0.5, false)).toBe('pattern-partial');
      expect(Chart.getPatternId(0.25, false)).toBe('pattern-partial');
      expect(Chart.getPatternId(0.99, false)).toBe('pattern-partial');
    });

    it('returns null for 100% completion (solid fill)', () => {
      expect(Chart.getPatternId(1, false)).toBeNull();
    });
  });

  describe('getMiniChartColor', () => {
    it('returns grey for future dates', () => {
      expect(Chart.getMiniChartColor(false, true)).toBe('#2a2a2a');
    });

    it('returns grey for null (before habit existed)', () => {
      expect(Chart.getMiniChartColor(null, false)).toBe('#2a2a2a');
    });

    it('returns green for completed', () => {
      expect(Chart.getMiniChartColor(true, false)).toBe('#50c878');
    });

    it('returns amber/coral for not completed', () => {
      // Should return the same color as Habits.getColor(0, false)
      expect(Chart.getMiniChartColor(false, false)).toBe(Habits.getColor(0, false));
    });
  });

  describe('static properties', () => {
    it('has correct cell size', () => {
      expect(Chart.cellSize).toBe(18);
    });

    it('has correct cell gap', () => {
      expect(Chart.cellGap).toBe(2);
    });

    it('has correct mini cell size', () => {
      expect(Chart.miniCellSize).toBe(6);
    });

    it('has correct mini cell gap', () => {
      expect(Chart.miniCellGap).toBe(1);
    });
  });
});
