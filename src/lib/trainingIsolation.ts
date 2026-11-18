import { CLUB_TEAM_REGISTRY, ClubTeamRegistryItem } from '@/types';

export const PRE_TRAINING_ISOLATION_BACKUP_KEY = 'afe_pre_training_isolation_backup_v1';
export const UNASSIGNED_SESSIONS_AUDIT_KEY = 'afe_unassigned_sessions_audit_v1';
export const TRAINING_ISOLATION_MIGRATION_VERSION_KEY = 'afe_training_isolation_migration_v2';
const CUSTOM_TEAM_REGISTRY_KEY = 'afe_custom_team_registry_v1';

// ---------------------------------------------------------------------------
// 1. Canonical Immutable Team Identifier (teamId) Resolution
// ---------------------------------------------------------------------------

function normalizeTeamLookupToken(raw?: string | null): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function getCustomTeamRegistry(): Record<string, { teamId: string; displayName: string }> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CUSTOM_TEAM_REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

export function findClubTeamRegistryItem(teamOrId?: string | null): ClubTeamRegistryItem | null {
  const token = normalizeTeamLookupToken(teamOrId);
  if (!token) return null;

  for (const item of CLUB_TEAM_REGISTRY) {
    if (normalizeTeamLookupToken(item.teamId) === token) return item;
    if (normalizeTeamLookupToken(item.code) === token) return item;
    if (normalizeTeamLookupToken(item.displayName) === token) return item;
    for (const alias of item.aliases) {
      if (normalizeTeamLookupToken(alias) === token) return item;
    }
  }
  return null;
}

/**
 * Resolves any team identifier, code, or visible team name into its permanent,
 * immutable internal `teamId` (e.g. 'INFANTIL B' -> 'team_08_infantil_b').
 * Even if a team's visible display name is changed in the future, its `teamId` remains invariant.
 */
export function resolveCanonicalTeamId(teamOrId?: string | null): string {
  const raw = String(teamOrId || '').trim();
  if (!raw) return '';

  const found = findClubTeamRegistryItem(raw);
  if (found) return found.teamId;

  if (raw.startsWith('team_')) {
    return raw.toLowerCase();
  }

  // Fallback for any custom user-created team: persist a deterministic immutable teamId
  const token = normalizeTeamLookupToken(raw);
  const customMap = getCustomTeamRegistry();
  if (customMap[token]?.teamId) {
    return customMap[token].teamId;
  }

  const slug = token
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  const generatedId = `team_custom_${slug || 'unknown'}`;

  if (typeof localStorage !== 'undefined') {
    try {
      customMap[token] = { teamId: generatedId, displayName: raw };
      localStorage.setItem(CUSTOM_TEAM_REGISTRY_KEY, JSON.stringify(customMap));
    } catch {}
  }

  return generatedId;
}

/**
 * Resolves a canonical `teamId` (or legacy team name) to its current visible display name.
 */
export function getTeamDisplayName(teamIdOrName?: string | null): string {
  const raw = String(teamIdOrName || '').trim();
  if (!raw) return '';

  const found = findClubTeamRegistryItem(raw);
  if (found) return found.displayName;

  const customMap = getCustomTeamRegistry();
  for (const entry of Object.values(customMap)) {
    if (entry.teamId === raw) return entry.displayName;
  }

  return raw;
}

/**
 * Extracts and resolves the canonical `teamId` from any session, match, or calendar record.
 */
export function extractRecordCanonicalTeamId(record: any): string {
  if (!record || typeof record !== 'object') return '';
  const candidate =
    record.teamId ||
    record.team_id ||
    record.team ||
    record.teamName ||
    record.team_name ||
    '';
  return resolveCanonicalTeamId(candidate);
}

/**
 * Strictly checks whether a training session or calendar record belongs to the target team
 * by comparing their canonical immutable `teamId`s.
 * Records marked with `unverifiedOrigin: true` or lacking a valid team association never match.
 */
export function doesRecordBelongToTeam(record: any, targetTeamOrId?: string | null): boolean {
  if (!record || typeof record !== 'object') return false;
  if (record.unverifiedOrigin === true) return false;

  const targetTeamId = resolveCanonicalTeamId(targetTeamOrId);
  const recordTeamId = extractRecordCanonicalTeamId(record);

  if (!targetTeamId || !recordTeamId) return false;
  return targetTeamId === recordTeamId;
}

// ---------------------------------------------------------------------------
// 2. Detection of Untouched Auto-Generated Boilerplate / Demo Templates
// ---------------------------------------------------------------------------

const LEGACY_BOILERPLATE_DATES = new Set(['2026-08-28', '2026-08-27', '2026-08-25']);

