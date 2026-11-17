import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { supabase } from './supabase';
import { CLUB_TEAMS } from '@/types';

export const ADMIN_EMAIL = 'angel.saguar@telefonica.net';
export const ALEJANDRO_EMAIL = 'asaguar04@gmail.com';
export const ALEJANDRO_ACCESS_DOC_ID = 'alejandro_scout';

export type ClubModuleId =
  | 'scouting'
  | 'campograma'
  | 'needs'
  | 'gestion-equipo'
  | 'estadisticas-rivales';

export interface ClubModuleDefinition {
  id: ClubModuleId;
  label: string;
  description: string;
  routes: string[];
}

export const CLUB_MODULES: ClubModuleDefinition[] = [
  {
    id: 'scouting',
    label: 'Captación y Scouting',
    description: 'Consulta y registro de informes de scouting, base de datos de jugadores, comparador y analítica.',
    routes: ['/scouting', '/players', '/comparison', '/analytics'],
  },
  {
    id: 'campograma',
    label: 'Campograma y Líneas por Categoría',
    description: 'Visualización y organización táctica de plantillas por temporada y categoría.',
    routes: ['/campograma'],
  },
  {
    id: 'needs',
    label: 'Necesidades de Plantilla',
    description: 'Consulta y seguimiento de posiciones prioritarias a reforzar en el club.',
    routes: ['/needs'],
  },
  {
    id: 'gestion-equipo',
    label: 'Gestión de Equipos (Partidos, Plantillas, Asistencia, Planes)',
    description: 'Acceso a plantillas de equipos, sesiones de asistencia, partidos, estadísticas en vivo y planes de partido.',
    routes: ['/gestion-equipo', '/coaches'],
  },
  {
    id: 'estadisticas-rivales',
    label: 'Competiciones, Actas RFFM y Estadísticas Rivales',
    description: 'Consulta de clasificaciones oficiales RFFM, actas arbitrales y análisis de equipos rivales.',
    routes: ['/estadisticas-rivales'],
  },
];

export interface ScoutAccessConfig {
  email: string;
  uid: string;
  uidLocked: boolean;
  nombre: string;
  role: 'scout';
  active: boolean;
  allowedModules: ClubModuleId[];
  updatedBy: string;
  updatedAt?: any;
}

export const DEFAULT_ALEJANDRO_ACCESS: ScoutAccessConfig = {
  email: ALEJANDRO_EMAIL,
  uid: '',
  uidLocked: false,
  nombre: 'Alejandro Saguar',
  role: 'scout',
  active: true,
  allowedModules: [], // Deny by default: all modules disabled until explicitly enabled by Admin
  updatedBy: ADMIN_EMAIL,
};

export function isStrictAdminEmail(email?: string | null): boolean {
  return (email || '').trim().toLowerCase() === ADMIN_EMAIL;
}

export function isStrictAlejandroEmail(email?: string | null): boolean {
  return (email || '').trim().toLowerCase() === ALEJANDRO_EMAIL;
}

export function isAuthorizedClubEmail(email?: string | null): boolean {
  return isStrictAdminEmail(email) || isStrictAlejandroEmail(email);
}

/**
 * Returns HTTP headers with the current user's Firebase ID Token for authenticated /api/* calls.
 */
export async function getAuthBearerHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extraHeaders };
  try {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn('Could not retrieve Firebase ID token for API request:', err);
  }
  return headers;
}

/**
 * Reads Alejandro's access configuration from /club_access/alejandro_scout.
 */
export async function getAlejandroAccessConfig(): Promise<ScoutAccessConfig> {
  const path = `club_access/${ALEJANDRO_ACCESS_DOC_ID}`;
  try {
    const snap = await getDoc(doc(db, 'club_access', ALEJANDRO_ACCESS_DOC_ID));
    if (!snap.exists()) {
      return { ...DEFAULT_ALEJANDRO_ACCESS };
    }
    const data = snap.data() as Record<string, any>;
    const validMods = new Set<string>(CLUB_MODULES.map((m) => m.id));
    const allowedModules = Array.isArray(data.allowedModules)
      ? (data.allowedModules.filter((m: any) => validMods.has(String(m))) as ClubModuleId[])
      : [];

    return {
      email: ALEJANDRO_EMAIL,
      uid: typeof data.uid === 'string' ? data.uid : '',
      uidLocked: Boolean(data.uidLocked),
      nombre: typeof data.nombre === 'string' && data.nombre ? data.nombre : 'Alejandro Saguar',
      role: 'scout',
      active: data.active !== false,
      allowedModules,
      updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : ADMIN_EMAIL,
      updatedAt: data.updatedAt,
    };
  } catch (err) {
    console.warn('Could not read /club_access/alejandro_scout:', err);
    return { ...DEFAULT_ALEJANDRO_ACCESS };
  }
}

