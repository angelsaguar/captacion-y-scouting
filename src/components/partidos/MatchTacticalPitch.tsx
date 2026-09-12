import React, { useState, useMemo } from 'react';
import { 
  ArrowRightLeft, 
  Clock, 
  X, 
  Check, 
  Trash2, 
  UserMinus, 
  UserPlus, 
  Compass, 
  Shield, 
  RotateCcw, 
  AlertCircle,
  ChevronDown,
  Sparkles,
  Users,
  Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  POSICIONES_CAMPO, 
  PosicionCampo, 
  getDefaultCampoPosition, 
  MatchPlayerStat 
} from './MatchStatsModal';

export interface MatchSubstitution {
  id: string;
  saleId: string;
  saleNombre: string;
  saleDorsal: string;
  salePosicion: string;
  entraId: string;
  entraNombre: string;
  entraDorsal: string;
  posicionEntra: string;
  minuto: number;
  minutoStr: string;
  timestamp?: string;
}

interface MatchTacticalPitchProps {
  playerStats: MatchPlayerStat[];
  substitutions: MatchSubstitution[];
  onExecuteSubstitution: (sub: MatchSubstitution) => void;
  onRemoveSubstitution: (subId: string) => void;
  onPositionChange: (playerId: string, newPos: string) => void;
  onSelectPlayerForStats: (player: MatchPlayerStat) => void;
  chronoSeconds: number;
  currentMinuteStr: string;
  onClose?: () => void;
}

// Tactical 2D coordinates for the 11 positions on a standard vertical pitch (0-100%)
// Defending goal at the bottom (y=90), attacking goal at the top (y=10)
export const TACTICAL_COORDINATES: Record<PosicionCampo, { x: number; y: number; code: string; color: string }> = {
  'Portero': { x: 50, y: 88, code: 'POR', color: 'from-amber-500 to-yellow-600' },
  'Lateral Izquierdo': { x: 16, y: 72, code: 'LI', color: 'from-blue-500 to-cyan-600' },
  'Central Zurdo': { x: 38, y: 74, code: 'CZ', color: 'from-blue-600 to-indigo-600' },
  'Central Diestro': { x: 62, y: 74, code: 'CD', color: 'from-blue-600 to-indigo-600' },
  'Lateral Derecho': { x: 84, y: 72, code: 'LD', color: 'from-blue-500 to-cyan-600' },
  'Interior Izquierda': { x: 26, y: 52, code: 'II', color: 'from-emerald-500 to-teal-600' },
  'Medio Centro': { x: 50, y: 56, code: 'MC', color: 'from-teal-500 to-cyan-600' },
  'Interior Derecha': { x: 74, y: 52, code: 'ID', color: 'from-emerald-500 to-teal-600' },
  'Extremo Izquierda': { x: 18, y: 28, code: 'EI', color: 'from-purple-500 to-pink-600' },
  'Delantero': { x: 50, y: 20, code: 'DEL', color: 'from-rose-500 to-red-600' },
  'Extremo Derecha': { x: 82, y: 28, code: 'ED', color: 'from-purple-500 to-pink-600' },
};