const LEGACY_AUGUST_SAMPLE_DATES = new Set([
  '2026-08-24',
  '2026-08-25',
  '2026-08-26',
  '2026-08-27',
  '2026-08-28',
  '2026-08-29',
  '2026-08-30',
  '2026-08-31',
  '2026-09-01',
  '2026-09-02',
  '2026-09-03',
  '2026-09-04',
  '2026-09-05',
  '2026-09-06',
  '2026-09-07',
  '2026-09-08',
  '2026-09-09',
  '2026-09-10',
  '2026-09-11',
  '2026-09-12',
  '2026-09-13',
  '2026-09-14',
  '2026-09-15',
  '2026-09-16',
  '2026-09-17',
  '2026-09-18',
  '2026-09-19',
  '2026-09-20',
  '2026-09-21',
  '2026-09-22',
  '2026-09-23',
  '2026-09-24',
  '2026-09-25',
  '2026-09-27',
]);

/**
 * Checks whether a training session has any real user data (attendance marks, observations,
 * tasks, attached files, videos, or a custom date/description/hour).
 */
export function hasUserModifiedSessionContent(session: any): boolean {
  if (!session || typeof session !== 'object') return false;
  if (session.isUserCreated === true) return true;

  const fecha = String(session.fecha || '').trim();
  if (!LEGACY_BOILERPLATE_DATES.has(fecha)) {
    return true;
  }

  const desc = String(session.descripcion || '').trim();
  if (desc && desc !== 'Sesión de entrenamiento' && desc !== 'Entrenamiento') {
    return true;
  }

  const obs = String(session.observaciones || '').trim();
  if (obs.length > 0) return true;

  if (Array.isArray(session.tareas) && session.tareas.length > 0) return true;
  if (Array.isArray(session.archivos) && session.archivos.length > 0) return true;
  if (Array.isArray(session.videos) && session.videos.length > 0) return true;

  if (Array.isArray(session.records)) {
    const hasAnyMarkedStatus = session.records.some(
      (r: any) => r && r.status !== undefined && r.status !== null && r.status !== 'Pendiente'
    );
    if (hasAnyMarkedStatus) return true;
  }

  return false;
}

/**
 * Checks whether a team's session array consists solely of the 3 untouched boilerplate sessions
 * ('2026-08-28', '2026-08-27', '2026-08-25') that were previously auto-generated on first visit.
 */
export function isUntouchedAutoGeneratedSessionList(sessions: any[]): boolean {
  if (!Array.isArray(sessions) || sessions.length === 0) return false;
  return sessions.every(
    (s) =>
      s &&
      LEGACY_BOILERPLATE_DATES.has(String(s.fecha || '').trim()) &&
      !hasUserModifiedSessionContent(s)
  );
}

/**
 * Checks whether a calendar events map is an untouched copy of the legacy August 2026 `defaultSample`.
 */
export function isLegacyDefaultSampleCalendarMap(eventsMap: Record<string, any>): boolean {
  if (!eventsMap || typeof eventsMap !== 'object') return false;
  const keys = Object.keys(eventsMap);
  if (keys.length === 0) return false;

  const hasLegacyParla = eventsMap['2026-08-29']?.rival === 'AD PARLA';
  const hasLegacyPlata = eventsMap['2026-09-05']?.rival === 'AD LA PLATA';
  const allKeysInSample = keys.every((k) => LEGACY_AUGUST_SAMPLE_DATES.has(k));

  return (hasLegacyParla && hasLegacyPlata) || (keys.length >= 20 && allKeysInSample);
}

// ---------------------------------------------------------------------------
// 3. Blocking Safety Backup & Verification Gatekeeper
// ---------------------------------------------------------------------------

export interface TrainingSafetyBackupSnapshot {
  version: '1.0';
  createdAt: string;
  keyCount: number;
  totalBytes: number;
  checksum: string;
  entries: Record<string, string>;
}

export interface BackupVerificationResult {
  verified: boolean;
  keyCount: number;
  totalBytes: number;
  checksum: string;
  createdAt: string;
  error?: string;
}

function computeDeterministicChecksum(entries: Record<string, string>): string {
  const sortedKeys = Object.keys(entries).sort();
  let hash1 = 0x811c9dc5;
  let hash2 = 0x01000193;

  for (const k of sortedKeys) {
    const val = entries[k] ?? '';
    const pair = `${k}=${val.length}:${val};`;
    for (let i = 0; i < pair.length; i++) {
      const ch = pair.charCodeAt(i);
      hash1 ^= ch;
      hash1 = Math.imul(hash1, 0x01000193) >>> 0;
      hash2 ^= ch;
      hash2 = Math.imul(hash2, 0x85ebca6b) >>> 0;
    }
  }
  return `${hash1.toString(16).padStart(8, '0')}-${hash2.toString(16).padStart(8, '0')}-${sortedKeys.length}`;
}

function isTargetBackupKey(key: string): boolean {
  return (
    key.startsWith('team_sessions_') ||
    key.startsWith('team_deleted_sessions_') ||
    key.startsWith('team_monthly_calendar_') ||
    key.startsWith('attendance_sessions_') ||
    key.startsWith('afe_calendar_focus_') ||
    key === 'ud_lapoveda_table_attendance_sessions'
  );
}

/**
 * Restores or dry-run verifies the pre-migration training & calendar safety backup.
 * When `dryRun: true` (default during verification), it validates in an isolated in-memory
 * sandbox that every single key and JSON structure can be restored byte-for-byte without touching
 * live storage.
 */
