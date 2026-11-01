import React, { useState } from 'react';
import { TeamCollectiveStats } from '@/types/rivals';
import { 
  TrendingUp, 
  Check, 
  Calendar, 
  Filter, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface RivalJornadasEvolutionProps {
  stats: TeamCollectiveStats[];
  onSelectTeam: (teamId: string) => void;
}

const LINE_COLORS = [
  '#10b981', // emerald (our team)
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
];

export const RivalJornadasEvolution: React.FC<RivalJornadasEvolutionProps> = ({
  stats,
  onSelectTeam
}) => {
  // Select up to 4-5 teams to plot simultaneously
  const myTeam = stats.find(s => s.team.isMyTeam);
  const defaultSelected = [
    myTeam?.team.id || stats[0]?.team.id,
    stats[0]?.team.id !== myTeam?.team.id ? stats[0]?.team.id : stats[1]?.team.id,
    stats[1]?.team.id !== myTeam?.team.id ? stats[1]?.team.id : stats[2]?.team.id,
    stats[2]?.team.id !== myTeam?.team.id ? stats[2]?.team.id : stats[3]?.team.id,
  ].filter(Boolean) as string[];

  const [selectedTeams, setSelectedTeams] = useState<string[]>(defaultSelected);
  const [metric, setMetric] = useState<'puntos' | 'posicion'>('puntos');

  const toggleTeam = (teamId: string) => {
    if (selectedTeams.includes(teamId)) {
      if (selectedTeams.length > 1) {
        setSelectedTeams(selectedTeams.filter(id => id !== teamId));
      }
    } else {
      if (selectedTeams.length < 6) {
        setSelectedTeams([...selectedTeams, teamId]);
      }
    }
  };

  // Build chart data across jornadas 1 to 5
  const jornadasList = [1, 2, 3, 4, 5];
  const chartData = jornadasList.map(jornada => {
    const row: any = { name: `Jornada ${jornada}`, jornada };
    selectedTeams.forEach(teamId => {
      const s = stats.find(item => item.team.id === teamId);
      if (s) {
        const evo = s.evolucionPuntos.find(e => e.jornada === jornada);
        if (metric === 'puntos') {
          row[s.team.shortName] = evo ? evo.puntos : 0;
        } else {
          row[s.team.shortName] = evo ? evo.posicion : s.pos;
        }
      }
    });
    return row;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Evolución Colectiva por Jornadas (J1 a J5)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Trayectoria y progresión de puntos acumulados en el Grupo 50. Selecciona equipos para comparar curvas.
          </p>
        </div>

        {/* Metric switch */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
          <button
            onClick={() => setMetric('puntos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              metric === 'puntos'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Puntos Acumulados
          </button>
          <button
            onClick={() => setMetric('posicion')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              metric === 'posicion'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Posición en Tabla
          </button>
        </div>
      </div>

      {/* Team Selection Badges (multiselect) */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mr-1">
          <Filter className="w-3 h-3" />
          Equipos en Gráfica (máx 6):
        </span>
        {stats.map((s, idx) => {
          const isSelected = selectedTeams.includes(s.team.id);
          const selectedIndex = selectedTeams.indexOf(s.team.id);
          const color = isSelected ? LINE_COLORS[selectedIndex % LINE_COLORS.length] : undefined;

          return (
            <button
              key={s.team.id}
              onClick={() => toggleTeam(s.team.id)}
              style={isSelected ? { borderColor: color, backgroundColor: `${color}15` } : {}}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? 'text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {isSelected && (
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: color }}
                />
              )}
              <span>{s.team.shortName}</span>
              {s.team.isMyTeam && (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-black">
                  AFE 'B'
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Line Chart */}
      <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-4 sm:p-5">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: -10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                allowDecimals={false}
                reversed={metric === 'posicion'} // 1st is on top
                domain={metric === 'posicion' ? [1, 14] : ['auto', 'auto']}
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
                formatter={(value: any, name: any) => [
                  metric === 'puntos' ? `${value} pts` : `${value}º puesto`,
                  name
                ]}
              />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }}
              />
              {selectedTeams.map((teamId, idx) => {
                const s = stats.find(item => item.team.id === teamId);
                if (!s) return null;
                const color = LINE_COLORS[idx % LINE_COLORS.length];
                return (
                  <Line
                    key={teamId}
                    type="monotone"
                    dataKey={s.team.shortName}
                    stroke={color}
                    strokeWidth={s.team.isMyTeam ? 3.5 : 2}
                    dot={{ r: 4, fill: color }}
                    activeDot={{ r: 6 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evolution Summary per team */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {selectedTeams.map((teamId) => {
          const s = stats.find(item => item.team.id === teamId);
          if (!s) return null;
          return (
            <div
              key={teamId}
              onClick={() => onSelectTeam(teamId)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                s.team.isMyTeam
                  ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={s.team.crestUrl}
                    alt={s.team.shortName}
                    className="w-5 h-5 object-contain rounded bg-white p-0.5"
                  />
                  <span className={`text-xs font-bold ${s.team.isMyTeam ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {s.team.shortName}
                  </span>
                </div>
                <span className="text-xs font-black text-white">{s.puntos} pts</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>Evolución: {s.evolucionPuntos.map(e => e.puntos).join(' → ')} pts</span>
                <span className="font-semibold text-slate-300">{s.pos}º puesto</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RivalJornadasEvolution;
