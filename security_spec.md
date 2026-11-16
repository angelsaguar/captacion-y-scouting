# Security Specification — Firestore Rules

## 1. Data Invariants
1. Every document in `/team_matches/{matchId}` and `/match_plans/{planId}` must have a valid `id` matching the document ID (`^[a-zA-Z0-9_-]+$`, max 128 chars) and a verified `ownerId` matching `request.auth.uid` on creation (unless created by the verified admin).
2. `ownerId`, `id`, and `createdAt` are strictly immutable after document creation.
3. All `createdAt` and `updatedAt` timestamps must match the server timestamp (`request.time`).
4. Every string field has strict `.size()` upper bounds to prevent storage exhaustion / denial-of-wallet attacks.
5. `allow list` queries evaluate `resource.data.ownerId == request.auth.uid` or verified bootstrapped admin email without executing `get()`/`exists()` calls.
6. Only verified users (`request.auth != null && request.auth.token.email_verified == true`) can perform reads or writes.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Write**: `request.auth == null` writing to `/team_matches/match_1`.
2. **Unverified Email Admin Spoof**: `request.auth.token.email == 'angel.saguar@telefonica.net'` with `email_verified: false`.
3. **Shadow Field Injection**: Creating/updating a `TeamMatch` with an undocumented field such as `{ ..., isVerified: true }`.
4. **Owner Spoofing on Create**: Non-admin user creating a match with `ownerId: "victim_uid"`.
5. **Owner Mutation on Update**: Updating a match to reassign `ownerId` to a different UID.
6. **Immutable Timestamp Tampering**: Creating or updating a match with client-forged `createdAt` or `updatedAt != request.time`.
7. **ID Poisoning**: Creating a document with path ID containing special characters or exceeding 128 characters (`"x".repeat(200)`).
8. **Type Poisoning on Update**: Updating `goles_favor` to a string `"5"` or negative number `-3`.
9. **Oversized String Exhaustion**: Updating `acta` with a string larger than 5000 characters.
10. **Unauthorized Blanket List**: Non-admin authenticated user executing `getDocs(collection(db, 'team_matches'))` without `where('ownerId', '==', uid)`.
11. **Self-Privilege Escalation**: Non-admin user attempting to write their own UID into `/admins/{uid}`.
12. **Status Enum Bypass**: Writing `estado: "Borrado"` or `tipo: "Neutral"` outside allowed enum values.