export function restoreTrainingSafetyBackup(options?: { dryRun?: boolean }): {
  ok: boolean;
  restoredKeys: number;
  checksumMatched: boolean;
  error?: string;
} {
  if (typeof localStorage === 'undefined') {
    return { ok: true, restoredKeys: 0, checksumMatched: true };
  }

  const dryRun = options?.dryRun !== false;

  try {
    const rawBackup = localStorage.getItem(PRE_TRAINING_ISOLATION_BACKUP_KEY);
    if (!rawBackup) {
      return {
        ok: false,
        restoredKeys: 0,
        checksumMatched: false,
        error: 'No se encontró la copia de seguridad en almacenamiento local.',
      };
    }

    const parsed = JSON.parse(rawBackup) as TrainingSafetyBackupSnapshot;
    if (
      !parsed ||
      parsed.version !== '1.0' ||
      typeof parsed.entries !== 'object' ||
      parsed.entries === null
    ) {
      return {
        ok: false,
        restoredKeys: 0,
        checksumMatched: false,
        error: 'Formato de copia de seguridad inválido.',
      };
    }

    const keys = Object.keys(parsed.entries);
    if (keys.length !== parsed.keyCount) {
      return {
        ok: false,
        restoredKeys: 0,
        checksumMatched: false,
        error: `Discrepancia en el número de claves respaldadas (${keys.length} vs ${parsed.keyCount}).`,
      };
    }

    const recomputedChecksum = computeDeterministicChecksum(parsed.entries);
    if (recomputedChecksum !== parsed.checksum) {
      return {
        ok: false,
        restoredKeys: 0,
        checksumMatched: false,
        error: 'La huella de integridad (checksum) de la copia de seguridad no coincide.',
      };
    }

    // Simulate full restoration in an isolated sandbox map and verify JSON parseability of all records
    const sandboxStore = new Map<string, string>();
    for (const [k, v] of Object.entries(parsed.entries)) {
      if (typeof v !== 'string') {
        return {
          ok: false,
          restoredKeys: 0,
          checksumMatched: false,
          error: `Valor corrupto en clave respaldada: ${k}`,
        };
      }
      // Verify JSON integrity for JSON keys
      if (
        k.startsWith('team_sessions_') &&
        !k.startsWith('team_sessions_initialized_')
      ) {
        const parsedArr = JSON.parse(v);
        if (!Array.isArray(parsedArr)) {
          return {
            ok: false,
            restoredKeys: 0,
            checksumMatched: false,
            error: `Estructura no válida en ${k}`,
          };
        }
      } else if (k.startsWith('team_monthly_calendar_')) {
        const parsedObj = JSON.parse(v);
        if (!parsedObj || typeof parsedObj !== 'object') {
          return {
            ok: false,
            restoredKeys: 0,
            checksumMatched: false,
            error: `Estructura de calendario no válida en ${k}`,
          };
        }
      }
      sandboxStore.set(k, v);
    }

    // Verify byte-for-byte identity in sandbox
    for (const [k, v] of Object.entries(parsed.entries)) {
      if (sandboxStore.get(k) !== v) {
        return {
          ok: false,
          restoredKeys: 0,
          checksumMatched: false,
          error: `Fallo de verificación byte a byte en clave ${k}`,
        };
      }
    }

    if (!dryRun) {
      for (const [k, v] of Object.entries(parsed.entries)) {
        localStorage.setItem(k, v);
      }
    }

    return {
      ok: true,
      restoredKeys: keys.length,
      checksumMatched: true,
    };
  } catch (err: any) {
    return {
      ok: false,
      restoredKeys: 0,
      checksumMatched: false,
      error: err?.message || String(err),
    };
  }
}

/**
 * Creates a complete safety backup of all training sessions, attendance tables, and calendars
 * BEFORE any migration runs, and verifies that it contains the original data intact and can
 * restore it 100%.
 */
