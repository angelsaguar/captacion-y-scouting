import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
export const PRE_SYNC_MATCH_BACKUP_KEY = 'afe_pre_match_sync_backup_v1';

export function sanitizeFirestoreId(rawId?: string): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 128);
  if (cleaned && VALID_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `m-${crypto.randomUUID()}`;
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(value as Record<string, any>)) {
      if (val !== undefined) {
        result[key] = stripUndefinedDeep(val);
      }
    }
    return result as T;
  }
  return value;
}

function clampString(val: unknown, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

function clampInt(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(99, Math.round(num)));
}

function normalizeMatchType(tipo: unknown): 'Local' | 'Visitante' {
  return String(tipo || '').trim() === 'Visitante' ? 'Visitante' : 'Local';
}

function normalizeCompetition(comp: unknown): 'Liga' | 'Copa' | 'Amistoso' {
  const val = String(comp || '').trim();
  if (val === 'Copa' || val === 'Amistoso') return val;
  return 'Liga';
}

function normalizeEstado(estado: unknown): 'Programado' | 'Finalizado' {
  return String(estado || '').trim() === 'Finalizado' ? 'Finalizado' : 'Programado';
}

export function isFirebaseAuthReady(): boolean {
  return Boolean(auth.currentUser && auth.currentUser.emailVerified);
}

export function isBootstrappedAdminEmail(email?: string | null): boolean {
  return (email || '').trim().toLowerCase() === 'angel.saguar@telefonica.net';
}

/**
 * Creates a non-destructive local safety snapshot of all match and tactical plan keys
 * before any cross-device synchronization or merge runs, and verifies its recoverability.
 */
export function ensurePreSyncMatchSafetyBackup(): {
  ok: boolean;
  backedUpKeysCount: number;
  createdAt: string;
} {
  if (typeof localStorage === 'undefined') {
    return { ok: true, backedUpKeysCount: 0, createdAt: new Date().toISOString() };
  }

  try {
    const existingRaw = localStorage.getItem(PRE_SYNC_MATCH_BACKUP_KEY);
    if (existingRaw) {
      const parsed = JSON.parse(existingRaw);
      if (parsed && parsed.version === '1.0' && typeof parsed.entries === 'object') {
        return {
          ok: true,
          backedUpKeysCount: Object.keys(parsed.entries).length,
          createdAt: parsed.createdAt || new Date().toISOString(),
        };
      }
    }

    const entries: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith('team_matches_') ||
          k.startsWith('team_gameplans_') ||
          k === 'ud_lapoveda_table_team_matches' ||
          k === 'ud_lapoveda_table_match_plans')
      ) {
        const val = localStorage.getItem(k);
        if (val !== null) {
          entries[k] = val;
        }
      }
    }

    const snapshot = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      entries,
    };

    localStorage.setItem(PRE_SYNC_MATCH_BACKUP_KEY, JSON.stringify(snapshot));
    return {
      ok: true,
      backedUpKeysCount: Object.keys(entries).length,
      createdAt: snapshot.createdAt,
    };
  } catch (err) {
    console.warn('Could not persist pre-sync match safety snapshot:', err);
    return { ok: false, backedUpKeysCount: 0, createdAt: new Date().toISOString() };
  }
}

// ---------------------------------------------------------------------------
// Soft-Delete Tombstones ("Marcas de Baja" — Zero Physical Deletion)
// ---------------------------------------------------------------------------

export function getDeletedMatchIdsForTeam(teamName: string): Set<string> {
  const result = new Set<string>();
  if (typeof localStorage === 'undefined') return result;
  try {
    const raw = localStorage.getItem(`team_matches_deleted_${teamName}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const id of arr) {
          if (id) {
            result.add(String(id));
            result.add(sanitizeFirestoreId(String(id)));
          }
        }
      }
    }
  } catch {}
  return result;
}

export function addDeletedMatchTombstone(teamName: string, matchId: string): string[] {
  if (!teamName || !matchId || typeof localStorage === 'undefined') return [];
  const key = `team_matches_deleted_${teamName}`;
  const set = getDeletedMatchIdsForTeam(teamName);
  set.add(String(matchId));
  set.add(sanitizeFirestoreId(matchId));
  const list = Array.from(set);
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
  return list;
}

export function removeDeletedMatchTombstone(teamName: string, matchId: string): string[] {
  if (!teamName || !matchId || typeof localStorage === 'undefined') return [];
  const key = `team_matches_deleted_${teamName}`;
  const set = getDeletedMatchIdsForTeam(teamName);
  set.delete(String(matchId));
  set.delete(sanitizeFirestoreId(matchId));
  const list = Array.from(set);
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
  return list;
}

export function getDeletedPlanIdsForTeam(teamName: string): Set<string> {
  const result = new Set<string>();
  if (typeof localStorage === 'undefined') return result;
  try {
    const raw = localStorage.getItem(`team_gameplans_deleted_${teamName}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (const id of arr) {
          if (id) {
            result.add(String(id));
            result.add(sanitizeFirestoreId(String(id)));
          }
        }
      }
    }
  } catch {}
  return result;
}

export function addDeletedPlanTombstone(teamName: string, planId: string): string[] {
  if (!teamName || !planId || typeof localStorage === 'undefined') return [];
  const key = `team_gameplans_deleted_${teamName}`;
  const set = getDeletedPlanIdsForTeam(teamName);
  set.add(String(planId));
  set.add(sanitizeFirestoreId(planId));
  const list = Array.from(set);
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
  return list;
}

export function isMatchMarkedDeleted(match: any, deletedIds?: Set<string>): boolean {
  if (!match) return true;
  if (match.isDeleted === true || match.estadisticas?.isDeleted === true) {
    return true;
  }
  if (deletedIds && match.id) {
    if (
      deletedIds.has(String(match.id)) ||
      deletedIds.has(sanitizeFirestoreId(String(match.id)))
    ) {
      return true;
    }
  }
  return false;
}

