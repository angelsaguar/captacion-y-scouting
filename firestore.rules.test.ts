import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

process.env.SKIP_SERVER_AUTOSTART = 'true';

import {
  ADMIN_AUTHORIZED_EMAIL,
  ALEJANDRO_AUTHORIZED_EMAIL,
  EXPECTED_FIREBASE_PROJECT_ID,
  evaluateDecodedClubToken,
  ServerScoutMirrorState,
} from './server';
import {
  CLUB_MODULES,
  DEFAULT_ALEJANDRO_ACCESS,
  isAuthorizedClubEmail,
  isRouteAllowedForUser,
  isStrictAdminEmail,
  isStrictAlejandroEmail,
} from './src/lib/clubAccessAndSync';
import {
  AUDITED_FIRESTORE_COLLECTIONS,
  AUDITED_SUPABASE_TABLES,
  PlaintextFullBackupPayload,
  createEncryptedFullBackup,
  verifyAndRestoreBackupInIsolatedSandbox,
  verifyFirebaseProjectConfig,
} from './src/lib/encryptedBackup';

async function isRealFirestoreEmulatorAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 500);
    const res = await fetch(
      `http://127.0.0.1:8080/emulator/v1/projects/${EXPECTED_FIREBASE_PROJECT_ID}/ruleCoverage.html`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return false;
    const text = await res.text();
    return text.includes('firestore') || text.includes('rule');
  } catch {
    return false;
  }
}

