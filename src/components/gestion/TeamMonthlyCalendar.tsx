import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Save, 
  Printer, 
  RefreshCw, 
  Trophy, 
  Clock, 
  MapPin, 
  ShieldAlert,
  Info,
  Check,
  Zap,
  Flame,
  Users,
  FileDown,
  Share2,
  Copy,
  Send,
  MessageSquare,
  ExternalLink,
  CloudUpload,
  Dumbbell,
  Home,
  Plane,
  Moon,
  Award,
  Activity,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';
import { supabase } from '@/lib/supabase';
import {
  fetchTeamMatchesFromFirestore,
  isFirebaseAuthReady,
  sanitizeFirestoreId,
  upsertTeamMatchesToFirestore,
} from '@/lib/firestoreMatches';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import RivalBadge from '@/components/partidos/RivalBadge';
import RivalCrestsManagerModal from '@/components/partidos/RivalCrestsManagerModal';

export type CalendarEventType = 'Entrenamiento' | 'Descanso' | 'Partido' | 'Inicio Liga' | 'Torneo' | 'Personalizado';

export type MatchCompeticion = 'Amistoso' | 'Liga' | 'Copa' | 'Torneo';

export interface CalendarEvent {
  dateStr: string; // YYYY-MM-DD
  title: string;
  type: CalendarEventType;
  condicion?: 'Local' | 'Visitante';
  competicion?: MatchCompeticion | string;
  hora?: string;
  lugar?: string;
  rival?: string;
  notas?: string;
  colorBg?: string;
  colorText?: string;
}

export function getMatchCondition(ev?: CalendarEvent): 'Local' | 'Visitante' {
  if (ev?.condicion) return ev.condicion;
  const combined = `${ev?.title || ''} ${ev?.lugar || ''}`.toLowerCase();
  if (combined.includes('visitante') || combined.includes('fuera') || combined.includes('@') || combined.includes('campo rival')) {
    return 'Visitante';
  }
  if (combined.includes('fundacion') || combined.includes('afe') || combined.includes('local') || combined.includes('casa') || combined.includes('polideportivo')) {
    return 'Local';
  }
  return 'Local';
}

export function getMatchCompeticion(ev?: CalendarEvent): MatchCompeticion {
  if (ev?.competicion) {
    const c = ev.competicion.toLowerCase();
    if (c.includes('liga')) return 'Liga';
    if (c.includes('copa')) return 'Copa';
    if (c.includes('torneo')) return 'Torneo';
    if (c.includes('amistoso')) return 'Amistoso';
    return ev.competicion as MatchCompeticion;
  }
  if (ev?.type === 'Torneo') return 'Torneo';
  if (ev?.type === 'Inicio Liga') return 'Liga';
  const t = `${ev?.title || ''} ${ev?.notas || ''} ${ev?.rival || ''}`.toLowerCase();
  if (t.includes('copa')) return 'Copa';
  if (t.includes('torneo')) return 'Torneo';
  if (t.includes('amistoso')) return 'Amistoso';
  if (t.includes('liga')) return 'Liga';
  // August and September pre-season friendly matches default to Amistoso
  if (ev?.dateStr && (ev.dateStr.startsWith('2026-08') || ev.dateStr.startsWith('2026-09-0') || ev.dateStr.startsWith('2026-09-1') || ev.dateStr.startsWith('2026-09-20') || ev.dateStr.startsWith('2026-09-19'))) {
    return 'Amistoso';
  }
  return 'Amistoso';
}