export function isDefaultSampleMatch(match: any): boolean {
  if (!match || !match.id) return false;
  const id = String(match.id);
  const isSampleId =
    id === 'm1' ||
    id === 'm2' ||
    id.startsWith('m-coslada-') ||
    id.startsWith('m1-') ||
    id.startsWith('m2-');
  if (!isSampleId) return false;

  const hasPlayerStats =
    Array.isArray(match.estadisticas?.jugadoras_stats) &&
    match.estadisticas.jugadoras_stats.length > 0;
  const hasFeedback = Boolean(
    match.feedback_post_partido || match.estadisticas?.feedback_post_partido
  );
  const hasConvocatoria = Array.isArray(match.convocatoria) && match.convocatoria.length > 0;

  return !hasPlayerStats && !hasFeedback && !hasConvocatoria;
}

function stripJugadorasPhotos(jugadorasStats: any[]): any[] {
  return jugadorasStats.map((st) => {
    if (!st || typeof st !== 'object') return st;
    const { foto_url, ...rest } = st;
    if (typeof foto_url === 'string' && foto_url && !foto_url.startsWith('data:')) {
      return { ...rest, foto_url };
    }
    return rest;
  });
}

function capObjectKeys(obj: Record<string, any>, maxKeys: number): Record<string, any> {
  const entries = Object.entries(obj);
  if (entries.length <= maxKeys) return obj;
  return Object.fromEntries(entries.slice(0, maxKeys));
}

function buildTeamMatchFields(match: any, teamName: string, docId: string) {
  const rawStats = match.estadisticas ? stripUndefinedDeep({ ...match.estadisticas }) : {};
  if (Array.isArray(rawStats.jugadoras_stats)) {
    rawStats.jugadoras_stats = stripJugadorasPhotos(rawStats.jugadoras_stats);
  }
  const convocatoriaArr: string[] = Array.isArray(match.convocatoria)
    ? match.convocatoria.map((id: any) => String(id)).filter(Boolean).slice(0, 40)
    : Array.isArray(rawStats.convocatoria)
    ? rawStats.convocatoria.map((id: any) => String(id)).filter(Boolean).slice(0, 40)
    : [];

  const horaCitacion = clampString(match.hora_citacion || rawStats.hora_citacion || '', 120);
  const lugar = clampString(match.lugar || rawStats.lugar || '', 200);
  const equipacion = clampString(match.equipacion || rawStats.equipacion || '', 300);
  const observaciones = clampString(match.observaciones || rawStats.observaciones || '', 3000);
  const mensajeMotivacional = clampString(
    match.mensaje_motivacional || rawStats.mensaje_motivacional || '',
    500
  );
  const rawFeedback = match.feedback_post_partido
    ? stripUndefinedDeep(match.feedback_post_partido)
    : rawStats.feedback_post_partido
    ? stripUndefinedDeep(rawStats.feedback_post_partido)
    : null;
  const feedback =
    rawFeedback && typeof rawFeedback === 'object' ? capObjectKeys(rawFeedback, 20) : null;

  // Ensure soft-delete flag is cleared when a match is actively saved/updated
  delete rawStats.isDeleted;
  delete rawStats.deletedAtMs;

  const fullStats = capObjectKeys(
    stripUndefinedDeep({
      ...rawStats,
      convocatoria: convocatoriaArr,
      hora_citacion: horaCitacion,
      lugar,
      equipacion,
      observaciones,
      mensaje_motivacional: mensajeMotivacional,
      feedback_post_partido: feedback,
    }),
    20
  );

  return {
    id: docId,
    team: clampString(teamName || match.team || 'SENIOR FEMENINO', 80) || 'SENIOR FEMENINO',
    rival: clampString(match.rival || 'Rival', 120) || 'Rival',
    fecha: clampString(match.fecha || new Date().toISOString().split('T')[0], 20),
    hora: clampString(match.hora || '', 20),
    tipo: normalizeMatchType(match.tipo),
    competicion: normalizeCompetition(match.competicion),
    estado: normalizeEstado(match.estado),
    goles_favor: clampInt(match.goles_favor),
    goles_contra: clampInt(match.goles_contra),
    acta: match.acta !== undefined && match.acta !== null ? clampString(match.acta, 5000) : null,
    convocatoria: convocatoriaArr,
    hora_citacion: horaCitacion,
    lugar,
    equipacion,
    observaciones,
    mensaje_motivacional: mensajeMotivacional,
    feedback_post_partido: feedback,
    estadisticas: fullStats,
  };
}

function mapFirestoreDocToMatch(docSnap: { id: string; data: () => Record<string, any> }) {
  const data = docSnap.data();
  const stats = data.estadisticas || {};
  return {
    id: data.id || docSnap.id,
    team: data.team || undefined,
    rival: data.rival,
    fecha: data.fecha,
    hora: data.hora || '',
    tipo: data.tipo || 'Local',
    competicion: data.competicion || 'Liga',
    estado: data.estado || 'Programado',
    goles_favor:
      data.goles_favor !== null && data.goles_favor !== undefined ? data.goles_favor : undefined,
    goles_contra:
      data.goles_contra !== null && data.goles_contra !== undefined ? data.goles_contra : undefined,
    acta: data.acta ?? undefined,
    convocatoria: data.convocatoria || stats.convocatoria || [],
    hora_citacion: data.hora_citacion || stats.hora_citacion || '',
    lugar: data.lugar || stats.lugar || '',
    equipacion: data.equipacion || stats.equipacion || '',
    observaciones: data.observaciones || stats.observaciones || '',
    mensaje_motivacional: data.mensaje_motivacional || stats.mensaje_motivacional || '',
    feedback_post_partido: data.feedback_post_partido || stats.feedback_post_partido || undefined,
    estadisticas: stats,
    isDeleted: Boolean(stats.isDeleted),
    _updatedAtMs: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : 0,
  };
}

