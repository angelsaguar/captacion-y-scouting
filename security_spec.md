# Security Specification (`security_spec.md`) — Captación y Scouting

## 1. Data Invariants

1. **Two-Account Zero-Trust Perimeter**:
   - Only `angel.saguar@telefonica.net` (`ADMIN`) and `asaguar04@gmail.com` (`SCOUT`, bound to his exact Firebase Auth UID) may read or write any document in Firestore.
   - Revoked observers (`santi@...`, `javier@...`) and external Google accounts are denied all operations (`get`, `list`, `create`, `update`, `delete`), even if their Google email is verified.
2. **Deny-by-Default Module Authorization (`allowedModules: []`)**:
   - `/club_access/alejandro_scout` initializes with `allowedModules: []`.
   - `asaguar04@gmail.com` cannot read or write `/team_matches`, `/match_plans`, or `/club_sync/{docId}` unless the administrator (`angel.saguar@telefonica.net`) has explicitly added the corresponding module (`'scouting'`, `'campograma'`, `'needs'`, `'gestion-equipo'`, `'estadisticas-rivales'`) to `allowedModules`.
3. **One-Time Atomic UID Binding**:
   - `asaguar04@gmail.com` may only update `/club_access/alejandro_scout` once, when `existing().uid == ''` and `existing().uidLocked == false`, to bind `incoming().uid == request.auth.uid` and `incoming().uidLocked == true`.
   - `asaguar04@gmail.com` can NEVER modify `role`, `email`, `active`, or `allowedModules`, nor change `uid` once `uidLocked == true`.
4. **Admin & Backup Isolation**:
   - `/admins/{adminId}` and `/security_backups/{backupId}` are strictly restricted to the administrator (`angel.saguar@telefonica.net`).

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unauthenticated Read/Write**: `auth = null` attempting `get` or `create` on `/team_matches/m1`. -> `PERMISSION_DENIED`
2. **Unverified Email Spoofing**: `auth = { uid: 'spoof', email: 'angel.saguar@telefonica.net', email_verified: false }` attempting `get` on `/admins/spoof`. -> `PERMISSION_DENIED`
3. **Revoked Observer (Santi/Javier) Access**: `auth = { uid: 'santi_uid', email: 'santi@gmail.com', email_verified: true }` attempting `list` or `get` on `/club_sync/scouting_players_master`. -> `PERMISSION_DENIED`
4. **Name-Substring Spoof (`alejandro.hacker@gmail.com`)**: Verified Google user with `'alejandro'` in email attempting `get` on `/club_access/alejandro_scout`. -> `PERMISSION_DENIED`
5. **Privilege Escalation by Scout (`role: 'admin'`)**: `asaguar04@gmail.com` attempting to set `role: 'admin'` in `/club_access/alejandro_scout`. -> `PERMISSION_DENIED`
6. **Self-Enabling Modules by Scout (`allowedModules: ['scouting']`)**: `asaguar04@gmail.com` attempting to add `'scouting'` to `allowedModules` during or after UID binding. -> `PERMISSION_DENIED`
7. **UID Hijack After Lock**: `asaguar04@gmail.com` with a different UID (`uid_2`) attempting to overwrite `uid` after `uidLocked == true`. -> `PERMISSION_DENIED`
8. **Disabled Module Access (`allowedModules: []`)**: `asaguar04@gmail.com` (with bound UID) attempting to read/write `/club_sync/scouting_players_master` (`module: 'scouting'`) while `allowedModules` is `[]`. -> `PERMISSION_DENIED`
9. **Cross-Module Bypass**: `asaguar04@gmail.com` with only `['scouting']` enabled attempting to write to `/team_matches/m1` (which requires `'gestion-equipo'`). -> `PERMISSION_DENIED`
10. **Shadow Field Injection**: Sending extra unauthorized key `isSuperAdmin: true` to `/team_matches/m1`. -> `PERMISSION_DENIED`
11. **Client Timestamp Forgery**: Sending a past/future timestamp instead of `request.time` for `updatedAt`. -> `PERMISSION_DENIED`
12. **Scout Accessing `/security_backups`**: `asaguar04@gmail.com` attempting to read `/security_backups/backup_1`. -> `PERMISSION_DENIED`