/**
 * Called when the Administrator (angel.saguar@telefonica.net) logs in to ensure
 * /club_access/alejandro_scout exists in Firestore with allowedModules: [] by default.
 */
export async function ensureAlejandroAccessInitializedByAdmin(): Promise<ScoutAccessConfig> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified || !isStrictAdminEmail(currentUser.email)) {
    return getAlejandroAccessConfig();
  }

  const docRef = doc(db, 'club_access', ALEJANDRO_ACCESS_DOC_ID);
  try {
    const snap = await getDoc(docRef);
    let cfg: ScoutAccessConfig;
    if (!snap.exists()) {
      const initialPayload = {
        email: ALEJANDRO_EMAIL,
        uid: '',
        uidLocked: false,
        nombre: 'Alejandro Saguar',
        role: 'scout' as const,
        active: true,
        allowedModules: [] as ClubModuleId[],
        updatedBy: ADMIN_EMAIL,
        updatedAt: serverTimestamp(),
      };
      await setDoc(docRef, initialPayload);
      cfg = { ...DEFAULT_ALEJANDRO_ACCESS };
    } else {
      cfg = await getAlejandroAccessConfig();
    }

    try {
      const headers = await getAuthBearerHeaders({ 'Content-Type': 'application/json' });
      await fetch('/api/admin/sync-scout-access', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          uid: cfg.uid,
          uidLocked: cfg.uidLocked,
          active: cfg.active,
          allowedModules: cfg.allowedModules,
        }),
      });
    } catch {
      // Non-fatal if server mirror sync fails
    }

    return cfg;
  } catch (err) {
    console.warn('Error ensuring /club_access/alejandro_scout initialization:', err);
    return { ...DEFAULT_ALEJANDRO_ACCESS };
  }
}

/**
 * Cryptographically binds and verifies Alejandro's real Firebase Auth UID upon Google sign-in.
 * - Requires email_verified === true and email === 'asaguar04@gmail.com'.
 * - If /club_access/alejandro_scout has uid === '' and uidLocked === false, atomically seals
 *   his real Firebase UID (without enabling any modules).
 * - If uidLocked === true, strictly verifies that his current UID matches the sealed UID.
 */
export async function bindAndVerifyAlejandroUid(fbUser: {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}): Promise<ScoutAccessConfig> {
  const cleanEmail = (fbUser.email || '').trim().toLowerCase();
  if (!fbUser.emailVerified || cleanEmail !== ALEJANDRO_EMAIL || !fbUser.uid) {
    throw new Error('Acceso denegado: Cuenta no autorizada o correo Google no verificado.');
  }

  const docRef = doc(db, 'club_access', ALEJANDRO_ACCESS_DOC_ID);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error(
      'Tu perfil de observador (asaguar04@gmail.com) aún no ha sido inicializado por el administrador en Firestore. Pide al administrador que acceda a su panel para activarlo.'
    );
  }

  const data = snap.data() as Record<string, any>;
  if (data.active === false) {
    throw new Error('El acceso para asaguar04@gmail.com se encuentra temporalmente desactivado por el administrador.');
  }

  const existingUid = typeof data.uid === 'string' ? data.uid.trim() : '';
  const isLocked = Boolean(data.uidLocked);

  if (!existingUid && !isLocked) {
    // Perform the one-time atomic UID seal allowed by firestore.rules
    await updateDoc(docRef, {
      uid: fbUser.uid,
      uidLocked: true,
      updatedBy: ALEJANDRO_EMAIL,
      updatedAt: serverTimestamp(),
    });
  } else if (existingUid !== fbUser.uid) {
    throw new Error(
      'Alerta de seguridad: El UID de Firebase Authentication no coincide con el UID sellado para asaguar04@gmail.com.'
    );
  }

  try {
    const headers = await getAuthBearerHeaders({ 'Content-Type': 'application/json' });
    await fetch('/api/scout/seal-uid', { method: 'POST', headers });
  } catch {
    // Non-fatal if server mirror is unreachable
  }

  return await getAlejandroAccessConfig();
}

