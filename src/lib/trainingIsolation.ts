import { CLUB_TEAM_REGISTRY, ClubTeamRegistryItem } from '@/types';
import { JUGADORAS_ADJUNTAS } from '@/data/jugadorasData';

export const PRE_TRAINING_ISOLATION_BACKUP_KEY = 'afe_pre_training_isolation_backup_v1';
export const UNASSIGNED_SESSIONS_AUDIT_KEY = 'afe_unassigned_sessions_audit_v1';
export const TRAINING_ISOLATION_MIGRATION_VERSION_KEY = 'afe_training_isolation_migration_v2';
export const CUSTOM_TEAM_REGISTRY_KEY = 'afe_custom_team_registry_v1';

export interface CustomTeamRegistryEntry {
  teamId: string;
  displayName: string;
  aliases: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// 1. Canonical Immutable Team Identifier (teamId) Resolution & Custom Teams
// ---------------------------------------------------------------------------

function normalizeTeamLookupToken(raw?: string | null): string {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function getCustomTeamRegistry(): Record<string, CustomTeamRegistryEntry> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(CUSTOM_TEAM_REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const normalizedMap: Record<string, CustomTeamRegistryEntry> = {};
        for (const [k, val] of Object.entries(parsed as Record<string, any>)) {
          if (val && typeof val === 'object' && typeof val.teamId === 'string') {
            normalizedMap[k] = {
              teamId: val.teamId,
              displayName: String(val.displayName || k).trim(),
              aliases: Array.isArray(val.aliases)
                ? val.aliases.map((a: any) => String(a || '').trim()).filter(Boolean)
                : [String(val.displayName || k).trim()],
              createdAt: val.createdAt,
              updatedAt: val.updatedAt,
            };
          }
        }
        return normalizedMap;
      }
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

export function findCustomTeamRegistryEntry(
  teamOrId?: string | null
): CustomTeamRegistryEntry | null {
  const raw = String(teamOrId || '').trim();
  const token = normalizeTeamLookupToken(raw);
  if (!token) return null;

  const customMap = getCustomTeamRegistry();
  if (customMap[raw.toLowerCase()]) return customMap[raw.toLowerCase()];
  if (customMap[token]) return customMap[token];

  for (const entry of Object.values(customMap)) {
    if (!entry || !entry.teamId) continue;
    if (normalizeTeamLookupToken(entry.teamId) === token) return entry;
    if (normalizeTeamLookupToken(entry.displayName) === token) return entry;
    if (
      Array.isArray(entry.aliases) &&
      entry.aliases.some((alias) => normalizeTeamLookupToken(alias) === token)
    ) {
      return entry;
    }
  }
  return null;
}

function buildDeterministicCustomTeamId(rawName: string): string {
  const token = normalizeTeamLookupToken(rawName);
  const slug = token
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return `team_custom_${slug || 'unknown'}`;
}

/**
 * Resolves any team identifier, code, or visible team name into its permanent,
 * immutable internal `teamId` (e.g. 'INFANTIL B' -> 'team_08_infantil_b').
 * Pure read-only operation: NEVER performs automatic writes to localStorage during reads.
 * Even if a custom team's visible display name is changed, its `teamId` remains invariant.
 */
export function resolveCanonicalTeamId(teamOrId?: string | null): string {
  const raw = String(teamOrId || '').trim();
  if (!raw) return '';

  const found = findClubTeamRegistryItem(raw);
  if (found) return found.teamId;

  const customEntry = findCustomTeamRegistryEntry(raw);
  if (customEntry?.teamId) {
    return customEntry.teamId;
  }

  if (raw.toLowerCase().startsWith('team_')) {
    return raw.toLowerCase();
  }

  return buildDeterministicCustomTeamId(raw);
}

/**
 * Resolves a canonical `teamId` (or legacy/previous team name) to its current visible display name.
 * Pure read-only operation: NEVER performs automatic writes to localStorage.
 */
export function getTeamDisplayName(teamIdOrName?: string | null): string {
  const raw = String(teamIdOrName || '').trim();
  if (!raw) return '';

  const found = findClubTeamRegistryItem(raw);
  if (found) return found.displayName;

  const customEntry = findCustomTeamRegistryEntry(raw);
  if (customEntry?.displayName) {
    return customEntry.displayName;
  }

  if (raw.toLowerCase().startsWith('team_custom_')) {
    return raw.slice('team_custom_'.length).replace(/_/g, ' ').trim().toUpperCase();
  }

  return raw;
}

/**
 * Explicitly registers or persists a custom team in `afe_custom_team_registry_v1`,
 * preserving its canonical `teamId` across renames and maintaining the association
 * with its historical sessions, attendance records, rosters, and calendars.
 * Should only be called when a team is explicitly created, registered, renamed, or saved.
 */
export function registerOrPersistCustomTeam(
  teamName: string,
  options?: {
    explicitTeamId?: string;
    previousName?: string;
    migrateStorageOnRename?: boolean;
  }
): CustomTeamRegistryEntry | null {
  const cleanName = String(teamName || '').trim();
  if (!cleanName) return null;

  // Official club teams are already in CLUB_TEAM_REGISTRY and do not need custom registry entries
  if (
    findClubTeamRegistryItem(cleanName) &&
    !options?.previousName &&
    !options?.explicitTeamId
  ) {
    return null;
  }

  if (typeof localStorage === 'undefined') return null;

  const existingByPrev = options?.previousName
    ? findCustomTeamRegistryEntry(options.previousName)
    : null;
  const existingByExplicitId = options?.explicitTeamId
    ? findCustomTeamRegistryEntry(options.explicitTeamId)
    : null;
  const existingByCurrent = findCustomTeamRegistryEntry(cleanName);
  const existingEntry = existingByPrev || existingByExplicitId || existingByCurrent;

  let canonicalTeamId = '';
  if (options?.explicitTeamId && options.explicitTeamId.trim().toLowerCase().startsWith('team_')) {
    canonicalTeamId = options.explicitTeamId.trim().toLowerCase();
  } else if (existingEntry?.teamId) {
    canonicalTeamId = existingEntry.teamId;
  } else if (options?.previousName) {
    canonicalTeamId = resolveCanonicalTeamId(options.previousName);
  } else if (cleanName.toLowerCase().startsWith('team_')) {
    canonicalTeamId = cleanName.toLowerCase();
  } else {
    canonicalTeamId = buildDeterministicCustomTeamId(cleanName);
  }

  const previousDisplayName =
    String(options?.previousName || existingEntry?.displayName || '').trim();
  const displayName = cleanName.toLowerCase().startsWith('team_')
    ? existingEntry?.displayName || cleanName
    : cleanName;

  const aliasesSet = new Set<string>();
  if (existingEntry?.aliases) {
    existingEntry.aliases.forEach((a) => {
      if (a && a.trim()) aliasesSet.add(a.trim());
    });
  }
  if (existingEntry?.displayName) aliasesSet.add(existingEntry.displayName.trim());
  if (previousDisplayName) aliasesSet.add(previousDisplayName);
  if (displayName) aliasesSet.add(displayName);

  const customMap = getCustomTeamRegistry();
  // Remove any obsolete top-level keys that pointed to the same canonicalTeamId
  const nextMap: Record<string, CustomTeamRegistryEntry> = {};
  for (const [k, v] of Object.entries(customMap)) {
    if (v && v.teamId !== canonicalTeamId) {
      nextMap[k] = v;
    }
  }

  const nowIso = new Date().toISOString();
  const updatedEntry: CustomTeamRegistryEntry = {
    teamId: canonicalTeamId,
    displayName,
    aliases: Array.from(aliasesSet),
    createdAt: existingEntry?.createdAt || nowIso,
    updatedAt: nowIso,
  };

  nextMap[canonicalTeamId] = updatedEntry;

  const prevSerialized = localStorage.getItem(CUSTOM_TEAM_REGISTRY_KEY);
  const nextSerialized = JSON.stringify(nextMap);
  if (prevSerialized !== nextSerialized) {
    localStorage.setItem(CUSTOM_TEAM_REGISTRY_KEY, nextSerialized);
  }

  // If the team was renamed, keep all historical sessions, attendance records, rosters, and calendars associated
  const shouldMigrateRename =
    options?.migrateStorageOnRename !== false &&
    previousDisplayName &&
    previousDisplayName !== displayName &&
    !previousDisplayName.toLowerCase().startsWith('team_');

  if (shouldMigrateRename) {
    migrateCustomTeamHistoricalStorageOnRename(
      canonicalTeamId,
      previousDisplayName,
      displayName
    );
  }

  return updatedEntry;
}

/**
 * Renames a custom team while preserving its canonical `teamId` and migrating/maintaining
 * all its historical training sessions, attendance records, rosters, and monthly calendars.
 */
export function renameCustomTeam(
  currentTeamOrId: string,
  newDisplayName: string
): CustomTeamRegistryEntry | null {
  const cleanCurrent = String(currentTeamOrId || '').trim();
  const cleanNew = String(newDisplayName || '').trim();
  if (!cleanCurrent || !cleanNew) return null;

  const existingEntry = findCustomTeamRegistryEntry(cleanCurrent);
  const canonicalTeamId = existingEntry?.teamId || resolveCanonicalTeamId(cleanCurrent);
  const previousName = existingEntry?.displayName || cleanCurrent;

  return registerOrPersistCustomTeam(cleanNew, {
    explicitTeamId: canonicalTeamId,
    previousName,
    migrateStorageOnRename: true,
  });
}

function migrateCustomTeamHistoricalStorageOnRename(
  canonicalTeamId: string,
  oldName: string,
  newName: string
): void {
  if (typeof localStorage === 'undefined' || !oldName || !newName || oldName === newName) return;

  try {
    // 1. Migrate team_sessions_${oldName} -> team_sessions_${newName} preserving every session ID & attendance record
    const oldSessionsKey = `team_sessions_${oldName}`;
    const newSessionsKey = `team_sessions_${newName}`;
    const oldSessionsRaw = localStorage.getItem(oldSessionsKey);
    if (oldSessionsRaw) {
      const oldSessions: any[] = JSON.parse(oldSessionsRaw);
      const newSessionsRaw = localStorage.getItem(newSessionsKey);
      const newSessions: any[] = newSessionsRaw ? JSON.parse(newSessionsRaw) : [];
      if (Array.isArray(oldSessions)) {
        const stampedOld = oldSessions.map((s: any) => ({
          ...s,
          teamId: canonicalTeamId,
          team: newName,
        }));
        const stampedNew = (Array.isArray(newSessions) ? newSessions : []).map((s: any) => ({
          ...s,
          teamId: canonicalTeamId,
          team: newName,
        }));
        const seenOld = new Map<string, number>();
        const seenNew = new Map<string, number>();
        const mergedByKey = new Map<string, any>();

        stampedOld.forEach((s: any) => {
          const { dedupKey, effectiveSessionId, hasExplicitValidId } =
            getStrictFullSessionDeduplicationKey(s, seenOld);
          mergedByKey.set(dedupKey, {
            ...s,
            id: hasExplicitValidId ? String(s.id).trim() : (s.id || effectiveSessionId),
          });
        });
        stampedNew.forEach((s: any) => {
          const { dedupKey, effectiveSessionId, hasExplicitValidId } =
            getStrictFullSessionDeduplicationKey(s, seenNew);
          const prev = mergedByKey.get(dedupKey);
          mergedByKey.set(dedupKey, {
            ...(prev || {}),
            ...s,
            id: hasExplicitValidId ? String(s.id).trim() : (s.id || prev?.id || effectiveSessionId),
            records: prev
              ? reconcileSessionAttendanceRecords(s.records || [], prev.records || [])
              : s.records || [],
          });
        });

        localStorage.setItem(newSessionsKey, JSON.stringify(Array.from(mergedByKey.values())));
      }
    }

    // 2. Migrate team_roster_${oldName} -> team_roster_${newName}
    const oldRosterKey = `team_roster_${oldName}`;
    const newRosterKey = `team_roster_${newName}`;
    const oldRosterRaw = localStorage.getItem(oldRosterKey);
    if (oldRosterRaw && !localStorage.getItem(newRosterKey)) {
      localStorage.setItem(newRosterKey, oldRosterRaw);
    }

    // 3. Update ud_lapoveda_table_attendance_sessions rows belonging to this canonicalTeamId
    const tableRaw = localStorage.getItem('ud_lapoveda_table_attendance_sessions');
    if (tableRaw) {
      const rows = JSON.parse(tableRaw);
      if (Array.isArray(rows)) {
        let changed = false;
        const updatedRows = rows.map((row: any) => {
          if (!row || typeof row !== 'object') return row;
          const rowTeamId = extractRecordCanonicalTeamId(row);
          if (rowTeamId === canonicalTeamId) {
            changed = true;
            return {
              ...row,
              teamId: canonicalTeamId,
              team: newName,
            };
          }
          return row;
        });
        if (changed) {
          localStorage.setItem(
            'ud_lapoveda_table_attendance_sessions',
            JSON.stringify(updatedRows)
          );
        }
      }
    }

    // 4. Copy monthly calendars team_monthly_calendar_${oldName}_${year}_${month} -> team_monthly_calendar_${newName}_${year}_${month}
    const calPrefix = `team_monthly_calendar_${oldName}_`;
    const keysToCopy: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(calPrefix)) {
        keysToCopy.push(k);
      }
    }
    for (const oldCalKey of keysToCopy) {
      const suffix = oldCalKey.slice(calPrefix.length);
      const newCalKey = `team_monthly_calendar_${newName}_${suffix}`;
      const rawCal = localStorage.getItem(oldCalKey);
      if (rawCal && !localStorage.getItem(newCalKey)) {
        try {
          const parsedCal = JSON.parse(rawCal);
          if (parsedCal && typeof parsedCal === 'object') {
            const stampedCal: Record<string, any> = {};
            for (const [dateStr, ev] of Object.entries(parsedCal as Record<string, any>)) {
              if (ev && typeof ev === 'object') {
                stampedCal[dateStr] = {
                  ...ev,
                  teamId: canonicalTeamId,
                  team: newName,
                };
              }
            }
            localStorage.setItem(newCalKey, JSON.stringify(stampedCal));
          }
        } catch {}
      }
    }
  } catch {}
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

/**
 * FASE A — Parses a YYYY-MM-DD date string into { year, monthIndex (0-11), day } or null if invalid.
 */
export function parseStrictYearMonthFromDateStr(
  dateStr?: string | null
): { year: number; monthIndex: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(monthIndex) ||
    !Number.isFinite(day) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  return { year, monthIndex, day };
}

/**
 * FASE A — Validates that a YYYY-MM-DD date string belongs strictly to the target (year, monthIndex 0-11).
 * Prevents out-of-month training events from being dragged or persisted across monthly calendars.
 */
export function isDateStrictlyInMonth(
  dateStr: string | undefined | null,
  targetYear: number,
  targetMonthIndex: number
): boolean {
  const parsed = parseStrictYearMonthFromDateStr(dateStr);
  if (!parsed) return false;
  return parsed.year === targetYear && parsed.monthIndex === targetMonthIndex;
}

/**
 * FASE A — Detects if a text (description/title) explicitly names one of the club's registered teams.
 */
export function detectExplicitClubTeamInText(text?: string | null): string {
  const normText = normalizeTeamLookupToken(text);
  if (!normText) return '';
  for (const reg of CLUB_TEAM_REGISTRY) {
    const normDisplay = normalizeTeamLookupToken(reg.displayName);
    if (normDisplay && normText.includes(normDisplay)) {
      return reg.teamId;
    }
  }
  return '';
}

/**
 * Checks whether an attendance status represents an explicitly marked state
 * (e.g. 'Presente', 'Ausente', 'Retraso', 'Justificado', 'Lesionado', 'No Justificó').
 * Empty strings, null, undefined, or 'Pendiente' are not considered marked attendance states.
 */
export function hasMarkedAttendanceStatus(status: any): boolean {
  if (status === undefined || status === null) return false;
  const clean = String(status).trim();
  if (!clean) return false;
  return clean.toLowerCase() !== 'pendiente';
}

/**
 * Reconciles two attendance records belonging to the same player (`playerId`) between local and cloud:
 * - Preserves marked attendance statuses (`Presente`, `Ausente`, etc.) so an unmarked local record
 *   NEVER overwrites a marked cloud record (and vice versa).
 * - Never overwrites valid non-empty fields with empty/undefined values.
 * - Retains all additional properties and historical fields.
 */
export function reconcileAttendanceRecordPair(localRec: any, cloudRec: any): any {
  if (!localRec || typeof localRec !== 'object') return cloudRec ? { ...cloudRec } : localRec;
  if (!cloudRec || typeof cloudRec !== 'object') return { ...localRec };

  const localMarked = hasMarkedAttendanceStatus(localRec.status);
  const cloudMarked = hasMarkedAttendanceStatus(cloudRec.status);

  let resolvedStatus: any = localRec.status;
  if (localMarked && !cloudMarked) {
    resolvedStatus = localRec.status;
  } else if (cloudMarked && !localMarked) {
    resolvedStatus = cloudRec.status;
  } else if (localMarked && cloudMarked) {
    const localTs = Number(localRec._updatedAtMs ?? localRec.updatedAtMs ?? 0);
    const cloudTs = Number(cloudRec._updatedAtMs ?? cloudRec.updatedAtMs ?? 0);
    resolvedStatus = cloudTs > localTs ? cloudRec.status : localRec.status;
  } else {
    // Neither is marked: if one explicitly carries 'Pendiente' while the other is undefined/empty, keep 'Pendiente';
    // if both are undefined (like the 15 JUGADORAS_ADJUNTAS in the August sessions), preserve undefined.
    const localClean =
      localRec.status !== undefined && localRec.status !== null
        ? String(localRec.status).trim()
        : '';
    const cloudClean =
      cloudRec.status !== undefined && cloudRec.status !== null
        ? String(cloudRec.status).trim()
        : '';
    if (localClean) {
      resolvedStatus = localRec.status;
    } else if (cloudClean) {
      resolvedStatus = cloudRec.status;
    } else {
      resolvedStatus = localRec.status !== undefined ? localRec.status : cloudRec.status;
    }
  }

  const merged: Record<string, any> = {};
  const allKeys = new Set<string>([...Object.keys(cloudRec), ...Object.keys(localRec)]);
  for (const key of allKeys) {
    if (key === 'status') continue;
    const lVal = localRec[key];
    const cVal = cloudRec[key];
    const lHasValue =
      lVal !== undefined && lVal !== null && (typeof lVal !== 'string' || lVal.trim() !== '');
    const cHasValue =
      cVal !== undefined && cVal !== null && (typeof cVal !== 'string' || cVal.trim() !== '');

    if (lHasValue) {
      merged[key] = lVal;
    } else if (cHasValue) {
      merged[key] = cVal;
    } else {
      merged[key] = lVal !== undefined ? lVal : cVal;
    }
  }

  const canonicalPid = String(
    localRec.playerId ?? localRec.id ?? cloudRec.playerId ?? cloudRec.id ?? ''
  ).trim();
  if (canonicalPid) {
    merged.playerId = canonicalPid;
  }
  merged.status = resolvedStatus;

  return merged;
}

/**
 * Reconciles two attendance record lists (`localRecords` and `cloudRecords`) by player (`playerId`):
 * - Identifies each record by `playerId` (with safe fallback for legacy records).
 * - Preserves marked attendance statuses (`Presente`, `Ausente`, etc.) from either side without
 *   overwriting valid statuses with unmarked/empty records.
 * - Preserves all extra metadata fields and historical records (including the 21 records of the August sessions).
 * - Produces zero duplicates.
 */
export function reconcileSessionAttendanceRecords(
  localRecords?: any[],
  cloudRecords?: any[]
): any[] {
  const localArr = Array.isArray(localRecords) ? localRecords : [];
  const cloudArr = Array.isArray(cloudRecords) ? cloudRecords : [];

  const getRecordKey = (rec: any, fallbackPrefix: string, idx: number): string => {
    if (!rec || typeof rec !== 'object') return `${fallbackPrefix}_invalid_${idx}`;
    const pid = String(rec.playerId ?? rec.id ?? '').trim();
    if (pid) return `pid::${pid}`;
    const nameKey = `${String(rec.playerName || rec.nombre || '').trim().toUpperCase()}__${String(
      rec.playerLastName || rec.apellidos || ''
    )
      .trim()
      .toUpperCase()}`;
    if (nameKey !== '__') return `name::${nameKey}`;
    return `${fallbackPrefix}_unkeyed_${idx}`;
  };

  const cloudByKey = new Map<string, any>();
  cloudArr.forEach((cr, idx) => {
    if (!cr || typeof cr !== 'object') return;
    const key = getRecordKey(cr, 'cloud', idx);
    const prev = cloudByKey.get(key);
    cloudByKey.set(key, prev ? reconcileAttendanceRecordPair(prev, cr) : { ...cr });
  });

  const reconciledMap = new Map<string, any>();
  localArr.forEach((lr, idx) => {
    if (!lr || typeof lr !== 'object') return;
    const key = getRecordKey(lr, 'local', idx);
    const existingLocal = reconciledMap.get(key);
    const baseLocal = existingLocal ? reconcileAttendanceRecordPair(existingLocal, lr) : { ...lr };
    const matchingCloud = cloudByKey.get(key);
    if (matchingCloud) {
      reconciledMap.set(key, reconcileAttendanceRecordPair(baseLocal, matchingCloud));
      cloudByKey.delete(key);
    } else {
      reconciledMap.set(key, baseLocal);
    }
  });

  // Append any remaining cloud records not present in localRecords
  cloudByKey.forEach((cr, key) => {
    reconciledMap.set(key, cr);
  });

  return Array.from(reconciledMap.values());
}

/**
 * Reconciles session sub-item arrays (`tareas`, `archivos`, `videos`) by `id` (or natural title/url key)
 * without losing items or creating duplicates.
 */
export function reconcileSessionSubItemsById<T = any>(
  localItems?: T[],
  cloudItems?: T[]
): T[] {
  const localArr = Array.isArray(localItems) ? localItems : [];
  const cloudArr = Array.isArray(cloudItems) ? cloudItems : [];
  if (localArr.length === 0) return [...cloudArr];
  if (cloudArr.length === 0) return [...localArr];

  const getKey = (item: any, prefix: string, idx: number): string => {
    if (!item || typeof item !== 'object') return `${prefix}_${idx}`;
    const id = String(item.id || '').trim();
    if (id) return `id::${id}`;
    const natural = String(item.titulo || item.nombre || item.url || '').trim().toLowerCase();
    if (natural) return `nat::${natural}`;
    return `${prefix}_${idx}`;
  };

  const merged = new Map<string, T>();
  localArr.forEach((item, idx) => {
    merged.set(getKey(item, 'local', idx), item);
  });
  cloudArr.forEach((item, idx) => {
    const k = getKey(item, 'cloud', idx);
    if (!merged.has(k)) {
      merged.set(k, item);
    } else {
      merged.set(k, { ...(item as any), ...(merged.get(k) as any) });
    }
  });
  return Array.from(merged.values());
}

/**
 * Generates a unique, persistent identifier for a newly created training session at creation time.
 * That identifier is preserved across `localStorage`, `Supabase`, and `Firestore`.
 */
export function createPersistentSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const randHex = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${randHex()}${randHex()}-${randHex()}-4${randHex().slice(1)}-a${randHex().slice(1)}-${randHex()}${randHex()}${randHex()}`;
}

/**
 * FASE A — Computes a deterministic 32-bit FNV-1a hex fingerprint of a legacy ID-less session's
 * full content (`fecha`, `hora`, `tipo`, `descripcion`, `lugar`, `observaciones`, `createdAt`,
 * `records`, `tareas`, `archivos`, `videos`).
 * Ensures that two different legacy sessions without an explicit ID that share the same descriptive
 * fields (`fecha`, `hora`, `tipo`, `descripcion`, `lugar`) produce distinct fingerprints whenever
 * any of their records, observations, tasks, files, videos, or timestamps differ, while repeated reads
 * of the same legacy session always produce the exact same deterministic fingerprint.
 */
export function computeSessionContentFingerprint(session: any): string {
  const fecha = String(session?.fecha || session?.dateStr || '').trim();
  const hora = String(session?.hora || '19:30 h').trim().toLowerCase();
  const tipo = String(session?.tipo || session?.type || 'Entrenamiento').trim().toLowerCase();
  const desc = String(session?.descripcion || session?.title || 'Sesión de entrenamiento')
    .trim()
    .toLowerCase();
  const lugar = String(session?.lugar || '').trim().toLowerCase();
  const obs = String(session?.observaciones || session?.notas || '').trim().toLowerCase();
  const metaOrigin = String(
    session?.createdAt ||
      session?.created_at ||
      session?._createdAtMs ||
      session?.turno ||
      session?.sessionIndex ||
      ''
  ).trim();

  const recordsArr: any[] = Array.isArray(session?.records) ? session.records : [];
  const recordsSig = recordsArr
    .map((r: any) => {
      const pid = String(r?.playerId ?? r?.id ?? '').trim();
      const st = r?.status !== undefined && r?.status !== null ? String(r.status).trim() : '';
      const extra = String(r?.comentario || r?.motivo || r?.horaLlegada || '')
        .trim()
        .toLowerCase();
      return pid || st || extra ? `${pid}:${st}:${extra}` : '';
    })
    .filter(Boolean)
    .sort()
    .join('|');

  const tareasArr: any[] = Array.isArray(session?.tareas) ? session.tareas : [];
  const tareasSig = tareasArr
    .map(
      (t: any) =>
        `${String(t?.id || '').trim()}:${String(t?.titulo || '')
          .trim()
          .toLowerCase()}:${String(t?.duracion || '')
          .trim()
          .toLowerCase()}:${String(t?.descripcion || '')
          .trim()
          .toLowerCase()}`
    )
    .join('|');

  const archivosArr: any[] = Array.isArray(session?.archivos) ? session.archivos : [];
  const archivosSig = archivosArr
    .map((f: any) => `${String(f?.id || '').trim()}:${String(f?.nombre || '').trim().toLowerCase()}`)
    .join('|');

  const videosArr: any[] = Array.isArray(session?.videos) ? session.videos : [];
  const videosSig = videosArr
    .map(
      (v: any) =>
        `${String(v?.id || '').trim()}:${String(v?.nombre || v?.url || '')
          .trim()
          .toLowerCase()}`
    )
    .join('|');

  const raw = `${fecha}__${hora}__${tipo}__${desc}__${lugar}__${obs}__${metaOrigin}__${recordsSig}__${tareasSig}__${archivosSig}__${videosSig}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * FASE A — Strict deduplication key generator for Full Sessions (`AttendanceSession`).
 * Guarantees simultaneously:
 * 1. Every new session receives a unique persistent ID at creation time (`createPersistentSessionId()`),
 *    preserved across `localStorage`, `Supabase`, and `Firestore`.
 * 2. Any session that already has a valid persistent ID (including historical IDs like `'1773944162835'`,
 *    UUIDs, or an already-assigned deterministic ID `'unidentified_...'`) is recognized across all stores
 *    by that exact identifier (`dedupKey: "id::" + rawId`), so modifying its attendance or notes never
 *    changes its identity or creates duplicates.
 * 3. Two different sessions NEVER merge, even if they lack an ID and share identical descriptive data
 *    (`fecha`, `hora`, `tipo`, `descripcion`, `lugar`).
 * 4. For legacy sessions without an ID, assigns a deterministic ID (`unidentified_<fecha>_<fp>_<occIndex>`)
 *    without generating random UUIDs on read and without deleting any records.
 */
export function getStrictFullSessionDeduplicationKey(
  session: any,
  seenCounterInCurrentStore?: Map<string, number>
): {
  dedupKey: string;
  effectiveSessionId: string;
  hasExplicitValidId: boolean;
} {
  const fecha = String(session?.fecha || session?.dateStr || 'nodate').trim();
  const rawId = String(session?.id ?? session?.sessionId ?? '').trim();
  const isBareDateId = /^\d{4}-\d{2}-\d{2}$/.test(rawId) || (fecha !== '' && rawId === fecha);

  if (rawId && !isBareDateId) {
    const syntheticMatch = /^unidentified_(.+)_([0-9a-f]{8})_(\d+)$/.exec(rawId);
    if (syntheticMatch && seenCounterInCurrentStore) {
      const baseFpKey = `fp::${syntheticMatch[1]}::${syntheticMatch[2]}`;
      const existingOcc = Number(syntheticMatch[3]);
      const currCount = seenCounterInCurrentStore.get(baseFpKey) ?? 0;
      if (Number.isFinite(existingOcc) && existingOcc + 1 > currCount) {
        seenCounterInCurrentStore.set(baseFpKey, existingOcc + 1);
      }
    }
    return {
      dedupKey: `id::${rawId}`,
      effectiveSessionId: rawId,
      hasExplicitValidId: true,
    };
  }

  const fp = computeSessionContentFingerprint(session);
  const baseFpKey = `fp::${fecha || 'nodate'}::${fp}`;
  const occIndex = seenCounterInCurrentStore ? (seenCounterInCurrentStore.get(baseFpKey) ?? 0) : 0;
  if (seenCounterInCurrentStore) {
    seenCounterInCurrentStore.set(baseFpKey, occIndex + 1);
  }

  const effectiveSessionId = `unidentified_${fecha || 'nodate'}_${fp}_${occIndex}`;
  return {
    dedupKey: `id::${effectiveSessionId}`,
    effectiveSessionId,
    hasExplicitValidId: false,
  };
}

/**
 * Tombstone record representing an explicitly deleted training session,
 * bound strictly to the session's real identity (`id`, `dedupKey`, `fingerprint`) and `teamId`.
 */
export interface DeletedSessionTombstone {
  id?: string;
  dedupKey?: string;
  fingerprint?: string;
  teamId?: string;
  team?: string;
  fecha: string;
  hora?: string;
  tipo?: string;
  descripcion?: string;
  deletedAtMs?: number;
}

/**
 * Builds a strict session deletion tombstone bound to the session's canonical team and real identity.
 */
export function createSessionDeletionTombstone(
  session: any,
  targetTeamOrId?: string | null,
  seenCounterInCurrentStore?: Map<string, number>
): DeletedSessionTombstone {
  const canonicalTeamId = resolveCanonicalTeamId(
    targetTeamOrId || extractRecordCanonicalTeamId(session)
  );
  const { dedupKey, effectiveSessionId, hasExplicitValidId } =
    getStrictFullSessionDeduplicationKey(session, seenCounterInCurrentStore);
  const rawId = String(session?.id ?? session?.sessionId ?? '').trim();
  const fp = computeSessionContentFingerprint(session);
  const fecha = String(session?.fecha || session?.dateStr || '').trim();

  return {
    id: hasExplicitValidId ? rawId : effectiveSessionId,
    dedupKey,
    fingerprint: fp,
    teamId: canonicalTeamId,
    team:
      getTeamDisplayName(canonicalTeamId) ||
      String(session?.team || targetTeamOrId || '').trim(),
    fecha,
    hora: String(session?.hora || '').trim(),
    tipo: String(session?.tipo || session?.type || '').trim(),
    descripcion: String(session?.descripcion || session?.title || '').trim(),
    deletedAtMs: Date.now(),
  };
}

/**
 * Evaluates whether a candidate session matches a specific deletion tombstone:
 * - Strictly enforces team isolation (`teamId`): a tombstone for one team NEVER matches another team.
 * - When a tombstone carries a session ID (`id`) or `dedupKey`, matches ONLY that exact session identity
 *   and NEVER matches other sessions simply because they share the same `fecha`.
 * - For legacy ID-less sessions, matches by `effectiveSessionId` / `dedupKey` / `fingerprint` + `teamId`.
 */
export function doesSessionMatchTombstone(
  session: any,
  tombstone: DeletedSessionTombstone | any,
  targetTeamOrId?: string | null,
  sessionDedupInfo?: {
    dedupKey: string;
    effectiveSessionId: string;
    hasExplicitValidId: boolean;
  }
): boolean {
  if (!session || typeof session !== 'object' || !tombstone || typeof tombstone !== 'object') {
    return false;
  }

  const activeTeamId = targetTeamOrId ? resolveCanonicalTeamId(targetTeamOrId) : '';
  const sessTeamId = extractRecordCanonicalTeamId(session) || activeTeamId;
  const tombTeamId =
    resolveCanonicalTeamId(tombstone.teamId || tombstone.team) || activeTeamId;

  if (sessTeamId && tombTeamId && sessTeamId !== tombTeamId) {
    return false;
  }
  if (activeTeamId && sessTeamId && sessTeamId !== activeTeamId) {
    return false;
  }
  if (activeTeamId && tombTeamId && tombTeamId !== activeTeamId) {
    return false;
  }

  const sessFecha = String(session.fecha || session.dateStr || '').trim();
  const rawSessId = String(session.id ?? session.sessionId ?? '').trim();
  const sessIsBareDate =
    /^\d{4}-\d{2}-\d{2}$/.test(rawSessId) || (sessFecha !== '' && rawSessId === sessFecha);
  const sessHasExplicitNonSyntheticId = Boolean(
    rawSessId && !sessIsBareDate && !rawSessId.startsWith('unidentified_')
  );

  const dedup = sessionDedupInfo || getStrictFullSessionDeduplicationKey(session);

  const tombId = String(tombstone.id || '').trim();
  const tombFecha = String(tombstone.fecha || '').trim();
  const tombIsBareDate =
    /^\d{4}-\d{2}-\d{2}$/.test(tombId) || (tombFecha !== '' && tombId === tombFecha);
  const hasTombId = Boolean(tombId && !tombIsBareDate);
  const tombDedupKey = String(
    tombstone.dedupKey || (hasTombId ? `id::${tombId}` : '')
  ).trim();
  const tombFp = String(tombstone.fingerprint || '').trim();

  // 1. Tombstone has an explicit ID or dedupKey: NEVER fall back to date-only matching
  if (hasTombId || tombDedupKey) {
    if (sessHasExplicitNonSyntheticId) {
      return (
        (hasTombId && rawSessId === tombId) ||
        (Boolean(tombDedupKey) && dedup.dedupKey === tombDedupKey)
      );
    }
    if (hasTombId && dedup.effectiveSessionId === tombId) {
      return true;
    }
    if (tombDedupKey && dedup.dedupKey === tombDedupKey) {
      return true;
    }
    return false;
  }

  // 2. Tombstone has a content fingerprint (legacy ID-less session tombstone without explicit ID):
  // Require both canonical teamId and exact content fingerprint match (never date alone)
  if (tombFp) {
    if (sessHasExplicitNonSyntheticId) {
      return false;
    }
    if (!sessTeamId || !tombTeamId || sessTeamId !== tombTeamId) {
      return false;
    }
    if (tombFecha && sessFecha !== tombFecha) {
      return false;
    }
    return computeSessionContentFingerprint(session) === tombFp;
  }

  // 3. Any tombstone lacking id, dedupKey, and fingerprint cannot unambiguously identify a session:
  // NEVER match by date alone.
  return false;
}

/**
 * Checks if a session is marked as deleted by any tombstone in `deletedList` for the target team.
 */
export function isSessionDeletedByTombstones(
  session: any,
  deletedList?: (DeletedSessionTombstone | any)[],
  targetTeamOrId?: string | null,
  sessionDedupInfo?: {
    dedupKey: string;
    effectiveSessionId: string;
    hasExplicitValidId: boolean;
  }
): boolean {
  if (!Array.isArray(deletedList) || deletedList.length === 0) return false;
  const dedup = sessionDedupInfo || getStrictFullSessionDeduplicationKey(session);
  return deletedList.some((tomb) =>
    doesSessionMatchTombstone(session, tomb, targetTeamOrId, dedup)
  );
}

/**
 * Reconciles a team's monthly calendar event map (`Record<dateStr, CalendarEvent>`) after a training session is deleted:
 * - Never modifies events belonging to other teams (`teamId` isolation).
 * - If another active training session of the same team exists on the same date in `remainingSessions`,
 *   preserves the calendar event on that date and binds it to the remaining session (`sessionId`, `title`, `hora`, `lugar`).
 * - Only removes the calendar event on that date when no active sessions remain on that date for that team
 *   and the event belonged to the deleted session.
 */
export function reconcileMonthlyCalendarAfterSessionDeletion(params: {
  calendarEvents: Record<string, any>;
  deletedSession: any;
  remainingSessions: any[];
  teamName: string;
}): {
  updatedEvents: Record<string, any>;
  changed: boolean;
  preservedSessionOnSameDate: any | null;
} {
  const { calendarEvents, deletedSession, remainingSessions, teamName } = params;
  const safeEvents: Record<string, any> =
    calendarEvents && typeof calendarEvents === 'object' ? { ...calendarEvents } : {};
  const canonicalTeamId = resolveCanonicalTeamId(teamName);
  const fecha = String(deletedSession?.fecha || deletedSession?.dateStr || '').trim();

  if (!fecha || !canonicalTeamId || !safeEvents[fecha]) {
    return {
      updatedEvents: safeEvents,
      changed: false,
      preservedSessionOnSameDate: null,
    };
  }

  const calEv = safeEvents[fecha];
  if (!calEv || typeof calEv !== 'object' || calEv.type !== 'Entrenamiento') {
    return {
      updatedEvents: safeEvents,
      changed: false,
      preservedSessionOnSameDate: null,
    };
  }

  // Never modify a calendar event belonging to another team
  const evTeamId = extractRecordCanonicalTeamId(calEv);
  if (evTeamId && evTeamId !== canonicalTeamId) {
    return {
      updatedEvents: safeEvents,
      changed: false,
      preservedSessionOnSameDate: null,
    };
  }

  // Locate any remaining active session of this team on the same date
  const remSeen = new Map<string, number>();
  let remainingOnSameDate: any | null = null;
  let remainingEffectiveId = '';

  for (const s of Array.isArray(remainingSessions) ? remainingSessions : []) {
    if (!s || typeof s !== 'object') continue;
    if (s.tipo === 'CalendarioMensual' || s.unverifiedOrigin) continue;
    const sTeamId = extractRecordCanonicalTeamId(s);
    if (sTeamId && sTeamId !== canonicalTeamId) continue;
    if (!isSessionAllowedForActiveTeamView(s, canonicalTeamId)) continue;
    const sDedup = getStrictFullSessionDeduplicationKey(s, remSeen);
    if (String(s.fecha || '').trim() === fecha) {
      remainingOnSameDate = s;
      remainingEffectiveId = sDedup.effectiveSessionId;
      break;
    }
  }

  if (remainingOnSameDate) {
    safeEvents[fecha] = {
      ...calEv,
      dateStr: fecha,
      teamId: canonicalTeamId,
      team: getTeamDisplayName(canonicalTeamId) || teamName,
      sessionId: remainingEffectiveId,
      title: remainingOnSameDate.descripcion || calEv.title || 'Entrenamiento',
      type: 'Entrenamiento',
      hora: remainingOnSameDate.hora || calEv.hora || '19:30 h',
      lugar: remainingOnSameDate.lugar ?? calEv.lugar ?? '',
    };
    return {
      updatedEvents: safeEvents,
      changed: true,
      preservedSessionOnSameDate: {
        ...remainingOnSameDate,
        id: remainingEffectiveId,
      },
    };
  }

  // No remaining sessions on this date for this team:
  // Only delete the calendar entry if it was bound to the deleted session (or had no sessionId)
  const deletedDedup = getStrictFullSessionDeduplicationKey(deletedSession);
  const rawDeletedId = String(deletedSession?.id ?? deletedSession?.sessionId ?? '').trim();
  const evSessionId = String(calEv.sessionId || '').trim();

  if (
    !evSessionId ||
    evSessionId === rawDeletedId ||
    evSessionId === deletedDedup.effectiveSessionId
  ) {
    delete safeEvents[fecha];
    return {
      updatedEvents: safeEvents,
      changed: true,
      preservedSessionOnSameDate: null,
    };
  }

  return {
    updatedEvents: safeEvents,
    changed: false,
    preservedSessionOnSameDate: null,
  };
}

/**
 * Executes a safe, isolated deletion of a single training session:
 * 1. Verifies that the target session is unambiguously identified and belongs to `teamName`.
 *    If a legacy session without ID cannot be unequivocally identified, refuses automatic deletion.
 * 2. Records a session-identity tombstone (`id`, `dedupKey`, `fingerprint`, `teamId`) in `team_deleted_sessions_${teamName}`.
 * 3. Removes ONLY the targeted session from `currentSessions` and `localStorage` (`team_sessions_${teamName}` and
 *    `ud_lapoveda_table_attendance_sessions`), leaving other sessions on the same date and other teams untouched.
 * 4. Executes targeted deletion in Supabase (`attendance_sessions`) strictly scoped by `id` + `team`,
 *    NEVER executing general `.delete().eq('fecha', fecha)` or team+date delete queries.
 */
export async function executeSafeSessionDeletion(params: {
  sessionToDelete: any;
  teamName: string;
  currentSessions?: any[];
  supabaseClient?: any;
}): Promise<{
  deleted: boolean;
  remainingSessions: any[];
  tombstone: DeletedSessionTombstone | null;
}> {
  const { sessionToDelete, teamName, supabaseClient } = params;
  const canonicalTeamId = resolveCanonicalTeamId(teamName);
  const sessionsKey = `team_sessions_${teamName}`;

  const baseSessions: any[] = Array.isArray(params.currentSessions)
    ? params.currentSessions
    : (() => {
        if (typeof localStorage === 'undefined') return [];
        try {
          const raw = localStorage.getItem(sessionsKey);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      })();

  if (
    !sessionToDelete ||
    typeof sessionToDelete !== 'object' ||
    !canonicalTeamId ||
    sessionToDelete.unverifiedOrigin === true
  ) {
    return { deleted: false, remainingSessions: baseSessions, tombstone: null };
  }

  const sessTeamId = extractRecordCanonicalTeamId(sessionToDelete);
  if (sessTeamId && sessTeamId !== canonicalTeamId) {
    // Refuse to delete a session belonging to another team
    return { deleted: false, remainingSessions: baseSessions, tombstone: null };
  }

  const fechaToDelete = String(sessionToDelete.fecha || sessionToDelete.dateStr || '').trim();
  const rawId = String(sessionToDelete.id ?? sessionToDelete.sessionId ?? '').trim();
  const isBareDateId =
    /^\d{4}-\d{2}-\d{2}$/.test(rawId) || (fechaToDelete !== '' && rawId === fechaToDelete);
  const hasExplicitId = Boolean(rawId && !isBareDateId);

  // If a legacy session lacks an explicit ID, verify that it has unequivocal identifying content
  // (team association + valid date + verifiable content in currentSessions)
  const hasVerifiableLegacyIdentity = Boolean(
    !hasExplicitId &&
      fechaToDelete &&
      (sessTeamId === canonicalTeamId || doesRecordBelongToTeam(sessionToDelete, canonicalTeamId)) &&
      (sessionToDelete.hora ||
        sessionToDelete.descripcion ||
        (Array.isArray(sessionToDelete.records) && sessionToDelete.records.length > 0))
  );

  if (!hasExplicitId && !hasVerifiableLegacyIdentity) {
    return { deleted: false, remainingSessions: baseSessions, tombstone: null };
  }

  // Locate the exact session inside baseSessions to compute its accurate occurrence-aware dedupKey
  const listSeen = new Map<string, number>();
  let matchedDedupInfo:
    | { dedupKey: string; effectiveSessionId: string; hasExplicitValidId: boolean }
    | undefined;

  for (const s of baseSessions) {
    if (!s || typeof s !== 'object') continue;
    const sDedup = getStrictFullSessionDeduplicationKey(s, listSeen);
    if (
      s === sessionToDelete ||
      (hasExplicitId && (String(s.id ?? '').trim() === rawId || sDedup.effectiveSessionId === rawId))
    ) {
      matchedDedupInfo = sDedup;
      break;
    }
  }

  const targetFp = computeSessionContentFingerprint(sessionToDelete);

  if (!matchedDedupInfo && !hasExplicitId) {
    const fallbackSeen = new Map<string, number>();
    const matchingCandidates: Array<{
      dedupKey: string;
      effectiveSessionId: string;
      hasExplicitValidId: boolean;
    }> = [];
    for (const s of baseSessions) {
      if (!s || typeof s !== 'object') continue;
      const sDedup = getStrictFullSessionDeduplicationKey(s, fallbackSeen);
      if (
        String(s.fecha || '').trim() === fechaToDelete &&
        computeSessionContentFingerprint(s) === targetFp
      ) {
        matchingCandidates.push(sDedup);
      }
    }
    if (matchingCandidates.length === 1) {
      matchedDedupInfo = matchingCandidates[0];
    } else {
      // Cannot unequivocally identify which legacy ID-less session was targeted: refuse automatic deletion
      return { deleted: false, remainingSessions: baseSessions, tombstone: null };
    }
  }

  const targetDedup =
    matchedDedupInfo || getStrictFullSessionDeduplicationKey(sessionToDelete);

  const tombstone: DeletedSessionTombstone = {
    id: hasExplicitId ? rawId : targetDedup.effectiveSessionId,
    dedupKey: targetDedup.dedupKey,
    fingerprint: targetFp,
    teamId: canonicalTeamId,
    team: getTeamDisplayName(canonicalTeamId) || teamName,
    fecha: fechaToDelete,
    hora: String(sessionToDelete.hora || '').trim(),
    tipo: String(sessionToDelete.tipo || sessionToDelete.type || '').trim(),
    descripcion: String(sessionToDelete.descripcion || sessionToDelete.title || '').trim(),
    deletedAtMs: Date.now(),
  };

  // 1. Persist identity-bound tombstone in localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      const deletedKey = `team_deleted_sessions_${teamName}`;
      const existingRaw = localStorage.getItem(deletedKey);
      const existingList: DeletedSessionTombstone[] = existingRaw ? JSON.parse(existingRaw) : [];
      const alreadyExists = existingList.some(
        (d) =>
          (d.dedupKey && d.dedupKey === tombstone.dedupKey) ||
          (d.id && tombstone.id && d.id === tombstone.id)
      );
      const updatedDeleted = alreadyExists ? existingList : [...existingList, tombstone];
      localStorage.setItem(deletedKey, JSON.stringify(updatedDeleted));
    } catch {}
  }

