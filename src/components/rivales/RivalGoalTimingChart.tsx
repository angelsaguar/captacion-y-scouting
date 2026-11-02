import React, { useState, useMemo } from 'react';
import { TeamCollectiveStats, GoalTimingRecord } from '@/types/rivals';
import { 
  Zap, 
  Clock, 
  Hourglass, 
  ShieldAlert, 
  ShieldCheck, 
  FileText, 
  BarChart3, 
  Flame, 
  ChevronRight, 
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface RivalGoalTimingChartProps {
  stats: TeamCollectiveStats[];
  onSelectTeam?: (teamId: string) => void;
}

type ViewMode = 'chart' | 'timeline' | 'ranking';
type TimingMetric = 'rapido_marcado' | 'tardio_marcado' | 'rapido_encajado' | 'tardio_encajado';

export const RivalGoalTimingChart: React.FC<RivalGoalTimingChartProps> = ({
  stats,
  onSelectTeam
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [activeMetricRanking, setActiveMetricRanking] = useState<TimingMetric>('rapido_marcado');

  // Calculate absolute extremes across the whole group
  const records = useMemo(() => {
    let bestRapidoMarcado: { team: TeamCollectiveStats; record: GoalTimingRecord } | null = null;
    let bestTardioMarcado: { team: TeamCollectiveStats; record: GoalTimingRecord } | null = null;
    let bestRapidoEncajado: { team: TeamCollectiveStats; record: GoalTimingRecord } | null = null;
    let bestTardioEncajado: { team: TeamCollectiveStats; record: GoalTimingRecord } | null = null;

    stats.forEach(s => {
      // 1. Gol más rápido metido (mínimo minuto)
      if (s.goalTiming.masRapidoMarcado) {
        if (!bestRapidoMarcado || s.goalTiming.masRapidoMarcado.minuto < bestRapidoMarcado.record.minuto) {
          bestRapidoMarcado = { team: s, record: s.goalTiming.masRapidoMarcado };
        }
      }
      // 2. Gol más tardío metido (máximo minuto)
      if (s.goalTiming.masTardioMarcado) {
        if (!bestTardioMarcado || s.goalTiming.masTardioMarcado.minuto > bestTardioMarcado.record.minuto) {
          bestTardioMarcado = { team: s, record: s.goalTiming.masTardioMarcado };
        }
      }
      // 3. Gol más rápido encajado (mínimo minuto)
      if (s.goalTiming.masRapidoEncajado) {
        if (!bestRapidoEncajado || s.goalTiming.masRapidoEncajado.minuto < bestRapidoEncajado.record.minuto) {
          bestRapidoEncajado = { team: s, record: s.goalTiming.masRapidoEncajado };
        }
      }
      // 4. Gol más tardío encajado (máximo minuto)
      if (s.goalTiming.masTardioEncajado) {
        if (!bestTardioEncajado || s.goalTiming.masTardioEncajado.minuto > bestTardioEncajado.record.minuto) {
          bestTardioEncajado = { team: s, record: s.goalTiming.masTardioEncajado };
        }
      }
    });

    return {
      rapidoMarcado: bestRapidoMarcado,
      tardioMarcado: bestTardioMarcado,
      rapidoEncajado: bestRapidoEncajado,
      tardioEncajado: bestTardioEncajado
    };
  }, [stats]);

  // Data for the Recharts BarChart (0 to 70 minutes scale)
  const chartData = useMemo(() => {
    return stats.map(s => {
      return {
        id: s.team.id,
        name: s.team.shortName,
        isMyTeam: s.team.isMyTeam,
        'Gol +Rápido Metido': s.goalTiming.masRapidoMarcado ? s.goalTiming.masRapidoMarcado.minuto : null,
        'Gol +Tardío Metido': s.goalTiming.masTardioMarcado ? s.goalTiming.masTardioMarcado.minuto : null,
        'Gol +Rápido Encajado': s.goalTiming.masRapidoEncajado ? s.goalTiming.masRapidoEncajado.minuto : null,
        'Gol +Tardío Encajado': s.goalTiming.masTardioEncajado ? s.goalTiming.masTardioEncajado.minuto : null,
        // Raw records for tooltips
        raw: s.goalTiming
      };
    });
  }, [stats]);

  // Ranked lists for the 4 specific criteria
  const rankedByMetric = useMemo(() => {
    const list = [...stats];
    switch (activeMetricRanking) {
      case 'rapido_marcado':
        return list
          .filter(s => s.goalTiming.masRapidoMarcado !== null)
          .sort((a, b) => (a.goalTiming.masRapidoMarcado?.minuto ?? 999) - (b.goalTiming.masRapidoMarcado?.minuto ?? 999));
      case 'tardio_marcado':
        return list
          .filter(s => s.goalTiming.masTardioMarcado !== null)
          .sort((a, b) => (b.goalTiming.masTardioMarcado?.minuto ?? -1) - (a.goalTiming.masTardioMarcado?.minuto ?? -1));
      case 'rapido_encajado':
        return list
          .filter(s => s.goalTiming.masRapidoEncajado !== null)
          .sort((a, b) => (a.goalTiming.masRapidoEncajado?.minuto ?? 999) - (b.goalTiming.masRapidoEncajado?.minuto ?? 999));
      case 'tardio_encajado':
        return list
          .filter(s => s.goalTiming.masTardioEncajado !== null)
          .sort((a, b) => (b.goalTiming.masTardioEncajado?.minuto ?? -1) - (a.goalTiming.masTardioEncajado?.minuto ?? -1));
    }
  }, [stats, activeMetricRanking]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Cronometría Arbitral • Récords de Minuto de Gol (Actas RFFM)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Análisis de los minutos oficiales en acta: gol más rápido y más tardío marcado, y gol más rápido y más tardío encajado (duración 70').
          </p>
        </div>

        {/* View mode toggle */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('chart')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'chart'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Gráfica de Minutos</span>
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'timeline'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Hourglass className="w-3.5 h-3.5" />
            <span>Líneas de Tiempo (0'-70')</span>
          </button>
          <button
            onClick={() => setViewMode('ranking')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'ranking'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Clasificación por Récord</span>
          </button>
        </div>
      </div>

      {/* 4 Absolute Records Cards of Grupo 50 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Record 1: Gol más rápido metido */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-500/40 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" />
              Gol Más Rápido Metido
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Acta Oficial
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              Minuto {records.rapidoMarcado?.record.minuto}'
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase">
              1T (Arranque)
            </span>
          </div>

          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="min-w-0">
              <span className="font-bold text-slate-200 block truncate">
                {records.rapidoMarcado?.team.team.shortName}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                Jornada {records.rapidoMarcado?.record.jornada} vs {records.rapidoMarcado?.record.rivalShortName}
              </span>
            </div>
            {records.rapidoMarcado?.team.team.isMyTeam && (
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-black">
                AFE 'B'
              </span>
            )}
          </div>
        </div>

        {/* Record 2: Gol más tardío metido */}
        <div className="bg-gradient-to-br from-cyan-950/40 via-slate-950 to-slate-950 border border-cyan-500/40 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1">
              <Hourglass className="w-3.5 h-3.5" />
              Gol Más Tardío Metido
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Acta Oficial
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              Minuto {records.tardioMarcado?.record.minuto}'
            </span>
            <span className="text-xs font-bold text-cyan-400 uppercase">
              2T (Final)
            </span>
          </div>

          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="min-w-0">
              <span className="font-bold text-slate-200 block truncate">
                {records.tardioMarcado?.team.team.shortName}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                Jornada {records.tardioMarcado?.record.jornada} vs {records.tardioMarcado?.record.rivalShortName}
              </span>
            </div>
            {records.tardioMarcado?.team.team.isMyTeam && (
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-black">
                AFE 'B'
              </span>
            )}
          </div>
        </div>

        {/* Record 3: Gol más rápido encajado */}
        <div className="bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 border border-amber-500/40 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Gol Más Rápido Encajado
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Acta Oficial
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              Minuto {records.rapidoEncajado?.record.minuto}'
            </span>
            <span className="text-xs font-bold text-amber-400 uppercase">
              Gol Tempranero
            </span>
          </div>

          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="min-w-0">
              <span className="font-bold text-slate-200 block truncate">
                {records.rapidoEncajado?.team.team.shortName}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                Jornada {records.rapidoEncajado?.record.jornada} vs {records.rapidoEncajado?.record.rivalShortName}
              </span>
            </div>
            {records.rapidoEncajado?.team.team.isMyTeam && (
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black">
                AFE 'B'
              </span>
            )}
          </div>
        </div>

        {/* Record 4: Gol más tardío encajado */}
        <div className="bg-gradient-to-br from-rose-950/40 via-slate-950 to-slate-950 border border-rose-500/40 rounded-2xl p-4 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Gol Más Tardío Encajado
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Acta Oficial
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              Minuto {records.tardioEncajado?.record.minuto}'
            </span>
            <span className="text-xs font-bold text-rose-400 uppercase">
              Descuento / 2T
            </span>
          </div>

          <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="min-w-0">
              <span className="font-bold text-slate-200 block truncate">
                {records.tardioEncajado?.team.team.shortName}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                Jornada {records.tardioEncajado?.record.jornada} vs {records.tardioEncajado?.record.rivalShortName}
              </span>
            </div>
            {records.tardioEncajado?.team.team.isMyTeam && (
              <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-black">
                AFE 'B'
              </span>
            )}
          </div>
        </div>

      </div>

      {/* VIEW 1: RECHARTS GROUPED BAR CHART */}
      {viewMode === 'chart' && (
        <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Minuto Exacto del Gol en Acta Arbitral (Escala Oficial 1' a 70')
              </h4>
              <p className="text-[11px] text-slate-400">
                Comparación por equipo: cuánto tarda en abrir y cerrar el marcador a favor y en contra.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block"></span>
                + Rápido Metido
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-cyan-500 inline-block"></span>
                + Tardío Metido
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block"></span>
                + Rápido Encajado
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block"></span>
                + Tardío Encajado
              </span>
            </div>
          </div>

          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 10, left: -20, bottom: 45 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={10} 
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  domain={[0, 70]}
                  ticks={[0, 15, 30, 35, 50, 65, 70]}
                  unit="'"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  formatter={(value: any, name: any, item: any) => {
                    if (value === null || value === undefined) return ['Sin registro', name];
                    const raw = item.payload.raw;
                    let detail = '';
                    if (name === 'Gol +Rápido Metido' && raw.masRapidoMarcado) {
                      detail = ` (J.${raw.masRapidoMarcado.jornada} vs ${raw.masRapidoMarcado.rivalShortName})`;
                    } else if (name === 'Gol +Tardío Metido' && raw.masTardioMarcado) {
                      detail = ` (J.${raw.masTardioMarcado.jornada} vs ${raw.masTardioMarcado.rivalShortName})`;
                    } else if (name === 'Gol +Rápido Encajado' && raw.masRapidoEncajado) {
                      detail = ` (J.${raw.masRapidoEncajado.jornada} vs ${raw.masRapidoEncajado.rivalShortName})`;
                    } else if (name === 'Gol +Tardío Encajado' && raw.masTardioEncajado) {
                      detail = ` (J.${raw.masTardioEncajado.jornada} vs ${raw.masTardioEncajado.rivalShortName})`;
                    }
                    return [`Minuto ${value}'${detail}`, name];
                  }}
                />
                <Bar dataKey="Gol +Rápido Metido" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="Gol +Tardío Metido" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="Gol +Rápido Encajado" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="Gol +Tardío Encajado" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>
              Línea vertical divisoria: <strong>35'</strong> marca el descanso reglamentario de la categoría Infantil.
            </span>
          </div>
        </div>
      )}

      {/* VIEW 2: HORIZONTAL TIMELINE BARS (0' to 70') */}
      {viewMode === 'timeline' && (
        <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-cyan-400" />
              Línea de Tiempo del Partido (0' a 70') por Equipo
            </h4>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                ● Rápido Marcado
              </span>
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                ● Tardío Marcado
              </span>
              <span className="text-amber-400 font-bold flex items-center gap-1">
                ▲ Rápido Encajado
              </span>
              <span className="text-rose-400 font-bold flex items-center gap-1">
                ▲ Tardío Encajado
              </span>
            </div>
          </div>

          <div className="space-y-3.5 pt-2">
            {/* Timeline Ruler Header */}
            <div className="flex items-center text-[10px] text-slate-500 font-mono px-2">
              <div className="w-44 shrink-0 font-sans font-bold">Equipo</div>
              <div className="flex-1 flex justify-between relative">
                <span>0'</span>
                <span>15'</span>
                <span className="text-slate-400 font-bold">35' (Descanso)</span>
                <span>50'</span>
                <span>65'</span>
                <span>70'</span>
              </div>
            </div>

            {stats.map(s => {
              const rapidoMarcado = s.goalTiming.masRapidoMarcado?.minuto ?? null;
              const tardioMarcado = s.goalTiming.masTardioMarcado?.minuto ?? null;
              const rapidoEncajado = s.goalTiming.masRapidoEncajado?.minuto ?? null;
              const tardioEncajado = s.goalTiming.masTardioEncajado?.minuto ?? null;

              return (
                <div 
                  key={s.team.id}
                  onClick={() => onSelectTeam && onSelectTeam(s.team.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    s.team.isMyTeam 
                      ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Team Name */}
                    <div className="w-44 shrink-0 flex items-center gap-2">
                      <img 
                        src={s.team.crestUrl} 
                        alt={s.team.shortName} 
                        className="w-5 h-5 object-contain rounded bg-white p-0.5" 
                      />
                      <span className={`text-xs font-bold truncate ${s.team.isMyTeam ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {s.team.shortName}
                      </span>
                    </div>

                    {/* Timeline Field Track (70 min) */}
                    <div className="flex-1 relative h-6 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex items-center">
                      {/* Half-time line (at 50% = 35 min) */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-700 z-0"></div>

                      {/* Scored Range Bar (between fastest and latest scored) */}
                      {rapidoMarcado !== null && tardioMarcado !== null && (
                        <div 
                          className="absolute h-2 bg-emerald-500/25 rounded-full z-1"
                          style={{
                            left: `${(rapidoMarcado / 70) * 100}%`,
                            width: `${Math.max(2, ((tardioMarcado - rapidoMarcado) / 70) * 100)}%`
                          }}
                        />
                      )}

                      {/* Marker: Fastest Goal Scored */}
                      {rapidoMarcado !== null && (
                        <div 
                          className="absolute w-3.5 h-3.5 -ml-1.5 rounded-full bg-emerald-500 border border-white shadow-sm flex items-center justify-center text-[8px] font-black text-slate-950 z-10"
                          style={{ left: `${(rapidoMarcado / 70) * 100}%` }}
                          title={`Gol más rápido marcado: min ${rapidoMarcado}' (J.${s.goalTiming.masRapidoMarcado?.jornada} vs ${s.goalTiming.masRapidoMarcado?.rivalShortName})`}
                        >
                          {rapidoMarcado}
                        </div>
                      )}

                      {/* Marker: Latest Goal Scored */}
                      {tardioMarcado !== null && (
                        <div 
                          className="absolute w-3.5 h-3.5 -ml-1.5 rounded-full bg-cyan-400 border border-white shadow-sm flex items-center justify-center text-[8px] font-black text-slate-950 z-10"
                          style={{ left: `${(tardioMarcado / 70) * 100}%` }}
                          title={`Gol más tardío marcado: min ${tardioMarcado}' (J.${s.goalTiming.masTardioMarcado?.jornada} vs ${s.goalTiming.masTardioMarcado?.rivalShortName})`}
                        >
                          {tardioMarcado}
                        </div>
                      )}

                      {/* Marker: Fastest Goal Conceded */}
                      {rapidoEncajado !== null && (
                        <div 
                          className="absolute w-3 h-3 -ml-1.5 rotate-45 bg-amber-400 border border-slate-950 shadow-sm z-5"
                          style={{ left: `${(rapidoEncajado / 70) * 100}%` }}
                          title={`Gol más rápido encajado: min ${rapidoEncajado}' (J.${s.goalTiming.masRapidoEncajado?.jornada} vs ${s.goalTiming.masRapidoEncajado?.rivalShortName})`}
                        />
                      )}

                      {/* Marker: Latest Goal Conceded */}
                      {tardioEncajado !== null && (
                        <div 
                          className="absolute w-3 h-3 -ml-1.5 rotate-45 bg-rose-500 border border-slate-950 shadow-sm z-5"
                          style={{ left: `${(tardioEncajado / 70) * 100}%` }}
                          title={`Gol más tardío encajado: min ${tardioEncajado}' (J.${s.goalTiming.masTardioEncajado?.jornada} vs ${s.goalTiming.masTardioEncajado?.rivalShortName})`}
                        />
                      )}
                    </div>

                    {/* Numeric Summary Pill */}
                    <div className="w-28 shrink-0 text-right text-[11px] font-mono">
                      <span className="text-emerald-400 font-bold">{rapidoMarcado ? `${rapidoMarcado}'` : '-'}</span>
                      <span className="text-slate-600 mx-1">/</span>
                      <span className="text-cyan-400 font-bold">{tardioMarcado ? `${tardioMarcado}'` : '-'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: RANKING TOP SPECIFIC CRITERIA */}
      {viewMode === 'ranking' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveMetricRanking('rapido_marcado')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeMetricRanking === 'rapido_marcado'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Más Rápido Marcando (Gol Tempranero)</span>
            </button>
            <button
              onClick={() => setActiveMetricRanking('tardio_marcado')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeMetricRanking === 'tardio_marcado'
                  ? 'bg-cyan-600 text-white shadow'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>Más Tardío Marcando (Goles hasta el 70')</span>
            </button>
            <button
              onClick={() => setActiveMetricRanking('rapido_encajado')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeMetricRanking === 'rapido_encajado'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Más Rápido Encajando (Despistes Iniciales)</span>
            </button>
            <button
              onClick={() => setActiveMetricRanking('tardio_encajado')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                activeMetricRanking === 'tardio_encajado'
                  ? 'bg-rose-600 text-white shadow'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Más Tardío Encajando (Desgaste Final)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rankedByMetric.map((item, idx) => {
              let rec: GoalTimingRecord | null = null;
              let metricTitle = '';
              let badgeColor = '';

              if (activeMetricRanking === 'rapido_marcado') {
                rec = item.goalTiming.masRapidoMarcado;
                metricTitle = 'Gol Más Rápido Metido';
                badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
              } else if (activeMetricRanking === 'tardio_marcado') {
                rec = item.goalTiming.masTardioMarcado;
                metricTitle = 'Gol Más Tardío Metido';
                badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
              } else if (activeMetricRanking === 'rapido_encajado') {
                rec = item.goalTiming.masRapidoEncajado;
                metricTitle = 'Gol Más Rápido Encajado';
                badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
              } else {
                rec = item.goalTiming.masTardioEncajado;
                metricTitle = 'Gol Más Tardío Encajado';
                badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
              }

              if (!rec) return null;

              return (
                <div
                  key={item.team.id}
                  onClick={() => onSelectTeam && onSelectTeam(item.team.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    item.team.isMyTeam
                      ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-xs text-slate-300">
                        {idx + 1}º
                      </span>
                      <img
                        src={item.team.crestUrl}
                        alt={item.team.shortName}
                        className="w-5 h-5 object-contain rounded bg-white p-0.5"
                      />
                      <span className={`text-xs font-bold truncate ${item.team.isMyTeam ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {item.team.shortName}
                      </span>
                    </div>

                    <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${badgeColor}`}>
                      Minuto {rec.minuto}'
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Acta: Jornada {rec.jornada} vs {rec.rivalShortName}</span>
                    <span className="font-semibold text-slate-300">
                      {rec.minuto <= 35 ? '1ª Parte' : '2ª Parte'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comprehensive Official Referee Match Report Data Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            Tabla Completa de Cronometría por Actas Arbitrales • 14 Equipos Grupo 50
          </h4>
          <span className="text-[10px] text-slate-400">
            Fuente oficial: Actas públicas RFFM
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider select-none">
                <th className="py-3 px-3 w-10 text-center">#</th>
                <th className="py-3 px-3 min-w-[180px]">Equipo</th>
                <th className="py-3 px-3 text-center text-emerald-400">
                  <div className="flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>Gol +Rápido Metido</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center text-cyan-400">
                  <div className="flex items-center justify-center gap-1">
                    <Hourglass className="w-3 h-3" />
                    <span>Gol +Tardío Metido</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center text-amber-400">
                  <div className="flex items-center justify-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Gol +Rápido Encajado</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center text-rose-400">
                  <div className="flex items-center justify-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>Gol +Tardío Encajado</span>
                  </div>
                </th>
                <th className="py-3 px-3 text-center text-slate-400">Rango Ofensivo</th>
                <th className="py-3 px-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {stats.map(s => {
                const rm = s.goalTiming.masRapidoMarcado;
                const tm = s.goalTiming.masTardioMarcado;
                const re = s.goalTiming.masRapidoEncajado;
                const te = s.goalTiming.masTardioEncajado;

                const offensiveSpan = rm && tm ? tm.minuto - rm.minuto : null;

                return (
                  <tr
                    key={s.team.id}
                    onClick={() => onSelectTeam && onSelectTeam(s.team.id)}
                    className={`cursor-pointer transition-colors ${
                      s.team.isMyTeam 
                        ? 'bg-emerald-950/20 hover:bg-emerald-900/20 border-l-4 border-l-emerald-500' 
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-400">
                      {s.pos}º
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={s.team.crestUrl}
                          alt={s.team.shortName}
                          className="w-5 h-5 object-contain rounded bg-white p-0.5 shrink-0"
                        />
                        <span className={`font-bold uppercase tracking-tight ${s.team.isMyTeam ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {s.team.shortName}
                        </span>
                        {s.team.isMyTeam && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-black">
                            AFE 'B'
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Gol más rápido marcado */}
                    <td className="py-3 px-3 text-center">
                      {rm ? (
                        <div>
                          <span className="font-black text-emerald-400 text-sm">
                            Min {rm.minuto}'
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            J.{rm.jornada} vs {rm.rivalShortName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-medium">Sin goles</span>
                      )}
                    </td>

                    {/* Gol más tardío marcado */}
                    <td className="py-3 px-3 text-center">
                      {tm ? (
                        <div>
                          <span className="font-black text-cyan-400 text-sm">
                            Min {tm.minuto}'
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            J.{tm.jornada} vs {tm.rivalShortName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-medium">Sin goles</span>
                      )}
                    </td>

                    {/* Gol más rápido encajado */}
                    <td className="py-3 px-3 text-center">
                      {re ? (
                        <div>
                          <span className="font-black text-amber-400 text-sm">
                            Min {re.minuto}'
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            J.{re.jornada} vs {re.rivalShortName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-medium">0 encajados</span>
                      )}
                    </td>

                    {/* Gol más tardío encajado */}
                    <td className="py-3 px-3 text-center">
                      {te ? (
                        <div>
                          <span className="font-black text-rose-400 text-sm">
                            Min {te.minuto}'
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            J.{te.jornada} vs {te.rivalShortName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-medium">0 encajados</span>
                      )}
                    </td>

                    {/* Rango Ofensivo */}
                    <td className="py-3 px-3 text-center text-slate-300 font-semibold">
                      {offensiveSpan !== null ? (
                        <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px]">
                          {offensiveSpan}' de margen
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-3 px-3 text-center text-slate-600">
                      <ChevronRight className="w-4 h-4" />
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

export default RivalGoalTimingChart;
