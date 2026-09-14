/**
 * Public listing inspection badge helper.
 * - Active completed (non-expired) → "Inspected ✓"
 * - Expired completed report → "Inspected {date}"
 * - Otherwise → null
 */
export function inspectedBadgeFromLatest(
  insp: {
    status: string;
    completedAt: Date | null;
    expiresAt: Date | null;
  } | null,
  now = new Date(),
): 'Inspected ✓' | `Inspected ${string}` | null {
  if (!insp) return null;

  const completed =
    insp.status === 'COMPLETED' ||
    insp.status === 'EXPIRED' ||
    (insp.completedAt != null &&
      (insp.status === 'COMPLETED' || insp.status === 'EXPIRED'));

  if (insp.status === 'COMPLETED') {
    if (insp.expiresAt && insp.expiresAt.getTime() > now.getTime()) {
      return 'Inspected ✓';
    }
    // Completed but past expiry (scheduler may not have run yet)
    return formatInspectedDate(insp.completedAt);
  }

  if (insp.status === 'EXPIRED') {
    return formatInspectedDate(insp.completedAt);
  }

  void completed;
  return null;
}

function formatInspectedDate(completedAt: Date | null): `Inspected ${string}` | null {
  if (!completedAt) return 'Inspected' as `Inspected ${string}`;
  const y = completedAt.getUTCFullYear();
  const m = String(completedAt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(completedAt.getUTCDate()).padStart(2, '0');
  return `Inspected ${y}-${m}-${d}`;
}

export function authenticationBadgeFromListing(listing: {
  authRequired?: boolean;
  authenticationStatus?: string | null;
}): string | null {
  const status = listing.authenticationStatus ?? 'NOT_REQUIRED';
  if (status === 'PASSED') return 'Authentic';
  if (status === 'OPTED_OUT' || (listing.authRequired === false && status === 'OPTED_OUT')) {
    return 'Unauthenticated';
  }
  if (status === 'REQUIRED' || status === 'PENDING') return 'Auth required';
  if (status === 'FAILED') return 'Auth failed';
  return null;
}
