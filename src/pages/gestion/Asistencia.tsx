import React, { useState, useEffect, useMemo } from 'react';
import { CLUB_TEAMS } from '@/types';
import { supabase } from '@/lib/supabase';
import { JUGADORAS_ADJUNTAS } from '@/data/jugadorasData';
import { cn, cleanPhotoUrl, normalizePlayerNameKey, isPlayerMatch } from '@/lib/utils';
import { 
  Calendar, 
  Plus, 
  Check, 
  X, 
  Clock, 
  ShieldAlert, 
  Sparkles,
  Award,
  Users,
  UserPlus,
  ClipboardList,
  UploadCloud,
  FileText,
  Download,
  Trash2,
  Eye,
  ExternalLink,
  Pencil,
  Save,
  Search,
  CheckCheck,
  UserCheck,
  RefreshCw,
  MessageSquare,
  StickyNote,
  Video,
  Play,
  Film,
  Upload,
  Link,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TeamPlayer {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
  foto_url?: string;
  equipo_origen?: string;
  isGuest?: boolean;
}

interface AttendanceRecord {
  playerId: string;
  status?: 'Presente' | 'Ausente' | 'No Justificó' | 'Lesionado' | 'Retraso' | 'Justificado' | 'Pendiente' | null;
  playerName?: string;
  playerLastName?: string;
  playerDorsal?: string;
  playerPosition?: string;
  foto_url?: string;
  isGuest?: boolean;
}

interface SessionTask {
  id: string;
  titulo: string;
  duracion: string;
  descripcion: string;
}

interface SessionFile {
  id: string;
  nombre: string;
  tamano: string;
  tipo: string;
  dataUrl?: string;
}

export interface SessionVideo {
  id: string;
  titulo: string;
  tipo: 'youtube' | 'local';
  url: string;
  youtubeId?: string;
  duracion?: string;
  tamano?: string;
  descripcion?: string;
  fechaSubida?: string;
}

interface AttendanceSession {
  id: string;
  fecha: string;
  hora?: string;
  tipo: 'Entrenamiento' | 'Partido' | 'Reunión' | 'Otro';
  descripcion: string;
  observaciones?: string;
  records: AttendanceRecord[];
  tareas?: SessionTask[];
  archivos?: SessionFile[];
  videos?: SessionVideo[];
}

const POSICIONES_DISPONIBLES = [
  'PORTERO',
  'CENTRAL',
  'LATERAL DERECHO',
  'LATERAL IZQUIERDO',
  'PIVOTE',
  'MEDIOCENTRO',
  'MEDIA PUNTA',
  'EXTREMO DERECHO',
  'EXTREMO IZQUIERDO',
  'DELANTERO'
];

/**
 * Loads the complete, updated and deduplicated roster for a team,
 * perfectly synchronized with Plantilla (official squad + signed scouting players).
 */
export const loadCompleteTeamRoster = (teamName: string): TeamPlayer[] => {
  const key = `team_roster_${teamName}`;
  const saved = localStorage.getItem(key);

  const deletedKey = `team_deleted_players_${teamName}`;
  const deletedSaved = localStorage.getItem(deletedKey);
  const deletedPlayers: { id?: string; fullName: string }[] = deletedSaved ? JSON.parse(deletedSaved) : [];

  const isDeletedPlayer = (id: string, nombre: string, apellidos: string = '') => {
    const normKey = normalizePlayerNameKey(nombre, apellidos);
    const simpleFullName = `${(nombre || '').trim()} ${(apellidos || '').trim()}`.toLowerCase();
    return deletedPlayers.some(
      dp => (dp.id && dp.id === id) || dp.fullName === normKey || dp.fullName === simpleFullName
    );
  };

  const officialTeamPlayers = teamName === 'SENIOR FEMENINO' ? JUGADORAS_ADJUNTAS : [];

  let currentList: any[] = [];
  if (saved) {
    try {
      currentList = JSON.parse(saved);
    } catch {}
  }

  // Filter out deleted & demo sample dummy entries & entries with no valid name
  currentList = currentList.filter(p => {
    const cleanN = (p.nombre || '').trim();
    const cleanA = (p.apellidos || '').trim();
    if (!cleanN) return false;
    if (cleanN.toUpperCase() === 'JUGADORA' && (!cleanA || cleanA.toUpperCase() === 'JUGADORA')) return false;
    const isDemo = cleanN === 'Carlos' || cleanN === 'Marcos' || cleanN === 'Sofía';
    if (isDemo) return false;
    return !isDeletedPlayer(p.id, cleanN, cleanA);
  });

  // Merge missing official players for Senior Femenino
  officialTeamPlayers.forEach(oj => {
    if (!isDeletedPlayer(oj.id, oj.nombre, oj.apellidos)) {
      const exists = currentList.some(p => isPlayerMatch(p, oj));
      if (!exists) {
        currentList.push({
          id: oj.id,
          nombre: oj.nombre,
          apellidos: oj.apellidos,
          dorsal: oj.dorsal,
          posicion: oj.posicion,
          foto_url: cleanPhotoUrl(oj.foto_url),
          equipo_origen: teamName
        });
      }
    }
  });

  // Check signed players from scouting / signed_players
  try {
    const signedSaved = localStorage.getItem('signed_players');
    if (signedSaved) {
      const signedList: any[] = JSON.parse(signedSaved);
      if (Array.isArray(signedList)) {
        signedList.forEach(sp => {
          const cleanSPName = (sp.nombre || '').trim();
          const cleanSPLast = (sp.apellidos || '').trim();
          if (!cleanSPName) return;
          if (cleanSPName.toUpperCase() === 'JUGADORA' && (!cleanSPLast || cleanSPLast.toUpperCase() === 'JUGADORA')) return;
          if (cleanSPName === 'Carlos' || cleanSPName === 'Marcos' || cleanSPName === 'Sofía') return;

          const matchTeam = sp.equipo_asignado ? (sp.equipo_asignado.toUpperCase() === teamName.toUpperCase()) : (teamName === 'SENIOR FEMENINO');
          if (matchTeam && !isDeletedPlayer(sp.id, cleanSPName, cleanSPLast)) {
            const exists = currentList.some(p => isPlayerMatch(p, sp));
            if (!exists) {
              currentList.push({
                id: sp.id,
                nombre: cleanSPName,
                apellidos: cleanSPLast,
                dorsal: sp.dorsal || '',
                posicion: sp.posicion || 'JUGADORA',
                foto_url: cleanPhotoUrl(sp.foto_url),
                equipo_origen: teamName
              });
            }
          }
        });
      }
    }
  } catch {}

  // Reconcile with local scouting players for latest custom edits
  const localScoutingSaved = localStorage.getItem('scouting_local_players');
  if (localScoutingSaved) {
    try {
      const scList: any[] = JSON.parse(localScoutingSaved);
      currentList = currentList.map(p => {
        const scPlayer = scList.find((sp: any) => isPlayerMatch(sp, p));
        if (scPlayer) {
          return {
            ...p,
            foto_url: scPlayer.foto_url !== undefined && scPlayer.foto_url !== '' ? cleanPhotoUrl(scPlayer.foto_url) : cleanPhotoUrl(p.foto_url),
            dorsal: scPlayer.dorsal || p.dorsal,
            posicion: scPlayer.posicion || p.posicion
          };
        }
        return {
          ...p,
          foto_url: cleanPhotoUrl(p.foto_url)
        };
      });
    } catch {}
  }

  // Deduplicate and format to TeamPlayer
  const cleanDeduplicated: TeamPlayer[] = [];
  const seenKeys = new Set<string>();

  currentList.forEach(p => {
    const cleanNombre = (p.nombre || '').trim();
    const cleanApellidos = (p.apellidos || '').trim() === 'Marta Pulido' ? 'Pulido' : (p.apellidos || '').trim();
    if (!cleanNombre) return;
    if (cleanNombre.toUpperCase() === 'JUGADORA' && (!cleanApellidos || cleanApellidos.toUpperCase() === 'JUGADORA')) return;

    const keyStr = normalizePlayerNameKey(cleanNombre, cleanApellidos);

    if (!seenKeys.has(keyStr) && !isDeletedPlayer(p.id, cleanNombre, cleanApellidos)) {
      seenKeys.add(keyStr);
      cleanDeduplicated.push({
        id: p.id,
        nombre: cleanNombre,
        apellidos: cleanApellidos,
        dorsal: p.dorsal !== undefined && p.dorsal !== null ? String(p.dorsal) : '',
        posicion: p.posicion || 'JUGADORA',
        foto_url: cleanPhotoUrl(p.foto_url),
        equipo_origen: p.equipo_origen || teamName
      });
    }
  });

  if (cleanDeduplicated.length > 0) {
    localStorage.setItem(key, JSON.stringify(cleanDeduplicated));
  }

  return cleanDeduplicated;
};

export default function Asistencia() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [activeTab, setActiveTab] = useState<'asistencia' | 'planificacion'>('asistencia');
  const [observacionesInput, setObservacionesInput] = useState<string>('');
  const [observacionesSaved, setObservacionesSaved] = useState<boolean>(true);
  const [previewFile, setPreviewFile] = useState<SessionFile | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<SessionVideo | null>(null);
  const [videoModalTab, setVideoModalTab] = useState<'youtube' | 'local'>('youtube');
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [videoTitleInput, setVideoTitleInput] = useState('');
  const [videoDescInput, setVideoDescInput] = useState('');
  const [searchPlayerQuery, setSearchPlayerQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Presente' | 'Retraso' | 'No Justificó' | 'Justificado' | 'Lesionado' | 'Pendiente'>('ALL');

  // Add player modal state
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [addPlayerTab, setAddPlayerTab] = useState<'manual' | 'club'>('manual');
  const [manualPlayerForm, setManualPlayerForm] = useState<{
    nombre: string;
    apellidos: string;
    dorsal: string;
    posicion: string;
    status?: AttendanceRecord['status'];
    saveToRoster: boolean;
  }>({
    nombre: '',
    apellidos: '',
    dorsal: '',
    posicion: 'CENTRAL',
    status: undefined,
    saveToRoster: true
  });
  const [searchClubQuery, setSearchClubQuery] = useState('');

  useEffect(() => {
    if (!previewFile) {
      setPreviewBlobUrl(null);
      return;
    }

    let url: string | null = null;
    try {
      if (previewFile.dataUrl) {
        // Convert data URL to Blob URL to bypass browser iframe & security block on data: URIs
        const arr = previewFile.dataUrl.split(',');
        if (arr.length > 1) {
          const mime = arr[0].match(/:(.*?);/)?.[1] || '';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          url = URL.createObjectURL(blob);
          setPreviewBlobUrl(url);
        } else {
          setPreviewBlobUrl(previewFile.dataUrl);
        }
      }
    } catch (error) {
      console.error("Error creating preview blob URL:", error);
      // Fallback to direct data URL if conversion fails
      setPreviewBlobUrl(previewFile.dataUrl || null);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewFile]);
  
  // New session form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    hora: '19:30 h',
    tipo: 'Entrenamiento' as 'Entrenamiento' | 'Partido' | 'Reunión' | 'Otro',
    descripcion: 'Sesión de entrenamiento'
  });

  // Edit session modal form state
  const [editingSession, setEditingSession] = useState<AttendanceSession | null>(null);
  const [editSessionForm, setEditSessionForm] = useState({
    fecha: '',
    hora: '19:30 h',
    tipo: 'Entrenamiento' as 'Entrenamiento' | 'Partido' | 'Reunión' | 'Otro',
    descripcion: ''
  });

  // Synchronize observaciones text with active session
  useEffect(() => {
    setObservacionesInput(selectedSession?.observaciones || '');
    setObservacionesSaved(true);
  }, [selectedSession?.id]);

  // Load roster and synchronize on team change and on storage/player-updated events
  useEffect(() => {
    const syncRoster = () => {
      const currentRoster = loadCompleteTeamRoster(selectedTeam);
      setPlayers(currentRoster);
      return currentRoster;
    };

    const currentRoster = syncRoster();

    const cleanSessionRecords = (records: AttendanceRecord[], roster: TeamPlayer[]) => {
      return (records || []).filter(rec => {
        const p = roster.find(pl => pl.id === rec.playerId);
        const n = (p?.nombre || rec.playerName || '').trim();
        const a = (p?.apellidos || rec.playerLastName || '').trim();
        if (!n) return false;
        if (n.toUpperCase() === 'JUGADORA' && (!a || a.toUpperCase() === 'JUGADORA')) return false;
        if (n === 'Carlos' || n === 'Marcos' || n === 'Sofía') return false;
        return true;
      });
    };

    const sessionsKey = `team_sessions_${selectedTeam}`;
    const activeKey = `active_session_id_${selectedTeam}`;

    // 1. Synchronously load local storage first so user never loses their changes
    const savedSessions = localStorage.getItem(sessionsKey);
    let initialList: AttendanceSession[] = [];
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialList = parsed.map((item: any) => ({
            ...item,
            id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id) ? item.id : crypto.randomUUID(),
            records: cleanSessionRecords(item.records || [], currentRoster)
          }));
        }
      } catch {}
    }

    if (initialList.length === 0) {
      // Create initial default session with all roster players
      const defaultRecords = currentRoster.map(p => ({
        playerId: p.id,
        playerName: p.nombre,
        playerLastName: p.apellidos,
        playerDorsal: p.dorsal,
        playerPosition: p.posicion,
        foto_url: p.foto_url,
        status: undefined
      }));
      const defaultSession: AttendanceSession = {
        id: crypto.randomUUID(),
        fecha: new Date().toISOString().split('T')[0],
        hora: '19:30 h',
        tipo: 'Entrenamiento',
        descripcion: 'Sesión de entrenamiento habitual',
        observaciones: '',
        records: defaultRecords,
        tareas: [],
        archivos: [],
        videos: []
      };
      initialList = [defaultSession];
      localStorage.setItem(sessionsKey, JSON.stringify(initialList));
    }

    setSessions(initialList);
    const lastActiveId = localStorage.getItem(activeKey);
    const foundActive = initialList.find(s => s.id === lastActiveId) || initialList[0];
    setSelectedSession(foundActive);

    // 2. Fetch from Supabase in the background and sync
    const syncFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('team', selectedTeam)
          .neq('tipo', 'CalendarioMensual')
          .order('fecha', { ascending: false });

        if (!error && data && data.length > 0) {
          const cloudFormatted: AttendanceSession[] = data.map(item => ({
            id: item.id,
            fecha: item.fecha,
            hora: item.hora || '19:30 h',
            tipo: item.tipo as any,
            descripcion: item.descripcion || '',
            observaciones: item.observaciones || '',
            records: cleanSessionRecords(item.records || [], currentRoster),
            tareas: item.tareas || [],
            archivos: item.archivos || [],
            videos: item.videos || []
          }));

          // If local storage was empty, use cloud data
          const localSavedRaw = localStorage.getItem(sessionsKey);
          if (!localSavedRaw || JSON.parse(localSavedRaw).length === 0) {
            setSessions(cloudFormatted);
            setSelectedSession(cloudFormatted[0]);
            localStorage.setItem(sessionsKey, JSON.stringify(cloudFormatted));
          } else {
            // Push any local sessions to Supabase to keep cloud up to date
            const localList: AttendanceSession[] = JSON.parse(localSavedRaw);
            for (const locSess of localList) {
              const payload = {
                team: selectedTeam,
                fecha: locSess.fecha,
                hora: locSess.hora || '19:30 h',
                tipo: locSess.tipo,
                descripcion: locSess.descripcion,
                observaciones: locSess.observaciones || '',
                records: locSess.records,
                tareas: locSess.tareas || [],
                archivos: locSess.archivos || [],
                videos: locSess.videos || []
              };
              await supabase.from('attendance_sessions').upsert({ id: locSess.id, ...payload });
            }
          }
        }
      } catch (err) {
        console.warn('Supabase sync skipped/failed:', err);
      }
    };

    syncFromSupabase();

    const handlePlayerUpdate = () => {
      syncRoster();
    };

    window.addEventListener('player-updated', handlePlayerUpdate);
    window.addEventListener('storage', handlePlayerUpdate);
    return () => {
      window.removeEventListener('player-updated', handlePlayerUpdate);
      window.removeEventListener('storage', handlePlayerUpdate);
    };
  }, [selectedTeam]);

  const handleSelectSession = (sess: AttendanceSession) => {
    setSelectedSession(sess);
    localStorage.setItem(`active_session_id_${selectedTeam}`, sess.id);
  };

  const saveSessions = async (updated: AttendanceSession[]) => {
    // Ensure all sessions have valid UUIDs
    const validSessions = updated.map(sess => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sess.id);
      return isUuid ? sess : { ...sess, id: crypto.randomUUID() };
    });

    setSessions(validSessions);
    const sessionsKey = `team_sessions_${selectedTeam}`;
    localStorage.setItem(sessionsKey, JSON.stringify(validSessions));

    // Try to sync to Supabase in the background
    try {
      for (const sess of validSessions) {
        const payload = {
          team: selectedTeam,
          fecha: sess.fecha,
          hora: sess.hora || '19:30 h',
          tipo: sess.tipo,
          descripcion: sess.descripcion,
          observaciones: sess.observaciones || '',
          records: sess.records,
          tareas: sess.tareas || [],
          archivos: sess.archivos || [],
          videos: sess.videos || []
        };

        await supabase
          .from('attendance_sessions')
          .upsert({ id: sess.id, ...payload });
      }
    } catch (err) {
      console.warn('Failed to sync attendance sessions to Supabase:', err);
    }
  };

  const handleOpenEditSession = (sess: AttendanceSession) => {
    setEditingSession(sess);
    setEditSessionForm({
      fecha: sess.fecha,
      hora: sess.hora || '19:30 h',
      tipo: sess.tipo,
      descripcion: sess.descripcion
    });
  };

  const handleSaveEditSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    const updatedSession: AttendanceSession = {
      ...editingSession,
      fecha: editSessionForm.fecha,
      hora: editSessionForm.hora,
      tipo: editSessionForm.tipo,
      descripcion: editSessionForm.descripcion
    };

    const updatedSessions = sessions.map(s => s.id === editingSession.id ? updatedSession : s);
    setSelectedSession(updatedSession);
    await saveSessions(updatedSessions);

    // Sync monthly calendar storage as well so calendar view gets updated immediately
    try {
      const d = new Date(editSessionForm.fecha);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = d.getMonth();
        const calKey = `team_monthly_calendar_${selectedTeam}_${year}_${month}`;
        const existingCalStr = localStorage.getItem(calKey);
        let calEvents: Record<string, any> = existingCalStr ? JSON.parse(existingCalStr) : {};
        
        if (editingSession.fecha !== editSessionForm.fecha && calEvents[editingSession.fecha]) {
          delete calEvents[editingSession.fecha];
        }

        calEvents[editSessionForm.fecha] = {
          dateStr: editSessionForm.fecha,
          title: editSessionForm.descripcion,
          type: editSessionForm.tipo === 'Partido' ? 'Partido' : 'Entrenamiento',
          hora: editSessionForm.hora || '19:30 h'
        };

        localStorage.setItem(calKey, JSON.stringify(calEvents));

        const firstOfMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        await supabase.from('attendance_sessions').upsert({
          team: selectedTeam,
          fecha: firstOfMonth,
          tipo: 'CalendarioMensual',
          descripcion: JSON.stringify({
            month,
            year,
            team: selectedTeam,
            events: calEvents,
            updatedAt: new Date().toISOString()
          }),
          records: [],
          tareas: [],
          archivos: []
        });
      }
    } catch (err) {
      console.warn('Could not sync monthly calendar after session edit:', err);
    }

    setEditingSession(null);
    toast.success('Sesión actualizada correctamente.');
  };

  /**
   * Creates a new training / match session, pulling EVERY active player currently
   * in the team's official plantilla so none are left out.
   */
  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const currentRoster = loadCompleteTeamRoster(selectedTeam);

    if (currentRoster.length === 0) {
      toast.error('No se pueden crear sesiones si la plantilla está vacía. Añade jugadoras primero.');
      return;
    }

    // ALL active players from the team's plantilla are automatically included with no option pre-selected
    const defaultRecords: AttendanceRecord[] = currentRoster.map(p => ({
      playerId: p.id,
      playerName: p.nombre,
      playerLastName: p.apellidos,
      playerDorsal: p.dorsal,
      playerPosition: p.posicion,
      foto_url: p.foto_url,
      status: undefined
    }));

    const newSession: AttendanceSession = {
      id: crypto.randomUUID(),
      fecha: newSessionData.fecha,
      hora: newSessionData.hora || '19:30 h',
      tipo: newSessionData.tipo,
      descripcion: newSessionData.descripcion,
      observaciones: '',
      records: defaultRecords,
      tareas: [],
      archivos: []
    };

    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setSelectedSession(newSession);
    localStorage.setItem(`active_session_id_${selectedTeam}`, newSession.id);
    setShowNewForm(false);
    toast.success(`Nueva sesión de ${newSessionData.tipo} creada con las ${currentRoster.length} jugadoras de la plantilla.`);
  };

  // Filter out any ghost/dummy/empty records from active session
  const validSessionRecords = useMemo(() => {
    if (!selectedSession) return [];
    return (selectedSession.records || []).filter(rec => {
      const pInfo = players.find(p => p.id === rec.playerId);
      const n = (pInfo?.nombre || rec.playerName || '').trim();
      const a = (pInfo?.apellidos || rec.playerLastName || '').trim();
      if (!n) return false;
      if (n.toUpperCase() === 'JUGADORA' && (!a || a.toUpperCase() === 'JUGADORA')) return false;
      if (n === 'Carlos' || n === 'Marcos' || n === 'Sofía') return false;
      return true;
    });
  }, [selectedSession, players]);

  // Real-time live status counters for the 5 attendance options
  const sessionCounts = useMemo(() => {
    let presente = 0;
    let retraso = 0;
    let noJustifico = 0;
    let justificado = 0;
    let lesionado = 0;
    let sinMarcar = 0;

    validSessionRecords.forEach(rec => {
      if (rec.status === 'Presente') presente++;
      else if (rec.status === 'Retraso') retraso++;
      else if (rec.status === 'No Justificó' || rec.status === 'Ausente') noJustifico++;
      else if (rec.status === 'Justificado') justificado++;
      else if (rec.status === 'Lesionado') lesionado++;
      else sinMarcar++;
    });

    return {
      presente,
      retraso,
      noJustifico,
      justificado,
      lesionado,
      sinMarcar,
      total: validSessionRecords.length
    };
  }, [validSessionRecords]);

  // Find players currently in the team's plantilla that are missing from the selected session
  const missingRosterPlayers = useMemo(() => {
    if (!selectedSession) return [];
    const sessionPlayerIds = new Set(validSessionRecords.map(r => r.playerId));
    const sessionNames = new Set(validSessionRecords.map(r => 
      normalizePlayerNameKey(r.playerName || '', r.playerLastName || '')
    ));
    return players.filter(p => 
      !sessionPlayerIds.has(p.id) && 
      !sessionNames.has(normalizePlayerNameKey(p.nombre, p.apellidos))
    );
  }, [selectedSession, players, validSessionRecords]);

  // Synchronize all missing team roster players into the current session
  const handleAddMissingRosterPlayers = () => {
    if (!selectedSession || missingRosterPlayers.length === 0) return;
    const newRecords: AttendanceRecord[] = missingRosterPlayers.map(p => ({
      playerId: p.id,
      playerName: p.nombre,
      playerLastName: p.apellidos,
      playerDorsal: p.dorsal,
      playerPosition: p.posicion,
      foto_url: p.foto_url,
      status: undefined
    }));

    const updatedSession: AttendanceSession = {
      ...selectedSession,
      records: [...selectedSession.records, ...newRecords]
    };
    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
    toast.success(`${missingRosterPlayers.length} jugadoras de la plantilla añadidas a la sesión.`);
  };

  // Collect all players from other teams or club database for selection
  const allAvailableClubPlayers = useMemo(() => {
    const playerMap = new Map<string, TeamPlayer>();

    // Add players from current team first
    players.forEach(p => {
      playerMap.set(p.id, { ...p, equipo_origen: selectedTeam });
    });

    // Add players from all other team rosters
    CLUB_TEAMS.forEach(team => {
      try {
        const saved = localStorage.getItem(`team_roster_${team}`);
        if (saved) {
          const teamRoster: TeamPlayer[] = JSON.parse(saved);
          teamRoster.forEach(p => {
            if (!playerMap.has(p.id)) {
              playerMap.set(p.id, { ...p, equipo_origen: team });
            }
          });
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Add official default players
    JUGADORAS_ADJUNTAS.forEach(j => {
      if (!playerMap.has(j.id)) {
        playerMap.set(j.id, {
          id: j.id,
          nombre: j.nombre,
          apellidos: j.apellidos,
          dorsal: j.dorsal,
          posicion: j.posicion,
          equipo_origen: 'SENIOR FEMENINO'
        });
      }
    });

    // Add signed players
    try {
      const signed = localStorage.getItem('signed_players');
      if (signed) {
        const parsed = JSON.parse(signed);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: any) => {
            if (!playerMap.has(p.id)) {
              playerMap.set(p.id, {
                id: p.id,
                nombre: p.nombre,
                apellidos: p.apellidos || '',
                dorsal: p.dorsal || '',
                posicion: p.posicion || 'JUGADORA',
                equipo_origen: p.equipo_asignado || 'Fichajes'
              });
            }
          });
        }
      }
    } catch (err) {
      console.error(err);
    }

    return Array.from(playerMap.values());
  }, [players, selectedTeam]);

  // Filter club players that are NOT already in the active session
  const availablePlayersNotInSession = useMemo(() => {
    if (!selectedSession) return [];
    const sessionPlayerIds = new Set(selectedSession.records.map(r => r.playerId));
    return allAvailableClubPlayers.filter(p => !sessionPlayerIds.has(p.id));
  }, [selectedSession, allAvailableClubPlayers]);

  // Handler: Add a manual player to the session
  const handleAddManualPlayerToSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    if (!manualPlayerForm.nombre.trim()) {
      toast.error('El nombre de la jugadora es obligatorio.');
      return;
    }

    const newPlayerId = `manual-player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newPlayer: TeamPlayer = {
      id: newPlayerId,
      nombre: manualPlayerForm.nombre.trim(),
      apellidos: manualPlayerForm.apellidos.trim(),
      dorsal: manualPlayerForm.dorsal.trim() || String(selectedSession.records.length + 1),
      posicion: manualPlayerForm.posicion,
      isGuest: !manualPlayerForm.saveToRoster,
      equipo_origen: selectedTeam
    };

    // Add to current players list so UI renders immediately
    const updatedPlayers = [...players, newPlayer];
    setPlayers(updatedPlayers);

    // If coach wants to save to permanent team roster
    if (manualPlayerForm.saveToRoster) {
      const rosterKey = `team_roster_${selectedTeam}`;
      localStorage.setItem(rosterKey, JSON.stringify(updatedPlayers));
      window.dispatchEvent(new CustomEvent('player-updated', { detail: { team: selectedTeam } }));
    }

    // Add to session attendance records
    const newRecord: AttendanceRecord = {
      playerId: newPlayerId,
      status: manualPlayerForm.status,
      playerName: newPlayer.nombre,
      playerLastName: newPlayer.apellidos,
      playerDorsal: newPlayer.dorsal,
      playerPosition: newPlayer.posicion,
      isGuest: !manualPlayerForm.saveToRoster
    };

    const updatedSession: AttendanceSession = {
      ...selectedSession,
      records: [...selectedSession.records, newRecord]
    };

    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);

    // Reset form and close modal
    setManualPlayerForm({
      nombre: '',
      apellidos: '',
      dorsal: '',
      posicion: 'CENTRAL',
      status: undefined,
      saveToRoster: true
    });
    setShowAddPlayerModal(false);
    toast.success(`Jugadora ${newPlayer.nombre} ${newPlayer.apellidos} añadida a la sesión correctamente.`);
  };

  // Handler: Add an existing club player to the session
  const handleAddClubPlayerToSession = (player: TeamPlayer) => {
    if (!selectedSession) return;

    // Ensure player is in the local players state if not already
    if (!players.some(p => p.id === player.id)) {
      setPlayers(prev => [...prev, player]);
    }

    const newRecord: AttendanceRecord = {
      playerId: player.id,
      status: undefined,
      playerName: player.nombre,
      playerLastName: player.apellidos,
      playerDorsal: player.dorsal,
      playerPosition: player.posicion,
      isGuest: player.equipo_origen !== selectedTeam
    };

    const updatedSession: AttendanceSession = {
      ...selectedSession,
      records: [...selectedSession.records, newRecord]
    };

    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);

    toast.success(`${player.nombre} ${player.apellidos} añadida a la sesión.`);
  };

  // Handler: Remove player from session
  const handleRemovePlayerFromSession = (playerId: string) => {
    if (!selectedSession) return;
    const p = players.find(item => item.id === playerId);
    const rec = selectedSession.records.find(r => r.playerId === playerId);
    const name = p ? `${p.nombre} ${p.apellidos}` : (rec?.playerName ? `${rec.playerName} ${rec.playerLastName || ''}` : 'la jugadora');

    if (confirm(`¿Quitar a ${name} de esta sesión de entrenamiento?`)) {
      const updatedRecords = selectedSession.records.filter(r => r.playerId !== playerId);
      const updatedSession: AttendanceSession = {
        ...selectedSession,
        records: updatedRecords
      };

      setSelectedSession(updatedSession);
      const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
      saveSessions(updatedSessions);
      toast.success(`${name} quitada de la sesión.`);
    }
  };

  // Handler: Mark all players present
  const handleMarkAllPresent = () => {
    if (!selectedSession) return;
    const updatedRecords = selectedSession.records.map(r => ({
      ...r,
      status: 'Presente' as const
    }));
    const updatedSession: AttendanceSession = {
      ...selectedSession,
      records: updatedRecords
    };
    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
    toast.success('Todas las jugadoras marcadas como Presente');
  };

  const handleUpdateStatus = (playerId: string, targetStatus: AttendanceRecord['status']) => {
    if (!selectedSession) return;

    const updatedRecords = selectedSession.records.map(rec => {
      if (rec.playerId === playerId) {
        // Toggle behavior: clicking the active status clears it (unselected)
        const nextStatus = rec.status === targetStatus ? undefined : targetStatus;
        return { ...rec, status: nextStatus };
      }
      return rec;
    });

    const updatedSession = { ...selectedSession, records: updatedRecords };
    
    // Update active session and general list
    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
  };

  const handleDeleteSession = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta sesión de asistencia?')) {
      const updated = sessions.filter(s => s.id !== id);
      
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        try {
          await supabase
            .from('attendance_sessions')
            .delete()
            .eq('id', id);
        } catch (err) {
          console.warn('Failed to delete attendance session from Supabase:', err);
        }
      }

      saveSessions(updated);
      setSelectedSession(updated.length > 0 ? updated[0] : null);
      toast.success('Sesión de asistencia eliminada.');
    }
  };

  const handleAddTask = (titulo: string, duracion: string, descripcion: string) => {
    if (!selectedSession) return;
    
    const newTask = {
      id: crypto.randomUUID(),
      titulo,
      duracion,
      descripcion
    };

    const currentTareas = selectedSession.tareas || [];
    const updatedSession = {
      ...selectedSession,
      tareas: [...currentTareas, newTask]
    };

    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
    toast.success('Tarea añadida con éxito');
  };

  const handleDeleteTask = (taskId: string) => {
    if (!selectedSession) return;
    
    const currentTareas = selectedSession.tareas || [];
    const updatedSession = {
      ...selectedSession,
      tareas: currentTareas.filter(t => t.id !== taskId)
    };

    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
    toast.success('Tarea eliminada');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSession || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    // Check file size (limit to 1.5MB for localStorage)
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande (máximo 1.5MB para almacenamiento local).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newFile = {
        id: crypto.randomUUID(),
        nombre: file.name,
        tamano: (file.size / 1024).toFixed(1) + ' KB',
        tipo: file.type,
        dataUrl
      };

      const currentFiles = selectedSession.archivos || [];
      const updatedSession = {
        ...selectedSession,
        archivos: [...currentFiles, newFile]
      };

      setSelectedSession(updatedSession);
      const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
      saveSessions(updatedSessions);
      toast.success('Archivo subido con éxito');
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFile = (fileId: string) => {
    if (!selectedSession) return;
    
    const currentFiles = selectedSession.archivos || [];
    const updatedSession = {
      ...selectedSession,
      archivos: currentFiles.filter(f => f.id !== fileId)
    };

    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
    toast.success('Archivo eliminado');
  };

  const handleSaveObservaciones = async (customText?: string) => {
    if (!selectedSession) return;
    const textToSave = customText !== undefined ? customText : observacionesInput;
    const updatedSession: AttendanceSession = {
      ...selectedSession,
      observaciones: textToSave
    };

    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    await saveSessions(updatedSessions);
    setObservacionesSaved(true);
    toast.success('Observaciones del entreno guardadas con éxito');
  };

  const handleAppendQuickTag = (tag: string) => {
    const current = observacionesInput.trim();
    const next = current ? `${current}\n• ${tag}: ` : `• ${tag}: `;
    setObservacionesInput(next);
    setObservacionesSaved(false);
  };

  // Helper to extract YouTube ID from standard URL, shorts, youtu.be, embed
  const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const cleanUrl = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = cleanUrl.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Add YouTube video to active session
  const handleAddYouTubeVideo = () => {
    if (!selectedSession) return;
    const yId = extractYouTubeId(youtubeUrlInput);
    if (!yId) {
      toast.error('URL de YouTube no válida. Introduce un enlace válido (ej: https://www.youtube.com/watch?v=... o youtu.be/...)');
      return;
    }

    const title = videoTitleInput.trim() || `Vídeo Análisis YouTube (${yId})`;
    const newVideo: SessionVideo = {
      id: crypto.randomUUID(),
      titulo: title,
      tipo: 'youtube',
      url: `https://www.youtube-nocookie.com/embed/${yId}`,
      youtubeId: yId,
      descripcion: videoDescInput.trim() || undefined,
      fechaSubida: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    const currentVideos = selectedSession.videos || [];
    const updatedSession: AttendanceSession = {
      ...selectedSession,
      videos: [...currentVideos, newVideo]
    };

    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
    setYoutubeUrlInput('');
    setVideoTitleInput('');
    setVideoDescInput('');
    toast.success('Vídeo de YouTube añadido con éxito a la sesión');
  };

  // Upload local video file
  const handleLocalVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSession || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Check size limit: warning if over 25MB
    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > 25) {
      toast.error('El vídeo supera el límite recomendado de 25MB para rendimiento local.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const title = videoTitleInput.trim() || file.name.replace(/\.[^/.]+$/, '');
      const newVideo: SessionVideo = {
        id: crypto.randomUUID(),
        titulo: title,
        tipo: 'local',
        url: dataUrl,
        tamano: `${sizeMb.toFixed(1)} MB`,
        descripcion: videoDescInput.trim() || undefined,
        fechaSubida: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      };

      const currentVideos = selectedSession.videos || [];
      const updatedSession: AttendanceSession = {
        ...selectedSession,
        videos: [...currentVideos, newVideo]
      };

      setSelectedSession(updatedSession);
      const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
      saveSessions(updatedSessions);
      setVideoTitleInput('');
      setVideoDescInput('');
      toast.success('Vídeo local subido con éxito a la sesión');
    };
    reader.readAsDataURL(file);
  };

  // Delete video from active session
  const handleDeleteVideo = (videoId: string) => {
    if (!selectedSession) return;
    const currentVideos = selectedSession.videos || [];
    const updatedSession: AttendanceSession = {
      ...selectedSession,
      videos: currentVideos.filter(v => v.id !== videoId)
    };

    setSelectedSession(updatedSession);
    const updatedSessions = sessions.map(s => s.id === selectedSession.id ? updatedSession : s);
    saveSessions(updatedSessions);
    if (previewVideo?.id === videoId) {
      setPreviewVideo(null);
    }
    toast.success('Vídeo eliminado');
  };

  // Helper stats calculations
  const getSessionStats = (session: AttendanceSession) => {
    const total = (session.records || []).length;
    if (total === 0) return { presentCount: 0, markedCount: 0, total: 0, percentage: 0 };
    const presentCount = session.records.filter(r => r.status === 'Presente' || r.status === 'Retraso').length;
    const markedCount = session.records.filter(r => r.status && r.status !== ('Pendiente' as any)).length;
    return {
      presentCount,
      markedCount,
      total,
      percentage: markedCount > 0 ? Math.round((presentCount / total) * 100) : 0
    };
  };

  return (
    <div className="space-y-6">
      {/* Selector & Create */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-900/60 border border-slate-900 p-4 rounded-2xl">
        <div className="w-full sm:w-auto flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Equipo Activo</label>
          <select 
            value={selectedTeam} 
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-slate-950 text-white font-bold text-sm border border-slate-800 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            {CLUB_TEAMS.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        <Button 
          onClick={() => setShowNewForm(!showNewForm)}
          className="w-full sm:w-auto text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Sesión</span>
        </Button>
      </div>

      {/* New Session Form */}
      {showNewForm && (
        <form onSubmit={handleCreateSession} className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl space-y-4 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <h4 className="text-sm font-extrabold uppercase text-white tracking-wide flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>Planificar nueva sesión</span>
            </h4>
            <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Plantilla completa: {players.length} jugadoras de {selectedTeam} convocadas automáticamente</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Fecha de la sesión</label>
              <input 
                type="date" 
                required
                value={newSessionData.fecha}
                onChange={(e) => setNewSessionData({...newSessionData, fecha: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Hora (Opcional)</label>
              <input 
                type="text" 
                value={newSessionData.hora}
                onChange={(e) => setNewSessionData({...newSessionData, hora: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                placeholder="Ej. 19:30 h"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Tipo de Sesión</label>
              <select 
                value={newSessionData.tipo}
                onChange={(e) => setNewSessionData({...newSessionData, tipo: e.target.value as any})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
              >
                <option value="Entrenamiento">Entrenamiento</option>
                <option value="Partido">Partido</option>
                <option value="Reunión">Reunión</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Descripción / Objetivo</label>
              <input 
                type="text" 
                required
                value={newSessionData.descripcion}
                onChange={(e) => setNewSessionData({...newSessionData, descripcion: e.target.value})}
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all mt-1"
                placeholder="Ej. Táctica a balón parado"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowNewForm(false)}
              className="text-xs border-slate-800 text-slate-300"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              Crear Sesión con {players.length} Jugadoras
            </Button>
          </div>
        </form>
      )}

      {/* Main Grid: Selector of sessions (Left) + Player status editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Sessions List */}
        <div className="lg:col-span-1 bg-slate-900/30 border border-slate-900 rounded-3xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Historial de Sesiones</h5>
            <span className="text-[10px] bg-slate-950 border border-slate-850 text-slate-400 px-2.5 py-1 rounded-full font-bold">{sessions.length}</span>
          </div>

          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            {sessions.length > 0 ? (
              sessions.map((sess) => {
                const stats = getSessionStats(sess);
                const isActive = selectedSession?.id === sess.id;
                
                return (
                  <div 
                    key={sess.id}
                    onClick={() => handleSelectSession(sess)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isActive 
                        ? 'bg-blue-600/10 border-blue-600' 
                        : 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-md mb-1.5 ${
                          sess.tipo === 'Entrenamiento' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          sess.tipo === 'Partido' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {sess.tipo === 'Entrenamiento' ? 'Sesión de Entrenamiento' : sess.tipo}
                        </span>
                        <h6 className="font-bold text-white text-xs leading-snug break-words">{sess.descripcion}</h6>
                      </div>
                      <span className="text-[9px] font-bold text-slate-500 shrink-0">{sess.fecha}</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-900/60 pt-2 text-[10px]">
                      <span className="text-slate-400 font-semibold">Asistencia:</span>
                      <span className={`font-black ${
                        stats.markedCount === 0
                          ? 'text-slate-500'
                          : stats.percentage >= 80 
                          ? 'text-emerald-400' 
                          : stats.percentage >= 60 
                          ? 'text-amber-400' 
                          : 'text-red-400'
                      }`}>
                        {stats.markedCount === 0
                          ? `Sin registrar (0/${sess.records.length})`
                          : `${stats.percentage}% (${stats.presentCount}/${sess.records.length})`}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-850 rounded-2xl flex flex-col items-center justify-center gap-1">
                <Calendar className="w-8 h-8 text-slate-700" />
                <p className="text-xs uppercase font-bold text-slate-400">Sin sesiones todavía</p>
                <p className="text-[10px] text-slate-600">Haz clic en Nueva Sesión para empezar.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Roster attendance editor */}
        <div className="lg:col-span-2 bg-slate-900/30 border border-slate-900 rounded-3xl p-6 flex flex-col justify-between gap-6 min-h-[400px]">
          {selectedSession ? (
            <div className="space-y-6">
              
              {/* Session Header Details */}
              <div className="flex items-start justify-between border-b border-slate-900 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="font-extrabold text-white text-base uppercase tracking-tight">{selectedSession.descripcion}</h5>
                    <span className="text-xs font-bold text-blue-400 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/10 uppercase">{selectedSession.tipo}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">
                    PROGRAMADA PARA: {selectedSession.fecha} {selectedSession.hora ? `• HORA: ${selectedSession.hora}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    onClick={() => handleOpenEditSession(selectedSession)}
                    variant="outline"
                    className="text-xs font-bold text-blue-400 border-blue-500/30 hover:bg-blue-950/50 py-1.5 h-auto rounded-xl gap-1.5 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-400" />
                    <span>Editar Sesión</span>
                  </Button>

                  <Button 
                    onClick={() => handleDeleteSession(selectedSession.id)}
                    variant="ghost"
                    className="text-xs font-bold text-slate-500 hover:text-red-400 py-1.5 h-auto rounded-xl"
                  >
                    Eliminar Sesión
                  </Button>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-slate-900 gap-1 pb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('asistencia')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-colors border-b-2 rounded-t-lg ${
                    activeTab === 'asistencia'
                      ? 'border-emerald-500 text-emerald-400 bg-slate-950/30'
                      : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-950/10'
                  }`}
                >
                  Asistencia Jugadoras
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('planificacion')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-colors border-b-2 rounded-t-lg flex items-center justify-center gap-2 ${
                    activeTab === 'planificacion'
                      ? 'border-emerald-500 text-emerald-400 bg-slate-950/30'
                      : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-950/10'
                  }`}
                >
                  <span>Diseño, Tareas y Observaciones</span>
                  {(selectedSession.observaciones?.trim() || (selectedSession.tareas && selectedSession.tareas.length > 0)) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              </div>

              {activeTab === 'asistencia' ? (
                <div className="space-y-4">
                  {/* 5 Real-Time Status Counters Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {/* PRESENTE */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter(prev => prev === 'Presente' ? 'ALL' : 'Presente')}
                      className={`p-3 rounded-2xl border transition-all text-left flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                        statusFilter === 'Presente'
                          ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-950/50'
                          : 'bg-slate-950/70 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-950/20'
                      }`}
                      title="Filtrar por jugadoras presentes"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block truncate">
                          Presente
                        </span>
                        <span className="text-xl font-black text-white leading-tight">
                          {sessionCounts.presente}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                    </button>

                    {/* RETRASO */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter(prev => prev === 'Retraso' ? 'ALL' : 'Retraso')}
                      className={`p-3 rounded-2xl border transition-all text-left flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                        statusFilter === 'Retraso'
                          ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/40 shadow-lg shadow-amber-950/50'
                          : 'bg-slate-950/70 border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-950/20'
                      }`}
                      title="Filtrar por jugadoras con retraso"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block truncate">
                          Retraso
                        </span>
                        <span className="text-xl font-black text-white leading-tight">
                          {sessionCounts.retraso}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                    </button>

                    {/* NO JUSTIFICADO */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter(prev => prev === 'No Justificó' ? 'ALL' : 'No Justificó')}
                      className={`p-3 rounded-2xl border transition-all text-left flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                        statusFilter === 'No Justificó'
                          ? 'bg-red-500/20 border-red-500 ring-2 ring-red-500/40 shadow-lg shadow-red-950/50'
                          : 'bg-slate-950/70 border-red-500/30 hover:border-red-500/60 hover:bg-red-950/20'
                      }`}
                      title="Filtrar por ausencias no justificadas"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-red-400 uppercase tracking-wider block truncate">
                          No Justificado
                        </span>
                        <span className="text-xl font-black text-white leading-tight">
                          {sessionCounts.noJustifico}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center font-black shrink-0">
                        <X className="w-4 h-4" />
                      </div>
                    </button>

                    {/* JUSTIFICADO */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter(prev => prev === 'Justificado' ? 'ALL' : 'Justificado')}
                      className={`p-3 rounded-2xl border transition-all text-left flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                        statusFilter === 'Justificado'
                          ? 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-500/40 shadow-lg shadow-purple-950/50'
                          : 'bg-slate-950/70 border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-950/20'
                      }`}
                      title="Filtrar por ausencias justificadas"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider block truncate">
                          Justificado
                        </span>
                        <span className="text-xl font-black text-white leading-tight">
                          {sessionCounts.justificado}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center font-black shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                    </button>

                    {/* LESIONADO */}
                    <button
                      type="button"
                      onClick={() => setStatusFilter(prev => prev === 'Lesionado' ? 'ALL' : 'Lesionado')}
                      className={`p-3 rounded-2xl border transition-all text-left flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                        statusFilter === 'Lesionado'
                          ? 'bg-indigo-500/20 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-950/50'
                          : 'bg-slate-950/70 border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-950/20'
                      }`}
                      title="Filtrar por jugadoras lesionadas"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block truncate">
                          Lesionado
                        </span>
                        <span className="text-xl font-black text-white leading-tight">
                          {sessionCounts.lesionado}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black shrink-0">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                    </button>
                  </div>

                  {/* Active status filter banner */}
                  {statusFilter !== 'ALL' && (
                    <div className="flex items-center justify-between bg-blue-950/30 border border-blue-500/30 rounded-xl px-3.5 py-2 text-xs text-blue-300 animate-in fade-in">
                      <span>Mostrando solo jugadoras con estado: <strong className="uppercase text-white font-bold">{statusFilter}</strong></span>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className="text-xs font-bold text-blue-400 hover:text-white underline cursor-pointer"
                      >
                        Mostrar todas ({validSessionRecords.length})
                      </button>
                    </div>
                  )}

                  {/* Missing Roster Players Notification Banner */}
                  {missingRosterPlayers.length > 0 && (
                    <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h6 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                            {missingRosterPlayers.length} {missingRosterPlayers.length === 1 ? 'jugadora de la plantilla no está' : 'jugadoras de la plantilla no están'} en esta sesión
                          </h6>
                          <p className="text-[11px] text-amber-400/80 font-medium">
                            {missingRosterPlayers.map(p => `${p.nombre} ${p.apellidos}`).slice(0, 3).join(', ')}
                            {missingRosterPlayers.length > 3 ? ` y ${missingRosterPlayers.length - 3} más` : ''}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddMissingRosterPlayers}
                        className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold uppercase rounded-xl gap-2 h-9 shrink-0 cursor-pointer shadow-lg shadow-amber-600/20"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Sincronizar Plantilla (+{missingRosterPlayers.length})</span>
                      </Button>
                    </div>
                  )}

                  {/* Action and Filter Header */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-850">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative flex-1 sm:max-w-xs">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Buscar por nombre o posición..."
                          value={searchPlayerQuery}
                          onChange={(e) => setSearchPlayerQuery(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                        {searchPlayerQuery && (
                          <button
                            onClick={() => setSearchPlayerQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 px-2.5 py-1 bg-slate-900 rounded-xl border border-slate-800 shrink-0">
                        {validSessionRecords.length} {validSessionRecords.length === 1 ? 'jugadora' : 'jugadoras'} convocadas
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllPresent}
                        className="text-xs font-bold border-slate-800 text-slate-300 hover:bg-slate-900 rounded-xl gap-1.5 h-8.5 cursor-pointer"
                        title="Marcar todas las jugadoras como Presente"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden md:inline">Marcar</span>
                        <span>Todas Presentes</span>
                      </Button>

                      <Button
                        type="button"
                        onClick={() => {
                          setAddPlayerTab('manual');
                          setShowAddPlayerModal(true);
                        }}
                        className="text-xs font-extrabold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-1.5 h-8.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Meter Jugadora</span>
                      </Button>
                    </div>
                  </div>

                  {/* Roster Attendance Table Grid */}
                  <div className="space-y-2.5">
                    {validSessionRecords.length > 0 ? (
                      validSessionRecords
                        .filter((rec) => {
                          // Apply Status Filter if active
                          if (statusFilter !== 'ALL') {
                            if (statusFilter === 'Presente' && rec.status !== 'Presente') return false;
                            if (statusFilter === 'Retraso' && rec.status !== 'Retraso') return false;
                            if (statusFilter === 'No Justificó' && rec.status !== 'No Justificó' && rec.status !== 'Ausente') return false;
                            if (statusFilter === 'Justificado' && rec.status !== 'Justificado') return false;
                            if (statusFilter === 'Lesionado' && rec.status !== 'Lesionado') return false;
                            if (statusFilter === 'Pendiente' && rec.status) return false;
                          }

                          // Apply Search Query
                          if (!searchPlayerQuery.trim()) return true;
                          const pInfo = players.find(p => p.id === rec.playerId);
                          const name = `${pInfo?.nombre || rec.playerName || ''} ${pInfo?.apellidos || rec.playerLastName || ''}`.toLowerCase();
                          const pos = `${pInfo?.posicion || rec.playerPosition || ''}`.toLowerCase();
                          const dorsal = `${pInfo?.dorsal || rec.playerDorsal || ''}`;
                          const q = searchPlayerQuery.toLowerCase().trim();
                          return name.includes(q) || pos.includes(q) || dorsal.includes(q);
                        })
                        .map((rec) => {
                          const pInfo = players.find(p => p.id === rec.playerId) || {
                            id: rec.playerId,
                            nombre: rec.playerName || 'Jugadora',
                            apellidos: rec.playerLastName || '',
                            dorsal: rec.playerDorsal || '-',
                            posicion: rec.playerPosition || 'JUGADORA',
                            foto_url: rec.foto_url,
                            isGuest: rec.isGuest
                          };

                          const photoUrl = pInfo.foto_url || rec.foto_url;

                          return (
                            <div 
                              key={rec.playerId}
                              className="bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors group"
                            >
                              {/* Left: Player name, photo & dorsal */}
                              <div className="flex items-center gap-3 min-w-0">
                                {photoUrl ? (
                                  <img
                                    src={photoUrl}
                                    alt={`${pInfo.nombre} ${pInfo.apellidos}`}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0 shadow-sm"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-blue-600/10 border border-blue-500/20 text-blue-400 font-black text-xs rounded-full flex items-center justify-center shrink-0">
                                    {pInfo.dorsal || '-'}
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {photoUrl && pInfo.dorsal && (
                                      <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 rounded">
                                        #{pInfo.dorsal}
                                      </span>
                                    )}
                                    <h6 className="font-bold text-white text-xs uppercase truncate">
                                      {pInfo.nombre} {pInfo.apellidos}
                                    </h6>
                                    {(pInfo.isGuest || rec.isGuest) && (
                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                                        Invitada / Manual
                                      </span>
                                    )}
                                    {pInfo.equipo_origen && pInfo.equipo_origen !== selectedTeam && (
                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20 truncate max-w-[120px]">
                                        {pInfo.equipo_origen}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase">{pInfo.posicion}</p>
                                </div>
                              </div>

                              {/* Right: Interactive attendance statuses + Remove Action */}
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                
                                {/* PRESENT */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(rec.playerId, 'Presente')}
                                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all cursor-pointer ${
                                    rec.status === 'Presente'
                                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                                      : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  Presente
                                </button>

                                {/* LATE */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(rec.playerId, 'Retraso')}
                                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all cursor-pointer ${
                                    rec.status === 'Retraso'
                                      ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                                      : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  Retraso
                                </button>

                                {/* NO JUSTIFICO */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(rec.playerId, 'No Justificó')}
                                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all cursor-pointer ${
                                    rec.status === 'No Justificó' || rec.status === 'Ausente'
                                      ? 'bg-red-500/15 border-red-500 text-red-400'
                                      : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  No Justificó
                                </button>

                                {/* JUSTIFIED */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(rec.playerId, 'Justificado')}
                                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all cursor-pointer ${
                                    rec.status === 'Justificado'
                                      ? 'bg-purple-500/15 border-purple-500 text-purple-400'
                                      : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  Justificado
                                </button>

                                {/* INJURED */}
                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(rec.playerId, 'Lesionado')}
                                  className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border transition-all cursor-pointer ${
                                    rec.status === 'Lesionado'
                                      ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400'
                                      : 'bg-slate-950 border-slate-850 hover:bg-slate-900 text-slate-500 hover:text-slate-300'
                                  }`}
                                >
                                  Lesionado
                                </button>

                                {/* Remove player from session */}
                                <button
                                  type="button"
                                  onClick={() => handleRemovePlayerFromSession(rec.playerId)}
                                  className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-1 cursor-pointer"
                                  title="Quitar jugadora de esta sesión"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                              </div>

                            </div>
                          );
                        })
                    ) : (
                      <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 p-6 space-y-3">
                        <Users className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-xs font-bold uppercase text-slate-400">No hay jugadoras en esta sesión</p>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                          Puedes meter jugadoras manualmente o seleccionarlas de la cantera para registrar su asistencia.
                        </p>
                        <Button
                          type="button"
                          onClick={() => {
                            setAddPlayerTab('manual');
                            setShowAddPlayerModal(true);
                          }}
                          className="text-xs font-extrabold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-2 mt-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>+ Meter Jugadora Manualmente</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Planning Dashboard */
                <div className="space-y-6">
                  {/* Comentarios y Observaciones del Entreno Section */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                            <span>Comentarios y Observaciones del Entreno</span>
                          </h5>
                          <p className="text-[10px] text-slate-400">
                            Notas del cuerpo técnico sobre rendimiento, sensaciones grupales, objetivos e incidencias.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 transition-all ${
                          observacionesSaved
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${observacionesSaved ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          {observacionesSaved ? 'Guardado' : 'Cambios pendientes'}
                        </span>
                        <Button
                          type="button"
                          onClick={() => handleSaveObservaciones()}
                          className="text-[10px] uppercase font-black tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white h-8 px-3.5 rounded-xl gap-1.5 shadow-lg shadow-emerald-950/40 transition-all"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Guardar Notas</span>
                        </Button>
                      </div>
                    </div>

                    {/* Quick Tags / Fast Templates */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">
                          Atajos y Plantillas Rápidas:
                        </span>
                        {observacionesInput.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('¿Deseas vaciar el texto de observaciones de esta sesión?')) {
                                setObservacionesInput('');
                                handleSaveObservaciones('');
                              }
                            }}
                            className="text-[9px] text-slate-500 hover:text-red-400 font-bold uppercase transition-colors"
                          >
                            Limpiar texto
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          'Sensaciones del grupo',
                          'Ritmo e intensidad',
                          'Aspectos tácticos clave',
                          'Aspectos a mejorar',
                          'Incidencias físicas / Molestias',
                          'Jugadoras destacadas'
                        ].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAppendQuickTag(tag)}
                            className="text-[10px] bg-slate-900 hover:bg-emerald-950/30 text-slate-400 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1"
                          >
                            <span>+</span>
                            <span>{tag}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Textarea */}
                    <div className="space-y-1.5">
                      <textarea
                        value={observacionesInput}
                        onChange={(e) => {
                          setObservacionesInput(e.target.value);
                          setObservacionesSaved(false);
                        }}
                        onBlur={() => {
                          if (!observacionesSaved) {
                            handleSaveObservaciones(observacionesInput);
                          }
                        }}
                        placeholder="Escribe aquí las conclusiones y observaciones del entrenamiento: sensaciones del equipo, cómo salieron las tareas, aspectos tácticos a reforzar en el próximo entreno, jugadoras a destacar, molestias físicas, etc..."
                        rows={5}
                        className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl p-3.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none transition-all resize-y leading-relaxed font-normal shadow-inner"
                      />
                      <div className="flex items-center justify-between pt-1 px-1">
                        <span className="text-[10px] text-slate-500">
                          {observacionesInput.trim() ? `${observacionesInput.trim().split(/\s+/).length} palabras` : '0 palabras'} • {observacionesInput.length} caracteres
                        </span>
                        <span className="text-[10px] text-slate-500 italic">
                          💡 Se guarda automáticamente al hacer clic fuera o al pulsar "Guardar Notas".
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tareas / Ejercicios Section */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-emerald-400" />
                        <h5 className="font-bold text-white text-xs uppercase tracking-wider">Tareas y Ejercicios Diseñados</h5>
                      </div>
                      <span className="text-[10px] bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                        {selectedSession.tareas?.length || 0} tareas
                      </span>
                    </div>

                    {/* Task List */}
                    {selectedSession.tareas && selectedSession.tareas.length > 0 ? (
                      <div className="space-y-3">
                        {selectedSession.tareas.map((task) => (
                          <div key={task.id} className="bg-slate-950/80 border border-slate-850 p-3.5 rounded-xl flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold shrink-0">
                                  {task.duracion} min
                                </span>
                                <h6 className="font-extrabold text-white text-xs uppercase">{task.titulo}</h6>
                              </div>
                              <p className="text-[11px] text-slate-400 whitespace-pre-wrap leading-relaxed">{task.descripcion}</p>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                              title="Eliminar tarea"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-slate-850 rounded-xl text-slate-500 text-xs italic">
                        No hay tareas diseñadas para esta sesión. Añade una tarea a continuación.
                      </div>
                    )}

                    {/* Add Task Form (Inline) */}
                    <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-3">
                      <h6 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Añadir nueva tarea/ejercicio</h6>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input 
                          type="text" 
                          placeholder="Título de la tarea (ej: Rondo 4v4+2)" 
                          id="newTaskTitle"
                          className="sm:col-span-2 bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                        <input 
                          type="text" 
                          placeholder="Duración (ej: 15 min)" 
                          id="newTaskDuration"
                          className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <textarea 
                        placeholder="Descripción de la tarea, organización, reglas de provocación, etc..." 
                        id="newTaskDesc"
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                      />
                      <div className="flex justify-end">
                        <Button 
                          type="button"
                          onClick={() => {
                            const titleEl = document.getElementById('newTaskTitle') as HTMLInputElement;
                            const durEl = document.getElementById('newTaskDuration') as HTMLInputElement;
                            const descEl = document.getElementById('newTaskDesc') as HTMLTextAreaElement;
                            if (titleEl && durEl && descEl) {
                              if (!titleEl.value.trim()) {
                                toast.error('Especifica un título para la tarea');
                                return;
                              }
                              handleAddTask(titleEl.value, durEl.value || '10', descEl.value);
                              titleEl.value = '';
                              durEl.value = '';
                              descEl.value = '';
                            }
                          }}
                          className="text-[10px] uppercase font-black tracking-widest bg-emerald-600 hover:bg-emerald-500 h-8 px-3 rounded-lg"
                        >
                          Añadir Tarea
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Archivos / Blueprint Upload Section */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div className="flex items-center gap-2">
                        <UploadCloud className="w-4 h-4 text-emerald-400" />
                        <h5 className="font-bold text-white text-xs uppercase tracking-wider">Subir Archivo de Sesión (Diseño, PDF, Imagen)</h5>
                      </div>
                      <span className="text-[10px] bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                        {selectedSession.archivos?.length || 0} archivos
                      </span>
                    </div>

                    {/* File Upload Dropzone */}
                    <div className="border border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 text-center cursor-pointer relative transition-colors bg-slate-950/20 group">
                      <input 
                        type="file" 
                        onChange={handleFileUpload}
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <UploadCloud className="w-8 h-8 text-slate-600 group-hover:text-emerald-400 mx-auto transition-colors" />
                      <p className="text-xs text-slate-300 font-bold uppercase mt-2">Seleccionar o arrastrar archivos</p>
                      <p className="text-[10px] text-slate-500 mt-1">Soporta PDF, PNG, JPG, DOCX (Máximo 1.5MB)</p>
                    </div>

                    {/* File List */}
                    {selectedSession.archivos && selectedSession.archivos.length > 0 ? (
                      <div className="space-y-2">
                        {selectedSession.archivos.map((file) => (
                          <div key={file.id} className="bg-slate-950/60 border border-slate-850 hover:border-slate-800 p-3 rounded-xl flex items-center justify-between gap-4 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white uppercase truncate" title={file.nombre}>{file.nombre}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase">{file.tamano}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {file.dataUrl && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewFile(file)}
                                    className="p-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors"
                                    title="Visualizar archivo"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <a 
                                    href={file.dataUrl} 
                                    download={file.nombre}
                                    className="p-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors"
                                    title="Descargar archivo"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </>
                              )}
                              <button 
                                type="button"
                                onClick={() => handleDeleteFile(file.id)}
                                className="p-1.5 bg-slate-900 hover:bg-red-500/15 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/20 rounded-lg transition-all"
                                title="Eliminar archivo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-slate-850 rounded-xl text-slate-500 text-xs italic">
                        No hay archivos subidos para esta sesión.
                      </div>
                    )}
                  </div>

                  {/* Vídeos de la Sesión (YouTube o Galería Local) Section */}
                  <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-5 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                          <Film className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                            <span>Vídeos de la Sesión y Análisis Táctico</span>
                          </h5>
                          <p className="text-[10px] text-slate-400">
                            Embebe vídeos de YouTube (ejercicios, rivales, partidos) o sube clips directos desde la galería de tu dispositivo.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                        {selectedSession.videos?.length || 0} vídeos
                      </span>
                    </div>

                    {/* Video Form Switcher Tabs */}
                    <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                        <button
                          type="button"
                          onClick={() => setVideoModalTab('youtube')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                            videoModalTab === 'youtube'
                              ? 'bg-red-600 text-white shadow-lg shadow-red-950/40'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-850'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Embeber de YouTube</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVideoModalTab('local')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                            videoModalTab === 'local'
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-850'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Subir desde Galería / Dispositivo</span>
                        </button>
                      </div>

                      {/* Video Title & Description Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                            Título del Vídeo (Opcional)
                          </label>
                          <input
                            type="text"
                            value={videoTitleInput}
                            onChange={(e) => setVideoTitleInput(e.target.value)}
                            placeholder="Ej: Salida de balón 3v2 / Resumen primera parte"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                            Descripción / Nota táctica (Opcional)
                          </label>
                          <input
                            type="text"
                            value={videoDescInput}
                            onChange={(e) => setVideoDescInput(e.target.value)}
                            placeholder="Ej: Fijar atención en el desmarque de ruptura al minuto 01:20..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* YouTube Embed Form */}
                      {videoModalTab === 'youtube' ? (
                        <div className="space-y-3 pt-1">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                              <Play className="w-4 h-4 text-red-500 fill-red-500 absolute left-3 top-2.5" />
                              <input
                                type="url"
                                value={youtubeUrlInput}
                                onChange={(e) => setYoutubeUrlInput(e.target.value)}
                                placeholder="Pega el enlace o enlace corto de YouTube (ej: https://www.youtube.com/watch?v=... o youtu.be/...)"
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500"
                              />
                            </div>
                            <Button
                              type="button"
                              onClick={handleAddYouTubeVideo}
                              className="text-[10px] uppercase font-black tracking-widest bg-red-600 hover:bg-red-500 text-white h-9 px-4 rounded-lg shrink-0 gap-1.5 shadow-lg shadow-red-950/40"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Embeber Vídeo</span>
                            </Button>
                          </div>
                          {extractYouTubeId(youtubeUrlInput) && (
                            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-3">
                              <img
                                src={`https://img.youtube.com/vi/${extractYouTubeId(youtubeUrlInput)}/mqdefault.jpg`}
                                alt="Previsualización YouTube"
                                className="w-24 h-14 object-cover rounded-lg border border-slate-800 shrink-0"
                              />
                              <div className="min-w-0">
                                <span className="text-[10px] text-emerald-400 font-bold uppercase block">✓ Enlace reconocido con éxito</span>
                                <p className="text-xs text-white truncate font-semibold">ID: {extractYouTubeId(youtubeUrlInput)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Local File / Gallery Upload */
                        <div className="space-y-3 pt-1">
                          <div className="border border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-5 text-center cursor-pointer relative transition-colors bg-slate-900/30 group">
                            <input
                              type="file"
                              onChange={handleLocalVideoUpload}
                              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-m4v,video/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Video className="w-7 h-7 text-slate-600 group-hover:text-emerald-400 mx-auto transition-colors" />
                            <p className="text-xs text-slate-300 font-bold uppercase mt-2">
                              Seleccionar vídeo de tu galería o almacenamiento
                            </p>
                            <p className="text-[10px] text-slate-500 mt-1">
                              Soporta MP4, MOV, WEBM, M4V (Límite recomendado: hasta 25MB)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Video Gallery / List */}
                    {selectedSession.videos && selectedSession.videos.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedSession.videos.map((vid) => (
                          <div
                            key={vid.id}
                            className="bg-slate-950/80 border border-slate-850 hover:border-slate-750 rounded-2xl overflow-hidden flex flex-col transition-all shadow-md group"
                          >
                            {/* Video Display Area */}
                            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                              {vid.tipo === 'youtube' && vid.youtubeId ? (
                                <iframe
                                  src={vid.url}
                                  title={vid.titulo}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  allowFullScreen
                                  className="w-full h-full border-0"
                                />
                              ) : (
                                <video
                                  src={vid.url}
                                  controls
                                  preload="metadata"
                                  className="w-full h-full object-contain bg-black"
                                />
                              )}
                            </div>

                            {/* Info & Actions */}
                            <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {vid.tipo === 'youtube' ? (
                                      <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-black uppercase shrink-0 flex items-center gap-1">
                                        <Play className="w-2.5 h-2.5 fill-current" /> YouTube
                                      </span>
                                    ) : (
                                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase shrink-0 flex items-center gap-1">
                                        <Film className="w-3 h-3" /> Galería {vid.tamano ? `(${vid.tamano})` : ''}
                                      </span>
                                    )}
                                    <h6 className="font-extrabold text-white text-xs uppercase truncate" title={vid.titulo}>
                                      {vid.titulo}
                                    </h6>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewVideo(vid)}
                                      className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition-colors"
                                      title="Ver a pantalla completa"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteVideo(vid.id)}
                                      className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors"
                                      title="Eliminar vídeo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {vid.descripcion && (
                                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed bg-slate-900/40 p-2 rounded-lg border border-slate-900">
                                    {vid.descripcion}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[9px] text-slate-500 pt-2 border-t border-slate-900 mt-2">
                                <span>{vid.fechaSubida || 'Añadido a la sesión'}</span>
                                {vid.tipo === 'youtube' && vid.youtubeId && (
                                  <a
                                    href={`https://www.youtube.com/watch?v=${vid.youtubeId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-red-400 hover:underline flex items-center gap-1 font-bold"
                                  >
                                    <span>Ver en YouTube</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 border border-dashed border-slate-850 rounded-xl text-slate-500 text-xs italic space-y-1">
                        <Film className="w-7 h-7 text-slate-700 mx-auto" />
                        <p>No hay vídeos embebidos ni subidos para esta sesión.</p>
                        <p className="text-[10px] text-slate-600">Pega un enlace de YouTube o selecciona un clip de vídeo arriba.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <Users className="w-12 h-12 text-slate-800" />
              <h5 className="font-bold text-white uppercase text-sm">Sin sesión activa</h5>
              <p className="text-xs text-slate-500 max-w-xs">Selecciona una sesión de asistencia de la izquierda o crea una nueva para registrar la asistencia.</p>
            </div>
          )}
        </div>

      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl w-full shadow-2xl text-left flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <FileText className="w-5 h-5" />
                <h4 className="font-extrabold text-white text-base uppercase tracking-wider truncate max-w-md" title={previewFile.nombre}>
                  {previewFile.nombre}
                </h4>
              </div>
              <span className="text-[10px] bg-slate-950 border border-slate-850 text-slate-400 px-2.5 py-1 rounded-full font-bold">
                {previewFile.tamano}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-950/50 rounded-2xl p-4 flex items-center justify-center border border-slate-950">
              {previewFile.tipo.startsWith('image/') ? (
                <img 
                  src={previewBlobUrl || previewFile.dataUrl} 
                  alt={previewFile.nombre} 
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  referrerPolicy="no-referrer"
                />
              ) : previewFile.tipo === 'application/pdf' ? (
                <div className="w-full flex flex-col items-center gap-4">
                  <iframe 
                    src={previewBlobUrl || previewFile.dataUrl} 
                    className="w-full h-[55vh] rounded-lg border border-slate-850 bg-white" 
                    title={previewFile.nombre}
                  />
                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-2xl p-4 w-full text-center space-y-1">
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-wide">
                      💡 ¿La visualización está bloqueada por el navegador?
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Algunos navegadores bloquean la carga de PDFs dentro de paneles integrados por seguridad. Puedes pulsar el botón{' '}
                      <span className="text-emerald-400 font-bold">"Abrir en Pestaña Nueva"</span> de abajo para visualizarlo en pantalla completa al instante.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-4">
                  <FileText className="w-16 h-16 text-slate-700 mx-auto" />
                  <p className="text-sm font-bold uppercase text-slate-300">Vista previa no disponible para este formato</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Este archivo ({previewFile.nombre}) tiene un formato que no se puede previsualizar directamente en el navegador. Descárgalo para abrirlo con tu aplicación preferida.
                  </p>
                  {previewFile.dataUrl && (
                    <a
                      href={previewBlobUrl || previewFile.dataUrl}
                      download={previewFile.nombre}
                      className="inline-flex items-center gap-2 text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2.5 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Archivo</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-slate-900">
              {previewBlobUrl && previewFile.tipo === 'application/pdf' && (
                <a
                  href={previewBlobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold uppercase bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir en Pestaña Nueva</span>
                </a>
              )}
              {previewFile.dataUrl && (
                <a
                  href={previewBlobUrl || previewFile.dataUrl}
                  download={previewFile.nombre}
                  className="text-xs font-bold uppercase bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-200 rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </a>
              )}
              <Button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl w-full shadow-2xl text-left flex flex-col max-h-[95vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-red-400">
                {previewVideo.tipo === 'youtube' ? <Play className="w-5 h-5 fill-current" /> : <Film className="w-5 h-5 text-emerald-400" />}
                <h4 className="font-extrabold text-white text-base uppercase tracking-wider truncate max-w-md" title={previewVideo.titulo}>
                  {previewVideo.titulo}
                </h4>
              </div>
              <span className={`text-[10px] border px-2.5 py-1 rounded-full font-bold uppercase ${
                previewVideo.tipo === 'youtube'
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {previewVideo.tipo === 'youtube' ? 'YouTube' : `Galería ${previewVideo.tamano ? `(${previewVideo.tamano})` : ''}`}
              </span>
            </div>

            <div className="flex-1 bg-black rounded-2xl overflow-hidden flex items-center justify-center aspect-video max-h-[65vh]">
              {previewVideo.tipo === 'youtube' && previewVideo.youtubeId ? (
                <iframe
                  src={previewVideo.url}
                  title={previewVideo.titulo}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <video
                  src={previewVideo.url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {previewVideo.descripcion && (
              <div className="mt-3 p-3 bg-slate-950/70 border border-slate-850 rounded-xl">
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {previewVideo.descripcion}
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-slate-900">
              {previewVideo.tipo === 'youtube' && previewVideo.youtubeId && (
                <a
                  href={`https://www.youtube.com/watch?v=${previewVideo.youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold uppercase bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir en YouTube</span>
                </a>
              )}
              {previewVideo.tipo === 'local' && previewVideo.url && (
                <a
                  href={previewVideo.url}
                  download={`${previewVideo.titulo}.mp4`}
                  className="text-xs font-bold uppercase bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-200 rounded-xl px-4 py-2 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Vídeo</span>
                </a>
              )}
              <Button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="text-xs font-bold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-5 py-2"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for editing selected session */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                  Editar Sesión de Entrenamiento
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setEditingSession(null)}
                className="text-slate-400 hover:text-white cursor-pointer font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSession} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Descripción / Título del Entrenamiento *
                </label>
                <input 
                  type="text" 
                  required
                  value={editSessionForm.descripcion}
                  onChange={(e) => setEditSessionForm({ ...editSessionForm, descripcion: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                  placeholder="Ej. Sesión de entrenamiento habitual"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Fecha
                  </label>
                  <input 
                    type="date" 
                    required
                    value={editSessionForm.fecha}
                    onChange={(e) => setEditSessionForm({ ...editSessionForm, fecha: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Hora
                  </label>
                  <input 
                    type="text" 
                    value={editSessionForm.hora}
                    onChange={(e) => setEditSessionForm({ ...editSessionForm, hora: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-semibold"
                    placeholder="Ej. 19:30 h"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Tipo de Actividad
                </label>
                <select 
                  value={editSessionForm.tipo}
                  onChange={(e) => setEditSessionForm({ ...editSessionForm, tipo: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-semibold cursor-pointer"
                >
                  <option value="Entrenamiento">Entrenamiento</option>
                  <option value="Partido">Partido</option>
                  <option value="Reunión">Reunión</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingSession(null)}
                  className="text-xs font-bold border-slate-800 text-slate-300 rounded-xl cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="text-xs font-extrabold uppercase bg-blue-600 hover:bg-blue-500 text-white rounded-xl gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for adding player manually or from club roster to the session */}
      {showAddPlayerModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                    Meter Jugadora a la Sesión
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {selectedSession.fecha} • {selectedSession.descripcion}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddPlayerModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer font-bold text-lg p-1.5 rounded-xl hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setAddPlayerTab('manual')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  addPlayerTab === 'manual'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                + Entrada Manual / Invitada
              </button>
              <button
                type="button"
                onClick={() => setAddPlayerTab('club')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                  addPlayerTab === 'club'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                Buscar en Cantera / Club ({availablePlayersNotInSession.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {addPlayerTab === 'manual' ? (
                /* Manual Player Form */
                <form onSubmit={handleAddManualPlayerToSession} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Nombre *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={manualPlayerForm.nombre}
                        onChange={(e) => setManualPlayerForm({ ...manualPlayerForm, nombre: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                        placeholder="Ej. Carmen"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Apellidos
                      </label>
                      <input 
                        type="text" 
                        value={manualPlayerForm.apellidos}
                        onChange={(e) => setManualPlayerForm({ ...manualPlayerForm, apellidos: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                        placeholder="Ej. Navarro López"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Dorsal (Opcional)
                      </label>
                      <input 
                        type="text" 
                        value={manualPlayerForm.dorsal}
                        onChange={(e) => setManualPlayerForm({ ...manualPlayerForm, dorsal: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                        placeholder="Ej. 14"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Posición
                      </label>
                      <select 
                        value={manualPlayerForm.posicion}
                        onChange={(e) => setManualPlayerForm({ ...manualPlayerForm, posicion: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold cursor-pointer"
                      >
                        <option value="PORTERA">PORTERA</option>
                        <option value="LATERAL IZQUIERDO">LATERAL IZQUIERDO</option>
                        <option value="LATERAL DERECHO">LATERAL DERECHO</option>
                        <option value="CENTRAL">CENTRAL</option>
                        <option value="EXTREMO IZQUIERDO">EXTREMO IZQUIERDO</option>
                        <option value="EXTREMO DERECHO">EXTREMO DERECHO</option>
                        <option value="PIVOTE">PIVOTE</option>
                        <option value="JUGADORA">JUGADORA</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Estado inicial de asistencia
                    </label>
                    <select 
                      value={manualPlayerForm.status || ''}
                      onChange={(e) => setManualPlayerForm({ ...manualPlayerForm, status: (e.target.value || undefined) as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold cursor-pointer"
                    >
                      <option value="">Sin marcar (Seleccionar manualmente)</option>
                      <option value="Presente">Presente</option>
                      <option value="Retraso">Retraso</option>
                      <option value="No Justificó">No Justificó</option>
                      <option value="Justificado">Justificado</option>
                      <option value="Lesionado">Lesionado</option>
                    </select>
                  </div>

                  <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block">Guardar en la plantilla permanente</span>
                      <span className="text-[10px] text-slate-400 block">
                        Si está activado, quedará guardada en el equipo {selectedTeam} para futuras sesiones.
                      </span>
                    </div>
                    <input 
                      type="checkbox"
                      id="saveToRosterCheckbox"
                      checked={manualPlayerForm.saveToRoster}
                      onChange={(e) => setManualPlayerForm({ ...manualPlayerForm, saveToRoster: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-900 cursor-pointer"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowAddPlayerModal(false)}
                      className="text-xs font-bold border-slate-800 text-slate-300 rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      className="text-xs font-extrabold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Añadir a la Sesión</span>
                    </Button>
                  </div>
                </form>
              ) : (
                /* Club Roster / Cross-category Player Selector */
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      placeholder="Filtrar por nombre, categoría o posición..."
                      value={searchPlayerQuery}
                      onChange={(e) => setSearchPlayerQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {availablePlayersNotInSession
                      .filter(p => {
                        if (!searchPlayerQuery.trim()) return true;
                        const full = `${p.nombre} ${p.apellidos} ${p.posicion} ${p.dorsal} ${p.equipo_origen || ''}`.toLowerCase();
                        return full.includes(searchPlayerQuery.toLowerCase().trim());
                      })
                      .map(p => (
                        <div 
                          key={p.id}
                          className="bg-slate-950/60 border border-slate-850 hover:border-slate-750 p-2.5 rounded-xl flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-blue-600/15 border border-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center shrink-0">
                              {p.dorsal || '-'}
                            </div>
                            <div className="min-w-0">
                              <h6 className="text-xs font-bold text-white uppercase truncate">
                                {p.nombre} {p.apellidos}
                              </h6>
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase">
                                <span>{p.posicion}</span>
                                {p.equipo_origen && (
                                  <span className="text-emerald-400/80 bg-emerald-950/40 px-1 rounded border border-emerald-800/30">
                                    {p.equipo_origen}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAddClubPlayerToSession(p)}
                            className="text-[10px] font-extrabold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg h-7 px-2.5 gap-1 shrink-0 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Añadir</span>
                          </Button>
                        </div>
                      ))}

                    {availablePlayersNotInSession.length === 0 && (
                      <p className="text-center py-8 text-xs text-slate-500 font-medium">
                        Todas las jugadoras registradas en el club ya están convocadas en esta sesión. Puedes crear una jugadora nueva usando la pestaña "Entrada Manual".
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
