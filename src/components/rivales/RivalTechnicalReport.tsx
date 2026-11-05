import React, { useState, useEffect, useMemo } from 'react';
import { 
  TeamCollectiveStats, 
  TeamTechnicalReport,
  RivalTeam
} from '@/types/rivals';
import { RIVAL_MATCHES_COLLECTIVE } from '@/data/rivalStatsData';
import { generateLocalTacticalAdvice } from '@/lib/tacticalAdvisor';
import { supabase } from '@/lib/supabase';
import { 
  FileText, 
  Printer, 
  Share2, 
  Save, 
  Sparkles, 
  RefreshCw, 
  Check, 
  Copy, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  ArrowLeftRight, 
  Swords, 
  Users, 
  Target, 
  Zap, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Shield,
  MessageCircle,
  HelpCircle,
  Award,
  Layers,
  SlidersHorizontal,
  Home,
  Plane,
  BrainCircuit
} from 'lucide-react';
import { toast } from 'sonner';

interface RivalTechnicalReportProps {
  stats: TeamCollectiveStats[];
  initialTeamId?: string | null;
  onSelectTeamDossier?: (teamId: string) => void;
  onOpenSimulator?: (teamId: string) => void;
}

export const RivalTechnicalReport: React.FC<RivalTechnicalReportProps> = ({
  stats,
  initialTeamId,
  onSelectTeamDossier,
  onOpenSimulator
}) => {
  // Find default team (prefer initial, or rival Retiro Sur, or first team)
  const defaultTeam = useMemo(() => {
    if (initialTeamId) {
      const found = stats.find(s => s.team.id === initialTeamId);
      if (found) return found;
    }
    const nonMyTeam = stats.find(s => !s.team.isMyTeam);
    return nonMyTeam || stats[0];
  }, [stats, initialTeamId]);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(defaultTeam.team.id);
  const [selectedSystemRival, setSelectedSystemRival] = useState<string>('1-4-3-3');
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active team statistics
  const currentTeamStats = useMemo(() => {
    return stats.find(s => s.team.id === selectedTeamId) || stats[0];
  }, [stats, selectedTeamId]);

  // Our team statistics (Fundación AFE 'B')
  const myTeamStats = useMemo(() => {
    return stats.find(s => s.team.isMyTeam) || stats[0];
  }, [stats]);

  // Historical matches for current team
  const teamMatches = useMemo(() => {
    return RIVAL_MATCHES_COLLECTIVE.filter(
      m => m.localTeamId === currentTeamStats.team.id || m.visitanteTeamId === currentTeamStats.team.id
    ).sort((a, b) => a.jornada - b.jornada);
  }, [currentTeamStats]);

  // Report state
  const [report, setReport] = useState<TeamTechnicalReport>({
    teamId: currentTeamStats.team.id,
    teamName: currentTeamStats.team.name,
    fechaInforme: new Date().toISOString().split('T')[0],
    sistemaRival: '1-4-3-3',
    sistemaPropio: '1-4-2-3-1',
    objetivosOfensivos: '',
    objetivosDefensivos: '',
    puntosFuertesRival: '',
    vulnerabilidadesRival: '',
    balonParado: '',
    charlaTecnica: '',
    alineacionPrevista: '',
    convocatoria: [],
    notasEntrenador: '',
    ultimaModificacion: new Date().toISOString()
  });

  // Generate tactical recommendations tailored to real statistics
  const generateBaselineReport = (tStats: TeamCollectiveStats, rivalSys: string = '1-4-3-3') => {
    const isOurTeam = tStats.team.isMyTeam;
    const rivalName = tStats.team.shortName;
    const baseAdvice = generateLocalTacticalAdvice(rivalSys, rivalName, [], 'AFE');

    // Tailored offensive objectives based on stats
    const vulnInterval = tStats.franjaMayorVulnerabilidad;
    let objOfensivos = `1. Iniciar con circulación paciente en salida de balón atrayendo su primera línea de presión.\n2. Acelerar el juego y buscar verticalidad especialmente en el tramo de mayor vulnerabilidad rival (${vulnInterval}'), donde suelen conceder espacios.\n3. Buscar cambios de orientación rápidos para desorganizar su basculación defensiva y explotar los 1v1 exteriores.`;

    if (tStats.gc > 10) {
      objOfensivos += `\n4. Probar disparos desde media distancia: su repliegue defensivo ha concedido ${tStats.gc} goles en 4 jornadas (${tStats.promedioGc} GC/partido).`;
    }

    // Tailored defensive objectives based on stats
    const prodInterval = tStats.franjaMayorProduccion;
    let objDefensivos = `1. Máxima concentración en la franja más letal de ${rivalName} (${prodInterval}'), reforzando vigilancias defensivas y evitando faltas cerca del área.\n2. Presión tras pérdida inmediata en campo rival para abortar su transición ofensiva antes de que conecten con sus atacantes.\n3. Mantener línea defensiva compacta y en basculación coordinada.`;

    if (tStats.substitutions.minutoPrimerCambio && tStats.substitutions.minutoPrimerCambio < 35) {
      objDefensivos += `\n4. Atención a sus modificaciones tácticas tempranas: este equipo suele intervenir desde el banquillo antes del descanso (1er cambio registrado al min ${tStats.substitutions.minutoPrimerCambio}').`;
    }

    // Puntos fuertes
    let fuertes = `• Potencia ofensiva: acumulan ${tStats.gf} goles (${tStats.promedioGf} por partido).\n• Mayor pegada concentrada en el intervalo ${tStats.franjaMayorProduccion}'.\n• Su primer cambio promedio se produce sobre el minuto ${tStats.substitutions.minutoMedioCambios}', refrescando la plantilla de forma regular en 2ª Parte.`;
    if (tStats.home.pg > tStats.away.pg) {
      fuertes += `\n• Se muestran especialmente firmes como locales (${tStats.home.puntos} puntos en casa).`;
    }

    // Vulnerabilidades
    let debiles = `• Fragilidad defensiva detectada en la franja ${tStats.franjaMayorVulnerabilidad}'.\n• Promedio de ${tStats.promedioGc} goles encajados por encuentro.\n• Cuentan con ${tStats.discipline.totalTarjetas} tarjetas acumuladas (${tStats.discipline.promedioPorPartido}/p), lo que puede generarles condicionamiento arbitral en duelos divididos.`;
    if (tStats.goalTiming.masRapidoEncajado) {
      debiles += `\n• Han encajado goles tempraneros (gol más rápido recibido al minuto ${tStats.goalTiming.masRapidoEncajado.minuto}' en J.${tStats.goalTiming.masRapidoEncajado.jornada}), lo que evidencia desconexiones en el tramo inicial.`;
    }

    // Balón Parado (ABP)
    const balonParado = `• Córners Ofensivos: Envío tenso al primer palo con dos atacantes atacando la zona de prolongación y uno al rechace en la frontal.\n• Córners Defensivos: Marcaje combinado mixto con 3 hombres zonales en área pequeña y marcas individuales sobre sus rematadores más altos.\n• Faltas Frontales: Barrera coordinada de 4 jugadores con un vigilante en la corta para evitar centros rasos.`;

    // Charla Técnica Motivacional
    const charla = `1. 'La intensidad desde el minuto 1 es innegociable: si ganamos las segundas jugadas tendremos el control del partido'.\n2. 'Ojo a su momento crítico en la franja ${tStats.franjaMayorProduccion}': es donde ellos más empujan. Si estamos juntos y comunicativos, el partido es nuestro'.\n3. 'Valientes en ataque, con personalidad para pedir el balón y solidarios en el esfuerzo sin balón'.`;

    return {
      teamId: tStats.team.id,
      teamName: tStats.team.name,
      fechaInforme: new Date().toISOString().split('T')[0],
      sistemaRival: rivalSys,
      sistemaPropio: baseAdvice.sistemaRecomendado,
      objetivosOfensivos: objOfensivos,
      objetivosDefensivos: objDefensivos,
      puntosFuertesRival: fuertes,
      vulnerabilidadesRival: debiles,
      balonParado,
      charlaTecnica: charla,
      alineacionPrevista: '1-4-3-3: Sofía (PO); Elena, Carlos, Marcos, Jose; Santi, Luis, Cris; Paula, Maria, Jorge',
      convocatoria: [],
      notasEntrenador: `Informe elaborado para preparar el choque de la 2ª Infantil Grupo 50. Datos oficiales RFFM validados.`,
      ultimaModificacion: new Date().toISOString()
    };
  };

  // Load saved report or baseline on team change
  useEffect(() => {
    const storageKey = `technical_report_g50_${selectedTeamId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setReport(parsed);
        setSelectedSystemRival(parsed.sistemaRival || '1-4-3-3');
        return;
      } catch (e) {
        console.warn('Error reading saved technical report:', e);
      }
    }

    // Fallback: check match_plans in Supabase/localStorage
    const gameplansKey = `team_gameplans_INFANTIL B`;
    const savedPlans = localStorage.getItem(gameplansKey);
    let matchingPlan = null;
    if (savedPlans) {
      try {
        const list = JSON.parse(savedPlans);
        matchingPlan = list.find((p: any) => 
          p.rivalName && currentTeamStats.team.shortName.toLowerCase().includes(p.rivalName.toLowerCase())
        );
      } catch (e) {
        // ignore
      }
    }

    if (matchingPlan) {
      setReport({
        teamId: currentTeamStats.team.id,
        teamName: currentTeamStats.team.name,
        fechaInforme: matchingPlan.fechaPartido || new Date().toISOString().split('T')[0],
        sistemaRival: matchingPlan.sistemaRival || '1-4-3-3',
        sistemaPropio: matchingPlan.sistema || '1-4-2-3-1',
        objetivosOfensivos: matchingPlan.objetivos_tacticos || '',
        objetivosDefensivos: matchingPlan.puntos_fuertes_rival ? `Neutralizar: ${matchingPlan.puntos_fuertes_rival}` : '',
        puntosFuertesRival: matchingPlan.puntos_fuertes_rival || '',
        vulnerabilidadesRival: `Franja más vulnerable detectada: ${currentTeamStats.franjaMayorVulnerabilidad}'`,
        balonParado: matchingPlan.balon_parado || '',
        charlaTecnica: 'Intensidad, concentración y solidaridad en el campo.',
        alineacionPrevista: matchingPlan.alineacion_propuesta || '',
        convocatoria: matchingPlan.convocatoria || [],
        notasEntrenador: 'Plan sincronizado desde módulo Plan de Partido.',
        ultimaModificacion: new Date().toISOString()
      });
      setSelectedSystemRival(matchingPlan.sistemaRival || '1-4-3-3');
    } else {
      const generated = generateBaselineReport(currentTeamStats, selectedSystemRival);
      setReport(generated);
    }
  }, [selectedTeamId, currentTeamStats]);

  // Handle Save
  const handleSaveReport = async () => {
    setIsSaving(true);
    try {
      const updatedReport = {
        ...report,
        sistemaRival: selectedSystemRival,
        ultimaModificacion: new Date().toISOString()
      };

      const storageKey = `technical_report_g50_${selectedTeamId}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedReport));

      // Also try to sync into match_plans for Infantil B
      const matchPlanPayload = {
        team: 'INFANTIL B',
        rival_name: currentTeamStats.team.shortName,
        fecha_partido: updatedReport.fechaInforme,
        sistema: updatedReport.sistemaPropio,
        sistema_rival: updatedReport.sistemaRival,
        convocatoria: updatedReport.convocatoria || [],
        objetivos_tacticos: `${updatedReport.objetivosOfensivos}\n\n${updatedReport.objetivosDefensivos}`,
        alineacion_propuesta: updatedReport.alineacionPrevista,
        puntos_fuertes_rival: updatedReport.puntosFuertesRival,
        balon_parado: updatedReport.balonParado
      };

      try {
        await supabase
          .from('match_plans')
          .upsert(matchPlanPayload, { onConflict: 'team,rival_name' });
      } catch (err) {
        // Fallback to local storage handled
      }

      setReport(updatedReport);
      toast.success(`Informe técnico de ${currentTeamStats.team.shortName} guardado con éxito.`);
    } catch (error) {
      toast.error('Error al guardar el informe técnico.');
    } finally {
      setIsSaving(false);
    }
  };

  // Re-generate with AI & stats
  const handleRegenerateAdvice = () => {
    const fresh = generateBaselineReport(currentTeamStats, selectedSystemRival);
    setReport(prev => ({
      ...fresh,
      notasEntrenador: prev.notasEntrenador || fresh.notasEntrenador,
      alineacionPrevista: prev.alineacionPrevista || fresh.alineacionPrevista
    }));
    toast.success('Pautas tácticas y estadísticas recalculadas con éxito.');
  };

  // Copy structured WhatsApp summary for coaching staff
  const handleCopyWhatsApp = () => {
    const text = `📋 *INFORME TÉCNICO OFICIAL - RFFM GRUPO 50*
⚽ *RIVAL:* ${currentTeamStats.team.name}
📊 *CLASIFICACIÓN:* ${currentTeamStats.pos}º PUESTO (${currentTeamStats.puntos} PTS • ${currentTeamStats.gf} GF / ${currentTeamStats.gc} GC)
📅 *FECHA EMISIÓN:* ${report.fechaInforme}

🧠 *SISTEMAS DE JUEGO:*
• Rival: ${selectedSystemRival}
• Contra-sistema recomendado: ${report.sistemaPropio}

⚠️ *ALERTAS ESTADÍSTICAS RFFM:*
• Momento más letal rival: Franja ${currentTeamStats.franjaMayorProduccion}'
• Momento más vulnerable: Franja ${currentTeamStats.franjaMayorVulnerabilidad}'
• 1er Cambio habitual: Minuto ${currentTeamStats.substitutions.minutoPrimerCambio || 35}'
• Minuto medio de sustituciones: ${currentTeamStats.substitutions.minutoMedioCambios}'
• Disciplina: ${currentTeamStats.discipline.totalTarjetas} tarjetas (${currentTeamStats.discipline.promedioPorPartido}/p)

🎯 *OBJETIVOS EN FASE OFENSIVA:*
${report.objetivosOfensivos}

🛡️ *OBJETIVOS EN FASE DEFENSIVA:*
${report.objetivosDefensivos}

🔥 *PUNTOS FUERTES:*
${report.puntosFuertesRival}

🎯 *VULNERABILIDADES A EXPLOTAR:*
${report.vulnerabilidadesRival}

📐 *BALÓN PARADO (ABP):*
${report.balonParado}

🗣️ *PAUTAS CHARLA TÉCNICA:*
${report.charlaTecnica}

_Cuerpo Técnico • S.A.D. Fundación Escuela de Fútbol AFE 'B'_`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success('Resumen técnico copiado al portapapeles para WhatsApp.');
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Team Selector (Screen view) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl print:hidden space-y-4">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Herramienta de Scouting & Cuerpo Técnico
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                RFFM Segunda Infantil • Grupo 50
              </span>
            </div>
            <h3 className="text-xl font-black text-white flex items-center gap-2 mt-1">
              <FileText className="w-5 h-5 text-indigo-400" />
              Preparación de Informe Técnico de Rival
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
              Genera, personaliza y exporta el dosier técnico completo de cualquier equipo del grupo integrando estadísticas colectivas oficiales (goles por franjas, cronometría de minutos, cambios) y el plan de partido táctico.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenSimulator && (
              <button
                onClick={() => onOpenSimulator(selectedTeamId)}
                className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Abrir en el Simulador Táctico Interactivo"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-blue-400" />
                <span>Simulador Táctico</span>
              </button>
            )}

            <button
              onClick={handleRegenerateAdvice}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Recalcular propuesta táctica en base a las estadísticas del rival"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Autocompletar Táctica</span>
            </button>

            <button
              onClick={handleCopyWhatsApp}
              className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Copiar texto para WhatsApp"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isCopied ? '¡Copiado!' : 'WhatsApp'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Imprimir o guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={handleSaveReport}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-900/40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Informe'}</span>
            </button>
          </div>
        </div>

        {/* Team Selector Dropdown */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <label htmlFor="team-select-report" className="text-xs font-bold text-white block">
                  Seleccionar Equipo a Analizar:
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
                  const newIndex = currentIndex > 0 ? currentIndex - 1 : stats.length - 1;
                  setSelectedTeamId(stats[newIndex].team.id);
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
                    src={currentTeamStats.team.crestUrl}
                    alt={currentTeamStats.team.shortName}
                    className="w-5 h-5 rounded-full object-contain bg-white/10 p-0.5"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <select
                  id="team-select-report"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full h-10 bg-slate-900 border-2 border-indigo-500/60 hover:border-indigo-400 text-white text-xs sm:text-sm font-bold rounded-xl pl-10 pr-9 shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer appearance-none transition-all truncate"
                >
                  {stats.map((s) => (
                    <option key={s.team.id} value={s.team.id} className="bg-slate-950 text-white py-1">
                      {s.pos}º {s.team.name} ({s.puntos} pts){s.team.isMyTeam ? ' ★ (AFE)' : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              {/* Next Team Button */}
              <button
                type="button"
                onClick={() => {
                  const currentIndex = stats.findIndex(s => s.team.id === selectedTeamId);
                  const newIndex = currentIndex < stats.length - 1 ? currentIndex + 1 : 0;
                  setSelectedTeamId(stats[newIndex].team.id);
                }}
                className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                title="Siguiente equipo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 2. THE TECHNICAL REPORT DOCUMENT (Print-Optimized Dossier) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-8 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
        
        {/* Document Header */}
        <div className="border-b-2 border-indigo-500/40 pb-6 space-y-4 print:border-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center shadow-lg border border-slate-800 print:border-black">
                <img 
                  src={currentTeamStats.team.crestUrl} 
                  alt={currentTeamStats.team.name} 
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 print:text-black block">
                  DOSSIER TÉCNICO Y SCOUTING • RFFM
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white print:text-black tracking-tight">
                  {currentTeamStats.team.name}
                </h1>
                <p className="text-xs text-slate-400 print:text-gray-600 font-medium">
                  Segunda Infantil • Grupo 50 • Temporada 2026-2027 • Partidos oficiales de 70 minutos
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-600 block">Posición Actual</span>
              <span className="text-2xl font-black text-indigo-400 print:text-black">{currentTeamStats.pos}º Puesto</span>
              <span className="text-xs text-slate-400 print:text-gray-700 block font-bold">{currentTeamStats.puntos} Puntos • {currentTeamStats.pj} PJ</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 print:bg-gray-100 print:border-gray-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-600 block">Fecha Informe</span>
              <input
                type="date"
                value={report.fechaInforme}
                onChange={(e) => setReport({ ...report, fechaInforme: e.target.value })}
                className="bg-transparent font-bold text-white print:text-black text-xs focus:outline-none w-full"
              />
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 print:bg-gray-100 print:border-gray-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-600 block">Sistema Rival</span>
              <select
                value={selectedSystemRival}
                onChange={(e) => {
                  setSelectedSystemRival(e.target.value);
                  setReport({ ...report, sistemaRival: e.target.value });
                }}
                className="bg-transparent font-bold text-indigo-400 print:text-black text-xs focus:outline-none w-full cursor-pointer"
              >
                <option value="1-4-3-3" className="bg-slate-900 text-white">1-4-3-3 (Ofensivo / Bandas)</option>
                <option value="1-4-4-2" className="bg-slate-900 text-white">1-4-4-2 (Doble Punta / Bloque)</option>
                <option value="1-4-2-3-1" className="bg-slate-900 text-white">1-4-2-3-1 (Doble Pivote / Enganche)</option>
                <option value="1-3-5-2" className="bg-slate-900 text-white">1-3-5-2 (Línea de 3 / Carrileros)</option>
                <option value="1-3-4-3" className="bg-slate-900 text-white">1-3-4-3 (Amplitud Total)</option>
              </select>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 print:bg-gray-100 print:border-gray-300">
              <span className="text-[10px] uppercase font-bold text-emerald-400 print:text-gray-600 block">Contra-Sistema Propio</span>
              <select
                value={report.sistemaPropio}
                onChange={(e) => setReport({ ...report, sistemaPropio: e.target.value })}
                className="bg-transparent font-bold text-emerald-400 print:text-black text-xs focus:outline-none w-full cursor-pointer"
              >
                <option value="1-4-2-3-1" className="bg-slate-900 text-white">1-4-2-3-1 (Equilibrio / Contrapresión)</option>
                <option value="1-4-3-3" className="bg-slate-900 text-white">1-4-3-3 (Superioridad 3v2 central)</option>
                <option value="1-4-4-2" className="bg-slate-900 text-white">1-4-4-2 (Bloque medio compacto)</option>
                <option value="1-3-5-2" className="bg-slate-900 text-white">1-3-5-2 (Carriles y juego directo)</option>
              </select>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 print:bg-gray-100 print:border-gray-300">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-600 block">Autor del Informe</span>
              <span className="font-bold text-white print:text-black block truncate">Cuerpo Técnico AFE 'B'</span>
            </div>
          </div>
        </div>

        {/* SECTION 1: Resumen Cuantitativo Oficial RFFM */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800 print:border-gray-300">
            <Award className="w-4 h-4 text-indigo-400 print:text-black" />
            <h3 className="text-xs font-black text-white print:text-black uppercase tracking-wider">
              1. Radiografía Estadística Colectiva (Actas Oficiales RFFM - Jornadas 1 a 4)
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 print:bg-gray-50 print:border-gray-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Balance Global</span>
              <span className="text-base font-black text-white print:text-black">
                {currentTeamStats.pg}V - {currentTeamStats.pe}E - {currentTeamStats.pp}D
              </span>
              <span className="text-[10px] text-slate-400 block">{currentTeamStats.pj} partidos jugados</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 print:bg-gray-50 print:border-gray-200">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Goles a Favor</span>
              <span className="text-base font-black text-emerald-400 print:text-black">
                {currentTeamStats.gf} GF ({currentTeamStats.promedioGf}/p)
              </span>
              <span className="text-[10px] text-slate-400 block">Dif. Goles: {currentTeamStats.dg > 0 ? `+${currentTeamStats.dg}` : currentTeamStats.dg}</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 print:bg-gray-50 print:border-gray-200">
              <span className="text-[10px] text-rose-400 uppercase font-bold block">Goles en Contra</span>
              <span className="text-base font-black text-rose-400 print:text-black">
                {currentTeamStats.gc} GC ({currentTeamStats.promedioGc}/p)
              </span>
              <span className="text-[10px] text-slate-400 block">{currentTeamStats.porteriasCero} porterías a cero</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 print:bg-gray-50 print:border-gray-200">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Franja Más Letal</span>
              <span className="text-base font-black text-amber-400 print:text-black">
                {currentTeamStats.franjaMayorProduccion}'
              </span>
              <span className="text-[10px] text-slate-400 block">Mayor volumen ofensivo</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 print:bg-gray-50 print:border-gray-200">
              <span className="text-[10px] text-cyan-400 uppercase font-bold block">Franja Más Frágil</span>
              <span className="text-base font-black text-cyan-400 print:text-black">
                {currentTeamStats.franjaMayorVulnerabilidad}'
              </span>
              <span className="text-[10px] text-slate-400 block">Donde más encajan</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 print:bg-gray-50 print:border-gray-200">
              <span className="text-[10px] text-purple-400 uppercase font-bold block">Disciplina & Cambios</span>
              <span className="text-base font-black text-purple-400 print:text-black">
                {currentTeamStats.discipline.totalTarjetas} Tarj • {currentTeamStats.substitutions.totalCambios} Subs
              </span>
              <span className="text-[10px] text-slate-400 block">1er cambio: {currentTeamStats.substitutions.minutoPrimerCambio || 35}'</span>
            </div>
          </div>

          {/* Table of intervals */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-850 print:bg-gray-50 print:border-gray-200 space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 print:text-black block">
              Distribución de Goles en Franjas de 15 Minutos (70 min)
            </span>
            <div className="grid grid-cols-6 gap-2 text-center text-xs">
              {currentTeamStats.intervals.map(i => (
                <div 
                  key={i.franja}
                  className={`p-2 rounded-xl border ${
                    i.franja === currentTeamStats.franjaMayorProduccion 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                      : i.franja === currentTeamStats.franjaMayorVulnerabilidad
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 print:bg-white print:border-gray-300 print:text-black'
                  }`}
                >
                  <span className="text-[10px] font-bold block text-slate-500 print:text-gray-600">{i.label}</span>
                  <div className="flex items-center justify-center gap-1 font-black text-sm my-0.5">
                    <span className="text-emerald-400 print:text-black">{i.golesFavor} GF</span>
                    <span className="text-slate-600 print:text-gray-400">/</span>
                    <span className="text-rose-400 print:text-black">{i.golesContra} GC</span>
                  </div>
                  <span className="text-[9px] block text-slate-500 print:text-gray-600">{i.periodo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 2: Objetivos Tácticos Fase Ofensiva y Defensiva */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Fase Ofensiva */}
          <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-850 print:bg-white print:border-gray-300 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 print:border-gray-300">
              <Zap className="w-4 h-4 text-emerald-400 print:text-black" />
              <h4 className="text-xs font-black text-white print:text-black uppercase tracking-wider">
                2. Plan Táctico • Fase Ofensiva (Con Balón)
              </h4>
            </div>
            <textarea
              rows={5}
              value={report.objetivosOfensivos}
              onChange={(e) => setReport({ ...report, objetivosOfensivos: e.target.value })}
              placeholder="Consignas para salida de balón, desmarques y superioridades..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 print:text-black font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-none print:border-none print:p-0"
            />
          </div>

          {/* Fase Defensiva */}
          <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-850 print:bg-white print:border-gray-300 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 print:border-gray-300">
              <ShieldCheck className="w-4 h-4 text-blue-400 print:text-black" />
              <h4 className="text-xs font-black text-white print:text-black uppercase tracking-wider">
                3. Plan Táctico • Fase Defensiva (Sin Balón)
              </h4>
            </div>
            <textarea
              rows={5}
              value={report.objetivosDefensivos}
              onChange={(e) => setReport({ ...report, objetivosDefensivos: e.target.value })}
              placeholder="Altura de bloque, presión tras pérdida y repliegue..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 print:text-black font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-none print:border-none print:p-0"
            />
          </div>

        </div>

        {/* SECTION 3: Puntos Fuertes vs Vulnerabilidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Puntos Fuertes */}
          <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-850 print:bg-white print:border-gray-300 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 print:border-gray-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 print:text-black" />
              <h4 className="text-xs font-black text-white print:text-black uppercase tracking-wider">
                4. Puntos Fuertes & Amenazas del Rival
              </h4>
            </div>
            <textarea
              rows={5}
              value={report.puntosFuertesRival}
              onChange={(e) => setReport({ ...report, puntosFuertesRival: e.target.value })}
              placeholder="Fortalezas detectadas en sus partidos oficiales..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 print:text-black font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-none print:border-none print:p-0"
            />
          </div>

          {/* Vulnerabilidades */}
          <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-850 print:bg-white print:border-gray-300 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 print:border-gray-300">
              <Target className="w-4 h-4 text-cyan-400 print:text-black" />
              <h4 className="text-xs font-black text-white print:text-black uppercase tracking-wider">
                5. Vulnerabilidades & Zonas a Explotar
              </h4>
            </div>
            <textarea
              rows={5}
              value={report.vulnerabilidadesRival}
              onChange={(e) => setReport({ ...report, vulnerabilidadesRival: e.target.value })}
              placeholder="Debilidades estadísticas y tácticas para hacer daño..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 print:text-black font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-none print:border-none print:p-0"
            />
          </div>

        </div>

        {/* SECTION 4: Balón Parado & Charla Técnica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Balón Parado */}
          <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-850 print:bg-white print:border-gray-300 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 print:border-gray-300">
              <Shield className="w-4 h-4 text-purple-400 print:text-black" />
              <h4 className="text-xs font-black text-white print:text-black uppercase tracking-wider">
                6. Acciones a Balón Parado (ABP)
              </h4>
            </div>
            <textarea
              rows={4}
              value={report.balonParado}
              onChange={(e) => setReport({ ...report, balonParado: e.target.value })}
              placeholder="Estrategia en córners ofensivos, defensivos y faltas frontales..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 print:text-black font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-none print:border-none print:p-0"
            />
          </div>

          {/* Charla Técnica Vestuario */}
          <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-850 print:bg-white print:border-gray-300 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 print:border-gray-300">
              <MessageCircle className="w-4 h-4 text-indigo-400 print:text-black" />
              <h4 className="text-xs font-black text-white print:text-black uppercase tracking-wider">
                7. Pautas Clave para la Charla Técnica (Vestuario)
              </h4>
            </div>
            <textarea
              rows={4}
              value={report.charlaTecnica}
              onChange={(e) => setReport({ ...report, charlaTecnica: e.target.value })}
              placeholder="Mensajes concisos y motivadores antes de saltar al campo..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 print:text-black font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-none print:border-none print:p-0"
            />
          </div>

        </div>

        {/* SECTION 5: Alineación Propuesta y Notas Internas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Alineación Propuesta */}
          <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-850 print:bg-white print:border-gray-300 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 print:border-gray-300">
              <Users className="w-4 h-4 text-amber-400 print:text-black" />
              <h4 className="text-xs font-black text-white print:text-black uppercase tracking-wider">
                8. Alineación / Estructura Propuesta (Plan de Partido)
              </h4>
            </div>
            <textarea
              rows={3}
              value={report.alineacionPrevista}
              onChange={(e) => setReport({ ...report, alineacionPrevista: e.target.value })}
              placeholder="Esquema titular y distribución en el campo..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 print:text-black font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-none print:border-none print:p-0"
            />
          </div>

          {/* Notas del Entrenador */}
          <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-850 print:bg-white print:border-gray-300 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 print:border-gray-300">
              <FileText className="w-4 h-4 text-slate-400 print:text-black" />
              <h4 className="text-xs font-black text-white print:text-black uppercase tracking-wider">
                9. Notas Adicionales del Cuerpo Técnico
              </h4>
            </div>
            <textarea
              rows={3}
              value={report.notasEntrenador}
              onChange={(e) => setReport({ ...report, notasEntrenador: e.target.value })}
              placeholder="Estado del campo, condiciones climatológicas, avisos..."
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 print:text-black font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-none print:border-none print:p-0"
            />
          </div>

        </div>

        {/* Footer info for print */}
        <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 print:text-gray-600 print:border-gray-300">
          <span>Fuente Oficial: Real Federación de Fútbol de Madrid (RFFM) • 2ª Infantil G.50</span>
          <span>Elaboración Técnica Interna: S.A.D. Fundación Escuela de Fútbol AFE 'B'</span>
        </div>

      </div>

    </div>
  );
};

export default RivalTechnicalReport;