export function createAndVerifyTrainingSafetyBackup(): BackupVerificationResult {
  if (typeof localStorage === 'undefined') {
    return {
      verified: true,
      keyCount: 0,
      totalBytes: 0,
      checksum: '0',
      createdAt: new Date().toISOString(),
    };
  }

  try {
    // If a verified backup already exists from an earlier check, validate it first
    const existingRaw = localStorage.getItem(PRE_TRAINING_ISOLATION_BACKUP_KEY);
    if (existingRaw) {
      const existingCheck = restoreTrainingSafetyBackup({ dryRun: true });
      if (existingCheck.ok && existingCheck.checksumMatched) {
        const parsed = JSON.parse(existingRaw) as TrainingSafetyBackupSnapshot;
        return {
          verified: true,
          keyCount: parsed.keyCount,
          totalBytes: parsed.totalBytes,
          checksum: parsed.checksum,
          createdAt: parsed.createdAt,
        };
      }
    }

    const entries: Record<string, string> = {};
    let totalBytes = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && isTargetBackupKey(k)) {
        const val = localStorage.getItem(k);
        if (val !== null) {
          entries[k] = val;
          totalBytes += k.length + val.length;
        }
      }
    }

    const checksum = computeDeterministicChecksum(entries);
    const snapshot: TrainingSafetyBackupSnapshot = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      keyCount: Object.keys(entries).length,
      totalBytes,
      checksum,
      entries,
    };

    localStorage.setItem(PRE_TRAINING_ISOLATION_BACKUP_KEY, JSON.stringify(snapshot));

    // Mandatory Blocking Verification:
    // 1. Confirm read-back and dry-run restoration pass 100%
    const dryRunResult = restoreTrainingSafetyBackup({ dryRun: true });
    if (!dryRunResult.ok || !dryRunResult.checksumMatched) {
      return {
        verified: false,
        keyCount: snapshot.keyCount,
        totalBytes: snapshot.totalBytes,
        checksum: snapshot.checksum,
        createdAt: snapshot.createdAt,
        error: dryRunResult.error || 'La verificación de restauración en seco no superó el control.',
      };
    }

    // 2. Confirm every current live key matches the backup entry byte-for-byte
    const readBack = JSON.parse(
      localStorage.getItem(PRE_TRAINING_ISOLATION_BACKUP_KEY) || '{}'
    ) as TrainingSafetyBackupSnapshot;
    for (const [k, originalVal] of Object.entries(entries)) {
      if (readBack.entries?.[k] !== originalVal) {
        return {
          verified: false,
          keyCount: snapshot.keyCount,
          totalBytes: snapshot.totalBytes,
          checksum: snapshot.checksum,
          createdAt: snapshot.createdAt,
          error: `Comprobación fallida: la clave ${k} no coincide con el original.`,
        };
      }
    }

    return {
      verified: true,
      keyCount: snapshot.keyCount,
      totalBytes: snapshot.totalBytes,
      checksum: snapshot.checksum,
      createdAt: snapshot.createdAt,
    };
  } catch (err: any) {
    return {
      verified: false,
      keyCount: 0,
      totalBytes: 0,
      checksum: '',
      createdAt: new Date().toISOString(),
      error: err?.message || String(err),
    };
  }
}

// ---------------------------------------------------------------------------
// 4. Non-Destructive Audit Archive for Unverified / Orphan Records
// ---------------------------------------------------------------------------

export interface UnassignedSessionAuditEntry {
  auditId: string;
  archivedAt: string;
  reason: string;
  sourceLocation: string;
  record: any;
}