/**
 * Administrator-only function to update Alejandro's active status, module permissions, or reset UID binding.
 */
export async function updateAlejandroAccessByAdmin(updates: {
  active?: boolean;
  allowedModules?: ClubModuleId[];
  resetUidBinding?: boolean;
  manualUid?: string;
}): Promise<ScoutAccessConfig> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified || !isStrictAdminEmail(currentUser.email)) {
    throw new Error('Operación restringida exclusivamente al administrador principal (angel.saguar@telefonica.net).');
  }

  const path = `club_access/${ALEJANDRO_ACCESS_DOC_ID}`;
  const docRef = doc(db, 'club_access', ALEJANDRO_ACCESS_DOC_ID);
  try {
    const current = await getAlejandroAccessConfig();
    const validMods = new Set<string>(CLUB_MODULES.map((m) => m.id));
    const nextModules =
      updates.allowedModules !== undefined
        ? updates.allowedModules.filter((m) => validMods.has(m)).slice(0, 10)
        : current.allowedModules;

    let nextUid = current.uid;
    let nextUidLocked = current.uidLocked;

    if (updates.resetUidBinding) {
      nextUid = '';
      nextUidLocked = false;
    } else if (typeof updates.manualUid === 'string' && updates.manualUid.trim()) {
      nextUid = updates.manualUid.trim().slice(0, 128);
      nextUidLocked = true;
    }

    const nextActive = updates.active !== undefined ? Boolean(updates.active) : current.active;

    const snap = await getDoc(docRef);
    const payload = {
      email: ALEJANDRO_EMAIL,
      uid: nextUid,
      uidLocked: nextUidLocked,
      nombre: 'Alejandro Saguar',
      role: 'scout' as const,
      active: nextActive,
      allowedModules: nextModules,
      updatedBy: ADMIN_EMAIL,
      updatedAt: serverTimestamp(),
    };

    if (!snap.exists()) {
      await setDoc(docRef, payload);
    } else {
      await updateDoc(docRef, payload);
    }

    const updatedCfg = await getAlejandroAccessConfig();
    try {
      const headers = await getAuthBearerHeaders({ 'Content-Type': 'application/json' });
      await fetch('/api/admin/sync-scout-access', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          uid: updatedCfg.uid,
          uidLocked: updatedCfg.uidLocked,
          active: updatedCfg.active,
          allowedModules: updatedCfg.allowedModules,
        }),
      });
    } catch {
      // Non-fatal
    }

    return updatedCfg;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Subscribe in real time to Alejandro's access config so module changes made by Admin on Mac
 * immediately reflect on Alejandro's iPad without requiring a page reload.
 */
export function subscribeToAlejandroAccessConfig(
  onUpdate: (config: ScoutAccessConfig) => void
): () => void {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    return () => {};
  }
  const docRef = doc(db, 'club_access', ALEJANDRO_ACCESS_DOC_ID);
  return onSnapshot(
    docRef,
    async () => {
      const latest = await getAlejandroAccessConfig();
      onUpdate(latest);
    },
    (err) => {
      console.warn('Subscription to /club_access/alejandro_scout closed or denied:', err.message);
    }
  );
}

/**
 * Checks if a route pathname is permitted for the given user role and allowedModules.
 */
export function isRouteAllowedForUser(
  pathname: string,
  role?: 'admin' | 'scout',
  allowedModules: ClubModuleId[] = []
): boolean {
  if (role === 'admin') return true;
  if (role !== 'scout') return false;

  // Root home and profile are always accessible to authenticated Alejandro so he can see enabled modules
  if (pathname === '/' || pathname === '/profile') return true;

  // Admin and Observer management routes are strictly forbidden for scout
  if (pathname.startsWith('/admin') || pathname.startsWith('/observers')) {
    return false;
  }

  for (const mod of CLUB_MODULES) {
    if (mod.routes.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
      return allowedModules.includes(mod.id);
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Cross-Device (Mac <-> iPad) Firestore Synchronization (/club_sync/{docId})
// ---------------------------------------------------------------------------

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        result[k] = stripUndefinedDeep(v);
      }
    }
    return result as T;
  }
  return value;
}

