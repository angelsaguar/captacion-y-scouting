import React, { useState, useEffect, useMemo } from 'react';
import { 
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
  Trophy, 
  ArrowRight,
  RefreshCw,
  Clock,
  MapPin,
  CheckCircle2,
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
  getAllTeamCompetitionConfigs,
  createDefaultConfigForTeam,
  extractAndSyncFromCalendarUrl,
  COMPETITION_UPDATED_EVENT
} from '@/lib/teamCompetitions';
import { syncTeamActasFromFederation } from '@/lib/actasArbitrales';
import RivalBadge from '@/components/partidos/RivalBadge';

export default function CompeticionesRivales() {
  const [selectedTeam, setSelectedTeam] = useState<string>(CLUB_TEAMS[0]);
  const [config, setConfig] = useState<TeamCompetitionConfig>(() => 
    getTeamCompetitionConfig(CLUB_TEAMS[0])
  );

  // Single Calendar URL input state
  const [calendarInput, setCalendarInput] = useState<string>(
    config.urlCalendario || 'https://www.rffm.es/competicion/calendario?temporada=22&competicion=26738324&grupo=27306559'
  );
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'equipos' | 'actas' | 'manual'>('equipos');

  // Filter for actas
  const [filterJornada, setFilterJornada] = useState<number | 'all'>('all');

  // New rival form state
  const [showAddRival, setShowAddRival] = useState(false);
  const [newRivalName, setNewRivalName] = useState('');
  const [newRivalShortName, setNewRivalShortName] = useState('');
  const [newRivalIsMyTeam, setNewRivalIsMyTeam] = useState(false);

  // Bulk paste state
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Overview of all teams
  const [allConfigs, setAllConfigs] = useState<Record<string, TeamCompetitionConfig>>(() => 
    getAllTeamCompetitionConfigs()
  );

  useEffect(() => {
    const currentCfg = getTeamCompetitionConfig(selectedTeam);
    setConfig(currentCfg);
    setCalendarInput(currentCfg.urlCalendario || 'https://www.rffm.es/competicion/calendario?temporada=22&competicion=26738324&grupo=27306559');
    setShowAddRival(false);
    setShowBulkPaste(false);
  }, [selectedTeam]);

  useEffect(() => {
    const handleUpdate = () => {
      setAllConfigs(getAllTeamCompetitionConfigs());
      const updated = getTeamCompetitionConfig(selectedTeam);
      setConfig(updated);
    };
    window.addEventListener(COMPETITION_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COMPETITION_UPDATED_EVENT, handleUpdate);
  }, [selectedTeam]);

  const handleSelectTeamChange = (teamName: string) => {
    setSelectedTeam(teamName);
  };

  // 1-Click extraction from Calendar URL
  const handleExtractFromCalendar = async (applyToAll: boolean = false) => {
    if (!calendarInput.trim()) {
      toast.error('Por favor, introduce la URL del calendario oficial de la federación.');
      return;
    }

    setIsExtracting(true);
    const toastId = toast.loading(
      applyToAll 
        ? `Consultando la web de la federación y extrayendo equipos y actas arbitrales para todos los equipos...` 
        : `Consultando la web de la federación para ${selectedTeam}...`
    );

    try {
      if (applyToAll) {
        // Sync selected team first
        const updated = await extractAndSyncFromCalendarUrl(selectedTeam, calendarInput.trim());
        setConfig(updated);

        // Apply same competition and rivals to all club teams
        for (const team of CLUB_TEAMS) {
          if (team !== selectedTeam) {
            await extractAndSyncFromCalendarUrl(team, calendarInput.trim());
          }
        }
        setAllConfigs(getAllTeamCompetitionConfigs());
        toast.success(
          `¡Éxito! Se sincronizaron los ${CLUB_TEAMS.length} equipos y las actas arbitrales para todos los equipos del club.`,
          { id: toastId }
        );
      } else {
        const updated = await extractAndSyncFromCalendarUrl(selectedTeam, calendarInput.trim());
        setConfig(updated);
        setAllConfigs(getAllTeamCompetitionConfigs());
        // Best-effort sync of detailed actas (cards, goals, sanctions, minutes) for Estadísticas/Partidos/Rivales
        await syncTeamActasFromFederation(selectedTeam, calendarInput.trim()).catch((e) => {
          console.warn('Actas detailed sync skipped/partial:', e);
        });
        toast.success(
          `¡Sincronizado! Se extrajo "${updated.categoryName}" con ${updated.rivals.length} equipos y ${updated.matches?.length || 0} actas arbitrales.`,
          { id: toastId }
        );
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      toast.error(err.message || 'Error al extraer los datos desde la URL del calendario.', { id: toastId });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveManual = () => {
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
    setAllConfigs(getAllTeamCompetitionConfigs());
    toast.success(`Configuración de ${selectedTeam} guardada.`);
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
    toast.info('Equipo eliminado de la categoría.');
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
    if (confirm(`¿Restablecer ${selectedTeam} a los valores iniciales del Grupo 50 de Segunda Infantil?`)) {
      const fresh = resetTeamCompetitionConfig(selectedTeam);
      setConfig(fresh);
      setCalendarInput(fresh.urlCalendario);
      setAllConfigs(getAllTeamCompetitionConfigs());
      toast.success(`${selectedTeam} restablecido al Grupo 50.`);
    }
  };

  // Todas las jornadas que se han disputado en la categoría y grupo
  const disputedJornadas = useMemo(() => {
    const list = new Set<number>();
    
    // First from config.jornadasDisputadas if provided by the backend
    if (config.jornadasDisputadas && config.jornadasDisputadas.length > 0) {
      config.jornadasDisputadas.forEach(j => list.add(j));
    }
    
    // Also from matches that have scores or are marked as disputed
    (config.matches || []).forEach(m => {
      const hasScore = m.golesLocal !== '' && m.golesLocal !== null && m.golesLocal !== undefined;
      if (hasScore || m.disputado || m.codacta) {
        list.add(m.jornada);
      }
    });

    if (list.size === 0) {
      return [1, 2, 3, 4, 5];
    }

    return Array.from(list).sort((a, b) => a - b);
  }, [config.matches, config.jornadasDisputadas]);

  // Filter matches
  const displayedMatches: MatchActaRecord[] = useMemo(() => {
    const all = config.matches || [];
    if (filterJornada === 'all') return all;
    return all.filter(m => m.jornada === filterJornada);
  }, [config.matches, filterJornada]);

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-blue-950/50 via-slate-900 to-slate-900 border border-blue-900/50 p-6 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-md shrink-0">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  Extracción Automática desde URL de Calendario
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  RFFM Directo
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Solo necesitas pegar la <strong>URL del calendario oficial</strong>. Desde ese único enlace, la aplicación extrae la categoría, todos los rivales federados con sus escudos y el listado de partidos con enlace directo al <strong>acta arbitral</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {config.urlCalendario && (
              <a
                href={config.urlCalendario}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/30 px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all hover:bg-blue-500/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Calendario RFFM</span>
              </a>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Equipo activo:</span>
            <span className="font-black text-blue-400">{selectedTeam}</span>
            <span className="text-slate-600">•</span>
            <span>{config.categoryName}</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-semibold">{config.rivals.length} Equipos catalogados</span>
          </div>

          {config.lastSync && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Última sincronización: {new Date(config.lastSync).toLocaleString('es-ES')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Left Team Selector | Right Main Calendar Sync Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Team Selector */}
        <div className="lg:col-span-4 bg-slate-900/40 border border-slate-850 p-4 rounded-3xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Equipos del Club ({CLUB_TEAMS.length})</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">Selecciona equipo</span>
          </div>

          <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
            {CLUB_TEAMS.map((team) => {
              const teamCfg = allConfigs[team] || createDefaultConfigForTeam(team);
              const isSelected = selectedTeam === team;
              const rivalCount = teamCfg.rivals?.length || 0;
              const matchesCount = teamCfg.matches?.length || 0;

              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => handleSelectTeamChange(team)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-950/40 border-blue-500 text-white shadow-lg shadow-blue-950/40' 
                      : 'bg-slate-950/70 border-slate-850 text-slate-400 hover:text-white hover:border-slate-750'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-slate-600'}`} />
                      <h4 className="text-xs font-black truncate">{team}</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {teamCfg.categoryName}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-bold block">
                      {rivalCount} rivales
                    </span>
                    {matchesCount > 0 && (
                      <span className="text-[9px] text-emerald-400 font-medium block mt-0.5">
                        {matchesCount} actas
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Single URL Sync & Data Explorer */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* THE SINGLE URL EXTRACTION CARD (Centerpiece) */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 border-2 border-blue-500/40 p-6 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  🔗
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    URL del Calendario Oficial de la Federación (RFFM)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Introduce el enlace del calendario de la federación para <strong>{selectedTeam}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Fuente Oficial RFFM
                </span>
              </div>
            </div>

            {/* Input URL */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Pega aquí la URL del Calendario de la Federación:
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={calendarInput}
                  onChange={(e) => setCalendarInput(e.target.value)}
                  placeholder="https://www.rffm.es/competicion/calendario?temporada=22&competicion=26738324&grupo=27306559"
                  className="w-full bg-slate-950 border border-blue-500/40 rounded-2xl p-3.5 pr-10 text-xs text-blue-200 font-mono font-medium focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all shadow-inner"
                />
                {calendarInput && (
                  <button
                    type="button"
                    onClick={() => setCalendarInput('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                La URL contiene la temporada, competición y grupo (ej. <code className="text-blue-300 font-mono">temporada=22&competicion=26738324&grupo=27306559</code>).
              </p>
            </div>

            {/* Big Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              
              <Button
                type="button"
                onClick={() => handleExtractFromCalendar(false)}
                disabled={isExtracting}
                className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white flex items-center justify-center gap-2 rounded-2xl px-6 py-4 shadow-xl shadow-blue-950/60 cursor-pointer disabled:opacity-50"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Extrayendo Datos de la RFFM...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>⚡ Extraer Toda la Información ({selectedTeam})</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleExtractFromCalendar(true)}
                disabled={isExtracting}
                className="text-xs font-bold border-blue-500/30 text-blue-300 hover:bg-blue-500/10 flex items-center justify-center gap-1.5 rounded-2xl py-3 px-4 cursor-pointer"
                title={`Aplica esta misma competición y rivales a los ${CLUB_TEAMS.length} equipos del club`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Aplicar a Todos los Equipos del Club</span>
              </Button>

            </div>

            {/* Extracted Feedback Card */}
            {config.categoryName && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase flex items-center gap-2">
                      <span>{config.categoryName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {config.temporada}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {config.rivals.length} equipos federados cargados • {config.matches?.length || 0} partidos con acceso al acta arbitral
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetToGrupo50}
                    className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restablecer</span>
                  </Button>
                </div>
              </div>
            )}

          </div>

          {/* TAB NAVIGATION: Equipos vs Actas Arbitrales vs Ajustes */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('equipos')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'equipos'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Equipos y Rivales ({config.rivals.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('actas')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'actas'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Actas Arbitrales ({config.matches?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'manual'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Link className="w-3.5 h-3.5" />
                <span>Enlaces & Manual</span>
              </button>
            </div>
          </div>

          {/* TAB 1: EQUIPOS Y RIVALES */}
          {activeTab === 'equipos' && (
            <div className="bg-slate-900/60 border border-slate-850 p-5 rounded-3xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>Equipos Federados del Grupo ({config.rivals.length} Equipos)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Se muestran automáticamente en los desplegables de <strong>Partidos</strong>, <strong>Estadísticas de Rivales</strong> y <strong>Plan de Partido</strong> para {selectedTeam}.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddRival(true)}
                    className="text-xs bg-slate-900 border-slate-700 hover:bg-slate-800 text-white flex items-center gap-1.5 rounded-xl h-8 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Manual</span>
                  </Button>
                </div>
              </div>

              {/* Inline Add Rival Form */}
              {showAddRival && (
                <form onSubmit={handleAddRival} className="bg-slate-950 p-4 rounded-2xl border border-blue-500/40 space-y-3 animate-in fade-in duration-150">
                  <span className="text-xs font-bold text-blue-300 uppercase block">
                    Añadir equipo a la competición de {selectedTeam}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Nombre Oficial Completo *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. C.D. GETAFE SPORT 'A'"
                        value={newRivalName}
                        onChange={(e) => setNewRivalName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">Nombre Corto</label>
                      <input
                        type="text"
                        placeholder="Ej. Getafe Sport 'A'"
                        value={newRivalShortName}
                        onChange={(e) => setNewRivalShortName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={newRivalIsMyTeam}
                        onChange={(e) => setNewRivalIsMyTeam(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-blue-600"
                      />
                      <span>¿Es nuestro equipo del club ({selectedTeam})?</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddRival(false)}
                        className="text-xs border-slate-800 text-slate-300"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold"
                      >
                        Añadir
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Rivals Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                {config.rivals.map((rival, index) => (
                  <div
                    key={rival.id || index}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all ${
                      rival.isMyTeam
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                        : 'bg-slate-950 border-slate-850 text-white hover:border-slate-750'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {rival.crestUrl ? (
                        <img 
                          src={rival.crestUrl} 
                          alt={rival.shortName} 
                          className="w-7 h-7 object-contain rounded-md bg-white/5 p-0.5 shrink-0" 
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <RivalBadge rivalName={rival.shortName} size="xs" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">#{index + 1}</span>
                          <h5 className="text-xs font-black truncate">{rival.shortName}</h5>
                          {rival.isMyTeam && (
                            <span className="text-[8px] uppercase font-black bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded border border-emerald-500/30 shrink-0">
                              AFE
                            </span>
                          )}
                        </div>
                        <p className="text-[9.5px] text-slate-400 truncate font-medium">
                          {rival.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        title={rival.isMyTeam ? 'Quitar marca de nuestro equipo' : 'Marcar como nuestro equipo'}
                        onClick={() => handleToggleMyTeam(rival.id)}
                        className={`p-1 rounded-lg text-[9px] font-bold ${
                          rival.isMyTeam ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar equipo de la categoría"
                        onClick={() => handleDeleteRival(rival.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {config.rivals.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No hay equipos configurados para esta categoría. Pega la URL del calendario y pulsa "Extraer".
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTAS ARBITRALES & PARTIDOS DEL CALENDARIO */}
          {activeTab === 'actas' && (
            <div className="bg-slate-900/60 border border-slate-850 p-5 rounded-3xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-3">
                <div>
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    <span>Partidos & Actas Arbitrales Federativas ({displayedMatches.length} partidos)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Acceso directo con 1 clic al acta arbitral oficial de cada encuentro en la Real Federación de Fútbol de Madrid.
                  </p>
                </div>

                {/* Desplegable con todas las jornadas disputadas en la categoría y grupo */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Jornadas disputadas:
                  </span>
                  <select
                    value={filterJornada}
                    onChange={(e) => setFilterJornada(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                    className="bg-slate-950 border border-amber-500/30 text-xs text-amber-300 font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer shadow-sm"
                  >
                    <option value="all">Todas las jornadas disputadas ({disputedJornadas.length} jornadas)</option>
                    {disputedJornadas.map(j => {
                      const matchesInJornada = (config.matches || []).filter(m => m.jornada === j);
                      const dateStr = matchesInJornada[0]?.fecha ? ` (${matchesInJornada[0].fecha})` : '';
                      const playedCount = matchesInJornada.filter(m => m.golesLocal !== '' && m.golesLocal !== null && m.golesLocal !== undefined).length;
                      return (
                        <option key={j} value={j}>
                          Jornada {j}{dateStr} — {playedCount > 0 ? `${playedCount} partidos disputados` : `${matchesInJornada.length} partidos`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {displayedMatches.length > 0 ? (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {displayedMatches.map((m, idx) => (
                    <div 
                      key={m.id || idx}
                      className="bg-slate-950/80 border border-slate-850 p-3 rounded-2xl hover:border-slate-750 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      {/* Match Info & Teams */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-mono font-bold">
                            Jornada {m.jornada}
                          </span>
                          <span>•</span>
                          <span>{m.fecha} {m.hora}</span>
                          {m.campo && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]" title={m.campo}>
                                📍 {m.campo}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-start gap-4">
                          {/* Local */}
                          <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
                            {m.escudoLocal && (
                              <img src={m.escudoLocal} alt="" className="w-5 h-5 object-contain shrink-0" />
                            )}
                            <span className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-[220px]">
                              {m.local}
                            </span>
                          </div>

                          {/* Score */}
                          <span className="text-xs font-black font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 shrink-0">
                            {m.golesLocal !== '' && m.golesVisitante !== '' ? `${m.golesLocal} - ${m.golesVisitante}` : 'VS'}
                          </span>

                          {/* Visitante */}
                          <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial justify-end sm:justify-start">
                            <span className="text-xs font-bold text-white truncate max-w-[150px] sm:max-w-[220px] text-right sm:text-left">
                              {m.visitante}
                            </span>
                            {m.escudoVisitante && (
                              <img src={m.escudoVisitante} alt="" className="w-5 h-5 object-contain shrink-0" />
                            )}
                          </div>
                        </div>

                        {m.arbitro && (
                          <p className="text-[9.5px] text-slate-500 font-medium">
                            Árbitro: {m.arbitro}
                          </p>
                        )}
                      </div>

                      {/* Direct Link to Acta Arbitral */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {m.actaUrl ? (
                          <a
                            href={m.actaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Ver Acta Arbitral</span>
                            <ExternalLink className="w-3 h-3 text-amber-400" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">
                            Acta pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs">
                  No hay partidos sincronizados todavía. Pega la URL del calendario y pulsa "Extraer".
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ENLACES & AJUSTES MANUALES */}
          {activeTab === 'manual' && (
            <div className="bg-slate-900/60 border border-slate-850 p-5 rounded-3xl space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Link className="w-4 h-4 text-cyan-400" />
                  <span>Ajustes Manuales y URLs Directas</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Edita manualmente los nombres o enlaces si deseas personalizarlos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase block">Nombre Categoría</label>
                  <input
                    type="text"
                    value={config.categoryName}
                    onChange={(e) => setConfig({ ...config, categoryName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase block">Temporada</label>
                  <input
                    type="text"
                    value={config.temporada}
                    onChange={(e) => setConfig({ ...config, temporada: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-bold"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase block">URL Clasificaciones</label>
                  <input
                    type="url"
                    value={config.urlClasificacion}
                    onChange={(e) => setConfig({ ...config, urlClasificacion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase block">URL Actas Arbitrales</label>
                  <input
                    type="url"
                    value={config.urlActas || ''}
                    onChange={(e) => setConfig({ ...config, urlActas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={handleSaveManual}
                  className="text-xs font-black uppercase bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>Guardar Cambios Manuales</span>
                </Button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