/**
 * Fetches all matches for a given team from Firestore (/team_matches).
 * Queries by `team` WITHOUT restricting by `ownerId` so both the Administrator
 * (angel.saguar@telefonica.net) and Alejandro (asaguar04@gmail.com) see the exact same matches.
 */
export async function fetchTeamMatchesFromFirestore(teamName: string): Promise<any[] | null> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return null;

  const normalizedTeam = clampString(teamName, 80);
  const path = 'team_matches';
  try {
    const colRef = collection(db, path);
    const q = query(colRef, where('team', '==', normalizedTeam));
    const snapshot = await getDocs(q);
    const deletedIds = getDeletedMatchIdsForTeam(normalizedTeam);

    const results: any[] = [];
    for (const docSnap of snapshot.docs) {
      const mapped = mapFirestoreDocToMatch(docSnap);
      if (mapped.isDeleted) {
        addDeletedMatchTombstone(normalizedTeam, mapped.id);
        continue;
      }
      if (isMatchMarkedDeleted(mapped, deletedIds)) {
        continue;
      }
      results.push(mapped);
    }
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Subscribes in real time (onSnapshot) to all matches of a team in Firestore (/team_matches)
 * so changes made on Mac or external computers reflect immediately on the other device.
 */
export function subscribeToTeamMatchesFromFirestore(
  teamName: string,
  onUpdate: (cloudMatches: any[]) => void
): () => void {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return () => {};
  }

  const normalizedTeam = clampString(teamName, 80);
  const colRef = collection(db, 'team_matches');
  const q = query(colRef, where('team', '==', normalizedTeam));

  return onSnapshot(
    q,
    (snapshot) => {
      const deletedIds = getDeletedMatchIdsForTeam(normalizedTeam);
      const results: any[] = [];
      snapshot.docs.forEach((docSnap) => {
        const mapped = mapFirestoreDocToMatch(docSnap);
        if (mapped.isDeleted) {
          addDeletedMatchTombstone(normalizedTeam, mapped.id);
          return;
        }
        if (!isMatchMarkedDeleted(mapped, deletedIds)) {
          results.push(mapped);
        }
      });
      onUpdate(results);
    },
    (err) => {
      console.warn(`Live subscription to /team_matches (${normalizedTeam}) notice:`, err.message);
    }
  );
}

