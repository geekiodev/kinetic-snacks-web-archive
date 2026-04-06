import { describe, expect, it } from 'vitest';
import { canCreateAssignment, canUseSwap, getRemaining } from './usageLogic.ts';

describe('allow-snack-assignment usage logic', () => {
  it('handles unlimited limits', () => {
    expect(canCreateAssignment({ assignmentLimit: null, assignmentsUsed: 999 })).toBe(true);
    expect(canUseSwap({ swapLimit: null, swapsUsed: 999 })).toBe(true);
    expect(getRemaining(null, 3)).toBeNull();
  });

  it('enforces finite assignment limit', () => {
    expect(canCreateAssignment({ assignmentLimit: 2, assignmentsUsed: 1 })).toBe(true);
    expect(canCreateAssignment({ assignmentLimit: 2, assignmentsUsed: 2 })).toBe(false);
    expect(getRemaining(2, 1)).toBe(1);
  });

  it('enforces finite swap limit', () => {
    expect(canUseSwap({ swapLimit: 1, swapsUsed: 0 })).toBe(true);
    expect(canUseSwap({ swapLimit: 1, swapsUsed: 1 })).toBe(false);
    expect(getRemaining(1, 1)).toBe(0);
  });
});
