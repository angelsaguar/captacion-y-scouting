import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Save, 
  Zap, 
  ShieldAlert, 
  Target, 
  Flag, 
  Shield, 
  Award, 
  AlertTriangle, 
  Clock, 
  Plus, 
  Minus, 
  Check, 
  UserCheck, 
  ChevronRight, 
  Trophy,
  BarChart2,
  ListOrdered,
  Sparkles,
  RefreshCw,
  Eye,
  Search,
  Users,
  Filter,
  Compass,
  ChevronDown,
  Layers,
  MapPin,
  Play,
  Pause,
  Square,
  RotateCcw,
  FastForward,
  Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';

export const POSICIONES_CAMPO = [
  'Portero',
  'Central Diestro',
  'Central Zurdo',
  'Lateral Derecho',
  'Lateral Izquierdo',
  'Medio Centro',
  'Interior Derecha',
  'Interior Izquierda',
  'Extremo Derecha',
  'Extremo Izquierda',
  'Delantero'
] as const;

export type PosicionCampo = typeof POSICIONES_CAMPO[number];

export function getDefaultCampoPosition(posRaw?: string): PosicionCampo {
  if (!posRaw) return 'Medio Centro';
  const p = posRaw.toLowerCase();
  if (p.includes('port')) return 'Portero';
  if (p.includes('zurdo') && (p.includes('centr') || p.includes('def'))) return 'Central Zurdo';
  if (p.includes('diestro') && (p.includes('centr') || p.includes('def'))) return 'Central Diestro';
  if (p.includes('centr') && (p.includes('def') || p.includes('cierre'))) return 'Central Diestro';
  if (p.includes('izq') && (p.includes('lat') || p.includes('carril'))) return 'Lateral Izquierdo';
  if (p.includes('der') && (p.includes('lat') || p.includes('carril'))) return 'Lateral Derecho';
  if (p.includes('lat') || p.includes('carril')) return 'Lateral Derecho';
  if (p.includes('izq') && p.includes('int')) return 'Interior Izquierda';
  if (p.includes('der') && p.includes('int')) return 'Interior Derecha';
  if (p.includes('int')) return 'Interior Derecha';
  if (p.includes('izq') && p.includes('ext')) return 'Extremo Izquierda';
  if (p.includes('der') && p.includes('ext')) return 'Extremo Derecha';
  if (p.includes('ext')) return 'Extremo Derecha';
  if (p.includes('delant') || p.includes('punta') || p.includes('ariete')) return 'Delantero';
  if (p.includes('pivote') || p.includes('medio') || p.includes('volante')) return 'Medio Centro';
  return 'Medio Centro';
}

export type ChronoPhase = 'pre' | '1t' | 'descanso' | '2t' | 'finalizado';

/**
 * Calcula el minuto de juego oficial formateado según el tiempo transcurrido y la fase:
 * - 1er tiempo: de 0 a 45 más descuento. Si son 47 min de partido total (minuto 2 de descuento), devuelve "45+2'".
 * - 2º tiempo: empieza en minuto 45. De 45 a 90 más descuento. Si son 93 min de partido (minuto 3 de descuento), devuelve "90+3'".
 */
export function formatMatchMinute(seconds: number, phase: ChronoPhase): string {
  if (phase === 'pre') return "0'";

  if (phase === '1t' || phase === 'descanso') {
    const totalMinutes = Math.floor(seconds / 60);
    if (totalMinutes < 45) {
      return `${totalMinutes}'`;
    } else {
      // 1er tiempo en descuento (ej: min 47 -> "45+2'")
      const extraMinutes = Math.floor((seconds - 45 * 60) / 60);
      return `45+${extraMinutes}'`;
    }
  }

  // 2ª Parte o Finalizado (arranca en 45')
  const totalMinutes = Math.floor(seconds / 60);
  if (totalMinutes < 90) {
    return `${totalMinutes}'`;
  } else {
    // 2º tiempo en descuento (ej: min 93 -> "90+3'")
    const extraMinutes = Math.floor((seconds - 90 * 60) / 60);
    return `90+${extraMinutes}'`;
  }
}

/**
 * Devuelve los valores de visualización del marcador digital del cronómetro
 */
export function getChronoDisplay(seconds: number, phase: ChronoPhase, isRunning: boolean = false) {
  if (phase === 'pre') {
    return {
      mainTime: '00:00',
      extraTime: null,
      matchMinuteStr: "0'",
      phaseLabel: 'Sin Iniciar (Pre-Partido)',
      isExtraTime: false
    };
  }

  if (phase === '1t' || phase === 'descanso') {
    const isFirstHalfDiscount = seconds > 45 * 60;
    if (!isFirstHalfDiscount) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return {
        mainTime: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
        extraTime: null,
        matchMinuteStr: `${mins}'`,
        phaseLabel: phase === 'descanso' 
          ? 'Descanso (Fin 1ª Parte)' 
          : isRunning 
          ? '1ª Parte en juego' 
          : '1ª Parte (En pausa)',
        isExtraTime: false
      };
    } else {
      const extraTotalSecs = seconds - 45 * 60;
      const extraMins = Math.floor(extraTotalSecs / 60);
      const extraSecs = extraTotalSecs % 60;
      return {
        mainTime: '45:00',
        extraTime: `+${String(extraMins).padStart(2, '0')}:${String(extraSecs).padStart(2, '0')}`,
        matchMinuteStr: `45+${extraMins}'`,
        phaseLabel: phase === 'descanso' 
          ? 'Descanso (Fin 1ª Parte)' 
          : isRunning 
          ? '1ª Parte (+Descuento)' 
          : '1ª Parte (+Desc. Pausado)',
        isExtraTime: true
      };
    }
  }

  // 2ª Parte ('2t' o 'finalizado')
  const isSecondHalfDiscount = seconds > 90 * 60;
  if (!isSecondHalfDiscount) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return {
      mainTime: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
      extraTime: null,
      matchMinuteStr: `${mins}'`,
      phaseLabel: phase === 'finalizado' 
        ? 'Partido Finalizado' 
        : isRunning 
        ? '2ª Parte en juego' 
        : seconds === 45 * 60
        ? '2ª Parte (Listo en 45:00)'
        : '2ª Parte (En pausa)',
      isExtraTime: false
    };
  } else {
    const extraTotalSecs = seconds - 90 * 60;
    const extraMins = Math.floor(extraTotalSecs / 60);
    const extraSecs = extraTotalSecs % 60;
    return {
      mainTime: '90:00',
      extraTime: `+${String(extraMins).padStart(2, '0')}:${String(extraSecs).padStart(2, '0')}`,
      matchMinuteStr: `90+${extraMins}'`,
      phaseLabel: phase === 'finalizado' 
        ? 'Partido Finalizado' 
        : isRunning 
        ? '2ª Parte (+Descuento)' 
        : '2ª Parte (+Desc. Pausado)',
      isExtraTime: true
    };
  }
}

export interface PlayerPositionStatRecord {
  minutos?: number;
  goles_metidos?: number;
  goles_encajados?: number;
  asistencias?: number;
  perdidas_balon?: number;
  recuperaciones_balon?: number;
  tarjetas_amarillas?: number;
  tarjetas_rojas?: number;
  faltas_favor?: number;
  faltas_contra?: number;
}

export interface MatchPlayerStat {
  playerId: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
  posicionActiva?: string;
  stats_por_posicion?: Record<string, PlayerPositionStatRecord>;
  titular?: boolean;
  suplente?: boolean;
  minutos?: number;
  tarjetas_amarillas?: number;
  tarjetas_rojas?: number;
  goles_metidos?: number;
  goles_encajados?: number;
  asistencias?: number;
  perdidas_balon?: number;
  recuperaciones_balon?: number;
  corners_favor?: number;
  corners_contra?: number;
  faltas_favor?: number;
  faltas_contra?: number;
  isConvocada?: boolean;
}

export interface MatchTotals {
  goles_favor: number;
  goles_contra: number;
  asistencias: number;
  recuperaciones_balon: number;
  perdidas_balon: number;
  corners_favor: number;
  corners_contra: number;
  faltas_favor: number;
  faltas_contra: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
}

interface MatchStatsModalProps {
  isOpen: boolean;
  match: any;
  teamName: string;
  allPlayers: any[];
  onClose: () => void;
  onSaveMatch: (updatedMatch: any) => void;
}

type StatCategory = 
  | 'goles_metidos' 
  | 'goles_encajados' 
  | 'asistencias'
  | 'recuperaciones_balon' 
  | 'perdidas_balon' 
  | 'tarjetas_amarillas' 
  | 'tarjetas_rojas' 
  | 'corners_favor' 
  | 'corners_contra' 
  | 'faltas_favor' 
  | 'faltas_contra'
  | 'minutos';

