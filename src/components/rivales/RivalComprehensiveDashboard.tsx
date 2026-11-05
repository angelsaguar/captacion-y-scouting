import React, { useState, useMemo } from 'react';
import { 
  TeamCollectiveStats, 
  RivalTeam, 
  RivalMatchCollective,
  Franja15Min 
} from '@/types/rivals';
import { 
  RIVAL_MATCHES_COLLECTIVE, 
  FRANJAS_15M, 
  getFranjaFromMinute 
} from '@/data/rivalStatsData';
import { 
  LayoutDashboard, 
  Trophy, 
  Target, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  ArrowLeftRight, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Home, 
  Plane, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Copy, 
  Check, 
  Printer, 
  BrainCircuit, 
  FileText, 
  Users, 
  Hourglass, 
  Award, 
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Activity,
  SlidersHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

interface RivalComprehensiveDashboardProps {
  stats: TeamCollectiveStats[];
  initialTeamId?: string | null;
  onOpenSimulator?: (teamId: string) => void;
  onOpenReport?: (teamId: string) => void;
  onOpenDossier?: (teamId: string) => void;
}

export const RivalComprehensiveDashboard: React.FC<RivalComprehensiveDashboardProps> = ({
  stats,
  initialTeamId,
  onOpenSimulator,
  onOpenReport,
  onOpenDossier
}) => {
  // Team selection
  const defaultTeam = useMemo(() => {
    if (initialTeamId) {
      const found = stats.find(s => s.team.id === initialTeamId);
      if (found) return found;
    }
    const nonMyTeam = stats.find(s => !s.team.isMyTeam);
    return nonMyTeam || stats[0];
  }, [stats, initialTeamId]);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(defaultTeam?.team.id || 'team-retiro-sur');
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const teamStats = useMemo(() => {
    return stats.find(s => s.team.id === selectedTeamId) || defaultTeam;
  }, [stats, selectedTeamId, defaultTeam]);

  // Matches for this team (all played matches in chronological order)
  const teamMatches = useMemo(() => {
    if (!teamStats) return [];
    return RIVAL_MATCHES_COLLECTIVE.filter(
      m => m.jugado && (m.localTeamId === teamStats.team.id || m.visitanteTeamId === teamStats.team.id)
    ).sort((a, b) => a.jornada - b.jornada);
  }, [teamStats]);

  // Advanced Match-by-Match Metrics Computation
  const advancedMetrics = useMemo(() => {
    if (!teamStats || teamMatches.length === 0) {
      return {
        partidosMarcaPrimero: 0,
        partidosEncajaPrimero: 0,
        partidosSinGoles: 0,
        pctMarcaPrimero: 0,
        pctEncajaPrimero: 0,
        marcaPrimeroResultados: { pg: 0, pe: 0, pp: 0, pctVictorias: 0 },
        remontadasCompletas: 0,
        remontadasParciales: 0,
        remontadasTotal: 0,
        ventajasPerdidasTotal: 0,
        ventajasPerdidasEmpate: 0,
        ventajasPerdidasDerrota: 0,
        ultimosCinco: [],
        rachaActual: { tipo: 'neutro' as const, cantidad: 0, descripcion: 'Sin datos' },
        mejorRachaVictorias: 0,
        mejorRachaInvicto: 0,
        tendenciaOfensiva: { golesUltimos3: 0, promedioUltimos3: 0, tendencia: 'estable' as const, diff: 0 },
        tendenciaDefensiva: { gcUltimos3: 0, promedioGcUltimos3: 0, tendencia: 'estable' as const, diff: 0 },
        tarjetasPorFranja: {
          '0-15': 0,
          '16-30': 0,
          '31-35': 0,
          '36-50': 0,
          '51-65': 0,
          '66-70': 0
        },
        tarjetas1T: 0,
        tarjetas2T: 0,
        franjaMayorTarjetas: '36-50' as Franja15Min
      };
    }

    let marcaPrimero = 0;
    let encajaPrimero = 0;
    let sinGoles = 0;

    let marcaPrimeroPg = 0;
    let marcaPrimeroPe = 0;
    let marcaPrimeroPp = 0;

    let remontadasCompletas = 0; // Ganó tras empezar perdiendo
    let remontadasParciales = 0;  // Empató tras empezar perdiendo

    let ventajasPerdidasEmpate = 0;  // Empató tras adelantarse
    let ventajasPerdidasDerrota = 0; // Perdió tras adelantarse

    const tarjetasFranjas: Record<Franja15Min, number> = {
      '0-15': 0,
      '16-30': 0,
      '31-35': 0,
      '36-50': 0,
      '51-65': 0,
      '66-70': 0
    };
    let tarjetas1T = 0;
    let tarjetas2T = 0;

    const matchHistory: {
      jornada: number;
      rival: RivalTeam | undefined;
      fecha: string;
      campo: string;
      esLocal: boolean;
      golesAFavor: number;
      golesEnContra: number;
      resultado: 'V' | 'E' | 'D';
      puntosGanados: number;
    }[] = [];

    teamMatches.forEach(m => {
      const esLocal = m.localTeamId === teamStats.team.id;
      const gf = esLocal ? (m.golesLocal || 0) : (m.golesVisitante || 0);
      const gc = esLocal ? (m.golesVisitante || 0) : (m.golesLocal || 0);
      const rivalId = esLocal ? m.visitanteTeamId : m.localTeamId;
      const rival = stats.find(s => s.team.id === rivalId)?.team;

      let resultado: 'V' | 'E' | 'D' = 'E';
      let puntosGanados = 1;
      if (gf > gc) {
        resultado = 'V';
        puntosGanados = 3;
      } else if (gf < gc) {
        resultado = 'D';
        puntosGanados = 0;
      }

      matchHistory.push({
        jornada: m.jornada,
        rival,
        fecha: m.fecha,
        campo: m.campo,
        esLocal,
        golesAFavor: gf,
        golesEnContra: gc,
        resultado,
        puntosGanados
      });

      // Analyze first goal of the match
      const allGoalsSorted = [...m.goalEvents].sort((a, b) => a.minuto - b.minuto);
      if (allGoalsSorted.length === 0) {
        sinGoles++;
      } else {
        const firstGoal = allGoalsSorted[0];
        const teamScoredFirst = firstGoal.teamId === teamStats.team.id && firstGoal.esFavor;
        
        if (teamScoredFirst) {
          marcaPrimero++;
          if (resultado === 'V') marcaPrimeroPg++;
          else if (resultado === 'E') {
            marcaPrimeroPe++;
            ventajasPerdidasEmpate++;
          } else {
            marcaPrimeroPp++;
            ventajasPerdidasDerrota++;
          }
        } else {
          encajaPrimero++;
          if (resultado === 'V') remontadasCompletas++;
          else if (resultado === 'E') remontadasParciales++;
        }
      }

      // Tally cards by minute and period
      m.cardEvents.forEach(ce => {
        if (ce.teamId === teamStats.team.id) {
          const franja = getFranjaFromMinute(ce.minuto);
          tarjetasFranjas[franja]++;
          if (ce.minuto <= 35) tarjetas1T++;
          else tarjetas2T++;
        }
      });
    });

    // Detect franja with most cards
    let maxTarjetasCount = -1;
    let franjaMayorTarjetas: Franja15Min = '36-50';
    (Object.keys(tarjetasFranjas) as Franja15Min[]).forEach(fr => {
      if (tarjetasFranjas[fr] > maxTarjetasCount) {
        maxTarjetasCount = tarjetasFranjas[fr];
        franjaMayorTarjetas = fr;
      }
    });

    const pj = teamMatches.length;
    const pctMarcaPrimero = pj > 0 ? parseFloat(((marcaPrimero / pj) * 100).toFixed(1)) : 0;
    const pctEncajaPrimero = pj > 0 ? parseFloat(((encajaPrimero / pj) * 100).toFixed(1)) : 0;
    const pctVictoriasMarcaPrimero = marcaPrimero > 0 ? parseFloat(((marcaPrimeroPg / marcaPrimero) * 100).toFixed(1)) : 0;

    // Last 5 matches (reverse chronological for display)
    const ultimosCinco = [...matchHistory].reverse().slice(0, 5);

    // Current streak
    let streakTipo: 'victoria' | 'empate' | 'derrota' | 'invicto' | 'neutro' = 'neutro';
    let streakCount = 0;
    if (matchHistory.length > 0) {
      const lastRes = matchHistory[matchHistory.length - 1].resultado;
      for (let i = matchHistory.length - 1; i >= 0; i--) {
        if (matchHistory[i].resultado === lastRes) {
          streakCount++;
        } else {
          break;
        }
      }
      if (lastRes === 'V') streakTipo = 'victoria';
      else if (lastRes === 'E') streakTipo = 'empate';
      else streakTipo = 'derrota';
    }

    const rachaDescripcion = 
      streakTipo === 'victoria' ? `${streakCount} Victoria${streakCount > 1 ? 's' : ''} consecutiva${streakCount > 1 ? 's' : ''}` :
      streakTipo === 'empate' ? `${streakCount} Empate${streakCount > 1 ? 's' : ''} consecutivo${streakCount > 1 ? 's' : ''}` :
      streakTipo === 'derrota' ? `${streakCount} Derrota${streakCount > 1 ? 's' : ''} consecutiva${streakCount > 1 ? 's' : ''}` :
      'En inicio de temporada';

    // Best streaks
    let maxWins = 0;
    let curWins = 0;
    let maxUnbeaten = 0;
    let curUnbeaten = 0;

    matchHistory.forEach(m => {
      if (m.resultado === 'V') {
        curWins++;
        if (curWins > maxWins) maxWins = curWins;
      } else {
        curWins = 0;
      }

      if (m.resultado === 'V' || m.resultado === 'E') {
        curUnbeaten++;
        if (curUnbeaten > maxUnbeaten) maxUnbeaten = curUnbeaten;
      } else {
        curUnbeaten = 0;
      }
    });

    // Recent form vs season average (last 3 matches)
    const ultimos3 = matchHistory.slice(-3);
    const gfUltimos3 = ultimos3.reduce((acc, m) => acc + m.golesAFavor, 0);
    const gcUltimos3 = ultimos3.reduce((acc, m) => acc + m.golesEnContra, 0);
    const promGfUltimos3 = ultimos3.length > 0 ? parseFloat((gfUltimos3 / ultimos3.length).toFixed(2)) : 0;
    const promGcUltimos3 = ultimos3.length > 0 ? parseFloat((gcUltimos3 / ultimos3.length).toFixed(2)) : 0;

    const diffGf = parseFloat((promGfUltimos3 - teamStats.promedioGf).toFixed(2));
    const diffGc = parseFloat((promGcUltimos3 - teamStats.promedioGc).toFixed(2));

    const tendenciaOfensiva = {
      golesUltimos3: gfUltimos3,
      promedioUltimos3: promGfUltimos3,
      tendencia: diffGf > 0.3 ? ('alza' as const) : diffGf < -0.3 ? ('baja' as const) : ('estable' as const),
      diff: diffGf
    };

    const tendenciaDefensiva = {
      gcUltimos3: gcUltimos3,
      promedioGcUltimos3: promGcUltimos3,
      tendencia: diffGc > 0.3 ? ('alza' as const) : diffGc < -0.3 ? ('baja' as const) : ('estable' as const),
      diff: diffGc
    };

    return {
      partidosMarcaPrimero: marcaPrimero,
      partidosEncajaPrimero: encajaPrimero,
      partidosSinGoles: sinGoles,
      pctMarcaPrimero,
      pctEncajaPrimero,
      marcaPrimeroResultados: {
        pg: marcaPrimeroPg,
        pe: marcaPrimeroPe,
        pp: marcaPrimeroPp,
        pctVictorias: pctVictoriasMarcaPrimero
      },
      remontadasCompletas,
      remontadasParciales,
      remontadasTotal: remontadasCompletas + remontadasParciales,
      ventajasPerdidasTotal: ventajasPerdidasEmpate + ventajasPerdidasDerrota,
      ventajasPerdidasEmpate,
      ventajasPerdidasDerrota,
      ultimosCinco,
      rachaActual: {
        tipo: streakTipo,
        cantidad: streakCount,
        descripcion: rachaDescripcion
      },
      mejorRachaVictorias: maxWins,
      mejorRachaInvicto: maxUnbeaten,
      tendenciaOfensiva,
      tendenciaDefensiva,
      tarjetasPorFranja: tarjetasFranjas,
      tarjetas1T,
      tarjetas2T,
      franjaMayorTarjetas
    };
  }, [teamStats, teamMatches, stats]);

  // Copy Executive Dashboard to Clipboard
  const handleCopyDashboard = () => {
    if (!teamStats) return;
    const text = `📊 *DASHBOARD INTEGRAL DE SCOUTING RFFM (G50)* 📊
━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *EQUIPO:* ${teamStats.team.name}
🏆 *Posición:* ${teamStats.pos}º | *Puntos:* ${teamStats.puntos} pts | *PJ:* ${teamStats.pj} (${teamStats.pg}V - ${teamStats.pe}E - ${teamStats.pp}D)

*A. IDENTIFICACIÓN COMPETITIVA:*
• Efectividad de puntos: ${((teamStats.puntos / (teamStats.pj * 3)) * 100).toFixed(1)}%
• Diferencia de goles: ${teamStats.dg > 0 ? '+' : ''}${teamStats.dg} (${teamStats.gf} GF / ${teamStats.gc} GC)

*B. POTENCIAL OFENSIVO:*
• Promedio goles a favor: ${teamStats.promedioGf} g/partido
• Franja más letal: ${teamStats.franjaMayorProduccion}' (${teamStats.intervals.find(i => i.franja === teamStats.franjaMayorProduccion)?.golesFavor || 0} goles)
• Abre el marcador: ${advancedMetrics.partidosMarcaPrimero} de ${teamStats.pj} partidos (${advancedMetrics.pctMarcaPrimero}%)
• Rendimiento Casa: ${teamStats.home.pg}V-${teamStats.home.pe}E-${teamStats.home.pp}D (${teamStats.home.gf} GF / ${teamStats.home.gc} GC)
• Rendimiento Fuera: ${teamStats.away.pg}V-${teamStats.away.pe}E-${teamStats.away.pp}D (${teamStats.away.gf} GF / ${teamStats.away.gc} GC)

*C. COMPORTAMIENTO DEFENSIVO:*
• Promedio goles encajados: ${teamStats.promedioGc} g/partido
• Franja más vulnerable: ${teamStats.franjaMayorVulnerabilidad}' (${teamStats.intervals.find(i => i.franja === teamStats.franjaMayorVulnerabilidad)?.golesContra || 0} recibidos)
• Porterías a cero: ${teamStats.porteriasCero} partidos (${((teamStats.porteriasCero / teamStats.pj) * 100).toFixed(0)}%)
• Eficacia cuando se adelanta: ${advancedMetrics.marcaPrimeroResultados.pctVictorias}% de victorias

*D. COMPORTAMIENTO DURANTE EL PARTIDO:*
• Sustituciones: 1º cambio al min ${teamStats.substitutions.minutoPrimerCambio || 35}' (Media: ${teamStats.substitutions.minutoMedioCambios}')
• Remontadas conseguidas: ${advancedMetrics.remontadasTotal} (${advancedMetrics.remontadasCompletas} victorias / ${advancedMetrics.remontadasParciales} empates)
• Ventajas perdidas tras liderar: ${advancedMetrics.ventajasPerdidasTotal} partidos

*E. DISCIPLINA:*
• Tarjetas: ${teamStats.discipline.amarillas} 🟨 | ${teamStats.discipline.rojasDirectas} 🟥 | ${teamStats.discipline.doblesAmarillas} 🟨🟥 (${teamStats.discipline.promedioPorPartido}/p)
• Mayor acumulación: Franja ${advancedMetrics.franjaMayorTarjetas}' (${advancedMetrics.tarjetas2T} en 2ª Parte vs ${advancedMetrics.tarjetas1T} en 1ª Parte)

*F. ESTADO DE FORMA:*
• Racha actual: ${advancedMetrics.rachaActual.descripcion}
• Mejor racha de victorias: ${advancedMetrics.mejorRachaVictorias} seguidas (Invicto: ${advancedMetrics.mejorRachaInvicto})
• Tendencia últimos 3 partidos: ${advancedMetrics.tendenciaOfensiva.promedioUltimos3} GF/p (${advancedMetrics.tendenciaOfensiva.diff >= 0 ? '+' : ''}${advancedMetrics.tendenciaOfensiva.diff}) | ${advancedMetrics.tendenciaDefensiva.promedioGcUltimos3} GC/p
━━━━━━━━━━━━━━━━━━━━━━━━━━━
_S.A.D. Fundación Escuela de Fútbol AFE 'B' • Departamento de Scouting_`;

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    toast.success(`Dashboard de ${teamStats.team.shortName} copiado al portapapeles.`);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!teamStats) {
    return <div className="text-white p-6">Cargando datos del equipo...</div>;
  }

  const efectividadPuntos = teamStats.pj > 0 
    ? ((teamStats.puntos / (teamStats.pj * 3)) * 100).toFixed(1) 
    : '0';

  const pctPorteriasCero = teamStats.pj > 0 
    ? ((teamStats.porteriasCero / teamStats.pj) * 100).toFixed(0) 
    : '0';

  return (
    <div className="space-y-6">

      {/* Top Banner & Rival Selector (All 14 Teams of Grupo 50 accessible without scroll) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden print:border-none print:p-2">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-2">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard Integral de Rival • RFFM Segunda Infantil Grupo 50</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              Informe Exhaustivo de Análisis (Bloques A - F)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-2xl">
              Radiografía competitiva completa: Identificación, Potencial Ofensivo, Comportamiento Defensivo, Dinámica de Partido, Disciplina y Estado de Forma.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto print:hidden">
            <button
              onClick={handleCopyDashboard}
              className="flex-1 lg:flex-none px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-700 cursor-pointer shadow-sm"
              title="Copiar resumen ejecutivo para WhatsApp"
            >
              {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
              <span>{copiedSuccess ? '¡Copiado!' : 'Copiar WhatsApp'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer shadow-sm"
              title="Imprimir o guardar en PDF"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Imprimir / PDF</span>
            </button>

            {onOpenSimulator && (
              <button
                onClick={() => onOpenSimulator(selectedTeamId)}
                className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Abrir en el Simulador Táctico"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Simulador Táctico</span>
              </button>
            )}

            {onOpenReport && (
              <button
                onClick={() => onOpenReport(selectedTeamId)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Abrir Informe Técnico y Plan de Partido"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Informe Técnico</span>
              </button>
            )}
          </div>
        </div>

        {/* Team Selector Dropdown */}
        <div className="pt-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <label htmlFor="team-select-dashboard" className="text-xs font-bold text-white block">
                  Seleccionar Equipo a Examinar:
                </label>
                <span className="text-[11px] text-slate-400">
                  {stats.length} Equipos catalogados • RFFM Segunda Infantil Grupo 50
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Previous Team Button */}
              <button
                type="button"
                onClick={() => {
                  const currentIndex = stats.findIndex(s => s.team.id === selectedTeamId);
                  if (currentIndex > 0) {
                    setSelectedTeamId(stats[currentIndex - 1].team.id);
                  } else {
                    setSelectedTeamId(stats[stats.length - 1].team.id);
                  }
                }}
                className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                title="Equipo anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Styled Dropdown Container */}
              <div className="relative flex-1 sm:w-96">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                  <img
                    src={teamStats.team.crestUrl}
                    alt={teamStats.team.shortName}
                    className="w-5 h-5 rounded-full object-contain bg-white/10 p-0.5"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <select
                  id="team-select-dashboard"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full h-10 bg-slate-900 border-2 border-blue-500/60 hover:border-blue-400 text-white text-xs sm:text-sm font-bold rounded-xl pl-10 pr-9 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none transition-all truncate"
                >
                  {stats.map((s) => (
                    <option key={s.team.id} value={s.team.id} className="bg-slate-950 text-white py-1">
                      {s.pos}º {s.team.name} ({s.puntos} pts){s.team.isMyTeam ? ' ★ (AFE)' : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {/* Next Team Button */}
              <button
                type="button"
                onClick={() => {
                  const currentIndex = stats.findIndex(s => s.team.id === selectedTeamId);
                  if (currentIndex < stats.length - 1) {
                    setSelectedTeamId(stats[currentIndex + 1].team.id);
                  } else {
                    setSelectedTeamId(stats[0].team.id);
                  }
                }}
                className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                title="Siguiente equipo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Selected Team Profile Banner */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-950/60 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center shadow-lg border border-slate-700 flex-shrink-0">
              <img
                src={teamStats.team.crestUrl}
                alt={teamStats.team.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-black">
                  {teamStats.pos}º Clasificado
                </span>
                {teamStats.team.isMyTeam && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black">
                    Nuestro Equipo (AFE)
                  </span>
                )}
                <span className="text-xs text-slate-400 font-medium">
                  Segunda Infantil • Grupo 50
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                {teamStats.team.name}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center w-full md:w-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Puntos</span>
              <span className="text-lg font-black text-amber-400">{teamStats.puntos}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Partidos</span>
              <span className="text-lg font-black text-white">{teamStats.pj}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Goles (GF)</span>
              <span className="text-lg font-black text-emerald-400">{teamStats.gf}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Recibidos</span>
              <span className="text-lg font-black text-rose-400">{teamStats.gc}</span>
            </div>
          </div>
        </div>

      </div>

      {/* DASHBOARD SECTIONS A THROUGH F */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ─────────────────────────────────────────────────────────────
            A. IDENTIFICACIÓN COMPETITIVA
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Bloque A</span>
                <h3 className="text-sm font-black text-white">Identificación Competitiva</h3>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400">
              Efectividad: <strong className="text-emerald-400">{efectividadPuntos}%</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Posición Actual</span>
              <span className="text-xl font-black text-white">{teamStats.pos}º</span>
              <span className="text-[10px] text-slate-500 block">en el Grupo 50</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Puntos Totales</span>
              <span className="text-xl font-black text-amber-400">{teamStats.puntos}</span>
              <span className="text-[10px] text-slate-500 block">de {teamStats.pj * 3} posibles</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Partidos (PJ)</span>
              <span className="text-xl font-black text-white">{teamStats.pj}</span>
              <span className="text-[10px] text-slate-500 block">70 min reglamentarios</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Dif. de Goles (DG)</span>
              <span className={`text-xl font-black ${teamStats.dg >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {teamStats.dg > 0 ? `+${teamStats.dg}` : teamStats.dg}
              </span>
              <span className="text-[10px] text-slate-500 block">{teamStats.gf} GF - {teamStats.gc} GC</span>
            </div>
          </div>

          {/* Balance Victorias / Empates / Derrotas Bar */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span>Balance de Resultados:</span>
              <span>{teamStats.pg}V • {teamStats.pe}E • {teamStats.pp}D</span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-800">
              <div 
                style={{ width: `${teamStats.pj > 0 ? (teamStats.pg / teamStats.pj) * 100 : 0}%` }} 
                className="bg-emerald-500 h-full" 
                title={`${teamStats.pg} Victorias`}
              />
              <div 
                style={{ width: `${teamStats.pj > 0 ? (teamStats.pe / teamStats.pj) * 100 : 0}%` }} 
                className="bg-amber-500 h-full" 
                title={`${teamStats.pe} Empates`}
              />
              <div 
                style={{ width: `${teamStats.pj > 0 ? (teamStats.pp / teamStats.pj) * 100 : 0}%` }} 
                className="bg-rose-500 h-full" 
                title={`${teamStats.pp} Derrotas`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-semibold pt-1">
              <span className="text-emerald-400 font-bold">{teamStats.pj > 0 ? Math.round((teamStats.pg / teamStats.pj) * 100) : 0}% Victorias</span>
              <span className="text-amber-400 font-bold">{teamStats.pj > 0 ? Math.round((teamStats.pe / teamStats.pj) * 100) : 0}% Empates</span>
              <span className="text-rose-400 font-bold">{teamStats.pj > 0 ? Math.round((teamStats.pp / teamStats.pj) * 100) : 0}% Derrotas</span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            B. POTENCIAL OFENSIVO
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Bloque B</span>
                <h3 className="text-sm font-black text-white">Potencial Ofensivo</h3>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              {teamStats.promedioGf} goles/partido
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Opens Score Metric */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Abre el Marcador (1er Gol)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-400">{advancedMetrics.partidosMarcaPrimero}</span>
                <span className="text-xs text-slate-400 font-semibold">de {teamStats.pj} partidos</span>
              </div>
              <span className="text-xs font-black text-white block mt-1">
                {advancedMetrics.pctMarcaPrimero}% de los partidos
              </span>
            </div>

            {/* Lethal Interval */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Franja Más Letal</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-amber-400">Min {teamStats.franjaMayorProduccion}'</span>
              </div>
              <span className="text-xs text-slate-300 font-medium block mt-1">
                {teamStats.intervals.find(i => i.franja === teamStats.franjaMayorProduccion)?.golesFavor || 0} goles marcados en este tramo
              </span>
            </div>
          </div>

          {/* Goal Distribution across 6 15' Intervals */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Distribución de Goles Marcados por Minutos (Franjas RFFM):
            </span>
            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {teamStats.intervals.map(int => (
                <div key={int.franja} className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
                  <span className="text-[9px] font-bold text-slate-400 block truncate">{int.franja}'</span>
                  <span className="text-sm font-black text-emerald-400 block my-0.5">{int.golesFavor}</span>
                  <span className="text-[9px] text-slate-500 font-bold block">{int.porcentajeFavor}%</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Gol más rápido: <strong className="text-emerald-400">{teamStats.goalTiming.masRapidoMarcado?.minuto ? `Minuto ${teamStats.goalTiming.masRapidoMarcado.minuto}'` : 'N/D'}</strong></span>
              <span>Gol más tardío: <strong className="text-emerald-400">{teamStats.goalTiming.masTardioMarcado?.minuto ? `Minuto ${teamStats.goalTiming.masTardioMarcado.minuto}'` : 'N/D'}</strong></span>
            </div>
          </div>

          {/* Rendimiento Local vs Visitante */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3">
              <span className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1 mb-1">
                <Home className="w-3 h-3" /> Rendimiento Local
              </span>
              <p className="font-bold text-white">{teamStats.home.pg}V - {teamStats.home.pe}E - {teamStats.home.pp}D ({teamStats.home.puntos} pts)</p>
              <p className="text-[11px] text-slate-400">{teamStats.home.gf} GF / {teamStats.home.gc} GC en {teamStats.home.pj} PJ</p>
            </div>
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3">
              <span className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1 mb-1">
                <Plane className="w-3 h-3" /> Rendimiento Visitante
              </span>
              <p className="font-bold text-white">{teamStats.away.pg}V - {teamStats.away.pe}E - {teamStats.away.pp}D ({teamStats.away.puntos} pts)</p>
              <p className="text-[11px] text-slate-400">{teamStats.away.gf} GF / {teamStats.away.gc} GC en {teamStats.away.pj} PJ</p>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            C. COMPORTAMIENTO DEFENSIVO
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">Bloque C</span>
                <h3 className="text-sm font-black text-white">Comportamiento Defensivo</h3>
              </div>
            </div>
            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              {teamStats.promedioGc} encajados/p
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Clean Sheets */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Porterías a Cero</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-400">{teamStats.porteriasCero}</span>
                <span className="text-xs text-slate-400 font-semibold">de {teamStats.pj} partidos</span>
              </div>
              <span className="text-xs font-black text-white block mt-1">
                {pctPorteriasCero}% de imbatibilidad
              </span>
            </div>

            {/* Vulnerability Window */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Mayor Vulnerabilidad</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-black text-rose-400">Min {teamStats.franjaMayorVulnerabilidad}'</span>
              </div>
              <span className="text-xs text-slate-300 font-medium block mt-1">
                {teamStats.intervals.find(i => i.franja === teamStats.franjaMayorVulnerabilidad)?.golesContra || 0} recibidos en este tramo
              </span>
            </div>
          </div>

          {/* Conceded Goals by Minutes */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Distribución de Goles Recibidos por Minutos (Franjas RFFM):
            </span>
            <div className="grid grid-cols-6 gap-1.5 pt-1">
              {teamStats.intervals.map(int => (
                <div key={int.franja} className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
                  <span className="text-[9px] font-bold text-slate-400 block truncate">{int.franja}'</span>
                  <span className="text-sm font-black text-rose-400 block my-0.5">{int.golesContra}</span>
                  <span className="text-[9px] text-slate-500 font-bold block">{int.porcentajeContra}%</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Gol más rápido encajado: <strong className="text-rose-400">{teamStats.goalTiming.masRapidoEncajado?.minuto ? `Minuto ${teamStats.goalTiming.masRapidoEncajado.minuto}'` : 'Ninguno'}</strong></span>
              <span>Gol más tardío encajado: <strong className="text-rose-400">{teamStats.goalTiming.masTardioEncajado?.minuto ? `Minuto ${teamStats.goalTiming.masTardioEncajado.minuto}'` : 'Ninguno'}</strong></span>
            </div>
          </div>

          {/* Capacidad de Mantener Ventajas */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Capacidad de Mantener Ventajas:</span>
              <span className="font-black text-emerald-400">{advancedMetrics.marcaPrimeroResultados.pctVictorias}% de éxito</span>
            </div>
            <p className="text-xs text-slate-200">
              De los {advancedMetrics.partidosMarcaPrimero} partidos en los que anotó el primer gol, consolidó la victoria en <strong>{advancedMetrics.marcaPrimeroResultados.pg}</strong> encuentros, empató <strong>{advancedMetrics.marcaPrimeroResultados.pe}</strong> y cedió derrota en <strong>{advancedMetrics.marcaPrimeroResultados.pp}</strong>.
            </p>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            D. COMPORTAMIENTO DURANTE LOS PARTIDOS
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <ArrowLeftRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Bloque D</span>
                <h3 className="text-sm font-black text-white">Comportamiento en Partido</h3>
              </div>
            </div>
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
              {teamStats.substitutions.totalCambios} cambios registrados
            </span>
          </div>

          {/* Substitutions Behavior */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-purple-400 block">
              Momento Habitual de las Sustituciones (Actas RFFM):
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[9px] text-slate-400 font-bold block">1er Cambio Medio</span>
                <span className="text-base font-black text-white">
                  Min {teamStats.substitutions.minutoPrimerCambio || 35}'
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[9px] text-slate-400 font-bold block">Minuto Medio Global</span>
                <span className="text-base font-black text-purple-400">
                  {teamStats.substitutions.minutoMedioCambios}'
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[9px] text-slate-400 font-bold block">Cambios al Descanso</span>
                <span className="text-base font-black text-amber-400">
                  {teamStats.substitutions.porcentajeDescanso}%
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              Reparto: 1ª Parte (<strong>{teamStats.substitutions.cambiosPrimeraParte}</strong> cambios), Descanso min 35' (<strong>{teamStats.substitutions.cambiosDescanso}</strong> cambios), 2ª Parte (<strong>{teamStats.substitutions.cambiosSegundaParte}</strong> cambios).
            </p>
          </div>

          {/* Remontadas y Ventajas Perdidas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Remontadas Conseguidas</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-400">{advancedMetrics.remontadasTotal}</span>
                <span className="text-xs text-slate-400 font-semibold">ocasiones</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {advancedMetrics.remontadasCompletas} victorias y {advancedMetrics.remontadasParciales} empates tras empezar perdiendo.
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5">
              <span className="text-[10px] uppercase font-bold text-rose-400 block">Ventajas Perdidas</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-rose-400">{advancedMetrics.ventajasPerdidasTotal}</span>
                <span className="text-xs text-slate-400 font-semibold">ocasiones</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {advancedMetrics.ventajasPerdidasEmpate} empates y {advancedMetrics.ventajasPerdidasDerrota} derrotas tras liderar el marcador.
              </p>
            </div>
          </div>

          {/* Resultados cuando marca primero */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Efectividad cuando marca primero:</span>
              <span className="font-black text-white text-sm">
                {advancedMetrics.marcaPrimeroResultados.pg} Victorias • {advancedMetrics.marcaPrimeroResultados.pe} Empates • {advancedMetrics.marcaPrimeroResultados.pp} Derrotas
              </span>
            </div>
            <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
              {advancedMetrics.marcaPrimeroResultados.pctVictorias}% PG
            </span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            E. DISCIPLINA
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Bloque E</span>
                <h3 className="text-sm font-black text-white">Disciplina y Fair Play</h3>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              {teamStats.discipline.promedioPorPartido} tarjetas/partido
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-slate-950/70 border border-amber-500/20 rounded-2xl p-3">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">Amarillas</span>
              <span className="text-2xl font-black text-amber-400 my-0.5 block">{teamStats.discipline.amarillas}</span>
              <span className="text-[10px] text-slate-500 font-bold block">1 pt Fair Play</span>
            </div>
            <div className="bg-slate-950/70 border border-rose-500/20 rounded-2xl p-3">
              <span className="text-[10px] uppercase font-bold text-rose-400 block">Rojas Directas</span>
              <span className="text-2xl font-black text-rose-400 my-0.5 block">{teamStats.discipline.rojasDirectas}</span>
              <span className="text-[10px] text-slate-500 font-bold block">5 pts Fair Play</span>
            </div>
            <div className="bg-slate-950/70 border border-orange-500/20 rounded-2xl p-3">
              <span className="text-[10px] uppercase font-bold text-orange-400 block">Doble Amarilla</span>
              <span className="text-2xl font-black text-orange-400 my-0.5 block">{teamStats.discipline.doblesAmarillas}</span>
              <span className="text-[10px] text-slate-500 font-bold block">3 pts Fair Play</span>
            </div>
          </div>

          {/* Momentos del partido con mayor acumulación de tarjetas */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Mayor Acumulación Disciplinaria:</span>
              <span className="text-xs font-black text-amber-400">Franja {advancedMetrics.franjaMayorTarjetas}'</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-400 block">1ª Parte (1' - 35')</span>
                <span className="text-lg font-black text-white">{advancedMetrics.tarjetas1T} Tarjetas</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5">
                <span className="text-[10px] text-slate-400 block">2ª Parte (36' - 70')</span>
                <span className="text-lg font-black text-amber-400">{advancedMetrics.tarjetas2T} Tarjetas</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Puntos totales Fair Play: <strong className="text-white">{teamStats.discipline.puntosFairPlay} pts</strong> acumulados en las actas arbitrales oficiales.
            </p>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            F. ESTADO DE FORMA
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">Bloque F</span>
                <h3 className="text-sm font-black text-white">Estado de Forma & Tendencias</h3>
              </div>
            </div>
            <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              {advancedMetrics.rachaActual.descripcion}
            </span>
          </div>

          {/* Últimos 5 Encuentros Badges & List */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Últimos 5 Encuentros Disputados:
            </span>
            <div className="space-y-1.5">
              {advancedMetrics.ultimosCinco.map((m, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800/80 rounded-xl p-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-lg font-black text-[11px] flex items-center justify-center ${
                      m.resultado === 'V' ? 'bg-emerald-600 text-white' :
                      m.resultado === 'E' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {m.resultado}
                    </span>
                    <span className="text-slate-400 font-bold text-[10px]">J{m.jornada}</span>
                    <span className="text-white font-bold truncate max-w-[120px] sm:max-w-[180px]">
                      {m.esLocal ? 'vs' : '@'} {m.rival?.shortName || 'Rival'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {m.golesAFavor} - {m.golesEnContra}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                      {m.fecha}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tendencias Ofensiva & Defensiva (Últimos 3 partidos) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Tendencia Ofensiva</span>
                {advancedMetrics.tendenciaOfensiva.tendencia === 'alza' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                ) : advancedMetrics.tendenciaOfensiva.tendencia === 'baja' ? (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <span className="text-lg font-black text-white">
                {advancedMetrics.tendenciaOfensiva.promedioUltimos3} GF/p
              </span>
              <span className={`text-[10px] font-bold block mt-0.5 ${
                advancedMetrics.tendenciaOfensiva.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {advancedMetrics.tendenciaOfensiva.diff >= 0 ? `+${advancedMetrics.tendenciaOfensiva.diff}` : advancedMetrics.tendenciaOfensiva.diff} vs media anual
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Tendencia Defensiva</span>
                {advancedMetrics.tendenciaDefensiva.tendencia === 'baja' ? (
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                ) : advancedMetrics.tendenciaDefensiva.tendencia === 'alza' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <MinusCircle className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <span className="text-lg font-black text-white">
                {advancedMetrics.tendenciaDefensiva.promedioGcUltimos3} GC/p
              </span>
              <span className={`text-[10px] font-bold block mt-0.5 ${
                advancedMetrics.tendenciaDefensiva.diff <= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {advancedMetrics.tendenciaDefensiva.diff >= 0 ? `+${advancedMetrics.tendenciaDefensiva.diff}` : advancedMetrics.tendenciaDefensiva.diff} vs media anual
              </span>
            </div>
          </div>

          {/* Rachas Positivas y Negativas */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Rachas Destacadas en la Temporada:</span>
              <span className="text-white font-bold">
                Mejor racha de victorias: <strong className="text-emerald-400">{advancedMetrics.mejorRachaVictorias}</strong> • Invicto: <strong className="text-cyan-400">{advancedMetrics.mejorRachaInvicto}</strong> partidos
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
