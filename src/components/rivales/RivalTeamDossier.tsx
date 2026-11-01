import React, { useState } from 'react';
import { TeamCollectiveStats, RivalMatchCollective } from '@/types/rivals';
import { RIVAL_MATCHES_COLLECTIVE } from '@/data/rivalStatsData';
import { 
  Shield, 
  Flame, 
  AlertTriangle, 
  Trophy, 
  Home, 
  Plane, 
  Calendar, 
  BarChart2, 
  CheckCircle, 
  XCircle, 
  MinusCircle, 
  Smile, 
  Clock,
  Printer,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RivalTeamDossierProps {
  stats: TeamCollectiveStats[];
  initialTeamId?: string | null;
  onBack?: () => void;
  onSelectCompare?: (teamAId: string, teamBId: string) => void;
}

export const RivalTeamDossier: React.FC<RivalTeamDossierProps> = ({
  stats,
  initialTeamId,
  onBack,
  onSelectCompare
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    initialTeamId || stats.find(s => s.team.isMyTeam)?.team.id || stats[0]?.team.id
  );

  const teamStats = stats.find(s => s.team.id === selectedTeamId) || stats[0];

  // Matches for this team
  const teamMatches = RIVAL_MATCHES_COLLECTIVE.filter(
    m => m.localTeamId === teamStats.team.id || m.visitanteTeamId === teamStats.team.id
  ).sort((a, b) => a.jornada - b.jornada);

  // Collective Strengths and Weaknesses derived automatically
  const collectiveInsights: { type: 'strength' | 'weakness' | 'neutral'; text: string }[] = [];

  // Offensive strength
  if (teamStats.promedioGf >= 3.0) {
    collectiveInsights.push({
      type: 'strength',
      text: `Potencia goleadora sobresaliente con un promedio de ${teamStats.promedioGf.toFixed(1)} goles por encuentro.`
    });
  } else if (teamStats.promedioGf < 1.0) {
    collectiveInsights.push({
      type: 'weakness',
      text: `Baja efectividad rematadora: promedia ${teamStats.promedioGf.toFixed(1)} goles por partido.`
    });
  }

  // Defensive solidity
  if (teamStats.gc <= 5 && teamStats.pj >= 4) {
    collectiveInsights.push({
      type: 'strength',
      text: `Muralla defensiva grupal: únicamente ${teamStats.gc} goles encajados en ${teamStats.pj} jornadas disputadas (${teamStats.porteriasCero} porterías imbatidas).`
    });
  } else if (teamStats.promedioGc >= 3.0) {
    collectiveInsights.push({
      type: 'weakness',
      text: `Elevada fragilidad en repliegue: encaja ${teamStats.promedioGc.toFixed(1)} goles de media por partido.`
    });
  }

  // Lethal zone
  collectiveInsights.push({
    type: 'strength',
    text: `Franja de máxima letalidad ofensiva situada en el tramo ${teamStats.franjaMayorProduccion}' (${teamStats.intervals.find(i => i.franja === teamStats.franjaMayorProduccion)?.golesFavor || 0} goles marcados en este intervalo).`
  });

  // Weak zone
  collectiveInsights.push({
    type: 'weakness',
    text: `Momento de mayor vulnerabilidad defensiva localizado en el tramo ${teamStats.franjaMayorVulnerabilidad}' (${teamStats.intervals.find(i => i.franja === teamStats.franjaMayorVulnerabilidad)?.golesContra || 0} goles concedidos).`
  });

  // Home vs away balance
  if (teamStats.home.pg > teamStats.away.pg && teamStats.home.pj > 0) {
    collectiveInsights.push({
      type: 'neutral',
      text: `Mayor solidez actuando como local (${teamStats.home.puntos} pts en casa vs ${teamStats.away.puntos} pts a domicilio).`
    });
  }

  // Disciplinary index
  if (teamStats.discipline.promedioPorPartido < 1.0) {
    collectiveInsights.push({
      type: 'strength',
      text: `Excelente disciplina colectiva: media inferior a 1 tarjeta por partido (${teamStats.discipline.promedioPorPartido.toFixed(2)}/p).`
    });
  } else if (teamStats.discipline.rojasDirectas + teamStats.discipline.doblesAmarillas > 0) {
    collectiveInsights.push({
      type: 'weakness',
      text: `Antecedente de expulsiones colectivas acumuladas (${teamStats.discipline.rojasDirectas + teamStats.discipline.doblesAmarillas} rojas).`
    });
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              onClick={onBack}
              variant="outline"
              size="sm"
              className="border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl h-9"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span>Volver a Tabla</span>
            </Button>
          )}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              FICHA ESTADÍSTICA COLECTIVA 360°
            </span>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">
              Informe Técnico del Rival • Grupo 50
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Team Switcher dropdown */}
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="h-10 text-xs font-bold bg-slate-950 border border-slate-800 text-white rounded-xl px-3 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {stats.map(s => (
              <option key={s.team.id} value={s.team.id}>
                {s.pos}º {s.team.shortName} {s.team.isMyTeam ? '(Nuestro)' : ''}
              </option>
            ))}
          </select>

          {onSelectCompare && (
            <Button
              onClick={() => onSelectCompare('team-afe-b', selectedTeamId)}
              variant="outline"
              size="sm"
              className="border-slate-800 hover:bg-slate-800 text-xs font-bold text-blue-400 rounded-xl h-10"
            >
              Comparar con AFE 'B'
            </Button>
          )}

          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl h-10"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-bold">Imprimir</span>
          </Button>
        </div>
      </div>

      {/* Team Hero Profile */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-20 h-20 rounded-2xl bg-white p-2.5 flex-shrink-0 flex items-center justify-center shadow-lg border border-slate-700">
            <img
              src={teamStats.team.crestUrl}
              alt={teamStats.team.name}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <span className="text-xs font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                {teamStats.pos}º CLASIFICADO
              </span>
              <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                {teamStats.pj} PARTIDOS JUGADOS
              </span>
              {teamStats.team.isMyTeam && (
                <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 rounded-md">
                  NUESTRO EQUIPO
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mt-1">
              {teamStats.team.name}
            </h2>
            <p className="text-xs text-slate-400">
              RFFM Segunda Infantil Masculina • Grupo 50 • Partidos de 70 minutos oficiales
            </p>
          </div>
        </div>

        {/* Big Numbers */}
        <div className="flex items-center gap-4 sm:gap-6 bg-slate-900/90 border border-slate-800 px-5 py-3 rounded-2xl">
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Puntos</span>
            <span className="text-2xl font-black text-white">{teamStats.puntos}</span>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Balance</span>
            <span className="text-sm font-black text-emerald-400">
              {teamStats.pg}V - {teamStats.pe}E - {teamStats.pp}D
            </span>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Goles</span>
            <span className="text-sm font-black text-slate-200">
              {teamStats.gf} GF / {teamStats.gc} GC
            </span>
          </div>
          <div className="w-px h-8 bg-slate-800"></div>
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Dif. Goles</span>
            <span className={`text-sm font-black ${teamStats.dg > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {teamStats.dg > 0 ? `+${teamStats.dg}` : teamStats.dg}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: 3 Pillars (Local vs Away, Intervals, Discipline) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Pillar 1: Rendimiento Local vs Visitante */}
        <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Home className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              Local vs Visitante
            </h4>
          </div>

          <div className="space-y-3">
            {/* Home */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Home className="w-3.5 h-3.5" /> En Casa (Local)
                </span>
                <span className="text-white">{teamStats.home.puntos} pts</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[11px] text-slate-400 mt-2 text-center">
                <div className="bg-slate-950 p-1 rounded">
                  <span className="text-[9px] block text-slate-500">PJ</span>
                  <span className="font-bold text-white">{teamStats.home.pj}</span>
                </div>
                <div className="bg-slate-950 p-1 rounded">
                  <span className="text-[9px] block text-slate-500">V-E-D</span>
                  <span className="font-bold text-emerald-400">{teamStats.home.pg}-{teamStats.home.pe}-{teamStats.home.pp}</span>
                </div>
                <div className="bg-slate-950 p-1 rounded">
                  <span className="text-[9px] block text-slate-500">GF</span>
                  <span className="font-bold text-white">{teamStats.home.gf}</span>
                </div>
                <div className="bg-slate-950 p-1 rounded">
                  <span className="text-[9px] block text-slate-500">GC</span>
                  <span className="font-bold text-slate-300">{teamStats.home.gc}</span>
                </div>
              </div>
            </div>

            {/* Away */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <Plane className="w-3.5 h-3.5" /> A Domicilio (Visitante)
                </span>
                <span className="text-white">{teamStats.away.puntos} pts</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[11px] text-slate-400 mt-2 text-center">
                <div className="bg-slate-950 p-1 rounded">
                  <span className="text-[9px] block text-slate-500">PJ</span>
                  <span className="font-bold text-white">{teamStats.away.pj}</span>
                </div>
                <div className="bg-slate-950 p-1 rounded">
                  <span className="text-[9px] block text-slate-500">V-E-D</span>
                  <span className="font-bold text-purple-400">{teamStats.away.pg}-{teamStats.away.pe}-{teamStats.away.pp}</span>
                </div>
                <div className="bg-slate-950 p-1 rounded">
                  <span className="text-[9px] block text-slate-500">GF</span>
                  <span className="font-bold text-white">{teamStats.away.gf}</span>
                </div>
                <div className="bg-slate-950 p-1 rounded">
                  <span className="text-[9px] block text-slate-500">GC</span>
                  <span className="font-bold text-slate-300">{teamStats.away.gc}</span>
                </div>
              </div>
            </div>

            {/* Extra metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/50 p-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 block">Porterías a Cero</span>
                <span className="font-black text-emerald-400 text-sm">{teamStats.porteriasCero} partidos</span>
              </div>
              <div className="bg-slate-900/50 p-2 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 block">Partidos Sin Marcar</span>
                <span className="font-black text-rose-400 text-sm">{teamStats.partidosSinMarcar} partidos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pillar 2: Radiografía de Franjas (15 min) */}
        <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              Franjas de Goles (70 min)
            </h4>
          </div>

          <div className="space-y-2">
            {teamStats.intervals.map(i => {
              const maxVal = Math.max(...teamStats.intervals.map(x => Math.max(x.golesFavor, x.golesContra, 1)));
              const gfWidth = Math.round((i.golesFavor / maxVal) * 100);
              const gcWidth = Math.round((i.golesContra / maxVal) * 100);

              return (
                <div key={i.franja} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span>{i.label}</span>
                    <span className="text-[10px] text-slate-500">
                      <strong className="text-emerald-400 font-bold">{i.golesFavor} GF</strong> / <strong className="text-rose-400 font-bold">{i.golesContra} GC</strong>
                    </span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-slate-900 gap-0.5">
                    <div
                      style={{ width: `${gfWidth}%` }}
                      className="bg-emerald-500 rounded-l-full transition-all duration-300"
                    ></div>
                    <div
                      style={{ width: `${gcWidth}%` }}
                      className="bg-rose-500 rounded-r-full transition-all duration-300"
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Flame className="w-3 h-3" /> Letal: {teamStats.franjaMayorProduccion}'
            </span>
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Débil: {teamStats.franjaMayorVulnerabilidad}'
            </span>
          </div>
        </div>

        {/* Pillar 3: Perfil Disciplinario & Fair Play */}
        <div className="bg-slate-950/70 border border-slate-850 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Smile className="w-4 h-4 text-purple-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              Disciplina y Fair Play
            </h4>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-amber-400 block">Amarillas</span>
              <span className="text-lg font-black text-white mt-0.5 block">{teamStats.discipline.amarillas}</span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-orange-400 block">2ª Amarilla</span>
              <span className="text-lg font-black text-white mt-0.5 block">{teamStats.discipline.doblesAmarillas}</span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] uppercase font-bold text-rose-500 block">Roja Directa</span>
              <span className="text-lg font-black text-white mt-0.5 block">{teamStats.discipline.rojasDirectas}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total Tarjetas:</span>
              <span className="font-bold text-white">{teamStats.discipline.totalTarjetas}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Promedio por Partido:</span>
              <span className="font-bold text-slate-200">{teamStats.discipline.promedioPorPartido.toFixed(2)} tarj/p</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Puntuación Fair Play:</span>
              <span className="font-black text-purple-400">{teamStats.discipline.puntosFairPlay} pts penalización</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-tight">
            * Criterio federativo: 1 punto por amonestación amarilla, 3 puntos por doble amonestación y 5 puntos por tarjeta roja directa.
          </p>
        </div>

      </div>

      {/* Collective Tactical Strengths & Weaknesses (AI / Statistical Rules) */}
      <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-5 space-y-3">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          Claves Tácticas Colectivas Deducidas del Historial Oficial
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {collectiveInsights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                insight.type === 'strength'
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  : insight.type === 'weakness'
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}
            >
              {insight.type === 'strength' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : insight.type === 'weakness' ? (
                <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              ) : (
                <MinusCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{insight.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Matches List of this team */}
      <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-5 space-y-3">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          Resultados de las Jornadas Disputadas (Actas RFFM)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {teamMatches.map(m => {
            const isLocal = m.localTeamId === teamStats.team.id;
            const rivalId = isLocal ? m.visitanteTeamId : m.localTeamId;
            const rival = stats.find(s => s.team.id === rivalId)?.team;
            const teamGoals = isLocal ? (m.golesLocal ?? 0) : (m.golesVisitante ?? 0);
            const rivalGoals = isLocal ? (m.golesVisitante ?? 0) : (m.golesLocal ?? 0);
            const isWin = teamGoals > rivalGoals;
            const isDraw = teamGoals === rivalGoals;

            return (
              <div
                key={m.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Jornada {m.jornada} • {m.fecha}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-slate-400">
                      {isLocal ? 'vs' : '@'}
                    </span>
                    <span className="font-bold text-white truncate max-w-[140px]">
                      {rival?.shortName || rivalId}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-sm font-black text-white">
                      {teamGoals} - {rivalGoals}
                    </span>
                    <span className="text-[9px] text-slate-500 block">
                      {isLocal ? 'Local' : 'Visitante'}
                    </span>
                  </div>

                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs ${
                      isWin
                        ? 'bg-emerald-500 text-slate-950'
                        : isDraw
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {isWin ? 'V' : isDraw ? 'E' : 'D'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RivalTeamDossier;
