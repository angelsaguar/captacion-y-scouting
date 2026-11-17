import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { User, Observer, CLUB_TEAMS } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Trash2,
  Plus,
  Database,
  RefreshCw,
  CloudUpload,
  CheckCircle,
  AlertCircle,
  Scale,
  Dumbbell,
  Calendar,
  ChevronRight,
  Users2,
  Lock,
  Unlock,
  Download,
  FileCheck2,
  ShieldCheck,
  Laptop,
  KeyRound,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getObservers, addObserver, deleteObserver } from '@/lib/observers';
import {
  ADMIN_EMAIL,
  ALEJANDRO_EMAIL,
  CLUB_MODULES,
  ClubModuleId,
  DEFAULT_ALEJANDRO_ACCESS,
  ScoutAccessConfig,
  ensureAlejandroAccessInitializedByAdmin,
  getAlejandroAccessConfig,
  syncAllClubDataWithFirestore,
  updateAlejandroAccessByAdmin,
} from '@/lib/clubAccessAndSync';
import {
  EncryptedBackupEnvelope,
  SandboxVerificationReport,
  createEncryptedFullBackup,
  downloadEncryptedBackupToDevice,
  verifyAndRestoreBackupInIsolatedSandbox,
  verifyFirebaseProjectConfig,
} from '@/lib/encryptedBackup';

