export interface Entitlements {
  daily_exercise_views: number | null;
  can_use_space_analysis: boolean;
  monthly_ai_plans: number | null;
  monthly_exercise_generations: number | null;
  can_export: boolean;
  max_saved_plans: number | null;
}

export interface EntitlementContext {
  entitlements: Entitlements;
  planName: string;
}

const defaultEntitlementsByPlan: Record<string, Entitlements> = {
  free: {
    daily_exercise_views: 3,
    can_use_space_analysis: false,
    monthly_ai_plans: 0,
    monthly_exercise_generations: 0,
    can_export: false,
    max_saved_plans: 1,
  },
  premium: {
    daily_exercise_views: null,
    can_use_space_analysis: true,
    monthly_ai_plans: null,
    monthly_exercise_generations: null,
    can_export: true,
    max_saved_plans: null,
  },
};

const mergeEntitlements = (base: Entitlements, overrides?: Partial<Entitlements> | null): Entitlements => ({
  ...base,
  ...(overrides ?? {}),
});

export const getEntitlements = async (
  supabase: {
    from: (table: string) => {
      select: (query: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
        };
      };
    };
  },
  userId: string,
): Promise<EntitlementContext> => {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, plans ( name, entitlements )')
    .eq('user_id', userId)
    .maybeSingle();

  const plan = subscription?.plans as { name?: string; entitlements?: Partial<Entitlements> } | undefined;
  if (plan?.entitlements) {
    const planName = plan.name ?? 'free';
    const base = defaultEntitlementsByPlan[planName] ?? defaultEntitlementsByPlan.free;
    return { entitlements: mergeEntitlements(base, plan.entitlements), planName };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('id', userId)
    .maybeSingle();

  const fallbackPlan = (profile?.subscription_plan as string | undefined) ?? 'free';
  const base = defaultEntitlementsByPlan[fallbackPlan] ?? defaultEntitlementsByPlan.free;
  return { entitlements: base, planName: fallbackPlan };
};
