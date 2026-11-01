import React, { useState } from 'react';
import { TeamCollectiveStats } from '@/types/rivals';
import { 
  ShieldAlert, 
  Smile, 
  BarChart3, 
  AlertOctagon, 
  Layers, 
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface RivalDisciplineChartProps {
  stats: TeamCollectiveStats[];
  onSelectTeam: (teamId: string) => void;
}

export const RivalDisciplineChart: React.FC<RivalDisciplineChartProps> = ({
  stats,
  onSelectTeam
}) => {
  const [sortMode, setSortMode] = useState<'fairplay' | 'total' | 'promedio'>('fairplay');

  const sortedStats = [...stats].sort((a, b) => {
    if (sortMode === 'fairplay') {
      return a.discipline.puntosFairPlay - b.discipline.puntosFairPlay;
    }
    if (sortMode === 'promedio') {
      return b.discipline.promedioPorPartido - a.discipline.promedioPorPartido;
    }
    return b.discipline.totalTarjetas - a.discipline.totalTarjetas;
  });

  const chartData = sortedStats.map(s => ({
    name: s.team.shortName,
    id: s.team.id,
    isMyTeam: s.team.isMyTeam,
    Amarillas: s.discipline.amarillas,
    'Dobles Amarillas': s.discipline.doblesAmarillas,
    'Rojas Directas': s.discipline.rojasDirectas,
    'Total Tarjetas': s.discipline.totalTarjetas,
    'Puntos Fair Play': s.discipline.puntosFairPlay,
    Promedio: s.discipline.promedioPorPartido
  }));

  const totalAmarillasGrupo = stats.reduce((acc, s) => acc + s.discipline.amarillas, 0);
  const totalRojasGrupo = stats.reduce((acc, s) => acc + s.discipline.rojasDirectas + s.discipline.doblesAmarillas, 0);
  const totalTarjetasGrupo = totalAmarillasGrupo + totalRojasGrupo;
  const promedioGrupoPorPartido = stats.length > 0 ? (totalTarjetasGrupo / (stats[0].pj * 7)).toFixed(2) : '0';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Control Disciplinario y Fair Play Colectivo
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro exclusivo de sanciones grupales por equipo acumuladas en actas federativas de la RFFM.
          </p>
        </div>

        {/* Sort modes */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
          <button
            onClick={() => setSortMode('fairplay')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sortMode === 'fairplay'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mejor Fair Play
          </button>
          <button
            onClick={() => setSortMode('total')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sortMode === 'total'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Más Tarjetas
          </button>
          <button
            onClick={() => setSortMode('promedio')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              sortMode === 'promedio'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Promedio / PJ
          </button>
        </div>
      </div>

      {/* Aggregate Disciplinary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Amarillas Grupo</span>
          <div className="text-2xl font-black text-amber-400 mt-1 flex items-center gap-2">
            <span className="w-3.5 h-5 bg-amber-400 rounded-xs inline-block"></span>
            {totalAmarillasGrupo}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Amonestaciones acumuladas</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Expulsiones</span>
          <div className="text-2xl font-black text-rose-500 mt-1 flex items-center gap-2">
            <span className="w-3.5 h-5 bg-rose-500 rounded-xs inline-block"></span>
            {totalRojasGrupo}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Rojas y dobles amarillas</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Promedio Grupo</span>
          <div className="text-2xl font-black text-white mt-1">
            {promedioGrupoPorPartido} <span className="text-xs text-slate-400 font-semibold">tarjetas/partido</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Media del Grupo 50</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Líder Fair Play</span>
          <div className="text-lg font-black text-emerald-400 mt-1 truncate">
            {sortedStats[0]?.team.shortName}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {sortedStats[0]?.discipline.puntosFairPlay} pts penalización ({sortedStats[0]?.discipline.totalTarjetas} tarj.)
          </span>
        </div>
      </div>

      {/* Disciplinary Bar Chart */}
      <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-black text-white uppercase tracking-wider">
            Distribución Colectiva de Tarjetas por Equipo
          </h4>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400"></span>
              Amarillas
            </span>
            <span className="flex items-center gap-1 text-orange-400">
              <span className="w-2.5 h-2.5 rounded-xs bg-orange-400"></span>
              2ª Amarilla
            </span>
            <span className="flex items-center gap-1 text-rose-500">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
              Roja Directa
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 40 }}
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
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="Amarillas" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Dobles Amarillas" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Rojas Directas" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Disciplinary Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3">Equipo</th>
              <th className="py-2.5 px-3 text-center text-amber-400">Amarillas</th>
              <th className="py-2.5 px-3 text-center text-orange-400">Doble Amarilla</th>
              <th className="py-2.5 px-3 text-center text-rose-500">Roja Directa</th>
              <th className="py-2.5 px-3 text-center font-black text-white">Total Tarjetas</th>
              <th className="py-2.5 px-3 text-center text-slate-300">Promedio/PJ</th>
              <th className="py-2.5 px-3 text-center text-purple-400">Puntos Fair Play</th>
              <th className="py-2.5 px-3 text-center w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {sortedStats.map((item, idx) => (
              <tr 
                key={item.team.id}
                onClick={() => onSelectTeam(item.team.id)}
                className={`cursor-pointer hover:bg-slate-900/60 transition-colors ${
                  item.team.isMyTeam ? 'bg-emerald-950/30 border-l-2 border-l-emerald-500' : ''
                }`}
              >
                <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={item.team.crestUrl}
                      alt={item.team.shortName}
                      className="w-5 h-5 object-contain rounded bg-white p-0.5"
                    />
                    <span className={`font-bold ${item.team.isMyTeam ? 'text-emerald-400' : 'text-slate-200'}`}>
                      {item.team.shortName}
                    </span>
                    {item.team.isMyTeam && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-black">
                        AFE 'B'
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-amber-400">{item.discipline.amarillas}</td>
                <td className="py-2.5 px-3 text-center font-bold text-orange-400">{item.discipline.doblesAmarillas}</td>
                <td className="py-2.5 px-3 text-center font-bold text-rose-500">{item.discipline.rojasDirectas}</td>
                <td className="py-2.5 px-3 text-center font-black text-white bg-slate-900/40">
                  {item.discipline.totalTarjetas}
                </td>
                <td className="py-2.5 px-3 text-center text-slate-300">{item.discipline.promedioPorPartido.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-center font-black text-purple-300">
                  {item.discipline.puntosFairPlay} pts
                </td>
                <td className="py-2.5 px-3 text-center text-slate-600">
                  <ChevronRight className="w-3.5 h-3.5" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RivalDisciplineChart;