function sanitizeDocId(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
}

export async function upsertClubSyncDoc(params: {
  id: string;
  module: ClubModuleId;
  category: string;
  team: string;
  items: any;
}): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const docId = sanitizeDocId(params.id);
  const docRef = doc(db, 'club_sync', docId);

  const safePayload = stripUndefinedDeep({
    items: params.items,
    syncedAtMs: Date.now(),
  });

  // Guard against exceeding Firestore 1 MiB document size limit
  const serializedSize = JSON.stringify(safePayload).length;
  if (serializedSize > 900_000) {
    console.warn(`Skipping /club_sync/${docId} upload because payload size (${serializedSize} bytes) approaches 1MB limit.`);
    return;
  }

  const record = {
    id: docId,
    module: params.module,
    category: params.category.slice(0, 80),
    team: params.team.slice(0, 80),
    payload: safePayload,
    updatedBy: (auth.currentUser.email || '').toLowerCase().slice(0, 254),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, record);
}

/**
 * Synchronizes Scouting, Campograma, Needs, Team Rosters/Sessions, and RFFM Competition configs
 * between local storage / local Supabase tables and Firestore (/club_sync) for Mac <-> iPad continuity.
 */
export async function syncAllClubDataWithFirestore(options?: {
  direction?: 'push' | 'pull' | 'bidirectional';
}): Promise<{ pushed: number; pulled: number }> {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.emailVerified) {
    return { pushed: 0, pulled: 0 };
  }

  const isAdmin = isStrictAdminEmail(currentUser.email);
  let allowedModules: ClubModuleId[] = [];
  if (isAdmin) {
    allowedModules = CLUB_MODULES.map((m) => m.id);
  } else if (isStrictAlejandroEmail(currentUser.email)) {
    const cfg = await getAlejandroAccessConfig();
    if (!cfg.active || cfg.uid !== currentUser.uid) {
      return { pushed: 0, pulled: 0 };
    }
    allowedModules = cfg.allowedModules;
  } else {
    return { pushed: 0, pulled: 0 };
  }

  const direction = options?.direction || 'bidirectional';
  let pushed = 0;
  let pulled = 0;

  // 1. PULL from Firestore /club_sync for permitted modules
  if (direction === 'pull' || direction === 'bidirectional') {
    try {
      const snap = await getDocs(collection(db, 'club_sync'));
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const mod = data.module as ClubModuleId;
        if (!isAdmin && !allowedModules.includes(mod)) continue;

        const items = data.payload?.items;
        if (items === undefined) continue;

        if (data.category === 'scouting_players' && Array.isArray(items)) {
          const existingRaw = localStorage.getItem('ud_lapoveda_table_players');
          const existing = existingRaw ? JSON.parse(existingRaw) : [];
          if (items.length >= existing.length) {
            localStorage.setItem('ud_lapoveda_table_players', JSON.stringify(items));
            pulled++;
          }
        } else if (data.category === 'scouting_attributes' && Array.isArray(items)) {
          const existingRaw = localStorage.getItem('ud_lapoveda_table_player_attributes');
          const existing = existingRaw ? JSON.parse(existingRaw) : [];
          if (items.length >= existing.length) {
            localStorage.setItem('ud_lapoveda_table_player_attributes', JSON.stringify(items));
            pulled++;
          }
        } else if (data.category === 'club_needs' && Array.isArray(items)) {
          localStorage.setItem('ud_lapoveda_needs_backup', JSON.stringify(items));
          localStorage.setItem('ud_lapoveda_table_needs', JSON.stringify(items));
          pulled++;
        } else if (data.category === 'club_coaches' && Array.isArray(items)) {
          localStorage.setItem('ud_lapoveda_coaches_backup', JSON.stringify(items));
          localStorage.setItem('ud_lapoveda_table_coaches', JSON.stringify(items));
          pulled++;
        } else if (data.category === 'team_roster' && data.team && Array.isArray(items)) {
          const key = `team_roster_${data.team}`;
          const localRaw = localStorage.getItem(key);
          const localArr = localRaw ? JSON.parse(localRaw) : [];
          if (items.length >= localArr.length) {
            localStorage.setItem(key, JSON.stringify(items));
            pulled++;
          }
        } else if (data.category === 'team_sessions' && data.team && Array.isArray(items)) {
          const key = `team_sessions_${data.team}`;
          const localRaw = localStorage.getItem(key);
          const localArr = localRaw ? JSON.parse(localRaw) : [];
          if (items.length >= localArr.length) {
            localStorage.setItem(key, JSON.stringify(items));
            pulled++;
          }
        } else if (data.category === 'competitions_config' && items && typeof items === 'object') {
          const key = 'club_teams_competition_configs_v2';
          if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify(items));
            pulled++;
          }
        }
      }
    } catch (err) {
      console.warn('Pull from /club_sync skipped or partial:', err);
    }
  }

  // 2. PUSH local state to Firestore /club_sync for permitted modules
  if (direction === 'push' || direction === 'bidirectional') {
    try {
      if (allowedModules.includes('scouting')) {
        const { data: playersData } = await supabase.from('players').select('*');
        if (Array.isArray(playersData) && playersData.length > 0) {
          // Strip base64 photos from cloud sync payload to stay well below 1MB Firestore limit
          const lightPlayers = playersData.map((p: any) => {
            const { foto_url, ...rest } = p;
            return typeof foto_url === 'string' && !foto_url.startsWith('data:')
              ? { ...rest, foto_url }
              : rest;
          });
          await upsertClubSyncDoc({
            id: 'scouting_players_master',
            module: 'scouting',
            category: 'scouting_players',
            team: 'ALL',
            items: lightPlayers,
          });
          pushed++;
        }

        const { data: attrData } = await supabase.from('player_attributes').select('*');
        if (Array.isArray(attrData) && attrData.length > 0) {
          await upsertClubSyncDoc({
            id: 'scouting_attributes_master',
            module: 'scouting',
            category: 'scouting_attributes',
            team: 'ALL',
            items: attrData,
          });
          pushed++;
        }
      }

      if (allowedModules.includes('needs')) {
        const needsRaw = localStorage.getItem('ud_lapoveda_needs_backup');
        if (needsRaw) {
          await upsertClubSyncDoc({
            id: 'club_needs_master',
            module: 'needs',
            category: 'club_needs',
            team: 'ALL',
            items: JSON.parse(needsRaw),
          });
          pushed++;
        }
      }

      if (allowedModules.includes('gestion-equipo')) {
        const coachesRaw = localStorage.getItem('ud_lapoveda_coaches_backup');
        if (coachesRaw) {
          await upsertClubSyncDoc({
            id: 'club_coaches_master',
            module: 'gestion-equipo',
            category: 'club_coaches',
            team: 'ALL',
            items: JSON.parse(coachesRaw),
          });
          pushed++;
        }

        for (const team of CLUB_TEAMS) {
          const slug = sanitizeDocId(team.toLowerCase());
          const rosterRaw = localStorage.getItem(`team_roster_${team}`);
          if (rosterRaw) {
            const parsed = JSON.parse(rosterRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const lightRoster = parsed.map((p: any) => {
                const { foto_url, ...rest } = p;
                return typeof foto_url === 'string' && !foto_url.startsWith('data:')
                  ? { ...rest, foto_url }
                  : rest;
              });
              await upsertClubSyncDoc({
                id: `roster_${slug}`,
                module: 'gestion-equipo',
                category: 'team_roster',
                team,
                items: lightRoster,
              });
              pushed++;
            }
          }

          const sessionsRaw = localStorage.getItem(`team_sessions_${team}`);
          if (sessionsRaw) {
            const parsed = JSON.parse(sessionsRaw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              await upsertClubSyncDoc({
                id: `sessions_${slug}`,
                module: 'gestion-equipo',
                category: 'team_sessions',
                team,
                items: parsed,
              });
              pushed++;
            }
          }
        }
      }

      if (allowedModules.includes('estadisticas-rivales')) {
        const compRaw = localStorage.getItem('club_teams_competition_configs_v2');
        if (compRaw) {
          await upsertClubSyncDoc({
            id: 'competitions_config_master',
            module: 'estadisticas-rivales',
            category: 'competitions_config',
            team: 'ALL',
            items: JSON.parse(compRaw),
          });
          pushed++;
        }
      }
    } catch (err) {
      console.warn('Push to /club_sync skipped or partial:', err);
    }
  }

  return { pushed, pulled };
}