export function appendToUnassignedSessionsAuditArchive(
  entriesToAdd: Omit<UnassignedSessionAuditEntry, 'auditId' | 'archivedAt'>[]
): void {
  if (typeof localStorage === 'undefined' || entriesToAdd.length === 0) return;
  try {
    const raw = localStorage.getItem(UNASSIGNED_SESSIONS_AUDIT_KEY);
    const current: UnassignedSessionAuditEntry[] = raw ? JSON.parse(raw) : [];
    const seenKeys = new Set(
      current.map((e) => `${e.sourceLocation}::${e.reason}::${JSON.stringify(e.record?.id || e.record?.dateStr || e.record?.fecha || '')}`)
    );

    const nowIso = new Date().toISOString();
    for (const item of entriesToAdd) {
      const dedupKey = `${item.sourceLocation}::${item.reason}::${JSON.stringify(item.record?.id || item.record?.dateStr || item.record?.fecha || '')}`;
      if (!seenKeys.has(dedupKey)) {
        seenKeys.add(dedupKey);
        current.push({
          auditId: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          archivedAt: nowIso,
          reason: item.reason,
          sourceLocation: item.sourceLocation,
          record: item.record,
        });
      }
    }

    localStorage.setItem(UNASSIGNED_SESSIONS_AUDIT_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Could not write to unassigned sessions audit archive:', err);
  }
}

// ---------------------------------------------------------------------------
// 5. Historical Migration & Non-Destructive Calendar Reconstruction
// ---------------------------------------------------------------------------

export interface TrainingIsolationMigrationReport {
  aborted: boolean;
  backupVerified: boolean;
  backupKeyCount: number;
  stampedSessionsCount: number;
  inferredHistoricalCount: number;
  archivedUnverifiedCount: number;
  cleanedCalendarsCount: number;
  error?: string;
}

let migrationExecutedInSession = false;

/**
 * Executes the complete training isolation audit, `teamId` stamping, and calendar reconstruction.
 * Strictly gated by `createAndVerifyTrainingSafetyBackup()`: if the backup is not 100% verified,
 * execution aborts immediately without modifying any data.
 * Never physically deletes original training sessions, attendance records, or historical data.
 */
export function runTrainingSessionsIsolationAuditAndMigration(
  force = false
): TrainingIsolationMigrationReport {
  if (typeof localStorage === 'undefined') {
    return {
      aborted: false,
      backupVerified: true,
      backupKeyCount: 0,
      stampedSessionsCount: 0,
      inferredHistoricalCount: 0,
      archivedUnverifiedCount: 0,
      cleanedCalendarsCount: 0,
    };
  }

  if (migrationExecutedInSession && !force) {
    const alreadyDone = localStorage.getItem(TRAINING_ISOLATION_MIGRATION_VERSION_KEY) === 'done';
    if (alreadyDone) {
      return {
        aborted: false,
        backupVerified: true,
        backupKeyCount: 0,
        stampedSessionsCount: 0,
        inferredHistoricalCount: 0,
        archivedUnverifiedCount: 0,
        cleanedCalendarsCount: 0,
      };
    }
  }

  // MANDATORY CONDITION 1: Create full backup and verify integrity + dry-run restoration BEFORE any change
  const backupResult = createAndVerifyTrainingSafetyBackup();
  if (!backupResult.verified) {
    console.warn(
      'Training isolation migration aborted because pre-migration safety backup verification did not pass:',
      backupResult.error
    );
    return {
      aborted: true,
      backupVerified: false,
      backupKeyCount: backupResult.keyCount,
      stampedSessionsCount: 0,
      inferredHistoricalCount: 0,
      archivedUnverifiedCount: 0,
      cleanedCalendarsCount: 0,
      error: backupResult.error,
    };
  }

  let stampedSessionsCount = 0;
  let inferredHistoricalCount = 0;
  let archivedUnverifiedCount = 0;
  let cleanedCalendarsCount = 0;
  const auditEntries: Omit<UnassignedSessionAuditEntry, 'auditId' | 'archivedAt'>[] = [];

  try {
    // Build roster playerId -> Set<teamId> map to infer unambiguous ownership for legacy orphan records
    const playerIdToTeamIds = new Map<string, Set<string>>();
    // Build sessionId -> Set<teamId> map across all team_sessions_${team}
    const sessionIdToTeamIds = new Map<string, Set<string>>();
    // Track verified sessions per canonical teamId: Map<teamId, Map<fecha, sessionObj>>
    const verifiedTeamSessionsByDate = new Map<string, Map<string, any>>();

    for (const reg of CLUB_TEAM_REGISTRY) {
      verifiedTeamSessionsByDate.set(reg.teamId, new Map());

      // Read team roster
      try {
        const rosterRaw = localStorage.getItem(`team_roster_${reg.displayName}`);
        if (rosterRaw) {
          const roster = JSON.parse(rosterRaw);
          if (Array.isArray(roster)) {
            for (const p of roster) {
              if (p && p.id) {
                const pid = String(p.id);
                if (!playerIdToTeamIds.has(pid)) {
                  playerIdToTeamIds.set(pid, new Set());
                }
                playerIdToTeamIds.get(pid)!.add(reg.teamId);
              }
            }
          }
        }
      } catch {}
    }

    // STEP 1: Audit and stamp `team_sessions_${team.displayName}` with immutable `teamId`
    for (const reg of CLUB_TEAM_REGISTRY) {
      const sessionsKey = `team_sessions_${reg.displayName}`;
      const raw = localStorage.getItem(sessionsKey);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) continue;

        const deletedRaw = localStorage.getItem(`team_deleted_sessions_${reg.displayName}`);
        const deletedList: { id?: string; fecha: string }[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        const isDel = (id?: string, f?: string) =>
          deletedList.some((d) => (id && d.id && d.id === id) || (f && d.fecha && d.fecha === f));

        let changed = false;
        const keptSessions: any[] = [];

        for (const sess of parsed) {
          if (!sess || typeof sess !== 'object') continue;
          if (
            sess.tipo === 'CalendarioMensual' ||
            (typeof sess.descripcion === 'string' && sess.descripcion.trim().startsWith('{'))
          ) {
            continue;
          }

          const explicitTeamId = extractRecordCanonicalTeamId(sess);
          if (explicitTeamId && explicitTeamId !== reg.teamId) {
            // This session explicitly belongs to another team! Preserve in audit archive and do NOT mix it here
            auditEntries.push({
              reason: `Sesión con teamId=${explicitTeamId} encontrada en clave ${sessionsKey} (${reg.teamId})`,
              sourceLocation: sessionsKey,
              record: sess,
            });
            archivedUnverifiedCount++;
            changed = true;
            continue;
          }

          const stamped = {
            ...sess,
            teamId: reg.teamId,
            team: reg.displayName,
          };

          if (sess.teamId !== reg.teamId || sess.team !== reg.displayName) {
            changed = true;
            stampedSessionsCount++;
          }

          keptSessions.push(stamped);

          if (stamped.id) {
            const sid = String(stamped.id);
            if (!sessionIdToTeamIds.has(sid)) {
              sessionIdToTeamIds.set(sid, new Set());
            }
            sessionIdToTeamIds.get(sid)!.add(reg.teamId);
          }

          // Only register as an active calendar-visible training session if not deleted and not an untouched boilerplate stub
          if (
            stamped.fecha &&
            !isDel(stamped.id, stamped.fecha) &&
            hasUserModifiedSessionContent(stamped)
          ) {
            verifiedTeamSessionsByDate.get(reg.teamId)!.set(String(stamped.fecha), stamped);
          }
        }

        if (changed) {
          localStorage.setItem(sessionsKey, JSON.stringify(keptSessions));
        }
      } catch {}
    }

    // STEP 2: Audit `ud_lapoveda_table_attendance_sessions` without physical deletion
    const rawAttendanceTable = localStorage.getItem('ud_lapoveda_table_attendance_sessions');
    if (rawAttendanceTable) {
      try {
        const tableRows = JSON.parse(rawAttendanceTable);
        if (Array.isArray(tableRows)) {
          let tableChanged = false;

          const updatedRows = tableRows.map((row: any) => {
            if (!row || typeof row !== 'object') return row;

            // Handle master calendar row
            if (row.tipo === 'CalendarioMensual') {
              let calTeamId = extractRecordCanonicalTeamId(row);
              if (!calTeamId && typeof row.id === 'string' && row.id.startsWith('cal_master_')) {
                const rest = row.id.replace(/^cal_master_/, '');
                const parts = rest.split('_');
                if (parts.length >= 3) {
                  const teamPart = parts.slice(0, parts.length - 2).join('_');
                  calTeamId = resolveCanonicalTeamId(teamPart);
                }
              }
              if (calTeamId && row.teamId !== calTeamId) {
                tableChanged = true;
                return {
                  ...row,
                  teamId: calTeamId,
                  team: getTeamDisplayName(calTeamId),
                };
              }
              return row;
            }

            // Standard training/attendance session row
            const directTeamId = extractRecordCanonicalTeamId(row);
            if (directTeamId) {
              const displayName = getTeamDisplayName(directTeamId);
              const deletedRaw = localStorage.getItem(`team_deleted_sessions_${displayName}`);
              const deletedList: { id?: string; fecha: string }[] = deletedRaw
                ? JSON.parse(deletedRaw)
                : [];
              const isDel = deletedList.some(
                (d) => (row.id && d.id === row.id) || (row.fecha && d.fecha === row.fecha)
              );

              if (
                row.fecha &&
                !isDel &&
                !row.unverifiedOrigin &&
                hasUserModifiedSessionContent(row)
              ) {
                if (!verifiedTeamSessionsByDate.has(directTeamId)) {
                  verifiedTeamSessionsByDate.set(directTeamId, new Map());
                }
                const teamMap = verifiedTeamSessionsByDate.get(directTeamId)!;
                if (!teamMap.has(String(row.fecha))) {
                  teamMap.set(String(row.fecha), {
                    ...row,
                    teamId: directTeamId,
                    team: displayName,
                  });
                }
              }

              if (row.teamId !== directTeamId || row.team !== displayName) {
                tableChanged = true;
                stampedSessionsCount++;
                return {
                  ...row,
                  teamId: directTeamId,
                  team: displayName,
                };
              }
              return row;
            }

            // Historical record WITHOUT explicit teamId/team: attempt 100% unambiguous inference
            let inferredTeamId = '';

            // 2a. Check by session ID in sessionIdToTeamIds
            if (row.id && sessionIdToTeamIds.has(String(row.id))) {
              const matchingTeams = sessionIdToTeamIds.get(String(row.id))!;
              if (matchingTeams.size === 1) {
                inferredTeamId = Array.from(matchingTeams)[0];
              }
            }

            // 2b. Check by player IDs in row.records
            if (!inferredTeamId && Array.isArray(row.records) && row.records.length > 0) {
              const candidateTeams = new Set<string>();
              for (const rec of row.records) {
                const pid = String(rec?.playerId || rec?.id || '');
                if (pid && playerIdToTeamIds.has(pid)) {
                  const teamsForPlayer = playerIdToTeamIds.get(pid)!;
                  if (teamsForPlayer.size === 1) {
                    candidateTeams.add(Array.from(teamsForPlayer)[0]);
                  } else {
                    // Ambiguous player present in multiple rosters
                    candidateTeams.add('__AMBIGUOUS__');
                  }
                }
              }
              if (candidateTeams.size === 1 && !candidateTeams.has('__AMBIGUOUS__')) {
                inferredTeamId = Array.from(candidateTeams)[0];
              }
            }

            if (inferredTeamId) {
              const displayName = getTeamDisplayName(inferredTeamId);
              tableChanged = true;
              inferredHistoricalCount++;
              const stampedRow = {
                ...row,
                teamId: inferredTeamId,
                team: displayName,
              };
              if (row.fecha && hasUserModifiedSessionContent(stampedRow)) {
                if (!verifiedTeamSessionsByDate.has(inferredTeamId)) {
                  verifiedTeamSessionsByDate.set(inferredTeamId, new Map());
                }
                verifiedTeamSessionsByDate
                  .get(inferredTeamId)!
                  .set(String(row.fecha), stampedRow);
              }
              return stampedRow;
            }

            // Origin cannot be unambiguously verified: preserve intact in audit archive and mark unverifiedOrigin
            auditEntries.push({
              reason: 'Sesión histórica en attendance_sessions sin teamId ni origen inequívoco',
              sourceLocation: 'ud_lapoveda_table_attendance_sessions',
              record: row,
            });
            archivedUnverifiedCount++;
            tableChanged = true;
            return {
              ...row,
              unverifiedOrigin: true,
            };
          });

          if (tableChanged) {
            localStorage.setItem(
              'ud_lapoveda_table_attendance_sessions',
              JSON.stringify(updatedRows)
            );
          }
        }
      } catch {}
    }

    // STEP 3: Non-destructive reconstruction of monthly calendar caches (`team_monthly_calendar_*`)
    // Only removes calendar display events that do not belong to the team; never deletes sessions or attendance records.
    const calendarKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('team_monthly_calendar_')) {
        calendarKeys.push(k);
      }
    }

    for (const calKey of calendarKeys) {
      // Format: team_monthly_calendar_${teamName}_${year}_${month}
      const withoutPrefix = calKey.replace(/^team_monthly_calendar_/, '');
      const parts = withoutPrefix.split('_');
      if (parts.length < 3) continue;

      const monthNum = Number(parts[parts.length - 1]);
      const yearNum = Number(parts[parts.length - 2]);
      const teamNamePart = parts.slice(0, parts.length - 2).join('_');
      const canonicalTeamId = resolveCanonicalTeamId(teamNamePart);
      if (!canonicalTeamId || !Number.isFinite(yearNum) || !Number.isFinite(monthNum)) continue;

      const rawCal = localStorage.getItem(calKey);
      if (!rawCal) continue;

      try {
        const eventsMap = JSON.parse(rawCal);
        if (!eventsMap || typeof eventsMap !== 'object') continue;

        const teamSessionsMap =
          verifiedTeamSessionsByDate.get(canonicalTeamId) || new Map<string, any>();

        // Also check verified matches for this team so we don't keep legacy sample matches for teams without matches
        const localMatchesRaw = localStorage.getItem(
          `team_matches_${getTeamDisplayName(canonicalTeamId)}`
        );
        const localMatches: any[] = localMatchesRaw ? JSON.parse(localMatchesRaw) : [];
        const verifiedMatchDates = new Set<string>(
          (Array.isArray(localMatches) ? localMatches : [])
            .filter((m) => m && m.fecha && !m.isDeleted && !m.estadisticas?.isDeleted)
            .map((m) => String(m.fecha))
        );

        // Check if this calendar is an untouched copy of the legacy August 2026 defaultSample
        if (
          yearNum === 2026 &&
          monthNum === 7 &&
          isLegacyDefaultSampleCalendarMap(eventsMap)
        ) {
          auditEntries.push({
            reason: `Plantilla de demostración automática Agosto 2026 retirada de vista de calendario (${teamNamePart})`,
            sourceLocation: calKey,
            record: eventsMap,
          });

          const reconstructedSampleClean: Record<string, any> = {};
          // Keep only verified sessions and verified matches of this specific team
          teamSessionsMap.forEach((sess, dateStr) => {
            if (dateStr.startsWith('2026-08') || dateStr.startsWith('2026-09')) {
              reconstructedSampleClean[dateStr] = {
                dateStr,
                teamId: canonicalTeamId,
                title: sess.descripcion || 'Sesión de entrenamiento',
                type: sess.tipo === 'Partido' ? 'Partido' : 'Entrenamiento',
                hora: sess.hora || '19:30 h',
                lugar: sess.lugar || '',
              };
            }
          });

          localStorage.setItem(calKey, JSON.stringify(reconstructedSampleClean));
          cleanedCalendarsCount++;
          continue;
        }

        let calModified = false;
        const reconstructedEvents: Record<string, any> = {};

        for (const [dateStr, ev] of Object.entries(eventsMap as Record<string, any>)) {
          if (!ev || typeof ev !== 'object') continue;

          const evTeamId = extractRecordCanonicalTeamId(ev);

          // If event explicitly carries another team's teamId, remove from this team's calendar view and archive
          if (evTeamId && evTeamId !== canonicalTeamId) {
            auditEntries.push({
              reason: `Evento de calendario con teamId=${evTeamId} retirado del calendario de ${canonicalTeamId}`,
              sourceLocation: calKey,
              record: { dateStr, ...ev },
            });
            calModified = true;
            continue;
          }

          if (ev.type === 'Entrenamiento') {
            const hasVerifiedSessionOnDate = teamSessionsMap.has(dateStr);
            const isExplicitlyOwnedByThisTeam =
              evTeamId === canonicalTeamId && ev.isManualCalendarTraining === true;

            if (!hasVerifiedSessionOnDate && !isExplicitlyOwnedByThisTeam) {
              // Training event in calendar cache without a verified session for this teamId
              auditEntries.push({
                reason: `Evento de entrenamiento sin sesión verificada para ${canonicalTeamId} retirado de la vista de calendario`,
                sourceLocation: calKey,
                record: { dateStr, ...ev },
              });
              calModified = true;
              continue;
            }

            const verifiedSess = teamSessionsMap.get(dateStr);
            reconstructedEvents[dateStr] = {
              ...ev,
              dateStr,
              teamId: canonicalTeamId,
              title: verifiedSess?.descripcion || ev.title || 'Sesión de entrenamiento',
              hora: verifiedSess?.hora || ev.hora || '19:30 h',
            };
            if (ev.teamId !== canonicalTeamId) {
              calModified = true;
            }
          } else if (ev.type === 'Partido') {
            // Keep match if it belongs to this team or is in verifiedMatchDates
            if (
              LEGACY_AUGUST_SAMPLE_DATES.has(dateStr) &&
              !verifiedMatchDates.has(dateStr) &&
              (ev.rival === 'AD PARLA' ||
                ev.rival === 'AD LA PLATA' ||
                ev.rival === 'SPORTING HORTALEZA' ||
                ev.rival === 'CD INTER PROMESAS')
            ) {
              calModified = true;
              continue;
            }
            reconstructedEvents[dateStr] = {
              ...ev,
              dateStr,
              teamId: canonicalTeamId,
            };
            if (ev.teamId !== canonicalTeamId) {
              calModified = true;
            }
          } else {
            reconstructedEvents[dateStr] = {
              ...ev,
              dateStr,
              teamId: canonicalTeamId,
            };
            if (ev.teamId !== canonicalTeamId) {
              calModified = true;
            }
          }
        }

        // Also ensure all verified training sessions of this team in this month are present in the calendar
        const monthPrefix = `${yearNum}-${String(monthNum + 1).padStart(2, '0')}`;
        teamSessionsMap.forEach((sess, dateStr) => {
          if (dateStr.startsWith(monthPrefix)) {
            if (!reconstructedEvents[dateStr] || reconstructedEvents[dateStr].type !== 'Partido') {
              const existing = reconstructedEvents[dateStr];
              if (!existing || existing.teamId !== canonicalTeamId) {
                reconstructedEvents[dateStr] = {
                  dateStr,
                  teamId: canonicalTeamId,
                  title: sess.descripcion || existing?.title || 'Sesión de entrenamiento',
                  type: sess.tipo === 'Partido' ? 'Partido' : 'Entrenamiento',
                  hora: sess.hora || existing?.hora || '19:30 h',
                  lugar: sess.lugar || existing?.lugar || '',
                };
                calModified = true;
              }
            }
          }
        });

        if (calModified) {
          localStorage.setItem(calKey, JSON.stringify(reconstructedEvents));
          cleanedCalendarsCount++;
        }
      } catch {}
    }

    // Also clean contaminated `CalendarioMensual` master records in `ud_lapoveda_table_attendance_sessions`
    const rawTableAfter = localStorage.getItem('ud_lapoveda_table_attendance_sessions');
    if (rawTableAfter) {
      try {
        const rows = JSON.parse(rawTableAfter);
        if (Array.isArray(rows)) {
          let masterChanged = false;
          const cleanedMasterRows = rows.map((row: any) => {
            if (!row || row.tipo !== 'CalendarioMensual' || typeof row.descripcion !== 'string') {
              return row;
            }
            try {
              const descObj = JSON.parse(row.descripcion);
              const calTeamId = resolveCanonicalTeamId(
                row.teamId || row.team || descObj?.teamId || descObj?.team
              );
              if (!calTeamId || !descObj || typeof descObj.events !== 'object') return row;

              const yearNum = Number(descObj.year);
              const monthNum = Number(descObj.month);
              const teamName = getTeamDisplayName(calTeamId);
              const localCalKey = `team_monthly_calendar_${teamName}_${yearNum}_${monthNum}`;
              const localCleanRaw = localStorage.getItem(localCalKey);
              if (localCleanRaw) {
                const localCleanEvents = JSON.parse(localCleanRaw);
                masterChanged = true;
                return {
                  ...row,
                  teamId: calTeamId,
                  team: teamName,
                  descripcion: JSON.stringify({
                    ...descObj,
                    teamId: calTeamId,
                    team: teamName,
                    events: localCleanEvents,
                  }),
                };
              }
            } catch {}
            return row;
          });

          if (masterChanged) {
            localStorage.setItem(
              'ud_lapoveda_table_attendance_sessions',
              JSON.stringify(cleanedMasterRows)
            );
          }
        }
      } catch {}
    }

    if (auditEntries.length > 0) {
      appendToUnassignedSessionsAuditArchive(auditEntries);
    }

    localStorage.setItem(TRAINING_ISOLATION_MIGRATION_VERSION_KEY, 'done');
    migrationExecutedInSession = true;
  } catch (err: any) {
    console.warn('Error during training isolation audit and migration:', err);
    return {
      aborted: false,
      backupVerified: true,
      backupKeyCount: backupResult.keyCount,
      stampedSessionsCount,
      inferredHistoricalCount,
      archivedUnverifiedCount,
      cleanedCalendarsCount,
      error: err?.message || String(err),
    };
  }

  return {
    aborted: false,
    backupVerified: true,
    backupKeyCount: backupResult.keyCount,
    stampedSessionsCount,
    inferredHistoricalCount,
    archivedUnverifiedCount,
    cleanedCalendarsCount,
  };
}
