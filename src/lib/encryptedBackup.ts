import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { auth, db } from './firebase';
import { supabase, isSupabaseConfigured } from './supabase';
import { CLUB_TEAMS } from '@/types';
import { StoredSessionFile } from './fileStorage';
import { ADMIN_EMAIL } from './clubAccessAndSync';

export const EXPECTED_FIREBASE_PROJECT_ID = 'gen-lang-client-0091658680';
export const EXPECTED_FIRESTORE_DATABASE_ID =
  'ai-studio-remixcaptacionys-b51f65a2-fce1-4849-a665-604b0915604c';

export const AUDITED_SUPABASE_TABLES = [
  'users',
  'players',
  'player_attributes',
  'team_matches',
  'attendance_sessions',
  'match_plans',
  'coaches',
  'needs',
  'observers',
  'tactics',
] as const;

export const AUDITED_FIRESTORE_COLLECTIONS = [
  'admins',
  'club_access',
  'club_sync',
  'team_matches',
  'match_plans',
  'security_backups',
] as const;

export interface BackupManifestSummary {
  projectId: string;
  firestoreDatabaseId: string;
  projectIdVerified: boolean;
  firestoreCollectionCounts: Record<string, number>;
  supabaseLocalTableCounts: Record<string, number>;
  supabaseRemoteTableCounts: Record<string, number>;
  localStorageKeyCount: number;
  indexedDbFileCount: number;
  identifiedHistoricalAccountsCount: number;
  totalEntitiesBackedUp: number;
}

export interface PlaintextFullBackupPayload {
  schemaVersion: 'AFE_FULL_AUDIT_BACKUP_V1';
  exportedAt: string;
  exportedBy: string;
  firebaseProjectVerification: {
    configuredProjectId: string;
    expectedProjectId: string;
    configuredDatabaseId: string;
    expectedDatabaseId: string;
    matchesRealProject: boolean;
  };
  identifiedAccountsBeforeHardening: {
    usersTable: any[];
    observersTable: any[];
    activeLocalSession: any;
  };
  firestoreCollections: Record<string, Record<string, any>>;
  supabaseLocalTables: Record<string, any[]>;
  supabaseRemoteTables: Record<string, any[]>;
  supabaseStorageAvatarsMeta: any[];
  typedTeamStorage: Record<
    string,
    {
      roster: any[];
      deletedPlayers: any[];
      evaluations: Record<string, any>;
      matches: any[];
      deletedMatches: any[];
      sessions: any[];
      deletedSessions: any[];
      gamePlans: any[];
      actasRffm: any;
    }
  >;
  rawLocalStorage: Record<string, string>;
  indexedDbFiles: StoredSessionFile[];
}

export interface EncryptedBackupEnvelope {
  format: 'AFE_ENCRYPTED_BACKUP_V1';
  cipher: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: 250000;
  saltBase64: string;
  ivBase64: string;
  plaintextSha256: string;
  exportedAt: string;
  exportedBy: string;
  projectId: string;
  firestoreDatabaseId: string;
  summary: BackupManifestSummary;
  ciphertextBase64: string;
}

export interface SandboxVerificationReport {
  ok: boolean;
  verifiedAt: string;
  sha256Verified: boolean;
  expectedSha256: string;
  computedSha256: string;
  projectIdVerified: boolean;
  productionUntouched: true;
  restoredInSandboxCounts: {
    firestoreDocs: number;
    supabaseTables: number;
    supabaseRows: number;
    localStorageKeys: number;
    indexedDbFiles: number;
    historicalAccountsPreserved: number;
  };
  collectionBreakdown: Record<string, number>;
  tableBreakdown: Record<string, number>;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Web Crypto API helpers (compatible with Browser window.crypto & Node webcrypto)
// ---------------------------------------------------------------------------

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error('Web Crypto API (SubtleCrypto) no está disponible en este entorno.');
}

