import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, 
  BarChart3, 
  Clock, 
  ShieldAlert, 
  TrendingUp, 
  Users, 
  Swords, 
  Award,
  Layers,
  Flame,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Hourglass,
  ArrowLeftRight,
  FileText,
  BrainCircuit,
  LayoutDashboard,
  Globe
} from 'lucide-react';
import { computeAllCollectiveStats, RIVAL_TEAMS, COLLECTIVE_MATCHES } from '@/data/rivalStatsData';
import { CLUB_TEAMS } from '@/types';
import { getTeamCompetitionConfig, getTeamRivals, COMPETITION_UPDATED_EVENT } from '@/lib/teamCompetitions';
import TeamCompetitionManagerModal from '@/components/competitions/TeamCompetitionManagerModal';
import { Button } from '@/components/ui/button';
import { RivalAttributionBanner } from '@/components/rivales/RivalAttributionBanner';
import { RivalGeneralTable } from '@/components/rivales/RivalGeneralTable';
import { RivalRankings } from '@/components/rivales/RivalRankings';
import { RivalGoalTimingChart } from '@/components/rivales/RivalGoalTimingChart';
import { RivalSubstitutionsChart } from '@/components/rivales/RivalSubstitutionsChart';
import { RivalIntervalsChart } from '@/components/rivales/RivalIntervalsChart';
import { RivalDisciplineChart } from '@/components/rivales/RivalDisciplineChart';
import { RivalJornadasEvolution } from '@/components/rivales/RivalJornadasEvolution';
import { RivalTeamDossier } from '@/components/rivales/RivalTeamDossier';
import { RivalHeadToHead } from '@/components/rivales/RivalHeadToHead';
import { RivalTechnicalReport } from '@/components/rivales/RivalTechnicalReport';
import { RivalTacticalSimulator } from '@/components/rivales/RivalTacticalSimulator';
import { RivalComprehensiveDashboard } from '@/components/rivales/RivalComprehensiveDashboard';
import { RivalSyncModal } from '@/components/rivales/RivalSyncModal';
import { toast } from 'sonner';

type ActiveTab = 
  | 'general' 
  | 'dashboard'
  | 'simulador'
  | 'informe'
  | 'cambios'
  | 'cronometria'
  | 'rankings' 
  | 'franjas' 
  | 'disciplina' 
  | 'evolucion' 
  | 'dossier' 
  | 'comparador';

