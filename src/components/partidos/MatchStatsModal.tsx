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
  Users
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

  // Search filter in convocadas list
  const [playerSearch, setPlayerSearch] = useState<string>('');

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

  // Recent events log for visual feedback
  const [eventLogs, setEventLogs] = useState<{ id: string; time: string; text: string; type: string }[]>([]);

  // Initialize data on match open
  useEffect(() => {
    // 1. Get convocadas IDs
    const convocadasIds: string[] = match.convocatoria || [];

    // 2. Identify all relevant players (either in convocatoria or all roster if empty)
    let playersToInclude = allPlayers;
    if (convocadasIds.length > 0) {
      playersToInclude = allPlayers.filter(p => convocadasIds.includes(p.id));
      if (playersToInclude.length === 0) {
        playersToInclude = allPlayers;
      }
    }

    // 3. Existing match stats if previously saved
    const existingStats: MatchPlayerStat[] = match.estadisticas?.jugadoras_stats || [];
    const statsMap: Record<string, MatchPlayerStat> = {};
    existingStats.forEach(st => {
      statsMap[st.playerId] = st;
    });

    const initialPlayerStats: MatchPlayerStat[] = playersToInclude.map(p => {
      const existing = statsMap[p.id];
      return {
        playerId: p.id,
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
        faltas_contra: existing?.faltas_contra ?? 0
      };
    });

    setPlayerStats(initialPlayerStats);
    if (initialPlayerStats.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(initialPlayerStats[0].playerId);
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
      recuperaciones_balon: 'Recuperación de balón ⚡',
      perdidas_balon: 'Pérdida de balón ⚠️',
      tarjetas_amarillas: 'Tarjeta amarilla 🟨',
      tarjetas_rojas: 'Tarjeta roja 🟥',
      corners_favor: 'Córner a favor 🚩',
      corners_contra: 'Córner en contra 🚩',
      faltas_favor: 'Falta provocada (favor) 🛡️',
      faltas_contra: 'Falta cometida (contra) ⚠️',
      minutos: 'Minutos de juego ⏱️'
    };

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Add to recent event logs strictly once outside setState updater
    if (delta > 0) {
      setEventLogs(logs => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: now,
          text: `+1 ${catNames[category]} para ${targetPlayer.nombre} #${targetPlayer.dorsal}`,
          type: category
        },
        ...logs.slice(0, 24)
      ]);
    } else if (delta < 0 && currentVal > 0) {
      setEventLogs(logs => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: now,
          text: `-1 ${catNames[category]} para ${targetPlayer.nombre} #${targetPlayer.dorsal}`,
          type: category
        },
        ...logs.slice(0, 24)
      ]);
    }

    // Update player stats and recalc team totals
    const nextStats = playerStats.map(p => {
      if (p.playerId !== playerId) return p;
      return { ...p, [category]: newVal };
    });

    setPlayerStats(nextStats);
    recalcTeamTotals(nextStats);
  };

  // Team totals direct adjustment (for match general counters and collective events)
  const adjustTeamTotal = (key: keyof MatchTotals, delta: number) => {
    const currentVal = teamTotals[key] || 0;
    const newVal = Math.max(0, currentVal + delta);
    if (newVal === currentVal && delta < 0) return;

    const teamCatNames: Record<string, string> = {
      corners_favor: 'Córner a favor 🚩',
      corners_contra: 'Córner en contra 🚩',
      faltas_favor: 'Falta provocada (favor) 🛡️',
      faltas_contra: 'Falta cometida (contra) ⚠️',
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
        ...logs.slice(0, 24)
      ]);
    } else if (delta < 0 && currentVal > 0) {
      setEventLogs(logs => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          time: now,
          text: `-1 ${teamCatNames[key] || key} (Equipo)`,
          type: key as any
        },
        ...logs.slice(0, 24)
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

  const filteredPlayerStats = useMemo(() => {
    if (!playerSearch.trim()) return playerStats;
    const q = playerSearch.toLowerCase().trim();
    return playerStats.filter(p => 
      p.nombre.toLowerCase().includes(q) || 
      p.apellidos.toLowerCase().includes(q) || 
      (p.dorsal && p.dorsal.toString().includes(q)) ||
      (p.posicion && p.posicion.toLowerCase().includes(q))
    );
  }, [playerStats, playerSearch]);

  const maxPerBox = 9;
  const leftSquadPlayers = filteredPlayerStats.slice(0, maxPerBox);
  const rightSquadPlayers = filteredPlayerStats.slice(maxPerBox, maxPerBox * 2);

  const selectedPlayer = playerStats.find(p => p.playerId === selectedPlayerId) || playerStats[0];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-1 sm:p-2.5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-[98vw] xl:max-w-7xl 2xl:max-w-[1440px] h-[94vh] max-h-[940px] flex flex-col shadow-2xl overflow-hidden text-left">
        
        {/* HEADER BAR */}
        <div className="bg-slate-950/95 border-b border-slate-800 px-3.5 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800">
                  Toma de Estadísticas en Vivo
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">
                  {match.fecha} • {match.hora}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span className="truncate max-w-[180px] sm:max-w-none">{match.tipo === 'Local' ? teamName : match.rival}</span>
                <span className="text-cyan-400 font-mono px-2 py-0.5 bg-slate-900 rounded-md border border-slate-800 text-xs sm:text-sm">
                  {teamTotals.goles_favor} - {teamTotals.goles_contra}
                </span>
                <span className="truncate max-w-[180px] sm:max-w-none">{match.tipo === 'Local' ? match.rival : teamName}</span>
              </h3>
            </div>
          </div>

          {/* TAB BUTTONS */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('rapido')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'rapido'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Registro Rápido</span>
            </button>

            <button
              onClick={() => setActiveTab('matriz')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'matriz'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ListOrdered className="w-3 h-3" />
              <span>Matriz Jugadoras</span>
            </button>

            <button
              onClick={() => setActiveTab('resumen')}
              className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                activeTab === 'resumen'
                  ? 'bg-cyan-500 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>Totales Equipo</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TEAM COLLECTIVE ACTIONS & LIVE STATUS BAR */}
        <div className="bg-slate-950/95 border-b border-slate-800 px-3.5 sm:px-4 py-2.5 flex flex-col gap-2 shrink-0">
          
          {/* Top Row: 4 Dedicated Team Collective Action Cards (Córners y Faltas) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 w-full">
            
            {/* 1. Córner a Favor */}
            <div className="bg-sky-950/40 border border-sky-500/40 hover:border-sky-500/70 rounded-xl p-2 flex flex-col justify-between gap-1.5 shadow-sm transition-all">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Flag className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="text-[11px] font-black text-sky-200 uppercase tracking-wide truncate">
                    Córner a Favor
                  </span>
                </div>
                <span className="text-base sm:text-lg font-black text-sky-300 font-mono leading-none">
                  {teamTotals.corners_favor}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('corners_favor', -1)}
                  className="h-7 w-8 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-750 flex items-center justify-center font-black text-xs cursor-pointer transition-all shrink-0"
                  title="Restar 1 córner a favor"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('corners_favor', 1)}
                  className="h-7 flex-1 rounded-lg bg-sky-500 hover:bg-sky-400 active:scale-95 text-black font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                  title="Sumar 1 córner a favor"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>+1 Córner</span>
                </button>
              </div>
            </div>

            {/* 2. Córner en Contra */}
            <div className="bg-rose-950/40 border border-rose-500/40 hover:border-rose-500/70 rounded-xl p-2 flex flex-col justify-between gap-1.5 shadow-sm transition-all">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="text-[11px] font-black text-slate-200 uppercase tracking-wide truncate">
                    Córner en Contra
                  </span>
                </div>
                <span className="text-base sm:text-lg font-black text-rose-400 font-mono leading-none">
                  {teamTotals.corners_contra}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('corners_contra', -1)}
                  className="h-7 w-8 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-750 flex items-center justify-center font-black text-xs cursor-pointer transition-all shrink-0"
                  title="Restar 1 córner en contra"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('corners_contra', 1)}
                  className="h-7 flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                  title="Sumar 1 córner en contra"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>+1 Córner</span>
                </button>
              </div>
            </div>

            {/* 3. Falta a Favor */}
            <div className="bg-purple-950/40 border border-purple-500/40 hover:border-purple-500/70 rounded-xl p-2 flex flex-col justify-between gap-1.5 shadow-sm transition-all">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Shield className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                  <span className="text-[11px] font-black text-purple-200 uppercase tracking-wide truncate">
                    Falta a Favor
                  </span>
                </div>
                <span className="text-base sm:text-lg font-black text-purple-300 font-mono leading-none">
                  {teamTotals.faltas_favor}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('faltas_favor', -1)}
                  className="h-7 w-8 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-750 flex items-center justify-center font-black text-xs cursor-pointer transition-all shrink-0"
                  title="Restar 1 falta a favor"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('faltas_favor', 1)}
                  className="h-7 flex-1 rounded-lg bg-purple-500 hover:bg-purple-400 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                  title="Sumar 1 falta a favor"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>+1 Falta</span>
                </button>
              </div>
            </div>

            {/* 4. Falta en Contra */}
            <div className="bg-amber-950/40 border border-amber-500/40 hover:border-amber-500/70 rounded-xl p-2 flex flex-col justify-between gap-1.5 shadow-sm transition-all">
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-black text-amber-200 uppercase tracking-wide truncate">
                    Falta en Contra
                  </span>
                </div>
                <span className="text-base sm:text-lg font-black text-amber-300 font-mono leading-none">
                  {teamTotals.faltas_contra}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('faltas_contra', -1)}
                  className="h-7 w-8 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 border border-slate-750 flex items-center justify-center font-black text-xs cursor-pointer transition-all shrink-0"
                  title="Restar 1 falta en contra"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => adjustTeamTotal('faltas_contra', 1)}
                  className="h-7 flex-1 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                  title="Sumar 1 falta en contra"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>+1 Falta</span>
                </button>
              </div>
            </div>

          </div>

          {/* Bottom Row: Quick Summary Stats Badges (Goles, Balones, Tarjetas) */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-850/80 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap w-full justify-between">
              
              {/* Goles Totales */}
              <div className="bg-slate-900/80 rounded-xl py-1 px-3 border border-slate-800 flex items-center gap-2 text-xs shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-400" />
                  <span>Goles:</span>
                </span>
                <span className="text-slate-300 font-medium">
                  A Favor: <strong className="text-emerald-400 font-mono font-black text-sm">{teamTotals.goles_favor}</strong>
                </span>
                <span className="text-slate-700 font-bold">|</span>
                <span className="text-slate-300 font-medium">
                  En Contra: <strong className="text-rose-400 font-mono font-black text-sm">{teamTotals.goles_contra}</strong>
                </span>
              </div>

              {/* Balones Totales */}
              <div className="bg-slate-900/80 rounded-xl py-1 px-3 border border-slate-800 flex items-center gap-2 text-xs shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span>Balones:</span>
                </span>
                <span className="text-slate-300 font-medium">
                  Recuperados: <strong className="text-cyan-300 font-mono font-black text-sm">{teamTotals.recuperaciones_balon}</strong>
                </span>
                <span className="text-slate-700 font-bold">|</span>
                <span className="text-slate-300 font-medium">
                  Perdidos: <strong className="text-amber-400 font-mono font-black text-sm">{teamTotals.perdidas_balon}</strong>
                </span>
              </div>

              {/* Tarjetas Totales */}
              <div className="bg-slate-900/80 rounded-xl py-1 px-3 border border-slate-800 flex items-center gap-2 text-xs shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  <span>Tarjetas:</span>
                </span>
                <span className="text-slate-300 font-medium">
                  Amarillas: <strong className="text-yellow-400 font-mono font-black text-sm">{teamTotals.tarjetas_amarillas}</strong>
                </span>
                <span className="text-slate-700 font-bold">|</span>
                <span className="text-slate-300 font-medium">
                  Rojas: <strong className="text-rose-500 font-mono font-black text-sm">{teamTotals.tarjetas_rojas}</strong>
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3 flex flex-col">
          
          {/* TAB 1: REGISTRO RÁPIDO EN DIRECTO (TODO VISIBLE EN 1 PANTALLA) */}
          {activeTab === 'rapido' && (
            <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3 h-full min-h-0 overflow-hidden">
              
              {/* Left Column: Player Selector list (Grupo 1 - Jugadoras 1 a 9) */}
              <div className="w-full lg:w-56 xl:w-64 shrink-0 flex flex-col h-full min-h-0 bg-slate-950/60 p-2 rounded-2xl border border-slate-850 overflow-hidden">
                <div className="flex items-center justify-between pb-1 border-b border-slate-850 shrink-0">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <Users className="w-3 h-3 text-cyan-400" />
                    <span>Convocadas (1 - {Math.min(maxPerBox, leftSquadPlayers.length)})</span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-500">Total: {filteredPlayerStats.length}</span>
                </div>

                {/* Quick Search Ultra-compact */}
                <div className="py-1 shrink-0">
                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-500 absolute left-2 top-1.5" />
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      placeholder="Buscar jugadora..."
                      className="w-full pl-6 pr-2 py-0.5 h-6 bg-slate-900/90 border border-slate-800 rounded-md text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Player List Group 1 (Fits 9 rows without scroll) */}
                <div className="flex-1 min-h-0 flex flex-col justify-between gap-0.5 overflow-hidden">
                  {leftSquadPlayers.map((p) => {
                    const isSelected = p.playerId === selectedPlayerId;
                    return (
                      <button
                        key={p.playerId}
                        onClick={() => setSelectedPlayerId(p.playerId)}
                        className={`w-full flex-1 min-h-[30px] max-h-[38px] px-2 py-1 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected 
                            ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500/30' 
                            : 'bg-slate-900/40 border-slate-850 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] shrink-0 ${
                            isSelected ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300'
                          }`}>
                            #{p.dorsal || '-'}
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-[11px] block text-white truncate max-w-[105px] leading-tight">
                              {p.nombre} {p.apellidos}
                            </span>
                            <span className="text-[8px] font-extrabold uppercase text-slate-500 block truncate leading-none">
                              {p.posicion}
                            </span>
                          </div>
                        </div>

                        {/* Quick Mini Badges */}
                        <div className="flex items-center gap-0.5 text-[8px] font-black shrink-0">
                          {(p.goles_metidos || 0) > 0 && (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0 rounded leading-tight">
                              ⚽{p.goles_metidos}
                            </span>
                          )}
                          {(p.asistencias || 0) > 0 && (
                            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 py-0 rounded leading-tight">
                              🎯{p.asistencias}
                            </span>
                          )}
                          {(p.recuperaciones_balon || 0) > 0 && (
                            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1 py-0 rounded leading-tight">
                              ⚡{p.recuperaciones_balon}
                            </span>
                          )}
                          {(p.tarjetas_amarillas || 0) > 0 && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-0.5 py-0 rounded leading-tight">
                              🟨
                            </span>
                          )}
                          {(p.tarjetas_rojas || 0) > 0 && (
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-0.5 py-0 rounded leading-tight">
                              🟥
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {leftSquadPlayers.length === 0 && (
                    <div className="h-full flex items-center justify-center text-center text-slate-500 text-xs">
                      No hay jugadoras
                    </div>
                  )}
                </div>
              </div>

              {/* Middle Column: Fast Action Button Grid (Single-screen Keypad) */}
              {selectedPlayer ? (
                <div className="flex-1 flex flex-col h-full min-h-0 gap-2 overflow-hidden justify-between">
                  {/* Selected Player Profile Card (Compact Horizontal Banner) */}
                  <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/40 px-3.5 py-2 rounded-xl flex items-center justify-between shrink-0 shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-black text-cyan-300 text-base">
                        #{selectedPlayer.dorsal || '-'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase text-cyan-400 tracking-wider">
                            Jugadora Activa
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-800/80 px-1.5 py-0.2 rounded">
                            {selectedPlayer.posicion}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm sm:text-base text-white leading-tight">
                          {selectedPlayer.nombre} {selectedPlayer.apellidos}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                      <div className="text-right hidden sm:block">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Minutos</span>
                        <span className="text-xs font-black text-slate-200 font-mono">
                          {selectedPlayer.minutos ?? 0}'
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Balance Balones</span>
                        <span className={`text-xs sm:text-sm font-black ${
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

                  {/* 8-Card Keypad Action Buttons Grid - Only individual player metrics! Fits easily without scrolling */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1 min-h-0 overflow-y-auto lg:overflow-visible">
                    
                    {/* 1. Gol a Favor */}
                    <div className="bg-emerald-950/40 border border-emerald-500/40 hover:border-emerald-500/70 p-2.5 rounded-xl flex flex-col justify-between shadow-sm transition-colors">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black">
                          <Target className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap">Gol a Favor</span>
                        </div>
                        <span className="text-lg font-black text-emerald-300 font-mono">
                          {selectedPlayer.goles_metidos || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_metidos', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 font-black cursor-pointer rounded-lg shrink-0"
                          title="Restar 1 gol"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_metidos', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" /> <span>+1 Gol</span>
                        </Button>
                      </div>
                    </div>

                    {/* 2. Asistencia de Gol */}
                    <div className="bg-indigo-950/40 border border-indigo-500/40 hover:border-indigo-500/70 p-2.5 rounded-xl flex flex-col justify-between shadow-sm transition-colors">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-black">
                          <Award className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="whitespace-nowrap">Asistencia</span>
                        </div>
                        <span className="text-lg font-black text-indigo-300 font-mono">
                          {selectedPlayer.asistencias || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'asistencias', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 font-black cursor-pointer rounded-lg shrink-0"
                          title="Restar 1 asistencia"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'asistencias', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" /> <span>+1 Asistencia</span>
                        </Button>
                      </div>
                    </div>

                    {/* 3. Gol en Contra */}
                    <div className="bg-rose-950/40 border border-rose-500/40 hover:border-rose-500/70 p-2.5 rounded-xl flex flex-col justify-between shadow-sm transition-colors">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-rose-400 text-xs font-black">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap">Gol Encajado</span>
                        </div>
                        <span className="text-lg font-black text-rose-300 font-mono">
                          {selectedPlayer.goles_encajados || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_encajados', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-rose-500/30 text-rose-300 hover:bg-rose-500/20 font-black cursor-pointer rounded-lg shrink-0"
                          title="Restar 1 gol encajado"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_encajados', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" /> <span>+1 Encajado</span>
                        </Button>
                      </div>
                    </div>

                    {/* 4. Recuperaciones de Balón */}
                    <div className="bg-cyan-950/40 border border-cyan-500/40 hover:border-cyan-500/70 p-2.5 rounded-xl flex flex-col justify-between shadow-sm transition-colors">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-black">
                          <Zap className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap">Recuperación</span>
                        </div>
                        <span className="text-lg font-black text-cyan-300 font-mono">
                          {selectedPlayer.recuperaciones_balon || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'recuperaciones_balon', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 font-black cursor-pointer rounded-lg shrink-0"
                          title="Restar 1 recuperación"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'recuperaciones_balon', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" /> <span>+1 Recuperación</span>
                        </Button>
                      </div>
                    </div>

                    {/* 5. Pérdidas de Balón */}
                    <div className="bg-amber-950/40 border border-amber-500/40 hover:border-amber-500/70 p-2.5 rounded-xl flex flex-col justify-between shadow-sm transition-colors">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap">Pérdida Balón</span>
                        </div>
                        <span className="text-lg font-black text-amber-300 font-mono">
                          {selectedPlayer.perdidas_balon || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'perdidas_balon', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 font-black cursor-pointer rounded-lg shrink-0"
                          title="Restar 1 pérdida"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'perdidas_balon', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" /> <span>+1 Pérdida</span>
                        </Button>
                      </div>
                    </div>

                    {/* 6. Tarjeta Amarilla */}
                    <div className="bg-yellow-950/40 border border-yellow-500/40 hover:border-yellow-500/70 p-2.5 rounded-xl flex flex-col justify-between shadow-sm transition-colors">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-black">
                          <span className="w-3 h-4 bg-yellow-400 rounded-xs inline-block shadow-sm shrink-0" />
                          <span className="whitespace-nowrap">Tarjeta Amarilla</span>
                        </div>
                        <span className="text-lg font-black text-yellow-400 font-mono">
                          {selectedPlayer.tarjetas_amarillas || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'tarjetas_amarillas', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 font-black cursor-pointer rounded-lg shrink-0"
                          title="Restar 1 amarilla"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'tarjetas_amarillas', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" /> <span>+1 Amarilla</span>
                        </Button>
                      </div>
                    </div>

                    {/* 7. Tarjeta Roja */}
                    <div className="bg-red-950/40 border border-red-500/40 hover:border-red-500/70 p-2.5 rounded-xl flex flex-col justify-between shadow-sm transition-colors">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-red-400 text-xs font-black">
                          <span className="w-3 h-4 bg-red-600 rounded-xs inline-block shadow-sm shrink-0" />
                          <span className="whitespace-nowrap">Tarjeta Roja</span>
                        </div>
                        <span className="text-lg font-black text-red-400 font-mono">
                          {selectedPlayer.tarjetas_rojas || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'tarjetas_rojas', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 border-red-500/30 text-red-300 hover:bg-red-500/20 font-black cursor-pointer rounded-lg shrink-0"
                          title="Restar 1 roja"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'tarjetas_rojas', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-xs cursor-pointer rounded-lg shadow-sm flex items-center justify-center gap-1 px-1 whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" /> <span>+1 Roja</span>
                        </Button>
                      </div>
                    </div>

                    {/* 8. Minutos Jugados */}
                    <div className="bg-teal-950/40 border border-teal-500/40 hover:border-teal-500/70 p-2.5 rounded-xl flex flex-col justify-between shadow-sm transition-colors">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 text-teal-400 text-xs font-black">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap">Minutos Campo</span>
                        </div>
                        <span className="text-lg font-black text-teal-300 font-mono">
                          {selectedPlayer.minutos ?? 0}'
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1.5">
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'minutos', -5)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 border-teal-500/30 text-teal-300 hover:bg-teal-500/20 font-black text-xs cursor-pointer rounded-lg whitespace-nowrap"
                          title="Restar 5 minutos"
                        >
                          -5 min
                        </Button>
                        <Button
                          type="button"
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'minutos', 5)}
                          size="sm"
                          className="h-8 flex-1 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs cursor-pointer rounded-lg shadow-sm whitespace-nowrap"
                          title="Sumar 5 minutos"
                        >
                          +5 min
                        </Button>
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-slate-500 text-xs">
                  Selecciona una jugadora para registrar estadísticas
                </div>
              )}

              {/* Right Column: Player Selector list (Grupo 2 - Jugadoras 10 a 18) */}
              <div className="w-full lg:w-56 xl:w-64 shrink-0 bg-slate-950/60 p-2 rounded-2xl border border-slate-850 flex flex-col h-full min-h-0 overflow-hidden">
                <div className="flex items-center justify-between pb-1 border-b border-slate-850 shrink-0">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-cyan-400" />
                    <span>Convocadas ({filteredPlayerStats.length > 9 ? `10 - ${Math.min(18, filteredPlayerStats.length)}` : '10 - 18'})</span>
                  </span>
                  <span className="text-[9px] font-bold text-slate-500">Restantes: {rightSquadPlayers.length}</span>
                </div>

                {/* Subtitle / Alignment Spacer */}
                <div className="py-1 shrink-0 flex items-center justify-between px-1 h-6">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Suplentes / Grupo 2
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400 font-bold">
                    {rightSquadPlayers.length}/9
                  </span>
                </div>

                {/* Player List Group 2 (Fits 9 rows without scroll) */}
                <div className="flex-1 min-h-0 flex flex-col justify-between gap-0.5 overflow-hidden">
                  {rightSquadPlayers.map((p) => {
                    const isSelected = p.playerId === selectedPlayerId;
                    return (
                      <button
                        key={p.playerId}
                        onClick={() => setSelectedPlayerId(p.playerId)}
                        className={`w-full flex-1 min-h-[30px] max-h-[38px] px-2 py-1 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected 
                            ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500/30' 
                            : 'bg-slate-900/40 border-slate-850 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-[10px] shrink-0 ${
                            isSelected ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300'
                          }`}>
                            #{p.dorsal || '-'}
                          </span>
                          <div className="min-w-0">
                            <span className="font-bold text-[11px] block text-white truncate max-w-[105px] leading-tight">
                              {p.nombre} {p.apellidos}
                            </span>
                            <span className="text-[8px] font-extrabold uppercase text-slate-500 block truncate leading-none">
                              {p.posicion}
                            </span>
                          </div>
                        </div>

                        {/* Quick Mini Badges */}
                        <div className="flex items-center gap-0.5 text-[8px] font-black shrink-0">
                          {(p.goles_metidos || 0) > 0 && (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0 rounded leading-tight">
                              ⚽{p.goles_metidos}
                            </span>
                          )}
                          {(p.asistencias || 0) > 0 && (
                            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 py-0 rounded leading-tight">
                              🎯{p.asistencias}
                            </span>
                          )}
                          {(p.recuperaciones_balon || 0) > 0 && (
                            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1 py-0 rounded leading-tight">
                              ⚡{p.recuperaciones_balon}
                            </span>
                          )}
                          {(p.tarjetas_amarillas || 0) > 0 && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-0.5 py-0 rounded leading-tight">
                              🟨
                            </span>
                          )}
                          {(p.tarjetas_rojas || 0) > 0 && (
                            <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-0.5 py-0 rounded leading-tight">
                              🟥
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {rightSquadPlayers.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-3 text-slate-600 text-xs">
                      <Users className="w-5 h-5 mb-1 opacity-40" />
                      <p className="text-[10px]">Todas las convocadas caben en la caja izquierda</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MATRIZ DE JUGADORAS (Complete Grid Editor) */}
          {activeTab === 'matriz' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Planilla Completa de Estadísticas de Jugadoras
                  </h4>
                  <p className="text-xs text-slate-400">
                    Ajusta los minutos jugados y todas las métricas por cada jugadora convocada
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/90 text-[10px] font-black uppercase text-slate-400 border-b border-slate-800">
                      <th className="p-3">Dorsal</th>
                      <th className="p-3">Jugadora</th>
                      <th className="p-3">Posición</th>
                      <th className="p-3 text-center">Minutos</th>
                      <th className="p-3 text-center text-emerald-400">Goles Favor</th>
                      <th className="p-3 text-center text-indigo-400">Asistencias</th>
                      <th className="p-3 text-center text-red-400">Goles Encaj</th>
                      <th className="p-3 text-center text-cyan-400">Recup</th>
                      <th className="p-3 text-center text-amber-400">Pérdidas</th>
                      <th className="p-3 text-center text-blue-400">Córner (F/C)</th>
                      <th className="p-3 text-center text-purple-400">Faltas (F/C)</th>
                      <th className="p-3 text-center text-yellow-400">Tarjetas (A/R)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {playerStats.map((p) => (
                      <tr key={p.playerId} className="hover:bg-slate-850/40 transition-colors">
                        <td className="p-3 font-extrabold text-slate-300">#{p.dorsal || '-'}</td>
                        <td className="p-3 font-bold text-white whitespace-nowrap">
                          {p.nombre} {p.apellidos}
                        </td>
                        <td className="p-3">
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                            {p.posicion}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="120"
                            value={p.minutos ?? 0}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setPlayerStats(prev => prev.map(s => s.playerId === p.playerId ? { ...s, minutos: val } : s));
                            }}
                            className="w-16 bg-slate-950 text-center font-bold text-white py-1 px-2 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 text-xs"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'goles_metidos', -1)}
                              className="w-6 h-6 rounded bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-black text-emerald-400">{p.goles_metidos || 0}</span>
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'goles_metidos', 1)}
                              className="w-6 h-6 rounded bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'asistencias', -1)}
                              className="w-6 h-6 rounded bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-black text-indigo-300">{p.asistencias || 0}</span>
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'asistencias', 1)}
                              className="w-6 h-6 rounded bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'goles_encajados', -1)}
                              className="w-6 h-6 rounded bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-black text-red-400">{p.goles_encajados || 0}</span>
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'goles_encajados', 1)}
                              className="w-6 h-6 rounded bg-red-600/30 text-red-300 hover:bg-red-600 hover:text-white flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'recuperaciones_balon', -1)}
                              className="w-6 h-6 rounded bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-black text-cyan-300">{p.recuperaciones_balon || 0}</span>
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'recuperaciones_balon', 1)}
                              className="w-6 h-6 rounded bg-cyan-600/30 text-cyan-200 hover:bg-cyan-600 hover:text-black flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'perdidas_balon', -1)}
                              className="w-6 h-6 rounded bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-black text-amber-300">{p.perdidas_balon || 0}</span>
                            <button
                              onClick={() => adjustPlayerStat(p.playerId, 'perdidas_balon', 1)}
                              className="w-6 h-6 rounded bg-amber-600/30 text-amber-200 hover:bg-amber-600 hover:text-black flex items-center justify-center cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-blue-400 font-bold">{p.corners_favor || 0}</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className="text-red-400 font-bold">{p.corners_contra || 0}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-purple-400 font-bold">{p.faltas_favor || 0}</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className="text-amber-400 font-bold">{p.faltas_contra || 0}</span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Amarillas */}
                            <div className="flex items-center gap-0.5 bg-yellow-950/40 px-1 py-0.5 rounded border border-yellow-800/40">
                              <button
                                onClick={() => adjustPlayerStat(p.playerId, 'tarjetas_amarillas', -1)}
                                className="w-4 h-4 rounded text-slate-400 hover:text-white flex items-center justify-center cursor-pointer text-xs"
                                title="Restar amarilla"
                              >
                                -
                              </button>
                              <span className="w-4 text-center font-black text-yellow-400 font-mono text-xs">{p.tarjetas_amarillas || 0}🟨</span>
                              <button
                                onClick={() => adjustPlayerStat(p.playerId, 'tarjetas_amarillas', 1)}
                                className="w-4 h-4 rounded text-yellow-400 hover:text-white flex items-center justify-center cursor-pointer text-xs font-bold"
                                title="Sumar amarilla"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-slate-600">/</span>
                            {/* Rojas */}
                            <div className="flex items-center gap-0.5 bg-red-950/40 px-1 py-0.5 rounded border border-red-800/40">
                              <button
                                onClick={() => adjustPlayerStat(p.playerId, 'tarjetas_rojas', -1)}
                                className="w-4 h-4 rounded text-slate-400 hover:text-white flex items-center justify-center cursor-pointer text-xs"
                                title="Restar roja"
                              >
                                -
                              </button>
                              <span className="w-4 text-center font-black text-red-500 font-mono text-xs">{p.tarjetas_rojas || 0}🟥</span>
                              <button
                                onClick={() => adjustPlayerStat(p.playerId, 'tarjetas_rojas', 1)}
                                className="w-4 h-4 rounded text-red-500 hover:text-white flex items-center justify-center cursor-pointer text-xs font-bold"
                                title="Sumar roja"
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

          {/* TAB 3: TOTALES DE EQUIPO Y RESUMEN GENERAL */}
          {activeTab === 'resumen' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Marcador Final y Ofensiva */}
              <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-4">
                <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Resultado del Partido y Ofensiva</span>
                </h5>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Goles a Favor</span>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => adjustTeamTotal('goles_favor', -1)}
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-black text-emerald-400">{teamTotals.goles_favor}</span>
                      <Button
                        onClick={() => adjustTeamTotal('goles_favor', 1)}
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg bg-emerald-600"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Asistencias</span>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => adjustTeamTotal('asistencias', -1)}
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-black text-indigo-300">{teamTotals.asistencias || 0}</span>
                      <Button
                        onClick={() => adjustTeamTotal('asistencias', 1)}
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg bg-indigo-600 text-white"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Goles en Contra</span>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={() => adjustTeamTotal('goles_contra', -1)}
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-black text-red-400">{teamTotals.goles_contra}</span>
                      <Button
                        onClick={() => adjustTeamTotal('goles_contra', 1)}
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg bg-red-600"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saques de Esquina */}
              <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-4">
                <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Flag className="w-4 h-4 text-blue-400" />
                  <span>Saques de Esquina (Córners)</span>
                </h5>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Córners a Favor</span>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => adjustTeamTotal('corners_favor', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        -
                      </Button>
                      <span className="text-3xl font-black text-blue-400">{teamTotals.corners_favor}</span>
                      <Button
                        onClick={() => adjustTeamTotal('corners_favor', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-blue-600"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Córners en Contra</span>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => adjustTeamTotal('corners_contra', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        -
                      </Button>
                      <span className="text-3xl font-black text-red-400">{teamTotals.corners_contra}</span>
                      <Button
                        onClick={() => adjustTeamTotal('corners_contra', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-red-600"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Faltas */}
              <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-4">
                <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Faltas del Encuentro</span>
                </h5>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Faltas a Favor (Provocadas)</span>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => adjustTeamTotal('faltas_favor', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        -
                      </Button>
                      <span className="text-3xl font-black text-purple-400">{teamTotals.faltas_favor}</span>
                      <Button
                        onClick={() => adjustTeamTotal('faltas_favor', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-purple-600"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Faltas en Contra (Cometidas)</span>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => adjustTeamTotal('faltas_contra', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        -
                      </Button>
                      <span className="text-3xl font-black text-amber-400">{teamTotals.faltas_contra}</span>
                      <Button
                        onClick={() => adjustTeamTotal('faltas_contra', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-amber-600"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recuperaciones y Pérdidas */}
              <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-4">
                <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Totales de Posesión y Balones</span>
                </h5>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Recuperaciones</span>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => adjustTeamTotal('recuperaciones_balon', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        -
                      </Button>
                      <span className="text-3xl font-black text-cyan-300">{teamTotals.recuperaciones_balon}</span>
                      <Button
                        onClick={() => adjustTeamTotal('recuperaciones_balon', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-cyan-600"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Pérdidas de Balón</span>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => adjustTeamTotal('perdidas_balon', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        -
                      </Button>
                      <span className="text-3xl font-black text-amber-300">{teamTotals.perdidas_balon}</span>
                      <Button
                        onClick={() => adjustTeamTotal('perdidas_balon', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-amber-600"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjetas y Disciplina */}
              <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl space-y-4 md:col-span-2">
                <h5 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-yellow-400" />
                  <span>Disciplina y Tarjetas del Equipo</span>
                </h5>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-yellow-400 uppercase block mb-1">Tarjetas Amarillas (Total)</span>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => adjustTeamTotal('tarjetas_amarillas', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        -
                      </Button>
                      <span className="text-3xl font-black text-yellow-400">{teamTotals.tarjetas_amarillas}</span>
                      <Button
                        onClick={() => adjustTeamTotal('tarjetas_amarillas', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-yellow-600 text-black font-bold"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="text-[10px] font-bold text-red-500 uppercase block mb-1">Tarjetas Rojas (Total)</span>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        onClick={() => adjustTeamTotal('tarjetas_rojas', -1)}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                      >
                        -
                      </Button>
                      <span className="text-3xl font-black text-red-500">{teamTotals.tarjetas_rojas}</span>
                      <Button
                        onClick={() => adjustTeamTotal('tarjetas_rojas', 1)}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg bg-red-600 text-white font-bold"
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
        <div className="bg-slate-950 border-t border-slate-800 px-5 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>Los datos guardados se sincronizan automáticamente en el módulo de <strong>Estadísticas</strong>.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-bold border-slate-800 text-slate-400 hover:bg-slate-800 rounded-xl h-10 px-4 cursor-pointer"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleSaveAndSync}
              className="text-xs font-black uppercase bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black rounded-xl h-10 px-5 shadow-lg shadow-cyan-950/40 gap-2 cursor-pointer transition-all"
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