export default function MatchStatsModal({
  isOpen,
  match,
  teamName,
  allPlayers,
  onClose,
  onSaveMatch
}: MatchStatsModalProps) {
  if (!isOpen || !match) return null;

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'rapido' | 'matriz' | 'resumen'>('rapido');

  // Selected player in Quick Tracker
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  // Search filter
  const [playerSearch, setPlayerSearch] = useState<string>('');

  // Filter mode: 'todas' | 'convocadas' | 'con_eventos'
  const [rosterFilter, setRosterFilter] = useState<'todas' | 'convocadas' | 'con_eventos'>('todas');

  // Player Stats array
  const [playerStats, setPlayerStats] = useState<MatchPlayerStat[]>([]);

  // Team-level totals
  const [teamTotals, setTeamTotals] = useState<MatchTotals>({
    goles_favor: match.goles_favor ?? 0,
    goles_contra: match.goles_contra ?? 0,
    asistencias: 0,
    recuperaciones_balon: 0,
    perdidas_balon: 0,
    corners_favor: 0,
    corners_contra: 0,
    faltas_favor: 0,
    faltas_contra: 0,
    tarjetas_amarillas: 0,
    tarjetas_rojas: 0
  });

  // Recent events log for visual feedback on iPad touch
  const [eventLogs, setEventLogs] = useState<{ id: string; time: string; text: string; type: string }[]>([]);

  // Cronómetro de partido
  const [chronoSeconds, setChronoSeconds] = useState<number>(() => {
    return match.estadisticas?.cronometro?.seconds ?? 0;
  });
  const [chronoPhase, setChronoPhase] = useState<ChronoPhase>(() => {
    return (match.estadisticas?.cronometro?.phase as ChronoPhase) ?? 'pre';
  });
  const [isChronoRunning, setIsChronoRunning] = useState<boolean>(() => {
    return match.estadisticas?.cronometro?.isRunning ?? false;
  });

  // Ticker de 1 segundo
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isChronoRunning) {
      interval = setInterval(() => {
        setChronoSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isChronoRunning]);

  // Función unificada para registrar eventos con el minuto del partido (ej: "45+2'")
  const addEventLog = (text: string, type: string, forcedTime?: string) => {
    const timeToUse = forcedTime || formatMatchMinute(chronoSeconds, chronoPhase);
    setEventLogs(logs => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        time: timeToUse,
        text,
        type
      },
      ...logs.slice(0, 25)
    ]);
  };

  // Controles del cronómetro de partido:
  // 1. Inicio de partido / 1ª parte: corre de 0 a 45 más descuento
  const handleStartFirstHalf = () => {
    setChronoPhase('1t');
    if (chronoPhase === 'pre' || chronoSeconds >= 45 * 60) {
      setChronoSeconds(0);
    }
    setIsChronoRunning(true);
    addEventLog('⏱️ Inicio de Partido / 1ª Parte (00:00)', 'cronometro', "0'");
    toast.success('¡1ª Parte iniciada!');
  };

  // 2. Fin 1ª parte / Descanso
  const handleEndFirstHalf = () => {
    setIsChronoRunning(false);
    setChronoPhase('descanso');
    const minStr = formatMatchMinute(chronoSeconds, '1t');
    addEventLog(`⏱️ Fin 1ª Parte - Descanso (${minStr})`, 'cronometro', minStr);
    toast.info(`Fin de la 1ª Parte (${minStr})`);
  };

  // 3. Inicio 2ª parte: "que la segunda parte empieza en minuto 45"
  const handleStartSecondHalf = () => {
    setChronoPhase('2t');
    setChronoSeconds(45 * 60); // Inicia exactamente en 45:00
    setIsChronoRunning(true);
    addEventLog("⏱️ Inicio de 2ª Parte (Minuto 45')", 'cronometro', "45'");
    toast.success('¡2ª Parte iniciada en el minuto 45!');
  };

  // 4. Final del partido (Fin 2ª parte)
  const handleEndMatch = () => {
    setIsChronoRunning(false);
    setChronoPhase('finalizado');
    const minStr = formatMatchMinute(chronoSeconds, '2t');
    addEventLog(`⏱️ Final del Partido (${minStr})`, 'cronometro', minStr);
    toast.success(`¡Partido Finalizado (${minStr})!`);
  };

  // Pausar / Reanudar rápido por interrupción de juego o lesión
  const handleTogglePause = () => {
    if (isChronoRunning) {
      setIsChronoRunning(false);
      const minStr = formatMatchMinute(chronoSeconds, chronoPhase);
      addEventLog(`⏸️ Tiempo detenido (${minStr})`, 'cronometro', minStr);
      toast.info(`Cronómetro pausado (${minStr})`);
    } else {
      setIsChronoRunning(true);
      const minStr = formatMatchMinute(chronoSeconds, chronoPhase);
      addEventLog(`▶️ Tiempo reanudado (${minStr})`, 'cronometro', minStr);
      toast.success(`Cronómetro en marcha (${minStr})`);
    }
  };

  // Determinar si estamos en la 2ª parte para el reinicio contextual (1T -> 0' / 2T -> 45')
  const isSecondHalf = chronoPhase === '2t' || chronoPhase === 'finalizado';

  // Estado para modal de confirmación de reinicio del cronómetro
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Ajuste fino de minutos (+1m, -1m)
  const handleAdjustMinutes = (deltaMinutes: number) => {
    setChronoSeconds(prev => Math.max(0, prev + deltaMinutes * 60));
  };

  // Solicitar reinicio del cronómetro (diferenciando 1ª o 2ª parte)
  const handleRequestReset = () => {
    if (!isSecondHalf && chronoSeconds === 0 && chronoPhase === 'pre' && !isChronoRunning) {
      toast.info('El cronómetro de la 1ª parte ya se encuentra en 00:00 (Pre-partido)');
      return;
    }
    if (isSecondHalf && chronoSeconds === 45 * 60 && !isChronoRunning) {
      toast.info('El cronómetro de la 2ª parte ya se encuentra en el minuto 45:00');
      return;
    }
    setShowResetConfirm(true);
  };

  // Ejecutar reinicio del cronómetro:
  // - 1ª parte: vuelve a 00:00 (Pre-partido)
  // - 2ª parte: vuelve a 45:00 (segundo tiempo listo para iniciar)
  const executeResetChrono = (targetPhase?: '1t' | '2t') => {
    const target = targetPhase || (isSecondHalf ? '2t' : '1t');
    setIsChronoRunning(false);
    setShowResetConfirm(false);

    if (target === '2t') {
      setChronoPhase('2t');
      setChronoSeconds(45 * 60);
      addEventLog("🔄 2ª Parte reiniciada al minuto 45:00", 'cronometro', "45'");
      toast.success('2ª Parte reiniciada al minuto 45 (45:00)');
    } else {
      setChronoPhase('pre');
      setChronoSeconds(0);
      addEventLog('🔄 1ª Parte reiniciada al minuto 0 (00:00)', 'cronometro', "0'");
      toast.success('1ª Parte reiniciada al minuto 0 (00:00)');
    }
  };

  // Valores calculados de tiempo para renderizado
  const chronoDisplay = useMemo(() => {
    return getChronoDisplay(chronoSeconds, chronoPhase, isChronoRunning);
  }, [chronoSeconds, chronoPhase, isChronoRunning]);

  // Initialize data on match open - ALWAYS includes ALL players from team roster
  useEffect(() => {
    // 1. Get convocadas IDs as strings for safe matching
    const convocadasRaw: any[] = match.convocatoria || [];
    const convocadasIds = new Set(convocadasRaw.map(id => String(id)));

    // 2. Existing match stats if previously saved
    const existingStats: MatchPlayerStat[] = match.estadisticas?.jugadoras_stats || [];
    const statsMap: Record<string, MatchPlayerStat> = {};
    existingStats.forEach(st => {
      statsMap[String(st.playerId)] = st;
    });

    // 3. Merge all players from roster + any existing player from stats
    const rosterMap = new Map<string, any>();
    allPlayers.forEach(p => {
      rosterMap.set(String(p.id), p);
    });

    // Also include any player who had stats saved even if removed from general roster
    existingStats.forEach(st => {
      if (!rosterMap.has(String(st.playerId))) {
        rosterMap.set(String(st.playerId), {
          id: st.playerId,
          nombre: st.nombre || 'Jugadora',
          apellidos: st.apellidos || '',
          dorsal: st.dorsal || '',
          posicion: st.posicion || 'Campo'
        });
      }
    });

    const unifiedList = Array.from(rosterMap.values());

    // Sort players primarily by dorsal (numeric)
    unifiedList.sort((a, b) => {
      const dorsalA = parseInt(a.dorsal) || 999;
      const dorsalB = parseInt(b.dorsal) || 999;
      return dorsalA - dorsalB;
    });

    const initialPlayerStats: MatchPlayerStat[] = unifiedList.map(p => {
      const pIdStr = String(p.id);
      const existing = statsMap[pIdStr];
      const isConv = convocadasIds.size === 0 || convocadasIds.has(pIdStr);

      const defaultTacticalPos = existing?.posicionActiva || getDefaultCampoPosition(p.posicion);
      const existingPosStats = existing?.stats_por_posicion;

      let statsPorPosicion: Record<string, PlayerPositionStatRecord> = {};
      if (existingPosStats && Object.keys(existingPosStats).length > 0) {
        statsPorPosicion = { ...existingPosStats };
      } else {
        statsPorPosicion = {
          [defaultTacticalPos]: {
            minutos: existing?.minutos ?? (match.estado === 'Finalizado' ? 80 : 0),
            goles_metidos: existing?.goles_metidos ?? 0,
            goles_encajados: existing?.goles_encajados ?? 0,
            asistencias: existing?.asistencias ?? 0,
            recuperaciones_balon: existing?.recuperaciones_balon ?? 0,
            perdidas_balon: existing?.perdidas_balon ?? 0,
            tarjetas_amarillas: existing?.tarjetas_amarillas ?? 0,
            tarjetas_rojas: existing?.tarjetas_rojas ?? 0,
            faltas_favor: existing?.faltas_favor ?? 0,
            faltas_contra: existing?.faltas_contra ?? 0,
          }
        };
      }

      return {
        playerId: pIdStr,
        nombre: p.nombre || '',
        apellidos: p.apellidos || '',
        dorsal: p.dorsal || '',
        posicion: p.posicion || 'Campo',
        posicionActiva: defaultTacticalPos,
        stats_por_posicion: statsPorPosicion,
        titular: existing ? !!existing.titular : false,
        suplente: existing ? !!existing.suplente : false,
        minutos: existing?.minutos ?? (match.estado === 'Finalizado' ? 80 : 0),
        goles_metidos: existing?.goles_metidos ?? 0,
        goles_encajados: existing?.goles_encajados ?? 0,
        asistencias: existing?.asistencias ?? 0,
        recuperaciones_balon: existing?.recuperaciones_balon ?? 0,
        perdidas_balon: existing?.perdidas_balon ?? 0,
        tarjetas_amarillas: existing?.tarjetas_amarillas ?? 0,
        tarjetas_rojas: existing?.tarjetas_rojas ?? 0,
        corners_favor: existing?.corners_favor ?? 0,
        corners_contra: existing?.corners_contra ?? 0,
        faltas_favor: existing?.faltas_favor ?? 0,
        faltas_contra: existing?.faltas_contra ?? 0,
        isConvocada: isConv
      };
    });

    setPlayerStats(initialPlayerStats);

    // Initial filter selection: if match has a defined convocatoria with players, default to 'convocadas', else 'todas'
    if (convocadasIds.size > 0 && initialPlayerStats.some(p => p.isConvocada)) {
      setRosterFilter('convocadas');
      const firstConv = initialPlayerStats.find(p => p.isConvocada);
      if (firstConv) {
        setSelectedPlayerId(firstConv.playerId);
      } else if (initialPlayerStats.length > 0) {
        setSelectedPlayerId(initialPlayerStats[0].playerId);
      }
    } else {
      setRosterFilter('todas');
      if (initialPlayerStats.length > 0) {
        setSelectedPlayerId(initialPlayerStats[0].playerId);
      }
    }

    // Initialize team totals
    const existingTotals = match.estadisticas?.totales_equipo;
    const sumGolesF = initialPlayerStats.reduce((a, b) => a + (b.goles_metidos || 0), 0);
    const sumGolesC = initialPlayerStats.reduce((a, b) => a + (b.goles_encajados || 0), 0);
    const sumAsist = initialPlayerStats.reduce((a, b) => a + (b.asistencias || 0), 0);
    const sumRec = initialPlayerStats.reduce((a, b) => a + (b.recuperaciones_balon || 0), 0);
    const sumPer = initialPlayerStats.reduce((a, b) => a + (b.perdidas_balon || 0), 0);
    const sumCF = initialPlayerStats.reduce((a, b) => a + (b.corners_favor || 0), 0);
    const sumCC = initialPlayerStats.reduce((a, b) => a + (b.corners_contra || 0), 0);
    const sumFF = initialPlayerStats.reduce((a, b) => a + (b.faltas_favor || 0), 0);
    const sumFC = initialPlayerStats.reduce((a, b) => a + (b.faltas_contra || 0), 0);
    const sumTA = initialPlayerStats.reduce((a, b) => a + (b.tarjetas_amarillas || 0), 0);
    const sumTR = initialPlayerStats.reduce((a, b) => a + (b.tarjetas_rojas || 0), 0);

    setTeamTotals({
      goles_favor: existingTotals?.goles_favor ?? Math.max(match.goles_favor ?? 0, sumGolesF),
      goles_contra: existingTotals?.goles_contra ?? Math.max(match.goles_contra ?? 0, sumGolesC),
      asistencias: sumAsist,
      recuperaciones_balon: sumRec > 0 ? sumRec : (existingTotals?.recuperaciones_balon ?? 0),
      perdidas_balon: sumPer > 0 ? sumPer : (existingTotals?.perdidas_balon ?? 0),
      corners_favor: sumCF > 0 ? sumCF : (existingTotals?.corners_favor ?? 0),
      corners_contra: sumCC > 0 ? sumCC : (existingTotals?.corners_contra ?? 0),
      faltas_favor: sumFF > 0 ? sumFF : (existingTotals?.faltas_favor ?? 0),
      faltas_contra: sumFC > 0 ? sumFC : (existingTotals?.faltas_contra ?? 0),
      tarjetas_amarillas: sumTA,
      tarjetas_rojas: sumTR
    });
  }, [match, allPlayers]);

  // Handler to switch player active position on field
  const handlePositionChange = (playerId: string, newPos: string) => {
    const targetPlayer = playerStats.find(p => p.playerId === playerId);
    if (!targetPlayer) return;

    const nextStats = playerStats.map(p => {
      if (p.playerId !== playerId) return p;
      const currentPosStats = { ...(p.stats_por_posicion || {}) };
      if (!currentPosStats[newPos]) {
        currentPosStats[newPos] = {
          minutos: 0,
          goles_metidos: 0,
          goles_encajados: 0,
          asistencias: 0,
          recuperaciones_balon: 0,
          perdidas_balon: 0,
          tarjetas_amarillas: 0,
          tarjetas_rojas: 0,
          faltas_favor: 0,
          faltas_contra: 0
        };
      }
      return {
        ...p,
        posicionActiva: newPos,
        stats_por_posicion: currentPosStats
      };
    });

    setPlayerStats(nextStats);

    addEventLog(`📍 ${targetPlayer.nombre} #${targetPlayer.dorsal} jugando como ${newPos}`, 'posicion');
  };

  // Adjust minutes directly for the active position
  const adjustPositionMinutes = (playerId: string, delta: number) => {
    const targetPlayer = playerStats.find(p => p.playerId === playerId);
    if (!targetPlayer) return;

    const activePos = targetPlayer.posicionActiva || getDefaultCampoPosition(targetPlayer.posicion);
    const posMap: Record<string, PlayerPositionStatRecord> = { ...(targetPlayer.stats_por_posicion || {}) };
    const currentPosData: PlayerPositionStatRecord = { ...(posMap[activePos] || {}) };

    const currentMins = Number(currentPosData.minutos || 0);
    const newMins = Math.max(0, currentMins + delta);
    if (newMins === currentMins && delta < 0) return;

    currentPosData.minutos = newMins;
    posMap[activePos] = currentPosData;

    // Recalculate total minutes for player across all positions
    const sumMins = Object.values(posMap).reduce((acc, posRec) => {
      return acc + (Number(posRec.minutos) || 0);
    }, 0);

    addEventLog(`${delta > 0 ? '+' : ''}${delta} min ⏱️ (${targetPlayer.nombre} #${targetPlayer.dorsal} • ${activePos})`, 'minutos');

    const nextStats = playerStats.map(p => {
      if (p.playerId !== playerId) return p;
      return {
        ...p,
        stats_por_posicion: posMap,
        minutos: sumMins
      };
    });

    setPlayerStats(nextStats);
  };

  // Handler to adjust player stat according to the currently selected active position
  const adjustPlayerStat = (playerId: string, category: StatCategory, delta: number) => {
    const targetPlayer = playerStats.find(p => p.playerId === playerId);
    if (!targetPlayer) return;

    const activePos = targetPlayer.posicionActiva || getDefaultCampoPosition(targetPlayer.posicion);
    const posMap: Record<string, PlayerPositionStatRecord> = { ...(targetPlayer.stats_por_posicion || {}) };
    const currentPosData: PlayerPositionStatRecord = { ...(posMap[activePos] || {}) };

    const currentValInPos = Number(currentPosData[category as keyof PlayerPositionStatRecord] || 0);
    const newValInPos = Math.max(0, currentValInPos + delta);
    if (newValInPos === currentValInPos && delta < 0) return;

    currentPosData[category as keyof PlayerPositionStatRecord] = newValInPos;
    posMap[activePos] = currentPosData;

    // Recalculate player total sum across all occupied positions for this category
    const sumForCategory = Object.values(posMap).reduce((acc, posRec) => {
      return acc + (Number(posRec[category as keyof PlayerPositionStatRecord]) || 0);
    }, 0);

    const catNames: Record<StatCategory, string> = {
      goles_metidos: 'Gol a favor ⚽',
      goles_encajados: 'Gol en contra 🥅',
      asistencias: 'Asistencia de gol 🎯',
      recuperaciones_balon: 'Recuperación ⚡',
      perdidas_balon: 'Pérdida de balón ⚠️',
      tarjetas_amarillas: 'Tarjeta amarilla 🟨',
      tarjetas_rojas: 'Tarjeta roja 🟥',
      corners_favor: 'Córner a favor 🚩',
      corners_contra: 'Córner en contra 🚩',
      faltas_favor: 'Falta provocada 🛡️',
      faltas_contra: 'Falta cometida ⚠️',
      minutos: 'Minutos ⏱️'
    };

    if (delta > 0) {
      addEventLog(`+${delta} ${catNames[category]} (${targetPlayer.nombre} #${targetPlayer.dorsal} • ${activePos})`, category);
    } else if (delta < 0 && currentValInPos > 0) {
      addEventLog(`${delta} ${catNames[category]} (${targetPlayer.nombre} #${targetPlayer.dorsal} • ${activePos})`, category);
    }

    const nextStats = playerStats.map(p => {
      if (p.playerId !== playerId) return p;
      return {
        ...p,
        stats_por_posicion: posMap,
        [category]: sumForCategory
      };
    });

    setPlayerStats(nextStats);
    recalcTeamTotals(nextStats);
  };

  // Handler to toggle player starting role (Titular vs Suplente)
  const setPlayerRole = (playerId: string, role: 'titular' | 'suplente') => {
    const targetPlayer = playerStats.find(p => p.playerId === playerId);
    if (!targetPlayer) return;

    const isCurrentlyTitular = !!targetPlayer.titular;
    const isCurrentlySuplente = !!targetPlayer.suplente;

    let newTitular = false;
    let newSuplente = false;

    if (role === 'titular') {
      newTitular = !isCurrentlyTitular;
      newSuplente = false;
    } else if (role === 'suplente') {
      newSuplente = !isCurrentlySuplente;
      newTitular = false;
    }

    const roleLabel = newTitular ? 'Titular ★' : newSuplente ? 'Suplente 🔄' : 'Sin rol';
    addEventLog(`${targetPlayer.nombre} #${targetPlayer.dorsal} marcado como ${roleLabel}`, 'rol');

    const activePos = targetPlayer.posicionActiva || getDefaultCampoPosition(targetPlayer.posicion);
    const posMap: Record<string, PlayerPositionStatRecord> = { ...(targetPlayer.stats_por_posicion || {}) };
    const currentPosData: PlayerPositionStatRecord = { ...(posMap[activePos] || {}) };

    let assignedMinutos = targetPlayer.minutos ?? 0;
    if (newTitular && (!targetPlayer.minutos || targetPlayer.minutos === 0)) {
      assignedMinutos = 80;
      currentPosData.minutos = 80;
      posMap[activePos] = currentPosData;
    }

    const nextStats = playerStats.map(p => {
      if (p.playerId !== playerId) return p;
      return {
        ...p,
        titular: newTitular,
        suplente: newSuplente,
        stats_por_posicion: posMap,
        minutos: assignedMinutos
      };
    });

    setPlayerStats(nextStats);
  };

  // Team totals direct adjustment
  const adjustTeamTotal = (key: keyof MatchTotals, delta: number) => {
    const currentVal = teamTotals[key] || 0;
    const newVal = Math.max(0, currentVal + delta);
    if (newVal === currentVal && delta < 0) return;

    const teamCatNames: Record<string, string> = {
      corners_favor: 'Córner a favor 🚩',
      corners_contra: 'Córner en contra 🚩',
      faltas_favor: 'Falta a favor 🛡️',
      faltas_contra: 'Falta en contra ⚠️',
      goles_favor: 'Gol a favor ⚽',
      goles_contra: 'Gol en contra 🥅',
      asistencias: 'Asistencia 🎯',
      recuperaciones_balon: 'Recuperación ⚡',
      perdidas_balon: 'Pérdida de balón ⚠️',
      tarjetas_amarillas: 'Tarjeta amarilla 🟨',
      tarjetas_rojas: 'Tarjeta roja 🟥'
    };

    if (delta > 0) {
      addEventLog(`+1 ${teamCatNames[key] || key} (Equipo)`, key as any);
    } else if (delta < 0 && currentVal > 0) {
      addEventLog(`-1 ${teamCatNames[key] || key} (Equipo)`, key as any);
    }

    setTeamTotals(prev => ({
      ...prev,
      [key]: newVal
    }));
  };

  // Recalculate totals from players
  const recalcTeamTotals = (currentStats: MatchPlayerStat[]) => {
    const sumGolesF = currentStats.reduce((a, b) => a + (b.goles_metidos || 0), 0);
    const sumGolesC = currentStats.reduce((a, b) => a + (b.goles_encajados || 0), 0);
    const sumAsist = currentStats.reduce((a, b) => a + (b.asistencias || 0), 0);
    const sumRec = currentStats.reduce((a, b) => a + (b.recuperaciones_balon || 0), 0);
    const sumPer = currentStats.reduce((a, b) => a + (b.perdidas_balon || 0), 0);
    const sumCF = currentStats.reduce((a, b) => a + (b.corners_favor || 0), 0);
    const sumCC = currentStats.reduce((a, b) => a + (b.corners_contra || 0), 0);
    const sumFF = currentStats.reduce((a, b) => a + (b.faltas_favor || 0), 0);
    const sumFC = currentStats.reduce((a, b) => a + (b.faltas_contra || 0), 0);
    const sumTA = currentStats.reduce((a, b) => a + (b.tarjetas_amarillas || 0), 0);
    const sumTR = currentStats.reduce((a, b) => a + (b.tarjetas_rojas || 0), 0);

    setTeamTotals(prev => ({
      ...prev,
      goles_favor: sumGolesF > 0 ? sumGolesF : prev.goles_favor,
      goles_contra: sumGolesC > 0 ? sumGolesC : prev.goles_contra,
      asistencias: sumAsist,
      recuperaciones_balon: sumRec,
      perdidas_balon: sumPer,
      corners_favor: sumCF > 0 ? sumCF : prev.corners_favor,
      corners_contra: sumCC > 0 ? sumCC : prev.corners_contra,
      faltas_favor: sumFF > 0 ? sumFF : prev.faltas_favor,
      faltas_contra: sumFC > 0 ? sumFC : prev.faltas_contra,
      tarjetas_amarillas: sumTA,
      tarjetas_rojas: sumTR
    }));
  };

  // Save handler
  const handleSaveAndSync = () => {
    const updatedMatch = {
      ...match,
      goles_favor: teamTotals.goles_favor,
      goles_contra: teamTotals.goles_contra,
      estadisticas: {
        ...(match.estadisticas || {}),
        jugadoras_stats: playerStats,
        totales_equipo: teamTotals,
        cronometro: {
          seconds: chronoSeconds,
          phase: chronoPhase,
          isRunning: isChronoRunning
        }
      }
    };

    onSaveMatch(updatedMatch);
    toast.success('¡Estadísticas y cronómetro guardados y sincronizados!');
    onClose();
  };

  // Filtered list of player stats
  const filteredPlayerStats = useMemo(() => {
    return playerStats.filter(p => {
      // 1. Roster filter
      if (rosterFilter === 'convocadas' && !p.isConvocada) return false;
      if (rosterFilter === 'con_eventos') {
        const hasEvents = (p.goles_metidos || 0) > 0 ||
          (p.asistencias || 0) > 0 ||
          (p.recuperaciones_balon || 0) > 0 ||
          (p.perdidas_balon || 0) > 0 ||
          (p.goles_encajados || 0) > 0 ||
          (p.tarjetas_amarillas || 0) > 0 ||
          (p.tarjetas_rojas || 0) > 0 ||
          (p.minutos || 0) > 0;
        if (!hasEvents) return false;
      }

      // 2. Search query
      if (!playerSearch.trim()) return true;
      const q = playerSearch.toLowerCase().trim();
      return (
        p.nombre.toLowerCase().includes(q) || 
        p.apellidos.toLowerCase().includes(q) || 
        (p.dorsal && p.dorsal.toString().includes(q)) ||
        (p.posicion && p.posicion.toLowerCase().includes(q))
      );
    });
  }, [playerStats, rosterFilter, playerSearch]);

  // Active selected player
  const selectedPlayer = playerStats.find(p => p.playerId === selectedPlayerId) || filteredPlayerStats[0] || playerStats[0];

  const convocadasCount = useMemo(() => playerStats.filter(p => p.isConvocada).length, [playerStats]);
  const activeCount = useMemo(() => playerStats.filter(p => 
    (p.goles_metidos || 0) > 0 ||
    (p.asistencias || 0) > 0 ||
    (p.recuperaciones_balon || 0) > 0 ||
    (p.perdidas_balon || 0) > 0 ||
    (p.tarjetas_amarillas || 0) > 0 ||
    (p.tarjetas_rojas || 0) > 0 ||
    (p.minutos || 0) > 0
  ).length, [playerStats]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-1 sm:p-2 md:p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl md:rounded-3xl w-full max-w-[98vw] 2xl:max-w-[1440px] h-[96vh] md:h-[94vh] max-h-[960px] flex flex-col shadow-2xl overflow-hidden text-left">
        
        {/* HEADER BAR - Responsive on iPad */}
        <div className="bg-slate-950/95 border-b border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                  Estadísticas en Vivo
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {match.fecha} • {match.hora}
                </span>
              </div>
              <h3 className="text-xs sm:text-sm md:text-base font-black text-white uppercase tracking-tight flex items-center gap-1.5 truncate">
                <span className="truncate max-w-[130px] sm:max-w-[200px]">{match.tipo === 'Local' ? teamName : match.rival}</span>
                <span className="text-cyan-400 font-mono px-2 py-0.5 bg-slate-900 rounded-md border border-slate-800 text-xs sm:text-sm font-black">
                  {teamTotals.goles_favor} - {teamTotals.goles_contra}
                </span>
                <span className="truncate max-w-[130px] sm:max-w-[200px]">{match.tipo === 'Local' ? match.rival : teamName}</span>
              </h3>
            </div>
          </div>

          {/* TAB BUTTONS */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('rapido')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'rapido'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Registro Rápido</span>
            </button>

            <button
              onClick={() => setActiveTab('matriz')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'matriz'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <ListOrdered className="w-3 h-3" />
              <span className="hidden sm:inline">Matriz Jugadoras</span>
              <span className="sm:hidden">Matriz</span>
            </button>

            <button
              onClick={() => setActiveTab('resumen')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'resumen'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>Totales</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
            title="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CRONÓMETRO DE PARTIDO PROFESIONAL (ESTADIO / BROADCAST TV) */}
        <div className="bg-gradient-to-r from-slate-950 via-[#070F1E] to-slate-950 border-b border-cyan-500/30 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-inner">
          
          {/* DISPLAY DIGITAL Y MINUTO OFICIAL */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <div className="bg-black/90 border border-cyan-500/40 rounded-xl px-3 py-1.5 flex items-center gap-3 shadow-lg">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Clock className={`w-3 h-3 ${isChronoRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
                  <span>Cronómetro</span>
                </span>
                
                {/* DÍGITOS DIGITALES */}
                <div className="flex items-baseline gap-1.5 font-mono">
                  <span className={`text-2xl sm:text-3xl font-black tracking-wider leading-none ${
                    isChronoRunning ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'text-slate-200'
                  }`}>
                    {chronoDisplay.mainTime}
                  </span>
                  
                  {/* INSIGNIA DE DESCUENTO ILUMINADA */}
                  {chronoDisplay.isExtraTime && chronoDisplay.extraTime && (
                    <span className="text-amber-400 font-black text-xs sm:text-sm font-mono animate-pulse bg-amber-950/80 border border-amber-500/60 px-1.5 py-0.5 rounded-md shadow-xs">
                      {chronoDisplay.extraTime}
                    </span>
                  )}
                </div>
              </div>

              {/* MINUTO OFICIAL REGISTRADO (Ej: 45+2', 90+3') */}
              <div className="flex flex-col border-l border-slate-800 pl-2.5 justify-center">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Minuto:</span>
                  <span className="text-xs sm:text-sm font-black font-mono text-cyan-300 bg-slate-900 border border-cyan-500/40 px-1.5 py-0.2 rounded shadow-xs">
                    {chronoDisplay.matchMinuteStr}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    isChronoRunning 
                      ? 'bg-emerald-400 animate-ping' 
                      : chronoPhase === 'finalizado' 
                      ? 'bg-rose-500' 
                      : chronoPhase === 'descanso' 
                      ? 'bg-amber-400' 
                      : 'bg-slate-600'
                  }`} />
                  <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider ${
                    isChronoRunning 
                      ? 'text-emerald-400 font-black' 
                      : chronoPhase === 'finalizado' 
                      ? 'text-rose-400 font-black' 
                      : chronoPhase === 'descanso' 
                      ? 'text-amber-300 font-black' 
                      : 'text-slate-400'
                  }`}>
                    {chronoDisplay.phaseLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTONERA DE CONTROL DE PARTIDO */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            
            {/* 1. INICIO DE PARTIDO / 1ª PARTE (0' a 45' + descuento) */}
            <Button
              type="button"
              onClick={handleStartFirstHalf}
              size="sm"
              className={`h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-black cursor-pointer rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                chronoPhase === '1t' && isChronoRunning
                  ? 'bg-emerald-500 text-black font-black ring-2 ring-emerald-400/50 shadow-emerald-950/50'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title="Iniciar partido y 1ª parte desde el minuto 00:00"
            >
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Inicio 1T</span>
            </Button>

            {/* 2. FIN 1ª PARTE / DESCANSO */}
            <Button
              type="button"
              onClick={handleEndFirstHalf}
              size="sm"
              className={`h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-black cursor-pointer rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                chronoPhase === 'descanso'
                  ? 'bg-amber-500 text-black font-black ring-2 ring-amber-400/50 shadow-amber-950/50'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
              title="Parar al final de la 1ª parte (Descanso)"
            >
              <Pause className="w-3.5 h-3.5 shrink-0" />
              <span>Fin 1T (Descanso)</span>
            </Button>

            {/* 3. INICIO 2ª PARTE (Empieza en minuto 45) */}
            <Button
              type="button"
              onClick={handleStartSecondHalf}
              size="sm"
              className={`h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-black cursor-pointer rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                chronoPhase === '2t' && isChronoRunning
                  ? 'bg-blue-500 text-white font-black ring-2 ring-blue-400/50 shadow-blue-950/50'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
              title="Iniciar segunda parte desde el minuto 45"
            >
              <Play className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Inicio 2T (45')</span>
            </Button>

            {/* 4. FINAL DEL PARTIDO */}
            <Button
              type="button"
              onClick={handleEndMatch}
              size="sm"
              className={`h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-black cursor-pointer rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                chronoPhase === 'finalizado'
                  ? 'bg-rose-500 text-white font-black ring-2 ring-rose-400/50 shadow-rose-950/50'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
              title="Finalizar el partido (Fin 2ª parte)"
            >
              <Square className="w-3.5 h-3.5 fill-current shrink-0" />
              <span>Final Partido</span>
            </Button>

            {/* PAUSA TEMPORAL / REANUDAR */}
            {(chronoPhase === '1t' || chronoPhase === '2t') && (
              <button
                type="button"
                onClick={handleTogglePause}
                className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border text-xs font-black cursor-pointer transition-all flex items-center gap-1 shadow-sm ${
                  isChronoRunning
                    ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/40'
                }`}
                title={isChronoRunning ? 'Pausar el tiempo por interrupción o lesión' : 'Reanudar el tiempo de juego'}
              >
                {isChronoRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span className="hidden sm:inline">{isChronoRunning ? 'Pausar' : 'Reanudar'}</span>
              </button>
            )}

            {/* BOTÓN DE REINICIO DE CRONO CONTEXTUAL (1T -> Minuto 0 / 2T -> Minuto 45) */}
            <Button
              type="button"
              onClick={handleRequestReset}
              size="sm"
              variant="outline"
              className={`h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-black cursor-pointer rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${
                (isSecondHalf && (chronoSeconds !== 45 * 60 || isChronoRunning)) ||
                (!isSecondHalf && (chronoSeconds > 0 || isChronoRunning || chronoPhase !== 'pre'))
                  ? 'border-rose-500/50 hover:border-rose-400 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 ring-1 ring-rose-500/30'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
              title={
                isSecondHalf
                  ? "Reiniciar 2ª parte al minuto 45:00 si se inició por error"
                  : "Reiniciar 1ª parte al minuto 00:00 si se inició por error"
              }
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{isSecondHalf ? "Reiniciar 2T (45')" : "Reiniciar 1T (0')"}</span>
            </Button>

            {/* AJUSTE FINO MANUAL (+1m / -1m / Reset) */}
            <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-xl border border-slate-800 shadow-inner">
              <button
                type="button"
                onClick={() => handleAdjustMinutes(-1)}
                className="h-7 px-1.5 text-[10px] font-bold text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer transition-colors"
                title="Restar 1 minuto"
              >
                -1'
              </button>
              <button
                type="button"
                onClick={() => handleAdjustMinutes(1)}
                className="h-7 px-1.5 text-[10px] font-bold text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer transition-colors"
                title="Sumar 1 minuto"
              >
                +1'
              </button>
              <button
                type="button"
                onClick={handleRequestReset}
                className="h-7 px-1.5 text-[10px] font-bold text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 cursor-pointer transition-colors"
                title={isSecondHalf ? "Reiniciar 2ª parte a 45:00" : "Reiniciar 1ª parte a 00:00"}
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

          </div>

        </div>

        {/* TEAM COLLECTIVE ACTIONS & LIVE STATUS BAR - Compact, space-saving for iPad */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-3 sm:px-4 py-1.5 sm:py-2 flex flex-col gap-1.5 shrink-0">
          
          {/* Row 1: 4 Quick Collective Action Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 w-full">
            
            {/* 1. Córner a Favor */}
            <div className="bg-sky-950/30 border border-sky-500/40 rounded-xl px-2.5 py-1 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Flag className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-black text-sky-200 uppercase tracking-wide truncate">
                  Córner Fav
                </span>
                <span className="text-sm sm:text-base font-black text-sky-300 font-mono">
                  {teamTotals.corners_favor}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('corners_favor', -1)}
                  className="h-7 w-7 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-750 flex items-center justify-center font-black text-xs cursor-pointer transition-all"
                  title="Restar córner favor"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('corners_favor', 1)}
                  className="h-7 px-2 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-95 text-black font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                  title="Sumar córner favor"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>+1</span>
                </button>
              </div>
            </div>

            {/* 2. Córner en Contra */}
            <div className="bg-rose-950/30 border border-rose-500/40 rounded-xl px-2.5 py-1 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-black text-rose-200 uppercase tracking-wide truncate">
                  Córner Cont
                </span>
                <span className="text-sm sm:text-base font-black text-rose-400 font-mono">
                  {teamTotals.corners_contra}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('corners_contra', -1)}
                  className="h-7 w-7 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-750 flex items-center justify-center font-black text-xs cursor-pointer transition-all"
                  title="Restar córner contra"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('corners_contra', 1)}
                  className="h-7 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                  title="Sumar córner contra"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>+1</span>
                </button>
              </div>
            </div>

            {/* 3. Falta a Favor */}
            <div className="bg-purple-950/30 border border-purple-500/40 rounded-xl px-2.5 py-1 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <Shield className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-black text-purple-200 uppercase tracking-wide truncate">
                  Falta Fav
                </span>
                <span className="text-sm sm:text-base font-black text-purple-300 font-mono">
                  {teamTotals.faltas_favor}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('faltas_favor', -1)}
                  className="h-7 w-7 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-750 flex items-center justify-center font-black text-xs cursor-pointer transition-all"
                  title="Restar falta favor"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('faltas_favor', 1)}
                  className="h-7 px-2 rounded-lg bg-purple-500 hover:bg-purple-400 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                  title="Sumar falta favor"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>+1</span>
                </button>
              </div>
            </div>

            {/* 4. Falta en Contra */}
            <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl px-2.5 py-1 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-black text-amber-200 uppercase tracking-wide truncate">
                  Falta Cont
                </span>
                <span className="text-sm sm:text-base font-black text-amber-300 font-mono">
                  {teamTotals.faltas_contra}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('faltas_contra', -1)}
                  className="h-7 w-7 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-750 flex items-center justify-center font-black text-xs cursor-pointer transition-all"
                  title="Restar falta contra"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('faltas_contra', 1)}
                  className="h-7 px-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                  title="Sumar falta contra"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>+1</span>
                </button>
              </div>
            </div>

          </div>

          {/* Row 2: Match Snapshot Badges */}
          <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-300 flex-wrap pt-0.5">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="bg-slate-900/90 px-2.5 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
                <Target className="w-3 h-3 text-emerald-400" />
                <span>Goles:</span>
                <strong className="text-emerald-400 font-mono font-black">{teamTotals.goles_favor}</strong>
                <span className="text-slate-600">-</span>
                <strong className="text-rose-400 font-mono font-black">{teamTotals.goles_contra}</strong>
              </span>

              <span className="bg-slate-900/90 px-2.5 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>Balones:</span>
                <strong className="text-cyan-300 font-mono font-bold">⚡{teamTotals.recuperaciones_balon}</strong>
                <span className="text-slate-600">|</span>
                <strong className="text-amber-400 font-mono font-bold">⚠️{teamTotals.perdidas_balon}</strong>
              </span>

              <span className="bg-slate-900/90 px-2.5 py-0.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-yellow-400" />
                <span>Tarjetas:</span>
                <strong className="text-yellow-400 font-mono font-bold">🟨{teamTotals.tarjetas_amarillas}</strong>
                <span className="text-slate-600">|</span>
                <strong className="text-rose-500 font-mono font-bold">🟥{teamTotals.tarjetas_rojas}</strong>
              </span>
            </div>

            {/* Quick Live indicator */}
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[10px]">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              <span>Directo iPad</span>
            </div>
          </div>

        </div>

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3 flex flex-col">
          
          {/* TAB 1: REGISTRO RÁPIDO EN DIRECTO (ADAPTADO AL IPAD) */}
          {activeTab === 'rapido' && (
            <div className="flex flex-col md:flex-row gap-2.5 sm:gap-3 h-full min-h-0 overflow-hidden">
              
              {/* LEFT PANEL: COMPLETE ROSTER SELECTOR (UNIFIED, NO 18-PLAYER CUTOFF) */}
              <div className="w-full md:w-64 lg:w-72 xl:w-80 shrink-0 flex flex-col h-[230px] md:h-full min-h-0 bg-slate-950/70 p-2 sm:p-2.5 rounded-2xl border border-slate-850 overflow-hidden">
                
                {/* Header with Title & Player Counter */}
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-850 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[11px] font-black uppercase text-white tracking-wider">
                      Plantilla
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800">
                    {filteredPlayerStats.length} {filteredPlayerStats.length === 1 ? 'jugadora' : 'jugadoras'}
                  </span>
                </div>

                {/* Filter Pills: Todas / Convocadas / Con Eventos */}
                <div className="pt-2 pb-1 shrink-0 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRosterFilter('todas')}
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all cursor-pointer text-center ${
                      rosterFilter === 'todas'
                        ? 'bg-cyan-500 text-black shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Todas ({playerStats.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterFilter('convocadas')}
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all cursor-pointer text-center ${
                      rosterFilter === 'convocadas'
                        ? 'bg-cyan-500 text-black shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Conv. ({convocadasCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterFilter('con_eventos')}
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all cursor-pointer text-center ${
                      rosterFilter === 'con_eventos'
                        ? 'bg-cyan-500 text-black shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    Activas ({activeCount})
                  </button>
                </div>

                {/* Search Input */}
                <div className="pb-2 shrink-0">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      placeholder="Buscar por dorsal o nombre..."
                      className="w-full pl-8 pr-2 py-1 h-7.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    {playerSearch && (
                      <button
                        type="button"
                        onClick={() => setPlayerSearch('')}
                        className="absolute right-2 top-1.5 text-slate-500 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* SCROLLABLE PLAYER LIST - Renders EVERY player with no truncation */}
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 overscroll-contain">
                  {filteredPlayerStats.map((p) => {
                    const isSelected = p.playerId === selectedPlayer?.playerId;
                    const totalEvents = (p.goles_metidos || 0) + (p.asistencias || 0) + (p.recuperaciones_balon || 0);

                    return (
                      <button
                        key={p.playerId}
                        onClick={() => setSelectedPlayerId(p.playerId)}
                        className={`w-full min-h-[44px] px-2.5 py-1.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                          isSelected 
                            ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-md ring-2 ring-cyan-400/40' 
                            : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Dorsal */}
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                            isSelected ? 'bg-cyan-400 text-black font-mono' : 'bg-slate-800 text-slate-200 font-mono'
                          }`}>
                            #{p.dorsal || '-'}
                          </span>
                          
                          {/* Name and Position */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="font-extrabold text-xs text-white truncate max-w-[110px] sm:max-w-[140px] leading-tight">
                                {p.nombre} {p.apellidos}
                              </span>
                              {p.isConvocada && (
                                <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-black uppercase shrink-0">
                                  Conv
                                </span>
                              )}
                              {p.titular ? (
                                <span className="text-[8px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1 py-0.2 rounded font-black uppercase shrink-0">
                                  TIT
                                </span>
                              ) : p.suplente ? (
                                <span className="text-[8px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-black uppercase shrink-0">
                                  SUP
                                </span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[9px] font-bold uppercase text-slate-400 truncate leading-none">
                                {p.posicionActiva || p.posicion} • {p.minutos ?? 0}'
                              </span>
                              {p.stats_por_posicion && Object.keys(p.stats_por_posicion).length > 1 && (
                                <span className="text-[8px] bg-cyan-950 text-cyan-400 border border-cyan-500/40 px-1 py-0.2 rounded font-black shrink-0">
                                  {Object.keys(p.stats_por_posicion).length} pos
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Live Badges for quick view on iPad */}
                        <div className="flex items-center gap-1 text-[9px] font-black shrink-0">
                          {(p.goles_metidos || 0) > 0 && (
                            <span className="bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 px-1 py-0.5 rounded leading-none">
                              ⚽{p.goles_metidos}
                            </span>
                          )}
                          {(p.asistencias || 0) > 0 && (
                            <span className="bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 px-1 py-0.5 rounded leading-none">
                              🎯{p.asistencias}
                            </span>
                          )}
                          {(p.recuperaciones_balon || 0) > 0 && (
                            <span className="bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 px-1 py-0.5 rounded leading-none">
                              ⚡{p.recuperaciones_balon}
                            </span>
                          )}
                          {(p.tarjetas_amarillas || 0) > 0 && (
                            <span className="bg-amber-500/30 text-amber-300 border border-amber-500/50 px-1 py-0.5 rounded leading-none">
                              🟨{p.tarjetas_amarillas}
                            </span>
                          )}
                          {(p.tarjetas_rojas || 0) > 0 && (
                            <span className="bg-red-500/30 text-red-300 border border-red-500/50 px-1 py-0.5 rounded leading-none">
                              🟥
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {filteredPlayerStats.length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1.5">
                      <Users className="w-6 h-6 opacity-40" />
                      <p className="font-bold">No hay jugadoras con ese filtro</p>
                      {rosterFilter !== 'todas' && (
                        <button
                          type="button"
                          onClick={() => { setRosterFilter('todas'); setPlayerSearch(''); }}
                          className="text-[11px] text-cyan-400 hover:underline font-bold"
                        >
                          Ver todas las jugadoras
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer status */}
                <div className="pt-2 border-t border-slate-850/80 text-[10px] text-slate-500 flex items-center justify-between shrink-0">
                  <span>Plantilla: {playerStats.length} jugadoras</span>
                  {rosterFilter !== 'todas' && (
                    <button
                      type="button"
                      onClick={() => setRosterFilter('todas')}
                      className="text-cyan-400 font-bold hover:underline"
                    >
                      Mostrar todas
                    </button>
                  )}
                </div>

              </div>

              {/* RIGHT PANEL: SELECTED PLAYER DETAILS + HIGH-RESPONSIVE STATS KEYPAD */}
              {selectedPlayer ? (() => {
                const activePos = selectedPlayer.posicionActiva || getDefaultCampoPosition(selectedPlayer.posicion);
                const currentPosStats = selectedPlayer.stats_por_posicion?.[activePos] || {};
                const posMinutos = currentPosStats.minutos ?? 0;
                const recordedPositions = Object.keys(selectedPlayer.stats_por_posicion || {});
                const hasMultiplePositions = recordedPositions.length > 1;

                return (
                  <div className="flex-1 min-w-0 flex flex-col h-full min-h-0 gap-2.5 overflow-y-auto pr-1">
                    
                    {/* Selected Player Profile Card (Generous, Touch-Safe on iPad) */}
                    <div className="bg-gradient-to-r from-slate-950 via-[#0a1526] to-slate-950 border border-cyan-500/40 p-3 sm:p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md">
                      {/* 1. Player Identity */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-black text-cyan-300 text-lg font-mono shrink-0 shadow-inner">
                          #{selectedPlayer.dorsal || '-'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">
                              Jugadora en Seguimiento
                            </span>
                            <span className="text-[10px] font-extrabold text-slate-300 uppercase bg-slate-800 px-2 py-0.5 rounded-md">
                              {selectedPlayer.posicion}
                            </span>
                            {selectedPlayer.isConvocada && (
                              <span className="text-[9px] font-black text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.2 rounded">
                                ✓ Convocada
                              </span>
                            )}
                            {selectedPlayer.titular ? (
                              <span className="text-[9px] font-black text-blue-300 uppercase bg-blue-950/80 border border-blue-600/60 px-1.5 py-0.2 rounded flex items-center gap-0.5 shadow-xs">
                                <span>★</span>
                                <span>Titular</span>
                              </span>
                            ) : selectedPlayer.suplente ? (
                              <span className="text-[9px] font-black text-amber-300 uppercase bg-amber-950/80 border border-amber-600/60 px-1.5 py-0.2 rounded flex items-center gap-0.5 shadow-xs">
                                <span>🔄</span>
                                <span>Suplente</span>
                              </span>
                            ) : null}
                          </div>
                          <h4 className="font-extrabold text-base sm:text-lg text-white leading-tight mt-0.5">
                            {selectedPlayer.nombre} {selectedPlayer.apellidos}
                          </h4>
                        </div>
                      </div>

                      {/* 2. POSITION DROPDOWN SELECTOR (Modern Convocatoria Official Theme) */}
                      <div className="flex-1 min-w-[240px] max-w-sm bg-gradient-to-r from-[#0B1528] via-slate-900 to-[#0B1528] border border-cyan-500/50 hover:border-cyan-400 rounded-xl p-2 sm:px-3 sm:py-2 shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-300">
                            <Compass className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
                            <span>Posición en Campo</span>
                          </div>
                          {hasMultiplePositions && (
                            <span className="text-[9px] font-bold text-cyan-300 bg-cyan-950/90 border border-cyan-500/40 px-1.5 py-0.2 rounded-full">
                              {recordedPositions.length} posiciones
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <select
                            value={activePos}
                            onChange={(e) => handlePositionChange(selectedPlayer.playerId, e.target.value)}
                            className="w-full bg-slate-950/95 text-white font-extrabold text-xs sm:text-sm py-1.5 pl-2.5 pr-8 rounded-lg border border-cyan-500/60 hover:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 appearance-none cursor-pointer tracking-wide shadow-inner"
                          >
                            <optgroup label="Portería" className="bg-slate-900 text-slate-300 font-bold">
                              <option value="Portero" className="bg-slate-950 text-white py-1">🧤 Portero</option>
                            </optgroup>
                            <optgroup label="Defensa" className="bg-slate-900 text-slate-300 font-bold">
                              <option value="Central Diestro" className="bg-slate-950 text-white py-1">🛡️ Central Diestro</option>
                              <option value="Central Zurdo" className="bg-slate-950 text-white py-1">🛡️ Central Zurdo</option>
                              <option value="Lateral Derecho" className="bg-slate-950 text-white py-1">🏃 Lateral Derecho</option>
                              <option value="Lateral Izquierdo" className="bg-slate-950 text-white py-1">🏃 Lateral Izquierdo</option>
                            </optgroup>
                            <optgroup label="Mediocampo" className="bg-slate-900 text-slate-300 font-bold">
                              <option value="Medio Centro" className="bg-slate-950 text-white py-1">🧠 Medio Centro</option>
                              <option value="Interior Derecha" className="bg-slate-950 text-white py-1">⚡ Interior Derecha</option>
                              <option value="Interior Izquierda" className="bg-slate-950 text-white py-1">⚡ Interior Izquierda</option>
                            </optgroup>
                            <optgroup label="Delantera / Extremos" className="bg-slate-900 text-slate-300 font-bold">
                              <option value="Extremo Derecha" className="bg-slate-950 text-white py-1">🚀 Extremo Derecha</option>
                              <option value="Extremo Izquierda" className="bg-slate-950 text-white py-1">🚀 Extremo Izquierda</option>
                              <option value="Delantero" className="bg-slate-950 text-white py-1">🎯 Delantero</option>
                            </optgroup>
                          </select>
                          <ChevronDown className="w-4 h-4 text-cyan-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium mt-1">
                          <span className="truncate">Registrando para:</span>
                          <span className="font-black text-cyan-300 truncate ml-1">{activePos}</span>
                        </div>
                      </div>

                      {/* 3. Minutes & Balance Badges */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        {/* Minutes in Active Position */}
                        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl px-3 py-1.5 text-center min-w-[115px]">
                          <div className="flex items-center justify-center gap-1 text-[9px] font-bold text-slate-300 uppercase">
                            <Clock className="w-3 h-3 text-cyan-400" />
                            <span className="truncate">Minutos ({activePos.split(' ')[0]})</span>
                          </div>
                          <div className="flex items-center justify-center gap-1.5 mt-0.5">
                            <button
                              type="button"
                              onClick={() => adjustPositionMinutes(selectedPlayer.playerId, -5)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center justify-center cursor-pointer font-bold"
                              title="Restar 5 min a esta posición"
                            >
                              -
                            </button>
                            <span className="text-sm font-black text-cyan-300 font-mono">
                              {posMinutos}'
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustPositionMinutes(selectedPlayer.playerId, 5)}
                              className="w-5 h-5 rounded bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-black flex items-center justify-center cursor-pointer"
                              title="Sumar 5 min a esta posición"
                            >
                              +
                            </button>
                          </div>
                          {hasMultiplePositions && (
                            <span className="text-[9px] text-slate-400 block font-mono">
                              Total: {selectedPlayer.minutos ?? 0}'
                            </span>
                          )}
                        </div>

                        {/* Balance */}
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-center min-w-[95px]">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Balance Balones</span>
                          <span className={`text-sm font-black font-mono ${
                            ((selectedPlayer.recuperaciones_balon || 0) - (selectedPlayer.perdidas_balon || 0)) >= 0 
                              ? 'text-cyan-400' 
                              : 'text-amber-400'
                          }`}>
                            {((selectedPlayer.recuperaciones_balon || 0) - (selectedPlayer.perdidas_balon || 0)) > 0 ? '+' : ''}
                            {(selectedPlayer.recuperaciones_balon || 0) - (selectedPlayer.perdidas_balon || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 10-KEYPAD ACTION CARDS GRID - Fully Responsive for iPad Portrait & Landscape */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5">
                      
                      {/* 1. Gol a Favor ⚽ */}
                      <div className="bg-emerald-950/40 border border-emerald-500/40 hover:border-emerald-500/70 p-2.5 rounded-xl flex flex-col justify-between gap-1.5 shadow-sm transition-colors">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black">
                            <Target className="w-4 h-4 shrink-0" />
                            <span className="truncate">Gol a Favor</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-emerald-300 font-mono">
                              {currentPosStats.goles_metidos || 0}
                            </span>
                            {hasMultiplePositions && (selectedPlayer.goles_metidos || 0) !== (currentPosStats.goles_metidos || 0) && (
                              <span className="block text-[9px] text-slate-400 font-mono leading-none">
                                Total: {selectedPlayer.goles_metidos || 0}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_metidos', -1)}
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 active:scale-95 font-black cursor-pointer rounded-lg shrink-0"
                            title="Restar 1 gol en esta posición"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_metidos', 1)}
                            size="sm"
                            className="h-9 flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1.5"
                          >
                            <Plus className="w-4 h-4 shrink-0" /> <span>+1 Gol ({activePos.split(' ')[0]})</span>
                          </Button>
                        </div>
                      </div>

                      {/* 2. Asistencia de Gol 🎯 */}
                      <div className="bg-indigo-950/40 border border-indigo-500/40 hover:border-indigo-500/70 p-2.5 rounded-xl flex flex-col justify-between gap-1.5 shadow-sm transition-colors">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-black">
                            <Award className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="truncate">Asistencia</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-indigo-300 font-mono">
                              {currentPosStats.asistencias || 0}
                            </span>
                            {hasMultiplePositions && (selectedPlayer.asistencias || 0) !== (currentPosStats.asistencias || 0) && (
                              <span className="block text-[9px] text-slate-400 font-mono leading-none">
                                Total: {selectedPlayer.asistencias || 0}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'asistencias', -1)}
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20 active:scale-95 font-black cursor-pointer rounded-lg shrink-0"
                            title="Restar 1 asistencia en esta posición"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'asistencias', 1)}
                            size="sm"
                            className="h-9 flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1.5"
                          >
                            <Plus className="w-4 h-4 shrink-0" /> <span>+1 Asist</span>
                          </Button>
                        </div>
                      </div>

                      {/* 3. Gol en Contra / Encajado 🥅 */}
                      <div className="bg-rose-950/40 border border-rose-500/40 hover:border-rose-500/70 p-2.5 rounded-xl flex flex-col justify-between gap-1.5 shadow-sm transition-colors">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-black">
                            <ShieldAlert className="w-4 h-4 shrink-0" />
                            <span className="truncate">Gol Encajado</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-rose-300 font-mono">
                              {currentPosStats.goles_encajados || 0}
                            </span>
                            {hasMultiplePositions && (selectedPlayer.goles_encajados || 0) !== (currentPosStats.goles_encajados || 0) && (
                              <span className="block text-[9px] text-slate-400 font-mono leading-none">
                                Total: {selectedPlayer.goles_encajados || 0}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_encajados', -1)}
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 border-rose-500/40 text-rose-300 hover:bg-rose-500/20 active:scale-95 font-black cursor-pointer rounded-lg shrink-0"
                            title="Restar 1 gol encajado"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_encajados', 1)}
                            size="sm"
                            className="h-9 flex-1 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1.5"
                          >
                            <Plus className="w-4 h-4 shrink-0" /> <span>+1 Encaj</span>
                          </Button>
                        </div>
                      </div>

                      {/* 4. Recuperaciones de Balón ⚡ */}
                      <div className="bg-cyan-950/40 border border-cyan-500/40 hover:border-cyan-500/70 p-2.5 rounded-xl flex flex-col justify-between gap-1.5 shadow-sm transition-colors">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-black">
                            <Zap className="w-4 h-4 shrink-0" />
                            <span className="truncate">Recuperación</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-cyan-300 font-mono">
                              {currentPosStats.recuperaciones_balon || 0}
                            </span>
                            {hasMultiplePositions && (selectedPlayer.recuperaciones_balon || 0) !== (currentPosStats.recuperaciones_balon || 0) && (
                              <span className="block text-[9px] text-slate-400 font-mono leading-none">
                                Total: {selectedPlayer.recuperaciones_balon || 0}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'recuperaciones_balon', -1)}
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 active:scale-95 font-black cursor-pointer rounded-lg shrink-0"
                            title="Restar 1 recuperación"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'recuperaciones_balon', 1)}
                            size="sm"
                            className="h-9 flex-1 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1.5"
                          >
                            <Plus className="w-4 h-4 shrink-0" /> <span>+1 Recup</span>
                          </Button>
                        </div>
                      </div>

                      {/* 5. Pérdidas de Balón ⚠️ */}
                      <div className="bg-amber-950/40 border border-amber-500/40 hover:border-amber-500/70 p-2.5 rounded-xl flex flex-col justify-between gap-1.5 shadow-sm transition-colors">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span className="truncate">Pérdida Balón</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-amber-300 font-mono">
                              {currentPosStats.perdidas_balon || 0}
                            </span>
                            {hasMultiplePositions && (selectedPlayer.perdidas_balon || 0) !== (currentPosStats.perdidas_balon || 0) && (
                              <span className="block text-[9px] text-slate-400 font-mono leading-none">
                                Total: {selectedPlayer.perdidas_balon || 0}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'perdidas_balon', -1)}
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 active:scale-95 font-black cursor-pointer rounded-lg shrink-0"
                            title="Restar 1 pérdida"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'perdidas_balon', 1)}
                            size="sm"
                            className="h-9 flex-1 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1.5"
                          >
                            <Plus className="w-4 h-4 shrink-0" /> <span>+1 Pérdida</span>
                          </Button>
                        </div>
                      </div>

                      {/* 6. Tarjeta Amarilla 🟨 */}
                      <div className="bg-yellow-950/40 border border-yellow-500/40 hover:border-yellow-500/70 p-2.5 rounded-xl flex flex-col justify-between gap-1.5 shadow-sm transition-colors">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-black">
                            <span className="w-3 h-4 bg-yellow-400 rounded-xs inline-block shadow-sm shrink-0" />
                            <span className="truncate">Amarilla</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-yellow-400 font-mono">
                              {currentPosStats.tarjetas_amarillas || 0}
                            </span>
                            {hasMultiplePositions && (selectedPlayer.tarjetas_amarillas || 0) !== (currentPosStats.tarjetas_amarillas || 0) && (
                              <span className="block text-[9px] text-slate-400 font-mono leading-none">
                                Total: {selectedPlayer.tarjetas_amarillas || 0}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'tarjetas_amarillas', -1)}
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/20 active:scale-95 font-black cursor-pointer rounded-lg shrink-0"
                            title="Restar 1 amarilla"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'tarjetas_amarillas', 1)}
                            size="sm"
                            className="h-9 flex-1 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1.5"
                          >
                            <Plus className="w-4 h-4 shrink-0" /> <span>+1 Amarilla</span>
                          </Button>
                        </div>
                      </div>

                      {/* 7. Tarjeta Roja 🟥 */}
                      <div className="bg-red-950/40 border border-red-500/40 hover:border-red-500/70 p-2.5 rounded-xl flex flex-col justify-between gap-1.5 shadow-sm transition-colors">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 text-red-400 text-xs font-black">
                            <span className="w-3 h-4 bg-red-600 rounded-xs inline-block shadow-sm shrink-0" />
                            <span className="truncate">Roja</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-red-400 font-mono">
                              {currentPosStats.tarjetas_rojas || 0}
                            </span>
                            {hasMultiplePositions && (selectedPlayer.tarjetas_rojas || 0) !== (currentPosStats.tarjetas_rojas || 0) && (
                              <span className="block text-[9px] text-slate-400 font-mono leading-none">
                                Total: {selectedPlayer.tarjetas_rojas || 0}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'tarjetas_rojas', -1)}
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 border-red-500/40 text-red-300 hover:bg-red-500/20 active:scale-95 font-black cursor-pointer rounded-lg shrink-0"
                            title="Restar 1 roja"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'tarjetas_rojas', 1)}
                            size="sm"
                            className="h-9 flex-1 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1.5"
                          >
                            <Plus className="w-4 h-4 shrink-0" /> <span>+1 Roja</span>
                          </Button>
                        </div>
                      </div>

                      {/* 8. Titular o Suplente ⭐ */}
                      <div className={`p-2.5 rounded-xl flex flex-col justify-between gap-1.5 shadow-sm transition-all border ${
                        selectedPlayer.titular 
                          ? 'bg-blue-950/40 border-blue-500/60 shadow-blue-950/30' 
                          : selectedPlayer.suplente 
                          ? 'bg-amber-950/30 border-amber-500/60 shadow-amber-950/30' 
                          : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                      }`}>
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-black">
                            <UserCheck className={`w-4 h-4 shrink-0 ${
                              selectedPlayer.titular ? 'text-blue-400' : selectedPlayer.suplente ? 'text-amber-400' : 'text-slate-400'
                            }`} />
                            <span className={`truncate ${
                              selectedPlayer.titular ? 'text-blue-300' : selectedPlayer.suplente ? 'text-amber-300' : 'text-slate-300'
                            }`}>
                              Titular / Suplente
                            </span>
                          </div>
                          <span className={`text-[11px] font-black uppercase font-mono px-2 py-0.5 rounded-md border tracking-wider ${
                            selectedPlayer.titular 
                              ? 'text-blue-300 bg-blue-900/60 border-blue-500/50' 
                              : selectedPlayer.suplente 
                              ? 'text-amber-300 bg-amber-900/60 border-amber-500/50' 
                              : 'text-slate-500 bg-slate-900 border-slate-800'
                          }`}>
                            {selectedPlayer.titular ? '★ TITULAR' : selectedPlayer.suplente ? '🔄 SUPLENTE' : 'SIN ASIGNAR'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            type="button"
                            onClick={() => setPlayerRole(selectedPlayer.playerId, 'titular')}
                            size="sm"
                            className={`h-9 flex-1 font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1.5 transition-all active:scale-95 border ${
                              selectedPlayer.titular
                                ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 ring-2 ring-blue-400/40 shadow-md'
                                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-750'
                            }`}
                            title={selectedPlayer.titular ? 'Pulsar para desmarcar' : 'Marcar como Titular'}
                          >
                            <span className="text-sm">★</span>
                            <span>Titular</span>
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setPlayerRole(selectedPlayer.playerId, 'suplente')}
                            size="sm"
                            className={`h-9 flex-1 font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1.5 transition-all active:scale-95 border ${
                              selectedPlayer.suplente
                                ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 ring-2 ring-amber-400/40 shadow-md'
                                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-750'
                            }`}
                            title={selectedPlayer.suplente ? 'Pulsar para desmarcar' : 'Marcar como Suplente'}
                          >
                            <span className="text-sm">🔄</span>
                            <span>Suplente</span>
                          </Button>
                        </div>
                      </div>

                    </div>

                    {/* TABLA / DESGLOSE POR POSICIONES EN EL PARTIDO (Estilo Convocatoria Oficial Moderno) */}
                    <div className="bg-gradient-to-br from-slate-950 via-[#0B1528] to-slate-950 border border-cyan-500/30 rounded-2xl p-3 sm:p-3.5 shadow-md flex flex-col gap-2 shrink-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h5 className="text-xs font-black uppercase text-white tracking-wide flex items-center gap-1.5">
                              <span>Estadísticas por Posición en el Campo</span>
                              <span className="text-[10px] text-cyan-400 font-bold font-mono">
                                ({selectedPlayer.nombre} #{selectedPlayer.dorsal})
                              </span>
                            </h5>
                            <p className="text-[10px] text-slate-400">
                              Las acciones se registran asociadas a la posición que la jugadora ocupa en cada momento
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-semibold">Posición actual:</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50">
                            📍 {activePos}
                          </span>
                        </div>
                      </div>

                      {/* Table of positions */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-[580px]">
                          <thead>
                            <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-850">
                              <th className="py-2 px-2.5">Posición Táctica</th>
                              <th className="py-2 px-2 text-center">Minutos</th>
                              <th className="py-2 px-2 text-center text-emerald-400">Goles</th>
                              <th className="py-2 px-2 text-center text-indigo-400">Asist.</th>
                              <th className="py-2 px-2 text-center text-rose-400">Encaj.</th>
                              <th className="py-2 px-2 text-center text-cyan-400">Recup.</th>
                              <th className="py-2 px-2 text-center text-amber-400">Pérdidas</th>
                              <th className="py-2 px-2 text-center text-yellow-400">Tarjetas (A/R)</th>
                              <th className="py-2 px-2 text-right">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900">
                            {recordedPositions.map((posKey) => {
                              const rec = selectedPlayer.stats_por_posicion?.[posKey] || {};
                              const isCurrentActive = posKey === activePos;

                              return (
                                <tr
                                  key={posKey}
                                  className={`transition-colors ${
                                    isCurrentActive 
                                      ? 'bg-cyan-950/40 font-bold border-l-2 border-l-cyan-400' 
                                      : 'hover:bg-slate-900/40'
                                  }`}
                                >
                                  <td className="py-2 px-2.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold text-white">{posKey}</span>
                                      {isCurrentActive && (
                                        <span className="text-[8px] font-black bg-cyan-500 text-black px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                                          Activa
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono font-black text-slate-200">
                                    {rec.minutos ?? 0}'
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono font-black text-emerald-300">
                                    {rec.goles_metidos ?? 0}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono font-black text-indigo-300">
                                    {rec.asistencias ?? 0}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono font-black text-rose-300">
                                    {rec.goles_encajados ?? 0}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono font-black text-cyan-300">
                                    {rec.recuperaciones_balon ?? 0}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono font-black text-amber-300">
                                    {rec.perdidas_balon ?? 0}
                                  </td>
                                  <td className="py-2 px-2 text-center font-mono text-slate-300">
                                    <span className="text-yellow-400">{rec.tarjetas_amarillas ?? 0}</span>
                                    <span className="text-slate-600 mx-0.5">/</span>
                                    <span className="text-red-400">{rec.tarjetas_rojas ?? 0}</span>
                                  </td>
                                  <td className="py-2 px-2 text-right">
                                    {!isCurrentActive ? (
                                      <button
                                        type="button"
                                        onClick={() => handlePositionChange(selectedPlayer.playerId, posKey)}
                                        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 hover:border-cyan-400 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                                      >
                                        Cambiar aquí
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-cyan-400 font-bold px-2 py-0.5">
                                        Registrando
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {recordedPositions.length > 1 && (
                            <tfoot>
                              <tr className="border-t border-slate-800 bg-slate-900/80 font-black text-white text-[11px]">
                                <td className="py-2 px-2.5 text-cyan-300 uppercase">
                                  Total Acumulado ({recordedPositions.length} posiciones)
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-cyan-300">
                                  {selectedPlayer.minutos ?? 0}'
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-emerald-400">
                                  {selectedPlayer.goles_metidos ?? 0}
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-indigo-400">
                                  {selectedPlayer.asistencias ?? 0}
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-rose-400">
                                  {selectedPlayer.goles_encajados ?? 0}
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-cyan-400">
                                  {selectedPlayer.recuperaciones_balon ?? 0}
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-amber-400">
                                  {selectedPlayer.perdidas_balon ?? 0}
                                </td>
                                <td className="py-2 px-2 text-center font-mono">
                                  <span className="text-yellow-400">{selectedPlayer.tarjetas_amarillas ?? 0}</span>
                                  <span className="text-slate-600 mx-0.5">/</span>
                                  <span className="text-red-400">{selectedPlayer.tarjetas_rojas ?? 0}</span>
                                </td>
                                <td className="py-2 px-2 text-right text-slate-400 text-[10px]">
                                  Global
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>

                    {/* RECENT FEED / CONFIRMATION TICKER (Ideal for iPad live coaches) */}
                    <div className="bg-slate-950/70 border border-slate-850 p-2.5 rounded-xl flex flex-col gap-1 shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>Últimas acciones registradas</span>
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {eventLogs.slice(0, 4).map((log) => (
                          <span
                            key={log.id}
                            className="text-[10px] font-semibold bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-md flex items-center gap-1 animate-in fade-in"
                          >
                            <span className="text-cyan-400 font-mono text-[9px]">{log.time}</span>
                            <span>{log.text}</span>
                          </span>
                        ))}
                        {eventLogs.length === 0 && (
                          <span className="text-[10px] text-slate-500 italic">
                            Pulsa sobre los botones + / - para registrar estadísticas en directo según la posición seleccionada
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })() : (
                <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-xs">
                  Selecciona una jugadora de la lista para registrar estadísticas
                </div>
              )}

            </div>
          )}

          {/* TAB 2: MATRIZ DE JUGADORAS (Planilla completa con scroll horizontal adaptado) */}
          {activeTab === 'matriz' && (
            <div className="space-y-3 h-full flex flex-col min-h-0">
              <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                    Planilla Completa de Estadísticas ({playerStats.length} Jugadoras)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Edita los minutos jugados y las métricas de todas las jugadoras del equipo
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRosterFilter('todas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      rosterFilter === 'todas' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Todas ({playerStats.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRosterFilter('convocadas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      rosterFilter === 'convocadas' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    Convocadas ({convocadasCount})
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead>
                    <tr className="bg-slate-950 text-[10px] font-black uppercase text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                      <th className="p-2.5">Dorsal</th>
                      <th className="p-2.5">Jugadora</th>
                      <th className="p-2.5">Posición</th>
                      <th className="p-2.5 text-center text-blue-400">Rol</th>
                      <th className="p-2.5 text-center">Minutos</th>
                      <th className="p-2.5 text-center text-emerald-400">Goles</th>
                      <th className="p-2.5 text-center text-indigo-400">Asist</th>
                      <th className="p-2.5 text-center text-rose-400">Encaj</th>
                      <th className="p-2.5 text-center text-cyan-400">Recup</th>
                      <th className="p-2.5 text-center text-amber-400">Pérdidas</th>
                      <th className="p-2.5 text-center text-yellow-400">Tarjetas (A/R)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {filteredPlayerStats.map((p) => (
                      <tr key={p.playerId} className="hover:bg-slate-850/40 transition-colors">
                        <td className="p-2.5 font-extrabold text-slate-200 font-mono">#{p.dorsal || '-'}</td>
                        <td className="p-2.5 font-bold text-white whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{p.nombre} {p.apellidos}</span>
                            {p.isConvocada && (
                              <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-black">
                                CONV
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase whitespace-nowrap">
                              {p.posicionActiva || p.posicion}
                            </span>
                            {p.stats_por_posicion && Object.keys(p.stats_por_posicion).length > 1 && (
                              <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 whitespace-nowrap">
                                {Object.keys(p.stats_por_posicion).length} pos
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="inline-flex rounded-lg border border-slate-800 p-0.5 bg-slate-950">
                            <button
                              type="button"
                              onClick={() => setPlayerRole(p.playerId, 'titular')}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer transition-all ${
                                p.titular
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                              title="Marcar o desmarcar como titular"
                            >
                              TIT
                            </button>
                            <button
                              type="button"
                              onClick={() => setPlayerRole(p.playerId, 'suplente')}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer transition-all ${
                                p.suplente
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                              title="Marcar o desmarcar como suplente"
                            >
                              SUP
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="0"
                            max="120"
                            value={p.minutos ?? 0}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setPlayerStats(prev => prev.map(s => s.playerId === p.playerId ? { ...s, minutos: val } : s));
                            }}
                            className="w-14 bg-slate-950 text-center font-bold text-white py-1 px-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'goles_metidos', -1)}
                              className="w-6 h-6 rounded bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer font-bold"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-black text-emerald-400">{p.goles_metidos || 0}</span>
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'goles_metidos', 1)}
                              className="w-6 h-6 rounded bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white flex items-center justify-center cursor-pointer font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'asistencias', -1)}
                              className="w-6 h-6 rounded bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer font-bold"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-black text-indigo-300">{p.asistencias || 0}</span>
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'asistencias', 1)}
                              className="w-6 h-6 rounded bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white flex items-center justify-center cursor-pointer font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'goles_encajados', -1)}
                              className="w-6 h-6 rounded bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer font-bold"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-black text-rose-400">{p.goles_encajados || 0}</span>
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'goles_encajados', 1)}
                              className="w-6 h-6 rounded bg-rose-600/30 text-rose-300 hover:bg-rose-600 hover:text-white flex items-center justify-center cursor-pointer font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'recuperaciones_balon', -1)}
                              className="w-6 h-6 rounded bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer font-bold"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-black text-cyan-300">{p.recuperaciones_balon || 0}</span>
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'recuperaciones_balon', 1)}
                              className="w-6 h-6 rounded bg-cyan-600/30 text-cyan-200 hover:bg-cyan-600 hover:text-black flex items-center justify-center cursor-pointer font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'perdidas_balon', -1)}
                              className="w-6 h-6 rounded bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer font-bold"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-black text-amber-300">{p.perdidas_balon || 0}</span>
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'perdidas_balon', 1)}
                              className="w-6 h-6 rounded bg-amber-600/30 text-amber-200 hover:bg-amber-600 hover:text-black flex items-center justify-center cursor-pointer font-bold"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <div className="flex items-center gap-0.5 bg-yellow-950/40 px-1 py-0.5 rounded border border-yellow-800/40">
                              <button
                                onClick={() => adjustPlayerStat(p.playerId, 'tarjetas_amarillas', -1)}
                                className="w-4 h-4 rounded text-slate-400 hover:text-white flex items-center justify-center cursor-pointer text-xs"
                              >
                                -
                              </button>
                              <span className="w-3 text-center font-black text-yellow-400 font-mono text-xs">{p.tarjetas_amarillas || 0}🟨</span>
                              <button
                                onClick={() => adjustPlayerStat(p.playerId, 'tarjetas_amarillas', 1)}
                                className="w-4 h-4 rounded text-yellow-400 hover:text-white flex items-center justify-center cursor-pointer text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-slate-600">/</span>
                            <div className="flex items-center gap-0.5 bg-red-950/40 px-1 py-0.5 rounded border border-red-800/40">
                              <button
                                onClick={() => adjustPlayerStat(p.playerId, 'tarjetas_rojas', -1)}
                                className="w-4 h-4 rounded text-slate-400 hover:text-white flex items-center justify-center cursor-pointer text-xs"
                              >
                                -
                              </button>
                              <span className="w-3 text-center font-black text-red-500 font-mono text-xs">{p.tarjetas_rojas || 0}🟥</span>
                              <button
                                onClick={() => adjustPlayerStat(p.playerId, 'tarjetas_rojas', 1)}
                                className="w-4 h-4 rounded text-red-500 hover:text-white flex items-center justify-center cursor-pointer text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TOTALES DE EQUIPO */}
          {activeTab === 'resumen' && (
            <div className="space-y-3 sm:space-y-4 overflow-y-auto p-1">
              
              {/* Tarjeta de Cronómetro Oficial y Estado de Juego */}
              <div className="bg-gradient-to-r from-slate-950 via-[#071324] to-slate-950 border border-cyan-500/30 p-3.5 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                      Cronómetro Oficial del Encuentro
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                        {chronoDisplay.mainTime}
                      </span>
                      {chronoDisplay.isExtraTime && chronoDisplay.extraTime && (
                        <span className="text-amber-400 font-black text-sm font-mono bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/50">
                          {chronoDisplay.extraTime}
                        </span>
                      )}
                      <span className="text-xs sm:text-sm font-black text-cyan-300 font-mono bg-slate-900 border border-cyan-500/40 px-2 py-0.5 rounded">
                        Minuto {chronoDisplay.matchMinuteStr}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      isChronoRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`} />
                    <span className="text-xs font-bold text-slate-300">
                      {chronoDisplay.phaseLabel}
                    </span>
                  </div>

                  <Button
                    type="button"
                    onClick={handleTogglePause}
                    size="sm"
                    className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer text-xs font-bold flex items-center gap-1.5"
                  >
                    {isChronoRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{isChronoRunning ? 'Pausar' : 'Reanudar'}</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleRequestReset}
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 rounded-xl border-rose-500/40 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 cursor-pointer text-xs font-bold flex items-center gap-1.5"
                    title={
                      isSecondHalf
                        ? "Reiniciar 2ª parte al minuto 45:00 si se inició por error"
                        : "Reiniciar 1ª parte al minuto 00:00 si se inició por error"
                    }
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                    <span>{isSecondHalf ? "Reiniciar 2T (45')" : "Reiniciar 1T (0')"}</span>
                  </Button>
                </div>
              </div>

              {/* Grid de Totales de Equipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              
              {/* Marcador Final y Ofensiva */}
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl space-y-3">
                <h5 className="font-extrabold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Marcador y Ofensiva</span>
                </h5>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Goles Favor</span>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => adjustTeamTotal('goles_favor', -1)}
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-black text-emerald-400 font-mono">{teamTotals.goles_favor}</span>
                      <Button
                        onClick={() => adjustTeamTotal('goles_favor', 1)}
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 cursor-pointer"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Asistencias</span>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => adjustTeamTotal('asistencias', -1)}
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-black text-indigo-300 font-mono">{teamTotals.asistencias || 0}</span>
                      <Button
                        onClick={() => adjustTeamTotal('asistencias', 1)}
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Goles Contra</span>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => adjustTeamTotal('goles_contra', -1)}
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg cursor-pointer"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-black text-rose-400 font-mono">{teamTotals.goles_contra}</span>
                      <Button
                        onClick={() => adjustTeamTotal('goles_contra', 1)}
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg bg-rose-600 hover:bg-rose-500 cursor-pointer"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saques de Esquina */}
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl space-y-3">
                <h5 className="font-extrabold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Flag className="w-4 h-4 text-sky-400" />
                  <span>Córners del Encuentro</span>
                </h5>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Córners a Favor</span>
                    <div className="flex items-center justify-center gap-2.5">
                      <Button
                        onClick={() => adjustTeamTotal('corners_favor', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-black text-sky-400 font-mono">{teamTotals.corners_favor}</span>
                      <Button
                        onClick={() => adjustTeamTotal('corners_favor', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-sky-600 hover:bg-sky-500 cursor-pointer"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Córners en Contra</span>
                    <div className="flex items-center justify-center gap-2.5">
                      <Button
                        onClick={() => adjustTeamTotal('corners_contra', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-black text-rose-400 font-mono">{teamTotals.corners_contra}</span>
                      <Button
                        onClick={() => adjustTeamTotal('corners_contra', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-rose-600 hover:bg-rose-500 cursor-pointer"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Faltas */}
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl space-y-3">
                <h5 className="font-extrabold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Faltas</span>
                </h5>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Faltas a Favor</span>
                    <div className="flex items-center justify-center gap-2.5">
                      <Button
                        onClick={() => adjustTeamTotal('faltas_favor', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-black text-purple-400 font-mono">{teamTotals.faltas_favor}</span>
                      <Button
                        onClick={() => adjustTeamTotal('faltas_favor', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-purple-600 hover:bg-purple-500 cursor-pointer"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Faltas en Contra</span>
                    <div className="flex items-center justify-center gap-2.5">
                      <Button
                        onClick={() => adjustTeamTotal('faltas_contra', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-black text-amber-400 font-mono">{teamTotals.faltas_contra}</span>
                      <Button
                        onClick={() => adjustTeamTotal('faltas_contra', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-amber-600 hover:bg-amber-500 cursor-pointer"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balones */}
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl space-y-3">
                <h5 className="font-extrabold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Posesión y Balones</span>
                </h5>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Recuperaciones</span>
                    <div className="flex items-center justify-center gap-2.5">
                      <Button
                        onClick={() => adjustTeamTotal('recuperaciones_balon', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-black text-cyan-300 font-mono">{teamTotals.recuperaciones_balon}</span>
                      <Button
                        onClick={() => adjustTeamTotal('recuperaciones_balon', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-cyan-600 hover:bg-cyan-500 cursor-pointer"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Pérdidas</span>
                    <div className="flex items-center justify-center gap-2.5">
                      <Button
                        onClick={() => adjustTeamTotal('perdidas_balon', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg cursor-pointer"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-black text-amber-300 font-mono">{teamTotals.perdidas_balon}</span>
                      <Button
                        onClick={() => adjustTeamTotal('perdidas_balon', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-amber-600 hover:bg-amber-500 cursor-pointer"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              </div>

              {/* Registro Completo de Eventos e Incidencias del Partido */}
              <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>Línea Temporal de Eventos Registrados ({eventLogs.length})</span>
                  </h5>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Orden cronológico inverso
                  </span>
                </div>

                {eventLogs.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-850/60 pr-1">
                    {eventLogs.map((log) => (
                      <div key={log.id} className="py-1.5 flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-mono font-black text-[10px] shrink-0">
                            {log.time}
                          </span>
                          <span className="text-slate-200 truncate">{log.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-2">
                    Aún no se han registrado eventos o incidencias durante el partido.
                  </p>
                )}
              </div>

            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-slate-950 border-t border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">Los datos se vuelcan directamente en el informe del partido y en <strong>Estadísticas</strong>.</span>
            <span className="sm:hidden">Sincroniza con Estadísticas</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-bold border-slate-800 text-slate-400 hover:bg-slate-800 rounded-xl h-9.5 px-3.5 cursor-pointer"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleSaveAndSync}
              className="text-xs font-black uppercase bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black rounded-xl h-9.5 px-4 shadow-lg shadow-cyan-950/40 gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Guardar y Volcar en Estadísticas</span>
            </Button>
          </div>
        </div>

      </div>

      {/* Modal de confirmación para reiniciar cronómetro (contextual 1T / 2T) */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title={isSecondHalf ? "¿Reiniciar 2ª Parte al minuto 45'?" : "¿Reiniciar 1ª Parte al minuto 0'?"}
        message={
          isSecondHalf
            ? "¿Seguro que deseas reiniciar la 2ª parte? El cronómetro volverá al minuto 45:00 y quedará pausado. Es ideal si se pulsó 'Inicio 2T' por error antes del comienzo real del segundo tiempo."
            : "¿Seguro que deseas reiniciar la 1ª parte? El cronómetro volverá a 00:00 y el estado a Pre-Partido (0'). Es ideal si se pulsó el botón de inicio sin querer antes de que comience el partido."
        }
        confirmText={isSecondHalf ? "Sí, reiniciar a 45:00" : "Sí, reiniciar a 00:00"}
        cancelText="Cancelar"
        variant="warning"
        onConfirm={() => executeResetChrono(isSecondHalf ? '2t' : '1t')}
        onClose={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
