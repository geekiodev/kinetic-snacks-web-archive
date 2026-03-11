import { describe, expect, it } from 'vitest';
import { computeUsageDecision } from './usageLogic';

describe('computeUsageDecision', () => {
  it('allows already-viewed exercises without consuming limit', () => {
    const decision = computeUsageDecision({ limit: 3, currentCount: 2, alreadyViewed: true });
    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(1);
    expect(decision.shouldInsert).toBe(false);
  });

  it('denies when at limit and not viewed yet', () => {
    const decision = computeUsageDecision({ limit: 3, currentCount: 3, alreadyViewed: false });
    expect(decision.allowed).toBe(false);
    expect(decision.remaining).toBe(0);
    expect(decision.shouldInsert).toBe(false);
  });

  it('allows and decrements when under limit', () => {
    const decision = computeUsageDecision({ limit: 3, currentCount: 1, alreadyViewed: false });
    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(1);
    expect(decision.shouldInsert).toBe(true);
  });
});
