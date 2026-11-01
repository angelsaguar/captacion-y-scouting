import React, { useState } from 'react';
import { TeamCollectiveStats, Franja15Min } from '@/types/rivals';
import { FRANJAS_15M } from '@/data/rivalStatsData';
import { 
  Clock, 
  Flame, 
  AlertTriangle, 
  BarChart2, 
  PieChart as PieIcon, 
  CheckCircle2,
  TrendingUp,
  Percent
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
  Cell
} from 'recharts';

interface RivalIntervalsChartProps {
  stats: TeamCollectiveStats[];
  selectedTeamId?: string | null;
  onSelectTeam?: (teamId: string) => void;
}

export const RivalIntervalsChart: React.FC<RivalIntervalsChartProps> = ({
  stats,
  selectedTeamId,
  onSelectTeam
}) => {
  const [currentTeamId, setCurrentTeamId] = useState<string>(
    selectedTeamId || stats.find(s => s.team.isMyTeam)?.team.id || stats[0]?.team.id
  );
  const [viewMode, setViewMode] = useState<'individual' | 'group'>('individual');

  const selectedTeamStats = stats.find(s => s.team.id === currentTeamId) || stats[0];

  // Group aggregate calculation across all 14 teams
  const groupIntervals = FRANJAS_15M.map(f => {
    let gfTotal = 0;
    let gcTotal = 0;
    stats.forEach(s => {
      const matchInterval = s.intervals.find(i => i.franja === f.franja);
      if (matchInterval) {
        gfTotal += matchInterval.golesFavor;
        gcTotal += matchInterval.golesContra;
      }
    });
    return {
      franja: f.franja,
      label: f.label,
      periodo: f.periodo,
      golesFavor: gfTotal,
      golesContra: gcTotal,
      porcentajeFavor: 0,
      porcentajeContra: 0
    };
  });

  const totalGfGroup = groupIntervals.reduce((acc, cur) => acc + cur.golesFavor, 0);
  const totalGcGroup = groupIntervals.reduce((acc, cur) => acc + cur.golesContra, 0);

  groupIntervals.forEach(g => {
    g.porcentajeFavor = totalGfGroup > 0 ? Math.round((g.golesFavor / totalGfGroup) * 100) : 0;
    g.porcentajeContra = totalGcGroup > 0 ? Math.round((g.golesContra / totalGcGroup) * 100) : 0;
  });

  // Decide which data to plot
  const activeIntervals = viewMode === 'group' ? groupIntervals : (selectedTeamStats?.intervals || []);
  const activeGfTotal = viewMode === 'group' ? totalGfGroup : (selectedTeamStats?.gf || 0);
  const activeGcTotal = viewMode === 'group' ? totalGcGroup : (selectedTeamStats?.gc || 0);

  // 1st half vs 2nd half calculation
  const firstHalfGf = activeIntervals.slice(0, 3).reduce((acc, i) => acc + i.golesFavor, 0);
  const secondHalfGf = activeIntervals.slice(3, 6).reduce((acc, i) => acc + i.golesFavor, 0);
  const firstHalfGc = activeIntervals.slice(0, 3).reduce((acc, i) => acc + i.golesContra, 0);
  const secondHalfGc = activeIntervals.slice(3, 6).reduce((acc, i) => acc + i.golesContra, 0);

  // Prepare chart data format
  const chartData = activeIntervals.map(i => ({
    name: i.franja + "'",
    label: i.label,
    periodo: i.periodo,
    'Goles a Favor': i.golesFavor,
    'Goles Encajados': i.golesContra,
    pctFavor: i.porcentajeFavor,
    pctContra: i.porcentajeContra
  }));

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setCurrentTeamId(id);
    if (onSelectTeam) onSelectTeam(id);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Goles por Franjas de 15 Minutos • Infantil RFFM (70 min)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Distribución temporal de goles marcados y encajados en 6 franjas reglamentarias (35' por tiempo).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mode switch */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('individual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'individual'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Por Equipo
            </button>
            <button
              onClick={() => setViewMode('group')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'group'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Total Grupo 50
            </button>
          </div>

          {/* Team selector if in individual mode */}
          {viewMode === 'individual' && (
            <select
              value={currentTeamId}
              onChange={handleTeamChange}
              className="h-9 text-xs font-bold bg-slate-950 border border-slate-800 text-white rounded-xl px-3 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {stats.map(s => (
                <option key={s.team.id} value={s.team.id}>
                  {s.pos}º {s.team.shortName} {s.team.isMyTeam ? '(Nuestro)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Highlights / Tactical Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lethal zone */}
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400">
              Franja de Mayor Producción
            </span>
            <div className="text-base font-black text-white">
              {viewMode === 'individual' 
                ? `${selectedTeamStats?.franjaMayorProduccion}'` 
                : "51' a 65' (2T)"}
            </div>
            <p className="text-[11px] text-slate-400">
              Momento de máxima letalidad ofensiva
            </p>
          </div>
        </div>

        {/* Weak zone */}
        <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-rose-400">
              Mayor Vulnerabilidad Defensiva
            </span>
            <div className="text-base font-black text-white">
              {viewMode === 'individual' 
                ? `${selectedTeamStats?.franjaMayorVulnerabilidad}'` 
                : "16' a 30' (1T)"}
            </div>
            <p className="text-[11px] text-slate-400">
              Minutos con mayor cantidad de goles recibidos
            </p>
          </div>
        </div>

        {/* 1st Half vs 2nd Half */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 flex-shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-blue-400">
              Producción por Tiempos
            </span>
            <div className="text-base font-black text-white">
              1T: {firstHalfGf} gol | 2T: {secondHalfGf} gol
            </div>
            <p className="text-[11px] text-slate-400">
              {secondHalfGf > firstHalfGf ? 'Mayor pegada en la 2ª mitad' : 'Mayor eficacia al inicio'}
            </p>
          </div>
        </div>

        {/* Defending halves */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-purple-400">
              Goles Recibidos por Tiempo
            </span>
            <div className="text-base font-black text-white">
              1T: {firstHalfGc} | 2T: {secondHalfGc}
            </div>
            <p className="text-[11px] text-slate-400">
              {firstHalfGc > secondHalfGc ? 'Desajustes en la 1ª mitad' : 'Desgaste en la 2ª mitad'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Bar Chart */}
      <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              {viewMode === 'individual'
                ? `Radiografía Temporal de Goles • ${selectedTeamStats?.team.shortName}`
                : 'Distribución Global de Goles en Grupo 50'}
            </h4>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
              Goles Marcados ({activeGfTotal})
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block"></span>
              Goles Encajados ({activeGcTotal})
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="label" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                allowDecimals={false}
                tickLine={false}
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
                  const pct = name === 'Goles a Favor' ? item.payload.pctFavor : item.payload.pctContra;
                  return [`${value} goles (${pct}%)`, name];
                }}
              />
              <Bar 
                dataKey="Goles a Favor" 
                fill="#10b981" 
                radius={[6, 6, 0, 0]}
                maxBarSize={45}
              />
              <Bar 
                dataKey="Goles Encajados" 
                fill="#f43f5e" 
                radius={[6, 6, 0, 0]} 
                maxBarSize={45}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interval Details Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3">Franja</th>
              <th className="py-2.5 px-3">Tiempo</th>
              <th className="py-2.5 px-3 text-center text-emerald-400">Goles a Favor</th>
              <th className="py-2.5 px-3 text-center text-emerald-400">% Producción</th>
              <th className="py-2.5 px-3 text-center text-rose-400">Goles Encajados</th>
              <th className="py-2.5 px-3 text-center text-rose-400">% Vulnerabilidad</th>
              <th className="py-2.5 px-3 text-center">Balance Franja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {activeIntervals.map((i) => {
              const balance = i.golesFavor - i.golesContra;
              return (
                <tr key={i.franja} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-bold text-white">{i.label}</td>
                  <td className="py-2.5 px-3 text-slate-400">{i.periodo}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-400">{i.golesFavor}</td>
                  <td className="py-2.5 px-3 text-center font-semibold text-slate-300">
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                      {i.porcentajeFavor}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-rose-400">{i.golesContra}</td>
                  <td className="py-2.5 px-3 text-center font-semibold text-slate-300">
                    <span className="inline-block px-2 py-0.5 rounded bg-rose-500/10 text-rose-300">
                      {i.porcentajeContra}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold">
                    <span className={balance > 0 ? 'text-emerald-400' : balance < 0 ? 'text-rose-400' : 'text-slate-500'}>
                      {balance > 0 ? `+${balance}` : balance}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RivalIntervalsChart;