interface TeamMonthlyCalendarProps {
  selectedTeam: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function parseCalendarDateParts(dateStr?: string): { year: number; monthIndex: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return null;
  if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
  return { year, monthIndex, day };
}

function getInitialCalendarFocus(teamName: string): { year: number; month: number } {
  if (typeof localStorage !== 'undefined') {
    try {
      const rawTeam = localStorage.getItem(`afe_calendar_focus_${teamName}`);
      if (rawTeam) {
        const parsed = JSON.parse(rawTeam);
        if (
          parsed &&
          typeof parsed.year === 'number' &&
          typeof parsed.month === 'number' &&
          parsed.month >= 0 &&
          parsed.month <= 11
        ) {
          return { year: parsed.year, month: parsed.month };
        }
      }
      const rawGlobal = localStorage.getItem('afe_calendar_focus_global');
      if (rawGlobal) {
        const parsed = JSON.parse(rawGlobal);
        if (
          parsed &&
          typeof parsed.year === 'number' &&
          typeof parsed.month === 'number' &&
          parsed.month >= 0 &&
          parsed.month <= 11
        ) {
          return { year: parsed.year, month: parsed.month };
        }
      }
      // Or if team already has training sessions, focus the month of the most recent session
      const sessionsRaw = localStorage.getItem(`team_sessions_${teamName}`);
      if (sessionsRaw) {
        const sessions = JSON.parse(sessionsRaw);
        if (Array.isArray(sessions) && sessions.length > 0) {
          const sorted = [...sessions]
            .filter((s: any) => s && s.fecha && s.tipo !== 'CalendarioMensual')
            .sort((a: any, b: any) => String(b.fecha).localeCompare(String(a.fecha)));
          if (sorted[0]?.fecha) {
            const parts = parseCalendarDateParts(sorted[0].fecha);
            if (parts) {
              return { year: parts.year, month: parts.monthIndex };
            }
          }
        }
      }
    } catch {}
  }
  return { year: 2026, month: 7 };
}

export default function TeamMonthlyCalendar({ selectedTeam }: TeamMonthlyCalendarProps) {
  const initialFocus = getInitialCalendarFocus(selectedTeam);
  const [currentYear, setCurrentYear] = useState<number>(initialFocus.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initialFocus.month);
  const [seasonLabel, setSeasonLabel] = useState<string>('2026-2027');
  
  // Events stored by dateStr (YYYY-MM-DD)
  const [events, setEvents] = useState<Record<string, CalendarEvent>>({});
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Modal for editing an event
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<CalendarEvent>({
    dateStr: '',
    title: 'Entrenamiento',
    type: 'Entrenamiento',
    hora: '',
    lugar: '',
    notas: ''
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<boolean>(false);
  const [whatsappMsg, setWhatsappMsg] = useState<string>('');
  const [showRivalManager, setShowRivalManager] = useState<boolean>(false);
  const [selectedRivalForManager, setSelectedRivalForManager] = useState<string | undefined>(undefined);
  const printRef = useRef<HTMLDivElement>(null);

  // Storage key based on team
  const storageKey = `team_monthly_calendar_${selectedTeam}_${currentYear}_${currentMonth}`;
  const masterCalendarId = `cal_master_${selectedTeam}_${currentYear}_${currentMonth}`;

  // Remember the active calendar month & year whenever user navigates
  useEffect(() => {
    try {
      const payload = JSON.stringify({ year: currentYear, month: currentMonth });
      localStorage.setItem(`afe_calendar_focus_${selectedTeam}`, payload);
      localStorage.setItem('afe_calendar_focus_global', payload);
    } catch {}
  }, [selectedTeam, currentYear, currentMonth]);

  // Helper to get formatted day grid for any month/year (100% timezone-safe YYYY-MM-DD strings)
  const getDaysGrid = (targetYear = currentYear, targetMonth = currentMonth) => {
    const firstDayOfMonth = new Date(targetYear, targetMonth, 1);
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

    let startDayOfWeek = firstDayOfMonth.getDay() - 1; 
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday -> 6 in Mon-Sun indexing

    const days: { date: Date | null; dateStr: string; label: string; isCurrentMonth: boolean }[] = [];

    // Previous month padding days if needed to complete week
    const prevMonthLastDay = new Date(targetYear, targetMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const pDay = prevMonthLastDay - i;
      const prevDate = new Date(targetYear, targetMonth - 1, pDay);
      const year = prevDate.getFullYear();
      const month = String(prevDate.getMonth() + 1).padStart(2, '0');
      const day = String(pDay).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const monthAbbr = MONTH_NAMES[prevDate.getMonth()].substring(0, 3).toLowerCase();
      days.push({
        date: prevDate,
        dateStr,
        label: `${pDay}-${monthAbbr}`,
        isCurrentMonth: false
      });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const cDate = new Date(targetYear, targetMonth, d);
      const year = cDate.getFullYear();
      const month = String(cDate.getMonth() + 1).padStart(2, '0');
      const day = String(d).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const monthAbbr = MONTH_NAMES[targetMonth].substring(0, 3).toLowerCase();
      days.push({
        date: cDate,
        dateStr,
        label: `${d}-${monthAbbr}`,
        isCurrentMonth: true
      });
    }

    // Next month padding days to complete grid rows
    const totalSoFar = days.length;
    const remainingInGrid = (7 - (totalSoFar % 7)) % 7;
    for (let n = 1; n <= remainingInGrid; n++) {
      const nextDate = new Date(targetYear, targetMonth + 1, n);
      const year = nextDate.getFullYear();
      const month = String(nextDate.getMonth() + 1).padStart(2, '0');
      const day = String(n).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const monthAbbr = MONTH_NAMES[nextDate.getMonth()].substring(0, 3).toLowerCase();
      days.push({
        date: nextDate,
        dateStr,
        label: `${n}-${monthAbbr}`,
        isCurrentMonth: false
      });
    }

    // Group into 7-day rows
    const rows: (typeof days)[] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }

    return rows;
  };

  // Load saved calendar events for this team & month and synchronize with sessions & matches
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setEvents(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading calendar events:', e);
        setEvents({});
      }
    } else {
      // Default initial mock if August 2026 (Pretemporada sample matching user image if Agosto 2026)
      if (currentYear === 2026 && currentMonth === 7) {
        const defaultSample: Record<string, CalendarEvent> = {
          '2026-08-24': { dateStr: '2026-08-24', title: 'Descanso', type: 'Descanso' },
          '2026-08-25': { dateStr: '2026-08-25', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-08-26': { dateStr: '2026-08-26', title: 'Descanso', type: 'Descanso' },
          '2026-08-27': { dateStr: '2026-08-27', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-08-28': { dateStr: '2026-08-28', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-08-29': { dateStr: '2026-08-29', title: 'vs AD PARLA', type: 'Partido', condicion: 'Local', competicion: 'Amistoso', rival: 'AD PARLA', hora: '20:00 h', lugar: 'Campo Municipal' },
          '2026-08-30': { dateStr: '2026-08-30', title: 'Descanso', type: 'Descanso' },

          '2026-08-31': { dateStr: '2026-08-31', title: 'Descanso', type: 'Descanso' },
          '2026-09-01': { dateStr: '2026-09-01', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-02': { dateStr: '2026-09-02', title: 'Descanso', type: 'Descanso' },
          '2026-09-03': { dateStr: '2026-09-03', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-04': { dateStr: '2026-09-04', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-05': { dateStr: '2026-09-05', title: 'vs AD LA PLATA', type: 'Partido', condicion: 'Local', competicion: 'Amistoso', rival: 'AD LA PLATA', hora: '13:15 h', lugar: 'Campo Municipal' },
          '2026-09-06': { dateStr: '2026-09-06', title: 'Descanso', type: 'Descanso' },

          '2026-09-07': { dateStr: '2026-09-07', title: 'Descanso', type: 'Descanso' },
          '2026-09-08': { dateStr: '2026-09-08', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-09': { dateStr: '2026-09-09', title: 'Descanso', type: 'Descanso' },
          '2026-09-10': { dateStr: '2026-09-10', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-11': { dateStr: '2026-09-11', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-12': { dateStr: '2026-09-12', title: 'vs SPORTING HORTALEZA', type: 'Partido', condicion: 'Visitante', competicion: 'Amistoso', rival: 'SPORTING HORTALEZA', hora: '18:00 h', lugar: 'Campo Hortaleza' },
          '2026-09-13': { dateStr: '2026-09-13', title: 'Descanso', type: 'Descanso' },

          '2026-09-14': { dateStr: '2026-09-14', title: 'Descanso', type: 'Descanso' },
          '2026-09-15': { dateStr: '2026-09-15', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-16': { dateStr: '2026-09-16', title: 'Descanso', type: 'Descanso' },
          '2026-09-17': { dateStr: '2026-09-17', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-18': { dateStr: '2026-09-18', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-19': { dateStr: '2026-09-19', title: 'vs CD INTER PROMESAS', type: 'Partido', condicion: 'Local', competicion: 'Amistoso', rival: 'CD INTER PROMESAS', hora: '20:00 h', lugar: 'Campo Municipal' },
          '2026-09-20': { dateStr: '2026-09-20', title: 'Descanso', type: 'Descanso' },

          '2026-09-21': { dateStr: '2026-09-21', title: 'Descanso', type: 'Descanso' },
          '2026-09-22': { dateStr: '2026-09-22', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-23': { dateStr: '2026-09-23', title: 'Descanso', type: 'Descanso' },
          '2026-09-24': { dateStr: '2026-09-24', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-25': { dateStr: '2026-09-25', title: 'Entrenamiento', type: 'Entrenamiento', hora: '19:30 h' },
          '2026-09-27': { dateStr: '2026-09-27', title: 'INICIO LIGA', type: 'Inicio Liga', competicion: 'Liga' }
        };
        setEvents(defaultSample);
        localStorage.setItem(storageKey, JSON.stringify(defaultSample));
      } else {
        setEvents({});
      }
    }

    // Trigger auto synchronization from Supabase / localStorage matches & attendance
    syncAutoData(false);

    const handleSync = (evt?: Event) => {
      // If calendar-updated specifies a new year/month for this team, switch to it if appropriate
      const customEvt = evt as CustomEvent | undefined;
      if (
        customEvt?.type === 'calendar-updated' &&
        customEvt.detail &&
        customEvt.detail.team === selectedTeam &&
        typeof customEvt.detail.year === 'number' &&
        typeof customEvt.detail.month === 'number'
      ) {
        if (customEvt.detail.year !== currentYear || customEvt.detail.month !== currentMonth) {
          setCurrentYear(customEvt.detail.year);
          setCurrentMonth(customEvt.detail.month);
          return;
        }
      }
      syncAutoData(false);
    };

    window.addEventListener('calendar-updated', handleSync);
    window.addEventListener('session-updated', handleSync);
    window.addEventListener('lapoveda_matches_updated', handleSync);
    window.addEventListener('lapoveda_club_data_synced', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('calendar-updated', handleSync);
      window.removeEventListener('session-updated', handleSync);
      window.removeEventListener('lapoveda_matches_updated', handleSync);
      window.removeEventListener('lapoveda_club_data_synced', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [selectedTeam, currentYear, currentMonth]);

  // Save changes to localStorage
  const saveEvents = (newEvents: Record<string, CalendarEvent>) => {
    setEvents(newEvents);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newEvents));
    } catch (e) {
      console.warn('Error saving calendar events to localStorage:', e);
    }
  };

  const persistMasterCalendarRecord = async (targetEvents: Record<string, CalendarEvent>) => {
    const firstOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const masterPayload = {
      id: masterCalendarId,
      team: selectedTeam,
      fecha: firstOfMonth,
      tipo: 'CalendarioMensual',
      descripcion: JSON.stringify({
        month: currentMonth,
        year: currentYear,
        team: selectedTeam,
        events: targetEvents,
        updatedAt: new Date().toISOString()
      }),
      records: [],
      tareas: [],
      archivos: []
    };
    await supabase.from('attendance_sessions').upsert(masterPayload);
  };

  // Upload current month's calendar state to Supabase database tables
  const handleUploadToSupabase = async (eventsToSave?: Record<string, CalendarEvent>) => {
    const targetEvents = eventsToSave || events;
    setIsSyncing(true);
    const toastId = toast.loading('Subiendo calendario a Supabase...');

    try {
      let savedMatches = 0;
      let savedSessions = 0;

      const allEntries = Object.values(targetEvents) as CalendarEvent[];

      // 1. Upsert training sessions into attendance_sessions & localStorage team_sessions_${selectedTeam}
      const trainingEntries = allEntries.filter(e => e.type === 'Entrenamiento');
      const sessionsKey = `team_sessions_${selectedTeam}`;
      const savedSessionsStr = localStorage.getItem(sessionsKey);
      let currentSessions: any[] = [];
      try {
        currentSessions = savedSessionsStr ? JSON.parse(savedSessionsStr) : [];
      } catch {
        currentSessions = [];
      }
      let localSessionsChanged = false;

      for (const tr of trainingEntries) {
        const existingIdx = currentSessions.findIndex((s: any) => s.fecha === tr.dateStr);
        const sessionId = existingIdx >= 0 && currentSessions[existingIdx]?.id
          ? currentSessions[existingIdx].id
          : crypto.randomUUID();

        if (existingIdx >= 0) {
          currentSessions[existingIdx] = {
            ...currentSessions[existingIdx],
            descripcion: tr.title || 'Entrenamiento',
            hora: tr.hora || '19:30 h',
            tipo: 'Entrenamiento'
          };
        } else {
          currentSessions.unshift({
            id: sessionId,
            fecha: tr.dateStr,
            hora: tr.hora || '19:30 h',
            tipo: 'Entrenamiento',
            descripcion: tr.title || 'Entrenamiento',
            records: []
          });
        }
        localSessionsChanged = true;

        const payload = {
          id: sessionId,
          team: selectedTeam,
          fecha: tr.dateStr,
          tipo: 'Entrenamiento',
          descripcion: tr.title || 'Entrenamiento',
          hora: tr.hora || '19:30 h',
          records: existingIdx >= 0 ? (currentSessions[existingIdx].records || []) : [],
          tareas: existingIdx >= 0 ? (currentSessions[existingIdx].tareas || []) : [],
          archivos: existingIdx >= 0 ? (currentSessions[existingIdx].archivos || []) : []
        };
        const { error } = await supabase
          .from('attendance_sessions')
          .upsert(payload);
        if (!error) savedSessions++;
      }

      if (localSessionsChanged) {
        try {
          localStorage.setItem(sessionsKey, JSON.stringify(currentSessions));
        } catch {}
      }

      // 2. Upsert matches into team_matches
      const matchEntries = allEntries.filter(e => e.type === 'Partido');
      for (const m of matchEntries) {
        const payload = {
          id: `cal_match_${selectedTeam}_${m.dateStr}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
          team_id: selectedTeam,
          team: selectedTeam,
          fecha: m.dateStr,
          rival: m.rival || m.title.replace(/^vs\s+/i, '').replace(/^@\s+/i, '') || 'Rival',
          tipo: m.title.toLowerCase().includes('@') ? 'Visitante' : 'Local',
          hora: m.hora || '20:00 h',
          lugar: m.lugar || (m.title.toLowerCase().includes('@') ? 'Campo Visitante' : 'Campo Municipal'),
          estadisticas: {}
        };
        const { error } = await supabase
          .from('team_matches')
          .upsert(payload);
        if (!error) savedMatches++;
      }

      // 3. Upsert full master monthly calendar record into attendance_sessions
      await persistMasterCalendarRecord(targetEvents);

      // Keep localStorage in sync
      localStorage.setItem(storageKey, JSON.stringify(targetEvents));

      toast.success(`¡Sincronizado con Supabase! Se han guardado los eventos, entrenamientos y partidos en la base de datos de Supabase.`, { id: toastId });
    } catch (err) {
      console.error('Error uploading calendar to Supabase:', err);
      toast.error('Error al subir los datos a Supabase.', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Automatic Data Feeding Engine (Pulling from Partidos and Entrenamientos)
  const syncAutoData = async (showToast = true) => {
    setIsSyncing(true);
    let matchesCount = 0;
    let sessionsCount = 0;

    try {
      // Read directly from localStorage for the active storageKey to avoid stale React state closures
      let baseEvents: Record<string, CalendarEvent> = {};
      const savedStr = localStorage.getItem(storageKey);
      if (savedStr) {
        try {
          const parsed = JSON.parse(savedStr);
          if (parsed && typeof parsed === 'object') {
            baseEvents = { ...parsed };
          }
        } catch {}
      }

      const autoEvents: Record<string, CalendarEvent> = { ...baseEvents };

      // Build set of all dates visible in the current month's 7-column grid (including padding days)
      const visibleGridDates = new Set<string>();
      getDaysGrid(currentYear, currentMonth).forEach(row => {
        row.forEach(cell => {
          if (cell.dateStr) visibleGridDates.add(cell.dateStr);
        });
      });

      const isDateInCurrentCalendarView = (dateStr?: string): boolean => {
        if (!dateStr) return false;
        if (visibleGridDates.has(dateStr)) return true;
        const parts = parseCalendarDateParts(dateStr);
        return Boolean(parts && parts.year === currentYear && parts.monthIndex === currentMonth);
      };

      // 0. Fetch master monthly calendar record from Supabase if present (pick the most recent one)
      const firstOfMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const { data: dbMaster } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('team', selectedTeam)
        .eq('fecha', firstOfMonth)
        .eq('tipo', 'CalendarioMensual');

      if (dbMaster && dbMaster.length > 0) {
        // Sort descending by updatedAt inside JSON or row updated_at so we never pick an outdated first row
        const sortedMasters = [...dbMaster].sort((a, b) => {
          const tsA = a.updated_at || a.created_at || '';
          const tsB = b.updated_at || b.created_at || '';
          return String(tsB).localeCompare(String(tsA));
        });
        const latestMaster = sortedMasters.find(m => m.id === masterCalendarId) || sortedMasters[0];
        if (latestMaster?.descripcion) {
          try {
            const parsedMaster = JSON.parse(latestMaster.descripcion);
            if (parsedMaster && parsedMaster.events && typeof parsedMaster.events === 'object') {
              // Merge master events as base, letting current localStorage storageKey take precedence
              Object.entries(parsedMaster.events as Record<string, CalendarEvent>).forEach(([k, v]) => {
                if (!autoEvents[k] && v) {
                  autoEvents[k] = v;
                }
              });
            }
          } catch (e) {
            console.warn('Could not parse master calendar json from Supabase:', e);
          }
        }
      }

      // 1. Fetch matches from Supabase, Firestore, and localStorage
      const { data: dbMatches } = await supabase
        .from('team_matches')
        .select('*');

      let cloudMatches: any[] = [];
      if (isFirebaseAuthReady()) {
        try {
          const fetched = await fetchTeamMatchesFromFirestore(selectedTeam);
          if (Array.isArray(fetched)) cloudMatches = fetched;
        } catch {}
      }

      const localMatchesStr = localStorage.getItem(`team_matches_${selectedTeam}`);
      const localMatches = localMatchesStr ? JSON.parse(localMatchesStr) : [];
      const deletedMatchesRaw = localStorage.getItem(`team_matches_deleted_${selectedTeam}`);
      const deletedMatchIds = new Set<string>(deletedMatchesRaw ? JSON.parse(deletedMatchesRaw) : []);

      const allMatchesMap = new Map<string, any>();
      (dbMatches || []).forEach(m => {
        const mTeam = (m.team || m.team_id || '').trim();
        if (m.fecha && mTeam === selectedTeam && !deletedMatchIds.has(String(m.id)) && !m.isDeleted && !m.estadisticas?.isDeleted) {
          allMatchesMap.set(m.fecha, m);
        }
      });
      (Array.isArray(localMatches) ? localMatches : []).forEach((m: any) => {
        if (m && m.fecha && !deletedMatchIds.has(String(m.id)) && !m.isDeleted && !m.estadisticas?.isDeleted) {
          allMatchesMap.set(m.fecha, m);
        }
      });
      cloudMatches.forEach((m: any) => {
        if (m && m.fecha && !deletedMatchIds.has(String(m.id)) && !m.isDeleted && !m.estadisticas?.isDeleted) {
          allMatchesMap.set(m.fecha, m);
        }
      });

      allMatchesMap.forEach((m, dateStr) => {
        if (isDateInCurrentCalendarView(dateStr)) {
          const compDetermined = m.competicion || (dateStr.startsWith('2026-08') || dateStr.startsWith('2026-09-0') || dateStr.startsWith('2026-09-1') || dateStr.startsWith('2026-09-20') || dateStr.startsWith('2026-09-19') ? 'Amistoso' : 'Liga');
          autoEvents[dateStr] = {
            dateStr,
            title: m.tipo === 'Local' ? `vs ${m.rival}` : `@ ${m.rival}`,
            type: 'Partido',
            condicion: m.tipo === 'Local' ? 'Local' : 'Visitante',
            competicion: compDetermined,
            hora: m.hora || '20:00 h',
            lugar: m.lugar || (m.tipo === 'Local' ? 'Campo Municipal' : 'Campo Visitante'),
            rival: m.rival
          };
          matchesCount++;
        }
      });

      // 2. Fetch training / attendance sessions from Supabase and localStorage for this exact team
      const { data: dbSessions } = await supabase
        .from('attendance_sessions')
        .select('*')
        .neq('tipo', 'CalendarioMensual');

      const localSessionsStr = localStorage.getItem(`team_sessions_${selectedTeam}`) || localStorage.getItem(`attendance_sessions_${selectedTeam}`);
      let localSessions: any[] = [];
      try {
        localSessions = localSessionsStr ? JSON.parse(localSessionsStr) : [];
      } catch {
        localSessions = [];
      }

      const deletedRaw = localStorage.getItem(`team_deleted_sessions_${selectedTeam}`);
      const deletedList: { id?: string; fecha: string }[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      const isDel = (id?: string, f?: string) => deletedList.some(d => (id && d.id && d.id === id) || (f && d.fecha && d.fecha === f));

      // Remove any training event that was explicitly deleted in Asistencia
      deletedList.forEach(d => {
        if (d.fecha && autoEvents[d.fecha]?.type === 'Entrenamiento') {
          delete autoEvents[d.fecha];
        }
      });

      const allSessionsMap = new Map<string, any>();
      (dbSessions || []).forEach(s => {
        const sTeam = (s.team || s.team_id || s.team_name || '').trim();
        const isJsonMaster = typeof s.descripcion === 'string' && s.descripcion.trim().startsWith('{');
        if (
          s.fecha &&
          s.tipo !== 'CalendarioMensual' &&
          !isJsonMaster &&
          sTeam === selectedTeam &&
          !isDel(s.id, s.fecha)
        ) {
          allSessionsMap.set(s.fecha, s);
        }
      });
      (Array.isArray(localSessions) ? localSessions : []).forEach((s: any) => {
        const isJsonMaster = typeof s?.descripcion === 'string' && s.descripcion.trim().startsWith('{');
        if (s && s.fecha && s.tipo !== 'CalendarioMensual' && !isJsonMaster && !isDel(s.id, s.fecha)) {
          allSessionsMap.set(s.fecha, s);
        }
      });

      allSessionsMap.forEach((s, dateStr) => {
        if (isDateInCurrentCalendarView(dateStr)) {
          // Keep match if already set on that day
          if (!autoEvents[dateStr] || autoEvents[dateStr].type !== 'Partido') {
            const evType: CalendarEventType = s.tipo === 'Partido' ? 'Partido' : 'Entrenamiento';
            const existingEvent = autoEvents[dateStr];
            const cleanDesc = typeof s.descripcion === 'string' ? s.descripcion.trim() : '';
            const preservedTitle =
              existingEvent && existingEvent.type === evType && existingEvent.title
                ? existingEvent.title
                : evType === 'Partido'
                ? 'Partido Programado'
                : 'Sesión de entrenamiento';

            autoEvents[dateStr] = {
              dateStr,
              title: cleanDesc || preservedTitle,
              type: evType,
              hora: s.hora || existingEvent?.hora || '19:30 h',
              lugar: s.lugar || existingEvent?.lugar || ''
            };
            sessionsCount++;
          }
        }
      });

      saveEvents(autoEvents);
      if (showToast) {
        if (matchesCount > 0 || sessionsCount > 0 || dbMaster?.length) {
          toast.success(`Datos sincronizados: ${matchesCount} partidos y ${sessionsCount} entrenamientos cargados en el calendario.`);
        } else {
          toast.info('Sincronización completada.');
        }
      }
    } catch (err) {
      console.warn('Error syncing auto data from Supabase:', err);
      if (showToast) toast.error('Error al sincronizar datos del calendario.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Fill standard training pattern (Tue, Thu, Fri -> Training, Mon, Wed, Sun -> Rest)
  const handleFillStandardWeeklyPattern = () => {
    const gridRows = getDaysGrid();
    const updated = { ...events };
    let count = 0;

    gridRows.forEach(row => {
      row.forEach((cell, dayIdx) => {
        if (cell.isCurrentMonth && !updated[cell.dateStr]) {
          // dayIdx: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
          if (dayIdx === 1 || dayIdx === 3 || dayIdx === 4) {
            updated[cell.dateStr] = {
              dateStr: cell.dateStr,
              title: 'Entrenamiento',
              type: 'Entrenamiento',
              hora: '19:30 h'
            };
            count++;
          } else if (dayIdx === 0 || dayIdx === 2 || dayIdx === 6) {
            updated[cell.dateStr] = {
              dateStr: cell.dateStr,
              title: 'Descanso',
              type: 'Descanso'
            };
            count++;
          }
        }
      });
    });

    saveEvents(updated);
    persistMasterCalendarRecord(updated).catch(() => {});
    toast.success(`Se han completado ${count} días con el patrón semanal estándar.`);
  };

  // Open edit modal for cell
  const handleOpenEdit = (dateStr: string, label: string) => {
    const existing = events[dateStr];
    setEditingDate(dateStr);
    if (existing) {
      setEventForm({ ...existing });
    } else {
      setEventForm({
        dateStr,
        title: 'Entrenamiento',
        type: 'Entrenamiento',
        hora: '19:30 h',
        lugar: 'Campo Municipal',
        notas: ''
      });
    }
  };

  // Save event modal
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDate) return;

    const eventToSave: CalendarEvent = {
      ...eventForm,
      dateStr: editingDate
    };

    const updatedEvents = {
      ...events,
      [editingDate]: eventToSave
    };

    saveEvents(updatedEvents);

    try {
      if (eventToSave.type === 'Entrenamiento') {
        // Remove any deletion tombstone for this date
        try {
          const deletedKey = `team_deleted_sessions_${selectedTeam}`;
          const deletedRaw = localStorage.getItem(deletedKey);
          const deletedList: { id?: string; fecha: string }[] = deletedRaw ? JSON.parse(deletedRaw) : [];
          const filteredDeleted = deletedList.filter(d => d.fecha !== editingDate);
          localStorage.setItem(deletedKey, JSON.stringify(filteredDeleted));
        } catch {}

        // Sync local storage team_sessions_${selectedTeam}
        const sessionsKey = `team_sessions_${selectedTeam}`;
        const savedSessionsStr = localStorage.getItem(sessionsKey);
        let currentSessions: any[] = savedSessionsStr ? JSON.parse(savedSessionsStr) : [];
        const existingIdx = currentSessions.findIndex((s: any) => s.fecha === editingDate);
        const sessionId = existingIdx >= 0 && currentSessions[existingIdx]?.id
          ? currentSessions[existingIdx].id
          : crypto.randomUUID();

        if (existingIdx >= 0) {
          currentSessions[existingIdx] = {
            ...currentSessions[existingIdx],
            descripcion: eventToSave.title || 'Entrenamiento',
            hora: eventToSave.hora || '19:30 h',
            tipo: 'Entrenamiento'
          };
        } else {
          currentSessions.unshift({
            id: sessionId,
            fecha: editingDate,
            hora: eventToSave.hora || '19:30 h',
            tipo: 'Entrenamiento',
            descripcion: eventToSave.title || 'Entrenamiento',
            records: []
          });
        }
        localStorage.setItem(sessionsKey, JSON.stringify(currentSessions));

        // Upsert to Supabase attendance_sessions with deterministic ID
        await supabase
          .from('attendance_sessions')
          .upsert({
            id: sessionId,
            team: selectedTeam,
            fecha: editingDate,
            tipo: 'Entrenamiento',
            descripcion: eventToSave.title || 'Entrenamiento',
            hora: eventToSave.hora || '19:30 h',
            records: existingIdx >= 0 ? (currentSessions[existingIdx].records || []) : [],
            tareas: existingIdx >= 0 ? (currentSessions[existingIdx].tareas || []) : [],
            archivos: existingIdx >= 0 ? (currentSessions[existingIdx].archivos || []) : []
          });

        window.dispatchEvent(new CustomEvent('session-updated', { detail: { team: selectedTeam } }));
      } else if (eventToSave.type === 'Partido') {
        const compVal = eventToSave.competicion || getMatchCompeticion(eventToSave);
        const matchesKey = `team_matches_${selectedTeam}`;
        const savedMatchesStr = localStorage.getItem(matchesKey);
        let currentMatches: any[] = [];
        try {
          currentMatches = savedMatchesStr ? JSON.parse(savedMatchesStr) : [];
        } catch {
          currentMatches = [];
        }
        const existingMatchIdx = currentMatches.findIndex((m: any) => m.fecha === editingDate);
        const existingMatch = existingMatchIdx >= 0 ? currentMatches[existingMatchIdx] : null;
        const resolvedRival = eventToSave.rival || eventToSave.title.replace(/^vs\s+/i, '').replace(/^@\s+/i, '') || existingMatch?.rival || 'Rival';
        const resolvedTipo = eventToSave.condicion || (eventToSave.title.toLowerCase().includes('@') ? 'Visitante' : 'Local');
        const resolvedHora = eventToSave.hora || existingMatch?.hora || '20:00 h';
        const resolvedLugar = eventToSave.lugar || existingMatch?.lugar || 'Campo Municipal';

        await supabase
          .from('team_matches')
          .upsert({
            ...(existingMatch || {}),
            id: existingMatch?.id || crypto.randomUUID(),
            team_id: selectedTeam,
            team: selectedTeam,
            fecha: editingDate,
            rival: resolvedRival,
            tipo: resolvedTipo,
            competicion: compVal,
            hora: resolvedHora,
            lugar: resolvedLugar,
            estadisticas: existingMatch?.estadisticas || {}
          });

        const matchPayload = {
          ...(existingMatch || {}),
          id: sanitizeFirestoreId(existingMatch?.id || crypto.randomUUID()),
          team_id: selectedTeam,
          team: selectedTeam,
          fecha: editingDate,
          rival: resolvedRival,
          tipo: resolvedTipo,
          competicion: compVal,
          estado: existingMatch?.estado || 'Programado',
          hora: resolvedHora,
          lugar: resolvedLugar,
          _updatedAtMs: Date.now()
        };
        if (existingMatchIdx >= 0) {
          currentMatches[existingMatchIdx] = matchPayload;
        } else {
          currentMatches.push(matchPayload);
        }
        try {
          localStorage.setItem(matchesKey, JSON.stringify(currentMatches));
        } catch {}
        if (isFirebaseAuthReady()) {
          try {
            await upsertTeamMatchesToFirestore([matchPayload], selectedTeam);
          } catch (fbErr) {
            console.warn('Error syncing calendar match to Firestore:', fbErr);
          }
        }
        window.dispatchEvent(new CustomEvent('lapoveda_matches_updated', { detail: { team: selectedTeam } }));
      }

      // Upsert master monthly calendar record to attendance_sessions
      await persistMasterCalendarRecord(updatedEvents);

    } catch (err) {
      console.warn('Error syncing edited event to Supabase:', err);
    }

    setEditingDate(null);
    toast.success('Evento guardado y sincronizado correctamente.');
  };

  // Delete event
  const handleDeleteEvent = (dateStr: string) => {
    const existing = events[dateStr];
    const updated = { ...events };
    delete updated[dateStr];
    saveEvents(updated);
    persistMasterCalendarRecord(updated).catch(() => {});

    // If deleting a training session from the calendar, also record tombstone so syncAutoData does not resurrect it
    if (existing?.type === 'Entrenamiento') {
      try {
        const deletedKey = `team_deleted_sessions_${selectedTeam}`;
        const deletedRaw = localStorage.getItem(deletedKey);
        const deletedList: { id?: string; fecha: string }[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        deletedList.push({ fecha: dateStr });
        localStorage.setItem(deletedKey, JSON.stringify(deletedList));

        const sessionsKey = `team_sessions_${selectedTeam}`;
        const sessionsRaw = localStorage.getItem(sessionsKey);
        if (sessionsRaw) {
          const sessions = JSON.parse(sessionsRaw).filter((s: any) => s.fecha !== dateStr);
          localStorage.setItem(sessionsKey, JSON.stringify(sessions));
        }
      } catch {}
    }

    setEditingDate(null);
    toast.success('Evento eliminado.');
  };

  // Clear entire month
  const handleClearMonth = () => {
    if (window.confirm('¿Seguro que deseas borrar todos los eventos de este mes?')) {
      saveEvents({});
      persistMasterCalendarRecord({}).catch(() => {});
      toast.success('Calendario del mes limpiado.');
    }
  };

  // Helper to generate poster image data URL using html-to-image with html2canvas fallback
  const getCalendarImageDataUrl = async (el: HTMLElement): Promise<string> => {
    const targetWidth = Math.max(el.scrollWidth, 900);
    const targetHeight = el.scrollHeight;

    // Primary approach: html-to-image (supports Tailwind v4 modern CSS)
    try {
      const dataUrl = await toPng(el, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#070d1e',
        cacheBust: true,
        width: targetWidth,
        height: targetHeight,
        style: {
          transform: 'none',
          maxWidth: 'none',
        }
      });
      if (dataUrl && dataUrl.length > 200) {
        return dataUrl;
      }
    } catch (err1) {
      console.warn('html-to-image failed, trying html2canvas fallback:', err1);
    }

    // Fallback: html2canvas
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#070d1e',
        logging: false,
        width: targetWidth,
        height: targetHeight,
        windowWidth: targetWidth,
        windowHeight: targetHeight,
        onclone: (clonedDoc) => {
          const pulses = clonedDoc.querySelectorAll<HTMLElement>('.animate-pulse');
          pulses.forEach(p => { p.style.animation = 'none'; });
        }
      });
      return canvas.toDataURL('image/png');
    } catch (err2) {
      console.error('Canvas capture failed:', err2);
      throw err2;
    }
  };

  // Export to Convocatoria Poster PDF
  const handleExportPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading('Generando Calendario en PDF de alta resolución...');

    try {
      const element = printRef.current;
      const imgData = await getCalendarImageDataUrl(element);

      // Create temporary Image to measure natural dimensions & aspect ratio
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
        img.src = imgData;
      });

      const imgWidth = img.naturalWidth || 1000;
      const imgHeight = img.naturalHeight || 700;
      const aspect = imgHeight / imgWidth;

      // Dynamic PDF dimensions matching exact aspect ratio (100% full screen responsive, 0 margin)
      const pdfWidth = 297; // mm base width
      const pdfHeight = pdfWidth * aspect;

      const pdf = new jsPDF({
        orientation: pdfWidth >= pdfHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const filename = `Calendario_${selectedTeam.replace(/\s+/g, '_')}_${MONTH_NAMES[currentMonth]}_${currentYear}.pdf`;
      pdf.save(filename);

      toast.success('¡Calendario PDF descargado a pantalla completa!', { id: toastId });
    } catch (e) {
      console.error('Error al exportar en PDF:', e);
      toast.error('Ocurrió un error al generar el PDF. Puedes intentar descargar como Imagen PNG o compartir por WhatsApp.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PNG Image
  const handleExportPNG = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading('Generando imagen HD PNG...');

    try {
      const element = printRef.current;
      const imgData = await getCalendarImageDataUrl(element);

      const link = document.createElement('a');
      link.download = `Calendario_${selectedTeam.replace(/\s+/g, '_')}_${MONTH_NAMES[currentMonth]}_${currentYear}.png`;
      link.href = imgData;
      link.click();

      toast.success('¡Imagen HD del calendario descargada!', { id: toastId });
    } catch (e) {
      console.error('Error al exportar PNG:', e);
      toast.error('Error al generar la imagen PNG.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Generate WhatsApp summary text for current month's events
  const generateWhatsAppSummary = () => {
    const monthName = MONTH_NAMES[currentMonth].toUpperCase();
    let text = `📅 *FUNDACIÓN AFE - CALENDARIO DE ${monthName} ${currentYear}*\n`;
    text += `⚽ *Equipo:* ${selectedTeam}\n`;
    text += `🏆 *Temporada:* ${seasonLabel}\n`;
    text += `------------------------------------\n\n`;

    const sortedDates = Object.keys(events).sort();
    let matchesList: string[] = [];
    let trainingList: string[] = [];
    let keyEventsList: string[] = [];

    sortedDates.forEach(dateStr => {
      const ev = events[dateStr];
      if (!ev) return;
      const dateObj = new Date(dateStr);
      const dayNum = dateObj.getDate();
      const dayName = WEEKDAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1].substring(0, 3);
      const formattedDate = `${dayName} ${dayNum}`;

      if (ev.type === 'Partido') {
        const cond = getMatchCondition(ev);
        const comp = getMatchCompeticion(ev);
        const iconTag = cond === 'Local' ? '🏠 LOCAL' : '✈️ VISITANTE';
        const compTag = comp === 'Liga' ? '🏆 LIGA' : comp === 'Copa' ? '👑 COPA' : comp === 'Torneo' ? '🎖️ TORNEO' : '🤝 AMISTOSO';
        matchesList.push(`⚽ ${iconTag} [${compTag}] *${formattedDate}:* ${ev.title}${ev.hora ? ` a las ${ev.hora}` : ''}${ev.lugar ? ` (${ev.lugar})` : ''}`);
      } else if (ev.type === 'Inicio Liga' || ev.type === 'Torneo') {
        keyEventsList.push(`🏆 *${formattedDate}:* ${ev.title.toUpperCase()}`);
      } else if (ev.type === 'Entrenamiento') {
        trainingList.push(`🏋️ *${formattedDate}:* ${ev.title}${ev.hora ? ` (${ev.hora})` : ''}`);
      }
    });

    if (keyEventsList.length > 0) {
      text += `🔥 *EVENTOS DESTACADOS:*\n${keyEventsList.join('\n')}\n\n`;
    }

    if (matchesList.length > 0) {
      text += `⚽ *PARTIDOS PROGRAMADOS:*\n${matchesList.join('\n')}\n\n`;
    } else {
      text += `⚽ *PARTIDOS:* Sin partidos confirmados aún.\n\n`;
    }

    if (trainingList.length > 0) {
      text += `🏋️ *ENTRENAMIENTOS:*\n${trainingList.join('\n')}\n\n`;
    }

    text += `------------------------------------\n`;
    text += `🔵⚪ *¡CONFIANZA, ENTREGA Y VICTORIA! ¡A POR TODAS!* ⚽🔥`;

    return text;
  };

  const handleOpenWhatsAppModal = () => {
    const summaryText = generateWhatsAppSummary();
    setWhatsappMsg(summaryText);
    setShowWhatsAppModal(true);
  };

  // Convocatoria FIFA style event badge mapping
  const getEventBadgeStyle = (ev?: CalendarEvent) => {
    if (!ev || !ev.title) {
      return {
        bg: 'bg-transparent',
        text: 'text-slate-600',
        border: 'border-transparent',
        shadow: ''
      };
    }

    switch (ev.type) {
      case 'Descanso':
        return {
          bg: 'bg-amber-950/70 border border-amber-500/30',
          text: 'text-amber-300 font-extrabold',
          border: 'border-amber-500/30',
          shadow: 'shadow-sm'
        };
      case 'Entrenamiento':
        return {
          bg: 'bg-emerald-950/80 border border-emerald-500/40',
          text: 'text-emerald-300 font-extrabold',
          border: 'border-emerald-500/40',
          shadow: 'shadow-sm'
        };
      case 'Partido': {
        const isLocal = getMatchCondition(ev) === 'Local';
        return isLocal ? {
          bg: 'bg-gradient-to-r from-sky-700 via-blue-800 to-indigo-900 border border-sky-400/60',
          text: 'text-white font-black uppercase tracking-wider',
          border: 'border-sky-400/60',
          shadow: 'shadow-lg shadow-sky-600/30'
        } : {
          bg: 'bg-gradient-to-r from-amber-700 via-orange-800 to-amber-900 border border-amber-400/60',
          text: 'text-white font-black uppercase tracking-wider',
          border: 'border-amber-400/60',
          shadow: 'shadow-lg shadow-amber-600/30'
        };
      }
      case 'Inicio Liga':
        return {
          bg: 'bg-gradient-to-r from-red-600 to-rose-600 border border-red-400',
          text: 'text-white font-black uppercase tracking-widest',
          border: 'border-red-400',
          shadow: 'shadow-md shadow-red-600/30'
        };
      case 'Torneo':
        return {
          bg: 'bg-gradient-to-r from-purple-600 to-indigo-600 border border-purple-400',
          text: 'text-white font-black uppercase tracking-wider',
          border: 'border-purple-400',
          shadow: 'shadow-md shadow-purple-600/30'
        };
      default:
        return {
          bg: 'bg-slate-800/80 border border-slate-700',
          text: 'text-slate-200 font-bold',
          border: 'border-slate-700',
          shadow: ''
        };
    }
  };

  const gridRows = getDaysGrid();

  return (
    <div className="space-y-6">
      
      {/* Top Action Controls Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-xl">
        
        {/* Month Navigation & Team info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <Button
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear(prev => prev - 1);
                } else {
                  setCurrentMonth(prev => prev - 1);
                }
              }}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="px-3 py-1 text-center min-w-[150px]">
              <span className="font-black text-white text-sm uppercase tracking-wide block">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <span className="text-[10px] text-blue-400 font-bold tracking-wider block">
                {selectedTeam}
              </span>
            </div>

            <Button
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear(prev => prev + 1);
                } else {
                  setCurrentMonth(prev => prev + 1);
                }
              }}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-blue-950/40 border border-blue-900/60 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-300">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Temporada {seasonLabel}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <Button
            onClick={() => handleUploadToSupabase()}
            disabled={isSyncing}
            className="text-xs font-black uppercase bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/20 gap-1.5 rounded-xl h-9 px-3.5 cursor-pointer"
            title="Guardar y subir todos los eventos del calendario a la base de datos Supabase"
          >
            <CloudUpload className={`w-4 h-4 text-cyan-200 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>Subir a Supabase</span>
          </Button>

          <Button
            onClick={() => syncAutoData(true)}
            disabled={isSyncing}
            variant="outline"
            className="text-xs font-bold uppercase border-blue-500/30 hover:bg-blue-950/30 text-blue-400 hover:text-blue-300 gap-1.5 rounded-xl h-9 cursor-pointer"
            title="Sincronizar automáticamente desde Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Cargando...' : 'Cargar de Supabase'}</span>
          </Button>

          <Button
            onClick={handleFillStandardWeeklyPattern}
            variant="outline"
            className="text-xs font-bold uppercase border-emerald-500/30 hover:bg-emerald-950/30 text-emerald-400 hover:text-emerald-300 gap-1.5 rounded-xl h-9 cursor-pointer"
            title="Completar semanas con patrón: Mar/Jue/Vie entrenamientos y Lun/Mié/Dom descanso"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Patrón Semanal</span>
          </Button>

          <Button
            onClick={handleClearMonth}
            variant="ghost"
            className="text-xs font-bold uppercase text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl h-9 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpiar</span>
          </Button>

          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="text-xs font-extrabold uppercase bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/20 gap-2 rounded-xl h-9 px-4 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-blue-200" />
            <span>{isExporting ? 'Exportando...' : 'Descargar PDF'}</span>
          </Button>

          <Button
            onClick={handleExportPNG}
            disabled={isExporting}
            variant="outline"
            className="text-xs font-bold uppercase border-blue-500/40 text-blue-300 hover:bg-blue-950/40 gap-1.5 rounded-xl h-9 px-3 cursor-pointer"
            title="Descargar como imagen PNG de alta calidad"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden xl:inline">Imagen PNG</span>
          </Button>

          <Button
            onClick={() => {
              setSelectedRivalForManager(undefined);
              setShowRivalManager(true);
            }}
            variant="outline"
            className="text-xs font-bold uppercase border-amber-500/40 text-amber-300 hover:bg-amber-950/40 gap-1.5 rounded-xl h-9 px-3 cursor-pointer"
            title="Gestionar escudos de equipos rivales"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Escudos Rivales</span>
          </Button>

          <Button
            onClick={handleOpenWhatsAppModal}
            className="text-xs font-extrabold uppercase bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 gap-2 rounded-xl h-9 px-4 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-100" />
            <span>Enviar por WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* Main High-Definition Convocatoria Poster Printable Area */}
      <div className="overflow-x-auto rounded-[2.5rem] border border-blue-900/60 shadow-2xl bg-[#070d1e] p-4 sm:p-6">
        <div 
          ref={printRef}
          className="w-full min-w-[850px] bg-gradient-to-b from-[#0a1228] via-[#0e1b3d] to-[#070d1e] text-white p-6 sm:p-8 rounded-[2rem] border-2 border-blue-600/40 space-y-6 font-sans relative shadow-2xl"
        >
          {/* Top Convocatoria Header */}
          <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b-2 border-blue-900/60 relative">
            
            {/* Crest Logo Badge */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0a1738] border-2 border-blue-400/50 p-2.5 shadow-xl flex items-center justify-center relative shadow-blue-500/20 group">
              <UDLaPovedaLogo className="w-full h-full object-contain" />
              <div className="absolute inset-0 rounded-full border border-blue-400/20 animate-pulse pointer-events-none" />
            </div>

            {/* Club & Category Titles */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-black italic tracking-wider text-white uppercase drop-shadow-md">
                FUNDACIÓN AFE
              </h2>
              <p className="text-xs sm:text-sm font-black text-blue-400 uppercase tracking-widest mt-1">
                {selectedTeam} • CALENDARIO MENSUAL DE ACTIVIDAD
              </p>
            </div>

            {/* Sub-Pills matching Convocatoria style */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 font-black text-slate-100 bg-[#12244a] px-4 py-1.5 rounded-full border border-blue-400/30 text-xs shadow-md uppercase tracking-wide">
                📅 MES DE {MONTH_NAMES[currentMonth].toUpperCase()} {currentYear}
              </span>
              <span className="inline-flex items-center gap-1.5 font-black text-white bg-blue-600 px-4 py-1.5 rounded-full border border-blue-300/40 text-xs shadow-md uppercase tracking-wider">
                🏠 TEMPORADA {seasonLabel}
              </span>
            </div>
          </div>

          {/* Calendar Table Grid (Convocatoria Glassmorphic Theme) */}
          <div className="bg-[#0a1532]/90 border border-[#1b2f5c] rounded-2xl p-3 shadow-2xl space-y-2">
            
            {/* Weekday Column Headers */}
            <div className="grid grid-cols-7 bg-[#122349] border border-[#1e3870] rounded-xl text-center py-2.5 font-black text-xs sm:text-sm text-blue-200 uppercase tracking-widest shadow-inner">
              {WEEKDAYS.map(day => (
                <div key={day} className="tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Rows */}
            <div className="space-y-1.5">
              {gridRows.map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-7 gap-1.5">
                  {row.map((cell, cIdx) => {
                    const event = events[cell.dateStr];
                    const badgeStyle = getEventBadgeStyle(event);

                    return (
                      <div 
                        key={cIdx} 
                        onClick={() => handleOpenEdit(cell.dateStr, cell.label)}
                        className={`min-h-[145px] sm:min-h-[165px] rounded-xl border p-2 sm:p-2.5 flex flex-col justify-between transition-all cursor-pointer relative group min-w-0 ${
                          !cell.isCurrentMonth 
                            ? 'opacity-30 bg-[#080d1e]/50 border-slate-900' 
                            : 'bg-[#0d1b3a]/90 hover:bg-[#142854] border-[#1e3a70] hover:border-blue-400/50 shadow-md'
                        }`}
                      >
                        {/* Day Header Pill inside Cell */}
                        <div className="flex items-center justify-between gap-1 w-full min-w-0">
                          <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md bg-[#16274e] text-slate-200 border border-blue-500/20 shadow-sm shrink-0 whitespace-nowrap">
                            {cell.label}
                          </span>
                          {event?.hora && (
                            <span className="text-[9px] font-extrabold text-blue-300 flex items-center gap-0.5 shrink-0 whitespace-nowrap">
                              ⏰ {event.hora}
                            </span>
                          )}
                        </div>

                        {/* Event Content Badge inside Cell */}
                        {event?.title ? (
                          <div className={`mt-1.5 flex-1 flex flex-col justify-start items-center text-center p-2 rounded-xl text-xs transition-all w-full min-w-0 ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.shadow}`}>
                            {/* Icon at top of box according to event type */}
                            <div className="flex items-center justify-center gap-1 mb-1.5 w-full shrink-0">
                              {event.type === 'Entrenamiento' && (
                                <div className="p-2 rounded-full bg-emerald-950/80 border-2 border-emerald-500/60 shadow-lg shadow-emerald-950/50">
                                  <Dumbbell className="w-7 h-7 text-emerald-300 stroke-[2.5]" />
                                </div>
                              )}
                              {event.type === 'Descanso' && (
                                <div className="p-1.5 rounded-full bg-amber-900/40 border border-amber-500/30">
                                  <Moon className="w-5 h-5 text-amber-300 stroke-[2.2]" />
                                </div>
                              )}
                              {event.type === 'Partido' && (() => {
                                const comp = getMatchCompeticion(event);
                                return (
                                  <div className="flex flex-wrap items-center justify-center gap-1 w-full">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shadow-sm ${
                                      getMatchCondition(event) === 'Local'
                                        ? 'bg-sky-950/90 text-sky-200 border-sky-400/60'
                                        : 'bg-amber-950/90 text-amber-200 border-amber-400/60'
                                    }`}>
                                      {getMatchCondition(event) === 'Local' ? (
                                        <>
                                          <Home className="w-3 h-3 text-sky-300 shrink-0" />
                                          <span>LOCAL</span>
                                        </>
                                      ) : (
                                        <>
                                          <Plane className="w-3 h-3 text-amber-300 shrink-0" />
                                          <span>VISITANTE</span>
                                        </>
                                      )}
                                    </span>

                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shadow-sm ${
                                      comp === 'Liga'
                                        ? 'bg-blue-950/90 text-blue-200 border-blue-400/60'
                                        : comp === 'Copa'
                                          ? 'bg-amber-950/90 text-amber-200 border-amber-400/60'
                                          : comp === 'Torneo'
                                            ? 'bg-purple-950/90 text-purple-200 border-purple-400/60'
                                            : 'bg-emerald-950/90 text-emerald-200 border-emerald-400/60'
                                    }`}>
                                      <span>
                                        {comp === 'Liga' ? '🏆 LIGA' : comp === 'Copa' ? '👑 COPA' : comp === 'Torneo' ? '🎖️ TORNEO' : '🤝 AMISTOSO'}
                                      </span>
                                    </span>
                                  </div>
                                );
                              })()}
                              {event.type === 'Inicio Liga' && (
                                <div className="p-1.5 rounded-full bg-red-900/40 border border-red-500/30">
                                  <Trophy className="w-5 h-5 text-yellow-300 stroke-[2.2]" />
                                </div>
                              )}
                              {event.type === 'Torneo' && (
                                <div className="p-1.5 rounded-full bg-purple-900/40 border border-purple-500/30">
                                  <Award className="w-5 h-5 text-purple-300 stroke-[2.2]" />
                                </div>
                              )}
                            </div>

                            {event.type === 'Partido' && (() => {
                              const rName = event.rival || event.title.replace(/^partido\s*(vs\.?|contra)?\s*/i, '').replace(/^vs\.?\s*/i, '').trim();
                              if (!rName) return null;
                              return (
                                <div className="my-1 shrink-0 flex items-center justify-center">
                                  <RivalBadge rivalName={rName} size="xs" className="shadow-md" />
                                </div>
                              );
                            })()}

                            <span className="leading-snug font-extrabold text-[11px] sm:text-xs w-full break-words my-auto px-0.5">
                              {event.type === 'Entrenamiento' 
                                ? (event.title === 'Entrenamiento' ? 'Sesión de entrenamiento' : event.title.replace(/^Entrenamiento$/i, 'Sesión de entrenamiento'))
                                : event.title
                              }
                            </span>

                            {event.type === 'Partido' && event.lugar && (
                              <span className="text-[8.5px] font-bold text-blue-200 block mt-1 opacity-90 break-words w-full">
                                📍 {event.lugar}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1.5 flex-1" />
                        )}

                        {/* Quick Edit Icon on Hover */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white p-1 rounded-md shadow">
                          <Edit3 className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Motivation Banner (Convocatoria Footer) */}
          <div className="pt-3 border-t border-blue-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Legend Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 mr-1 whitespace-nowrap">LEYENDA DE ACTIVIDAD:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[11px] font-extrabold whitespace-nowrap shrink-0">
                <Dumbbell className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Entrenamiento</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-500/30 text-[11px] font-extrabold whitespace-nowrap shrink-0">
                <Moon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Descanso</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/90 text-sky-200 border border-sky-400/60 text-[11px] font-black uppercase whitespace-nowrap shrink-0">
                <Home className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span>⚽ Partido Local</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/90 text-amber-200 border border-amber-400/60 text-[11px] font-black uppercase whitespace-nowrap shrink-0">
                <Plane className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>⚽ Partido Visitante</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/90 text-red-200 border border-red-400/60 text-[11px] font-black uppercase whitespace-nowrap shrink-0">
                <Trophy className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                <span>Inicio Liga</span>
              </span>
            </div>

            {/* Motivation Quote */}
            <div className="text-xs font-black tracking-widest text-slate-100 flex items-center gap-1.5 uppercase bg-[#0e1d40] px-4 py-2 rounded-full border border-blue-400/30 shadow-lg whitespace-nowrap shrink-0">
              <span>🔵⚪ ¡CONFIANZA, ENTREGA Y VICTORIA! ¡A POR TODAS! ⚽ 🔥</span>
            </div>
          </div>

        </div>
      </div>

      {/* Quick Export & WhatsApp Share Footer Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 font-black shrink-0">
            💬
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">
              ¿Quieres compartir este calendario?
            </h4>
            <p className="text-[11px] text-slate-400">
              Descarga el archivo PDF de alta resolución o envía un resumen estructurado por WhatsApp al grupo del equipo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <Button
            onClick={() => handleUploadToSupabase()}
            disabled={isSyncing}
            className="text-xs font-black uppercase bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-600/20 gap-2 rounded-xl h-10 px-4 cursor-pointer"
          >
            <CloudUpload className={`w-4 h-4 text-cyan-200 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>Subir a Supabase</span>
          </Button>

          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            variant="outline"
            className="text-xs font-bold uppercase border-blue-500/40 text-blue-300 hover:bg-blue-950/50 gap-2 rounded-xl h-10 px-4 cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-blue-400" />
            <span>Descargar PDF</span>
          </Button>

          <Button
            onClick={handleExportPNG}
            disabled={isExporting}
            variant="outline"
            className="text-xs font-bold uppercase border-slate-700 text-slate-300 hover:bg-slate-800 gap-2 rounded-xl h-10 px-4 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Descargar PNG</span>
          </Button>

          <Button
            onClick={handleOpenWhatsAppModal}
            className="text-xs font-black uppercase bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 gap-2 rounded-xl h-10 px-5 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Enviar por WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* WhatsApp Share Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-emerald-950/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                  Enviar Calendario por WhatsApp
                </h3>
              </div>
              <button 
                onClick={() => setShowWhatsAppModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300">
                Puedes revisar y editar el texto del calendario de <strong className="text-white">{MONTH_NAMES[currentMonth]} {currentYear}</strong> antes de enviarlo:
              </p>

              <textarea
                rows={11}
                value={whatsappMsg}
                onChange={(e) => setWhatsappMsg(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500 transition-all leading-relaxed"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsappMsg);
                    toast.success('¡Texto del calendario copiado al portapapeles!');
                  }}
                  className="text-xs font-bold border-slate-800 text-slate-300 hover:text-white rounded-xl gap-1.5 cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-emerald-400" />
                  <span>Copiar Texto</span>
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const url = `https://web.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;
                      window.open(url, '_blank');
                    }}
                    className="text-xs font-bold border-emerald-800/60 text-emerald-300 hover:bg-emerald-950/40 rounded-xl gap-1.5 cursor-pointer hidden sm:flex"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>WhatsApp Web</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMsg)}`;
                      window.open(url, '_blank');
                    }}
                    className="text-xs font-extrabold uppercase bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 px-4"
                  >
                    <Send className="w-4 h-4" />
                    <span>Abrir WhatsApp</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                  Editar Evento ({editingDate})
                </h3>
              </div>
              <button 
                onClick={() => setEditingDate(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Tipo de Actividad
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Entrenamiento', 'Descanso', 'Partido', 'Inicio Liga', 'Torneo', 'Personalizado'] as CalendarEventType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        let titleStr: string = t;
                        if (t === 'Entrenamiento') titleStr = 'Entrenamiento';
                        if (t === 'Descanso') titleStr = 'Descanso';
                        if (t === 'Inicio Liga') titleStr = 'INICIO LIGA';
                        if (t === 'Partido') titleStr = eventForm.rival ? `vs ${eventForm.rival}` : 'Partido';

                        setEventForm({
                          ...eventForm,
                          type: t,
                          title: titleStr
                        });
                      }}
                      className={`px-3 py-2 text-xs font-black rounded-xl border transition-all text-center uppercase tracking-wider cursor-pointer ${
                        eventForm.type === t 
                          ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30' 
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Texto Principal en la Celda *
                </label>
                <input 
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                  placeholder="Ej. Entrenamiento, vs AD PARLA, INICIO LIGA..."
                />
              </div>

              {eventForm.type === 'Partido' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Condición del Partido (Icono)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEventForm({ 
                          ...eventForm, 
                          condicion: 'Local',
                          lugar: eventForm.lugar || 'Campo Municipal'
                        })}
                        className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                          getMatchCondition(eventForm) === 'Local'
                            ? 'bg-sky-600 text-white border-sky-400 shadow-lg shadow-sky-600/30'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <Home className="w-4 h-4 text-sky-200" />
                        <span>🏠 LOCAL (CASA)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEventForm({ 
                          ...eventForm, 
                          condicion: 'Visitante',
                          lugar: eventForm.lugar === 'Campo Municipal' ? '' : eventForm.lugar
                        })}
                        className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                          getMatchCondition(eventForm) === 'Visitante'
                            ? 'bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-600/30'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        <Plane className="w-4 h-4 text-amber-200" />
                        <span>✈️ VISITANTE (FUERA)</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Tipo de Competición
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['Amistoso', 'Liga', 'Copa', 'Torneo'] as MatchCompeticion[]).map(comp => (
                        <button
                          key={comp}
                          type="button"
                          onClick={() => setEventForm({ ...eventForm, competicion: comp })}
                          className={`px-2 py-1.5 text-xs font-black rounded-xl border transition-all text-center uppercase tracking-wider cursor-pointer ${
                            (eventForm.competicion || getMatchCompeticion(eventForm)) === comp
                              ? comp === 'Liga' ? 'bg-blue-600 text-white border-blue-400 shadow-md' :
                                comp === 'Copa' ? 'bg-amber-600 text-white border-amber-400 shadow-md' :
                                comp === 'Torneo' ? 'bg-purple-600 text-white border-purple-400 shadow-md' :
                                'bg-emerald-600 text-white border-emerald-400 shadow-md'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {comp === 'Liga' ? '🏆 LIGA' : comp === 'Copa' ? '👑 COPA' : comp === 'Torneo' ? '🎖️ TORNEO' : '🤝 AMISTOSO'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Nombre del Rival / Equipo
                      </label>
                      {eventForm.rival?.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRivalForManager(eventForm.rival);
                            setShowRivalManager(true);
                          }}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-extrabold uppercase hover:underline cursor-pointer"
                        >
                          Gestionar Escudo
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {eventForm.rival?.trim() && (
                        <RivalBadge 
                          rivalName={eventForm.rival} 
                          size="sm" 
                          onUploadClick={() => {
                            setSelectedRivalForManager(eventForm.rival);
                            setShowRivalManager(true);
                          }}
                        />
                      )}
                      <input 
                        type="text"
                        value={eventForm.rival || ''}
                        onChange={(e) => setEventForm({ ...eventForm, rival: e.target.value, title: `vs ${e.target.value}` })}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-all font-bold"
                        placeholder="Ej. AD PARLA"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Hora (Opcional)
                  </label>
                  <input 
                    type="text"
                    value={eventForm.hora || ''}
                    onChange={(e) => setEventForm({ ...eventForm, hora: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="Ej. 20:00 h"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Lugar (Opcional)
                  </label>
                  <input 
                    type="text"
                    value={eventForm.lugar || ''}
                    onChange={(e) => setEventForm({ ...eventForm, lugar: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                    placeholder="Ej. Campo Municipal"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleDeleteEvent(editingDate)}
                  className="text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  <span>Borrar Celda</span>
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingDate(null)}
                    className="text-xs font-bold border-slate-800 text-slate-300 rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="text-xs font-extrabold uppercase bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for managing rival team crests */}
      <RivalCrestsManagerModal
        isOpen={showRivalManager}
        onClose={() => {
          setShowRivalManager(false);
          setSelectedRivalForManager(undefined);
        }}
        preselectedRival={selectedRivalForManager}
      />
    </div>
  );
}
