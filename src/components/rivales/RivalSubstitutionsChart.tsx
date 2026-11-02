import React, { useState, useMemo } from 'react';
import { 
  TeamCollectiveStats, 
  CollectiveSubstitutionEvent,
  SubstitutionPeriod
} from '@/types/rivals';
import { 
  ArrowLeftRight, 
  Clock, 
  TrendingUp, 
  ShieldCheck, 
  AlertCircle, 
  Info, 
  Calendar, 
  BarChart3, 
  SlidersHorizontal,
  Hourglass,
  Layers
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  Cell
} from 'recharts';

interface RivalSubstitutionsChartProps {
  stats: TeamCollectiveStats[];
  onSelectTeam?: (teamId: string) => void;
}

type GraphMode = 'periodos' | 'densidad' | 'primer_cambio' | 'franjas';
type PeriodFilter = 'all' | '1T' | 'descanso' | '2T';

export const RivalSubstitutionsChart: React.FC<RivalSubstitutionsChartProps> = ({ 
  stats,
  onSelectTeam
}) => {
  const [graphMode, setGraphMode] = useState<GraphMode>('periodos');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');

  // Group-wide substitution calculations
  const globalSummary = useMemo(() => {
    let totalSubs = 0;
    let total1T = 0;
    let totalDescanso = 0;
    let total2T = 0;
    let earliestSubMin = 999;
    let earliestSubTeam = '';
    let earliestSubJornada = 1;
    let sumMinutes = 0;
    const minuteCounts: Record<number, number> = {};

    // Initialize 1..70 minutes
    for (let m = 1; m <= 70; m++) {
      minuteCounts[m] = 0;
    }

    stats.forEach(teamStats => {
      const sub = teamStats.substitutions;
      totalSubs += sub.totalCambios;
      total1T += sub.cambiosPrimeraParte;
      totalDescanso += sub.cambiosDescanso;
      total2T += sub.cambiosSegundaParte;

      if (sub.minutoPrimerCambio !== null && sub.minutoPrimerCambio < earliestSubMin) {
        earliestSubMin = sub.minutoPrimerCambio;
        earliestSubTeam = teamStats.team.shortName;
        earliestSubJornada = sub.minutoPrimerCambioJornada || 1;
      }

      sub.eventos.forEach(ev => {
        sumMinutes += ev.minuto;
        const validMin = Math.max(1, Math.min(70, ev.minuto));
        minuteCounts[validMin] = (minuteCounts[validMin] || 0) + 1;
      });
    });

    const avgMinute = totalSubs > 0 ? parseFloat((sumMinutes / totalSubs).toFixed(1)) : 0;
    const pct1T = totalSubs > 0 ? Math.round((total1T / totalSubs) * 100) : 0;
    const pctDescanso = totalSubs > 0 ? Math.round((totalDescanso / totalSubs) * 100) : 0;
    const pct2T = totalSubs > 0 ? Math.round((total2T / totalSubs) * 100) : 0;
    const avgPerTeamMatch = stats.length > 0 && stats[0].pj > 0 
      ? (totalSubs / (stats.length * stats[0].pj)).toFixed(1) 
      : '0';

    return {
      totalSubs,
      total1T,
      pct1T,
      totalDescanso,
      pctDescanso,
      total2T,
      pct2T,
      earliestSubMin: earliestSubMin < 999 ? earliestSubMin : null,
      earliestSubTeam,
      earliestSubJornada,
      avgMinute,
      avgPerTeamMatch,
      minuteCounts
    };
  }, [stats]);

  // Data for Chart 1: Reparto de Períodos por Equipo
  const periodData = useMemo(() => {
    return stats.map(s => ({
      teamId: s.team.id,
      name: s.team.shortName,
      isMyTeam: s.team.isMyTeam,
      primeraParte: s.substitutions.cambiosPrimeraParte,
      descanso: s.substitutions.cambiosDescanso,
      segundaParte: s.substitutions.cambiosSegundaParte,
      total: s.substitutions.totalCambios,
      minutoMedio: s.substitutions.minutoMedioCambios,
      primerCambio: s.substitutions.minutoPrimerCambio ?? 70,
      pct1T: s.substitutions.porcentajePrimeraParte,
      pctDescanso: s.substitutions.porcentajeDescanso,
      pct2T: s.substitutions.porcentajeSegundaParte,
    }));
  }, [stats]);

  // Data for Chart 2: Timeline Curve (Minuto a Minuto 1' a 70')
  const timelineData = useMemo(() => {
    const activeTeamStats = selectedTeamFilter !== 'all' 
      ? stats.find(s => s.team.id === selectedTeamFilter)
      : null;

    const data: { minuto: number; cambios: number; periodo: string; label: string }[] = [];

    for (let m = 1; m <= 70; m++) {
      let count = 0;
      if (activeTeamStats) {
        count = activeTeamStats.substitutions.eventos.filter(e => e.minuto === m).length;
      } else {
        count = globalSummary.minuteCounts[m] || 0;
      }

      let periodo = '1ª Parte';
      if (m === 35) periodo = 'Descanso';
      else if (m > 35) periodo = '2ª Parte';

      data.push({
        minuto: m,
        cambios: count,
        periodo,
        label: `${m}'`
      });
    }

    return data;
  }, [stats, selectedTeamFilter, globalSummary]);

  // Data for Chart 3: Minuto Primer Cambio (Anticipación)
  const primerCambioData = useMemo(() => {
    return [...stats]
      .filter(s => s.substitutions.minutoPrimerCambio !== null)
      .map(s => ({
        name: s.team.shortName,
        teamId: s.team.id,
        isMyTeam: s.team.isMyTeam,
        minutoPrimerCambio: s.substitutions.minutoPrimerCambio!,
        minutoMedio: s.substitutions.minutoMedioCambios,
        jornada: s.substitutions.minutoPrimerCambioJornada
      }))
      .sort((a, b) => a.minutoPrimerCambio - b.minutoPrimerCambio);
  }, [stats]);

  // Data for Chart 4: Franjas agrupadas
  const franjasData = useMemo(() => {
    const franjasKeys = [
      { key: '1-15', label: "1' a 15' (1T)", periodo: '1ª Parte' },
      { key: '16-34', label: "16' a 34' (1T)", periodo: '1ª Parte' },
      { key: '35 (Descanso)', label: "35' (Descanso)", periodo: 'Descanso' },
      { key: '36-50', label: "36' a 50' (2T)", periodo: '2ª Parte' },
      { key: '51-65', label: "51' a 65' (2T)", periodo: '2ª Parte' },
      { key: '66-70', label: "66' a 70' (2T)", periodo: '2ª Parte' }
    ] as const;

    const activeTeamStats = selectedTeamFilter !== 'all'
      ? stats.find(s => s.team.id === selectedTeamFilter)
      : null;

    return franjasKeys.map(f => {
      let count = 0;
      if (activeTeamStats) {
        count = activeTeamStats.substitutions.distribucionFranjas[f.key] || 0;
      } else {
        count = stats.reduce((acc, s) => acc + (s.substitutions.distribucionFranjas[f.key] || 0), 0);
      }
      return {
        franja: f.label,
        periodo: f.periodo,
        cambios: count
      };
    });
  }, [stats, selectedTeamFilter]);

  // Selected Team Details
  const focusedTeam = useMemo(() => {
    if (selectedTeamFilter === 'all') return null;
    return stats.find(s => s.team.id === selectedTeamFilter) || null;
  }, [stats, selectedTeamFilter]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header & RFFM Regulation Notice */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/50 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Actas Arbitrales Oficiales RFFM
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                100% Colectivo • Sin Datos Personales
              </span>
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-indigo-400" />
              Estadística Arbitral de Cambios y Sustituciones
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              Análisis cuantitativo de los cambios efectuados por todos los equipos del Grupo 50 (Segunda Infantil, partidos de 70 minutos). 
              Distribución temporal: <strong>1ª Parte (1'–34')</strong>, <strong>Descanso (minuto 35')</strong> y <strong>2ª Parte (36'–70')</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-2 px-3 self-start md:self-auto">
            <Clock className="w-4 h-4 text-indigo-400" />
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Duración Reglamentaria</span>
              <span className="text-xs font-black text-white">2 tiempos × 35 min (70')</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Cambios */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Total Cambios Grupo</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{globalSummary.totalSubs}</span>
            <span className="text-xs text-indigo-400 font-semibold">sustituciones</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            Media de <strong className="text-white font-bold">{globalSummary.avgPerTeamMatch}</strong> cambios / equipo / partido
          </div>
        </div>

        {/* 1ª Parte vs 2ª Parte Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Reparto 1ª vs 2ª Parte</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Hourglass className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-blue-400">{globalSummary.pct1T}% 1T</span>
            <span className="text-slate-500 font-bold">/</span>
            <span className="text-xl font-black text-purple-400">{globalSummary.pct2T}% 2T</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            <span className="text-teal-400 font-bold">{globalSummary.totalDescanso} cambios</span> ({globalSummary.pctDescanso}%) en el <strong className="text-teal-300">Descanso (35')</strong>
          </div>
        </div>

        {/* Minuto Más Temprano */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Cambio Más Rápido</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">Minuto {globalSummary.earliestSubMin}'</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium truncate">
            {globalSummary.earliestSubTeam} • Jornada {globalSummary.earliestSubJornada}
          </div>
        </div>

        {/* Minuto Medio Global */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase text-slate-400">Minuto Medio de Cambios</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{globalSummary.avgMinute}'</span>
            <span className="text-xs text-slate-400 font-semibold">minuto de partido</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            Concentración máxima entre el <strong className="text-white">35' y 55'</strong>
          </div>
        </div>

      </div>

      {/* 3. Controls & View Toggles */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Graphic mode selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto scrollbar-none">
            <button
              onClick={() => setGraphMode('periodos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                graphMode === 'periodos'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>1ª Parte vs Descanso vs 2ª Parte</span>
            </button>
            <button
              onClick={() => setGraphMode('densidad')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                graphMode === 'densidad'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Curva Minuto a Minuto (1' a 70')</span>
            </button>
            <button
              onClick={() => setGraphMode('primer_cambio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                graphMode === 'primer_cambio'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Minuto del Primer Cambio</span>
            </button>
            <button
              onClick={() => setGraphMode('franjas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                graphMode === 'franjas'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Distribución por Franjas</span>
            </button>
          </div>

          {/* Team filter dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Equipo:
            </span>
            <select
              value={selectedTeamFilter}
              onChange={(e) => setSelectedTeamFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
            >
              <option value="all">Todo el Grupo 50 (Todos los equipos)</option>
              {stats.map(s => (
                <option key={s.team.id} value={s.team.id}>
                  {s.team.shortName} {s.team.isMyTeam ? '(Nuestro Equipo)' : ''}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* 4. Chart Render Area */}
        <div className="pt-2">

          {/* VIEW MODE 1: Stacking 1ª Parte vs Descanso vs 2ª Parte */}
          {graphMode === 'periodos' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span>
                  Comparativa de volumen de sustituciones por período de partido para cada equipo:
                </span>
                <div className="flex items-center gap-4 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-500 inline-block" /> 1ª Parte (1'–34')
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-teal-400 inline-block" /> Descanso (35')
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-indigo-500 inline-block" /> 2ª Parte (36'–70')
                  </span>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={periodData}
                    margin={{ top: 20, right: 20, left: -10, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }} 
                      angle={-35} 
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[210px]">
                            <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                              <span>{data.name}</span>
                              {data.isMyTeam && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                                  AFE
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between text-blue-400">
                              <span>1ª Parte (1'–34'):</span>
                              <span className="font-bold">{data.primeraParte} ({data.pct1T}%)</span>
                            </div>
                            <div className="flex justify-between text-teal-400">
                              <span>Descanso (35'):</span>
                              <span className="font-bold">{data.descanso} ({data.pctDescanso}%)</span>
                            </div>
                            <div className="flex justify-between text-indigo-400">
                              <span>2ª Parte (36'–70'):</span>
                              <span className="font-bold">{data.segundaParte} ({data.pct2T}%)</span>
                            </div>
                            <div className="border-t border-slate-800 pt-1 flex justify-between font-bold text-white">
                              <span>Total Cambios:</span>
                              <span>{data.total}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex justify-between pt-0.5">
                              <span>Minuto medio:</span>
                              <span className="text-amber-300 font-semibold">{data.minutoMedio}'</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: 10, fontSize: 12 }}
                      formatter={(val) => {
                        if (val === 'primeraParte') return '1ª Parte (1-34 min)';
                        if (val === 'descanso') return 'Descanso (35 min)';
                        if (val === 'segundaParte') return '2ª Parte (36-70 min)';
                        return val;
                      }}
                    />
                    <Bar dataKey="primeraParte" name="primeraParte" stackId="cambios" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="descanso" name="descanso" stackId="cambios" fill="#14b8a6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="segundaParte" name="segundaParte" stackId="cambios" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: Timeline Curve Minuto a Minuto */}
          {graphMode === 'densidad' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span>
                  Frecuencia de sustituciones registradas en acta arbitral minuto a minuto (1' a 70'):
                  {selectedTeamFilter !== 'all' && (
                    <strong className="text-indigo-400 ml-1">
                      Filtrado para {stats.find(s => s.team.id === selectedTeamFilter)?.team.shortName}
                    </strong>
                  )}
                </span>
                <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Pico en Min 35' (Descanso) y Min 45'–55' (2ª Parte)
                </span>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timelineData}
                    margin={{ top: 20, right: 20, left: -15, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="subDensityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="minuto" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      interval={4}
                      tickFormatter={(m) => `${m}'`}
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>Minuto {data.minuto}'</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                data.periodo === 'Descanso' 
                                  ? 'bg-teal-500/20 text-teal-300' 
                                  : data.periodo === '1ª Parte'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-purple-500/20 text-purple-300'
                              }`}>
                                {data.periodo}
                              </span>
                            </div>
                            <div className="text-indigo-400 font-bold">
                              {data.cambios} {data.cambios === 1 ? 'sustitución registrada' : 'sustituciones registradas'}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine 
                      x={35} 
                      stroke="#14b8a6" 
                      strokeDasharray="4 4" 
                      label={{ value: 'Descanso (35\')', fill: '#14b8a6', fontSize: 11, position: 'top' }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cambios" 
                      stroke="#818cf8" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#subDensityGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-2">
                <span>← 1ª Parte (1'–34')</span>
                <span className="font-bold text-teal-400">DESCANSO (35')</span>
                <span>2ª Parte (36'–70') →</span>
              </div>
            </div>
          )}

          {/* VIEW MODE 3: Minuto Primer Cambio (Ranking de Anticipación) */}
          {graphMode === 'primer_cambio' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span>
                  Minuto más temprano en el que cada equipo realizó su primera sustitución en las actas arbitrales:
                </span>
                <span className="text-[11px] text-slate-400">
                  Valores más bajos = Equipos que intervienen antes (táctico o lesión)
                </span>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={primerCambioData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 90, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      type="number" 
                      domain={[0, 45]} 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(v) => `${v}'`}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                            <div className="font-bold text-white flex items-center justify-between gap-2">
                              <span>{data.name}</span>
                              {data.isMyTeam && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded">
                                  Nuestro
                                </span>
                              )}
                            </div>
                            <div className="text-amber-400 font-bold">
                              Primer cambio: Minuto {data.minutoPrimerCambio}'
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              Ocurrido en Jornada {data.jornada || 1}
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              Media de cambios del equipo: {data.minutoMedio}'
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine 
                      x={35} 
                      stroke="#14b8a6" 
                      strokeDasharray="3 3" 
                      label={{ value: 'Descanso 35\'', fill: '#14b8a6', fontSize: 10, position: 'right' }} 
                    />
                    <Bar 
                      dataKey="minutoPrimerCambio" 
                      fill="#f59e0b" 
                      radius={[0, 4, 4, 0]}
                    >
                      {primerCambioData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.isMyTeam 
                              ? '#10b981' 
                              : entry.minutoPrimerCambio < 35 
                              ? '#f59e0b' 
                              : '#3b82f6'
                          } 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-400 justify-end pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Cambio antes del descanso (&lt;35')
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500" /> Primer cambio en el descanso (35')
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Fundación AFE 'B'
                </span>
              </div>
            </div>
          )}

          {/* VIEW MODE 4: Franjas agrupadas */}
          {graphMode === 'franjas' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span>
                  Distribución acumulada en ventanas de partido (15 minutos + Descanso):
                  {selectedTeamFilter !== 'all' && (
                    <strong className="text-indigo-400 ml-1">
                      Filtrado para {stats.find(s => s.team.id === selectedTeamFilter)?.team.shortName}
                    </strong>
                  )}
                </span>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={franjasData}
                    margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="franja" 
                      tick={{ fill: '#94a3b8', fontSize: 11 }} 
                    />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                            <div className="font-bold text-white">{data.franja}</div>
                            <div className="text-slate-400 text-[11px]">Periodo: {data.periodo}</div>
                            <div className="text-indigo-400 font-bold">{data.cambios} sustituciones</div>
                          </div>
                        );
                      }}
                    />
                    <Bar 
                      dataKey="cambios" 
                      fill="#6366f1" 
                      radius={[4, 4, 0, 0]}
                    >
                      {franjasData.map((entry, index) => {
                        let color = '#6366f1';
                        if (entry.periodo === '1ª Parte') color = '#3b82f6';
                        else if (entry.periodo === 'Descanso') color = '#14b8a6';
                        return <Cell key={`franja-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-400 justify-end pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500" /> 1ª Parte
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-teal-400" /> Descanso (35')
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> 2ª Parte
                </span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 5. Team Deep-Dive Card (if specific team selected) */}
      {focusedTeam && (
        <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <img 
                src={focusedTeam.team.crestUrl} 
                alt={focusedTeam.team.name} 
                className="w-10 h-10 object-contain rounded-lg bg-slate-950 p-1 border border-slate-800"
              />
              <div>
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  {focusedTeam.team.name}
                  {focusedTeam.team.isMyTeam && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                      Nuestro Equipo
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-400">
                  Puesto {focusedTeam.pos}º • {focusedTeam.puntos} pts • Patrón de sustituciones en Actas Arbitrales
                </p>
              </div>
            </div>

            <button
              onClick={() => onSelectTeam && onSelectTeam(focusedTeam.team.id)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer self-end sm:self-auto"
            >
              Ver Ficha 360° del Equipo →
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Cambios</span>
              <span className="text-lg font-black text-white">{focusedTeam.substitutions.totalCambios}</span>
              <span className="text-[11px] text-slate-400 block font-medium">({focusedTeam.substitutions.promedioPorPartido}/partido)</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-blue-400 uppercase font-bold block">1ª Parte (1'-34')</span>
              <span className="text-lg font-black text-blue-300">
                {focusedTeam.substitutions.cambiosPrimeraParte} cambios
              </span>
              <span className="text-[11px] text-blue-400/80 block font-medium">
                {focusedTeam.substitutions.porcentajePrimeraParte}% del total
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-teal-400 uppercase font-bold block">Descanso (35')</span>
              <span className="text-lg font-black text-teal-300">
                {focusedTeam.substitutions.cambiosDescanso} cambios
              </span>
              <span className="text-[11px] text-teal-400/80 block font-medium">
                {focusedTeam.substitutions.porcentajeDescanso}% del total
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-indigo-400 uppercase font-bold block">2ª Parte (36'-70')</span>
              <span className="text-lg font-black text-indigo-300">
                {focusedTeam.substitutions.cambiosSegundaParte} cambios
              </span>
              <span className="text-[11px] text-indigo-400/80 block font-medium">
                {focusedTeam.substitutions.porcentajeSegundaParte}% del total
              </span>
            </div>
          </div>

          {/* Chronological list of events in referee reports */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Minutos de cada sustitución registrada en actas arbitrales (Jornadas 1 a 4):
            </span>
            <div className="flex flex-wrap gap-2">
              {focusedTeam.substitutions.eventos.map((ev, i) => (
                <div 
                  key={ev.id || i}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 ${
                    ev.periodo === 'Descanso'
                      ? 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                      : ev.periodo === '1ª Parte'
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                  }`}
                >
                  <span className="font-bold">Min {ev.minuto}'</span>
                  <span className="text-[10px] text-slate-400 font-sans">({ev.periodo} • J{ev.jornada || '?'})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. Complete Table of Substitution Records (All 14 Teams) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
              Registro Arbitral de Cambios por Equipo (Grupo 50)
            </h4>
            <p className="text-[11px] text-slate-400">
              Datos extraídos de las actas arbitrales cerradas de las jornadas 1 a 4 (70 min reglamentarios)
            </p>
          </div>

          <div className="text-[11px] text-slate-500">
            Total: 14 equipos federados
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Equipo</th>
                <th className="py-3 px-2 text-center">PJ</th>
                <th className="py-3 px-2 text-center">Total Cambios</th>
                <th className="py-3 px-2 text-center">Media / Part.</th>
                <th className="py-3 px-2 text-center text-blue-400">1ª Parte (1-34')</th>
                <th className="py-3 px-2 text-center text-teal-400">Descanso (35')</th>
                <th className="py-3 px-2 text-center text-indigo-400">2ª Parte (36-70')</th>
                <th className="py-3 px-2 text-center text-amber-400">1er Cambio</th>
                <th className="py-3 px-2 text-center text-emerald-400">Min. Medio</th>
                <th className="py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {stats.map((s) => {
                const sub = s.substitutions;
                const isSelected = selectedTeamFilter === s.team.id;
                return (
                  <tr 
                    key={s.team.id}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      isSelected 
                        ? 'bg-indigo-950/30 border-l-4 border-indigo-500' 
                        : s.team.isMyTeam 
                        ? 'bg-emerald-950/20' 
                        : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <img 
                          src={s.team.crestUrl} 
                          alt="" 
                          className="w-5 h-5 object-contain rounded flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <span className={`font-bold block truncate ${s.team.isMyTeam ? 'text-emerald-400' : 'text-white'}`}>
                            {s.team.shortName}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {s.pos}º Puesto • {s.puntos} pts
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-2 text-center text-slate-300 font-bold">
                      {s.pj}
                    </td>

                    <td className="py-2.5 px-2 text-center font-black text-white">
                      {sub.totalCambios}
                    </td>

                    <td className="py-2.5 px-2 text-center text-slate-300">
                      {sub.promedioPorPartido}
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      <span className="font-bold text-blue-400">{sub.cambiosPrimeraParte}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({sub.porcentajePrimeraParte}%)</span>
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      <span className="font-bold text-teal-300">{sub.cambiosDescanso}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({sub.porcentajeDescanso}%)</span>
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      <span className="font-bold text-indigo-400">{sub.cambiosSegundaParte}</span>
                      <span className="text-[10px] text-slate-500 ml-1">({sub.porcentajeSegundaParte}%)</span>
                    </td>

                    <td className="py-2.5 px-2 text-center">
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[11px] font-bold">
                        {sub.minutoPrimerCambio ? `${sub.minutoPrimerCambio}'` : '-'}
                      </span>
                    </td>

                    <td className="py-2.5 px-2 text-center font-bold text-emerald-400">
                      {sub.minutoMedioCambios}'
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedTeamFilter(s.team.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        Detalle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
