import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  ExternalLink, 
  X, 
  Search, 
  RotateCcw, 
  TrendingUp, 
  Edit3,
  Save,
  Calendar,
  RefreshCw,
  FastForward,
  Award,
  ChevronRight,
  Shield,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import RivalBadge from './RivalBadge';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';
import { 
  StandingTeam, 
  JornadaMatch,
  OFFICIAL_RFFM_G50_MATCHES,
  ALL_RFFM_G50_TEAMS,
  RFFM_INFANTIL_G50_INFO,
  computeStandingsFromMatches,
  getCurrentWeekJornada
} from '@/data/rffmStandingsData';

interface GroupStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_MATCHES_KEY = 'rffm_g50_all_matches_v3';
const ACTIVE_JORNADA_KEY = 'rffm_g50_selected_jornada_v3';

export default function GroupStandingsModal({ isOpen, onClose }: GroupStandingsModalProps) {
  // Current active Jornada (default: 5)
  const [selectedJornada, setSelectedJornada] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_JORNADA_KEY);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 1 && val <= 26) return val;
      }
    } catch {
      // fallback
    }
    return 5;
  });

  const [activeTab, setActiveTab] = useState<'tabla' | 'jornadas' | 'mi_equipo'>('tabla');
  const [allMatches, setAllMatches] = useState<JornadaMatch[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MATCHES_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return OFFICIAL_RFFM_G50_MATCHES;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  // Compute standings dynamically based on the current selected jornada and all matches
  const standings = useMemo(() => {
    return computeStandingsFromMatches(allMatches, selectedJornada);
  }, [allMatches, selectedJornada]);

  // Sync state on modal open
  useEffect(() => {
    try {
      const savedMatches = localStorage.getItem(STORAGE_MATCHES_KEY);
      if (savedMatches) {
        setAllMatches(JSON.parse(savedMatches));
      } else {
        setAllMatches(OFFICIAL_RFFM_G50_MATCHES);
      }
    } catch {
      setAllMatches(OFFICIAL_RFFM_G50_MATCHES);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenRFFM = () => {
    window.open(RFFM_INFANTIL_G50_INFO.webOficial, '_blank', 'noopener,noreferrer');
  };

  const handleSelectJornada = (jornada: number) => {
    setSelectedJornada(jornada);
    localStorage.setItem(ACTIVE_JORNADA_KEY, String(jornada));
  };

  // Reset to full official RFFM results
  const handleResetToOfficialRFFM = () => {
    if (window.confirm('¿Restablecer todos los resultados oficiales de la RFFM (Jornadas 1 a 5)?')) {
      localStorage.removeItem(STORAGE_MATCHES_KEY);
      setAllMatches(OFFICIAL_RFFM_G50_MATCHES);
      setSelectedJornada(5);
      localStorage.setItem(ACTIVE_JORNADA_KEY, '5');
      toast.success('Resultados y clasificación de la RFFM restablecidos.');
    }
  };

  // Update a match score in any jornada
  const handleScoreChange = (matchId: string, gl: string, gv: string) => {
    const numGl = gl.trim() === '' ? undefined : parseInt(gl, 10);
    const numGv = gv.trim() === '' ? undefined : parseInt(gv, 10);

    const updated = allMatches.map(m => {
      if (m.id === matchId) {
        const isPlayed = numGl !== undefined && numGv !== undefined && !isNaN(numGl) && !isNaN(numGv);
        return {
          ...m,
          golesLocal: isPlayed ? numGl : undefined,
          golesVisitante: isPlayed ? numGv : undefined,
          jugado: isPlayed
        };
      }
      return m;
    });

    setAllMatches(updated);
    localStorage.setItem(STORAGE_MATCHES_KEY, JSON.stringify(updated));
  };

  const myTeam = standings.find(t => t.isMyTeam || t.name.includes('AFE')) || standings[1];
  const leaderTeam = standings[0];

  const filteredStandings = standings.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.shortName && t.shortName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Matches of the selected jornada
  const currentJornadaMatches = allMatches.filter(m => m.jornada === selectedJornada);

  // My team's all matches
  const myTeamMatches = allMatches.filter(m => m.local.includes('AFE') || m.visitante.includes('AFE'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        
        {/* Top Header */}
        <div className="relative p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/60 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-lg shadow-emerald-900/40 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {RFFM_INFANTIL_G50_INFO.categoria} • {RFFM_INFANTIL_G50_INFO.grupo}
                </span>
                
                <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Jornada {selectedJornada} de 26</span>
                </span>

                <span className="text-[11px] font-medium text-emerald-400/90 hidden sm:inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>Cómputo en vivo según resultados oficiales</span>
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2 mt-1">
                Clasificación Oficial RFFM
              </h2>
              <p className="text-xs text-slate-400">
                {RFFM_INFANTIL_G50_INFO.federacion} • {RFFM_INFANTIL_G50_INFO.temporada}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
            <Button
              onClick={handleResetToOfficialRFFM}
              variant="outline"
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700 text-xs font-bold px-3 py-2 h-9 rounded-xl flex items-center gap-1.5"
              title="Restaurar todos los resultados oficiales de la RFFM"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Restablecer RFFM</span>
            </Button>

            <Button
              onClick={handleOpenRFFM}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider px-3.5 py-2 h-9 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
              title="Abrir web oficial de la Federación de Madrid"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver en RFFM.es</span>
            </Button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Jornada Selector & Navigation Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800 p-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          {/* Jornada selector pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              Jornada:
            </span>

            {[1, 2, 3, 4, 5].map((jNum) => {
              const isSelected = selectedJornada === jNum;
              const isCurrent = jNum === 5;

              return (
                <button
                  key={jNum}
                  onClick={() => handleSelectJornada(jNum)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 scale-105' 
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span>Jornada {jNum}</span>
                  {isCurrent && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  )}
                </button>
              );
            })}

            {/* Dropdown for other Jornadas up to 26 */}
            <select
              value={selectedJornada > 5 ? selectedJornada : ''}
              onChange={(e) => {
                if (e.target.value) handleSelectJornada(parseInt(e.target.value, 10));
              }}
              className="bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Más jornadas (6-26)...</option>
              {Array.from({ length: 21 }, (_, i) => i + 6).map((num) => (
                <option key={num} value={num}>Jornada {num}</option>
              ))}
            </select>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('tabla')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tabla'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Clasificación</span>
            </button>
            <button
              onClick={() => setActiveTab('jornadas')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'jornadas'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Resultados J.{selectedJornada}</span>
            </button>
            <button
              onClick={() => setActiveTab('mi_equipo')}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'mi_equipo'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Partidos AFE 'B'</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-slate-950/60 border-b border-slate-800/60">
          {/* My Team KPI */}
          <div className="bg-gradient-to-br from-emerald-950/50 to-slate-900 border border-emerald-500/40 rounded-2xl p-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <span>Nuestro Equipo</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black">
                {myTeam?.pos}º PUESTO
              </span>
            </div>
            <div className="text-sm sm:text-base font-black text-white truncate">
              {myTeam?.shortName || myTeam?.name}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
              <span className="font-bold text-emerald-400">{myTeam?.pts} PTS</span>
              <span>•</span>
              <span>{myTeam?.pj} PJ ({myTeam?.pg}V - {myTeam?.pe}E - {myTeam?.pp}D)</span>
            </div>
          </div>

          {/* Group Leader KPI */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
              <span>Líder Provisional</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black">1º</span>
            </div>
            <div className="text-sm sm:text-base font-black text-white truncate">
              {leaderTeam?.shortName || leaderTeam?.name}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
              <span className="font-bold text-amber-400">{leaderTeam?.pts} PTS</span>
              <span>•</span>
              <span>{leaderTeam?.gf} GF / {leaderTeam?.gc} GC (+{leaderTeam?.dg})</span>
            </div>
          </div>

          {/* Estado de la Jornada */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Estado de Jornada
            </div>
            <div className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
              <span>Jornada {selectedJornada}</span>
              <span className="text-xs text-emerald-400 font-bold">
                {selectedJornada < 5 ? '(Disputada)' : selectedJornada === 5 ? '(Semana Actual)' : '(Próxima)'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              14 equipos • Resultados oficiales federados
            </div>
          </div>

          {/* Ascenso Info */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-1">
              Objetivo Deportivo
            </div>
            <div className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>1º y 2º Ascenso Directo</span>
            </div>
            <div className="text-xs text-emerald-400/90 mt-1 font-medium">
              Ascenso a 1ª Infantil RFFM
            </div>
          </div>
        </div>

        {/* Tab 1: Clasificación General */}
        {activeTab === 'tabla' && (
          <>
            {/* Search Bar */}
            <div className="p-3 sm:px-6 sm:py-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar equipo del Grupo 50..."
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Calculada a partir de los marcadores de las Jornadas 1 a {selectedJornada}</span>
              </div>
            </div>

            {/* Standings Table Container */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-5">
              <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/50 shadow-inner">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <th className="py-3 px-3 text-center w-12">Pos</th>
                      <th className="py-3 px-4">Equipo</th>
                      <th className="py-3 px-3 text-center font-black text-emerald-400 w-14">PTS</th>
                      <th className="py-3 px-2 text-center w-12">PJ</th>
                      <th className="py-3 px-2 text-center w-12 text-emerald-400">PG</th>
                      <th className="py-3 px-2 text-center w-12 text-amber-400">PE</th>
                      <th className="py-3 px-2 text-center w-12 text-rose-400">PP</th>
                      <th className="py-3 px-2 text-center w-12 text-slate-300">GF</th>
                      <th className="py-3 px-2 text-center w-12 text-slate-300">GC</th>
                      <th className="py-3 px-2 text-center w-12 text-slate-200">DG</th>
                      <th className="py-3 px-3 text-center w-28">Forma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredStandings.map((team) => {
                      const isPromotion = team.pos <= 2;
                      const isAFE = team.isMyTeam || team.name.includes('AFE');

                      return (
                        <tr 
                          key={team.name}
                          className={`transition-colors ${
                            isAFE 
                              ? 'bg-gradient-to-r from-emerald-950/70 via-emerald-900/40 to-slate-950 border-l-4 border-l-emerald-500 font-bold text-white shadow-xs' 
                              : isPromotion 
                                ? 'bg-emerald-950/15 hover:bg-slate-800/50 text-slate-200' 
                                : 'hover:bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          {/* Posición */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center">
                              {team.pos === 1 ? (
                                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-xs">
                                  1
                                </span>
                              ) : team.pos === 2 ? (
                                <span className="w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40 flex items-center justify-center text-xs font-black">
                                  2
                                </span>
                              ) : team.pos === 3 ? (
                                <span className="w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 flex items-center justify-center text-xs font-black">
                                  3
                                </span>
                              ) : (
                                <span className={`text-xs ${isAFE ? 'font-black text-emerald-400' : 'text-slate-400'}`}>
                                  {team.pos}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Nombre del Equipo y Escudo */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-800 p-0.5">
                                {isAFE ? (
                                  <UDLaPovedaLogo className="w-6 h-6" />
                                ) : (
                                  <RivalBadge rivalName={team.name} size="xs" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs ${isAFE ? 'font-black text-emerald-300' : 'font-semibold text-white'}`}>
                                    {team.name}
                                  </span>
                                  {isAFE && (
                                    <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950">
                                      Tu Equipo
                                    </span>
                                  )}
                                  {isPromotion && !isAFE && (
                                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      Ascenso
                                    </span>
                                  )}
                                </div>
                                {team.shortName && team.shortName !== team.name && (
                                  <span className="text-[10px] text-slate-500 block">
                                    {team.shortName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Puntos (PTS) */}
                          <td className="py-3 px-3 text-center">
                            <span className={`text-sm font-black ${isAFE ? 'text-emerald-400' : 'text-white'}`}>
                              {team.pts}
                            </span>
                          </td>

                          {/* PJ */}
                          <td className="py-3 px-2 text-center text-slate-400 font-semibold">
                            {team.pj}
                          </td>

                          {/* PG */}
                          <td className="py-3 px-2 text-center text-emerald-400 font-bold">
                            {team.pg}
                          </td>

                          {/* PE */}
                          <td className="py-3 px-2 text-center text-amber-400 font-bold">
                            {team.pe}
                          </td>

                          {/* PP */}
                          <td className="py-3 px-2 text-center text-rose-400 font-bold">
                            {team.pp}
                          </td>

                          {/* GF */}
                          <td className="py-3 px-2 text-center text-slate-300">
                            {team.gf}
                          </td>

                          {/* GC */}
                          <td className="py-3 px-2 text-center text-slate-400">
                            {team.gc}
                          </td>

                          {/* DG */}
                          <td className="py-3 px-2 text-center font-bold">
                            <span className={team.dg > 0 ? 'text-emerald-400' : team.dg < 0 ? 'text-rose-400' : 'text-slate-400'}>
                              {team.dg > 0 ? `+${team.dg}` : team.dg}
                            </span>
                          </td>

                          {/* Forma Reciente */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {team.form && team.form.map((result, rIdx) => (
                                <span 
                                  key={rIdx}
                                  className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${
                                    result === 'V' 
                                      ? 'bg-emerald-500 text-slate-950' 
                                      : result === 'E' 
                                        ? 'bg-amber-500 text-slate-950' 
                                        : 'bg-rose-500 text-white'
                                  }`}
                                  title={result === 'V' ? 'Victoria' : result === 'E' ? 'Empate' : 'Derrota'}
                                >
                                  {result}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer Notes & Legend */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50 inline-block"></span>
                    <span>Puestos 1º y 2º: Ascenso a 1ª Infantil</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                    <span>V = Victoria (3 pts)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
                    <span>E = Empate (1 pt)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
                    <span>D = Derrota (0 pts)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleOpenRFFM}
                    className="text-xs text-emerald-400 hover:text-emerald-300 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 h-7 px-2.5 rounded-lg flex items-center gap-1"
                  >
                    <span>Consultar actas en www.rffm.es</span>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Todos los Resultados de la Jornada */}
        {activeTab === 'jornadas' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>Encuentros y Resultados de la Jornada {selectedJornada}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {currentJornadaMatches.length} partidos oficiales • Los resultados actualizan automáticamente la clasificación
                </p>
              </div>

              <span className="text-xs font-bold text-slate-400 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700">
                {selectedJornada === 1 && '10/10/2026'}
                {selectedJornada === 2 && '17/10/2026'}
                {selectedJornada === 3 && '24/10/2026'}
                {selectedJornada === 4 && '31/10/2026'}
                {selectedJornada === 5 && '07/11/2026 - 08/11/2026 (Semana Actual)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {currentJornadaMatches.map((m) => {
                const isAFEMatch = m.local.includes('AFE') || m.visitante.includes('AFE');

                return (
                  <div 
                    key={m.id}
                    className={`rounded-2xl p-4 border transition-all ${
                      isAFEMatch 
                        ? 'bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-950/30' 
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 border-b border-slate-800/60 pb-2">
                      <div className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        <span>{m.fecha} • {m.hora} h</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {m.jugado ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Finalizado</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Programado
                          </span>
                        )}
                        {isAFEMatch && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500 text-slate-950">
                            AFE 'B'
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 items-center gap-2">
                      {/* Local Team */}
                      <div className="col-span-5 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800">
                          {m.local.includes('AFE') ? (
                            <UDLaPovedaLogo className="w-6 h-6" />
                          ) : (
                            <RivalBadge rivalName={m.local} size="xs" />
                          )}
                        </div>
                        <span className={`text-xs truncate ${m.local.includes('AFE') ? 'font-black text-emerald-300' : 'font-semibold text-white'}`} title={m.local}>
                          {m.local}
                        </span>
                      </div>

                      {/* Score Input */}
                      <div className="col-span-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="-"
                            value={m.golesLocal !== undefined ? m.golesLocal : ''}
                            onChange={(e) => handleScoreChange(m.id, e.target.value, m.golesVisitante !== undefined ? String(m.golesVisitante) : '')}
                            className={`w-7 h-7 bg-slate-900 border rounded-md text-center text-xs font-black text-white focus:outline-none focus:border-emerald-500 ${
                              m.jugado ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-700'
                            }`}
                          />
                          <span className="text-xs font-black text-slate-500">:</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="-"
                            value={m.golesVisitante !== undefined ? m.golesVisitante : ''}
                            onChange={(e) => handleScoreChange(m.id, m.golesLocal !== undefined ? String(m.golesLocal) : '', e.target.value)}
                            className={`w-7 h-7 bg-slate-900 border rounded-md text-center text-xs font-black text-white focus:outline-none focus:border-emerald-500 ${
                              m.jugado ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-700'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Visitante Team */}
                      <div className="col-span-5 flex items-center justify-end gap-2 text-right">
                        <span className={`text-xs truncate ${m.visitante.includes('AFE') ? 'font-black text-emerald-300' : 'font-semibold text-white'}`} title={m.visitante}>
                          {m.visitante}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800">
                          {m.visitante.includes('AFE') ? (
                            <UDLaPovedaLogo className="w-6 h-6" />
                          ) : (
                            <RivalBadge rivalName={m.visitante} size="xs" />
                          )}
                        </div>
                      </div>
                    </div>

                    {m.campo && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/40 text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{m.campo}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Partidos Específicos de la Fundación AFE 'B' */}
        {activeTab === 'mi_equipo' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Calendario y Resultados de la S.A.D. Fundación E.F. AFE 'B'</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Resumen cronológico de los 4 partidos disputados y el próximo encuentro de la Jornada 5
                </p>
              </div>

              <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-lg">
                Balance: 3V - 1E - 0D (10 PTS • Invicto)
              </span>
            </div>

            <div className="space-y-3">
              {myTeamMatches.map((m) => {
                const isHome = m.local.includes('AFE');
                const rivalName = isHome ? m.visitante : m.local;
                const myGoals = isHome ? m.golesLocal : m.golesVisitante;
                const rivalGoals = isHome ? m.golesVisitante : m.golesLocal;
                
                let resultText = 'Programado';
                let resultBadgeClass = 'bg-slate-800 text-slate-300';
                if (m.jugado && myGoals !== undefined && rivalGoals !== undefined) {
                  if (myGoals > rivalGoals) {
                    resultText = 'Victoria (+3 pts)';
                    resultBadgeClass = 'bg-emerald-500 text-slate-950 font-black';
                  } else if (myGoals === rivalGoals) {
                    resultText = 'Empate (+1 pt)';
                    resultBadgeClass = 'bg-amber-500 text-slate-950 font-black';
                  } else {
                    resultText = 'Derrota';
                    resultBadgeClass = 'bg-rose-500 text-white font-black';
                  }
                }

                return (
                  <div 
                    key={m.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                        <span className="text-xs font-black text-emerald-400">J.{m.jornada}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">
                            {isHome ? 'En Casa (Local)' : 'Fuera (Visitante)'}
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-400">{m.fecha} ({m.hora} h)</span>
                        </div>
                        <div className="text-sm font-black text-white flex items-center gap-2 mt-0.5">
                          <span>vs {rivalName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          <span>{m.campo}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {m.jugado ? (
                        <div className="text-right">
                          <div className="text-lg font-black text-white flex items-center gap-1.5 justify-end">
                            <span className="text-emerald-400">{myGoals}</span>
                            <span className="text-slate-600">-</span>
                            <span className="text-slate-300">{rivalGoals}</span>
                          </div>
                          <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md inline-block ${resultBadgeClass}`}>
                            {resultText}
                          </span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg">
                            Próximo Partido (Jornada 5)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Bottom Close Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Clasificación y actas oficiales RFFM actualizadas jornada a jornada (Jornadas 1 a 5)</span>
          </div>

          <Button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2 h-9 rounded-xl cursor-pointer"
          >
            Cerrar
          </Button>
        </div>

      </div>
    </div>
  );
}
