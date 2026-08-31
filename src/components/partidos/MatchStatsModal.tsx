import React, { useState, useEffect } from 'react';
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
  Eye
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
  | 'faltas_contra';

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
      faltas_contra: 'Falta cometida (contra) ⚠️'
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

  // Team totals direct adjustment (for match general counters)
  const adjustTeamTotal = (key: keyof MatchTotals, delta: number) => {
    setTeamTotals(prev => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) + delta)
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

  const selectedPlayer = playerStats.find(p => p.playerId === selectedPlayerId) || playerStats[0];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden text-left">
        
        {/* HEADER BAR */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-5 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800">
                  Toma de Estadísticas en Vivo
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  {match.fecha} • {match.hora}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>{match.tipo === 'Local' ? teamName : match.rival}</span>
                <span className="text-cyan-400 font-mono px-2 py-0.5 bg-slate-900 rounded-lg border border-slate-800">
                  {teamTotals.goles_favor} - {teamTotals.goles_contra}
                </span>
                <span>{match.tipo === 'Local' ? match.rival : teamName}</span>
              </h3>
            </div>
          </div>

          {/* TAB BUTTONS */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('rapido')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'rapido'
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Registro Rápido</span>
            </button>

            <button
              onClick={() => setActiveTab('matriz')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'matriz'
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Matriz de Jugadoras</span>
            </button>

            <button
              onClick={() => setActiveTab('resumen')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'resumen'
                  ? 'bg-cyan-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Totales de Equipo</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TEAM LIVE STATUS BAR */}
        <div className="bg-slate-950/60 border-b border-slate-850 px-5 py-2.5 grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0 text-center">
          <div className="bg-slate-900/60 rounded-xl p-1.5 border border-slate-800">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Recuperaciones</span>
            <span className="text-sm font-black text-cyan-300">{teamTotals.recuperaciones_balon}</span>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-1.5 border border-slate-800">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Pérdidas Balón</span>
            <span className="text-sm font-black text-amber-400">{teamTotals.perdidas_balon}</span>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-1.5 border border-slate-800">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Córners (F / C)</span>
            <span className="text-sm font-black text-blue-400">{teamTotals.corners_favor} <span className="text-slate-600 font-normal">/</span> <span className="text-red-400">{teamTotals.corners_contra}</span></span>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-1.5 border border-slate-800">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Faltas (F / C)</span>
            <span className="text-sm font-black text-purple-400">{teamTotals.faltas_favor} <span className="text-slate-600 font-normal">/</span> <span className="text-amber-400">{teamTotals.faltas_contra}</span></span>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-1.5 border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Tarjetas (A / R)</span>
            <span className="text-sm font-black text-amber-400">{teamTotals.tarjetas_amarillas} <span className="text-slate-600 font-normal">/</span> <span className="text-red-500">{teamTotals.tarjetas_rojas}</span></span>
          </div>
        </div>

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          
          {/* TAB 1: REGISTRO RÁPIDO EN DIRECTO */}
          {activeTab === 'rapido' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
              
              {/* Left Column: Player Selector list */}
              <div className="lg:col-span-4 flex flex-col gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-850 max-h-[520px] overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Convocadas ({playerStats.length})
                  </span>
                  <span className="text-[9px] text-cyan-400 font-bold">Selecciona jugadora</span>
                </div>

                <div className="space-y-1.5">
                  {playerStats.map((p) => {
                    const isSelected = p.playerId === selectedPlayerId;
                    return (
                      <button
                        key={p.playerId}
                        onClick={() => setSelectedPlayerId(p.playerId)}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected 
                            ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md' 
                            : 'bg-slate-900/40 border-slate-850 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                            isSelected ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-300'
                          }`}>
                            #{p.dorsal || '-'}
                          </span>
                          <div>
                            <span className="font-bold text-xs block text-white truncate max-w-[130px]">
                              {p.nombre} {p.apellidos}
                            </span>
                            <span className="text-[9px] font-extrabold uppercase text-slate-500">
                              {p.posicion}
                            </span>
                          </div>
                        </div>

                        {/* Quick Mini Badges */}
                        <div className="flex items-center gap-1.5 text-[10px] font-black">
                          {(p.goles_metidos || 0) > 0 && (
                            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                              ⚽ {p.goles_metidos}
                            </span>
                          )}
                          {(p.asistencias || 0) > 0 && (
                            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                              🎯 {p.asistencias}
                            </span>
                          )}
                          {(p.recuperaciones_balon || 0) > 0 && (
                            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded">
                              ⚡ {p.recuperaciones_balon}
                            </span>
                          )}
                          {(p.tarjetas_amarillas || 0) > 0 && (
                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
                              🟨 {p.tarjetas_amarillas}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Middle Column: Fast Action Button Grid for Selected Player */}
              {selectedPlayer ? (
                <div className="lg:col-span-5 flex flex-col gap-4">
                  {/* Selected Player Profile Card */}
                  <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-cyan-500/40 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-black text-cyan-300 text-lg">
                        #{selectedPlayer.dorsal || '-'}
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">
                          Jugadora Seleccionada
                        </span>
                        <h4 className="font-extrabold text-base text-white">
                          {selectedPlayer.nombre} {selectedPlayer.apellidos}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          Posición: {selectedPlayer.posicion}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Balance Balones</span>
                        <span className={`text-sm font-black ${
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

                  {/* Action Buttons Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* 1. Gol a Favor */}
                    <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-2xl flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black uppercase">
                          <Target className="w-4 h-4" />
                          <span>Gol a Favor</span>
                        </div>
                        <span className="text-lg font-black text-emerald-400">
                          {selectedPlayer.goles_metidos || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_metidos', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 font-black cursor-pointer rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_metidos', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer rounded-xl shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" /> +1 Gol
                        </Button>
                      </div>
                    </div>

                    {/* 2. Asistencia de Gol */}
                    <div className="bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-2xl flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-black uppercase">
                          <Award className="w-4 h-4 text-indigo-400" />
                          <span>Asistencia Gol</span>
                        </div>
                        <span className="text-lg font-black text-indigo-300">
                          {selectedPlayer.asistencias || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'asistencias', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 font-black cursor-pointer rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'asistencias', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black cursor-pointer rounded-xl shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" /> +1 Asistencia
                        </Button>
                      </div>
                    </div>

                    {/* 3. Gol en Contra (Portera / Bloque) */}
                    <div className="bg-red-950/40 border border-red-500/30 p-3 rounded-2xl flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-red-400 text-xs font-black uppercase">
                          <ShieldAlert className="w-4 h-4" />
                          <span>Gol en Contra</span>
                        </div>
                        <span className="text-lg font-black text-red-400">
                          {selectedPlayer.goles_encajados || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_encajados', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 border-red-500/30 text-red-300 hover:bg-red-500/20 font-black cursor-pointer rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'goles_encajados', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-red-600 hover:bg-red-500 text-white font-black cursor-pointer rounded-xl shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" /> +1 Encajado
                        </Button>
                      </div>
                    </div>

                    {/* 4. Recuperaciones de Balón */}
                    <div className="bg-cyan-950/40 border border-cyan-500/30 p-3 rounded-2xl flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-black uppercase">
                          <Zap className="w-4 h-4" />
                          <span>Recuperación</span>
                        </div>
                        <span className="text-lg font-black text-cyan-300">
                          {selectedPlayer.recuperaciones_balon || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'recuperaciones_balon', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 font-black cursor-pointer rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'recuperaciones_balon', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-cyan-600 hover:bg-cyan-500 text-black font-black cursor-pointer rounded-xl shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" /> +1 Robada
                        </Button>
                      </div>
                    </div>

                    {/* 5. Pérdidas de Balón */}
                    <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-2xl flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black uppercase">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Pérdida Balón</span>
                        </div>
                        <span className="text-lg font-black text-amber-300">
                          {selectedPlayer.perdidas_balon || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'perdidas_balon', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 font-black cursor-pointer rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'perdidas_balon', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-amber-600 hover:bg-amber-500 text-black font-black cursor-pointer rounded-xl shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" /> +1 Pérdida
                        </Button>
                      </div>
                    </div>

                    {/* 6. Córner a Favor */}
                    <div className="bg-blue-950/40 border border-blue-500/30 p-3 rounded-2xl flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-blue-400 text-xs font-black uppercase">
                          <Flag className="w-4 h-4" />
                          <span>Córner Favor</span>
                        </div>
                        <span className="text-lg font-black text-blue-300">
                          {selectedPlayer.corners_favor || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'corners_favor', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 border-blue-500/30 text-blue-300 hover:bg-blue-500/20 font-black cursor-pointer rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'corners_favor', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black cursor-pointer rounded-xl shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" /> +1 Córner
                        </Button>
                      </div>
                    </div>

                    {/* 7. Córner en Contra */}
                    <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-300 text-xs font-black uppercase">
                          <Flag className="w-4 h-4 text-red-400" />
                          <span>Córner Contra</span>
                        </div>
                        <span className="text-lg font-black text-red-400">
                          {selectedPlayer.corners_contra || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'corners_contra', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 font-black cursor-pointer rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'corners_contra', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black cursor-pointer rounded-xl"
                        >
                          <Plus className="w-3.5 h-3.5" /> +1 Córner
                        </Button>
                      </div>
                    </div>

                    {/* 8. Falta Provocada (Favor) */}
                    <div className="bg-purple-950/40 border border-purple-500/30 p-3 rounded-2xl flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-purple-400 text-xs font-black uppercase">
                          <Shield className="w-4 h-4" />
                          <span>Falta Favor</span>
                        </div>
                        <span className="text-lg font-black text-purple-300">
                          {selectedPlayer.faltas_favor || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'faltas_favor', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 font-black cursor-pointer rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'faltas_favor', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-purple-600 hover:bg-purple-500 text-white font-black cursor-pointer rounded-xl shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" /> +1 Falta
                        </Button>
                      </div>
                    </div>

                    {/* 9. Falta Cometida (Contra) */}
                    <div className="bg-orange-950/40 border border-orange-500/30 p-3 rounded-2xl flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-orange-400 text-xs font-black uppercase">
                          <ShieldAlert className="w-4 h-4" />
                          <span>Falta Contra</span>
                        </div>
                        <span className="text-lg font-black text-orange-300">
                          {selectedPlayer.faltas_contra || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'faltas_contra', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 border-orange-500/30 text-orange-300 hover:bg-orange-500/20 font-black cursor-pointer rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'faltas_contra', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black cursor-pointer rounded-xl shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" /> +1 Falta
                        </Button>
                      </div>
                    </div>

                    {/* 10. Tarjeta Amarilla */}
                    <div className="bg-yellow-950/40 border border-yellow-500/30 p-3 rounded-2xl flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-black uppercase">
                          <span className="w-3 h-4 bg-yellow-400 rounded-sm inline-block shadow-sm" />
                          <span>Amarilla</span>
                        </div>
                        <span className="text-lg font-black text-yellow-400">
                          {selectedPlayer.tarjetas_amarillas || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'tarjetas_amarillas', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 font-black cursor-pointer rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'tarjetas_amarillas', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-yellow-500 hover:bg-yellow-400 text-black font-black cursor-pointer rounded-xl shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" /> +1 Amarilla
                        </Button>
                      </div>
                    </div>

                    {/* 11. Tarjeta Roja */}
                    <div className="bg-red-950/40 border border-red-500/30 p-3 rounded-2xl flex flex-col justify-between gap-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-red-400 text-xs font-black uppercase">
                          <span className="w-3 h-4 bg-red-600 rounded-sm inline-block shadow-sm" />
                          <span>Tarjeta Roja</span>
                        </div>
                        <span className="text-lg font-black text-red-400">
                          {selectedPlayer.tarjetas_rojas || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'tarjetas_rojas', -1)}
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 border-red-500/30 text-red-300 hover:bg-red-500/20 font-black cursor-pointer rounded-xl"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => adjustPlayerStat(selectedPlayer.playerId, 'tarjetas_rojas', 1)}
                          size="sm"
                          className="h-8 flex-1 bg-red-600 hover:bg-red-500 text-white font-black cursor-pointer rounded-xl shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" /> +1 Roja
                        </Button>
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="lg:col-span-5 flex items-center justify-center p-8 text-slate-500 text-xs">
                  Selecciona una jugadora para registrar estadísticas
                </div>
              )}

              {/* Right Column: Live Feed Activity Log */}
              <div className="lg:col-span-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-850 flex flex-col gap-2 max-h-[520px]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Registro en Vivo</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-500 font-bold">{eventLogs.length} acciones</span>
                    {eventLogs.length > 0 && (
                      <button
                        onClick={() => setEventLogs([])}
                        title="Limpiar registro"
                        className="text-[9px] text-slate-400 hover:text-red-400 font-bold uppercase transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-slate-800"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {eventLogs.length > 0 ? (
                    eventLogs.map((log) => (
                      <div 
                        key={log.id} 
                        className="bg-slate-900/80 border border-slate-800 p-2 rounded-xl text-xs flex flex-col gap-0.5 animate-in slide-in-from-right-2 duration-150 relative group"
                      >
                        <div className="flex items-center justify-between text-[9px] font-mono text-cyan-400">
                          <span>{log.time}</span>
                          <span className="text-slate-500 uppercase">{log.type.replace('_', ' ')}</span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-white font-semibold text-[11px] leading-tight">
                            {log.text}
                          </p>
                          <button
                            onClick={() => setEventLogs(prev => prev.filter(l => l.id !== log.id))}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-0.5 cursor-pointer shrink-0"
                            title="Eliminar evento"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-slate-600 text-xs">
                      <Clock className="w-6 h-6 mb-2 opacity-40" />
                      <p>Pulsa en los botones para registrar acciones en vivo durante el partido</p>
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
