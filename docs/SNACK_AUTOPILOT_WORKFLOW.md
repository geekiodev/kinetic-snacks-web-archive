# Snack Autopilot Workflow (Decision-Fatigue Removal)

## Goal
Remove user choice friction by moving from **"pick a snack"** to **"receive and execute today's snack"**.

## Proposed Workflow (Simple Mode)

1. **Preference capture remains lightweight**
   - On onboarding/settings, user sets constraints once (dietary limits, allergens, equipment/context, quiet hours).
   - User opts into push notifications and chooses a preferred snack window.

2. **System plans today's snack automatically**
   - At the beginning of the user’s local day (or first eligible window), backend computes one primary snack recommendation using existing ranking/constraint logic.
   - Recommendation is written to a daily assignment record (e.g., `daily_snack_assignments`) so all clients see the same snack for that day.

3. **System nudges at the right time**
   - `notifications-plan` determines eligibility (`push_enabled`, quiet hours, daily cap, ignored-backoff).
   - If eligible, user receives: **"It’s snack time: [Snack Name]"**.
   - No list-picking step in the notification path.

4. **One-tap action flow**
   - Tap notification → opens app directly to assigned snack detail.
   - Primary CTA: **Start snack**.
   - Secondary CTA (optional): **Swap once** (for immediate mismatch, e.g., ingredient unavailable).

5. **Fallback behavior**
   - If assigned snack is invalid at send time (inventory/constraint update), auto-regenerate one replacement and log the reason.
   - If push is disabled, assignment still appears on dashboard as **Today's snack**.

## UX Rules
- Default home state for enabled users: **Today’s snack card** instead of multi-option list.
- Remove required decision points from critical path.
- Keep one low-friction escape hatch: one swap per snack event (or per day on free).

## Free-Tier Limit Impact

Current model in codebase:
- Free users are capped by `daily_exercise_views` (typically 3/day).
- Notification policy defaults to 2/day for free and 4/day for premium.

Autopilot changes how limits should work:

### Recommended free-tier policy
1. **Assigned snacks should not consume browse-style view quota**
   - The assigned snack is now system-driven, not user exploration.
   - If assignment consumes view quota, users are penalized for passive receipt of core value.

2. **Replace/augment view quota with "autopilot actions" quota**
   - Keep free simple and understandable:
     - `assigned_snacks_per_day_free = 2` (aligned to free notification cap)
     - `manual_swaps_per_day_free = 1`
   - Premium can retain higher/flexible caps.

3. **Align notifications and assignment limits**
   - Notification caps and assignment caps should match to avoid confusing states (notified but no entitlement, or entitled but no notify).

4. **Preserve anti-abuse with ignored-backoff**
   - Existing ignored-backoff policy remains useful and should continue to reduce daily sends for disengaged users.

### Exactly what reduces a user’s daily limits

Assuming free defaults:
- `assigned_snacks_per_day_free = 2`
- `manual_swaps_per_day_free = 1`

Daily counters should decrement as follows:

1. **Assigned snack counter (`assigned_snacks_remaining`) decrements when:**
   - The backend creates a new daily snack assignment for that user.
   - A fallback auto-regeneration creates a replacement assignment after invalidation.

2. **Assigned snack counter does NOT decrement when:**
   - User opens the app or views the already-assigned snack.
   - User opens/reopens a notification for the same assigned snack.
   - User starts or completes the assigned snack.

3. **Manual swap counter (`manual_swaps_remaining`) decrements when:**
   - User taps **Swap** and confirms a new snack selection/assignment.

4. **Manual swap counter does NOT decrement when:**
   - System auto-swaps because of hard invalidation (allergen update, unavailable item, policy invalidation).
   - User cancels the swap flow before a replacement is committed.

5. **Notification sends should not directly decrement either counter**
   - Notifications are delivery events.
   - They must be gated by remaining assignment entitlement, but a send itself should not burn extra assignment/swap units.

6. **One assignment unit per unique assigned snack**
   - Repeated reads/interactions on the same assignment ID are free.
   - Only creation of a *new* assignment ID consumes assignment quota.

## Entitlements/API Adjustments (minimal)

1. Add/rename entitlement fields:
   - `daily_assigned_snacks`
   - `daily_manual_swaps`

2. Add edge function contract for autopilot assignment:
   - `allow-snack-assignment` (or evolve `allow-exercise-view`)
   - Returns assignment entitlement + remaining actions.

3. Keep `notifications-plan` authoritative for send/no-send,
   - but gate on assignment remaining instead of browse views.

## Metrics to Verify Success
- Snack start rate after notification (target increase).
- Median taps-to-start (target decrease).
- Swap rate (should stay moderate; spikes indicate poor assignment quality).
- Free-to-premium conversion from capped swaps/assignments.

## Rollout Suggestion
1. Ship as opt-in "Autopilot Snacks" toggle.
2. A/B test against list-based flow for 2 weeks.
3. Promote to default once start-rate uplift and retention are validated.
