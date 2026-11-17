import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

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
  const feedback = rawFeedback && typeof rawFeedback === 'object' ? capObjectKeys(rawFeedback, 20) : null;

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

export async function fetchTeamMatchesFromFirestore(teamName: string): Promise<any[] | null> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return null;

  const path = 'team_matches';
  try {
    const colRef = collection(db, path);
    const q = isBootstrappedAdminEmail(user.email)
      ? query(colRef, where('team', '==', clampString(teamName, 80)))
      : query(
          colRef,
          where('team', '==', clampString(teamName, 80)),
          where('ownerId', '==', user.uid)
        );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const stats = data.estadisticas || {};
      return {
        id: data.id || docSnap.id,
        rival: data.rival,
        fecha: data.fecha,
        hora: data.hora || '',
        tipo: data.tipo || 'Local',
        competicion: data.competicion || 'Liga',
        estado: data.estado || 'Programado',
        goles_favor: data.goles_favor !== null && data.goles_favor !== undefined ? data.goles_favor : undefined,
        goles_contra: data.goles_contra !== null && data.goles_contra !== undefined ? data.goles_contra : undefined,
        acta: data.acta ?? undefined,
        convocatoria: data.convocatoria || stats.convocatoria || [],
        hora_citacion: data.hora_citacion || stats.hora_citacion || '',
        lugar: data.lugar || stats.lugar || '',
        equipacion: data.equipacion || stats.equipacion || '',
        observaciones: data.observaciones || stats.observaciones || '',
        mensaje_motivacional: data.mensaje_motivacional || stats.mensaje_motivacional || '',
        feedback_post_partido: data.feedback_post_partido || stats.feedback_post_partido || undefined,
        estadisticas: stats,
        _updatedAtMs: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : 0,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function upsertTeamMatchesToFirestore(matchesList: any[], teamName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const normalizedTeam = clampString(teamName || 'SENIOR FEMENINO', 80) || 'SENIOR FEMENINO';
  const teamPrefix = sanitizeFirestoreId(normalizedTeam.toLowerCase()).slice(0, 32);

  for (const match of matchesList) {
    let docId = sanitizeFirestoreId(match.id);
    const docPathInitial = `team_matches/${docId}`;
    let docRef = doc(db, 'team_matches', docId);

    try {
      let existingSnap = await getDoc(docRef);
      if (existingSnap.exists() && existingSnap.data()?.team && existingSnap.data()?.team !== normalizedTeam) {
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
        const {
          id: _id,
          team: _team,
          ...updatableFields
        } = fields;
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

export async function deleteTeamMatchFromFirestore(matchId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const docId = sanitizeFirestoreId(matchId);
  const docPath = `team_matches/${docId}`;
  try {
    await deleteDoc(doc(db, 'team_matches', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function fetchMatchPlansFromFirestore(teamName: string): Promise<any[] | null> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return null;

  const path = 'match_plans';
  try {
    const colRef = collection(db, path);
    const q = isBootstrappedAdminEmail(user.email)
      ? query(colRef, where('team', '==', clampString(teamName, 80)))
      : query(
          colRef,
          where('team', '==', clampString(teamName, 80)),
          where('ownerId', '==', user.uid)
        );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
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
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function upsertMatchPlansToFirestore(plansList: any[], teamName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  for (const p of plansList) {
    const docId = sanitizeFirestoreId(p.id);
    p.id = docId;
    const docPath = `match_plans/${docId}`;
    const docRef = doc(db, 'match_plans', docId);
    const baseFields = {
      id: docId,
      team: clampString(teamName, 80) || 'SENIOR FEMENINO',
      rivalName: clampString(p.rivalName || 'Rival', 120) || 'Rival',
      fechaPartido: clampString(p.fechaPartido || new Date().toISOString().split('T')[0], 20),
      sistema: clampString(p.sistema || '1-4-3-3', 30) || '1-4-3-3',
      sistemaRival: clampString(p.sistemaRival || '1-4-4-2', 30) || '1-4-4-2',
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
        const { id: _id, team: _team, ...updatable } = baseFields;
        await updateDoc(docRef, {
          ...updatable,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }
}

export async function deleteMatchPlanFromFirestore(planId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const docId = sanitizeFirestoreId(planId);
  const docPath = `match_plans/${docId}`;
  try {
    await deleteDoc(doc(db, 'match_plans', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

function mergeTwoMatches(older: any, newer: any): any {
  return {
    ...older,
    ...newer,
    feedback_post_partido:
      newer.feedback_post_partido ||
      newer.estadisticas?.feedback_post_partido ||
      older.feedback_post_partido ||
      older.estadisticas?.feedback_post_partido ||
      undefined,
    estadisticas: {
      ...(older.estadisticas || {}),
      ...(newer.estadisticas || {}),
      feedback_post_partido:
        newer.feedback_post_partido ||
        newer.estadisticas?.feedback_post_partido ||
        older.feedback_post_partido ||
        older.estadisticas?.feedback_post_partido ||
        undefined,
    },
  };
}

export function mergeMatchRecords(primary: any[], secondary: any[]): any[] {
  const byId = new Map<string, any>();
  for (const item of secondary) {
    if (item && item.id) {
      byId.set(String(item.id), item);
    }
  }
  for (const item of primary) {
    if (!item || !item.id) continue;
    const prev = byId.get(String(item.id));
    if (!prev) {
      byId.set(String(item.id), item);
    } else {
      const itemTs = Number(item._updatedAtMs || 0);
      const prevTs = Number(prev._updatedAtMs || 0);
      if (prevTs > itemTs) {
        byId.set(String(item.id), mergeTwoMatches(item, prev));
      } else {
        byId.set(String(item.id), mergeTwoMatches(prev, item));
      }
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    String(b.fecha || '').localeCompare(String(a.fecha || ''))
  );
}