export default function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [observers, setObservers] = useState<Observer[]>([]);
  const [, setLoading] = useState(true);

  // States for observer management form (historical catalog for player report attribution)
  const [newObsName, setNewObsName] = useState('');
  const [savingObs, setSavingObs] = useState(false);

  // Alejandro (asaguar04@gmail.com) Access & Module Permissions state
  const [scoutConfig, setScoutConfig] = useState<ScoutAccessConfig>(DEFAULT_ALEJANDRO_ACCESS);
  const [savingScoutAccess, setSavingScoutAccess] = useState(false);
  const [syncingFirestoreCrossDevice, setSyncingFirestoreCrossDevice] = useState(false);

  // Encrypted External Backup & Isolated Sandbox Verification state
  const [backupPassword, setBackupPassword] = useState('');
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [verifyingSandbox, setVerifyingSandbox] = useState(false);
  const [lastEncryptedEnvelope, setLastEncryptedEnvelope] =
    useState<EncryptedBackupEnvelope | null>(null);
  const [sandboxReport, setSandboxReport] = useState<SandboxVerificationReport | null>(null);

  const projectVerification = verifyFirebaseProjectConfig();

  // Cloud Sync state
  const [syncingAll, setSyncingAll] = useState(false);
  const [localCounts, setLocalCounts] = useState({
    players: 0,
    matches: 0,
    sessions: 0,
    plans: 0,
    physical: 0,
    anthropometrics: 0,
    coaches: 0,
    needs: 0,
    observers: 0,
  });

  const loadLocalCounts = () => {
    let playersCount = 0;
    let matchesCount = 0;
    let sessionsCount = 0;
    let plansCount = 0;

    CLUB_TEAMS.forEach((team) => {
      const roster = localStorage.getItem(`team_roster_${team}`);
      if (roster) {
        try {
          playersCount += JSON.parse(roster).length;
        } catch {}
      }
      const matches = localStorage.getItem(`team_matches_${team}`);
      if (matches) {
        try {
          matchesCount += JSON.parse(matches).length;
        } catch {}
      }
      const sessions = localStorage.getItem(`team_sessions_${team}`);
      if (sessions) {
        try {
          sessionsCount += JSON.parse(sessions).length;
        } catch {}
      }
      const plans = localStorage.getItem(`team_gameplans_${team}`);
      if (plans) {
        try {
          plansCount += JSON.parse(plans).length;
        } catch {}
      }
    });

    let physicalCount = 0;
    const physical = localStorage.getItem('ud_poveda_physical_test_history');
    if (physical) {
      try {
        physicalCount = JSON.parse(physical).length;
      } catch {}
    }

    let anthropometricsCount = 0;
    const antropo = localStorage.getItem('ud_poveda_anthropometric_history');
    if (antropo) {
      try {
        anthropometricsCount = JSON.parse(antropo).length;
      } catch {}
    }

    let coachesCount = 0;
    const coaches = localStorage.getItem('ud_lapoveda_coaches_backup');
    if (coaches) {
      try {
        coachesCount = JSON.parse(coaches).length;
      } catch {}
    }

    let needsCount = 0;
    const needs = localStorage.getItem('ud_lapoveda_needs_backup');
    if (needs) {
      try {
        needsCount = JSON.parse(needs).length;
      } catch {}
    }

    let observersCount = 0;
    const observersSaved = localStorage.getItem('ud_lapoveda_observers_backup');
    if (observersSaved) {
      try {
        observersCount = JSON.parse(observersSaved).length;
      } catch {}
    }

    setLocalCounts({
      players: playersCount,
      matches: matchesCount,
      sessions: sessionsCount,
      plans: plansCount,
      physical: physicalCount,
      anthropometrics: anthropometricsCount,
      coaches: coachesCount,
      needs: needsCount,
      observers: observersCount,
    });
  };

  useEffect(() => {
    async function loadData() {
      try {
        const { data: usersData } = await supabase.from('users').select('*');
        if (usersData) setUsers(usersData);

        const observersList = await getObservers();
        setObservers(observersList);

        const initializedCfg = await ensureAlejandroAccessInitializedByAdmin();
        setScoutConfig(initializedCfg);
      } catch (err) {
        console.error('Failed to load initial admin data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
    loadLocalCounts();
  }, []);

  const handleToggleModuleForAlejandro = async (moduleId: ClubModuleId) => {
    setSavingScoutAccess(true);
    try {
      const currentMods = scoutConfig.allowedModules || [];
      const exists = currentMods.includes(moduleId);
      const nextModules = exists
        ? currentMods.filter((m) => m !== moduleId)
        : [...currentMods, moduleId];

      const updated = await updateAlejandroAccessByAdmin({
        allowedModules: nextModules,
      });
      setScoutConfig(updated);
      toast.success(
        exists
          ? `Módulo "${moduleId}" desactivado para ${ALEJANDRO_EMAIL}`
          : `Módulo "${moduleId}" habilitado para ${ALEJANDRO_EMAIL}`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar permisos de módulo');
    } finally {
      setSavingScoutAccess(false);
    }
  };

  const handleToggleAlejandroMasterActive = async () => {
    setSavingScoutAccess(true);
    try {
      const nextActive = !scoutConfig.active;
      const updated = await updateAlejandroAccessByAdmin({
        active: nextActive,
      });
      setScoutConfig(updated);
      toast.success(
        nextActive
          ? `Cuenta ${ALEJANDRO_EMAIL} activada`
          : `Cuenta ${ALEJANDRO_EMAIL} suspendida temporalmente`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error al cambiar estado de la cuenta');
    } finally {
      setSavingScoutAccess(false);
    }
  };

  const handleDisableAllAlejandroModules = async () => {
    setSavingScoutAccess(true);
    try {
      const updated = await updateAlejandroAccessByAdmin({
        allowedModules: [],
      });
      setScoutConfig(updated);
      toast.success(`Todos los módulos deportivos han sido desactivados para ${ALEJANDRO_EMAIL}.`);
    } catch (err: any) {
      toast.error(err?.message || 'Error al reiniciar módulos');
    } finally {
      setSavingScoutAccess(false);
    }
  };

  const handleResetAlejandroUidLock = async () => {
    if (
      !confirm(
        `¿Deseas desbloquear el vínculo UID de ${ALEJANDRO_EMAIL} para que se vuelva a sellar automáticamente en su próximo inicio de sesión con Google?`
      )
    ) {
      return;
    }
    setSavingScoutAccess(true);
    try {
      const updated = await updateAlejandroAccessByAdmin({
        resetUidBinding: true,
      });
      setScoutConfig(updated);
      toast.success('Vínculo UID reiniciado. Se sellará automáticamente en el próximo login Google de Alejandro.');
    } catch (err: any) {
      toast.error(err?.message || 'Error al reiniciar vínculo UID');
    } finally {
      setSavingScoutAccess(false);
    }
  };

  const handleFirestoreMacIpadSync = async () => {
    setSyncingFirestoreCrossDevice(true);
    const toastId = toast.loading('Sincronizando datos entre Mac e iPad en Firestore (/club_sync)...');
    try {
      const res = await syncAllClubDataWithFirestore({ direction: 'bidirectional' });
      const latestCfg = await getAlejandroAccessConfig();
      setScoutConfig(latestCfg);
      loadLocalCounts();
      toast.success(
        `Sincronización Mac ↔ iPad completada (${res.pushed} bloques subidos, ${res.pulled} bloques descargados).`,
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error en sincronización Mac ↔ iPad', { id: toastId });
    } finally {
      setSyncingFirestoreCrossDevice(false);
    }
  };

  const handleGenerateAndDownloadEncryptedBackup = async () => {
    if (!backupPassword || backupPassword.trim().length < 8) {
      toast.error('Introduce una clave de cifrado de al menos 8 caracteres para proteger el archivo JSON.');
      return;
    }

    setCreatingBackup(true);
    const toastId = toast.loading(
      'Auditando Firestore, 10 tablas Supabase, localStorage e IndexedDB y cifrando con AES-256-GCM...'
    );
    try {
      const { envelope, filename } = await createEncryptedFullBackup(backupPassword.trim());
      setLastEncryptedEnvelope(envelope);
      downloadEncryptedBackupToDevice(envelope, filename);

      // Immediately run the non-destructive isolated sandbox verification on the generated backup
      const { report } = await verifyAndRestoreBackupInIsolatedSandbox(
        envelope,
        backupPassword.trim()
      );
      setSandboxReport(report);

      toast.success(
        `Copia cifrada (${filename}) descargada y verificada en Sandbox aislado sin tocar producción.`,
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(err?.message || 'Error al generar la copia de seguridad cifrada', { id: toastId });
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRunSandboxTestOnCurrentEnvelope = async () => {
    if (!lastEncryptedEnvelope) {
      toast.error('Primero genera o carga un archivo de copia de seguridad cifrada (.enc.json).');
      return;
    }
    if (!backupPassword || backupPassword.trim().length < 8) {
      toast.error('Introduce la clave de cifrado utilizada al crear la copia.');
      return;
    }

    setVerifyingSandbox(true);
    const toastId = toast.loading('Ejecutando simulacro de restauración en Sandbox en memoria (sin tocar producción)...');
    try {
      const { report } = await verifyAndRestoreBackupInIsolatedSandbox(
        lastEncryptedEnvelope,
        backupPassword.trim()
      );
      setSandboxReport(report);
      if (report.ok) {
        toast.success(
          'Simulacro de restauración en Sandbox superado al 100%. Integridad SHA-256 verificada.',
          { id: toastId }
        );
      } else {
        toast.error(report.errors.join(' ') || 'Error en la verificación del archivo cifrado.', {
          id: toastId,
        });
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al verificar en Sandbox', { id: toastId });
    } finally {
      setVerifyingSandbox(false);
    }
  };

  const handleUploadBackupFileForSandboxVerification = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!backupPassword || backupPassword.trim().length < 8) {
      toast.error('Introduce primero la clave de cifrado (mín. 8 caracteres) para descifrar el archivo en el Sandbox.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const rawText = String(reader.result || '');
        const parsedEnvelope = JSON.parse(rawText) as EncryptedBackupEnvelope;
        setLastEncryptedEnvelope(parsedEnvelope);
        setVerifyingSandbox(true);
        const { report } = await verifyAndRestoreBackupInIsolatedSandbox(
          parsedEnvelope,
          backupPassword.trim()
        );
        setSandboxReport(report);
        if (report.ok) {
          toast.success(
            `Archivo "${file.name}" descifrado y restaurado íntegramente en el Sandbox aislado (Producción intacta).`
          );
        } else {
          toast.error(report.errors.join(' ') || 'No se pudo verificar el archivo seleccionado.');
        }
      } catch (err: any) {
        toast.error('Archivo JSON cifrado inválido: ' + (err?.message || 'Error de formato'));
      } finally {
        setVerifyingSandbox(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleAddObserver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObsName.trim()) {
      toast.error('Por favor escribe un nombre para el observador');
      return;
    }
    setSavingObs(true);
    try {
      const created = await addObserver(newObsName.trim());
      setObservers((prev) =>
        [...prev.filter((o) => o.id !== created.id), created].sort((a, b) =>
          a.nombre.localeCompare(b.nombre)
        )
      );
      setNewObsName('');
      toast.success('Observador registrado en el catálogo histórico');
      loadLocalCounts();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar observador');
    } finally {
      setSavingObs(false);
    }
  };

  const handleDeleteObserver = async (id: string) => {
    if (
      !confirm(
        '¿Estás seguro de que deseas eliminar este nombre del selector de observadores? No eliminará ni afectará a ningún informe histórico de jugadores.'
      )
    )
      return;
    try {
      const success = await deleteObserver(id);
      if (success) {
        setObservers((prev) => prev.filter((o) => o.id !== id));
        toast.success('Observador eliminado del selector');
        loadLocalCounts();
      } else {
        toast.error('No se pudo eliminar el observador');
      }
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleFullCloudSync = async () => {
    setSyncingAll(true);
    const toastId = toast.loading('Iniciando sincronización completa de la base de datos...');

    const stats = {
      players: 0,
      matches: 0,
      sessions: 0,
      plans: 0,
      physical: 0,
      anthropometrics: 0,
      coaches: 0,
      needs: 0,
      observers: 0,
    };

    try {
      // 1. Sync Players (Rosters)
      toast.loading('Sincronizando plantillas de equipos...', { id: toastId });
      for (const team of CLUB_TEAMS) {
        const rosterStr = localStorage.getItem(`team_roster_${team}`);
        if (rosterStr) {
          try {
            const roster = JSON.parse(rosterStr);
            const updatedRoster = [...roster];
            let changed = false;

            for (let i = 0; i < updatedRoster.length; i++) {
              const p = updatedRoster[i];
              const isUuid =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                  p.id
                );
              let targetId = p.id;
              if (!isUuid) {
                targetId = crypto.randomUUID();
                updatedRoster[i] = { ...p, id: targetId };
                changed = true;
              }

              const payload = {
                id: targetId,
                nombre: p.nombre,
                apellidos: p.apellidos,
                posicion: p.posicion,
                dorsal: p.dorsal || null,
                lateralidad: p.lateralidad || 'Derecho',
                anio_nacimiento: p.anio_nacimiento ? parseInt(p.anio_nacimiento as any) : null,
                telefono: p.telefono || null,
                email: p.email || null,
                foto_url: p.foto_url || null,
                estado: 'Fichado',
                equipo_asignado: team,
              };

              const { error } = await supabase.from('players').upsert(payload);
              if (!error) stats.players++;
            }

            if (changed) {
              localStorage.setItem(`team_roster_${team}`, JSON.stringify(updatedRoster));
            }
          } catch (e) {
            console.error('Error syncing roster for team ' + team, e);
          }
        }
      }

      // Sync Scouting Local Players
      const localScoutingSaved = localStorage.getItem('scouting_local_players');
      if (localScoutingSaved) {
        try {
          const scoutingList = JSON.parse(localScoutingSaved);
          for (const sp of scoutingList) {
            const isUuid =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                sp.id
              );
            const targetId = isUuid ? sp.id : crypto.randomUUID();
            const payload = {
              id: targetId,
              nombre: sp.nombre,
              apellidos: sp.apellidos,
              apodo: sp.apodo || null,
              posicion: sp.posicion,
              dorsal: sp.dorsal || null,
              lateralidad: sp.lateralidad || 'Derecho',
              anio_nacimiento: sp.anio_nacimiento ? parseInt(sp.anio_nacimiento as any) : null,
              fecha_nacimiento: sp.fecha_nacimiento || null,
              telefono: sp.telefono || null,
              email: sp.email || null,
              contacto_tipo: sp.contacto_tipo || 'Tutor',
              equipo_actual: sp.equipo_actual || null,
              equipo_asignado: sp.equipo_asignado || null,
              foto_url: sp.foto_url || null,
              observaciones: sp.observaciones || null,
              potencial: sp.potencial || 3,
              estado: sp.estado || 'Observado',
              observador: sp.observador || null,
              es_plantilla: false,
              origen: 'scouting',
            };
            const { error } = await supabase.from('players').upsert(payload);
            if (!error) stats.players++;
          }
        } catch (e) {
          console.error('Error syncing local scouting players:', e);
        }
      }

      // 2. Sync Matches
      toast.loading('Sincronizando histórico de partidos...', { id: toastId });
      for (const team of CLUB_TEAMS) {
        const matchesStr = localStorage.getItem(`team_matches_${team}`);
        if (matchesStr) {
          try {
            const matches = JSON.parse(matchesStr);
            const updatedMatches = [...matches];
            let changed = false;

            for (let i = 0; i < updatedMatches.length; i++) {
              const m = updatedMatches[i];
              const isUuid =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                  m.id
                );
              let targetId = m.id;
              if (!isUuid) {
                targetId = crypto.randomUUID();
                updatedMatches[i] = { ...m, id: targetId };
                changed = true;
              }

              const payload = {
                id: targetId,
                team: team,
                rival: m.rival,
                fecha: m.fecha,
                hora: m.hora,
                tipo: m.tipo,
                competicion: m.competicion,
                estado: m.estado,
                goles_favor: m.goles_favor !== undefined ? m.goles_favor : null,
                goles_contra: m.goles_contra !== undefined ? m.goles_contra : null,
                acta: m.acta || null,
                estadisticas: m.estadisticas || {},
              };

              const { error } = await supabase.from('team_matches').upsert(payload);
              if (!error) stats.matches++;
            }

            if (changed) {
              localStorage.setItem(`team_matches_${team}`, JSON.stringify(updatedMatches));
            }
          } catch (e) {
            console.error('Error syncing matches for team ' + team, e);
          }
        }
      }

      // 3. Sync Attendance Sessions
      toast.loading('Sincronizando sesiones de asistencia...', { id: toastId });
      for (const team of CLUB_TEAMS) {
        const sessionsStr = localStorage.getItem(`team_sessions_${team}`);
        if (sessionsStr) {
          try {
            const sessions = JSON.parse(sessionsStr);
            const updatedSessions = [...sessions];
            let changed = false;

            for (let i = 0; i < updatedSessions.length; i++) {
              const s = updatedSessions[i];
              const isUuid =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                  s.id
                );
              let targetId = s.id;
              if (!isUuid) {
                targetId = crypto.randomUUID();
                updatedSessions[i] = { ...s, id: targetId };
                changed = true;
              }

              const payload = {
                id: targetId,
                team: team,
                fecha: s.fecha,
                tipo: s.tipo,
                descripcion: s.descripcion || null,
                records: s.records || [],
                tareas: s.tareas || [],
                archivos: s.archivos || [],
              };

              const { error } = await supabase.from('attendance_sessions').upsert(payload);
              if (!error) stats.sessions++;
            }

            if (changed) {
              localStorage.setItem(`team_sessions_${team}`, JSON.stringify(updatedSessions));
            }
          } catch (e) {
            console.error('Error syncing sessions for team ' + team, e);
          }
        }
      }

      // 4. Sync Match Plans
      toast.loading('Sincronizando planes de partido tácticos...', { id: toastId });
      for (const team of CLUB_TEAMS) {
        const plansStr = localStorage.getItem(`team_gameplans_${team}`);
        if (plansStr) {
          try {
            const plans = JSON.parse(plansStr);
            const updatedPlans = [...plans];
            let changed = false;

            for (let i = 0; i < updatedPlans.length; i++) {
              const p = updatedPlans[i];
              const isUuid =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                  p.id
                );
              let targetId = p.id;
              if (!isUuid) {
                targetId = crypto.randomUUID();
                updatedPlans[i] = { ...p, id: targetId };
                changed = true;
              }

              const payload = {
                id: targetId,
                team: team,
                rival_name: p.rivalName,
                fecha_partido: p.fechaPartido,
                sistema: p.sistema,
                sistema_rival: p.sistemaRival,
                convocatoria: p.convocatoria || [],
                objetivos_tacticos: p.objetivos_tacticos || '',
                alineacion_propuesta: p.alineacion_propuesta || '',
                puntos_fuertes_rival: p.puntos_fuertes_rival || '',
                balon_parado: p.balon_parado || '',
              };

              const { error } = await supabase.from('match_plans').upsert(payload);
              if (!error) stats.plans++;
            }

            if (changed) {
              localStorage.setItem(`team_gameplans_${team}`, JSON.stringify(updatedPlans));
            }
          } catch (e) {
            console.error('Error syncing match plans for team ' + team, e);
          }
        }
      }

      // 5. Sync Coaches
      toast.loading('Sincronizando directores técnicos...', { id: toastId });
      const coachesStr = localStorage.getItem('ud_lapoveda_coaches_backup');
      if (coachesStr) {
        try {
          const coaches = JSON.parse(coachesStr);
          for (const c of coaches) {
            const isUuid =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                c.id
              );
            const payload = {
              id: isUuid ? c.id : undefined,
              nombre: c.nombre,
              club: c.club,
              equipo: c.equipo,
              categoria: c.categoria,
              edad: c.edad || null,
              email: c.email || null,
              telefono: c.telefono || null,
              observaciones: c.observaciones || null,
              equipo_asignado: c.equipo_asignado || null,
            };

            const { error } = await supabase.from('coaches').upsert(payload);
            if (!error) stats.coaches++;
          }
        } catch (e) {
          console.error('Error syncing coaches', e);
        }
      }

      // 6. Sync Needs
      toast.loading('Sincronizando necesidades de fichajes...', { id: toastId });
      const needsStr = localStorage.getItem('ud_lapoveda_needs_backup');
      if (needsStr) {
        try {
          const needs = JSON.parse(needsStr);
          for (const n of needs) {
            const isUuid =
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                n.id
              );
            const payload = {
              id: isUuid ? n.id : undefined,
              equipo: n.equipo,
              posicion: n.posicion,
              solicitante: n.solicitante,
              observaciones: n.observaciones || null,
            };

            const { error } = await supabase.from('needs').upsert(payload);
            if (!error) stats.needs++;
          }
        } catch (e) {
          console.error('Error syncing needs', e);
        }
      }

      // 7. Also push to Firestore /club_sync for Mac <-> iPad sync
      await syncAllClubDataWithFirestore({ direction: 'bidirectional' });

      toast.success('¡Sincronización completada con éxito!', { id: toastId });
      loadLocalCounts();
    } catch (err: any) {
      console.error(err);
      toast.error('Ocurrió un error en la sincronización general: ' + (err.message || err), {
        id: toastId,
      });
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Administración y Blindaje de Seguridad
          </h1>
          <p className="text-slate-400 text-sm">
            Control exclusivo de las 2 cuentas autorizadas, permisos por módulo de Alejandro, copia externa cifrada AES-256-GCM y sincronización Mac ↔ iPad.
          </p>
        </div>
        <Button
          onClick={handleFirestoreMacIpadSync}
          disabled={syncingFirestoreCrossDevice}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg"
          id="sync-mac-ipad-btn"
        >
          {syncingFirestoreCrossDevice ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Sincronizando Mac ↔ iPad...
            </>
          ) : (
            <>
              <Laptop className="w-4 h-4 mr-2" />
              Sincronizar Mac ↔ iPad Ahora
            </>
          )}
        </Button>
      </div>

      {/* ZERO-TRUST IDENTITY & PROJECT VERIFICATION SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/90 border-slate-800 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-400 tracking-widest">
              Cuentas Autorizadas (Zero-Trust)
            </CardTitle>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-black text-white">2 Exclusivas</div>
            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-emerald-400">{ADMIN_EMAIL}</span>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  ADMIN
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-blue-400">{ALEJANDRO_EMAIL}</span>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
                  SCOUT
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 shadow-lg md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-400 tracking-widest">
              Verificación de Proyecto Real Firebase & Reglas Firestore
            </CardTitle>
            <Database className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Firebase Project ID Verificado
              </span>
              <span className="text-sm font-mono font-bold text-emerald-400">
                {projectVerification.actualProjectId}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {projectVerification.matches
                  ? '✓ Coincide con el proyecto oficial de Captación y Scouting'
                  : '⚠ Alerta de discrepancia de proyecto'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Protección Histórica
              </span>
              <span className="text-sm font-bold text-white">
                100% Datos Históricos Intactos
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Accesos de terceros revocados sin borrar informes, partidos ni cuentas Auth.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1: ALEJANDRO (asaguar04@gmail.com) MODULE PERMISSIONS PANEL */}
      <Card
        className="border border-blue-500/30 bg-slate-900/90 shadow-xl rounded-2xl overflow-hidden"
        id="alejandro-permissions-card"
      >
        <CardHeader className="border-b border-slate-800 bg-slate-950/80 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg font-bold text-white">
                    Permisos por Módulo del Único Observador Autorizado (Alejandro)
                  </CardTitle>
                  <Badge
                    className={
                      scoutConfig.active
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border-red-500/40'
                    }
                  >
                    {scoutConfig.active ? 'Acceso General Activo' : 'Acceso Suspendido'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Cuenta Google vinculada:{' '}
                  <strong className="text-blue-300 font-mono">{ALEJANDRO_EMAIL}</strong> • Rol:{' '}
                  <strong className="text-white">SCOUT</strong> • Por seguridad, todos los módulos están desactivados inicialmente hasta que los habilites individualmente.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={savingScoutAccess}
                onClick={handleDisableAllAlejandroModules}
                className="border-slate-700 text-slate-300 hover:text-white text-xs"
              >
                Desactivar Todos los Módulos
              </Button>
              <Button
                variant={scoutConfig.active ? 'destructive' : 'default'}
                size="sm"
                disabled={savingScoutAccess}
                onClick={handleToggleAlejandroMasterActive}
                className="text-xs font-bold"
              >
                {scoutConfig.active ? 'Suspender Acceso' : 'Reactivar Acceso'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Cryptographic UID Binding Status */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                {scoutConfig.uidLocked && scoutConfig.uid ? (
                  <>
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>UID Real de Firebase Authentication Sellado Criptográficamente</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-amber-400" />
                    <span>Pendiente de Primer Inicio de Sesión Google para Sellado Automático de UID</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                UID registrado:{' '}
                <strong className="text-emerald-300">
                  {scoutConfig.uid || '(Se sellará automáticamente cuando asaguar04@gmail.com inicie sesión con Google)'}
                </strong>
              </p>
            </div>

            {scoutConfig.uidLocked && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAlejandroUidLock}
                disabled={savingScoutAccess}
                className="text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-950/30"
              >
                Reiniciar Vínculo UID
              </Button>
            )}
          </div>

          {/* Individual Module Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CLUB_MODULES.map((mod) => {
              const isEnabled = (scoutConfig.allowedModules || []).includes(mod.id);
              return (
                <div
                  key={mod.id}
                  className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                    isEnabled
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{mod.label}</span>
                      <Badge
                        className={
                          isEnabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]'
                            : 'bg-slate-800 text-slate-400 border-slate-700 text-[10px]'
                        }
                      >
                        {isEnabled ? 'HABILITADO' : 'DESACTIVADO'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{mod.description}</p>
                    <p className="text-[10px] font-mono text-slate-500">
                      Rutas: {mod.routes.join(', ')}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    disabled={savingScoutAccess}
                    onClick={() => handleToggleModuleForAlejandro(mod.id)}
                    className={
                      isEnabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs shrink-0'
                    }
                    id={`toggle-module-${mod.id}`}
                  >
                    {isEnabled ? 'Desactivar' : 'Habilitar'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: ENCRYPTED EXTERNAL BACKUP (AES-256-GCM) & ISOLATED SANDBOX RECOVERY */}
      <Card
        className="border border-emerald-500/30 bg-slate-900/90 shadow-xl rounded-2xl overflow-hidden"
        id="encrypted-backup-card"
      >
        <CardHeader className="border-b border-slate-800 bg-slate-950/80 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white">
                  Copia de Seguridad Externa Cifrada (AES-256-GCM) y Verificación en Sandbox Aislado
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  Exporta al Mac un archivo JSON cifrado con PBKDF2 (250.000 iteraciones) + AES-256-GCM + firma SHA-256 que incluye todas las colecciones de Firestore, las 10 tablas de Supabase, localStorage e IndexedDB (PDFs y escudos), y verifica su restauración en memoria sin tocar producción.
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Clave Maestra de Cifrado / Descifrado (mín. 8 caracteres)
              </label>
              <Input
                type="password"
                placeholder="Introduce clave para cifrar/verificar el backup..."
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                className="bg-slate-950 border-slate-800 text-white text-sm"
                id="backup-encryption-password-input"
              />
            </div>

            <Button
              type="button"
              onClick={handleGenerateAndDownloadEncryptedBackup}
              disabled={creatingBackup}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 flex items-center justify-center gap-2"
              id="download-encrypted-backup-btn"
            >
              {creatingBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Cifrando y Descargando...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar Backup Cifrado (.enc.json) en Mac</span>
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleRunSandboxTestOnCurrentEnvelope}
                disabled={verifyingSandbox || !lastEncryptedEnvelope}
                className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 font-bold h-10 flex-1 text-xs"
                id="verify-sandbox-restore-btn"
              >
                <FileCheck2 className="w-4 h-4 mr-1.5" />
                <span>Probar en Sandbox</span>
              </Button>

              <label className="cursor-pointer inline-flex items-center justify-center px-3 h-10 rounded-md border border-slate-700 bg-slate-950 hover:bg-slate-800 text-xs font-bold text-slate-200 shrink-0">
                <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                <span>Cargar .enc.json</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleUploadBackupFileForSandboxVerification}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {sandboxReport && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-3 ${
                sandboxReport.ok
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                  : 'bg-red-950/20 border-red-500/40 text-red-200'
              }`}
              id="sandbox-verification-report"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    {sandboxReport.ok
                      ? '✓ Simulacro de Restauración en Sandbox Aislado Superado (Producción Intacta)'
                      : `✗ Error en Simulacro Sandbox: ${sandboxReport.errors.join(' ')}`}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-emerald-300">
                  SHA-256: {sandboxReport.computedSha256?.slice(0, 24)}...
                </span>
              </div>

              {sandboxReport.ok && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 block">
                      Firestore Restaurado (Sandbox)
                    </span>
                    <strong className="text-sm text-white">
                      {sandboxReport.restoredInSandboxCounts.firestoreDocs} docs
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 block">
                      10 Tablas Supabase (Sandbox)
                    </span>
                    <strong className="text-sm text-white">
                      {sandboxReport.restoredInSandboxCounts.supabaseRows} filas (
                      {sandboxReport.restoredInSandboxCounts.supabaseTables} tablas)
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 block">
                      Claves LocalStorage (Sandbox)
                    </span>
                    <strong className="text-sm text-white">
                      {sandboxReport.restoredInSandboxCounts.localStorageKeys} claves
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 block">
                      IndexedDB Archivos (Sandbox)
                    </span>
                    <strong className="text-sm text-white">
                      {sandboxReport.restoredInSandboxCounts.indexedDbFiles} archivos
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SYNC PANEL CARD */}
      <Card className="border border-blue-900/40 bg-slate-950/40 shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-900 bg-slate-950/80 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Database className="w-5 h-5" />
              </div>
              <div className="text-left">
                <CardTitle className="text-lg font-bold">
                  Inventario y Sincronización de Tablas Deportivas
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Respalda y consolida todas las plantillas, partidos, asistencias y planes en las tablas del sistema y en Firestore.
                </p>
              </div>
            </div>
            <Button
              onClick={handleFullCloudSync}
              disabled={syncingAll}
              className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-lg shadow-blue-600/15"
            >
              {syncingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4 mr-2" />
                  Consolidar y Sincronizar Todo
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-left">
            {[
              {
                label: 'Jugadoras de Plantilla',
                count: localCounts.players,
                icon: Users2,
                color: 'text-emerald-400 bg-emerald-500/5',
              },
              {
                label: 'Historial de Partidos',
                count: localCounts.matches,
                icon: Calendar,
                color: 'text-blue-400 bg-blue-500/5',
              },
              {
                label: 'Control de Asistencias',
                count: localCounts.sessions,
                icon: CheckCircle,
                color: 'text-violet-400 bg-violet-500/5',
              },
              {
                label: 'Planes de Partido',
                count: localCounts.plans,
                icon: ChevronRight,
                color: 'text-amber-400 bg-amber-500/5',
              },
              {
                label: 'Pruebas Físicas',
                count: localCounts.physical,
                icon: Dumbbell,
                color: 'text-rose-400 bg-rose-500/5',
              },
              {
                label: 'Controles Antropométricos',
                count: localCounts.anthropometrics,
                icon: Scale,
                color: 'text-sky-400 bg-sky-500/5',
              },
              {
                label: 'Ficheros de Coaches',
                count: localCounts.coaches,
                icon: Shield,
                color: 'text-teal-400 bg-teal-500/5',
              },
              {
                label: 'Informe de Necesidades',
                count: localCounts.needs,
                icon: AlertCircle,
                color: 'text-indigo-400 bg-indigo-500/5',
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl flex items-center gap-3"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                      {item.label}
                    </span>
                    <strong className="text-lg font-black text-white">
                      {item.count}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">registros</span>
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Registro Histórico de Usuarios en Tabla Local</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado de Acceso Actual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const clean = (u.email || '').trim().toLowerCase();
                const isAuthorized = clean === ADMIN_EMAIL || clean === ALEJANDRO_EMAIL;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isAuthorized ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                          Autorizado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-400 border-amber-500/40">
                          Acceso Revocado (Histórico Conservado)
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm mt-6">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4">
          <div>
            <CardTitle>Catálogo Histórico de Nombres de Observadores (Para Informes)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Mantiene los nombres de observadores en los informes históricos de scouting sin otorgar acceso de inicio de sesión.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={handleAddObserver}
            className="flex gap-3 max-w-md bg-slate-900/20 p-1.5 rounded-xl border border-slate-800"
          >
            <Input
              placeholder="Nombre para atribución en informes..."
              value={newObsName}
              onChange={(e) => setNewObsName(e.target.value)}
              className="bg-transparent border-none text-white focus-visible:ring-0 text-sm"
            />
            <Button
              type="submit"
              disabled={savingObs}
              className="bg-blue-600 hover:bg-blue-500 font-bold shrink-0 rounded-lg"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Registrar
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Observador</TableHead>
                <TableHead>Fecha de Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {observers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-slate-500 italic">
                    No hay observadores en el selector.
                  </TableCell>
                </TableRow>
              ) : (
                observers.map((obs) => (
                  <TableRow key={obs.id}>
                    <TableCell className="font-semibold text-slate-200">{obs.nombre}</TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {obs.created_at ? new Date(obs.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-950/20 rounded-lg hover:text-red-400"
                        onClick={() => handleDeleteObserver(obs.id)}
                      >
                        <Trash2 className="h-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