function getRandomBytes(length: number): Uint8Array {
  const arr = new Uint8Array(length);
  globalThis.crypto.getRandomValues(arr);
  return arr;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

export async function computeSha256Hex(input: string): Promise<string> {
  const subtle = getSubtleCrypto();
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function deriveAesGcmKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = 250000
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ---------------------------------------------------------------------------
// Exhaustive Data Collection (Firestore + Supabase + localStorage + IndexedDB)
// ---------------------------------------------------------------------------

async function dumpAllIndexedDbFiles(): Promise<StoredSessionFile[]> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return [];
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open('ClubGestionFilesDB', 1);
      req.onupgradeneeded = (event: any) => {
        const idb = event.target.result as IDBDatabase;
        if (!idb.objectStoreNames.contains('session_files')) {
          idb.createObjectStore('session_files', { keyPath: 'id' });
        }
      };
      req.onsuccess = (event: any) => {
        try {
          const idb = event.target.result as IDBDatabase;
          if (!idb.objectStoreNames.contains('session_files')) {
            resolve([]);
            return;
          }
          const tx = idb.transaction('session_files', 'readonly');
          const store = tx.objectStore('session_files');
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => {
            resolve(Array.isArray(getAllReq.result) ? getAllReq.result : []);
          };
          getAllReq.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function verifyFirebaseProjectConfig() {
  const configuredProjectId = firebaseConfig.projectId || '';
  const configuredDatabaseId = firebaseConfig.firestoreDatabaseId || '';
  const matchesRealProject =
    configuredProjectId === EXPECTED_FIREBASE_PROJECT_ID &&
    configuredDatabaseId === EXPECTED_FIRESTORE_DATABASE_ID;

  return {
    configuredProjectId,
    actualProjectId: configuredProjectId,
    expectedProjectId: EXPECTED_FIREBASE_PROJECT_ID,
    configuredDatabaseId,
    firestoreDatabaseId: configuredDatabaseId,
    expectedDatabaseId: EXPECTED_FIRESTORE_DATABASE_ID,
    matchesRealProject,
    matches: matchesRealProject,
  };
}

/**
 * Collects 100% of existing data across Firestore, Supabase (all 10 tables + avatars),
 * localStorage, and IndexedDB, and encrypts it with AES-256-GCM.
 */
export async function createEncryptedFullBackup(
  passphrase: string,
  overridesForTest?: {
    customPlaintextPayload?: PlaintextFullBackupPayload;
  }
): Promise<{
  envelope: EncryptedBackupEnvelope;
  filename: string;
}> {
  if (!passphrase || passphrase.trim().length < 8) {
    throw new Error('La contraseña de cifrado de la copia de seguridad debe tener al menos 8 caracteres.');
  }

  const projectCheck = verifyFirebaseProjectConfig();
  if (!projectCheck.matchesRealProject) {
    throw new Error(
      `Discrepancia de proyecto Firebase: configurado (${projectCheck.configuredProjectId}) vs esperado (${projectCheck.expectedProjectId}).`
    );
  }

  let payload: PlaintextFullBackupPayload;

  if (overridesForTest?.customPlaintextPayload) {
    payload = overridesForTest.customPlaintextPayload;
  } else {
    // 1. Collect all Firestore collections
    const firestoreCollections: Record<string, Record<string, any>> = {};
    for (const colName of AUDITED_FIRESTORE_COLLECTIONS) {
      firestoreCollections[colName] = {};
      if (auth.currentUser && auth.currentUser.emailVerified) {
        try {
          const snap = await getDocs(collection(db, colName));
          snap.docs.forEach((d) => {
            firestoreCollections[colName][d.id] = d.data();
          });
        } catch (err) {
          console.warn(`Backup: could not read Firestore collection ${colName}:`, err);
        }
      }
    }

    // 2. Collect all 10 Supabase tables (both local ud_lapoveda_table_* and via supabase client)
    const supabaseLocalTables: Record<string, any[]> = {};
    const supabaseRemoteTables: Record<string, any[]> = {};

    for (const table of AUDITED_SUPABASE_TABLES) {
      if (typeof localStorage !== 'undefined') {
        supabaseLocalTables[table] = safeParseJson<any[]>(
          localStorage.getItem(`ud_lapoveda_table_${table}`),
          []
        );
      } else {
        supabaseLocalTables[table] = [];
      }

      try {
        const { data } = await supabase.from(table).select('*');
        supabaseRemoteTables[table] = Array.isArray(data) ? data : [];
      } catch {
        supabaseRemoteTables[table] = [];
      }
    }

    let supabaseStorageAvatarsMeta: any[] = [];
    if (isSupabaseConfigured) {
      try {
        const { data: avatarFiles } = await supabase.storage.from('avatars').list('player-photos');
        if (Array.isArray(avatarFiles)) {
          supabaseStorageAvatarsMeta = avatarFiles;
        }
      } catch {}
    }

    // 3. Collect typed team data and raw localStorage snapshot
    const typedTeamStorage: PlaintextFullBackupPayload['typedTeamStorage'] = {};
    const rawLocalStorage: Record<string, string> = {};

    if (typeof localStorage !== 'undefined') {
      for (const team of CLUB_TEAMS) {
        typedTeamStorage[team] = {
          roster: safeParseJson(localStorage.getItem(`team_roster_${team}`), []),
          deletedPlayers: safeParseJson(localStorage.getItem(`team_deleted_players_${team}`), []),
          evaluations: safeParseJson(localStorage.getItem(`team_evaluations_${team}`), {}),
          matches: safeParseJson(localStorage.getItem(`team_matches_${team}`), []),
          deletedMatches: safeParseJson(localStorage.getItem(`team_matches_deleted_${team}`), []),
          sessions: safeParseJson(localStorage.getItem(`team_sessions_${team}`), []),
          deletedSessions: safeParseJson(localStorage.getItem(`team_deleted_sessions_${team}`), []),
          gamePlans: safeParseJson(localStorage.getItem(`team_gameplans_${team}`), []),
          actasRffm: safeParseJson(localStorage.getItem(`team_actas_rffm_v1_${team}`), null),
        };
      }

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          const val = localStorage.getItem(k);
          if (val !== null) {
            rawLocalStorage[k] = val;
          }
        }
      }
    }

    // 4. Collect IndexedDB binary files (session PDFs/diagrams + rival crests)
    const indexedDbFiles = await dumpAllIndexedDbFiles();

    // 5. Inventory of accounts and observers prior to access restriction
    const usersTable =
      supabaseRemoteTables['users']?.length > 0
        ? supabaseRemoteTables['users']
        : supabaseLocalTables['users'] || [];
    const observersTable =
      supabaseRemoteTables['observers']?.length > 0
        ? supabaseRemoteTables['observers']
        : safeParseJson(
            typeof localStorage !== 'undefined'
              ? localStorage.getItem('ud_lapoveda_observers_backup')
              : null,
            []
          );
    const activeLocalSession =
      typeof localStorage !== 'undefined'
        ? safeParseJson(localStorage.getItem('ud_lapoveda_auth_session'), null)
        : null;

    payload = {
      schemaVersion: 'AFE_FULL_AUDIT_BACKUP_V1',
      exportedAt: new Date().toISOString(),
      exportedBy: auth.currentUser?.email || ADMIN_EMAIL,
      firebaseProjectVerification: projectCheck,
      identifiedAccountsBeforeHardening: {
        usersTable,
        observersTable,
        activeLocalSession,
      },
      firestoreCollections,
      supabaseLocalTables,
      supabaseRemoteTables,
      supabaseStorageAvatarsMeta,
      typedTeamStorage,
      rawLocalStorage,
      indexedDbFiles,
    };
  }

  // Compute summary counts
  const firestoreCollectionCounts: Record<string, number> = {};
  let totalFirestoreDocs = 0;
  for (const [col, docsMap] of Object.entries(payload.firestoreCollections)) {
    const count = Object.keys(docsMap || {}).length;
    firestoreCollectionCounts[col] = count;
    totalFirestoreDocs += count;
  }

  const supabaseLocalTableCounts: Record<string, number> = {};
  let totalSupabaseLocalRows = 0;
  for (const [tbl, rows] of Object.entries(payload.supabaseLocalTables)) {
    const count = Array.isArray(rows) ? rows.length : 0;
    supabaseLocalTableCounts[tbl] = count;
    totalSupabaseLocalRows += count;
  }

  const supabaseRemoteTableCounts: Record<string, number> = {};
  for (const [tbl, rows] of Object.entries(payload.supabaseRemoteTables)) {
    supabaseRemoteTableCounts[tbl] = Array.isArray(rows) ? rows.length : 0;
  }

  const localStorageKeyCount = Object.keys(payload.rawLocalStorage || {}).length;
  const indexedDbFileCount = Array.isArray(payload.indexedDbFiles) ? payload.indexedDbFiles.length : 0;
  const identifiedHistoricalAccountsCount =
    (payload.identifiedAccountsBeforeHardening.usersTable?.length || 0) +
    (payload.identifiedAccountsBeforeHardening.observersTable?.length || 0);

  const summary: BackupManifestSummary = {
    projectId: payload.firebaseProjectVerification.configuredProjectId,
    firestoreDatabaseId: payload.firebaseProjectVerification.configuredDatabaseId,
    projectIdVerified: payload.firebaseProjectVerification.matchesRealProject,
    firestoreCollectionCounts,
    supabaseLocalTableCounts,
    supabaseRemoteTableCounts,
    localStorageKeyCount,
    indexedDbFileCount,
    identifiedHistoricalAccountsCount,
    totalEntitiesBackedUp:
      totalFirestoreDocs + totalSupabaseLocalRows + localStorageKeyCount + indexedDbFileCount,
  };

  // Serialize plaintext and compute SHA-256
  const plaintextJson = JSON.stringify(payload);
  const plaintextSha256 = await computeSha256Hex(plaintextJson);

  // Encrypt with AES-256-GCM (PBKDF2 250,000 iterations)
  const salt = getRandomBytes(16);
  const iv = getRandomBytes(12);
  const aesKey = await deriveAesGcmKey(passphrase, salt, 250000);
  const subtle = getSubtleCrypto();
  const cipherBuffer = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    aesKey,
    new TextEncoder().encode(plaintextJson)
  );

  const envelope: EncryptedBackupEnvelope = {
    format: 'AFE_ENCRYPTED_BACKUP_V1',
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: 250000,
    saltBase64: bytesToBase64(salt),
    ivBase64: bytesToBase64(iv),
    plaintextSha256,
    exportedAt: payload.exportedAt,
    exportedBy: payload.exportedBy,
    projectId: summary.projectId,
    firestoreDatabaseId: summary.firestoreDatabaseId,
    summary,
    ciphertextBase64: bytesToBase64(new Uint8Array(cipherBuffer)),
  };

  // Record audit metadata in Firestore /security_backups if Admin is authenticated
  if (auth.currentUser?.emailVerified && auth.currentUser.email?.toLowerCase() === ADMIN_EMAIL) {
    try {
      const backupId = `backup_${Date.now()}`;
      await setDoc(doc(db, 'security_backups', backupId), {
        id: backupId,
        createdBy: ADMIN_EMAIL,
        sha256Checksum: plaintextSha256,
        summary: {
          localStorageKeyCount: summary.localStorageKeyCount,
          indexedDbFileCount: summary.indexedDbFileCount,
          totalEntitiesBackedUp: summary.totalEntitiesBackedUp,
          projectId: summary.projectId,
        },
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Could not log backup metadata to /security_backups:', err);
    }
  }

  const datePart = payload.exportedAt.slice(0, 19).replace(/[:T]/g, '-');
  const filename = `Backup_Cifrado_Scouting_AFE_${datePart}.enc.json`;

  return { envelope, filename };
}

/**
 * Triggers a direct file download onto the user's Mac / iPad.
 */
export function downloadEncryptedBackupToDevice(
  envelope: EncryptedBackupEnvelope,
  filename: string
): void {
  const jsonStr = JSON.stringify(envelope, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 150);
}

/**
 * Decrypts and restores the encrypted backup EXCLUSIVELY inside an isolated in-memory Sandbox
 * environment. NEVER writes to or modifies Production Firestore, Production Supabase,
 * window.localStorage, or window.indexedDB.
 */
export async function verifyAndRestoreBackupInIsolatedSandbox(
  envelopeOrJson: EncryptedBackupEnvelope | string,
  passphrase: string
): Promise<{
  report: SandboxVerificationReport;
  sandboxEnvironment: {
    firestore: Map<string, Map<string, any>>;
    supabaseTables: Map<string, any[]>;
    localStorage: Map<string, string>;
    indexedDB: Map<string, StoredSessionFile>;
  };
}> {
  const errors: string[] = [];
  let envelope: EncryptedBackupEnvelope;

  try {
    envelope =
      typeof envelopeOrJson === 'string'
        ? (JSON.parse(envelopeOrJson) as EncryptedBackupEnvelope)
        : envelopeOrJson;
  } catch {
    throw new Error('El archivo seleccionado no tiene un formato JSON válido.');
  }

  if (
    !envelope ||
    envelope.format !== 'AFE_ENCRYPTED_BACKUP_V1' ||
    envelope.cipher !== 'AES-256-GCM' ||
    !envelope.ciphertextBase64 ||
    !envelope.saltBase64 ||
    !envelope.ivBase64
  ) {
    throw new Error('El archivo no corresponde a una copia de seguridad cifrada AFE_ENCRYPTED_BACKUP_V1.');
  }

  // 1. Decrypt AES-256-GCM ciphertext in memory
  let decryptedJson = '';
  try {
    const salt = base64ToBytes(envelope.saltBase64);
    const iv = base64ToBytes(envelope.ivBase64);
    const ciphertext = base64ToBytes(envelope.ciphertextBase64);
    const aesKey = await deriveAesGcmKey(passphrase, salt, envelope.iterations || 250000);
    const subtle = getSubtleCrypto();
    const plainBuffer = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as BufferSource },
      aesKey,
      ciphertext as unknown as BufferSource
    );
    decryptedJson = new TextDecoder().decode(plainBuffer);
  } catch {
    throw new Error('Contraseña incorrecta o archivo cifrado alterado (fallo de autenticación AES-256-GCM).');
  }

  // 2. Verify SHA-256 integrity checksum
  const computedSha256 = await computeSha256Hex(decryptedJson);
  const sha256Verified = computedSha256 === envelope.plaintextSha256;
  if (!sha256Verified) {
    errors.push(
      `El hash SHA-256 calculado (${computedSha256}) no coincide con el manifiesto (${envelope.plaintextSha256}).`
    );
  }

  const parsedPayload = JSON.parse(decryptedJson) as PlaintextFullBackupPayload;

  // 3. Verify Firebase projectId and databaseId match the real Captación y Scouting project
  const projectIdVerified =
    parsedPayload.firebaseProjectVerification?.configuredProjectId === EXPECTED_FIREBASE_PROJECT_ID &&
    parsedPayload.firebaseProjectVerification?.configuredDatabaseId === EXPECTED_FIRESTORE_DATABASE_ID;

  if (!projectIdVerified) {
    errors.push('El projectId o firestoreDatabaseId del backup no coincide con el proyecto real.');
  }

  // 4. Restore into ISOLATED IN-MEMORY SANDBOX (Zero production writes)
  const sandboxFirestore = new Map<string, Map<string, any>>();
  const collectionBreakdown: Record<string, number> = {};
  let restoredFirestoreDocs = 0;

  for (const [colName, docsObj] of Object.entries(parsedPayload.firestoreCollections || {})) {
    const colMap = new Map<string, any>();
    for (const [docId, docData] of Object.entries(docsObj || {})) {
      colMap.set(docId, structuredClone(docData));
      restoredFirestoreDocs++;
    }
    sandboxFirestore.set(colName, colMap);
    collectionBreakdown[colName] = colMap.size;

    const expectedColCount = envelope.summary?.firestoreCollectionCounts?.[colName] ?? colMap.size;
    if (colMap.size !== expectedColCount) {
      errors.push(`Discrepancia en colección Firestore '${colName}': restaurados ${colMap.size} vs ${expectedColCount}.`);
    }
  }

  const sandboxSupabaseTables = new Map<string, any[]>();
  const tableBreakdown: Record<string, number> = {};
  let restoredSupabaseRows = 0;

  for (const table of AUDITED_SUPABASE_TABLES) {
    const localRows = parsedPayload.supabaseLocalTables?.[table] || [];
    const remoteRows = parsedPayload.supabaseRemoteTables?.[table] || [];
    const effectiveRows = localRows.length >= remoteRows.length ? localRows : remoteRows;
    const clonedRows = structuredClone(effectiveRows);
    sandboxSupabaseTables.set(table, clonedRows);
    tableBreakdown[table] = clonedRows.length;
    restoredSupabaseRows += clonedRows.length;
  }

  const sandboxLocalStorage = new Map<string, string>();
  for (const [k, v] of Object.entries(parsedPayload.rawLocalStorage || {})) {
    sandboxLocalStorage.set(k, String(v));
  }
  if (sandboxLocalStorage.size !== (envelope.summary?.localStorageKeyCount ?? sandboxLocalStorage.size)) {
    errors.push(
      `Discrepancia en claves localStorage: restauradas ${sandboxLocalStorage.size} vs ${envelope.summary?.localStorageKeyCount}.`
    );
  }

  const sandboxIndexedDB = new Map<string, StoredSessionFile>();
  for (const file of parsedPayload.indexedDbFiles || []) {
    if (file && file.id) {
      sandboxIndexedDB.set(file.id, structuredClone(file));
    }
  }
  if (sandboxIndexedDB.size !== (envelope.summary?.indexedDbFileCount ?? sandboxIndexedDB.size)) {
    errors.push(
      `Discrepancia en archivos IndexedDB: restaurados ${sandboxIndexedDB.size} vs ${envelope.summary?.indexedDbFileCount}.`
    );
  }

  const historicalAccountsPreserved =
    (parsedPayload.identifiedAccountsBeforeHardening?.usersTable?.length || 0) +
    (parsedPayload.identifiedAccountsBeforeHardening?.observersTable?.length || 0);

  const report: SandboxVerificationReport = {
    ok: errors.length === 0 && sha256Verified && projectIdVerified,
    verifiedAt: new Date().toISOString(),
    sha256Verified,
    expectedSha256: envelope.plaintextSha256,
    computedSha256,
    projectIdVerified,
    productionUntouched: true,
    restoredInSandboxCounts: {
      firestoreDocs: restoredFirestoreDocs,
      supabaseTables: sandboxSupabaseTables.size,
      supabaseRows: restoredSupabaseRows,
      localStorageKeys: sandboxLocalStorage.size,
      indexedDbFiles: sandboxIndexedDB.size,
      historicalAccountsPreserved,
    },
    collectionBreakdown,
    tableBreakdown,
    errors,
  };

  return {
    report,
    sandboxEnvironment: {
      firestore: sandboxFirestore,
      supabaseTables: sandboxSupabaseTables,
      localStorage: sandboxLocalStorage,
      indexedDB: sandboxIndexedDB,
    },
  };
}