export default function MatchTacticalPitch({
  playerStats,
  substitutions,
  onExecuteSubstitution,
  onRemoveSubstitution,
  onPositionChange,
  onSelectPlayerForStats,
  chronoSeconds,
  currentMinuteStr,
  onClose
}: MatchTacticalPitchProps) {
  // Dialog / Drawer state for substitution
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string>('');
  const [selectedEntraId, setSelectedEntraId] = useState<string>('');
  const [selectedPosicionEntra, setSelectedPosicionEntra] = useState<string>('');
  
  // Calculate current minute as a numeric integer (default from chrono)
  const currentChronoMinute = useMemo(() => {
    const mins = Math.max(1, Math.floor(chronoSeconds / 60));
    return Math.min(90, mins);
  }, [chronoSeconds]);

  const [subMinute, setSubMinute] = useState<number>(currentChronoMinute || 45);

  // Derive which players are currently ON FIELD vs ON BENCH (taking into account all substitutions)
  const { onFieldPlayers, benchPlayers, currentPositionMap } = useMemo(() => {
    const onFieldIds = new Set<string>();
    const posMap: Record<string, string> = {};

    // 1. Initial on-field players (titulares)
    playerStats.forEach(p => {
      if (p.titular) {
        onFieldIds.add(p.playerId);
        posMap[p.playerId] = p.posicionActiva || getDefaultCampoPosition(p.posicion);
      }
    });

    // If no players are marked titular yet, pick up to 11 convocadas or roster players not marked suplente
    if (onFieldIds.size === 0) {
      const candidates = playerStats.filter(p => !p.suplente);
      candidates.slice(0, 11).forEach(p => {
        onFieldIds.add(p.playerId);
        posMap[p.playerId] = p.posicionActiva || getDefaultCampoPosition(p.posicion);
      });
    }

    // 2. Apply substitutions chronologically
    substitutions.forEach(sub => {
      onFieldIds.delete(sub.saleId);
      onFieldIds.add(sub.entraId);
      if (sub.posicionEntra) {
        posMap[sub.entraId] = sub.posicionEntra;
      }
    });

    const onField = playerStats.filter(p => onFieldIds.has(p.playerId));
    const bench = playerStats.filter(p => !onFieldIds.has(p.playerId));

    return {
      onFieldPlayers: onField,
      benchPlayers: bench,
      currentPositionMap: posMap
    };
  }, [playerStats, substitutions]);

  // Group on-field players by their active tactical position (from dropdown or substitution)
  const playersByTacticalPosition = useMemo(() => {
    const map: Record<PosicionCampo, MatchPlayerStat[]> = {
      'Portero': [],
      'Lateral Izquierdo': [],
      'Central Zurdo': [],
      'Central Diestro': [],
      'Lateral Derecho': [],
      'Interior Izquierda': [],
      'Medio Centro': [],
      'Interior Derecha': [],
      'Extremo Izquierda': [],
      'Delantero': [],
      'Extremo Derecha': []
    };

    onFieldPlayers.forEach(p => {
      const assigned = (currentPositionMap[p.playerId] || p.posicionActiva || getDefaultCampoPosition(p.posicion)) as PosicionCampo;
      if (map[assigned]) {
        map[assigned].push(p);
      } else {
        // Fallback to closest match
        const safePos = getDefaultCampoPosition(assigned);
        map[safePos].push(p);
      }
    });

    return map;
  }, [onFieldPlayers, currentPositionMap]);

  // Open the substitution modal pre-selecting a specific player to come off
  const handleOpenSubForPlayer = (player: MatchPlayerStat) => {
    setSelectedSaleId(player.playerId);
    // Default position for incoming player matches the position of the player who leaves
    const currentPos = currentPositionMap[player.playerId] || player.posicionActiva || getDefaultCampoPosition(player.posicion);
    setSelectedPosicionEntra(currentPos);
    
    // Choose first available bench player if not selected
    if (benchPlayers.length > 0 && !selectedEntraId) {
      setSelectedEntraId(benchPlayers[0].playerId);
    }
    setSubMinute(currentChronoMinute || 45);
    setIsSubModalOpen(true);
  };

  // Open general substitution modal
  const handleOpenGeneralSubModal = () => {
    if (onFieldPlayers.length === 0) {
      toast.error('No hay jugadoras en el campo para sustituir');
      return;
    }
    if (benchPlayers.length === 0) {
      toast.error('No hay jugadoras disponibles en el banquillo');
      return;
    }
    if (!selectedSaleId) {
      setSelectedSaleId(onFieldPlayers[0].playerId);
      const defaultPos = currentPositionMap[onFieldPlayers[0].playerId] || onFieldPlayers[0].posicionActiva || getDefaultCampoPosition(onFieldPlayers[0].posicion);
      setSelectedPosicionEntra(defaultPos);
    }
    if (!selectedEntraId && benchPlayers.length > 0) {
      setSelectedEntraId(benchPlayers[0].playerId);
    }
    setSubMinute(currentChronoMinute || 45);
    setIsSubModalOpen(true);
  };

  // Submit substitution
  const handleConfirmSubstitution = () => {
    if (!selectedSaleId || !selectedEntraId) {
      toast.error('Debes seleccionar la jugadora que sale y la jugadora que entra');
      return;
    }

    const salePlayer = playerStats.find(p => p.playerId === selectedSaleId);
    const entraPlayer = playerStats.find(p => p.playerId === selectedEntraId);

    if (!salePlayer || !entraPlayer) {
      toast.error('Error al encontrar los datos de las jugadoras');
      return;
    }

    const salePos = currentPositionMap[salePlayer.playerId] || salePlayer.posicionActiva || getDefaultCampoPosition(salePlayer.posicion);
    const posEntraFinal = selectedPosicionEntra || salePos;
    const finalMinuto = Math.max(1, Math.min(120, subMinute || currentChronoMinute || 45));
    const finalMinutoStr = `${finalMinuto}'`;

    const newSub: MatchSubstitution = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      saleId: salePlayer.playerId,
      saleNombre: `${salePlayer.nombre} ${salePlayer.apellidos}`.trim(),
      saleDorsal: String(salePlayer.dorsal || ''),
      salePosicion: salePos,
      entraId: entraPlayer.playerId,
      entraNombre: `${entraPlayer.nombre} ${entraPlayer.apellidos}`.trim(),
      entraDorsal: String(entraPlayer.dorsal || ''),
      posicionEntra: posEntraFinal,
      minuto: finalMinuto,
      minutoStr: finalMinutoStr,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    onExecuteSubstitution(newSub);
    setIsSubModalOpen(false);
    setSelectedSaleId('');
    setSelectedEntraId('');
  };

  const salePlayerObj = useMemo(() => {
    return playerStats.find(p => p.playerId === selectedSaleId);
  }, [playerStats, selectedSaleId]);

  const entraPlayerObj = useMemo(() => {
    return playerStats.find(p => p.playerId === selectedEntraId);
  }, [playerStats, selectedEntraId]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full h-full min-h-0 select-none">
      
      {/* LEFT / CENTER: THE INTERACTIVE TACTICAL PITCH */}
      <div className="flex-1 flex flex-col items-center justify-between min-w-0 bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-3 sm:p-4 shadow-xl overflow-hidden relative">
        
        {/* PITCH TOP BAR: Status & Action Buttons */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2.5 mb-3 px-1 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-1.5">
                  <span>Pizarra Táctica en Vivo</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    {onFieldPlayers.length} en Campo
                  </span>
                </h4>
              </div>
              <p className="text-[11px] text-slate-400">
                Posición actual según el desplegable • Toca cualquier jugadora para cambiarla
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleOpenGeneralSubModal}
              size="sm"
              className="h-8 sm:h-9 px-3 text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Hacer Sustitución</span>
            </Button>
          </div>
        </div>

        {/* THE SOCCER PITCH (Tactical Board) */}
        <div className="w-full flex-1 flex items-center justify-center p-1 sm:p-2 min-h-[460px] sm:min-h-[520px]">
          <div 
            className="w-full max-w-[560px] aspect-[1/1.38] bg-gradient-to-b from-[#06331e] via-[#064225] to-[#06331e] border-4 border-slate-900 rounded-3xl relative shadow-[0_0_50px_rgba(6,78,59,0.35)] overflow-hidden"
          >
            {/* Authentic horizontal grass stripes */}
            <div 
              className="absolute inset-0 pointer-events-none" 
              style={{
                backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.06) 50%, rgba(5, 150, 105, 0.02) 50%)',
                backgroundSize: '100% 12.5%'
              }} 
            />

            {/* Tactical pitch chalk lines */}
            <div className="absolute inset-3 sm:inset-4 border-2 border-emerald-400/30 rounded-xl pointer-events-none" />
            
            {/* Halfway line & Center Circle */}
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-emerald-400/30 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 w-[26%] aspect-square rounded-full border-2 border-emerald-400/30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-emerald-400/60 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            {/* Top Penalty Area (Attacking end) */}
            <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 w-[52%] h-[15%] border-b-2 border-l-2 border-r-2 border-emerald-400/30 rounded-b-lg pointer-events-none" />
            <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 w-[26%] h-[5.5%] border-b-2 border-l-2 border-r-2 border-emerald-400/30 rounded-b pointer-events-none" />
            <div className="absolute top-[18.5%] left-1/2 -translate-x-1/2 w-[18%] h-[8%] border-b-2 border-emerald-400/30 rounded-b-full pointer-events-none" />
            <div className="absolute top-[13%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400/60 rounded-full pointer-events-none" />
            {/* Top Goal */}
            <div className="absolute -top-[4px] left-1/2 -translate-x-1/2 w-[22%] h-[6px] bg-white rounded-sm shadow-md pointer-events-none" />

            {/* Bottom Penalty Area (Defending end) */}
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 w-[52%] h-[15%] border-t-2 border-l-2 border-r-2 border-emerald-400/30 rounded-t-lg pointer-events-none" />
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 w-[26%] h-[5.5%] border-t-2 border-l-2 border-r-2 border-emerald-400/30 rounded-t pointer-events-none" />
            <div className="absolute bottom-[18.5%] left-1/2 -translate-x-1/2 w-[18%] h-[8%] border-t-2 border-emerald-400/30 rounded-t-full pointer-events-none" />
            <div className="absolute bottom-[13%] left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400/60 rounded-full pointer-events-none" />
            {/* Bottom Goal */}
            <div className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 w-[22%] h-[6px] bg-white rounded-sm shadow-md pointer-events-none" />

            {/* Corner Arcs */}
            <div className="absolute top-3 left-3 w-4 h-4 border-b-2 border-r-2 border-emerald-400/30 rounded-br-full pointer-events-none" />
            <div className="absolute top-3 right-3 w-4 h-4 border-b-2 border-l-2 border-emerald-400/30 rounded-bl-full pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-t-2 border-r-2 border-emerald-400/30 rounded-tr-full pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-t-2 border-l-2 border-emerald-400/30 rounded-tl-full pointer-events-none" />

            {/* 11 TACTICAL POSITIONS SLOTS (Placed exactly according to POSICIONES_CAMPO) */}
            {(Object.keys(TACTICAL_COORDINATES) as PosicionCampo[]).map(posName => {
              const coord = TACTICAL_COORDINATES[posName];
              const playersInSlot = playersByTacticalPosition[posName] || [];

              return (
                <div
                  key={posName}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1.5 z-20"
                  style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                >
                  {playersInSlot.length > 0 ? (
                    // Render player card(s) placed here
                    <div className="flex items-center gap-1.5">
                      {playersInSlot.map(player => {
                        const hasEnteredAsSub = substitutions.some(s => s.entraId === player.playerId);
                        const currentMinutes = player.minutos ?? 0;

                        return (
                          <div
                            key={player.playerId}
                            onClick={() => handleOpenSubForPlayer(player)}
                            className="group relative cursor-pointer transition-transform hover:scale-110 active:scale-95 flex flex-col items-center"
                            title={`Toca para sustituir a ${player.nombre} #${player.dorsal} (${posName})`}
                          >
                            {/* Dorsal Circle Avatar */}
                            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br ${coord.color} border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-xs sm:text-sm font-mono relative transition-shadow group-hover:ring-4 group-hover:ring-emerald-400/50`}>
                              <span>{player.dorsal || '-'}</span>

                              {/* Substitute in indicator */}
                              {hasEnteredAsSub && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[8px] font-black shadow">
                                  ▲
                                </span>
                              )}

                              {/* Goals indicator */}
                              {(player.goles_metidos || 0) > 0 && (
                                <span className="absolute -bottom-1 -right-1 bg-amber-400 text-black text-[9px] font-black px-1 rounded-full border border-black shadow">
                                  ⚽{player.goles_metidos}
                                </span>
                              )}

                              {/* Yellow card */}
                              {(player.tarjetas_amarillas || 0) > 0 && (
                                <span className="absolute -top-1 -left-1 w-2.5 h-3.5 bg-yellow-400 border border-black rounded-xs shadow" />
                              )}
                            </div>

                            {/* Player Name and Quick Sub Badge */}
                            <div className="mt-1 bg-slate-950/90 border border-white/20 rounded-md px-1.5 py-0.5 text-center shadow-md max-w-[85px] sm:max-w-[100px] truncate group-hover:border-emerald-400 transition-colors">
                              <span className="text-[9px] sm:text-[10px] font-extrabold text-white block truncate leading-tight">
                                {player.nombre.split(' ')[0]} {player.apellidos ? player.apellidos.charAt(0) + '.' : ''}
                              </span>
                              <div className="flex items-center justify-center gap-1 text-[8px] font-bold text-emerald-300">
                                <span>{coord.code}</span>
                                <span>•</span>
                                <span>{currentMinutes}'</span>
                              </div>
                            </div>

                            {/* Hover Action Badge */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg flex items-center gap-0.5 pointer-events-none whitespace-nowrap z-30">
                              <ArrowRightLeft className="w-2.5 h-2.5" />
                              <span>Sustituir</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Empty slot placeholder
                    <div 
                      onClick={handleOpenGeneralSubModal}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-dashed border-emerald-400/40 hover:border-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 flex flex-col items-center justify-center text-emerald-400 cursor-pointer transition-all hover:scale-105"
                      title={`Posición vacía: ${posName}. Toca para hacer una sustitución`}
                    >
                      <span className="text-[8px] font-black">{coord.code}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM TACTICAL SUMMARY FOOTER */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-300">Minuto Actual: <strong className="text-emerald-400">{currentMinuteStr}</strong></span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Toca una jugadora en el campo para sustituirla o pulsa "Hacer Sustitución"
          </span>
        </div>
      </div>

      {/* RIGHT: BENCH (BANQUILLO) & HISTORIAL DE SUSTITUCIONES */}
      <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
        
        {/* BANQUILLO / SUPLENTES DISPONIBLES */}
        <div className="bg-slate-950/80 border border-slate-850 p-3.5 sm:p-4 rounded-2xl flex flex-col shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              <h5 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider">
                Banquillo / Suplentes ({benchPlayers.length})
              </h5>
            </div>
            <span className="text-[10px] font-black text-amber-400 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded">
              Disponibles
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5">
            {benchPlayers.length > 0 ? (
              benchPlayers.map(player => {
                const habitualPos = player.posicionActiva || getDefaultCampoPosition(player.posicion);
                const hasPlayed = (player.minutos || 0) > 0;

                return (
                  <div
                    key={player.playerId}
                    className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/50 p-2 rounded-xl flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-mono font-bold text-xs shrink-0">
                        #{player.dorsal || '-'}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {player.nombre} {player.apellidos}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {habitualPos} {hasPlayed ? `• ${player.minutos}' jugados` : ''}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setSelectedEntraId(player.playerId);
                        if (onFieldPlayers.length > 0 && !selectedSaleId) {
                          setSelectedSaleId(onFieldPlayers[0].playerId);
                          setSelectedPosicionEntra(habitualPos);
                        }
                        setIsSubModalOpen(true);
                      }}
                      className="h-7 px-2 text-[10px] font-black bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Meter</span>
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs italic">
                No hay jugadoras en el banquillo.
              </div>
            )}
          </div>
        </div>

        {/* REGISTRO OFICIAL DE CAMBIOS DEL PARTIDO */}
        <div className="bg-slate-950/80 border border-slate-850 p-3.5 sm:p-4 rounded-2xl flex-1 flex flex-col shadow-lg min-h-[220px]">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
              <h5 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider">
                Cambios Realizados ({substitutions.length})
              </h5>
            </div>
            {substitutions.length > 0 && (
              <span className="text-[10px] font-black text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-2 py-0.5 rounded">
                Registrados
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-72">
            {substitutions.length > 0 ? (
              substitutions.map(sub => (
                <div
                  key={sub.id}
                  className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex flex-col gap-1.5 text-xs shadow-inner"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-cyan-400 bg-cyan-950/80 border border-cyan-500/40 px-1.5 py-0.5 rounded text-[10px]">
                      Min {sub.minutoStr || `${sub.minuto}'`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveSubstitution(sub.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Eliminar / deshacer este cambio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Outgoing player */}
                  <div className="flex items-center gap-1.5 text-rose-300">
                    <UserMinus className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span className="font-bold truncate">
                      Sale #{sub.saleDorsal} {sub.saleNombre}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                      ({sub.salePosicion})
                    </span>
                  </div>

                  {/* Incoming player */}
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <UserPlus className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span className="font-bold truncate">
                      Entra #{sub.entraDorsal} {sub.entraNombre}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-extrabold ml-auto shrink-0">
                      ➜ {sub.posicionEntra}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs italic flex flex-col items-center gap-2">
                <ArrowRightLeft className="w-6 h-6 text-slate-600" />
                <span>No se han realizado sustituciones aún en este encuentro.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL / DRAWER DE SUSTITUCIÓN DIRECTA */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-b border-emerald-500/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-white">
                    Realizar Sustitución de Jugadora
                  </h4>
                  <p className="text-xs text-slate-400">
                    Saca una jugadora del campo y coloca una suplente en la posición deseada
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              
              {/* 1. JUGADORA QUE SALE DEL CAMPO */}
              <div className="bg-slate-950/80 border border-rose-500/40 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>1. Jugadora que SALE del Campo</span>
                  </span>
                  {salePlayerObj && (
                    <span className="text-[10px] font-bold text-slate-400">
                      Posición actual: <strong className="text-white">{currentPositionMap[salePlayerObj.playerId] || salePlayerObj.posicionActiva || getDefaultCampoPosition(salePlayerObj.posicion)}</strong>
                    </span>
                  )}
                </div>

                <select
                  value={selectedSaleId}
                  onChange={(e) => {
                    const newSaleId = e.target.value;
                    setSelectedSaleId(newSaleId);
                    const found = playerStats.find(p => p.playerId === newSaleId);
                    if (found) {
                      const pos = currentPositionMap[found.playerId] || found.posicionActiva || getDefaultCampoPosition(found.posicion);
                      setSelectedPosicionEntra(pos);
                    }
                  }}
                  className="w-full bg-slate-900 text-white font-bold text-sm py-2 px-3 rounded-lg border border-rose-500/40 focus:outline-none focus:border-rose-400 cursor-pointer"
                >
                  <option value="">-- Selecciona la jugadora que sale --</option>
                  {onFieldPlayers.map(p => {
                    const pos = currentPositionMap[p.playerId] || p.posicionActiva || getDefaultCampoPosition(p.posicion);
                    return (
                      <option key={p.playerId} value={p.playerId}>
                        #{p.dorsal} {p.nombre} {p.apellidos} ({pos} • {p.minutos ?? 0}')
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. JUGADORA QUE ENTRA (DEL BANQUILLO) */}
              <div className="bg-slate-950/80 border border-emerald-500/40 rounded-xl p-3 space-y-2">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>2. Jugadora que ENTRA al Campo (Banquillo)</span>
                </span>

                <select
                  value={selectedEntraId}
                  onChange={(e) => setSelectedEntraId(e.target.value)}
                  className="w-full bg-slate-900 text-white font-bold text-sm py-2 px-3 rounded-lg border border-emerald-500/40 focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="">-- Selecciona la jugadora suplente --</option>
                  {benchPlayers.map(p => {
                    const pos = p.posicionActiva || getDefaultCampoPosition(p.posicion);
                    return (
                      <option key={p.playerId} value={p.playerId}>
                        #{p.dorsal} {p.nombre} {p.apellidos} (Habitual: {pos})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 3. POSICIÓN EN LA QUE COLOCAMOS A LA QUE ENTRA + MINUTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Posición Asignada */}
                <div className="bg-slate-950/80 border border-cyan-500/40 rounded-xl p-3 space-y-1.5">
                  <label className="text-[11px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Posición de la que entra</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Posición en la que jugará en el campo
                  </p>
                  <select
                    value={selectedPosicionEntra}
                    onChange={(e) => setSelectedPosicionEntra(e.target.value)}
                    className="w-full bg-slate-900 text-white font-bold text-xs sm:text-sm py-2 px-2.5 rounded-lg border border-cyan-500/40 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <optgroup label="Portería">
                      <option value="Portero">🧤 Portero</option>
                    </optgroup>
                    <optgroup label="Defensa">
                      <option value="Central Diestro">🛡️ Central Diestro</option>
                      <option value="Central Zurdo">🛡️ Central Zurdo</option>
                      <option value="Lateral Derecho">🏃 Lateral Derecho</option>
                      <option value="Lateral Izquierdo">🏃 Lateral Izquierdo</option>
                    </optgroup>
                    <optgroup label="Mediocampo">
                      <option value="Medio Centro">🧠 Medio Centro</option>
                      <option value="Interior Derecha">⚡ Interior Derecha</option>
                      <option value="Interior Izquierda">⚡ Interior Izquierda</option>
                    </optgroup>
                    <optgroup label="Ataque / Extremos">
                      <option value="Extremo Derecha">🚀 Extremo Derecha</option>
                      <option value="Extremo Izquierda">🚀 Extremo Izquierda</option>
                      <option value="Delantero">🎯 Delantero</option>
                    </optgroup>
                  </select>
                </div>

                {/* Minuto del Cambio */}
                <div className="bg-slate-950/80 border border-cyan-500/40 rounded-xl p-3 space-y-1.5">
                  <label className="text-[11px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Minuto del cambio</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Calculado del cronómetro en vivo
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSubMinute(prev => Math.max(1, prev - 5))}
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded cursor-pointer"
                      title="Restar 5 minutos"
                    >
                      -5'
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubMinute(prev => Math.max(1, prev - 1))}
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded cursor-pointer"
                      title="Restar 1 minuto"
                    >
                      -1'
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={subMinute}
                      onChange={(e) => setSubMinute(parseInt(e.target.value) || 1)}
                      className="w-16 text-center bg-slate-900 text-white font-mono font-black text-sm py-1.5 rounded border border-cyan-500/40 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setSubMinute(prev => Math.min(120, prev + 1))}
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded cursor-pointer"
                      title="Sumar 1 minuto"
                    >
                      +1'
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubMinute(prev => Math.min(120, prev + 5))}
                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded cursor-pointer"
                      title="Sumar 5 minutos"
                    >
                      +5'
                    </button>
                  </div>
                </div>

              </div>

              {/* Confirmation Preview */}
              {salePlayerObj && entraPlayerObj && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Minuto {subMinute}': Sale <strong>#{salePlayerObj.dorsal} {salePlayerObj.nombre}</strong> ➔ Entra <strong>#{entraPlayerObj.dorsal} {entraPlayerObj.nombre}</strong> en <strong>{selectedPosicionEntra}</strong>
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="bg-slate-950 border-t border-slate-800 p-4 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubModalOpen(false)}
                className="h-9 px-4 text-xs font-bold border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmSubstitution}
                disabled={!selectedSaleId || !selectedEntraId}
                className="h-9 px-5 text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Confirmar Sustitución</span>
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
