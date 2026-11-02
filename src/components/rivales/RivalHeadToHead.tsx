import React, { useState } from 'react';
import { TeamCollectiveStats } from '@/types/rivals';
import { 
  Swords, 
  Flame, 
  AlertTriangle, 
  Trophy, 
  ShieldCheck, 
  Smile, 
  ArrowRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';

interface RivalHeadToHeadProps {
  stats: TeamCollectiveStats[];
  initialTeamAId?: string;
  initialTeamBId?: string;
  onSelectTeamDossier?: (teamId: string) => void;
}

export const RivalHeadToHead: React.FC<RivalHeadToHeadProps> = ({
  stats,
  initialTeamAId,
  initialTeamBId,
  onSelectTeamDossier
}) => {
  const myTeam = stats.find(s => s.team.isMyTeam);
  const rivalDefault = stats.find(s => s.team.id !== myTeam?.team.id);

  const [teamAId, setTeamAId] = useState<string>(initialTeamAId || myTeam?.team.id || stats[0]?.team.id);
  const [teamBId, setTeamBId] = useState<string>(initialTeamBId || rivalDefault?.team.id || stats[1]?.team.id);

  const teamA = stats.find(s => s.team.id === teamAId) || stats[0];
  const teamB = stats.find(s => s.team.id === teamBId) || stats[1];

  // Radar Metrics Normalization (0-100 scale)
  // Max values for scale
  const maxGf = Math.max(...stats.map(s => s.promedioGf), 1);
  const maxGc = Math.max(...stats.map(s => s.promedioGc), 1);
  const maxPuntos = Math.max(...stats.map(s => s.puntos), 1);

  const radarData = [
    {
      subject: 'Ataque (GF/p)',
      A: Math.round((teamA.promedioGf / maxGf) * 100),
      B: Math.round((teamB.promedioGf / maxGf) * 100),
      fullMark: 100
    },
    {
      subject: 'Defensa (Menos GC)',
      // Reverse scale so less GC means higher score
      A: Math.max(10, Math.round((1 - (teamA.promedioGc / maxGc)) * 100)),
      B: Math.max(10, Math.round((1 - (teamB.promedioGc / maxGc)) * 100)),
      fullMark: 100
    },
    {
      subject: 'Eficacia Puntos',
      A: Math.round((teamA.puntos / (teamA.pj * 3)) * 100),
      B: Math.round((teamB.puntos / (teamB.pj * 3)) * 100),
      fullMark: 100
    },
    {
      subject: 'Porterías a Cero',
      A: Math.round((teamA.porteriasCero / Math.max(teamA.pj, 1)) * 100),
      B: Math.round((teamB.porteriasCero / Math.max(teamB.pj, 1)) * 100),
      fullMark: 100
    },
    {
      subject: 'Fair Play (Limpio)',
      A: Math.max(10, Math.round(100 - teamA.discipline.puntosFairPlay * 8)),
      B: Math.max(10, Math.round(100 - teamB.discipline.puntosFairPlay * 8)),
      fullMark: 100
    },
    {
      subject: 'Goles 2ª Mitad',
      A: Math.round(((teamA.intervals.slice(3, 6).reduce((acc, i) => acc + i.golesFavor, 0)) / Math.max(teamA.gf, 1)) * 100),
      B: Math.round(((teamB.intervals.slice(3, 6).reduce((acc, i) => acc + i.golesFavor, 0)) / Math.max(teamB.gf, 1)) * 100),
      fullMark: 100
    }
  ];

  // Head-to-Head Comparative Keys
  const comparisons = [
    {
      label: 'Posición en Tabla',
      valA: `${teamA.pos}º puesto`,
      valB: `${teamB.pos}º puesto`,
      winner: teamA.pos < teamB.pos ? 'A' : teamA.pos > teamB.pos ? 'B' : 'draw'
    },
    {
      label: 'Puntos Acumulados',
      valA: `${teamA.puntos} pts`,
      valB: `${teamB.puntos} pts`,
      winner: teamA.puntos > teamB.puntos ? 'A' : teamA.puntos < teamB.puntos ? 'B' : 'draw'
    },
    {
      label: 'Promedio Goles a Favor',
      valA: `${teamA.promedioGf.toFixed(2)}/p`,
      valB: `${teamB.promedioGf.toFixed(2)}/p`,
      winner: teamA.promedioGf > teamB.promedioGf ? 'A' : teamA.promedioGf < teamB.promedioGf ? 'B' : 'draw'
    },
    {
      label: 'Promedio Goles Encajados',
      valA: `${teamA.promedioGc.toFixed(2)}/p`,
      valB: `${teamB.promedioGc.toFixed(2)}/p`,
      winner: teamA.promedioGc < teamB.promedioGc ? 'A' : teamA.promedioGc > teamB.promedioGc ? 'B' : 'draw'
    },
    {
      label: 'Porterías a Cero',
      valA: `${teamA.porteriasCero} partidos`,
      valB: `${teamB.porteriasCero} partidos`,
      winner: teamA.porteriasCero > teamB.porteriasCero ? 'A' : teamA.porteriasCero < teamB.porteriasCero ? 'B' : 'draw'
    },
    {
      label: 'Franja Mayor Letalidad',
      valA: `${teamA.franjaMayorProduccion}'`,
      valB: `${teamB.franjaMayorProduccion}'`,
      winner: 'draw'
    },
    {
      label: 'Franja Mayor Vulnerabilidad',
      valA: `${teamA.franjaMayorVulnerabilidad}'`,
      valB: `${teamB.franjaMayorVulnerabilidad}'`,
      winner: 'draw'
    },
    {
      label: 'Tarjetas Totales',
      valA: `${teamA.discipline.totalTarjetas} tarj.`,
      valB: `${teamB.discipline.totalTarjetas} tarj.`,
      winner: teamA.discipline.totalTarjetas < teamB.discipline.totalTarjetas ? 'A' : teamA.discipline.totalTarjetas > teamB.discipline.totalTarjetas ? 'B' : 'draw'
    },
    {
      label: 'Total Cambios Efectuados',
      valA: `${teamA.substitutions.totalCambios} (${teamA.substitutions.promedioPorPartido}/p)`,
      valB: `${teamB.substitutions.totalCambios} (${teamB.substitutions.promedioPorPartido}/p)`,
      winner: 'draw'
    },
    {
      label: 'Cambios en 1ª Parte (1-34\')',
      valA: `${teamA.substitutions.cambiosPrimeraParte} (${teamA.substitutions.porcentajePrimeraParte}%)`,
      valB: `${teamB.substitutions.cambiosPrimeraParte} (${teamB.substitutions.porcentajePrimeraParte}%)`,
      winner: 'draw'
    },
    {
      label: 'Cambios en Descanso (35\')',
      valA: `${teamA.substitutions.cambiosDescanso} (${teamA.substitutions.porcentajeDescanso}%)`,
      valB: `${teamB.substitutions.cambiosDescanso} (${teamB.substitutions.porcentajeDescanso}%)`,
      winner: 'draw'
    },
    {
      label: 'Minuto Primer Cambio',
      valA: teamA.substitutions.minutoPrimerCambio ? `Minuto ${teamA.substitutions.minutoPrimerCambio}'` : 'N/D',
      valB: teamB.substitutions.minutoPrimerCambio ? `Minuto ${teamB.substitutions.minutoPrimerCambio}'` : 'N/D',
      winner: 'draw'
    },
    {
      label: 'Minuto Medio de Sustituciones',
      valA: `${teamA.substitutions.minutoMedioCambios}'`,
      valB: `${teamB.substitutions.minutoMedioCambios}'`,
      winner: 'draw'
    }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Comparador Colectivo Cara a Cara (Head-to-Head)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compara el rendimiento táctico y estadístico grupal de dos equipos para preparar el enfrentamiento.
          </p>
        </div>

        {/* Quick swap button */}
        <button
          onClick={() => {
            const temp = teamAId;
            setTeamAId(teamBId);
            setTeamBId(temp);
          }}
          className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          <Swords className="w-3.5 h-3.5 text-amber-400" />
          <span>Invertir Equipos</span>
        </button>
      </div>

      {/* Selectors Matchup Banner */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
        
        {/* Team A Box */}
        <div className="md:col-span-5 bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-white p-1.5 flex items-center justify-center flex-shrink-0 shadow">
            <img src={teamA.team.crestUrl} alt={teamA.team.shortName} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">
              Equipo Local / Referencia {teamA.team.isMyTeam ? '(AFE)' : ''}
            </span>
            <select
              value={teamAId}
              onChange={(e) => setTeamAId(e.target.value)}
              className="w-full text-xs font-black bg-slate-900 border border-slate-800 text-white rounded-lg p-1.5 mt-1 focus:outline-none focus:border-emerald-500"
            >
              {stats.map(s => (
                <option key={s.team.id} value={s.team.id}>
                  {s.pos}º {s.team.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* VS Badge */}
        <div className="md:col-span-1 flex items-center justify-center">
          <span className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-amber-400 text-xs shadow-lg">
            VS
          </span>
        </div>

        {/* Team B Box */}
        <div className="md:col-span-5 bg-slate-950/80 border border-blue-500/30 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-white p-1.5 flex items-center justify-center flex-shrink-0 shadow">
            <img src={teamB.team.crestUrl} alt={teamB.team.shortName} className="max-h-full max-w-full object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase font-bold text-blue-400 block">
              Equipo Rival / Visitante {teamB.team.isMyTeam ? '(AFE)' : ''}
            </span>
            <select
              value={teamBId}
              onChange={(e) => setTeamBId(e.target.value)}
              className="w-full text-xs font-black bg-slate-900 border border-slate-800 text-white rounded-lg p-1.5 mt-1 focus:outline-none focus:border-blue-500"
            >
              {stats.map(s => (
                <option key={s.team.id} value={s.team.id}>
                  {s.pos}º {s.team.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Radar Chart & Key Comparison Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Radar Comparative (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950/70 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              Polígono Comparativo de Rendimiento
            </h4>
            <div className="flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                {teamA.team.shortName}
              </span>
              <span className="flex items-center gap-1 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                {teamB.team.shortName}
              </span>
            </div>
          </div>

          <div className="h-72 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
                <Radar
                  name={teamA.team.shortName}
                  dataKey="A"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.4}
                />
                <Radar
                  name={teamB.team.shortName}
                  dataKey="B"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '11px'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] text-slate-500 text-center">
            Escala normalizada sobre 100 puntos en base a los registros colectivos del Grupo 50.
          </p>
        </div>

        {/* Detailed KPI Battle (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/70 border border-slate-850 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              Cara a Cara de Parámetros Colectivos
            </h4>
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Verde = Ventaja Estadística
            </span>
          </div>

          <div className="space-y-2">
            {comparisons.map((c, idx) => (
              <div
                key={idx}
                className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
              >
                {/* Team A Val */}
                <div className={`w-28 text-left font-black ${c.winner === 'A' ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {c.valA}
                </div>

                {/* Metric Label */}
                <div className="flex-1 text-center font-bold text-slate-400 text-[11px] uppercase tracking-wider">
                  {c.label}
                </div>

                {/* Team B Val */}
                <div className={`w-28 text-right font-black ${c.winner === 'B' ? 'text-blue-400' : 'text-slate-300'}`}>
                  {c.valB}
                </div>
              </div>
            ))}
          </div>

          {/* Tactical keys between these two */}
          <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 block">
              Claves Tácticas del Enfrentamiento
            </span>
            <div className="text-xs text-slate-300 space-y-1">
              <p>
                • <strong>Cruce de Franjas:</strong> La franja letal de {teamA.team.shortName} ({teamA.franjaMayorProduccion}') coincide con {teamA.franjaMayorProduccion === teamB.franjaMayorVulnerabilidad ? 'el momento más frágil de su rival' : 'un periodo controlado por su rival'}.
              </p>
              <p>
                • <strong>Momento Crítico Rival:</strong> {teamB.team.shortName} produce su mayor pico ofensivo en el tramo {teamB.franjaMayorProduccion}', mientras que su repliegue sufre más en el intervalo {teamB.franjaMayorVulnerabilidad}'.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RivalHeadToHead;
