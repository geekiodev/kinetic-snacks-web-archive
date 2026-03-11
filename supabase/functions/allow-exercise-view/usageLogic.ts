export interface UsageDecisionInput {
  limit: number;
  currentCount: number;
  alreadyViewed: boolean;
}

export interface UsageDecision {
  allowed: boolean;
  remaining: number;
  shouldInsert: boolean;
}

export const computeUsageDecision = ({
  limit,
  currentCount,
  alreadyViewed,
}: UsageDecisionInput): UsageDecision => {
  if (alreadyViewed) {
    return {
      allowed: true,
      remaining: Math.max(0, limit - currentCount),
      shouldInsert: false,
    };
  }

  if (currentCount >= limit) {
    return { allowed: false, remaining: 0, shouldInsert: false };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - (currentCount + 1)),
    shouldInsert: true,
  };
};
