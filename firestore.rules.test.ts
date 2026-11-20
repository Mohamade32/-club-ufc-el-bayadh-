/**
 * Verification suite for the Dirty Dozen adversarial payloads against firestore.rules.
 * Executed with @firebase/rules-unit-testing against the Firebase Rules Emulator.
 */
export const DIRTY_DOZEN_CASES = [
  {
    id: 1,
    name: 'Unauthenticated athlete create',
    path: '/athletes/uid_attacker',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified email athlete create',
    path: '/athletes/uid_unverified',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'UID spoofing on create (writing another user doc)',
    path: '/athletes/uid_victim',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Self-approval on create (status: approved)',
    path: '/athletes/uid_athlete',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow ghost field injection (isAdmin: true)',
    path: '/athletes/uid_athlete',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Client-forged createdAt timestamp',
    path: '/athletes/uid_athlete',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Cross-athlete PII snooping via get',
    path: '/athletes/uid_victim',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Cross-athlete PII scraping via unbounded list',
    path: '/athletes',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Post-approval profile tampering by athlete',
    path: '/athletes/uid_approved',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Athlete elevating status from pending to approved on update',
    path: '/athletes/uid_athlete',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Orphaned document subcollection write without parent',
    path: '/athletes/uid_missing/documents/national_id',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Non-admin clubLinks write or admins collection escalation',
    path: '/admins/uid_attacker',
    expected: 'PERMISSION_DENIED',
  },
] as const;
