import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  Link, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  FileText, 
  Check, 
  Shield, 
  Users, 
  Calendar,
  Sparkles,
  Layers,
  ClipboardPaste,
  HelpCircle,
  RefreshCw,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CLUB_TEAMS } from '@/types';
import { RivalTeam } from '@/types/rivals';
import { TeamCompetitionConfig, MatchActaRecord } from '@/types/competitions';
import { 
  getTeamCompetitionConfig, 
  saveTeamCompetitionConfig, 
  resetTeamCompetitionConfig,
  extractAndSyncFromCalendarUrl
} from '@/lib/teamCompetitions';
import RivalBadge from '@/components/partidos/RivalBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialTeamName?: string;
  onSaved?: (teamName: string) => void;
}

export default function TeamCompetitionManagerModal({
  isOpen,
  onClose,
  initialTeamName = CLUB_TEAMS[0],
  onSaved
}: Props) {
  const [selectedTeam, setSelectedTeam] = useState<string>(initialTeamName);
  const [config, setConfig] = useState<TeamCompetitionConfig>(() => 
    getTeamCompetitionConfig(initialTeamName)
  );

  // Single Calendar URL input state
  const [calendarInput, setCalendarInput] = useState<string>(
    config.urlCalendario || 'https://www.rffm.es/competicion/calendario?temporada=22&competicion=26738324&grupo=27306559'
  );
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'rivales' | 'actas'>('sync');
  const [filterJornada, setFilterJornada] = useState<number | 'all'>('all');

  // New rival form state
  const [showAddRival, setShowAddRival] = useState(false);
  const [newRivalName, setNewRivalName] = useState('');
  const [newRivalShortName, setNewRivalShortName] = useState('');
  const [newRivalIsMyTeam, setNewRivalIsMyTeam] = useState(false);

  // Todas las jornadas disputadas en la categoría
  const disputedJornadas = React.useMemo(() => {
    const list = new Set<number>();
    if (config.jornadasDisputadas && config.jornadasDisputadas.length > 0) {
      config.jornadasDisputadas.forEach(j => list.add(j));
    }
    (config.matches || []).forEach(m => {
      const hasScore = m.golesLocal !== '' && m.golesLocal !== null && m.golesLocal !== undefined;
      if (hasScore || m.disputado || m.codacta) {
        list.add(m.jornada);
      }
    });
    if (list.size === 0) return [1, 2, 3, 4, 5];
    return Array.from(list).sort((a, b) => a - b);
  }, [config.matches, config.jornadasDisputadas]);

  const displayedMatches = React.useMemo(() => {
    const all = config.matches || [];
    if (filterJornada === 'all') return all;
    return all.filter(m => m.jornada === filterJornada);
  }, [config.matches, filterJornada]);

  useEffect(() => {
    if (isOpen) {
      setSelectedTeam(initialTeamName);
      const currentCfg = getTeamCompetitionConfig(initialTeamName);
      setConfig(currentCfg);
      setCalendarInput(currentCfg.urlCalendario || 'https://www.rffm.es/competicion/calendario?temporada=22&competicion=26738324&grupo=27306559');
      setShowAddRival(false);
    }
  }, [isOpen, initialTeamName]);

  const handleSelectTeamChange = (teamName: string) => {
    setSelectedTeam(teamName);
    const currentCfg = getTeamCompetitionConfig(teamName);
    setConfig(currentCfg);
    setCalendarInput(currentCfg.urlCalendario || 'https://www.rffm.es/competicion/calendario?temporada=22&competicion=26738324&grupo=27306559');
    setShowAddRival(false);
  };

  // 1-Click extraction from single calendar URL
  const handleExtractFromCalendar = async () => {
    if (!calendarInput.trim()) {
      toast.error('Por favor, indica la URL del calendario de la Federación.');
      return;
    }

    setIsExtracting(true);
    const toastId = toast.loading(`Extrayendo equipos, clasificación y actas de la RFFM para ${selectedTeam}...`);

    try {
      const updated = await extractAndSyncFromCalendarUrl(selectedTeam, calendarInput.trim());
      setConfig(updated);
      toast.success(
        `¡Sincronizado! Se cargaron ${updated.rivals.length} equipos y ${updated.matches?.length || 0} actas arbitrales.`,
        { id: toastId }
      );
      if (onSaved) onSaved(selectedTeam);
    } catch (err: any) {
      toast.error(err.message || 'Error al extraer la información del calendario.', { id: toastId });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = () => {
    if (!config.categoryName.trim()) {
      toast.error('Indica el nombre de la categoría o competición.');
      return;
    }
    if (!config.temporada.trim()) {
      toast.error('Indica la temporada activa (ej. 2026-2027).');
      return;
    }
    if (config.rivals.length === 0) {
      toast.error('La competición debe tener al menos un equipo rival.');
      return;
    }

    saveTeamCompetitionConfig({
      ...config,
      urlCalendario: calendarInput.trim() || config.urlCalendario
    });
    toast.success(`Configuración de ${selectedTeam} guardada con éxito.`);
    if (onSaved) onSaved(selectedTeam);
    onClose();
  };

  const handleAddRival = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRivalName.trim()) {
      toast.error('El nombre del equipo es obligatorio.');
      return;
    }
    const shortName = newRivalShortName.trim() || newRivalName.trim();
    const id = `team-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    
    const newRival: RivalTeam = {
      id,
      name: newRivalName.trim().toUpperCase(),
      shortName,
      crestUrl: '',
      isMyTeam: newRivalIsMyTeam
    };

    const updated = {
      ...config,
      rivals: [...config.rivals, newRival]
    };
    setConfig(updated);
    saveTeamCompetitionConfig(updated);

    setNewRivalName('');
    setNewRivalShortName('');
    setNewRivalIsMyTeam(false);
    setShowAddRival(false);
    toast.success(`Equipo ${shortName} añadido.`);
  };

  const handleDeleteRival = (rivalId: string) => {
    const updated = {
      ...config,
      rivals: config.rivals.filter(r => r.id !== rivalId)
    };
    setConfig(updated);
    saveTeamCompetitionConfig(updated);
    toast.info('Equipo eliminado.');
  };

  const handleToggleMyTeam = (rivalId: string) => {
    const updated = {
      ...config,
      rivals: config.rivals.map(r => ({
        ...r,
        isMyTeam: r.id === rivalId ? !r.isMyTeam : r.isMyTeam
      }))
    };
    setConfig(updated);
    saveTeamCompetitionConfig(updated);
  };

  const handleResetToGrupo50 = () => {
    if (confirm(`¿Restablecer la competición y rivales de ${selectedTeam} a los valores iniciales del Grupo 50 de Segunda Infantil?`)) {
      const fresh = resetTeamCompetitionConfig(selectedTeam);
      setConfig(fresh);
      setCalendarInput(fresh.urlCalendario);
      toast.success(`Competición de ${selectedTeam} restablecida al Grupo 50.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
                <span>Extracción Automática desde URL de Calendario</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  RFFM Oficial
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Pega la URL del calendario y obtén al instante los equipos, clasificación y enlaces a las actas arbitrales.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* 1. Selector de Equipo Activo del Club */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Equipo del Club a Configurar
              </label>
              <p className="text-xs text-slate-400">
                Selecciona para qué equipo del club deseas sincronizar o ver el calendario y sus rivales:
              </p>
            </div>
            <select
              value={selectedTeam}
              onChange={(e) => handleSelectTeamChange(e.target.value)}
              className="bg-slate-900 border border-blue-500/40 rounded-xl px-4 py-2.5 text-sm font-black text-blue-300 focus:outline-none focus:border-blue-400 transition-all cursor-pointer min-w-[220px]"
            >
              {CLUB_TEAMS.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          {/* 2. THE SINGLE CALENDAR URL INPUT BOX */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/20 border-2 border-blue-500/40 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span>URL del Calendario Oficial de la Federación (RFFM)</span>
              </label>
              {config.urlCalendario && (
                <a
                  href={config.urlCalendario}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Abrir web federación</span>
                </a>
              )}
            </div>

            <input
              type="url"
              value={calendarInput}
              onChange={(e) => setCalendarInput(e.target.value)}
              placeholder="https://www.rffm.es/competicion/calendario?temporada=22&competicion=26738324&grupo=27306559"
              className="w-full bg-slate-950 border border-blue-500/40 rounded-xl p-3 text-xs text-blue-200 font-mono focus:outline-none focus:border-blue-400"
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <Button
                type="button"
                onClick={handleExtractFromCalendar}
                disabled={isExtracting}
                className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white flex items-center justify-center gap-2 rounded-xl px-5 py-3 shadow-lg shadow-blue-950/60 cursor-pointer disabled:opacity-50"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Extrayendo de la Federación...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>⚡ Extraer Equipos, Clasificación y Actas ({selectedTeam})</span>
                  </>
                )}
              </Button>

              <span className="text-[11px] text-slate-400 self-center">
                Categoría activa: <strong className="text-white">{config.categoryName}</strong>
              </span>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('sync')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'sync' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Equipos de la Categoría ({config.rivals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('actas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'actas' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Actas Arbitrales ({config.matches?.length || 0})
            </button>
          </div>

          {/* Tab 1: Rivales */}
          {activeTab === 'sync' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Listado de Rivales ({config.rivals.length})
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddRival(true)}
                  className="text-xs border-slate-700 text-slate-300 h-7"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  <span>Añadir</span>
                </Button>
              </div>

              {showAddRival && (
                <form onSubmit={handleAddRival} className="bg-slate-950 p-3 rounded-xl border border-blue-500/40 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Nombre oficial completo"
                      value={newRivalName}
                      onChange={(e) => setNewRivalName(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Nombre corto"
                      value={newRivalShortName}
                      onChange={(e) => setNewRivalShortName(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddRival(false)} className="text-xs">Cancelar</Button>
                    <Button type="submit" size="sm" className="text-xs bg-blue-600">Guardar</Button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[260px] overflow-y-auto pr-1">
                {config.rivals.map((rival, index) => (
                  <div
                    key={rival.id || index}
                    className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                      rival.isMyTeam
                        ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                        : 'bg-slate-950 border-slate-850 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {rival.crestUrl ? (
                        <img src={rival.crestUrl} alt="" className="w-6 h-6 object-contain shrink-0" />
                      ) : (
                        <RivalBadge rivalName={rival.shortName} size="xs" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono text-slate-400">#{index + 1}</span>
                          <h5 className="text-xs font-black truncate">{rival.shortName}</h5>
                        </div>
                        <p className="text-[9px] text-slate-400 truncate">{rival.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleMyTeam(rival.id)}
                        className={`p-1 rounded ${rival.isMyTeam ? 'text-emerald-400' : 'text-slate-500'}`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRival(rival.id)}
                        className="p-1 text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Actas */}
          {activeTab === 'actas' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    <span>Actas Arbitrales Federativas ({displayedMatches.length} partidos)</span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Filtra por cualquier jornada disputada en la categoría y grupo.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Jornada:</span>
                  <select
                    value={filterJornada}
                    onChange={(e) => setFilterJornada(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    className="bg-slate-950 border border-amber-500/30 text-xs text-amber-300 font-bold rounded-xl px-2.5 py-1 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="all">Todas las disputadas ({disputedJornadas.length})</option>
                    {disputedJornadas.map(j => {
                      const jMatches = (config.matches || []).filter(m => m.jornada === j);
                      const dateStr = jMatches[0]?.fecha ? ` (${jMatches[0].fecha})` : '';
                      return (
                        <option key={j} value={j}>
                          Jornada {j}{dateStr}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {displayedMatches.length > 0 ? (
                  displayedMatches.map((m, idx) => (
                    <div key={m.id || idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between gap-2 text-xs hover:border-slate-750 transition-all">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-bold">
                            Jornada {m.jornada}
                          </span>
                          <span className="text-[10px] text-slate-400">• {m.fecha} {m.hora}</span>
                        </div>
                        <p className="text-xs font-bold text-white truncate mt-0.5">
                          {m.local} <span className="text-amber-400 font-mono font-black">{m.golesLocal !== '' ? `(${m.golesLocal} - ${m.golesVisitante})` : 'vs'}</span> {m.visitante}
                        </p>
                      </div>
                      {m.actaUrl && (
                        <a
                          href={m.actaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Ver Acta</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No hay actas sincronizadas para esta jornada.
                  </div>
                )}
              </div>
            </div>
          )}


        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleResetToGrupo50}
            className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer {selectedTeam} a Grupo 50 Inicial</span>
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto text-xs font-bold border-slate-800 text-slate-300"
            >
              Cerrar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="w-full sm:w-auto text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-blue-950/50"
            >
              <Save className="w-4 h-4" />
              <span>Guardar ({selectedTeam})</span>
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