export default function EstadisticasRivales() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('general');
  const [selectedClubTeam, setSelectedClubTeam] = useState<string>(CLUB_TEAMS[0]);
  const [showCompModal, setShowCompModal] = useState(false);
  const [compVersion, setCompVersion] = useState(0);

  useEffect(() => {
    const handleCompUpdated = () => setCompVersion(v => v + 1);
    window.addEventListener(COMPETITION_UPDATED_EVENT, handleCompUpdated);
    return () => window.removeEventListener(COMPETITION_UPDATED_EVENT, handleCompUpdated);
  }, []);

  const currentConfig = useMemo(() => getTeamCompetitionConfig(selectedClubTeam), [selectedClubTeam, compVersion]);
  const currentRivals = useMemo(() => getTeamRivals(selectedClubTeam), [selectedClubTeam, compVersion]);

  const [selectedTeamId, setSelectedTeamId] = useState<string>('team-afe-b');
  const [compareTeamA, setCompareTeamA] = useState<string>('team-afe-b');
  const [compareTeamB, setCompareTeamB] = useState<string>('team-retiro-sur');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // Sync selectedTeamId with active club team
  useEffect(() => {
    const myTeam = currentRivals.find(r => r.isMyTeam);
    const firstRival = currentRivals.find(r => !r.isMyTeam);
    if (myTeam) {
      setSelectedTeamId(myTeam.id);
      setCompareTeamA(myTeam.id);
    } else if (currentRivals[0]) {
      setSelectedTeamId(currentRivals[0].id);
      setCompareTeamA(currentRivals[0].id);
    }
    if (firstRival) {
      setCompareTeamB(firstRival.id);
    }
  }, [selectedClubTeam, currentRivals]);

  // Re-compute all stats whenever dataVersion or currentRivals updates
  const stats = useMemo(() => {
    return computeAllCollectiveStats(COLLECTIVE_MATCHES, 'all', undefined, currentRivals);
  }, [dataVersion, currentRivals]);

  const totalGfGrupo = useMemo(() => stats.reduce((acc, s) => acc + s.gf, 0), [stats]);
  const totalPjGrupo = useMemo(() => stats.reduce((acc, s) => acc + s.pj, 0) / 2, [stats]);
  const promedioGolesPartido = totalPjGrupo > 0 ? (totalGfGrupo / totalPjGrupo).toFixed(2) : '0';
  const lider = stats[0];
  const ourTeam = stats.find(s => s.team.isMyTeam);

  const handleSelectTeamFromTable = (teamId: string) => {
    setSelectedTeamId(teamId);
    setActiveTab('dossier');
  };

  const handlePrepareReport = (teamId: string) => {
    setSelectedTeamId(teamId);
    setActiveTab('informe');
  };

  const handleOpenSimulator = (teamId: string) => {
    setSelectedTeamId(teamId);
    setActiveTab('simulador');
  };

  const handleOpenDashboard = (teamId: string) => {
    setSelectedTeamId(teamId);
    setActiveTab('dashboard');
  };

  const handleStartComparison = (teamA: string, teamB: string) => {
    setCompareTeamA(teamA);
    setCompareTeamB(teamB);
    setActiveTab('comparador');
  };

  const tabsConfig = [
    { id: 'general', label: 'Tabla Colectiva', icon: Layers },
    { id: 'dashboard', label: 'Dashboard Rival', icon: LayoutDashboard },
    { id: 'simulador', label: 'Simulador Táctico', icon: BrainCircuit },
    { id: 'informe', label: 'Informe Técnico', icon: FileText },
    { id: 'cambios', label: 'Sustituciones', icon: ArrowLeftRight },
    { id: 'cronometria', label: 'Cronometría', icon: Hourglass },
    { id: 'rankings', label: 'Rankings Top', icon: Award },
    { id: 'franjas', label: 'Franjas (15\')', icon: Clock },
    { id: 'disciplina', label: 'Disciplina', icon: ShieldAlert },
    { id: 'evolucion', label: 'Evolución', icon: TrendingUp },
    { id: 'dossier', label: 'Ficha 360°', icon: Users },
    { id: 'comparador', label: 'Comparador', icon: Swords },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-2 sm:p-4">
      
      {/* 0. Selector de Equipo del Club y Competición Activa */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-auto flex flex-col gap-1.5">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Equipo del Club a Examinar
            </label>
            <select
              value={selectedClubTeam}
              onChange={(e) => setSelectedClubTeam(e.target.value)}
              className="bg-slate-950 text-cyan-300 font-black text-sm border border-cyan-800/40 rounded-xl px-4 py-2 focus:outline-none focus:border-cyan-400 transition-all cursor-pointer"
            >
              {CLUB_TEAMS.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          <div className="pt-1 sm:pt-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-3 py-1 rounded-xl bg-cyan-950/60 border border-cyan-800/40 text-cyan-300">
                🏆 {currentConfig.categoryName} ({currentConfig.temporada})
              </span>
              {currentConfig.urlClasificacion && (
                <a
                  href={currentConfig.urlClasificacion}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 hover:underline"
                  title="Abrir enlace oficial en web de la federación"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Web RFFM ↗</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            onClick={() => setShowCompModal(true)}
            className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-900/70 to-blue-900/70 hover:from-cyan-800 hover:to-blue-800 border border-cyan-500/40 text-cyan-300 flex items-center gap-2 rounded-xl h-10 px-4 cursor-pointer shadow-md"
            title="Configurar URLs de resultados, temporadas y rivales para este equipo"
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Calendario & Rivales RFFM</span>
          </Button>
        </div>
      </div>

      {/* 1. Official Attribution & Privacy Banner */}
      <RivalAttributionBanner 
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        dataVersion={dataVersion}
      />

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Leader Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Líder del Grupo</span>
            <h4 className="text-sm font-black text-white truncate">{lider?.team.shortName}</h4>
            <p className="text-[11px] text-amber-400 font-semibold">{lider?.puntos} pts • {lider?.gf} GF</p>
          </div>
        </div>

        {/* Our Team Card */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Nuestro Equipo</span>
            <h4 className="text-sm font-black text-white truncate">{ourTeam?.team.shortName}</h4>
            <p className="text-[11px] text-emerald-400 font-semibold">{ourTeam?.pos}º Puesto • {ourTeam?.puntos} pts</p>
          </div>
        </div>

        {/* Total Goals Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Goles Totales Grupo</span>
            <h4 className="text-xl font-black text-white">{totalGfGrupo} Goles</h4>
            <p className="text-[11px] text-slate-400 font-semibold">{promedioGolesPartido} goles/partido</p>
          </div>
        </div>

        {/* Fair play card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Equipos Catalogados</span>
            <h4 className="text-xl font-black text-white">14 Equipos</h4>
            <p className="text-[11px] text-purple-400 font-semibold">100% Colectivo RFFM</p>
          </div>
        </div>
      </div>

      {/* 3. Navigation Sub-Tabs: 100% visible on screen without scroll */}
      <div className="bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl shadow-xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1.5">
          {tabsConfig.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                title={tab.label}
                className={`px-2 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 font-black ring-1 ring-blue-400/40'
                    : 'bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Tab Content */}
      <div className="space-y-6">
        {activeTab === 'general' && (
          <RivalGeneralTable
            stats={stats}
            onSelectTeam={handleSelectTeamFromTable}
            selectedTeamId={selectedTeamId}
            onDataUpdated={() => setDataVersion(v => v + 1)}
          />
        )}

        {activeTab === 'dashboard' && (
          <RivalComprehensiveDashboard
            stats={stats}
            initialTeamId={selectedTeamId}
            onOpenSimulator={handleOpenSimulator}
            onOpenReport={handlePrepareReport}
            onOpenDossier={handleSelectTeamFromTable}
          />
        )}

        {activeTab === 'simulador' && (
          <RivalTacticalSimulator
            stats={stats}
            initialTeamId={selectedTeamId}
            onOpenReport={handlePrepareReport}
            onOpenDashboard={handleOpenDashboard}
          />
        )}

        {activeTab === 'rankings' && (
          <RivalRankings
            stats={stats}
            onSelectTeam={handleSelectTeamFromTable}
          />
        )}

        {activeTab === 'informe' && (
          <RivalTechnicalReport
            stats={stats}
            initialTeamId={selectedTeamId}
            onSelectTeamDossier={handleSelectTeamFromTable}
            onOpenSimulator={handleOpenSimulator}
          />
        )}

        {activeTab === 'cambios' && (
          <RivalSubstitutionsChart
            stats={stats}
            onSelectTeam={handleSelectTeamFromTable}
          />
        )}

        {activeTab === 'cronometria' && (
          <RivalGoalTimingChart
            stats={stats}
            onSelectTeam={handleSelectTeamFromTable}
          />
        )}

        {activeTab === 'franjas' && (
          <RivalIntervalsChart
            stats={stats}
            selectedTeamId={selectedTeamId}
            onSelectTeam={(id) => setSelectedTeamId(id)}
          />
        )}

        {activeTab === 'disciplina' && (
          <RivalDisciplineChart
            stats={stats}
            selectedClubTeam={selectedClubTeam}
            onSelectTeam={handleSelectTeamFromTable}
          />
        )}

        {activeTab === 'evolucion' && (
          <RivalJornadasEvolution
            stats={stats}
            onSelectTeam={handleSelectTeamFromTable}
          />
        )}

        {activeTab === 'dossier' && (
          <RivalTeamDossier
            stats={stats}
            initialTeamId={selectedTeamId}
            onBack={() => setActiveTab('general')}
            onSelectCompare={(tA, tB) => handleStartComparison(tA, tB)}
            onPrepareReport={handlePrepareReport}
            onOpenSimulator={handleOpenSimulator}
          />
        )}

        {activeTab === 'comparador' && (
          <RivalHeadToHead
            stats={stats}
            initialTeamAId={compareTeamA}
            initialTeamBId={compareTeamB}
            onSelectTeamDossier={(id) => {
              setSelectedTeamId(id);
              setActiveTab('dossier');
            }}
          />
        )}
      </div>

      {/* 5. Sync & Management Modal */}
      <RivalSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onDataUpdated={() => setDataVersion(v => v + 1)}
      />

      {/* 6. Competition & URLs Manager Modal */}
      <TeamCompetitionManagerModal
        isOpen={showCompModal}
        onClose={() => setShowCompModal(false)}
        initialTeamName={selectedClubTeam}
      />

    </div>
  );
}
