import { describe, expect, it } from 'vitest';
import { canUseSwap, getRemaining, slotsNeededToday } from './usageLogic.ts';

describe('allow-snack-assignment usage logic', () => {
  describe('getRemaining', () => {
    it('returns null for unlimited', () => {
      expect(getRemaining(null, 99)).toBeNull();
    });
    it('returns correct remaining count', () => {
      expect(getRemaining(5, 2)).toBe(3);
    });
    it('does not go below zero', () => {
      expect(getRemaining(3, 5)).toBe(0);
    });
  });

  describe('slotsNeededToday', () => {
    it('returns 0 when premium (null limit)', () => {
      expect(slotsNeededToday({ slotLimit: null, slotsPlanned: 0 })).toBe(0);
    });
    it('returns the gap between limit and planned', () => {
      expect(slotsNeededToday({ slotLimit: 3, slotsPlanned: 1 })).toBe(2);
    });
    it('returns 0 when already at limit', () => {
      expect(slotsNeededToday({ slotLimit: 3, slotsPlanned: 3 })).toBe(0);
    });
    it('returns 0 when over limit (config decreased mid-day)', () => {
      expect(slotsNeededToday({ slotLimit: 2, slotsPlanned: 5 })).toBe(0);
    });
  });

  describe('canUseSwap', () => {
    it('always allows unlimited swaps', () => {
      expect(canUseSwap({ swapLimit: null, swapsUsed: 99 })).toBe(true);
    });
    it('allows swap when under limit', () => {
      expect(canUseSwap({ swapLimit: 1, swapsUsed: 0 })).toBe(true);
    });
    it('blocks swap at limit', () => {
      expect(canUseSwap({ swapLimit: 1, swapsUsed: 1 })).toBe(false);
    });
  });
});
