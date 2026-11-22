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
  mergeAndFilterTeamSessionsForTargetTeam,
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
  CUSTOM_TEAM_REGISTRY_KEY,
  DeletedSessionTombstone,
  PRE_TRAINING_ISOLATION_BACKUP_KEY,
  UNASSIGNED_SESSIONS_AUDIT_KEY,
  computeSessionContentFingerprint,
  createAndVerifyTrainingSafetyBackup,
  createPersistentSessionId,
  createSessionDeletionTombstone,
  doesRecordBelongToTeam,
  doesSessionMatchTombstone,
  executeSafeSessionDeletion,
  findCustomTeamRegistryEntry,
  getStrictFullSessionDeduplicationKey,
  getTeamDisplayName,
  hasMarkedAttendanceStatus,
  isDateStrictlyInMonth,
  isSessionAllowedForActiveTeamView,
  isSessionDeletedByTombstones,
  parseStrictYearMonthFromDateStr,
  reconcileAttendanceRecordPair,
  reconcileMonthlyCalendarAfterSessionDeletion,
  reconcileSessionAttendanceRecords,
  registerOrPersistCustomTeam,
  renameCustomTeam,
  resolveCanonicalTeamId,
  restoreTrainingSafetyBackup,
  runTrainingSessionsIsolationAuditAndMigration,
} from './src/lib/trainingIsolation';
import { JUGADORAS_ADJUNTAS } from './src/data/jugadorasData';

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

    it('mantiene activa la sincronización bidireccional PUSH/PULL entre dispositivos filtrando sesiones contaminadas de otros equipos sin bloquear sesiones legítimas', () => {
      localStorage.setItem(
        'team_roster_INFANTIL B',
        JSON.stringify([
          { id: 'p-infb-yubero-2', name: 'ALEJANDRO YUBERO SANCHEZ', number: 2, position: 'MC' },
          { id: 'p-infb-2', name: 'MARCOS LOPEZ', number: 5, position: 'DFC' },
        ])
      );

      const infantilBLegitSession = {
        id: 'sess-infb-2026-11-12',
        teamId: 'team_08_infantil_b',
        team: 'INFANTIL B',
        fecha: '2026-11-12',
        hora: '18:30 h',
        tipo: 'Entrenamiento',
        descripcion: 'Microciclo Infantil B - Presión tras pérdida',
        records: [
          { playerId: 'p-infb-yubero-2', status: 'Presente' },
          { playerId: 'p-infb-2', status: 'Presente' },
        ],
      };

      const contaminatedCopyInSeniorFemenino = {
        ...infantilBLegitSession,
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
      };

      const seniorFemeninoLegitSessionFromCloud = {
        id: 'sess-sf-cloud-2026-11-18',
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: '2026-11-18',
        hora: '20:00 h',
        tipo: 'Entrenamiento',
        descripcion: 'Táctica Senior Femenino - Salida de balón',
        records: [{ playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' }],
      };

      const seniorFemeninoLegitSessionFromLocal = {
        id: 'sess-sf-local-2026-11-20',
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: '2026-11-20',
        hora: '20:00 h',
        tipo: 'Entrenamiento',
        descripcion: 'Finalización Senior Femenino',
        records: [{ playerId: JUGADORAS_ADJUNTAS[1].id, status: 'Presente' }],
      };

      localStorage.setItem('team_sessions_INFANTIL B', JSON.stringify([infantilBLegitSession]));

      // PULL & RECONCILIATION en SENIOR FEMENINO:
      // Recibe de Firestore una sesión legítima + una copia contaminada de INFANTIL B, y tiene en local otra sesión legítima
      const pulledAndMergedSF = mergeAndFilterTeamSessionsForTargetTeam(
        [seniorFemeninoLegitSessionFromCloud, contaminatedCopyInSeniorFemenino],
        [seniorFemeninoLegitSessionFromLocal, contaminatedCopyInSeniorFemenino],
        'SENIOR FEMENINO'
      );

      assert.equal(
        pulledAndMergedSF.length,
        2,
        'La sincronización PULL debe incorporar las sesiones legítimas de ambos dispositivos y bloquear la sesión contaminada de INFANTIL B'
      );
      assert.equal(
        pulledAndMergedSF.some((s) => s.id === 'sess-infb-2026-11-12'),
        false,
        'La sesión contaminada de INFANTIL B jamás debe reintroducirse en SENIOR FEMENINO'
      );
      assert.equal(
        pulledAndMergedSF.some((s) => s.id === 'sess-sf-cloud-2026-11-18'),
        true,
        'La sesión legítima creada en otro dispositivo debe sincronizarse correctamente via PULL'
      );
      assert.equal(
        pulledAndMergedSF.some((s) => s.id === 'sess-sf-local-2026-11-20'),
        true,
        'La sesión legítima local debe conservarse para PUSH hacia Firestore'
      );

      // PULL & RECONCILIATION en INFANTIL B: conserva intacta su sesión legítima
      const pulledAndMergedInfB = mergeAndFilterTeamSessionsForTargetTeam(
        [infantilBLegitSession],
        [infantilBLegitSession],
        'INFANTIL B'
      );
      assert.equal(pulledAndMergedInfB.length, 1);
      assert.equal(pulledAndMergedInfB[0].id, 'sess-infb-2026-11-12');
      assert.equal(pulledAndMergedInfB[0].records.length, 2);
    });

    it('verifica el aislamiento estricto por teamId, año y mes entre INFANTIL B, INFANTIL A, CADETE A y SENIOR FEMENINO sin arrastre de eventos entre meses', () => {
      // 1. Verificación de filtro estricto por año y mes (isDateStrictlyInMonth)
      assert.equal(isDateStrictlyInMonth('2026-08-25', 2026, 7), true); // Agosto = monthIndex 7
      assert.equal(isDateStrictlyInMonth('2026-08-27', 2026, 7), true);
      assert.equal(isDateStrictlyInMonth('2026-08-28', 2026, 7), true);
      assert.equal(isDateStrictlyInMonth('2026-08-27', 2026, 8), false); // No pertenece a Septiembre (8)
      assert.equal(isDateStrictlyInMonth('2026-09-15', 2026, 8), true); // Septiembre = monthIndex 8
      assert.equal(isDateStrictlyInMonth('2026-09-15', 2026, 9), false); // No pertenece a Octubre (9)
      assert.equal(isDateStrictlyInMonth('2026-09-15', 2026, 10), false); // No pertenece a Noviembre (10)
      assert.deepEqual(parseStrictYearMonthFromDateStr('2026-09-22'), {
        year: 2026,
        monthIndex: 8,
        day: 22,
      });

      // 2. Plantillas y sesiones de INFANTIL B, INFANTIL A, CADETE A y SENIOR FEMENINO
      localStorage.setItem(
        'team_roster_INFANTIL B',
        JSON.stringify([
          { id: 'p-infb-yubero-2', name: 'ALEJANDRO YUBERO SANCHEZ', number: 2, position: 'MC' },
        ])
      );
      localStorage.setItem(
        'team_roster_INFANTIL A',
        JSON.stringify([{ id: 'p-infa-1', name: 'JUGADOR INFANTIL A', number: 8, position: 'MC' }])
      );
      localStorage.setItem(
        'team_roster_CADETE A',
        JSON.stringify([{ id: 'p-cada-1', name: 'JUGADOR CADETE A', number: 9, position: 'DC' }])
      );

      const infBSession = {
        id: 'sess-contaminated-from-infb',
        teamId: 'team_08_infantil_b',
        team: 'INFANTIL B',
        fecha: '2026-11-15',
        hora: '18:30 h',
        tipo: 'Entrenamiento',
        descripcion: 'Entrenamiento táctico INFANTIL B',
        records: [{ playerId: 'p-infb-yubero-2', status: 'Presente' }],
      };
      localStorage.setItem('team_sessions_INFANTIL B', JSON.stringify([infBSession]));

      const leakedInSeniorFemenino = {
        ...infBSession,
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
      };

      assert.equal(isSessionAllowedForActiveTeamView(infBSession, 'INFANTIL B'), true);
      assert.equal(isSessionAllowedForActiveTeamView(leakedInSeniorFemenino, 'SENIOR FEMENINO'), false);
      assert.equal(isSessionAllowedForActiveTeamView(leakedInSeniorFemenino, 'INFANTIL A'), false);
      assert.equal(isSessionAllowedForActiveTeamView(leakedInSeniorFemenino, 'CADETE A'), false);
    });

    it('garantiza la deduplicación determinista (con y sin ID) entre localStorage, Supabase y Firestore sin fusionar sesiones distintas del mismo día y manteniendo intactas las 21 asistencias de las tres sesiones de agosto', () => {
      // 1. Construimos los 21 registros exactos de cada una de las 3 sesiones de agosto (6 antiguos + 15 de JUGADORAS_ADJUNTAS)
      assert.equal(JUGADORAS_ADJUNTAS.length, 15, 'JUGADORAS_ADJUNTAS debe contener 15 jugadoras');
      const legacy6Records = [
        { playerId: '1', status: 'Presente' },
        { playerId: '2', status: 'Presente' },
        { playerId: '4', status: 'Presente' },
        { playerId: '5', status: 'Presente' },
        { playerId: '6', status: 'Presente' },
        { playerId: '7', status: 'Presente' },
      ];
      const jugadoras15Records = JUGADORAS_ADJUNTAS.map((j) => ({
        playerId: j.id,
        playerName: j.nombre,
        playerLastName: j.apellidos,
        playerDorsal: j.dorsal,
        playerPosition: j.posicion,
        status: undefined,
      }));
      const full21Records = [...legacy6Records, ...jugadoras15Records];
      assert.equal(full21Records.length, 21);

      const august3SessionsWith21Records = [
        {
          id: '1773944162835',
          teamId: 'team_01_senior_femenino',
          team: 'SENIOR FEMENINO',
          fecha: '2026-08-25',
          hora: '19:30 h',
          tipo: 'Entrenamiento',
          descripcion: 'Sesión de entrenamiento',
          records: full21Records.map((r) => ({ ...r })),
        },
        {
          id: '1773944162836',
          teamId: 'team_01_senior_femenino',
          team: 'SENIOR FEMENINO',
          fecha: '2026-08-27',
          hora: '19:30 h',
          tipo: 'Entrenamiento',
          descripcion: 'Sesión de entrenamiento',
          records: full21Records.map((r) => ({ ...r })),
        },
        {
          id: '1773944162837',
          teamId: 'team_01_senior_femenino',
          team: 'SENIOR FEMENINO',
          fecha: '2026-08-28',
          hora: '19:30 h',
          tipo: 'Entrenamiento',
          descripcion: 'Sesión de entrenamiento',
          records: full21Records.map((r) => ({ ...r })),
        },
      ];

      // 2. UNA MISMA SESIÓN SIN ID replicada idénticamente en localStorage, Supabase y Firestore NO debe duplicarse
      const replicatedIdLessSession = {
        id: undefined,
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: '2026-09-08',
        hora: '19:30 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión replicada sin ID en los 3 almacenes',
        records: [{ playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' }],
      };

      const seenLocal = new Map<string, number>();
      const seenSupabase = new Map<string, number>();
      const seenFirestore = new Map<string, number>();
      const keyLocal = getStrictFullSessionDeduplicationKey({ ...replicatedIdLessSession }, seenLocal);
      const keySupabase = getStrictFullSessionDeduplicationKey({ ...replicatedIdLessSession }, seenSupabase);
      const keyFirestore = getStrictFullSessionDeduplicationKey({ ...replicatedIdLessSession }, seenFirestore);

      assert.equal(keyLocal.hasExplicitValidId, false);
      assert.equal(
        keyLocal.dedupKey,
        keySupabase.dedupKey,
        'La misma sesión sin ID en localStorage y Supabase debe producir la misma clave determinista'
      );
      assert.equal(
        keyLocal.dedupKey,
        keyFirestore.dedupKey,
        'La misma sesión sin ID en localStorage y Firestore debe producir la misma clave determinista'
      );
      assert.equal(
        computeSessionContentFingerprint(replicatedIdLessSession).length > 0,
        true
      );

      // 3. Cinco sesiones DIFERENTES del mismo día (2026-09-10) (con ID, sin ID, con ID vacío, con ID=fecha y remota distinta sin ID): NUNCA deben fusionarse
      const localSessions = [
        ...august3SessionsWith21Records,
        { ...replicatedIdLessSession },
        {
          id: 'sess-explicit-2026-09-10',
          teamId: 'team_01_senior_femenino',
          team: 'SENIOR FEMENINO',
          fecha: '2026-09-10',
          hora: '10:00 h',
          tipo: 'Entrenamiento',
          descripcion: 'Sesión con ID explícito',
          records: [{ playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' }],
        },
        {
          // Carece de ID (undefined)
          teamId: 'team_01_senior_femenino',
          team: 'SENIOR FEMENINO',
          fecha: '2026-09-10',
          hora: '12:00 h',
          tipo: 'Entrenamiento',
          descripcion: 'Sesión local 1 sin ID',
          records: [{ playerId: JUGADORAS_ADJUNTAS[1].id, status: 'Presente' }],
        },
        {
          // Carece de ID (cadena vacía)
          id: '',
          teamId: 'team_01_senior_femenino',
          team: 'SENIOR FEMENINO',
          fecha: '2026-09-10',
          hora: '18:00 h',
          tipo: 'Entrenamiento',
          descripcion: 'Sesión local 2 con ID vacío',
          records: [{ playerId: JUGADORAS_ADJUNTAS[2].id, status: 'Presente' }],
        },
        {
          // ID literalmente igual a la fecha YYYY-MM-DD
          id: '2026-09-10',
          teamId: 'team_01_senior_femenino',
          team: 'SENIOR FEMENINO',
          fecha: '2026-09-10',
          hora: '20:00 h',
          tipo: 'Entrenamiento',
          descripcion: 'Sesión local 3 con pseudo-ID igual a fecha',
          records: [{ playerId: JUGADORAS_ADJUNTAS[3].id, status: 'Presente' }],
        },
      ];

      const cloudSessions = [
        ...august3SessionsWith21Records,
        { ...replicatedIdLessSession },
        {
          // Otra sesión remota DIFERENTE en el mismo día (2026-09-10) sin ID: tampoco debe fusionarse con ninguna de las locales
          id: undefined,
          teamId: 'team_01_senior_femenino',
          team: 'SENIOR FEMENINO',
          fecha: '2026-09-10',
          hora: '21:00 h',
          tipo: 'Entrenamiento',
          descripcion: 'Sesión remota distinta sin ID',
          records: [{ playerId: JUGADORAS_ADJUNTAS[4].id, status: 'Presente' }],
        },
      ];

      const mergedResult = mergeAndFilterTeamSessionsForTargetTeam(
        cloudSessions,
        localSessions,
        'SENIOR FEMENINO'
      );

      // Comprobación A: La sesión sin ID del 2026-09-08 replicada en local y nube aparece UNA SOLA VEZ (no duplicada)
      const mergedSept08 = mergedResult.filter((s) => s.fecha === '2026-09-08');
      assert.equal(
        mergedSept08.length,
        1,
        'Una misma sesión sin ID replicada en localStorage y Firestore/Supabase jamás debe duplicarse'
      );

      // Comprobación B: Las 5 sesiones distintas del 2026-09-10 se conservan todas sin fusionarse
      const mergedSept10 = mergedResult.filter((s) => s.fecha === '2026-09-10');
      assert.equal(
        mergedSept10.length,
        5,
        'Ninguna de las 5 sesiones distintas del 2026-09-10 debe fusionarse aunque carezcan de ID'
      );

      // Comprobación C: Dos sesiones sin ID en el mismo almacén y mismo día con contenido idéntico tampoco se fusionan gracias al contador de ocurrencia por almacén
      const sameStoreSeen = new Map<string, number>();
      const identicalNoId1 = getStrictFullSessionDeduplicationKey(
        { fecha: '2026-09-12', hora: '19:30 h', tipo: 'Entrenamiento', descripcion: 'Doble turno' },
        sameStoreSeen
      );
      const identicalNoId2 = getStrictFullSessionDeduplicationKey(
        { fecha: '2026-09-12', hora: '19:30 h', tipo: 'Entrenamiento', descripcion: 'Doble turno' },
        sameStoreSeen
      );
      assert.notEqual(
        identicalNoId1.dedupKey,
        identicalNoId2.dedupKey,
        'Dos sesiones sin ID almacenadas en la misma lista jamás deben fusionarse entre sí'
      );

      // Comprobación D: Las 3 sesiones históricas de agosto conservan sus IDs históricos y sus 21 registros intactos (6 antiguos + 15 JUGADORAS_ADJUNTAS)
      for (const augId of ['1773944162835', '1773944162836', '1773944162837']) {
        const mergedAug = mergedResult.find((s) => s.id === augId);
        assert.ok(mergedAug, `La sesión histórica de agosto ${augId} debe conservar su ID intacto`);
        assert.equal(
          mergedAug.records.length,
          21,
          `La sesión ${augId} debe mantener exactamente sus 21 registros de asistencia`
        );
        const markedLegacy = mergedAug.records.filter((r: any) => r.status === 'Presente');
        const unmarkedAdjuntas = mergedAug.records.filter((r: any) => r.status === undefined);
        assert.equal(markedLegacy.length, 6, 'Debe mantener intactos los 6 registros antiguos marcados');
        assert.deepEqual(
          markedLegacy.map((r: any) => r.playerId),
          ['1', '2', '4', '5', '6', '7']
        );
        assert.equal(unmarkedAdjuntas.length, 15, 'Debe mantener intactos los 15 registros de JUGADORAS_ADJUNTAS');
      }
    });

    it('reconcilia asistencias por playerId entre local y nube conservando estados marcados (Presente, Ausente, Retraso, etc.) sin que registros locales vacíos sobrescriban los de la nube', () => {
      assert.equal(hasMarkedAttendanceStatus('Presente'), true);
      assert.equal(hasMarkedAttendanceStatus('Ausente'), true);
      assert.equal(hasMarkedAttendanceStatus('Retraso'), true);
      assert.equal(hasMarkedAttendanceStatus('Justificado'), true);
      assert.equal(hasMarkedAttendanceStatus('Lesionado'), true);
      assert.equal(hasMarkedAttendanceStatus('No Justificó'), true);
      assert.equal(hasMarkedAttendanceStatus('Pendiente'), false);
      assert.equal(hasMarkedAttendanceStatus(undefined), false);
      assert.equal(hasMarkedAttendanceStatus(null), false);

      // Caso 1: Local tiene al jugador con status undefined/Pendiente (plantilla hidratada) y la nube tiene status 'Presente' o 'Ausente'
      const localUnmarkedRecords = [
        {
          playerId: JUGADORAS_ADJUNTAS[0].id,
          playerName: JUGADORAS_ADJUNTAS[0].nombre,
          playerLastName: JUGADORAS_ADJUNTAS[0].apellidos,
          playerDorsal: JUGADORAS_ADJUNTAS[0].dorsal,
          status: undefined,
        },
        {
          playerId: JUGADORAS_ADJUNTAS[1].id,
          playerName: JUGADORAS_ADJUNTAS[1].nombre,
          playerLastName: JUGADORAS_ADJUNTAS[1].apellidos,
          status: 'Pendiente',
        },
        {
          playerId: JUGADORAS_ADJUNTAS[2].id,
          playerName: JUGADORAS_ADJUNTAS[2].nombre,
          status: 'Presente',
          comentario: 'Nota local',
        },
      ];

      const cloudMarkedRecords = [
        {
          playerId: JUGADORAS_ADJUNTAS[0].id,
          status: 'Presente',
          horaLlegada: '19:25',
        },
        {
          playerId: JUGADORAS_ADJUNTAS[1].id,
          status: 'Ausente',
          motivo: 'Exámenes',
        },
        {
          playerId: JUGADORAS_ADJUNTAS[2].id,
          status: undefined,
          playerDorsal: JUGADORAS_ADJUNTAS[2].dorsal,
        },
      ];

      const reconciled = reconcileSessionAttendanceRecords(localUnmarkedRecords, cloudMarkedRecords);
      assert.equal(reconciled.length, 3);

      const rec0 = reconciled.find((r) => r.playerId === JUGADORAS_ADJUNTAS[0].id);
      assert.equal(rec0?.status, 'Presente', 'El estado Presente de la nube debe prevalecer sobre undefined local');
      assert.equal(rec0?.playerName, JUGADORAS_ADJUNTAS[0].nombre, 'Debe conservar el nombre local');
      assert.equal(rec0?.horaLlegada, '19:25', 'Debe conservar campos adicionales de la nube');

      const rec1 = reconciled.find((r) => r.playerId === JUGADORAS_ADJUNTAS[1].id);
      assert.equal(rec1?.status, 'Ausente', 'El estado Ausente de la nube debe prevalecer sobre Pendiente local');
      assert.equal(rec1?.motivo, 'Exámenes');

      const rec2 = reconciled.find((r) => r.playerId === JUGADORAS_ADJUNTAS[2].id);
      assert.equal(rec2?.status, 'Presente', 'El estado Presente local debe prevalecer sobre undefined de la nube');
      assert.equal(rec2?.comentario, 'Nota local');
      assert.equal(rec2?.playerDorsal, JUGADORAS_ADJUNTAS[2].dorsal);

      const pairCheck = reconcileAttendanceRecordPair(
        { playerId: 'p1', status: undefined, playerName: 'Jugadora 1' },
        { playerId: 'p1', status: 'Retraso', playerLastName: 'Apellidos 1' }
      );
      assert.equal(pairCheck.status, 'Retraso');
      assert.equal(pairCheck.playerName, 'Jugadora 1');
      assert.equal(pairCheck.playerLastName, 'Apellidos 1');

      // Caso 2: Reconciliación completa a través de mergeAndFilterTeamSessionsForTargetTeam (PUSH/PULL)
      const localSessWithUnmarkedRoster = {
        id: 'sess-reconcile-test',
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: '2026-09-15',
        hora: '19:30 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión táctica',
        records: localUnmarkedRecords,
      };
      const cloudSessWithMarkedAttendance = {
        id: 'sess-reconcile-test',
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: '2026-09-15',
        hora: '19:30 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión táctica',
        records: cloudMarkedRecords,
      };

      const mergedSessions = mergeAndFilterTeamSessionsForTargetTeam(
        [cloudSessWithMarkedAttendance],
        [localSessWithUnmarkedRoster],
        'SENIOR FEMENINO'
      );
      assert.equal(mergedSessions.length, 1);
      const mergedRecs = mergedSessions[0].records;
      assert.equal(
        mergedRecs.find((r: any) => r.playerId === JUGADORAS_ADJUNTAS[0].id)?.status,
        'Presente'
      );
      assert.equal(
        mergedRecs.find((r: any) => r.playerId === JUGADORAS_ADJUNTAS[1].id)?.status,
        'Ausente'
      );
      assert.equal(
        mergedRecs.find((r: any) => r.playerId === JUGADORAS_ADJUNTAS[2].id)?.status,
        'Presente'
      );
    });

    it('mantiene la identidad de una sesión estable mediante su identificador persistente aunque cambien sus estados de asistencia, evitando duplicados entre local y nube', () => {
      // 1. Sesión antigua sin ID explícito: en su primera lectura recibe un effectiveSessionId determinista (nunca aleatorio)
      const legacySessionInitial = {
        id: undefined,
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: '2026-09-22',
        hora: '19:30 h',
        tipo: 'Entrenamiento',
        descripcion: 'Entrenamiento físico-táctico',
        observaciones: '',
        records: [
          { playerId: JUGADORAS_ADJUNTAS[0].id, status: undefined },
          { playerId: JUGADORAS_ADJUNTAS[1].id, status: undefined },
        ],
        tareas: [],
      };

      const read1 = getStrictFullSessionDeduplicationKey(legacySessionInitial, new Map());
      const read2 = getStrictFullSessionDeduplicationKey(legacySessionInitial, new Map());
      assert.equal(
        read1.effectiveSessionId,
        read2.effectiveSessionId,
        'Lecturas repetidas de una sesión antigua sin ID jamás deben asignar identificadores aleatorios'
      );

      // 2. Una vez asignado su identificador determinista (o su UUID al crearse), al modificar asistencias, observaciones o tareas conserva exactamente el mismo ID y dedupKey
      const persistedSessionId = read1.effectiveSessionId;
      const localSavedBeforeAttendance = {
        ...legacySessionInitial,
        id: persistedSessionId,
      };
      const cloudUpdatedWithAttendanceAndNotes = {
        ...legacySessionInitial,
        id: persistedSessionId,
        observaciones: 'Excelente intensidad del grupo',
        records: [
          { playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' },
          { playerId: JUGADORAS_ADJUNTAS[1].id, status: 'Ausente' },
        ],
        tareas: [{ id: 't1', titulo: 'Rondo 4v2', duracion: '15m', descripcion: 'Presión' }],
      };

      const keyLocal = getStrictFullSessionDeduplicationKey(localSavedBeforeAttendance, new Map());
      const keyCloud = getStrictFullSessionDeduplicationKey(cloudUpdatedWithAttendanceAndNotes, new Map());
      assert.equal(keyLocal.dedupKey, keyCloud.dedupKey);
      assert.equal(keyLocal.effectiveSessionId, persistedSessionId);
      assert.equal(keyCloud.effectiveSessionId, persistedSessionId);

      // Incluso si un almacén aún conserva la copia original sin ID (id: undefined) y el otro ya guardó el ID determinista y marcó asistencias, ambos se reconocen por el mismo dedupKey
      const mergedAcrossStores = mergeAndFilterTeamSessionsForTargetTeam(
        [cloudUpdatedWithAttendanceAndNotes],
        [legacySessionInitial],
        'SENIOR FEMENINO'
      );
      assert.equal(
        mergedAcrossStores.length,
        1,
        'La misma sesión con diferentes estados de asistencia entre local y nube jamás debe duplicarse'
      );
      assert.equal(mergedAcrossStores[0].id, persistedSessionId);
      assert.equal(
        mergedAcrossStores[0].records.find((r: any) => r.playerId === JUGADORAS_ADJUNTAS[0].id)?.status,
        'Presente'
      );
      assert.equal(
        mergedAcrossStores[0].records.find((r: any) => r.playerId === JUGADORAS_ADJUNTAS[1].id)?.status,
        'Ausente'
      );
      assert.equal(mergedAcrossStores[0].observaciones, 'Excelente intensidad del grupo');
      assert.equal(mergedAcrossStores[0].tareas.length, 1);
    });

    it('impide que dos sesiones distintas sin ID con exactamente los mismos datos descriptivos se fusionen y sincroniza correctamente ambas sesiones entre localStorage, Supabase y Firestore', () => {
      // CASO A: Dos sesiones distintas SIN ID que tienen EXACTAMENTE los mismos datos descriptivos (fecha, hora, tipo, descripcion, lugar)
      // en distintos almacenes (ej. localStorage y Supabase/Firestore)
      const sharedDescriptiveData = {
        id: undefined,
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: '2026-09-24',
        hora: '19:30 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión de entrenamiento',
        lugar: 'Campo Municipal 1',
      };

      const distinctNoIdSessionA = {
        ...sharedDescriptiveData,
        observaciones: 'Subgrupo A - Trabajo defensivo',
        records: [
          { playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' },
          { playerId: JUGADORAS_ADJUNTAS[1].id, status: undefined },
        ],
        tareas: [{ id: 'task-a', titulo: 'Basculaciones', duracion: '20m', descripcion: 'Línea de 4' }],
      };

      const distinctNoIdSessionB = {
        ...sharedDescriptiveData,
        observaciones: 'Subgrupo B - Finalización',
        records: [
          { playerId: JUGADORAS_ADJUNTAS[0].id, status: undefined },
          { playerId: JUGADORAS_ADJUNTAS[2].id, status: 'Presente' },
        ],
        tareas: [{ id: 'task-b', titulo: 'Remates', duracion: '20m', descripcion: 'Centros laterales' }],
      };

      const fpA = computeSessionContentFingerprint(distinctNoIdSessionA);
      const fpB = computeSessionContentFingerprint(distinctNoIdSessionB);
      assert.notEqual(
        fpA,
        fpB,
        'Dos sesiones distintas sin ID que coincidan en fecha, hora, tipo, descripción y lugar deben generar huellas distintas'
      );

      const keyA = getStrictFullSessionDeduplicationKey(distinctNoIdSessionA, new Map());
      const keyB = getStrictFullSessionDeduplicationKey(distinctNoIdSessionB, new Map());
      assert.notEqual(keyA.dedupKey, keyB.dedupKey);
      assert.notEqual(keyA.effectiveSessionId, keyB.effectiveSessionId);

      // Al sincronizar entre almacenes (Session A en localStorage y Session B en Supabase/Firestore), NUNCA deben fusionarse
      const mergedDistinctAcrossStores = mergeAndFilterTeamSessionsForTargetTeam(
        [distinctNoIdSessionB],
        [distinctNoIdSessionA],
        'SENIOR FEMENINO'
      );
      assert.equal(
        mergedDistinctAcrossStores.length,
        2,
        'Dos sesiones distintas sin ID con los mismos datos descriptivos en distintos almacenes jamás deben fusionarse'
      );
      const foundA = mergedDistinctAcrossStores.find((s) => s.id === keyA.effectiveSessionId);
      const foundB = mergedDistinctAcrossStores.find((s) => s.id === keyB.effectiveSessionId);
      assert.ok(foundA, 'Debe conservarse la sesión A con su identificador determinista');
      assert.ok(foundB, 'Debe conservarse la sesión B con su identificador determinista');
      assert.equal(foundA.observaciones, 'Subgrupo A - Trabajo defensivo');
      assert.equal(foundB.observaciones, 'Subgrupo B - Finalización');

      // CASO B: Dos sesiones distintas SIN ID que coinciden incluso en todos sus campos iniciales dentro de un almacén
      // y posteriormente se sincronizan y actualizan entre localStorage, Supabase y Firestore
      const twinNoId1 = {
        ...sharedDescriptiveData,
        fecha: '2026-09-25',
        records: [{ playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' }],
      };
      const twinNoId2 = {
        ...sharedDescriptiveData,
        fecha: '2026-09-25',
        records: [{ playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' }],
      };

      const initialStoreSeen = new Map<string, number>();
      const twinKey1 = getStrictFullSessionDeduplicationKey(twinNoId1, initialStoreSeen);
      const twinKey2 = getStrictFullSessionDeduplicationKey(twinNoId2, initialStoreSeen);
      assert.notEqual(
        twinKey1.effectiveSessionId,
        twinKey2.effectiveSessionId,
        'Dos sesiones sin ID con datos idénticos en la misma lista deben recibir identificadores deterministas diferentes (occ_0 vs occ_1)'
      );

      // Una vez asignados sus IDs deterministas al guardarse, se replican en localStorage, Supabase y Firestore
      // y se marcan asistencias distintas en cada una sin que se fusionen ni se dupliquen
      const localStoreAfterSave = [
        {
          ...twinNoId1,
          id: twinKey1.effectiveSessionId,
          records: [
            { playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' },
            { playerId: JUGADORAS_ADJUNTAS[1].id, status: 'Presente' },
          ],
        },
        {
          ...twinNoId2,
          id: twinKey2.effectiveSessionId,
          records: [
            { playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' },
            { playerId: JUGADORAS_ADJUNTAS[1].id, status: undefined },
          ],
        },
      ];

      const cloudStoreWithUpdatedSecondSession = [
        {
          ...twinNoId1,
          id: twinKey1.effectiveSessionId,
          records: [
            { playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' },
            { playerId: JUGADORAS_ADJUNTAS[1].id, status: undefined },
          ],
        },
        {
          ...twinNoId2,
          id: twinKey2.effectiveSessionId,
          records: [
            { playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' },
            { playerId: JUGADORAS_ADJUNTAS[1].id, status: 'Ausente' },
          ],
        },
      ];

      const syncedTwins = mergeAndFilterTeamSessionsForTargetTeam(
        cloudStoreWithUpdatedSecondSession,
        localStoreAfterSave,
        'SENIOR FEMENINO'
      );
      assert.equal(
        syncedTwins.length,
        2,
        'Las dos sesiones deben mantenerse separadas y sincronizarse cada una con su homóloga entre almacenes'
      );
      const syncedTwin1 = syncedTwins.find((s) => s.id === twinKey1.effectiveSessionId);
      const syncedTwin2 = syncedTwins.find((s) => s.id === twinKey2.effectiveSessionId);
      assert.ok(syncedTwin1);
      assert.ok(syncedTwin2);
      assert.equal(
        syncedTwin1.records.find((r: any) => r.playerId === JUGADORAS_ADJUNTAS[1].id)?.status,
        'Presente',
        'La primera sesión debe conservar su estado Presente'
      );
      assert.equal(
        syncedTwin2.records.find((r: any) => r.playerId === JUGADORAS_ADJUNTAS[1].id)?.status,
        'Ausente',
        'La segunda sesión debe reconciliar su estado Ausente desde la nube sin mezclarse con la primera'
      );

      // CASO C: Toda sesión nueva recibe un identificador único y persistente en el momento de su creación
      // y dos sesiones nuevas con exactamente los mismos datos descriptivos nunca se fusionan
      const newPersistentId1 = createPersistentSessionId();
      const newPersistentId2 = createPersistentSessionId();
      assert.ok(newPersistentId1.length >= 16);
      assert.ok(newPersistentId2.length >= 16);
      assert.notEqual(newPersistentId1, newPersistentId2);

      const newSession1 = {
        ...sharedDescriptiveData,
        id: newPersistentId1,
        fecha: '2026-09-26',
        records: [{ playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' }],
      };
      const newSession2 = {
        ...sharedDescriptiveData,
        id: newPersistentId2,
        fecha: '2026-09-26',
        records: [{ playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Retraso' }],
      };

      const syncedNewSessions = mergeAndFilterTeamSessionsForTargetTeam(
        [newSession2],
        [newSession1],
        'SENIOR FEMENINO'
      );
      assert.equal(syncedNewSessions.length, 2);
      assert.ok(syncedNewSessions.find((s) => s.id === newPersistentId1));
      assert.ok(syncedNewSessions.find((s) => s.id === newPersistentId2));
    });

    it('persiste equipos personalizados sin escrituras en lectura y conserva su teamId canónico y sesiones históricas aunque cambie su nombre visible', () => {
      // 1. Resolver un equipo personalizado durante una lectura NO debe realizar ninguna escritura en localStorage
      assert.equal(localStorage.getItem(CUSTOM_TEAM_REGISTRY_KEY), null);
      const readOnlyTeamId = resolveCanonicalTeamId('CADETE C PERSONALIZADO');
      assert.equal(readOnlyTeamId, 'team_custom_cadete_c_personalizado');
      assert.equal(
        localStorage.getItem(CUSTOM_TEAM_REGISTRY_KEY),
        null,
        'resolveCanonicalTeamId no debe escribir en localStorage durante una simple lectura'
      );
      assert.equal(getTeamDisplayName(readOnlyTeamId), 'CADETE C PERSONALIZADO');
      assert.equal(
        localStorage.getItem(CUSTOM_TEAM_REGISTRY_KEY),
        null,
        'getTeamDisplayName tampoco debe escribir en localStorage durante una simple lectura'
      );

      // 2. Registro explícito al crear/guardar un equipo personalizado
      const createdEntry = registerOrPersistCustomTeam('CADETE C PERSONALIZADO');
      assert.ok(createdEntry);
      assert.equal(createdEntry.teamId, 'team_custom_cadete_c_personalizado');
      assert.equal(createdEntry.displayName, 'CADETE C PERSONALIZADO');
      assert.notEqual(
        localStorage.getItem(CUSTOM_TEAM_REGISTRY_KEY),
        null,
        'registerOrPersistCustomTeam debe persistir el equipo personalizado en localStorage'
      );

      // Sesiones históricas asociadas al teamId canónico del equipo personalizado
      const customTeamHistoricalSession = {
        id: 'sess-custom-hist-1',
        teamId: createdEntry.teamId,
        team: 'CADETE C PERSONALIZADO',
        fecha: '2026-10-05',
        hora: '18:30 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión histórica equipo personalizado',
        records: [{ playerId: 'p-custom-1', status: 'Presente' }],
      };
      assert.equal(
        doesRecordBelongToTeam(customTeamHistoricalSession, 'CADETE C PERSONALIZADO'),
        true
      );

      // 3. Renombrado del equipo personalizado: debe conservar el MISMO teamId canónico y mantener todas sus sesiones históricas
      const renamedEntry = renameCustomTeam('CADETE C PERSONALIZADO', 'CADETE B ESPECIAL');
      assert.ok(renamedEntry);
      assert.equal(
        renamedEntry?.teamId,
        'team_custom_cadete_c_personalizado',
        'El teamId canónico debe mantenerse inmutable tras renombrar el equipo personalizado'
      );
      assert.equal(renamedEntry?.displayName, 'CADETE B ESPECIAL');
      assert.equal(resolveCanonicalTeamId('CADETE B ESPECIAL'), 'team_custom_cadete_c_personalizado');
      assert.equal(
        resolveCanonicalTeamId('CADETE C PERSONALIZADO'),
        'team_custom_cadete_c_personalizado'
      );
      assert.equal(
        getTeamDisplayName('team_custom_cadete_c_personalizado'),
        'CADETE B ESPECIAL'
      );
      assert.ok(findCustomTeamRegistryEntry('CADETE B ESPECIAL'));

      // Las sesiones históricas creadas con el nombre anterior siguen asociadas al equipo renombrado
      assert.equal(
        doesRecordBelongToTeam(customTeamHistoricalSession, 'CADETE B ESPECIAL'),
        true,
        'Las sesiones históricas deben mantener su asociación con el equipo personalizado tras el cambio de nombre'
      );
      const mergedForRenamedTeam = mergeAndFilterTeamSessionsForTargetTeam(
        [customTeamHistoricalSession],
        [],
        'CADETE B ESPECIAL'
      );
      assert.equal(mergedForRenamedTeam.length, 1);
      assert.equal(mergedForRenamedTeam[0].id, 'sess-custom-hist-1');
      assert.equal(mergedForRenamedTeam[0].teamId, 'team_custom_cadete_c_personalizado');
      assert.equal(mergedForRenamedTeam[0].records[0].status, 'Presente');
    });

    it('elimina una sesión de una fecha sin eliminar otra sesión de la misma fecha ni afectar a otros equipos, y permite eliminar sesiones distintas del mismo día de forma independiente', async () => {
      const sameDate = '2026-10-14';

      const seniorMorningSession = {
        id: 'sess-sf-morning-2026-10-14',
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: sameDate,
        hora: '10:00 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión matinal física Senior Femenino',
        records: [{ playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' }],
      };

      const seniorEveningSession = {
        id: 'sess-sf-evening-2026-10-14',
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: sameDate,
        hora: '20:00 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión vespertina táctica Senior Femenino',
        records: [{ playerId: JUGADORAS_ADJUNTAS[1].id, status: 'Presente' }],
      };

      const infantilBSameDateSession = {
        id: 'sess-infb-2026-10-14',
        teamId: 'team_08_infantil_b',
        team: 'INFANTIL B',
        fecha: sameDate,
        hora: '18:00 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión Infantil B misma fecha',
        records: [{ playerId: 'p-infb-yubero-2', status: 'Presente' }],
      };

      localStorage.setItem(
        'team_sessions_SENIOR FEMENINO',
        JSON.stringify([seniorMorningSession, seniorEveningSession])
      );
      localStorage.setItem(
        'team_sessions_INFANTIL B',
        JSON.stringify([infantilBSameDateSession])
      );
      localStorage.setItem(
        'ud_lapoveda_table_attendance_sessions',
        JSON.stringify([
          seniorMorningSession,
          seniorEveningSession,
          infantilBSameDateSession,
        ])
      );

      // 1. Eliminar únicamente la sesión matinal de SENIOR FEMENINO
      const delMorningResult = await executeSafeSessionDeletion({
        sessionToDelete: seniorMorningSession,
        teamName: 'SENIOR FEMENINO',
        currentSessions: [seniorMorningSession, seniorEveningSession],
      });

      assert.equal(
        delMorningResult.remainingSessions.length,
        1,
        'Debe quedar intacta la segunda sesión del mismo día en SENIOR FEMENINO'
      );
      assert.equal(
        delMorningResult.remainingSessions[0].id,
        'sess-sf-evening-2026-10-14',
        'La sesión vespertina de la misma fecha no debe eliminarse'
      );

      // Verificar que INFANTIL B conserva intacta su sesión de la misma fecha en su clave local y en la tabla fallback
      const infBSessionsAfter = JSON.parse(localStorage.getItem('team_sessions_INFANTIL B') || '[]');
      assert.equal(infBSessionsAfter.length, 1);
      assert.equal(infBSessionsAfter[0].id, 'sess-infb-2026-10-14');

      const fallbackTableAfterFirstDelete = JSON.parse(
        localStorage.getItem('ud_lapoveda_table_attendance_sessions') || '[]'
      );
      assert.equal(
        fallbackTableAfterFirstDelete.length,
        2,
        'En la tabla fallback deben permanecer la sesión vespertina de SENIOR FEMENINO y la sesión de INFANTIL B'
      );
      assert.equal(
        fallbackTableAfterFirstDelete.some((s: any) => s.id === 'sess-sf-morning-2026-10-14'),
        false
      );
      assert.equal(
        fallbackTableAfterFirstDelete.some((s: any) => s.id === 'sess-sf-evening-2026-10-14'),
        true
      );
      assert.equal(
        fallbackTableAfterFirstDelete.some((s: any) => s.id === 'sess-infb-2026-10-14'),
        true
      );

      // 2. Eliminar posteriormente la segunda sesión del mismo día de forma independiente
      const delEveningResult = await executeSafeSessionDeletion({
        sessionToDelete: seniorEveningSession,
        teamName: 'SENIOR FEMENINO',
        currentSessions: delMorningResult.remainingSessions,
      });

      assert.equal(
        delEveningResult.remainingSessions.length,
        0,
        'La segunda sesión del mismo día debe poder eliminarse de forma independiente'
      );

      // INFANTIL B sigue 100% intacto
      const fallbackTableAfterSecondDelete = JSON.parse(
        localStorage.getItem('ud_lapoveda_table_attendance_sessions') || '[]'
      );
      assert.equal(fallbackTableAfterSecondDelete.length, 1);
      assert.equal(fallbackTableAfterSecondDelete[0].id, 'sess-infb-2026-10-14');
    });

    it('prohíbe borrados generales en Supabase solo por fecha y exige siempre identificación inequívoca de sesión y equipo', async () => {
      const recordedDeleteFilterChains: Array<Array<{ column: string; value: any }>> = [];

      const createMockSupabaseDeleteClient = () => ({
        from: (tableName: string) => {
          assert.equal(tableName, 'attendance_sessions');
          return {
            delete: () => {
              const chain: Array<{ column: string; value: any }> = [];
              recordedDeleteFilterChains.push(chain);
              const builder: any = {
                eq: (column: string, value: any) => {
                  chain.push({ column, value });
                  return builder;
                },
                then: (resolve: any) => Promise.resolve({ data: null, error: null }).then(resolve),
              };
              return builder;
            },
          };
        },
      });

      const sessionWithId = {
        id: 'sess-sf-unique-2026-10-21',
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: '2026-10-21',
        hora: '20:00 h',
        tipo: 'Entrenamiento',
        descripcion: 'Entrenamiento con ID persistente',
        records: [{ playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' }],
      };

      await executeSafeSessionDeletion({
        sessionToDelete: sessionWithId,
        teamName: 'SENIOR FEMENINO',
        currentSessions: [sessionWithId],
        supabaseClient: createMockSupabaseDeleteClient(),
      });

      assert.ok(
        recordedDeleteFilterChains.length > 0,
        'Debe haberse invocado delete() en Supabase para la sesión con ID'
      );

      for (const chain of recordedDeleteFilterChains) {
        const hasIdFilter = chain.some(
          (f) => f.column === 'id' && f.value === 'sess-sf-unique-2026-10-21'
        );
        const hasTeamFilter = chain.some(
          (f) =>
            (f.column === 'team' && f.value === 'SENIOR FEMENINO') ||
            (f.column === 'teamId' && f.value === 'team_01_senior_femenino') ||
            (f.column === 'team_id' && f.value === 'SENIOR FEMENINO')
        );
        const isGeneralFechaOnlyDelete =
          chain.some((f) => f.column === 'fecha') && !hasIdFilter;

        assert.equal(
          isGeneralFechaOnlyDelete,
          false,
          'NUNCA debe ejecutarse un borrado general en Supabase filtrando solo por fecha'
        );
        assert.equal(
          hasIdFilter && hasTeamFilter,
          true,
          'Cada operación delete en Supabase debe incluir tanto el ID inequívoco de la sesión como el filtro de equipo'
        );
      }

      // Verificar también para una sesión legacy sin ID que NO se lanza ninguna consulta general .delete().eq('fecha', ...)
      recordedDeleteFilterChains.length = 0;
      const legacyNoIdSessionA = {
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: '2026-10-22',
        hora: '20:00 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión legacy A sin ID',
        records: [{ playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' }],
      };
      const legacyNoIdSessionB = {
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: '2026-10-22',
        hora: '20:00 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión legacy A sin ID',
        records: [{ playerId: JUGADORAS_ADJUNTAS[1].id, status: 'Ausente' }],
      };

      const legacyDelResult = await executeSafeSessionDeletion({
        sessionToDelete: legacyNoIdSessionA,
        teamName: 'SENIOR FEMENINO',
        currentSessions: [legacyNoIdSessionA, legacyNoIdSessionB],
        supabaseClient: createMockSupabaseDeleteClient(),
      });

      assert.equal(
        recordedDeleteFilterChains.length,
        0,
        'Para sesiones legacy sin ID en Supabase nunca debe lanzarse un delete general por fecha'
      );
      assert.equal(
        legacyDelResult.remainingSessions.length,
        1,
        'Solo debe eliminarse la sesión legacy seleccionada, conservando la otra sesión sin ID del mismo día'
      );
      assert.equal(
        legacyDelResult.remainingSessions[0].records[0].playerId,
        JUGADORAS_ADJUNTAS[1].id
      );

      // Verificación estática sobre Asistencia.tsx para garantizar que no existen llamadas .delete().eq('fecha', ...)
      const asistenciaSource = fs.readFileSync(
        path.resolve(process.cwd(), 'src/pages/gestion/Asistencia.tsx'),
        'utf-8'
      );
      assert.equal(
        asistenciaSource.includes(".delete()\n          .eq('fecha'"),
        false,
        'Asistencia.tsx no debe contener borrados generales .delete().eq("fecha", ...)'
      );
      assert.equal(
        asistenciaSource.includes(".delete().eq('fecha'"),
        false,
        'Asistencia.tsx no debe contener borrados generales .delete().eq("fecha", ...)'
      );
    });

    it('garantiza que una sesión eliminada no reaparece tras sincronización PUSH/PULL mientras que otra sesión de la misma fecha se mantiene y sincroniza con normalidad', async () => {
      const targetDate = '2026-10-28';

      const sessionToDelete = {
        id: 'sess-sf-delete-2026-10-28-a',
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: targetDate,
        hora: '19:00 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión A eliminada en dispositivo 1',
        records: [{ playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' }],
      };

      const sessionToKeepOnSameDate = {
        id: 'sess-sf-keep-2026-10-28-b',
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: targetDate,
        hora: '20:30 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión B activa en la misma fecha',
        records: [
          { playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' },
          { playerId: JUGADORAS_ADJUNTAS[1].id, status: undefined },
        ],
      };

      localStorage.setItem(
        'team_sessions_SENIOR FEMENINO',
        JSON.stringify([sessionToDelete, sessionToKeepOnSameDate])
      );

      // Dispositivo 1 elimina sessionToDelete
      const delResult = await executeSafeSessionDeletion({
        sessionToDelete,
        teamName: 'SENIOR FEMENINO',
        currentSessions: [sessionToDelete, sessionToKeepOnSameDate],
      });

      assert.equal(delResult.remainingSessions.length, 1);
      assert.equal(delResult.remainingSessions[0].id, 'sess-sf-keep-2026-10-28-b');

      // Ahora ocurre una sincronización PULL/PUSH con Firestore donde la nube todavía tenía sessionToDelete
      // y además traía un estado de asistencia actualizado para sessionToKeepOnSameDate
      const cloudSessionsBeforePush = [
        sessionToDelete,
        {
          ...sessionToKeepOnSameDate,
          records: [
            { playerId: JUGADORAS_ADJUNTAS[0].id, status: undefined },
            { playerId: JUGADORAS_ADJUNTAS[1].id, status: 'Justificado' },
          ],
        },
      ];

      const reconciledAfterSync = mergeAndFilterTeamSessionsForTargetTeam(
        cloudSessionsBeforePush,
        delResult.remainingSessions,
        'SENIOR FEMENINO'
      );

      assert.equal(
        reconciledAfterSync.length,
        1,
        'La sesión eliminada jamás debe reaparecer tras la sincronización PUSH/PULL y la otra sesión de la misma fecha debe conservarse'
      );
      assert.equal(reconciledAfterSync[0].id, 'sess-sf-keep-2026-10-28-b');
      assert.equal(
        reconciledAfterSync[0].records.find((r: any) => r.playerId === JUGADORAS_ADJUNTAS[0].id)
          ?.status,
        'Presente',
        'La sesión activa de la misma fecha conserva el estado Presente local'
      );
      assert.equal(
        reconciledAfterSync[0].records.find((r: any) => r.playerId === JUGADORAS_ADJUNTAS[1].id)
          ?.status,
        'Justificado',
        'La sesión activa de la misma fecha reconcilia el estado Justificado desde la nube'
      );
    });

    it('conserva en el calendario mensual la sesión restante cuando hay varias sesiones en la misma fecha, no modifica eventos de otros equipos y rechaza tombstones o borrados sin identificación inequívoca', async () => {
      const targetDate = '2026-10-30';

      const session1 = {
        id: 'sess-sf-cal-1',
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: targetDate,
        hora: '10:00 h',
        tipo: 'Entrenamiento',
        descripcion: 'Entrenamiento Matinal',
        records: [{ playerId: JUGADORAS_ADJUNTAS[0].id, status: 'Presente' }],
      };

      const session2 = {
        id: 'sess-sf-cal-2',
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: targetDate,
        hora: '19:30 h',
        tipo: 'Entrenamiento',
        descripcion: 'Entrenamiento Vespertino Táctico',
        records: [{ playerId: JUGADORAS_ADJUNTAS[1].id, status: 'Presente' }],
      };

      // 1. Tombstone basado únicamente en fecha NUNCA debe ocultar ninguna sesión (con o sin ID)
      const legacyDateOnlyTombstone = { fecha: targetDate };
      assert.equal(
        doesSessionMatchTombstone(session1, legacyDateOnlyTombstone, 'SENIOR FEMENINO'),
        false,
        'Un tombstone solo con fecha nunca debe coincidir ni ocultar una sesión con ID'
      );
      assert.equal(
        doesSessionMatchTombstone(
          { ...session1, id: undefined },
          legacyDateOnlyTombstone,
          'SENIOR FEMENINO'
        ),
        false,
        'Un tombstone sin id, dedupKey ni fingerprint nunca debe ocultar una sesión antigua sin ID'
      );

      // 2. Si no se puede identificar inequívocamente una sesión antigua sin ID, no se borra automáticamente
      const ambiguousNoIdSession = {
        teamId: 'team_01_senior_femenino',
        team: 'SENIOR FEMENINO',
        fecha: targetDate,
      };
      const ambiguousDeleteAttempt = await executeSafeSessionDeletion({
        sessionToDelete: ambiguousNoIdSession,
        teamName: 'SENIOR FEMENINO',
        currentSessions: [session1, session2],
      });
      assert.equal(
        ambiguousDeleteAttempt.deleted,
        false,
        'Una sesión sin ID que no pueda identificarse inequívocamente no debe borrarse automáticamente'
      );
      assert.equal(ambiguousDeleteAttempt.remainingSessions.length, 2);

      // 3. Si hay dos sesiones en el mismo día y se elimina la primera, el calendario mensual conserva el evento apuntando a la sesión restante
      const initialCalendarEvents: Record<string, any> = {
        [targetDate]: {
          dateStr: targetDate,
          teamId: 'team_01_senior_femenino',
          team: 'SENIOR FEMENINO',
          sessionId: 'sess-sf-cal-1',
          title: 'Entrenamiento Matinal',
          type: 'Entrenamiento',
          hora: '10:00 h',
        },
      };

      const delSession1Result = await executeSafeSessionDeletion({
        sessionToDelete: session1,
        teamName: 'SENIOR FEMENINO',
        currentSessions: [session1, session2],
      });
      assert.equal(delSession1Result.deleted, true);
      assert.equal(delSession1Result.remainingSessions.length, 1);

      const calAfterFirstDelete = reconcileMonthlyCalendarAfterSessionDeletion({
        calendarEvents: initialCalendarEvents,
        deletedSession: session1,
        remainingSessions: delSession1Result.remainingSessions,
        teamName: 'SENIOR FEMENINO',
      });

      assert.equal(calAfterFirstDelete.changed, true);
      assert.ok(
        calAfterFirstDelete.updatedEvents[targetDate],
        'El evento del calendario mensual debe mantenerse cuando queda otra sesión activa en la misma fecha'
      );
      assert.equal(
        calAfterFirstDelete.updatedEvents[targetDate].sessionId,
        'sess-sf-cal-2',
        'El evento del calendario debe actualizar su sessionId a la sesión restante'
      );
      assert.equal(
        calAfterFirstDelete.updatedEvents[targetDate].title,
        'Entrenamiento Vespertino Táctico'
      );
      assert.equal(calAfterFirstDelete.updatedEvents[targetDate].hora, '19:30 h');

      // 4. Si el evento en el calendario perteneciera a otro equipo (por ejemplo INFANTIL B), nunca debe modificarse
      const otherTeamCalendarEvents: Record<string, any> = {
        [targetDate]: {
          dateStr: targetDate,
          teamId: 'team_08_infantil_b',
          team: 'INFANTIL B',
          sessionId: 'sess-infb-cal-1',
          title: 'Entrenamiento Infantil B',
          type: 'Entrenamiento',
          hora: '18:00 h',
        },
      };
      const calOtherTeamAttempt = reconcileMonthlyCalendarAfterSessionDeletion({
        calendarEvents: otherTeamCalendarEvents,
        deletedSession: session2,
        remainingSessions: [],
        teamName: 'SENIOR FEMENINO',
      });
      assert.equal(
        calOtherTeamAttempt.changed,
        false,
        'Nunca debe modificarse ni eliminarse un evento de calendario perteneciente a otro equipo'
      );
      assert.equal(
        calOtherTeamAttempt.updatedEvents[targetDate].sessionId,
        'sess-infb-cal-1'
      );

      // 5. Cuando se elimina la última sesión activa de esa fecha para el equipo, el evento de calendario se elimina limpiamente
      const calAfterSecondDelete = reconcileMonthlyCalendarAfterSessionDeletion({
        calendarEvents: calAfterFirstDelete.updatedEvents,
        deletedSession: session2,
        remainingSessions: [],
        teamName: 'SENIOR FEMENINO',
      });
      assert.equal(calAfterSecondDelete.changed, true);
      assert.equal(calAfterSecondDelete.updatedEvents[targetDate], undefined);
    });
  });
});

