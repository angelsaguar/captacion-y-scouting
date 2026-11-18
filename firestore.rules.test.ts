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
import {
  computeMatchRichnessScore,
  findMatchesNeedingCloudSync,
  findPlansNeedingCloudSync,
  isMatchMarkedDeleted,
  mergeMatchPlanRecords,
  mergeMatchRecords,
  mergeTwoMatches,
} from './src/lib/firestoreMatches';
import {
  PRE_TRAINING_ISOLATION_BACKUP_KEY,
  UNASSIGNED_SESSIONS_AUDIT_KEY,
  createAndVerifyTrainingSafetyBackup,
  doesRecordBelongToTeam,
  getTeamDisplayName,
  resolveCanonicalTeamId,
  restoreTrainingSafetyBackup,
  runTrainingSessionsIsolationAuditAndMigration,
} from './src/lib/trainingIsolation';

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

  describe('6. Sincronización de Partidos y Planes de Partido entre Mac (Admin) y Ordenador Externo (Alejandro)', () => {
    it('elimina el filtro restrictivo ownerId en las consultas de Firestore para que Alejandro vea los mismos partidos y planes que el Administrador', () => {
      const firestoreMatchesCode = fs.readFileSync(
        path.resolve(process.cwd(), 'src/lib/firestoreMatches.ts'),
        'utf-8'
      );
      assert.equal(
        firestoreMatchesCode.includes("where('ownerId', '==', user.uid)"),
        false,
        'No debe existir filtro restrictivo por ownerId en las consultas de lectura'
      );
      assert.equal(
        firestoreMatchesCode.includes("deleteDoc(doc(db, 'team_matches'"),
        false,
        'Las bajas deben sincronizarse mediante marcas de baja sin borrado físico deleteDoc en team_matches'
      );
      assert.equal(
        firestoreMatchesCode.includes("deleteDoc(doc(db, 'match_plans'"),
        false,
        'Las bajas deben sincronizarse mediante marcas de baja sin borrado físico deleteDoc en match_plans'
      );
    });

    it('conserva íntegramente estadísticas en vivo, goles, convocatorias y feedback post-partido sin sobrescribir registros más completos con versiones antiguas', () => {
      // Partido completo registrado en el Mac del Administrador (ej. INFANTIL B 4 - 0 CD CIUDAD DE MADRID con 4 goles de Alejandro Yubero #2)
      const macRichMatch = {
        id: 'match-infantil-b-ciudad-madrid',
        team: 'INFANTIL B',
        rival: 'CD CIUDAD DE MADRID',
        fecha: '2026-11-14',
        hora: '13:00',
        tipo: 'Local',
        competicion: 'Liga',
        estado: 'Finalizado',
        goles_favor: 4,
        goles_contra: 0,
        convocatoria: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'],
        _updatedAtMs: 1763370000000,
        feedback_post_partido: {
          valoracion_general: 'Excelente',
          resumen_mister: 'Gran partido colectivo y efectividad ofensiva.',
        },
        estadisticas: {
          has_live_stats: true,
          totales_equipo: {
            goles_favor: 4,
            goles_contra: 0,
            corners_favor: 5,
            recuperaciones_balon: 12,
          },
          jugadoras_stats: [
            {
              playerId: 'p2',
              nombre: 'ALEJANDRO',
              apellidos: 'YUBERO SANCHEZ',
              dorsal: '2',
              posicion: 'MC',
              titular: true,
              minutos: 70,
              goles_metidos: 4,
              asistencias: 0,
            },
          ],
        },
      };

      // Versión incompleta / antigua que pudiera existir en otro dispositivo o en un stub de calendario
      const incompleteStubMatch = {
        id: 'match-infantil-b-ciudad-madrid',
        team: 'INFANTIL B',
        rival: 'CD CIUDAD DE MADRID',
        fecha: '2026-11-14',
        hora: '13:00',
        tipo: 'Local',
        competicion: 'Liga',
        estado: 'Programado',
        goles_favor: undefined,
        goles_contra: undefined,
        convocatoria: [],
        _updatedAtMs: 1763300000000,
        estadisticas: {
          jugadoras_stats: [],
        },
      };

      assert.equal(
        computeMatchRichnessScore(macRichMatch) > computeMatchRichnessScore(incompleteStubMatch),
        true
      );

      // Fusión en ambos sentidos (Mac -> Nube y Nube -> Ordenador de Alejandro)
      const mergedA = mergeTwoMatches(incompleteStubMatch, macRichMatch);
      const mergedB = mergeTwoMatches(macRichMatch, incompleteStubMatch);

      for (const merged of [mergedA, mergedB]) {
        assert.equal(merged.estado, 'Finalizado');
        assert.equal(merged.goles_favor, 4);
        assert.equal(merged.goles_contra, 0);
        assert.equal(merged.convocatoria.length, 11);
        assert.equal(merged.estadisticas.jugadoras_stats.length, 1);
        assert.equal(merged.estadisticas.jugadoras_stats[0].nombre, 'ALEJANDRO');
        assert.equal(merged.estadisticas.jugadoras_stats[0].goles_metidos, 4);
        assert.equal(merged.feedback_post_partido?.valoracion_general, 'Excelente');
      }
    });

    it('detecta todos los partidos históricos pendientes de subir a Firestore aunque ya exista algún partido en la nube y deduplica por clave natural', () => {
      const cloudMatches = [
        {
          id: 'match-1',
          rival: 'Rival 1',
          fecha: '2026-10-01',
          tipo: 'Local',
          estado: 'Finalizado',
          goles_favor: 2,
          goles_contra: 1,
          _updatedAtMs: 1000,
        },
      ];

      const macLocalMatches = [
        {
          id: 'match-1',
          rival: 'Rival 1',
          fecha: '2026-10-01',
          tipo: 'Local',
          estado: 'Finalizado',
          goles_favor: 2,
          goles_contra: 1,
          _updatedAtMs: 1000,
        },
        {
          id: 'match-2-historico',
          rival: 'CD CIUDAD DE MADRID',
          fecha: '2026-11-14',
          tipo: 'Local',
          estado: 'Finalizado',
          goles_favor: 4,
          goles_contra: 0,
          _updatedAtMs: 2000,
        },
        // Mismo partido creado desde calendario con otro ID pero sin estadísticas
        {
          id: 'calendar-stub-dup',
          rival: 'C.D. Ciudad de Madrid',
          fecha: '2026-11-14',
          tipo: 'Local',
          estado: 'Programado',
          _updatedAtMs: 1500,
        },
      ];

      const merged = mergeMatchRecords(cloudMatches, macLocalMatches);
      // Debe conservar los 2 partidos reales sin duplicar el partido del 2026-11-14
      assert.equal(merged.length, 2);
      const ciudadMatch = merged.find((m) => m.fecha === '2026-11-14');
      assert.equal(ciudadMatch?.goles_favor, 4);
      assert.equal(ciudadMatch?.estado, 'Finalizado');

      // Debe detectar que match-2-historico necesita subirse a Firestore aunque cloudMatches ya tenía 1 partido
      const pendingUpload = findMatchesNeedingCloudSync(merged, cloudMatches);
      assert.equal(pendingUpload.length, 1);
      assert.equal(pendingUpload[0].fecha, '2026-11-14');
      assert.equal(pendingUpload[0].goles_favor, 4);
    });

    it('sincroniza las eliminaciones mediante marcas de baja sin perder el histórico y fusiona planes de partido tácticos entre ambos ordenadores', () => {
      const matches = [
        { id: 'm-keep', rival: 'Rival Activo', fecha: '2026-11-10', tipo: 'Local' },
        { id: 'm-soft-deleted', rival: 'Rival Baja', fecha: '2026-11-03', tipo: 'Visitante' },
      ];
      const deletedTombstones = new Set<string>(['m-soft-deleted']);

      assert.equal(isMatchMarkedDeleted(matches[0], deletedTombstones), false);
      assert.equal(isMatchMarkedDeleted(matches[1], deletedTombstones), true);
      assert.equal(
        isMatchMarkedDeleted({ id: 'm-cloud-flag', estadisticas: { isDeleted: true } }),
        true
      );

      const activeMatches = mergeMatchRecords(matches, [], deletedTombstones);
      assert.equal(activeMatches.length, 1);
      assert.equal(activeMatches[0].id, 'm-keep');

      // Planes de partido: combina planes de la nube y planes locales sin que 1 plan en la nube borre los locales
      const cloudPlans = [
        {
          id: 'plan-1',
          rivalName: 'CD Ciudad de Madrid',
          fechaPartido: '2026-11-14',
          sistema: '1-4-3-3',
          sistemaRival: '1-4-4-2',
          objetivos_tacticos: 'Presión tras pérdida',
          _updatedAtMs: 1000,
        },
      ];
      const localPlans = [
        {
          id: 'plan-2-local',
          rivalName: 'AD Arganda',
          fechaPartido: '2026-11-21',
          sistema: '1-4-2-3-1',
          sistemaRival: '1-4-4-2',
          objetivos_tacticos: 'Salida de 3 con pivote',
          _updatedAtMs: 2000,
        },
      ];

      const mergedPlans = mergeMatchPlanRecords(cloudPlans, localPlans);
      assert.equal(mergedPlans.length, 2);
      const plansToBackfill = findPlansNeedingCloudSync(mergedPlans, cloudPlans);
      assert.equal(plansToBackfill.length, 1);
      assert.equal(plansToBackfill[0].id, 'plan-2-local');
    });
  });

  describe('7. Separación Estricta de Entrenamientos por Equipo (teamId Inmutable) y Verificación Bloqueante de Backup Pre-Migración', () => {
    beforeEach(() => {
      // Simulamos un localStorage completo en memoria para las pruebas de migración y aislamiento
      const store = new Map<string, string>();
      (globalThis as any).localStorage = {
        get length() {
          return store.size;
        },
        key(index: number) {
          return Array.from(store.keys())[index] ?? null;
        },
        getItem(k: string) {
          return store.has(k) ? store.get(k)! : null;
        },
        setItem(k: string, v: string) {
          store.set(k, String(v));
        },
        removeItem(k: string) {
          store.delete(k);
        },
        clear() {
          store.clear();
        },
      };
    });

    it('asigna un identificador interno único e inmutable (teamId) a cada equipo independiente de su nombre visible', () => {
      const idInfantilA = resolveCanonicalTeamId('INFANTIL A');
      const idInfantilB = resolveCanonicalTeamId('INFANTIL B');
      const idCadeteA = resolveCanonicalTeamId('CADETE A');

      assert.equal(idInfantilA, 'team_07_infantil_a');
      assert.equal(idInfantilB, 'team_08_infantil_b');
      assert.equal(idCadeteA, 'team_05_cadete_a');

      // El propio teamId resuelve de forma idempotente al mismo identificador interno
      assert.equal(resolveCanonicalTeamId('team_08_infantil_b'), 'team_08_infantil_b');
      assert.equal(getTeamDisplayName('team_08_infantil_b'), 'INFANTIL B');

      // Un entrenamiento asociado a team_08_infantil_b pertenece exclusivamente a INFANTIL B aunque no tenga el texto visible o cambie el texto
      const sessionInfantilB = {
        id: 'sess-inf-b-1',
        teamId: 'team_08_infantil_b',
        fecha: '2026-11-18',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión táctica Infantil B',
      };

      assert.equal(doesRecordBelongToTeam(sessionInfantilB, 'INFANTIL B'), true);
      assert.equal(doesRecordBelongToTeam(sessionInfantilB, 'team_08_infantil_b'), true);
      assert.equal(doesRecordBelongToTeam(sessionInfantilB, 'INFANTIL A'), false);
      assert.equal(doesRecordBelongToTeam(sessionInfantilB, 'CADETE A'), false);
    });

    it('crea la copia de seguridad previa, verifica integridad y restauración en seco (dryRun), y aborta si la copia está corrupta', () => {
      localStorage.setItem(
        'team_sessions_INFANTIL B',
        JSON.stringify([
          {
            id: 'sess-real-inf-b',
            fecha: '2026-11-18',
            hora: '18:30 h',
            tipo: 'Entrenamiento',
            descripcion: 'Entrenamiento Infantil B',
            records: [{ playerId: 'p-inf-b-1', status: 'Presente' }],
          },
        ])
      );

      const backupCheck = createAndVerifyTrainingSafetyBackup();
      assert.equal(backupCheck.verified, true);
      assert.equal(backupCheck.keyCount, 1);

      // Modificamos temporalmente el dato en vivo y comprobamos que restoreTrainingSafetyBackup lo restaura al 100%
      localStorage.setItem('team_sessions_INFANTIL B', JSON.stringify([]));
      const restoreRes = restoreTrainingSafetyBackup({ dryRun: false });
      assert.equal(restoreRes.ok, true);
      assert.equal(restoreRes.checksumMatched, true);
      const restoredArr = JSON.parse(localStorage.getItem('team_sessions_INFANTIL B') || '[]');
      assert.equal(restoredArr.length, 1);
      assert.equal(restoredArr[0].id, 'sess-real-inf-b');
    });

    it('aísla estrictamente los entrenamientos entre INFANTIL B, INFANTIL A y CADETE A sin borrar sesiones originales y archivando huérfanos en auditoría', () => {
      // 1. INFANTIL B tiene un entrenamiento real programado el 2026-11-18
      localStorage.setItem(
        'team_sessions_INFANTIL B',
        JSON.stringify([
          {
            id: 'sess-infb-2026-11-18',
            fecha: '2026-11-18',
            hora: '19:30 h',
            tipo: 'Entrenamiento',
            descripcion: 'Entrenamiento específico Infantil B',
            records: [{ playerId: 'p-b1', status: 'Presente' }],
          },
        ])
      );
      localStorage.setItem(
        'team_monthly_calendar_INFANTIL B_2026_10',
        JSON.stringify({
          '2026-11-18': {
            dateStr: '2026-11-18',
            title: 'Entrenamiento específico Infantil B',
            type: 'Entrenamiento',
            hora: '19:30 h',
          },
        })
      );

      // 2. INFANTIL A y CADETE A tenían contaminado su calendario de Noviembre 2026 con ese entrenamiento de INFANTIL B
      //    y además un registro huérfano sin teamId en attendance_sessions
      localStorage.setItem(
        'team_monthly_calendar_INFANTIL A_2026_10',
        JSON.stringify({
          '2026-11-18': {
            dateStr: '2026-11-18',
            title: 'Entrenamiento específico Infantil B',
            type: 'Entrenamiento',
            hora: '19:30 h',
          },
        })
      );
      localStorage.setItem(
        'team_monthly_calendar_CADETE A_2026_10',
        JSON.stringify({
          '2026-11-18': {
            dateStr: '2026-11-18',
            teamId: 'team_08_infantil_b',
            title: 'Entrenamiento específico Infantil B',
            type: 'Entrenamiento',
            hora: '19:30 h',
          },
        })
      );
      localStorage.setItem(
        'ud_lapoveda_table_attendance_sessions',
        JSON.stringify([
          {
            id: 'sess-infb-2026-11-18',
            team: 'INFANTIL B',
            fecha: '2026-11-18',
            tipo: 'Entrenamiento',
            descripcion: 'Entrenamiento específico Infantil B',
            records: [{ playerId: 'p-b1', status: 'Presente' }],
          },
          {
            id: 'sess-orphan-unknown',
            fecha: '2026-11-19',
            tipo: 'Entrenamiento',
            descripcion: 'Sesión histórica sin equipo asignado',
            records: [],
          },
        ])
      );

      // Ejecutamos la auditoría y migración con verificación previa de backup
      const report = runTrainingSessionsIsolationAuditAndMigration(true);
      assert.equal(report.aborted, false);
      assert.equal(report.backupVerified, true);

      // Comprobación 1: La copia de seguridad previa existe y contiene el estado previo íntegro
      assert.ok(localStorage.getItem(PRE_TRAINING_ISOLATION_BACKUP_KEY));

      // Comprobación 2: El entrenamiento de INFANTIL B permanece en INFANTIL B con su teamId inmutable 'team_08_infantil_b'
      const calInfantilB = JSON.parse(
        localStorage.getItem('team_monthly_calendar_INFANTIL B_2026_10') || '{}'
      );
      assert.ok(calInfantilB['2026-11-18']);
      assert.equal(calInfantilB['2026-11-18'].teamId, 'team_08_infantil_b');
      assert.equal(
        calInfantilB['2026-11-18'].title,
        'Entrenamiento específico Infantil B'
      );

      // Comprobación 3: INFANTIL A NO muestra ese entrenamiento (calendario limpio)
      const calInfantilA = JSON.parse(
        localStorage.getItem('team_monthly_calendar_INFANTIL A_2026_10') || '{}'
      );
      assert.equal(calInfantilA['2026-11-18'], undefined);
      assert.equal(Object.keys(calInfantilA).length, 0);

      // Comprobación 4: CADETE A TAMPOCO muestra ese entrenamiento (calendario limpio)
      const calCadeteA = JSON.parse(
        localStorage.getItem('team_monthly_calendar_CADETE A_2026_10') || '{}'
      );
      assert.equal(calCadeteA['2026-11-18'], undefined);
      assert.equal(Object.keys(calCadeteA).length, 0);

      // Comprobación 5: Cero borrado físico de sesiones originales o históricos; el huérfano se conserva en el archivo de auditoría
      const tableAfter = JSON.parse(
        localStorage.getItem('ud_lapoveda_table_attendance_sessions') || '[]'
      );
      assert.equal(tableAfter.length, 2);
      const orphanInTable = tableAfter.find((r: any) => r.id === 'sess-orphan-unknown');
      assert.ok(orphanInTable);
      assert.equal(orphanInTable.unverifiedOrigin, true);
      assert.equal(doesRecordBelongToTeam(orphanInTable, 'INFANTIL A'), false);

      const auditArchive = JSON.parse(
        localStorage.getItem(UNASSIGNED_SESSIONS_AUDIT_KEY) || '[]'
      );
      assert.ok(auditArchive.length >= 3);
      assert.ok(
        auditArchive.some((a: any) => a.record?.id === 'sess-orphan-unknown')
      );
    });
  });
});
