export interface AssignmentQuotaInput {
  assignmentLimit: number | null;
  assignmentsUsed: number;
}

export interface SwapQuotaInput {
  swapLimit: number | null;
  swapsUsed: number;
}

export const getRemaining = (limit: number | null, used: number): number | null => {
  if (limit === null) return null;
  return Math.max(0, limit - used);
};

export const canCreateAssignment = ({ assignmentLimit, assignmentsUsed }: AssignmentQuotaInput): boolean => {
  if (assignmentLimit === null) return true;
  return assignmentsUsed < assignmentLimit;
};

export const canUseSwap = ({ swapLimit, swapsUsed }: SwapQuotaInput): boolean => {
  if (swapLimit === null) return true;
  return swapsUsed < swapLimit;
};