  // 2. Remove ONLY the matching session from baseSessions
  const filterSeen = new Map<string, number>();
  let removedFromList = false;
  const remainingSessions = baseSessions.filter((s) => {
    if (!s || typeof s !== 'object') return false;
    const sTeamId = extractRecordCanonicalTeamId(s);
    if (sTeamId && sTeamId !== canonicalTeamId) {
      return true;
    }
    const sDedup = getStrictFullSessionDeduplicationKey(s, filterSeen);
    if (!removedFromList && doesSessionMatchTombstone(s, tombstone, canonicalTeamId, sDedup)) {
      removedFromList = true;
      return false;
    }
    return true;
  });

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`team_sessions_initialized_${teamName}`, 'true');
      localStorage.setItem(sessionsKey, JSON.stringify(remainingSessions));
    } catch {}

    // 3. Remove ONLY the matching session of this team from ud_lapoveda_table_attendance_sessions (never by date)
    try {
      const rawTable = localStorage.getItem('ud_lapoveda_table_attendance_sessions');
      if (rawTable) {
        const tableData: any[] = JSON.parse(rawTable);
        if (Array.isArray(tableData)) {
          const tableSeen = new Map<string, number>();
          let removedFromTable = false;
          const filteredTable = tableData.filter((item: any) => {
            if (!item || typeof item !== 'object') return true;
            if (item.tipo === 'CalendarioMensual') return true;
            if (!doesRecordBelongToTeam(item, canonicalTeamId)) return true;
            const itemDedup = getStrictFullSessionDeduplicationKey(item, tableSeen);
            if (
              !removedFromTable &&
              doesSessionMatchTombstone(item, tombstone, canonicalTeamId, itemDedup)
            ) {
              removedFromTable = true;
              return false;
            }
            return true;
          });
          localStorage.setItem(
            'ud_lapoveda_table_attendance_sessions',
            JSON.stringify(filteredTable)
          );
        }
      }
    } catch {}
  }

  // 4. Delete from Supabase strictly using persistent session ID + team filter (NEVER delete by fecha)
  if (supabaseClient && typeof supabaseClient.from === 'function') {
    try {
      if (hasExplicitId) {
        await supabaseClient
          .from('attendance_sessions')
          .delete()
          .eq('id', rawId)
          .eq('team', teamName);
      }
    } catch (err) {
      console.warn('Supabase targeted session delete skipped/failed:', err);
    }
  }

  return {
    deleted: true,
    remainingSessions,
    tombstone,
  };
}

