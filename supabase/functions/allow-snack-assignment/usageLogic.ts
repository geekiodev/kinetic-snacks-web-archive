export interface SlotQuotaInput {
  slotLimit: number | null;
  slotsPlanned: number;
}

export interface SwapQuotaInput {
  swapLimit: number | null;
  swapsUsed: number;
}

export const getRemaining = (limit: number | null, used: number): number | null => {
  if (limit === null) return null;
  return Math.max(0, limit - used);
};

export const slotsNeededToday = ({ slotLimit, slotsPlanned }: SlotQuotaInput): number => {
  if (slotLimit === null) return 0; // premium: plan lazily on demand, not all at once
  return Math.max(0, slotLimit - slotsPlanned);
};

export const canUseSwap = ({ swapLimit, swapsUsed }: SwapQuotaInput): boolean => {
  if (swapLimit === null) return true;
  return swapsUsed < swapLimit;
};
