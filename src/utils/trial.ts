export const TRIAL_DAYS = 14;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

// The native store exposes the raw FirebaseAuthTypes.User (creation date
// nested under `.metadata`), while the web store exposes a flat custom
// AuthUser (creation date directly on `.creationTime`) — this normalizes
// both shapes so callers don't need to know which platform they're on.
export function getCreationTime(
  user: { creationTime?: string | null; metadata?: { creationTime?: string | null } } | null | undefined
): string | null {
  if (!user) return null;
  return user.metadata?.creationTime ?? user.creationTime ?? null;
}

// Group play's free trial is tied to the account's own creation date (from
// Firebase Auth), not a locally-stored flag — so it can't be reset by
// reinstalling the app or signing out and back in with the same account.
export function trialEndsAt(creationTime: string | null | undefined): number | null {
  if (!creationTime) return null;
  const created = new Date(creationTime).getTime();
  if (Number.isNaN(created)) return null;
  return created + TRIAL_MS;
}

export function isWithinTrial(creationTime: string | null | undefined): boolean {
  const endsAt = trialEndsAt(creationTime);
  return endsAt != null && Date.now() < endsAt;
}

export function trialDaysRemaining(creationTime: string | null | undefined): number {
  const endsAt = trialEndsAt(creationTime);
  if (endsAt == null) return 0;
  return Math.max(0, Math.ceil((endsAt - Date.now()) / (24 * 60 * 60 * 1000)));
}
