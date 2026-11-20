# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Identity Ownership**: An athlete profile at `/athletes/{athleteId}` MUST have `athleteId == request.auth.uid` and `ownerUid == request.auth.uid`, with `request.auth.token.email_verified == true`.
2. **PII Isolation**: Only the owning athlete (`isOwner(athleteId)`) or a verified club admin (`isAdmin()`) may `get` or `list` athlete profiles or uploaded documents. Blanket `isSignedIn()` reads on `/athletes` are strictly forbidden.
3. **No Self-Approval / Privilege Escalation**: During creation, `status` MUST be `'pending'`, and `reviewNote` cannot be forged as approved. Only `isAdmin()` may transition `status` (`'pending' | 'approved' | 'rejected'`) or edit `reviewNote`.
4. **Terminal State Locking**: Once an athlete profile reaches `status == 'approved'`, the athlete can no longer modify their profile fields (preventing post-approval identity/date-of-birth tampering). Only `isAdmin()` can override or update an approved record.
5. **Relational Sync & Atomicity**: Every document in `/athletes/{athleteId}/documents/{docKey}` MUST verify parent existence via `existsAfter(/databases/$(database)/documents/athletes/$(athleteId))` and match `ownerUid == request.auth.uid`.
6. **Temporal Integrity & Immutability**: `createdAt` and `updatedAt` MUST equal `request.time`. `ownerUid`, `athleteCode`, and `createdAt` are immutable after creation.
7. **Admin-Only Link Management**: Only verified admins (`min.nas1207@gmail.com` with `email_verified == true` or `/admins/{uid}`) can create, update, or delete `/clubLinks/{linkId}`. Non-admin visitors can only read active links (`resource.data.active == true`).

## 2. The "Dirty Dozen" Attack Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unauthenticated Athlete Create**: Unauthenticated client attempts `setDoc(/athletes/user1, {...})`.
2. **Unverified Email Create**: User with `email_verified: false` attempts to create `/athletes/{uid}`.
3. **UID Spoofing on Create**: Authenticated user `uidA` attempts to write `/athletes/uidB` or set `ownerUid: 'uidB'`.
4. **Self-Approval Injection**: Athlete attempts `setDoc(/athletes/{uid}, { ..., status: 'approved' })` on creation.
5. **Shadow / Ghost Field Injection**: Athlete sends extra field `{ ..., isAdmin: true }` or `{ ..., verifiedOverride: true }` on create or update.
6. **Client Timestamp Forgery**: Athlete sends `createdAt: new Date(2020, 0, 1)` instead of `serverTimestamp()`.
7. **Cross-Athlete PII Snooping (`get`)**: Authenticated user `uidA` attempts `getDoc(/athletes/uidB)`.
8. **Cross-Athlete PII Scraping (`list`)**: Non-admin user `uidA` attempts unbounded `getDocs(collection(db, 'athletes'))` without `where('ownerUid', '==', uidA)`.
9. **Post-Approval Tampering**: Athlete whose profile has `status == 'approved'` attempts to update `birthDate` or `fullName`.
10. **Status Elevation Update by Athlete**: Athlete with `status == 'pending'` attempts `updateDoc(/athletes/{uid}, { status: 'approved', updatedAt: serverTimestamp() })`.
11. **Orphaned Document Subcollection Write**: User attempts to write `/athletes/uidB/documents/national_id` when `/athletes/uidB` does not belong to them or does not exist.
12. **Unauthorized Club Link Mutation / Admin Escalation**: Non-admin user attempts `setDoc(/clubLinks/hack, {...})` or `setDoc(/admins/{uid}, {...})`.
