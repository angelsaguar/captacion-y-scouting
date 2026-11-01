import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  ExternalLink, 
  X, 
  Search, 
  RotateCcw, 
  TrendingUp, 
  Calendar, 
  RefreshCw, 
  Shield, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Globe,
  Swords
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import RivalBadge from './RivalBadge';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';
import { 
  StandingTeam, 
  JornadaMatch, 
  OFFICIAL_RFFM_JORNADA_4_STANDINGS, 
  OFFICIAL_RFFM_ALL_MATCHES, 
  RFFM_URL_CONFIG, 
  RFFM_INFANTIL_G50_INFO, 
  fetchLiveRFFMClasificacion, 
  fetchLiveRFFMResultados 
} from '@/data/rffmStandingsData';

interface GroupStandingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_STANDINGS_KEY = 'rffm_g50_official_standings_v4';
const STORAGE_MATCHES_KEY = 'rffm_g50_official_matches_v4';
const ACTIVE_JORNADA_KEY = 'rffm_g50_active_jornada_v4';

export default function GroupStandingsModal({ isOpen, onClose }: GroupStandingsModalProps) {
  const navigate = useNavigate();
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
    return 4; // Default to Jornada 4 (disputed round on RFFM)
  });

  const [activeTab, setActiveTab] = useState<'tabla' | 'jornadas' | 'mi_equipo'>('tabla');
  const [standings, setStandings] = useState<StandingTeam[]>(OFFICIAL_RFFM_JORNADA_4_STANDINGS);
  const [allMatches, setAllMatches] = useState<JornadaMatch[]>(OFFICIAL_RFFM_ALL_MATCHES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  useEffect(() => {
    try {
      const savedStandings = localStorage.getItem(`${STORAGE_STANDINGS_KEY}_j${selectedJornada}`);
      if (savedStandings) {
        setStandings(JSON.parse(savedStandings));
      } else {
        setStandings(OFFICIAL_RFFM_JORNADA_4_STANDINGS);
      }

      const savedMatches = localStorage.getItem(STORAGE_MATCHES_KEY);
      if (savedMatches) {
        setAllMatches(JSON.parse(savedMatches));
      } else {
        setAllMatches(OFFICIAL_RFFM_ALL_MATCHES);
      }
    } catch {
      setStandings(OFFICIAL_RFFM_JORNADA_4_STANDINGS);
      setAllMatches(OFFICIAL_RFFM_ALL_MATCHES);
    }
  }, [selectedJornada, isOpen]);

  if (!isOpen) return null;

  const handleSelectJornada = async (jornada: number) => {
    setSelectedJornada(jornada);
    localStorage.setItem(ACTIVE_JORNADA_KEY, String(jornada));

    setIsLoadingLive(true);
    try {
      const liveStandings = await fetchLiveRFFMClasificacion(jornada);
      const liveMatches = await fetchLiveRFFMResultados(jornada);

      if (liveStandings && liveStandings.length > 0) {
        setStandings(liveStandings);
        localStorage.setItem(`${STORAGE_STANDINGS_KEY}_j${jornada}`, JSON.stringify(liveStandings));
      }

      if (liveMatches && liveMatches.length > 0) {
        setAllMatches(prev => {
          const others = prev.filter(m => m.jornada !== jornada);
          const combined = [...others, ...liveMatches];
          localStorage.setItem(STORAGE_MATCHES_KEY, JSON.stringify(combined));
          return combined;
        });
      }
    } catch (err) {
      console.warn("Could not sync live, keeping current verified data", err);
    } finally {
      setIsLoadingLive(false);
    }
  };

  const handleLiveSync = async () => {
    setIsLoadingLive(true);
    const toastId = toast.loading(`Sincronizando con RFFM.es (Jornada ${selectedJornada})...`);
    try {
      const liveStandings = await fetchLiveRFFMClasificacion(selectedJornada);
      const liveMatches = await fetchLiveRFFMResultados(selectedJornada);

      if (liveStandings && liveStandings.length > 0) {
        setStandings(liveStandings);
        localStorage.setItem(`${STORAGE_STANDINGS_KEY}_j${selectedJornada}`, JSON.stringify(liveStandings));
      }

      if (liveMatches && liveMatches.length > 0) {
        setAllMatches(prev => {
          const others = prev.filter(m => m.jornada !== selectedJornada);
          const combined = [...others, ...liveMatches];
          localStorage.setItem(STORAGE_MATCHES_KEY, JSON.stringify(combined));
          return combined;
        });
      }

      toast.dismiss(toastId);
      toast.success(`¡Clasificación oficial sincronizada en vivo con la RFFM!`);
    } catch {
      toast.dismiss(toastId);
      toast.error('No se pudo conectar con la RFFM. Mostrando datos oficiales.');
    } finally {
      setIsLoadingLive(false);
    }
  };

  const handleOpenRFFMResultados = () => {
    window.open(RFFM_URL_CONFIG.getResultadosUrl(selectedJornada), '_blank', 'noopener,noreferrer');
  };

  const handleResetToOfficialRFFM = () => {
    if (window.confirm('¿Restablecer clasificación y resultados a los datos oficiales de la RFFM?')) {
      localStorage.removeItem(`${STORAGE_STANDINGS_KEY}_j${selectedJornada}`);
      localStorage.removeItem(STORAGE_MATCHES_KEY);
      setStandings(OFFICIAL_RFFM_JORNADA_4_STANDINGS);
      setAllMatches(OFFICIAL_RFFM_ALL_MATCHES);
      setSelectedJornada(4);
      localStorage.setItem(ACTIVE_JORNADA_KEY, '4');
      toast.success('Clasificación restablecida con datos oficiales de la RFFM.');
    }
  };

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

  const myTeam = standings.find(t => t.isMyTeam || t.name.includes('AFE')) || standings[8];
  const leaderTeam = standings[0];

  const filteredStandings = standings.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.shortName && t.shortName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentJornadaMatches = allMatches.filter(m => m.jornada === selectedJornada);
  const myTeamMatches = allMatches.filter(m => m.local.includes('AFE') || m.visitante.includes('AFE'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-3 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[98vh] h-[96vh] sm:h-[94vh] overflow-hidden">
        
        {/* COMPACT TOP HEADER BAR */}
        <div className="px-3.5 py-2 sm:py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/50 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          {/* Left Title & Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-tight whitespace-nowrap">
                  Clasificación Oficial RFFM
                </h2>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                  2ª Infantil G.50
                </span>
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                  J.{selectedJornada} de 26
                </span>
              </div>
            </div>
          </div>

          {/* Center: Jornada Selector & View Tabs */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
              {[1, 2, 3, 4, 5].map((jNum) => {
                const isSelected = selectedJornada === jNum;
                return (
                  <button
                    key={jNum}
                    onClick={() => handleSelectJornada(jNum)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    J.{jNum}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('tabla')}
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  activeTab === 'tabla' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tabla Completa
              </button>
              <button
                onClick={() => setActiveTab('jornadas')}
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  activeTab === 'jornadas' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Partidos J.{selectedJornada}
              </button>
              <button
                onClick={() => setActiveTab('mi_equipo')}
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  activeTab === 'mi_equipo' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                AFE 'B'
              </button>
            </div>
          </div>

          {/* Right: Quick actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              onClick={handleLiveSync}
              disabled={isLoadingLive}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] h-7 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer"
              title="Sincronizar en directo desde RFFM"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingLive ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoadingLive ? 'Cargando...' : 'Actualizar RFFM'}</span>
            </Button>

            <Button
              onClick={() => {
                onClose();
                navigate('/estadisticas-rivales');
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] h-7 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-sm"
              title="Abrir Módulo de Estadísticas Colectivas de Rivales y Franjas de 15 minutos"
            >
              <Swords className="w-3 h-3 text-amber-300" />
              <span className="hidden sm:inline">Estadísticas Rivales</span>
            </Button>

            <Button
              onClick={handleOpenRFFMResultados}
              variant="outline"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 text-[11px] h-7 px-2 rounded-lg flex items-center gap-1 cursor-pointer"
              title="Abrir URL oficial en rffm.es"
            >
              <ExternalLink className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">RFFM.es</span>
            </Button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ULTRA-COMPACT 1-LINE KPI & SEARCH STRIP */}
        <div className="px-3 py-1.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {/* My Team Summary Pill */}
            <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-emerald-300">Tu Equipo:</span>
              <span className="font-black text-white">{myTeam?.pos}º PUESTO</span>
              <span className="text-slate-400">•</span>
              <span className="font-bold text-emerald-400">{myTeam?.pts} PTS</span>
              <span className="text-slate-400 text-[10px]">({myTeam?.pj} PJ: {myTeam?.pg}V-{myTeam?.pe}E-{myTeam?.pp}D)</span>
            </div>

            {/* Leader Pill */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-[11px]">
              <span className="font-bold text-amber-400">1º Líder:</span>
              <span className="font-bold text-slate-200 truncate max-w-[160px]">{leaderTeam?.name}</span>
              <span className="font-black text-amber-300">({leaderTeam?.pts} PTS)</span>
            </div>

            {/* Promotion Zone */}
            <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-400">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>1º y 2º Ascenso Directo</span>
            </div>
          </div>

          {/* Search Input & Reset button */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar equipo..."
                className="bg-slate-900 border border-slate-700 rounded-md pl-6 pr-2 py-0.5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-32 sm:w-44"
              />
            </div>

            <Button
              onClick={handleResetToOfficialRFFM}
              variant="outline"
              className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700 text-[10px] h-6 px-2 rounded cursor-pointer"
              title="Restablecer a oficiales de la RFFM"
            >
              <RotateCcw className="w-2.5 h-2.5 mr-1" />
              <span>Restablecer</span>
            </Button>
          </div>
        </div>

        {/* TAB 1: COMPLETE CLASSIFICATION TABLE (ALL 14 TEAMS VISIBLE WITHOUT SCROLL) */}
        {activeTab === 'tabla' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-2 sm:px-4 py-1">
            <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-slate-800/80 bg-slate-950/40 overflow-hidden">
              <table className="w-full text-left border-collapse h-full">
                {/* Fixed table header */}
                <thead>
                  <tr className="bg-slate-950 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 h-7 select-none">
                    <th className="py-1 px-2 text-center w-10">Pos</th>
                    <th className="py-1 px-2">Equipo</th>
                    <th className="py-1 px-2 text-center font-black text-emerald-400 w-12">PTS</th>
                    <th className="py-1 px-1.5 text-center w-9">PJ</th>
                    <th className="py-1 px-1.5 text-center w-9 text-emerald-400">PG</th>
                    <th className="py-1 px-1.5 text-center w-9 text-amber-400">PE</th>
                    <th className="py-1 px-1.5 text-center w-9 text-rose-400">PP</th>
                    <th className="py-1 px-1.5 text-center w-10 text-slate-300">GF</th>
                    <th className="py-1 px-1.5 text-center w-10 text-slate-400">GC</th>
                    <th className="py-1 px-1.5 text-center w-11 text-slate-200">DG</th>
                    <th className="py-1 px-2 text-center w-24">Racha</th>
                  </tr>
                </thead>

                {/* 14 compact rows filling the exact height */}
                <tbody className="divide-y divide-slate-800/40 text-[11px] sm:text-xs">
                  {filteredStandings.map((team) => {
                    const isPromotion = team.pos <= 2;
                    const isAFE = team.isMyTeam || team.name.includes('AFE');

                    return (
                      <tr 
                        key={team.name}
                        className={`transition-colors ${
                          isAFE 
                            ? 'bg-emerald-950/70 border-l-4 border-l-emerald-500 font-bold text-white shadow-xs' 
                            : isPromotion 
                              ? 'bg-emerald-950/15 hover:bg-slate-800/50 text-slate-200' 
                              : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                        style={{ height: 'calc((100% - 28px) / 14)' }}
                      >
                        {/* Posición */}
                        <td className="py-0.5 px-2 text-center">
                          <div className="flex items-center justify-center">
                            {team.pos === 1 ? (
                              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-[10px] font-black">
                                1
                              </span>
                            ) : team.pos === 2 ? (
                              <span className="w-5 h-5 rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40 flex items-center justify-center text-[10px] font-black">
                                2
                              </span>
                            ) : team.pos === 3 ? (
                              <span className="w-5 h-5 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 flex items-center justify-center text-[10px] font-black">
                                3
                              </span>
                            ) : (
                              <span className={`text-[11px] ${isAFE ? 'font-black text-emerald-400' : 'text-slate-400'}`}>
                                {team.pos}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Equipo y Escudo Oficial */}
                        <td className="py-0.5 px-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="shrink-0 w-5 h-5 rounded bg-slate-900 flex items-center justify-center border border-slate-800 overflow-hidden">
                              {team.escudoUrl ? (
                                <img 
                                  src={team.escudoUrl} 
                                  alt={team.name} 
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : isAFE ? (
                                <UDLaPovedaLogo className="w-4 h-4" />
                              ) : (
                                <RivalBadge rivalName={team.name} size="xs" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <span className={`truncate ${isAFE ? 'font-black text-emerald-300 text-xs' : 'font-semibold text-white'}`} title={team.name}>
                                {team.name}
                              </span>
                              {isAFE && (
                                <span className="text-[9px] uppercase font-black px-1 rounded bg-emerald-500 text-slate-950 shrink-0">
                                  Tu Equipo
                                </span>
                              )}
                              {isPromotion && !isAFE && (
                                <span className="text-[8px] uppercase font-bold px-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                  Ascenso
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* PTS */}
                        <td className="py-0.5 px-2 text-center">
                          <span className={`text-xs sm:text-sm font-black ${isAFE ? 'text-emerald-400' : 'text-white'}`}>
                            {team.pts}
                          </span>
                        </td>

                        {/* PJ */}
                        <td className="py-0.5 px-1.5 text-center text-slate-400 font-semibold text-[11px]">
                          {team.pj}
                        </td>

                        {/* PG */}
                        <td className="py-0.5 px-1.5 text-center text-emerald-400 font-bold text-[11px]">
                          {team.pg}
                        </td>

                        {/* PE */}
                        <td className="py-0.5 px-1.5 text-center text-amber-400 font-bold text-[11px]">
                          {team.pe}
                        </td>

                        {/* PP */}
                        <td className="py-0.5 px-1.5 text-center text-rose-400 font-bold text-[11px]">
                          {team.pp}
                        </td>

                        {/* GF */}
                        <td className="py-0.5 px-1.5 text-center text-slate-300 text-[11px]">
                          {team.gf}
                        </td>

                        {/* GC */}
                        <td className="py-0.5 px-1.5 text-center text-slate-400 text-[11px]">
                          {team.gc}
                        </td>

                        {/* DG */}
                        <td className="py-0.5 px-1.5 text-center font-bold text-[11px]">
                          <span className={team.dg > 0 ? 'text-emerald-400' : team.dg < 0 ? 'text-rose-400' : 'text-slate-400'}>
                            {team.dg > 0 ? `+${team.dg}` : team.dg}
                          </span>
                        </td>

                        {/* Racha */}
                        <td className="py-0.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {team.form && team.form.map((result, rIdx) => {
                              const isWin = result === 'V' || result === 'G';
                              const isDraw = result === 'E';
                              return (
                                <span 
                                  key={rIdx}
                                  className={`w-3.5 h-3.5 rounded text-[8px] font-black flex items-center justify-center ${
                                    isWin 
                                      ? 'bg-emerald-500 text-slate-950' 
                                      : isDraw 
                                        ? 'bg-amber-500 text-slate-950' 
                                        : 'bg-rose-500 text-white'
                                  }`}
                                  title={isWin ? 'Victoria' : isDraw ? 'Empate' : 'Derrota'}
                                >
                                  {isWin ? 'G' : isDraw ? 'E' : 'P'}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PARTIDOS DE LA JORNADA */}
        {activeTab === 'jornadas' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between pb-1 text-xs text-slate-400 border-b border-slate-800">
              <span className="font-bold text-white flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>7 Partidos de la Jornada {selectedJornada}</span>
              </span>
              <span>Resultados extraídos de las actas de la RFFM</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentJornadaMatches.map((m) => {
                const isAFEMatch = m.local.includes('AFE') || m.visitante.includes('AFE');

                return (
                  <div 
                    key={m.id}
                    className={`rounded-xl p-2.5 border transition-all ${
                      isAFEMatch 
                        ? 'bg-emerald-950/40 border-emerald-500/50' 
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 pb-1 border-b border-slate-800/60">
                      <div className="flex items-center gap-1 font-semibold">
                        <Clock className="w-2.5 h-2.5 text-emerald-400" />
                        <span>{m.fecha} • {m.hora} h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {m.jugado ? (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Acta Oficial
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                            Pendiente
                          </span>
                        )}
                        {isAFEMatch && (
                          <span className="text-[9px] font-black uppercase px-1 rounded bg-emerald-500 text-slate-950">
                            AFE 'B'
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-12 items-center gap-1.5">
                      {/* Local */}
                      <div className="col-span-5 flex items-center gap-1.5 min-w-0">
                        <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800 overflow-hidden">
                          {m.escudoLocal ? (
                            <img src={m.escudoLocal} alt={m.local} className="w-full h-full object-contain" />
                          ) : m.local.includes('AFE') ? (
                            <UDLaPovedaLogo className="w-5 h-5" />
                          ) : (
                            <RivalBadge rivalName={m.local} size="xs" />
                          )}
                        </div>
                        <span className={`text-[11px] truncate ${m.local.includes('AFE') ? 'font-black text-emerald-300' : 'font-semibold text-white'}`} title={m.local}>
                          {m.local}
                        </span>
                      </div>

                      {/* Score */}
                      <div className="col-span-2 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <input
                            type="number"
                            min="0"
                            placeholder="-"
                            value={m.golesLocal !== undefined ? m.golesLocal : ''}
                            onChange={(e) => handleScoreChange(m.id, e.target.value, m.golesVisitante !== undefined ? String(m.golesVisitante) : '')}
                            className={`w-6 h-6 bg-slate-900 border rounded text-center text-xs font-black text-white focus:outline-none focus:border-emerald-500 ${
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
                            className={`w-6 h-6 bg-slate-900 border rounded text-center text-xs font-black text-white focus:outline-none focus:border-emerald-500 ${
                              m.jugado ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-700'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Visitante */}
                      <div className="col-span-5 flex items-center justify-end gap-1.5 text-right min-w-0">
                        <span className={`text-[11px] truncate ${m.visitante.includes('AFE') ? 'font-black text-emerald-300' : 'font-semibold text-white'}`} title={m.visitante}>
                          {m.visitante}
                        </span>
                        <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800 overflow-hidden">
                          {m.escudoVisitante ? (
                            <img src={m.escudoVisitante} alt={m.visitante} className="w-full h-full object-contain" />
                          ) : m.visitante.includes('AFE') ? (
                            <UDLaPovedaLogo className="w-5 h-5" />
                          ) : (
                            <RivalBadge rivalName={m.visitante} size="xs" />
                          )}
                        </div>
                      </div>
                    </div>

                    {m.campo && (
                      <div className="mt-1 pt-1 border-t border-slate-800/40 text-[9px] text-slate-400 flex items-center gap-1 truncate">
                        <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                        <span className="truncate">{m.campo}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TRAYECTORIA AFE 'B' */}
        {activeTab === 'mi_equipo' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between pb-1 text-xs text-slate-400 border-b border-slate-800">
              <span className="font-bold text-white flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>S.A.D. Fundación E.F. AFE 'B' (Todos los partidos)</span>
              </span>
              <span className="font-bold text-emerald-400">Balance: 1V - 2E - 1D (5 Puntos)</span>
            </div>

            <div className="space-y-1.5">
              {myTeamMatches.map((m) => {
                const isHome = m.local.includes('AFE');
                const rivalName = isHome ? m.visitante : m.local;
                const myGoals = isHome ? m.golesLocal : m.golesVisitante;
                const rivalGoals = isHome ? m.golesVisitante : m.golesLocal;

                let resultText = 'Pendiente';
                let resultClass = 'bg-slate-800 text-slate-300';
                if (m.jugado && myGoals !== undefined && rivalGoals !== undefined) {
                  if (myGoals > rivalGoals) {
                    resultText = 'Victoria (+3 pts)';
                    resultClass = 'bg-emerald-500 text-slate-950 font-black';
                  } else if (myGoals === rivalGoals) {
                    resultText = 'Empate (+1 pt)';
                    resultClass = 'bg-amber-500 text-slate-950 font-black';
                  } else {
                    resultText = 'Derrota';
                    resultClass = 'bg-rose-500 text-white font-black';
                  }
                }

                return (
                  <div 
                    key={m.id}
                    className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                        J.{m.jornada}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {isHome ? 'Local' : 'Visitante'} vs {rivalName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {m.fecha} • {m.hora} h • {m.campo}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {m.jugado ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">
                            <span className="text-emerald-400">{myGoals}</span> - <span className="text-slate-300">{rivalGoals}</span>
                          </span>
                          <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded ${resultClass}`}>
                            {resultText}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                          07/11/2026
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ULTRA-SLIM BOTTOM LEGEND & CLOSE BAR */}
        <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-3 truncate">
            <div className="flex items-center gap-1 shrink-0">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/50 inline-block"></span>
              <span>1º y 2º Ascenso Directo</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-slate-500 truncate">
              <span>G: Ganado</span>
              <span>•</span>
              <span>E: Empatado</span>
              <span>•</span>
              <span>P: Perdido</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] h-6 px-3 rounded-lg cursor-pointer"
            >
              Cerrar
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