export async function upsertTeamMatchesToFirestore(
  matchesList: any[],
  teamName: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const normalizedTeam = clampString(teamName || 'SENIOR FEMENINO', 80) || 'SENIOR FEMENINO';
  const teamPrefix = sanitizeFirestoreId(normalizedTeam.toLowerCase()).slice(0, 32);
  const deletedIds = getDeletedMatchIdsForTeam(normalizedTeam);

  for (const match of matchesList) {
    if (!match || isMatchMarkedDeleted(match, deletedIds)) continue;

    let docId = sanitizeFirestoreId(match.id);
    const docPathInitial = `team_matches/${docId}`;
    let docRef = doc(db, 'team_matches', docId);

    try {
      let existingSnap = await getDoc(docRef);
      if (
        existingSnap.exists() &&
        existingSnap.data()?.team &&
        existingSnap.data()?.team !== normalizedTeam
      ) {
        docId = sanitizeFirestoreId(`${teamPrefix}-${docId}`);
        docRef = doc(db, 'team_matches', docId);
        existingSnap = await getDoc(docRef);
      }

      match.id = docId;
      const fields = buildTeamMatchFields(match, normalizedTeam, docId);

      if (!existingSnap.exists()) {
        await setDoc(docRef, {
          ...fields,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const existingData = existingSnap.data() || {};
        // Merge with existing cloud match first to guarantee we NEVER overwrite richer cloud data with a partial stub
        const existingMapped = mapFirestoreDocToMatch({
          id: existingSnap.id,
          data: () => existingData,
        });
        const safelyMerged = mergeTwoMatches(existingMapped, {
          ...match,
          _updatedAtMs: match._updatedAtMs || Date.now(),
        });
        const mergedFields = buildTeamMatchFields(safelyMerged, normalizedTeam, docId);

        const { id: _id, team: _team, ...updatableFields } = mergedFields;
        await updateDoc(docRef, {
          ...updatableFields,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPathInitial);
    }
  }
}

/**
 * Marks a match as deleted using a soft-delete tombstone ("marca de baja") without
 * physically deleting the historical document from Firestore (/team_matches).
 */
export async function deleteTeamMatchFromFirestore(
  matchId: string,
  teamName?: string
): Promise<void> {
  const user = auth.currentUser;
  const docId = sanitizeFirestoreId(matchId);
  if (teamName) {
    addDeletedMatchTombstone(teamName, docId);
    addDeletedMatchTombstone(teamName, matchId);
  }

  if (!user || !user.emailVerified) return;

  const docPath = `team_matches/${docId}`;
  const docRef = doc(db, 'team_matches', docId);
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() || {};
      const resolvedTeam = teamName || data.team || 'SENIOR FEMENINO';
      addDeletedMatchTombstone(resolvedTeam, docId);

      const currentStats =
        data.estadisticas && typeof data.estadisticas === 'object' ? { ...data.estadisticas } : {};
      const updatedStats = capObjectKeys(
        stripUndefinedDeep({
          ...currentStats,
          isDeleted: true,
          deletedAtMs: Date.now(),
        }),
        20
      );

      await updateDoc(docRef, {
        estadisticas: updatedStats,
        updatedAt: serverTimestamp(),
      });

      // Also sync the deleted match tombstone array to /club_sync so all devices receive the marca de baja
      const slug = resolvedTeam
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .slice(0, 80);
      const deletedList = Array.from(getDeletedMatchIdsForTeam(resolvedTeam));
      const syncDocId = `deleted_matches_${slug}`;
      await setDoc(doc(db, 'club_sync', syncDocId), {
        id: syncDocId,
        module: 'gestion-equipo',
        category: 'team_matches_deleted',
        team: clampString(resolvedTeam, 80),
        payload: {
          items: deletedList,
          syncedAtMs: Date.now(),
        },
        updatedBy: (user.email || '').toLowerCase().slice(0, 254),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

function mapFirestoreDocToPlan(docSnap: { id: string; data: () => Record<string, any> }) {
  const data = docSnap.data();
  return {
    id: data.id || docSnap.id,
    matchId: '',
    rivalName: data.rivalName,
    fechaPartido: data.fechaPartido,
    sistema: data.sistema,
    sistemaRival: data.sistemaRival,
    convocatoria: data.convocatoria || [],
    objetivos_tacticos: data.objetivos_tacticos || '',
    alineacion_propuesta: data.alineacion_propuesta || '',
    puntos_fuertes_rival: data.puntos_fuertes_rival || '',
    balon_parado: data.balon_parado || '',
    fecha_creacion: data.createdAt?.toDate
      ? data.createdAt.toDate().toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    _updatedAtMs: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : 0,
  };
}

/**
 * Fetches all tactical match plans for a team from Firestore (/match_plans)
 * WITHOUT filtering by `ownerId`, so both Admin and Alejandro view the same plans.
 */
export async function fetchMatchPlansFromFirestore(teamName: string): Promise<any[] | null> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return null;

  const normalizedTeam = clampString(teamName, 80);
  const path = 'match_plans';
  try {
    const colRef = collection(db, path);
    const q = query(colRef, where('team', '==', normalizedTeam));
    const snapshot = await getDocs(q);
    const deletedPlanIds = getDeletedPlanIdsForTeam(normalizedTeam);

    return snapshot.docs
      .map((docSnap) => mapFirestoreDocToPlan(docSnap))
      .filter(
        (plan) =>
          !deletedPlanIds.has(String(plan.id)) &&
          !deletedPlanIds.has(sanitizeFirestoreId(String(plan.id)))
      );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

/**
 * Subscribes in real time (onSnapshot) to all tactical match plans for a team in Firestore (/match_plans).
 */
export function subscribeToMatchPlansFromFirestore(
  teamName: string,
  onUpdate: (cloudPlans: any[]) => void
): () => void {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return () => {};
  }

  const normalizedTeam = clampString(teamName, 80);
  const colRef = collection(db, 'match_plans');
  const q = query(colRef, where('team', '==', normalizedTeam));

  return onSnapshot(
    q,
    (snapshot) => {
      const deletedPlanIds = getDeletedPlanIdsForTeam(normalizedTeam);
      const plans = snapshot.docs
        .map((docSnap) => mapFirestoreDocToPlan(docSnap))
        .filter(
          (plan) =>
            !deletedPlanIds.has(String(plan.id)) &&
            !deletedPlanIds.has(sanitizeFirestoreId(String(plan.id)))
        );
      onUpdate(plans);
    },
    (err) => {
      console.warn(`Live subscription to /match_plans (${normalizedTeam}) notice:`, err.message);
    }
  );
}

export async function upsertMatchPlansToFirestore(
  plansList: any[],
  teamName: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const normalizedTeam = clampString(teamName, 80) || 'SENIOR FEMENINO';
  const deletedPlanIds = getDeletedPlanIdsForTeam(normalizedTeam);

  for (const p of plansList) {
    if (!p) continue;
    const docId = sanitizeFirestoreId(p.id);
    if (deletedPlanIds.has(docId) || deletedPlanIds.has(String(p.id))) continue;

    p.id = docId;
    const docPath = `match_plans/${docId}`;
    const docRef = doc(db, 'match_plans', docId);
    const baseFields = {
      id: docId,
      team: normalizedTeam,
      rivalName: clampString(p.rivalName || p.rival_name || 'Rival', 120) || 'Rival',
      fechaPartido: clampString(
        p.fechaPartido || p.fecha_partido || new Date().toISOString().split('T')[0],
        20
      ),
      sistema: clampString(p.sistema || '1-4-3-3', 30) || '1-4-3-3',
      sistemaRival: clampString(p.sistemaRival || p.sistema_rival || '1-4-4-2', 30) || '1-4-4-2',
      convocatoria: Array.isArray(p.convocatoria)
        ? p.convocatoria.map((id: any) => String(id)).filter(Boolean).slice(0, 40)
        : [],
      objetivos_tacticos: clampString(p.objetivos_tacticos || '', 5000),
      alineacion_propuesta: clampString(p.alineacion_propuesta || '', 3000),
      puntos_fuertes_rival: clampString(p.puntos_fuertes_rival || '', 3000),
      balon_parado: clampString(p.balon_parado || '', 3000),
    };

    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, {
          ...baseFields,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const existingPlan = mapFirestoreDocToPlan({
          id: snap.id,
          data: () => snap.data() || {},
        });
        const mergedPlan = mergeTwoMatchPlans(existingPlan, {
          ...baseFields,
          _updatedAtMs: p._updatedAtMs || Date.now(),
        });
        const { id: _id, team: _team, _updatedAtMs: _ts, matchId: _mId, fecha_creacion: _fc, ...updatable } =
          mergedPlan;
        await updateDoc(docRef, {
          rivalName: clampString(updatable.rivalName || 'Rival', 120) || 'Rival',
          fechaPartido: clampString(updatable.fechaPartido || baseFields.fechaPartido, 20),
          sistema: clampString(updatable.sistema || '1-4-3-3', 30) || '1-4-3-3',
          sistemaRival: clampString(updatable.sistemaRival || '1-4-4-2', 30) || '1-4-4-2',
          convocatoria: Array.isArray(updatable.convocatoria)
            ? updatable.convocatoria.map((id: any) => String(id)).filter(Boolean).slice(0, 40)
            : [],
          objetivos_tacticos: clampString(updatable.objetivos_tacticos || '', 5000),
          alineacion_propuesta: clampString(updatable.alineacion_propuesta || '', 3000),
          puntos_fuertes_rival: clampString(updatable.puntos_fuertes_rival || '', 3000),
          balon_parado: clampString(updatable.balon_parado || '', 3000),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }
}

/**
 * Synchronizes match plan deletion via soft-delete tombstone ("marca de baja")
 * in localStorage and /club_sync without physically deleting the historical document from /match_plans.
 */
export async function deleteMatchPlanFromFirestore(
  planId: string,
  teamName?: string
): Promise<void> {
  const user = auth.currentUser;
  const docId = sanitizeFirestoreId(planId);
  const resolvedTeam = clampString(teamName || 'SENIOR FEMENINO', 80) || 'SENIOR FEMENINO';
  addDeletedPlanTombstone(resolvedTeam, docId);
  addDeletedPlanTombstone(resolvedTeam, planId);

  if (!user || !user.emailVerified) return;

  const slug = resolvedTeam
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 80);
  const syncDocId = `deleted_plans_${slug}`;
  const docPath = `club_sync/${syncDocId}`;
  try {
    const deletedList = Array.from(getDeletedPlanIdsForTeam(resolvedTeam));
    await setDoc(doc(db, 'club_sync', syncDocId), {
      id: syncDocId,
      module: 'gestion-equipo',
      category: 'team_plans_deleted',
      team: resolvedTeam,
      payload: {
        items: deletedList,
        syncedAtMs: Date.now(),
      },
      updatedBy: (user.email || '').toLowerCase().slice(0, 254),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

// ---------------------------------------------------------------------------
// Conflict Resolution & Content Richness Scoring (Matches & Tactical Plans)
// ---------------------------------------------------------------------------

export function computePlayerStatsRichness(jugadorasStats?: any[]): number {
  if (!Array.isArray(jugadorasStats) || jugadorasStats.length === 0) return 0;
  let score = jugadorasStats.length * 2;
  for (const st of jugadorasStats) {
    if (!st || typeof st !== 'object') continue;
    if (st.titular || st.suplente) score += 5;
    if ((Number(st.minutos) || 0) > 0) score += 8;
    if ((Number(st.goles_metidos) || 0) > 0) score += 15 * Number(st.goles_metidos);
    if ((Number(st.asistencias) || 0) > 0) score += 10 * Number(st.asistencias);
    if ((Number(st.goles_encajados) || 0) > 0) score += 10 * Number(st.goles_encajados);
    if ((Number(st.recuperaciones_balon) || 0) > 0) score += 4 * Number(st.recuperaciones_balon);
    if ((Number(st.perdidas_balon) || 0) > 0) score += 4 * Number(st.perdidas_balon);
    if ((Number(st.tarjetas_amarillas) || 0) > 0) score += 8;
    if ((Number(st.tarjetas_rojas) || 0) > 0) score += 12;
  }
  return score;
}

export function computeMatchRichnessScore(m: any): number {
  if (!m || typeof m !== 'object') return 0;
  let score = 0;

  if (m.estado === 'Finalizado') score += 50;
  if (m.goles_favor !== undefined && m.goles_favor !== null) score += 25;
  if (m.goles_contra !== undefined && m.goles_contra !== null) score += 25;
  if ((Number(m.goles_favor) || 0) > 0 || (Number(m.goles_contra) || 0) > 0) score += 30;

  const stats = m.estadisticas || {};
  if (stats.has_live_stats) score += 80;

  const playerStatsScore = computePlayerStatsRichness(stats.jugadoras_stats);
  score += playerStatsScore;

  const totals = stats.totales_equipo;
  if (totals && typeof totals === 'object') {
    const sumTotals: number = Object.values(totals).reduce<number>(
      (acc, v) => acc + (Number(v) || 0),
      0
    );
    if (sumTotals > 0) score += 40 + Math.min(100, sumTotals * 2);
  }

  if (Array.isArray(stats.cambios) && stats.cambios.length > 0) {
    score += 20 + stats.cambios.length * 5;
  }

  const conv = Array.isArray(m.convocatoria) && m.convocatoria.length > 0
    ? m.convocatoria
    : Array.isArray(stats.convocatoria)
    ? stats.convocatoria
    : [];
  if (conv.length > 0) {
    score += 20 + conv.length;
  }

  const fb = m.feedback_post_partido || stats.feedback_post_partido;
  if (fb && typeof fb === 'object' && Object.keys(fb).length > 0) {
    score += 80 + (fb.resumen_mister ? Math.min(50, String(fb.resumen_mister).length) : 0);
  }

  if (m.acta && String(m.acta).trim().length > 0) {
    score += 40 + Math.min(40, String(m.acta).trim().length);
  }

  if (m.observaciones || stats.observaciones) score += 10;
  if (m.hora_citacion || stats.hora_citacion) score += 5;
  if (m.lugar || stats.lugar) score += 5;
  if (m.equipacion || stats.equipacion) score += 5;
  if (m.mensaje_motivacional || stats.mensaje_motivacional) score += 10;

  return score;
}

export function mergeTwoMatches(a: any, b: any): any {
  if (!a) return b;
  if (!b) return a;

  const tsA = Number(a._updatedAtMs || 0);
  const tsB = Number(b._updatedAtMs || 0);
  const scoreA = computeMatchRichnessScore(a);
  const scoreB = computeMatchRichnessScore(b);

  // Determine preferred (base winner) vs fallback without ever allowing an empty stub to clobber rich data
  let preferred = b;
  let fallback = a;

  if (tsA > 0 && tsB > 0 && tsA !== tsB) {
    const newer = tsA > tsB ? a : b;
    const older = tsA > tsB ? b : a;
    const scoreNewer = tsA > tsB ? scoreA : scoreB;
    const scoreOlder = tsA > tsB ? scoreB : scoreA;

    // If the older record has vastly richer stats/feedback (e.g. newer is just a bare calendar stub), keep older's richness
    if (scoreOlder > scoreNewer + 60 && scoreNewer < 50) {
      preferred = older;
      fallback = newer;
    } else {
      preferred = newer;
      fallback = older;
    }
  } else if (scoreA > scoreB) {
    preferred = a;
    fallback = b;
  } else if (scoreB > scoreA) {
    preferred = b;
    fallback = a;
  } else if (tsA > tsB) {
    preferred = a;
    fallback = b;
  }

  const prefStats = preferred.estadisticas || {};
  const fallStats = fallback.estadisticas || {};

  // 1. Player stats: never overwrite populated player stats with empty ones
  const prefPlayerScore = computePlayerStatsRichness(prefStats.jugadoras_stats);
  const fallPlayerScore = computePlayerStatsRichness(fallStats.jugadoras_stats);
  const mergedJugadorasStats =
    prefPlayerScore > 0 && (prefPlayerScore >= fallPlayerScore || Number(preferred._updatedAtMs || 0) > Number(fallback._updatedAtMs || 0))
      ? prefStats.jugadoras_stats
      : fallPlayerScore > 0
      ? fallStats.jugadoras_stats
      : prefStats.jugadoras_stats || fallStats.jugadoras_stats;

  // 2. Feedback post-partido: preserve richest/latest non-null feedback
  const mergedFeedback =
    preferred.feedback_post_partido ||
    prefStats.feedback_post_partido ||
    fallback.feedback_post_partido ||
    fallStats.feedback_post_partido ||
    undefined;

  // 3. Convocatoria: preserve non-empty list
  const prefConv = Array.isArray(preferred.convocatoria) && preferred.convocatoria.length > 0
    ? preferred.convocatoria
    : Array.isArray(prefStats.convocatoria) && prefStats.convocatoria.length > 0
    ? prefStats.convocatoria
    : [];
  const fallConv = Array.isArray(fallback.convocatoria) && fallback.convocatoria.length > 0
    ? fallback.convocatoria
    : Array.isArray(fallStats.convocatoria) && fallStats.convocatoria.length > 0
    ? fallStats.convocatoria
    : [];
  const mergedConvocatoria = prefConv.length > 0 ? prefConv : fallConv;

  // 4. Substitutions (cambios)
  const prefCambios = Array.isArray(prefStats.cambios) ? prefStats.cambios : [];
  const fallCambios = Array.isArray(fallStats.cambios) ? fallStats.cambios : [];
  const mergedCambios = prefCambios.length > 0 ? prefCambios : fallCambios;

  // 5. Scores & Estado
  const mergedEstado =
    preferred.estado === 'Finalizado' || fallback.estado === 'Finalizado'
      ? 'Finalizado'
      : preferred.estado || fallback.estado || 'Programado';

  const mergedGolesFavor =
    preferred.goles_favor !== undefined && preferred.goles_favor !== null
      ? preferred.goles_favor
      : fallback.goles_favor;
  const mergedGolesContra =
    preferred.goles_contra !== undefined && preferred.goles_contra !== null
      ? preferred.goles_contra
      : fallback.goles_contra;

  // 6. Team totals
  const mergedTotalesEquipo =
    prefStats.totales_equipo || fallStats.totales_equipo
      ? {
          ...(fallStats.totales_equipo || {}),
          ...(prefStats.totales_equipo || {}),
          goles_favor:
            mergedGolesFavor ??
            prefStats.totales_equipo?.goles_favor ??
            fallStats.totales_equipo?.goles_favor ??
            0,
          goles_contra:
            mergedGolesContra ??
            prefStats.totales_equipo?.goles_contra ??
            fallStats.totales_equipo?.goles_contra ??
            0,
        }
      : undefined;

  const mergedHoraCitacion =
    preferred.hora_citacion ||
    prefStats.hora_citacion ||
    fallback.hora_citacion ||
    fallStats.hora_citacion ||
    '';
  const mergedLugar =
    preferred.lugar || prefStats.lugar || fallback.lugar || fallStats.lugar || '';
  const mergedEquipacion =
    preferred.equipacion ||
    prefStats.equipacion ||
    fallback.equipacion ||
    fallStats.equipacion ||
    '';
  const mergedObservaciones =
    preferred.observaciones ||
    prefStats.observaciones ||
    fallback.observaciones ||
    fallStats.observaciones ||
    '';
  const mergedMotivacional =
    preferred.mensaje_motivacional ||
    prefStats.mensaje_motivacional ||
    fallback.mensaje_motivacional ||
    fallStats.mensaje_motivacional ||
    '';
  const mergedActa =
    preferred.acta && String(preferred.acta).trim().length > 0
      ? preferred.acta
      : fallback.acta || preferred.acta;

  return {
    ...fallback,
    ...preferred,
    id: sanitizeFirestoreId(preferred.id || fallback.id),
    estado: mergedEstado,
    goles_favor: mergedGolesFavor,
    goles_contra: mergedGolesContra,
    acta: mergedActa,
    convocatoria: mergedConvocatoria,
    hora_citacion: mergedHoraCitacion,
    lugar: mergedLugar,
    equipacion: mergedEquipacion,
    observaciones: mergedObservaciones,
    mensaje_motivacional: mergedMotivacional,
    feedback_post_partido: mergedFeedback,
    _updatedAtMs: Math.max(tsA, tsB),
    estadisticas: stripUndefinedDeep({
      ...fallStats,
      ...prefStats,
      has_live_stats: Boolean(
        prefStats.has_live_stats ||
          fallStats.has_live_stats ||
          computePlayerStatsRichness(mergedJugadorasStats) > 0
      ),
      jugadoras_stats: mergedJugadorasStats,
      cambios: mergedCambios.length > 0 ? mergedCambios : undefined,
      totales_equipo: mergedTotalesEquipo,
      convocatoria: mergedConvocatoria,
      hora_citacion: mergedHoraCitacion,
      lugar: mergedLugar,
      equipacion: mergedEquipacion,
      observaciones: mergedObservaciones,
      mensaje_motivacional: mergedMotivacional,
      feedback_post_partido: mergedFeedback,
    }),
  };
}

function normalizeRivalNaturalKey(rival: unknown): string {
  return String(rival || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/\b(CD|AD|FC|UD|CF|SAD)\b/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

function getMatchNaturalKey(m: any): string | null {
  if (!m || !m.fecha || !m.rival) return null;
  const rKey = normalizeRivalNaturalKey(m.rival);
  if (!rKey) return null;
  const tipo = normalizeMatchType(m.tipo);
  return `${String(m.fecha).trim()}__${rKey}__${tipo}`;
}

export function mergeMatchRecords(
  primary: any[],
  secondary: any[],
  deletedIds?: Set<string>
): any[] {
  const byId = new Map<string, any>();

  const processItem = (item: any) => {
    if (!item || !item.id) return;
    if (isMatchMarkedDeleted(item, deletedIds)) return;
    const normId = sanitizeFirestoreId(String(item.id));
    const normalizedItem = { ...item, id: normId };
    const prev = byId.get(normId);
    if (!prev) {
      byId.set(normId, normalizedItem);
    } else {
      byId.set(normId, mergeTwoMatches(prev, normalizedItem));
    }
  };

  for (const item of secondary || []) {
    processItem(item);
  }
  for (const item of primary || []) {
    processItem(item);
  }

  let list = Array.from(byId.values());

  // If there are real club matches, filter out unedited default sample placeholders (COSLADA, Arganda, Rivas)
  // that may have been seeded on an empty browser before Firestore Auth completed
  const realMatches = list.filter((m) => !isDefaultSampleMatch(m));
  if (realMatches.length > 0 && realMatches.length < list.length) {
    const primaryIds = new Set(
      (primary || []).map((p: any) => sanitizeFirestoreId(String(p?.id || '')))
    );
    list = list.filter((m) => !isDefaultSampleMatch(m) || primaryIds.has(m.id));
  }

  // Deduplicate by natural key (same fecha + normalized rival + tipo) when one record is a duplicate stub
  const byNaturalKey = new Map<string, any>();
  const finalResult: any[] = [];

  for (const item of list) {
    const natKey = getMatchNaturalKey(item);
    if (!natKey) {
      finalResult.push(item);
      continue;
    }
    const existing = byNaturalKey.get(natKey);
    if (!existing) {
      byNaturalKey.set(natKey, item);
    } else {
      const merged = mergeTwoMatches(existing, item);
      byNaturalKey.set(natKey, merged);
    }
  }

  const combined = [...finalResult, ...Array.from(byNaturalKey.values())];
  return combined.sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
}

/**
 * Identifies all matches in `mergedMatches` that are either missing in `cloudMatches`
 * or have newer `_updatedAtMs` or higher content richness (`computeMatchRichnessScore`)
 * than the cloud version so they can be backfilled to Firestore.
 */
export function findMatchesNeedingCloudSync(
  mergedMatches: any[],
  cloudMatches: any[]
): any[] {
  const cloudById = new Map<string, any>();
  for (const cm of cloudMatches || []) {
    if (cm && cm.id) {
      cloudById.set(sanitizeFirestoreId(String(cm.id)), cm);
    }
  }

  const toSync: any[] = [];
  for (const m of mergedMatches || []) {
    if (!m || !m.id || isMatchMarkedDeleted(m)) continue;
    const id = sanitizeFirestoreId(String(m.id));
    const cloud = cloudById.get(id);
    if (!cloud) {
      toSync.push(m);
      continue;
    }

    const localTs = Number(m._updatedAtMs || 0);
    const cloudTs = Number(cloud._updatedAtMs || 0);
    const localRichness = computeMatchRichnessScore(m);
    const cloudRichness = computeMatchRichnessScore(cloud);

    const diffScore =
      m.estado !== cloud.estado ||
      m.goles_favor !== cloud.goles_favor ||
      m.goles_contra !== cloud.goles_contra ||
      m.rival !== cloud.rival ||
      m.fecha !== cloud.fecha ||
      (m.convocatoria?.length || 0) !== (cloud.convocatoria?.length || 0);

    if (localTs > cloudTs || localRichness > cloudRichness || diffScore) {
      toSync.push(m);
    }
  }

  return toSync;
}

// ---------------------------------------------------------------------------
// Tactical Match Plans Conflict Resolution & Backfill Detection
// ---------------------------------------------------------------------------

export function computeMatchPlanRichnessScore(p: any): number {
  if (!p || typeof p !== 'object') return 0;
  let score = 0;
  if (p.rivalName || p.rival_name) score += 10;
  if (p.sistema) score += 10;
  if (p.sistemaRival || p.sistema_rival) score += 10;
  if (Array.isArray(p.convocatoria) && p.convocatoria.length > 0) {
    score += 20 + p.convocatoria.length;
  }
  if (p.objetivos_tacticos) score += Math.min(80, String(p.objetivos_tacticos).trim().length);
  if (p.alineacion_propuesta) score += Math.min(60, String(p.alineacion_propuesta).trim().length);
  if (p.puntos_fuertes_rival) score += Math.min(60, String(p.puntos_fuertes_rival).trim().length);
  if (p.balon_parado) score += Math.min(60, String(p.balon_parado).trim().length);
  return score;
}

export function mergeTwoMatchPlans(a: any, b: any): any {
  if (!a) return b;
  if (!b) return a;

  const tsA = Number(a._updatedAtMs || 0);
  const tsB = Number(b._updatedAtMs || 0);
  const scoreA = computeMatchPlanRichnessScore(a);
  const scoreB = computeMatchPlanRichnessScore(b);

  let preferred = b;
  let fallback = a;

  if (tsA > 0 && tsB > 0 && tsA !== tsB) {
    preferred = tsA > tsB ? a : b;
    fallback = tsA > tsB ? b : a;
  } else if (scoreA > scoreB) {
    preferred = a;
    fallback = b;
  }

  return {
    ...fallback,
    ...preferred,
    id: sanitizeFirestoreId(preferred.id || fallback.id),
    rivalName: preferred.rivalName || preferred.rival_name || fallback.rivalName || fallback.rival_name || 'Rival',
    fechaPartido: preferred.fechaPartido || preferred.fecha_partido || fallback.fechaPartido || fallback.fecha_partido || '',
    sistema: preferred.sistema || fallback.sistema || '1-4-3-3',
    sistemaRival: preferred.sistemaRival || preferred.sistema_rival || fallback.sistemaRival || fallback.sistema_rival || '1-4-4-2',
    convocatoria:
      Array.isArray(preferred.convocatoria) && preferred.convocatoria.length > 0
        ? preferred.convocatoria
        : Array.isArray(fallback.convocatoria)
        ? fallback.convocatoria
        : [],
    objetivos_tacticos:
      preferred.objetivos_tacticos && String(preferred.objetivos_tacticos).trim().length > 0
        ? preferred.objetivos_tacticos
        : fallback.objetivos_tacticos || '',
    alineacion_propuesta:
      preferred.alineacion_propuesta && String(preferred.alineacion_propuesta).trim().length > 0
        ? preferred.alineacion_propuesta
        : fallback.alineacion_propuesta || '',
    puntos_fuertes_rival:
      preferred.puntos_fuertes_rival && String(preferred.puntos_fuertes_rival).trim().length > 0
        ? preferred.puntos_fuertes_rival
        : fallback.puntos_fuertes_rival || '',
    balon_parado:
      preferred.balon_parado && String(preferred.balon_parado).trim().length > 0
        ? preferred.balon_parado
        : fallback.balon_parado || '',
    _updatedAtMs: Math.max(tsA, tsB),
  };
}

export function mergeMatchPlanRecords(
  primary: any[],
  secondary: any[],
  deletedIds?: Set<string>
): any[] {
  const byId = new Map<string, any>();

  const processPlan = (item: any) => {
    if (!item || !item.id) return;
    const normId = sanitizeFirestoreId(String(item.id));
    if (deletedIds && (deletedIds.has(normId) || deletedIds.has(String(item.id)))) return;
    const normalized = { ...item, id: normId };
    const prev = byId.get(normId);
    if (!prev) {
      byId.set(normId, normalized);
    } else {
      byId.set(normId, mergeTwoMatchPlans(prev, normalized));
    }
  };

  for (const item of secondary || []) {
    processPlan(item);
  }
  for (const item of primary || []) {
    processPlan(item);
  }

  let list = Array.from(byId.values());
  // Filter out default sample 'gp1' (A.D. Arganda) if real plans exist
  const realPlans = list.filter((p) => p.id !== 'gp1');
  if (realPlans.length > 0 && realPlans.length < list.length) {
    const primaryIds = new Set(
      (primary || []).map((p: any) => sanitizeFirestoreId(String(p?.id || '')))
    );
    list = list.filter((p) => p.id !== 'gp1' || primaryIds.has('gp1'));
  }

  return list.sort((a, b) =>
    String(b.fechaPartido || '').localeCompare(String(a.fechaPartido || ''))
  );
}

export function findPlansNeedingCloudSync(mergedPlans: any[], cloudPlans: any[]): any[] {
  const cloudById = new Map<string, any>();
  for (const cp of cloudPlans || []) {
    if (cp && cp.id) {
      cloudById.set(sanitizeFirestoreId(String(cp.id)), cp);
    }
  }

  const toSync: any[] = [];
  for (const p of mergedPlans || []) {
    if (!p || !p.id) continue;
    const id = sanitizeFirestoreId(String(p.id));
    const cloud = cloudById.get(id);
    if (!cloud) {
      toSync.push(p);
      continue;
    }

    const localTs = Number(p._updatedAtMs || 0);
    const cloudTs = Number(cloud._updatedAtMs || 0);
    const localRichness = computeMatchPlanRichnessScore(p);
    const cloudRichness = computeMatchPlanRichnessScore(cloud);

    if (
      localTs > cloudTs ||
      localRichness > cloudRichness ||
      p.sistema !== cloud.sistema ||
      p.sistemaRival !== cloud.sistemaRival ||
      p.objetivos_tacticos !== cloud.objetivos_tacticos
    ) {
      toSync.push(p);
    }
  }

  return toSync;
}