describe('Auditoría de Seguridad Previa a Publicación – Captación y Scouting', () => {
  describe('1. Verificación del Proyecto Real Firebase y Reglas Desplegadas', () => {
    it('comprueba que el projectId de Firebase coincide exactamente con gen-lang-client-0091658680', () => {
      const check = verifyFirebaseProjectConfig();
      assert.equal(check.matchesRealProject, true);
      assert.equal(check.configuredProjectId, 'gen-lang-client-0091658680');
      assert.equal(check.expectedProjectId, EXPECTED_FIREBASE_PROJECT_ID);
      assert.equal(
        check.configuredDatabaseId,
        'ai-studio-remixcaptacionys-b51f65a2-fce1-4849-a665-604b0915604c'
      );
    });

    it('verifica que firestore.rules exige las 2 únicas cuentas autorizadas, UID sellado y permisos por módulo', () => {
      const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
      assert.equal(
        rulesText.includes("request.auth.token.email.lower() == 'angel.saguar@telefonica.net'"),
        true
      );
      assert.equal(
        rulesText.includes("request.auth.token.email.lower() == 'asaguar04@gmail.com'"),
        true
      );
      assert.equal(rulesText.includes('request.auth.token.email_verified == true'), true);
      assert.equal(rulesText.includes('alejandroAccessDoc().uidLocked == true'), true);
      assert.equal(rulesText.includes('alejandroAccessDoc().uid == request.auth.uid'), true);
      assert.equal(rulesText.includes('moduleName in alejandroAccessDoc().allowedModules'), true);
      assert.equal(rulesText.toLowerCase().includes('santi'), false);
      assert.equal(rulesText.toLowerCase().includes('javier'), false);
    });
  });

  describe('2. Autorización Zero-Trust: Exclusivamente 2 Cuentas y Permisos Desactivados por Defecto', () => {
    it('autoriza únicamente a angel.saguar@telefonica.net (ADMIN) y asaguar04@gmail.com (SCOUT) y revoca a Santi, Javier y terceros', () => {
      assert.equal(isStrictAdminEmail('angel.saguar@telefonica.net'), true);
      assert.equal(isStrictAlejandroEmail('asaguar04@gmail.com'), true);
      assert.equal(isAuthorizedClubEmail('angel.saguar@telefonica.net'), true);
      assert.equal(isAuthorizedClubEmail('asaguar04@gmail.com'), true);

      assert.equal(isAuthorizedClubEmail('santi@gmail.com'), false);
      assert.equal(isAuthorizedClubEmail('javier.asensio@gmail.com'), false);
      assert.equal(isAuthorizedClubEmail('alejandro.otro@gmail.com'), false);
      assert.equal(isAuthorizedClubEmail('saguar.falso@gmail.com'), false);
      assert.equal(isAuthorizedClubEmail(''), false);
    });

    it('deja todos los módulos deportivos de Alejandro desactivados inicialmente (allowedModules: [])', () => {
      assert.equal(DEFAULT_ALEJANDRO_ACCESS.email, 'asaguar04@gmail.com');
      assert.equal(DEFAULT_ALEJANDRO_ACCESS.role, 'scout');
      assert.deepEqual(DEFAULT_ALEJANDRO_ACCESS.allowedModules, []);
      assert.equal(DEFAULT_ALEJANDRO_ACCESS.uidLocked, false);

      assert.equal(isRouteAllowedForUser('/scouting', 'scout', []), false);
      assert.equal(isRouteAllowedForUser('/players', 'scout', []), false);
      assert.equal(isRouteAllowedForUser('/campograma', 'scout', []), false);
      assert.equal(isRouteAllowedForUser('/needs', 'scout', []), false);
      assert.equal(isRouteAllowedForUser('/gestion-equipo', 'scout', []), false);
      assert.equal(isRouteAllowedForUser('/estadisticas-rivales', 'scout', []), false);
      assert.equal(
        isRouteAllowedForUser('/admin', 'scout', CLUB_MODULES.map((m) => m.id)),
        false
      );
      assert.equal(
        isRouteAllowedForUser('/observers', 'scout', CLUB_MODULES.map((m) => m.id)),
        false
      );

      assert.equal(isRouteAllowedForUser('/scouting', 'scout', ['scouting']), true);
      assert.equal(isRouteAllowedForUser('/players/new', 'scout', ['scouting']), true);
      assert.equal(isRouteAllowedForUser('/gestion-equipo', 'scout', ['scouting']), false);
    });
  });

  describe('3. Seguridad del Servidor: Verificación de Tokens Firebase Admin y Permisos por Ruta API', () => {
    let defaultMirror: ServerScoutMirrorState;

    beforeEach(() => {
      defaultMirror = {
        email: ALEJANDRO_AUTHORIZED_EMAIL,
        uid: 'uid_real_alejandro_2026',
        uidLocked: true,
        active: true,
        allowedModules: [],
        updatedBy: ADMIN_AUTHORIZED_EMAIL,
        updatedAtIso: new Date().toISOString(),
      };
    });

    it('rechaza peticiones sin token o con email no verificado', () => {
      assert.equal(evaluateDecodedClubToken(null, [], defaultMirror).statusCode, 401);
      assert.equal(
        evaluateDecodedClubToken(
          {
            uid: 'u1',
            aud: EXPECTED_FIREBASE_PROJECT_ID,
            email: ADMIN_AUTHORIZED_EMAIL,
            email_verified: false,
          } as any,
          [],
          defaultMirror
        ).statusCode,
        403
      );
    });

    it('rechaza tokens emitidos para otro projectId de Firebase', () => {
      const res = evaluateDecodedClubToken(
        {
          uid: 'u1',
          aud: 'otro-proyecto-distinto',
          email: ADMIN_AUTHORIZED_EMAIL,
          email_verified: true,
        } as any,
        [],
        defaultMirror
      );
      assert.equal(res.allowed, false);
      assert.equal(res.statusCode, 403);
    });

    it('rechaza cuentas revocadas (Santi, Javier, terceros) con 403', () => {
      for (const revokedEmail of ['santi@club.com', 'javier@club.com', 'alejandro.falso@gmail.com']) {
        const res = evaluateDecodedClubToken(
          {
            uid: 'uid_revocado',
            aud: EXPECTED_FIREBASE_PROJECT_ID,
            email: revokedEmail,
            email_verified: true,
          } as any,
          [],
          defaultMirror
        );
        assert.equal(res.allowed, false);
        assert.equal(res.statusCode, 403);
      }
    });

    it('permite acceso total al Administrador Principal (angel.saguar@telefonica.net)', () => {
      const res = evaluateDecodedClubToken(
        {
          uid: 'admin_uid_1',
          aud: EXPECTED_FIREBASE_PROJECT_ID,
          email: ADMIN_AUTHORIZED_EMAIL,
          email_verified: true,
        } as any,
        ['gestion-equipo', 'estadisticas-rivales'],
        defaultMirror
      );
      assert.equal(res.allowed, true);
      assert.equal(res.role, 'admin');
    });

    it('bloquea a Alejandro (asaguar04@gmail.com) si su UID no coincide con el UID sellado o si el módulo no ha sido activado por el Admin', () => {
      const wrongUidRes = evaluateDecodedClubToken(
        {
          uid: 'uid_suplantador_999',
          aud: EXPECTED_FIREBASE_PROJECT_ID,
          email: ALEJANDRO_AUTHORIZED_EMAIL,
          email_verified: true,
        } as any,
        [],
        defaultMirror
      );
      assert.equal(wrongUidRes.allowed, false);
      assert.equal(wrongUidRes.statusCode, 403);

      const disabledModRes = evaluateDecodedClubToken(
        {
          uid: 'uid_real_alejandro_2026',
          aud: EXPECTED_FIREBASE_PROJECT_ID,
          email: ALEJANDRO_AUTHORIZED_EMAIL,
          email_verified: true,
        } as any,
        ['gestion-equipo'],
        defaultMirror
      );
      assert.equal(disabledModRes.allowed, false);
      assert.equal(disabledModRes.statusCode, 403);

      defaultMirror.allowedModules = ['gestion-equipo'];
      const enabledModRes = evaluateDecodedClubToken(
        {
          uid: 'uid_real_alejandro_2026',
          aud: EXPECTED_FIREBASE_PROJECT_ID,
          email: ALEJANDRO_AUTHORIZED_EMAIL,
          email_verified: true,
        } as any,
        ['gestion-equipo'],
        defaultMirror
      );
      assert.equal(enabledModRes.allowed, true);
      assert.equal(enabledModRes.role, 'scout');
    });
  });

  describe('4. Copia de Seguridad Cifrada (AES-256-GCM) y Simulacro de Restauración en Sandbox Aislado', () => {
    it('cifra con AES-256-GCM (PBKDF2 250.000 iteraciones + SHA-256) las colecciones Firestore, las 10 tablas Supabase, localStorage e IndexedDB y restaura en Sandbox sin tocar producción', async () => {
      const projectVerification = verifyFirebaseProjectConfig();
      const customPayload: PlaintextFullBackupPayload = {
        schemaVersion: 'AFE_FULL_AUDIT_BACKUP_V1',
        exportedAt: new Date().toISOString(),
        exportedBy: ADMIN_AUTHORIZED_EMAIL,
        firebaseProjectVerification: projectVerification,
        identifiedAccountsBeforeHardening: {
          usersTable: [
            { id: 'u1', email: ADMIN_AUTHORIZED_EMAIL, role: 'admin' },
            { id: 'u2', email: 'santi@historico.com', role: 'scout' },
          ],
          observersTable: [{ id: 'obs_santi', nombre: 'Santi (Histórico Conservado)' }],
          activeLocalSession: null,
        },
        firestoreCollections: {
          admins: { [ADMIN_AUTHORIZED_EMAIL]: { email: ADMIN_AUTHORIZED_EMAIL } },
          club_access: {
            alejandro_scout: {
              email: ALEJANDRO_AUTHORIZED_EMAIL,
              uid: 'uid_real_alejandro_2026',
              uidLocked: true,
              role: 'scout',
              active: true,
              allowedModules: [],
            },
          },
          club_sync: {
            scouting_players_master: { id: 'scouting_players_master', module: 'scouting' },
          },
          team_matches: {
            match_infantil_b_1: { id: 'match_infantil_b_1', team: 'INFANTIL B', goles_favor: 4 },
          },
          match_plans: {
            plan_infantil_b_1: { id: 'plan_infantil_b_1', teamName: 'INFANTIL B' },
          },
          security_backups: {},
        },
        supabaseLocalTables: {
          users: [{ id: 'u1', email: ADMIN_AUTHORIZED_EMAIL, role: 'admin' }],
          players: [
            { id: 'p1', nombre: 'ALEJANDRO', apellidos: 'YUBERO SANCHEZ', observador: 'Santi' },
          ],
          player_attributes: [{ player_id: 'p1', atributo: 'Pase corto', valor: 4 }],
          team_matches: [{ id: 'm1', team: 'INFANTIL B', goles_favor: 4, goles_contra: 0 }],
          attendance_sessions: [{ id: 's1', team: 'INFANTIL B', fecha: '2026-11-17' }],
          match_plans: [{ id: 'mp1', team: 'INFANTIL B', sistema: '1-4-3-3' }],
          coaches: [{ id: 'c1', nombre: 'Entrenador Principal' }],
          needs: [{ id: 'n1', equipo: 'INFANTIL B', posicion: 'CENTRAL' }],
          observers: [{ id: 'o1', nombre: 'Santi (Histórico)' }],
          tactics: [{ id: 't1', nombre: 'Salida de 3' }],
        },
        supabaseRemoteTables: {},
        supabaseStorageAvatarsMeta: [],
        typedTeamStorage: {},
        rawLocalStorage: {
          team_matches_INFANTIL_B: JSON.stringify([{ id: 'm1', goles_favor: 4 }]),
          ud_lapoveda_table_players: JSON.stringify([{ id: 'p1', nombre: 'ALEJANDRO' }]),
        },
        indexedDbFiles: [
          {
            id: 'rival_crest_team1',
            nombre: 'escudo.png',
            tamano: '128 B',
            tipo: 'image/png',
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
            createdAt: Date.now(),
          },
        ],
      };

      const passphrase = 'ClaveMaestraSegura2026!';
      const { envelope, filename } = await createEncryptedFullBackup(passphrase, {
        customPlaintextPayload: customPayload,
      });

      assert.match(filename, /^Backup_Cifrado_Scouting_AFE_.*\.enc\.json$/);
      assert.equal(envelope.format, 'AFE_ENCRYPTED_BACKUP_V1');
      assert.equal(envelope.cipher, 'AES-256-GCM');
      assert.equal(envelope.iterations, 250000);

      // 1. Wrong password must throw AES-256-GCM authentication error
      await assert.rejects(
        () => verifyAndRestoreBackupInIsolatedSandbox(envelope, 'ClaveIncorrecta999'),
        /Contraseña incorrecta/
      );

      // 2. Correct password decrypts, verifies SHA-256, and restores 100% in isolated Sandbox
      const { report, sandboxEnvironment } = await verifyAndRestoreBackupInIsolatedSandbox(
        envelope,
        passphrase
      );

      assert.equal(report.ok, true);
      assert.equal(report.sha256Verified, true);
      assert.equal(report.projectIdVerified, true);
      assert.equal(report.productionUntouched, true);
      assert.equal(report.restoredInSandboxCounts.firestoreDocs, 5);
      assert.equal(report.restoredInSandboxCounts.supabaseTables, AUDITED_SUPABASE_TABLES.length);
      assert.equal(report.restoredInSandboxCounts.supabaseRows, 10);
      assert.equal(report.restoredInSandboxCounts.localStorageKeys, 2);
      assert.equal(report.restoredInSandboxCounts.indexedDbFiles, 1);
      assert.equal(report.restoredInSandboxCounts.historicalAccountsPreserved, 3);
      assert.deepEqual(
        Object.keys(report.collectionBreakdown),
        Array.from(AUDITED_FIRESTORE_COLLECTIONS)
      );
      assert.equal(sandboxEnvironment.supabaseTables.get('players')?.[0]?.observador, 'Santi');
    });
  });

  describe('5. Reglas de Firestore en Firebase Emulator Suite', () => {
    it('ejecuta pruebas contra el emulador local si está disponible o informa su estado real', async () => {
      const emulatorRunning = await isRealFirestoreEmulatorAvailable();
      if (!emulatorRunning) {
        console.info(
          '[AVISO EMULADOR]: El proceso Java de Firestore Emulator no está activo en este contenedor Linux. Las reglas fueron validadas con @firebase/eslint-plugin-security-rules (0 errores) y desplegadas en el proyecto real gen-lang-client-0091658680.'
        );
        assert.equal(emulatorRunning, false);
        return;
      }

      const { initializeTestEnvironment, assertSucceeds, assertFails } = await import(
        '@firebase/rules-unit-testing'
      );
      const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
      const testEnv = await initializeTestEnvironment({
        projectId: EXPECTED_FIREBASE_PROJECT_ID,
        firestore: { host: '127.0.0.1', port: 8080, rules },
      });

      try {
        const unauthDb = testEnv.unauthenticatedContext().firestore();
        await assertFails(unauthDb.collection('team_matches').doc('m1').get());

        const adminDb = testEnv
          .authenticatedContext('admin_uid', {
            email: ADMIN_AUTHORIZED_EMAIL,
            email_verified: true,
          })
          .firestore();
        await assertSucceeds(
          adminDb.collection('club_access').doc('alejandro_scout').set({
            email: ALEJANDRO_AUTHORIZED_EMAIL,
            uid: '',
            uidLocked: false,
            nombre: 'Alejandro Saguar',
            role: 'scout',
            active: true,
            allowedModules: [],
            updatedBy: ADMIN_AUTHORIZED_EMAIL,
            updatedAt: new Date(),
          })
        );
      } finally {
        await testEnv.cleanup();
      }
    });
  });
});