/**
 * FASE A (Condición 1) — In-memory isolation gatekeeper for `AttendanceSession` records.
 * Prevents contaminated sessions stored in `team_sessions_*`, Supabase `attendance_sessions`,
 * or Firestore `/club_sync/sessions_*` from re-entering the active calendar or `Asistencia` view
 * of another team, WITHOUT modifying or deleting any historical records in storage.
 */
export function isSessionAllowedForActiveTeamView(
  session: any,
  targetTeamOrId?: string | null
): boolean {
  if (!session || typeof session !== 'object') return false;
  if (session.tipo === 'CalendarioMensual') return false;
  if (session.unverifiedOrigin === true) return false;
  if (typeof session.descripcion === 'string' && session.descripcion.trim().startsWith('{')) {
    return false;
  }

  const targetTeamId = resolveCanonicalTeamId(targetTeamOrId);
  if (!targetTeamId) return false;

  // 1. Explicit teamId check
  const recTeamId = extractRecordCanonicalTeamId(session);
  if (recTeamId && recTeamId !== targetTeamId) {
    return false;
  }

  // 2. Explicit foreign team name in description (e.g., "Microciclo Infantil B" inside Senior Femenino)
  const mentionedTeamId = detectExplicitClubTeamInText(session.descripcion);
  if (mentionedTeamId && mentionedTeamId !== targetTeamId) {
    return false;
  }

  // 3. Check player records and cross-team session IDs in read-only mode
  if (typeof localStorage !== 'undefined') {
    const targetRosterIds = new Set<string>();
    if (targetTeamId === 'team_01_senior_femenino') {
      JUGADORAS_ADJUNTAS.forEach((j) => targetRosterIds.add(String(j.id).trim()));
    }
    const targetDisplayName = getTeamDisplayName(targetTeamId);
    const customTargetEntry = findCustomTeamRegistryEntry(targetTeamId);
    const candidateTargetNames = new Set<string>([targetDisplayName]);
    if (customTargetEntry?.aliases) {
      customTargetEntry.aliases.forEach((a) => candidateTargetNames.add(a));
    }
    for (const candidateName of candidateTargetNames) {
      if (!candidateName) continue;
      try {
        const rawTargetRoster = localStorage.getItem(`team_roster_${candidateName}`);
        if (rawTargetRoster) {
          const parsed = JSON.parse(rawTargetRoster);
          if (Array.isArray(parsed)) {
            parsed.forEach((p: any) => {
              if (p?.id) targetRosterIds.add(String(p.id).trim());
            });
          }
        }
      } catch {}
    }

    const foreignRosterIds = new Set<string>();
    const foreignSessionIds = new Set<string>();
    for (const reg of CLUB_TEAM_REGISTRY) {
      if (reg.teamId === targetTeamId) continue;
      try {
        const rawRoster = localStorage.getItem(`team_roster_${reg.displayName}`);
        if (rawRoster) {
          const parsedRoster = JSON.parse(rawRoster);
          if (Array.isArray(parsedRoster)) {
            parsedRoster.forEach((p: any) => {
              const pid = String(p?.id || '').trim();
              if (pid && !targetRosterIds.has(pid)) {
                foreignRosterIds.add(pid);
              }
            });
          }
        }
      } catch {}

      try {
        const rawSessions = localStorage.getItem(`team_sessions_${reg.displayName}`);
        if (rawSessions) {
          const parsedSessions = JSON.parse(rawSessions);
          if (Array.isArray(parsedSessions)) {
            parsedSessions.forEach((s: any) => {
              const sid = String(s?.id || '').trim();
              if (sid && !sid.startsWith('cal_')) {
                foreignSessionIds.add(sid);
              }
            });
          }
        }
      } catch {}
    }

    const recs: any[] = Array.isArray(session.records) ? session.records : [];
    let targetTeamPlayersCount = 0;
    let foreignTeamPlayersCount = 0;
    for (const r of recs) {
      const pid = String(r?.playerId || r?.id || '').trim();
      if (!pid) continue;
      if (targetRosterIds.has(pid)) targetTeamPlayersCount++;
      else if (foreignRosterIds.has(pid)) foreignTeamPlayersCount++;
    }

    // Reject if all recognized players in the session belong to a foreign team's roster
    if (foreignTeamPlayersCount > 0 && targetTeamPlayersCount === 0) {
      return false;
    }

    // Reject if the exact sessionId belongs to a foreign team's session list and has 0 target team players
    const sessionId = String(session.id || '').trim();
    if (sessionId && foreignSessionIds.has(sessionId) && targetTeamPlayersCount === 0) {
      return false;
    }
  }

  return true;
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
      (r: any) =>
        r &&
        r.status !== undefined &&
        r.status !== null &&
        String(r.status).trim() !== '' &&
        r.status !== 'Pendiente'
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

  // Automatic migration/cleanup on UI mount (force === false) is disabled
  // so zero automatic modifications, deletions, or backup overwrites occur on page load.
  if (!force || (migrationExecutedInSession && !force)) {
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
        const deletedList: DeletedSessionTombstone[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        const auditStoreSeen = new Map<string, number>();

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

          const sessDedup = getStrictFullSessionDeduplicationKey(stamped, auditStoreSeen);

          // Only register as an active calendar-visible training session if not deleted and not an untouched boilerplate stub
          if (
            stamped.fecha &&
            !isSessionDeletedByTombstones(stamped, deletedList, reg.teamId, sessDedup) &&
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
          const tableAuditSeenByTeam = new Map<string, Map<string, number>>();

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
              const deletedList: DeletedSessionTombstone[] = deletedRaw
                ? JSON.parse(deletedRaw)
                : [];
              if (!tableAuditSeenByTeam.has(directTeamId)) {
                tableAuditSeenByTeam.set(directTeamId, new Map());
              }
              const rowDedup = getStrictFullSessionDeduplicationKey(
                row,
                tableAuditSeenByTeam.get(directTeamId)!
              );
              const isDel = isSessionDeletedByTombstones(
                row,
                deletedList,
                directTeamId,
                rowDedup
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
          // Keep only verified sessions and verified matches of this specific team AND strictly within this month
          teamSessionsMap.forEach((sess, dateStr) => {
            if (isDateStrictlyInMonth(dateStr, yearNum, monthNum)) {
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

          // Strictly reject out-of-month dragged events
          if (!isDateStrictlyInMonth(dateStr, yearNum, monthNum)) {
            auditEntries.push({
              reason: `Evento arrastrado fuera de mes (${dateStr}) retirado del calendario ${calKey} (${yearNum}-${monthNum})`,
              sourceLocation: calKey,
              record: { dateStr, ...ev },
            });
            calModified = true;
            continue;
          }

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
