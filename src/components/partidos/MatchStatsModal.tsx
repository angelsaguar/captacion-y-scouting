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
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface MatchPlayerStat {
  playerId: string;
  nombre: string;
  apellidos: string;
  dorsal: string;
  posicion: string;
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

      return {
        playerId: pIdStr,
        nombre: p.nombre || '',
        apellidos: p.apellidos || '',
        dorsal: p.dorsal || '',
        posicion: p.posicion || 'Campo',
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

  // Handler to adjust player stat
  const adjustPlayerStat = (playerId: string, category: StatCategory, delta: number) => {
    const targetPlayer = playerStats.find(p => p.playerId === playerId);
    if (!targetPlayer) return;

    const currentVal = Number(targetPlayer[category] || 0);
    const newVal = Math.max(0, currentVal + delta);
    if (newVal === currentVal && delta < 0) return;

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

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (delta > 0) {
      setEventLogs(logs => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: now,
          text: `+${delta} ${catNames[category]} (${targetPlayer.nombre} #${targetPlayer.dorsal})`,
          type: category
        },
        ...logs.slice(0, 15)
      ]);
    } else if (delta < 0 && currentVal > 0) {
      setEventLogs(logs => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: now,
          text: `${delta} ${catNames[category]} (${targetPlayer.nombre} #${targetPlayer.dorsal})`,
          type: category
        },
        ...logs.slice(0, 15)
      ]);
    }

    const nextStats = playerStats.map(p => {
      if (p.playerId !== playerId) return p;
      return { ...p, [category]: newVal };
    });

    setPlayerStats(nextStats);
    recalcTeamTotals(nextStats);
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

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (delta > 0) {
      setEventLogs(logs => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: now,
          text: `+1 ${teamCatNames[key] || key} (Equipo)`,
          type: key as any
        },
        ...logs.slice(0, 15)
      ]);
    } else if (delta < 0 && currentVal > 0) {
      setEventLogs(logs => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: now,
          text: `-1 ${teamCatNames[key] || key} (Equipo)`,
          type: key as any
        },
        ...logs.slice(0, 15)
      ]);
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
        totales_equipo: teamTotals
      }
    };

    onSaveMatch(updatedMatch);
    toast.success('¡Estadísticas guardadas y sincronizadas con el panel de Estadísticas!');
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
                            </div>
                            <span className="text-[9px] font-bold uppercase text-slate-400 block truncate leading-none mt-0.5">
                              {p.posicion} • {p.minutos ?? 0}'
                            </span>
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
              {selectedPlayer ? (
                <div className="flex-1 min-w-0 flex flex-col h-full min-h-0 gap-2.5 overflow-y-auto pr-1">
                  
                  {/* Selected Player Profile Card (Generous, Touch-Safe on iPad) */}
                  <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/40 p-3 sm:p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-black text-cyan-300 text-lg font-mono shrink-0">
                        #{selectedPlayer.dorsal || '-'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
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
                        </div>
                        <h4 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                          {selectedPlayer.nombre} {selectedPlayer.apellidos}
                        </h4>
                      </div>
                    </div>

                    {/* Quick Stats Badges for this Player */}
                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Minutos</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'minutos', -5)}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center justify-center cursor-pointer"
                            title="Restar 5 min"
                          >
                            -
                          </button>
                          <span className="text-sm font-black text-slate-100 font-mono">
                            {selectedPlayer.minutos ?? 0}'
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'minutos', 5)}
                            className="w-5 h-5 rounded bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold flex items-center justify-center cursor-pointer"
                            title="Sumar 5 min"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-1.5 text-center">
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
                        <span className="text-xl font-black text-emerald-300 font-mono">
                          {selectedPlayer.goles_metidos || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_metidos', -1)}
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20 active:scale-95 font-black cursor-pointer rounded-lg shrink-0"
                          title="Restar 1 gol"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_metidos', 1)}
                          size="sm"
                          className="h-9 flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1.5"
                        >
                          <Plus className="w-4 h-4 shrink-0" /> <span>+1 Gol</span>
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
                        <span className="text-xl font-black text-indigo-300 font-mono">
                          {selectedPlayer.asistencias || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'asistencias', -1)}
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0 border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/20 active:scale-95 font-black cursor-pointer rounded-lg shrink-0"
                          title="Restar 1 asistencia"
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
                        <span className="text-xl font-black text-rose-300 font-mono">
                          {selectedPlayer.goles_encajados || 0}
                        </span>
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
                        <span className="text-xl font-black text-cyan-300 font-mono">
                          {selectedPlayer.recuperaciones_balon || 0}
                        </span>
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
                        <span className="text-xl font-black text-amber-300 font-mono">
                          {selectedPlayer.perdidas_balon || 0}
                        </span>
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
                        <span className="text-xl font-black text-yellow-400 font-mono">
                          {selectedPlayer.tarjetas_amarillas || 0}
                        </span>
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
                        <span className="text-xl font-black text-red-400 font-mono">
                          {selectedPlayer.tarjetas_rojas || 0}
                        </span>
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

                    {/* 8. Falta Provocada 🛡️ */}
                    <div className="bg-purple-950/40 border border-purple-500/40 hover:border-purple-500/70 p-2.5 rounded-xl flex flex-col justify-between gap-1.5 shadow-sm transition-colors">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-purple-300 text-xs font-black">
                          <Shield className="w-4 h-4 shrink-0" />
                          <span className="truncate">Falta Provocada</span>
                        </div>
                        <span className="text-xl font-black text-purple-300 font-mono">
                          {selectedPlayer.faltas_favor || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'faltas_favor', -1)}
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 p-0 border-purple-500/40 text-purple-300 hover:bg-purple-500/20 active:scale-95 font-black cursor-pointer rounded-lg shrink-0"
                          title="Restar falta provocada"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'faltas_favor', 1)}
                          size="sm"
                          className="h-9 flex-1 bg-purple-500 hover:bg-purple-400 active:scale-95 text-white font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1.5"
                        >
                          <Plus className="w-4 h-4 shrink-0" /> <span>+1 Falta</span>
                        </Button>
                      </div>
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
                          Pulsa sobre los botones + / - para registrar estadísticas en directo
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
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
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                            {p.posicion}
                          </span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto p-1">
              
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
    </div>
  );
}
