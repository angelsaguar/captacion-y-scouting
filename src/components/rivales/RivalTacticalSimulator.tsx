import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TeamCollectiveStats, 
  RivalTeam, 
  Franja15Min 
} from '@/types/rivals';
import { 
  BrainCircuit, 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Rewind, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  Flame, 
  Target, 
  ArrowLeftRight, 
  Sparkles, 
  Save, 
  Printer, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  Swords, 
  Gauge, 
  SlidersHorizontal, 
  Compass, 
  AlertTriangle, 
  Users, 
  FileText,
  Activity,
  Layers,
  ChevronDown,
  LayoutDashboard
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface RivalTacticalSimulatorProps {
  stats: TeamCollectiveStats[];
  initialTeamId?: string | null;
  onOpenReport?: (teamId: string) => void;
  onOpenDashboard?: (teamId: string) => void;
}

type Formation = '1-4-3-3' | '1-4-2-3-1' | '1-4-4-2' | '1-3-5-2' | '1-4-1-4-1';
type RivalFormation = '1-4-3-3' | '1-4-4-2' | '1-4-2-3-1' | '1-3-4-3' | '1-5-3-2';
type MatchVenue = 'local' | 'visitante';
type TacticalBlock = 'alto' | 'medio' | 'bajo';

interface TacticalScenario {
  id: string;
  name: string;
  scoreafe: number;
  scoreRival: number;
  minute: number;
  description: string;
  tacticalFocus: string;
  recommendedBlock: TacticalBlock;
  subAdvice: string;
  abpAdvice: string;
  keyInstructions: string[];
}

interface PlayerToken {
  id: string;
  dorsal: string;
  role: string;
  label: string;
  x: number; // 0 - 100% of pitch width
  y: number; // 0 - 100% of pitch height
  task: string;
}

export const RivalTacticalSimulator: React.FC<RivalTacticalSimulatorProps> = ({
  stats,
  initialTeamId,
  onOpenReport,
  onOpenDashboard
}) => {
  // 1. Team selection
  const defaultTeam = useMemo(() => {
    if (initialTeamId) {
      const found = stats.find(s => s.team.id === initialTeamId);
      if (found) return found;
    }
    const nonMyTeam = stats.find(s => !s.team.isMyTeam);
    return nonMyTeam || stats[0];
  }, [stats, initialTeamId]);

  const [selectedRivalId, setSelectedRivalId] = useState<string>(defaultTeam?.team.id || 'team-retiro-sur');
  const rivalStats = useMemo(() => {
    return stats.find(s => s.team.id === selectedRivalId) || defaultTeam;
  }, [stats, selectedRivalId, defaultTeam]);

  const ourTeamStats = useMemo(() => {
    return stats.find(s => s.team.isMyTeam) || stats[0];
  }, [stats]);

  // 2. Simulation State (Segunda Infantil: 1' to 70')
  const [currentMinute, setCurrentMinute] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1); // 1 = 1s per min, 2 = 0.5s per min
  const [venue, setVenue] = useState<MatchVenue>('local');
  const [scoreAfe, setScoreAfe] = useState<number>(0);
  const [scoreRival, setScoreRival] = useState<number>(0);
  
  // Tactical setups
  const [ourFormation, setOurFormation] = useState<Formation>('1-4-3-3');
  const [rivalFormation, setRivalFormation] = useState<RivalFormation>('1-4-3-3');
  const [currentBlock, setCurrentBlock] = useState<TacticalBlock>('medio');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('custom');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerToken | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [isSavingPlan, setIsSavingPlan] = useState<boolean>(false);

  // Auto-play timer
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(200, 1000 / playSpeed);
      playTimerRef.current = setInterval(() => {
        setCurrentMinute((prev) => {
          if (prev >= 70) {
            setIsPlaying(false);
            return 70;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, playSpeed]);

  // Determine current match period & franja
  const currentPeriod = useMemo(() => {
    if (currentMinute < 35) return '1ª Parte';
    if (currentMinute === 35) return 'Descanso (35\')';
    return '2ª Parte';
  }, [currentMinute]);

  const currentFranja: Franja15Min = useMemo(() => {
    if (currentMinute <= 15) return '0-15';
    if (currentMinute <= 30) return '16-30';
    if (currentMinute <= 35) return '31-35';
    if (currentMinute <= 50) return '36-50';
    if (currentMinute <= 65) return '51-65';
    return '66-70';
  }, [currentMinute]);

  // Statistical evaluation of rival at this current minute
  const currentIntervalData = useMemo(() => {
    if (!rivalStats) return null;
    return rivalStats.intervals.find(i => i.franja === currentFranja);
  }, [rivalStats, currentFranja]);

  // Danger & Vulnerability level calculation
  const dangerAnalysis = useMemo(() => {
    if (!rivalStats || !currentIntervalData) {
      return { level: 'media', label: 'Riesgo Normal', score: 50, desc: 'Ritmo estable de competición.' };
    }

    const gfInFranja = currentIntervalData.golesFavor;
    const pctGf = currentIntervalData.porcentajeFavor;
    const isRivalPeak = rivalStats.franjaMayorProduccion === currentFranja;

    if (isRivalPeak || pctGf >= 30 || gfInFranja >= 8) {
      return {
        level: 'critico',
        label: 'ALERTA MÁXIMA: Franja Letal Rival',
        score: 95,
        desc: `El rival concentra aquí el ${pctGf.toFixed(1)}% de sus goles (${gfInFranja} GF en franja ${currentFranja}'). Máxima concentración defensiva.`
      };
    }
    if (pctGf >= 18 || gfInFranja >= 4) {
      return {
        level: 'alto',
        label: 'Riesgo Elevado: Presión Rival',
        score: 75,
        desc: `Frecuencia ofensiva alta del rival (${gfInFranja} GF, ${pctGf.toFixed(1)}%). Evitar pérdidas en salida.`
      };
    }
    if (gfInFranja <= 1) {
      return {
        level: 'bajo',
        label: 'Riesgo Bajo: Control Táctico',
        score: 25,
        desc: `Franja con mínima efectividad goleadora del rival (${gfInFranja} GF). Momento propicio para adelantar líneas.`
      };
    }

    return {
      level: 'medio',
      label: 'Riesgo Moderado',
      score: 50,
      desc: `Intensidad intermedia. Mantener vigilancias ofensivas.`
    };
  }, [rivalStats, currentIntervalData, currentFranja]);

  const vulnerabilityAnalysis = useMemo(() => {
    if (!rivalStats || !currentIntervalData) {
      return { level: 'media', label: 'Defensa Estable', score: 50, desc: 'Sin fallas estructurales evidentes.' };
    }

    const gcInFranja = currentIntervalData.golesContra;
    const pctGc = currentIntervalData.porcentajeContra;
    const isVulnerablePeak = rivalStats.franjaMayorVulnerabilidad === currentFranja;

    if (isVulnerablePeak || pctGc >= 30 || gcInFranja >= 6) {
      return {
        level: 'oro',
        label: 'VENTANA DE ORO: Máxima Debilidad Rival',
        score: 95,
        desc: `El rival ha concedido el ${pctGc.toFixed(1)}% de sus goles en este tramo (${gcInFranja} GC). Atacar con verticalidad y centros al segundo palo.`
      };
    }
    if (pctGc >= 20 || gcInFranja >= 3) {
      return {
        level: 'propicio',
        label: 'Momento Favorable de Ataque',
        score: 70,
        desc: `Sufren desajustes defensivos (${gcInFranja} GC encajados). Forzar pérdidas con presión alta.`
      };
    }
    return {
      level: 'hermetico',
      label: 'Bloque Rival Cerrado',
      score: 30,
      desc: `Apenas encajan goles aquí (${gcInFranja} GC). Circular rápido de lado a lado para encontrar espacios.`
    };
  }, [rivalStats, currentIntervalData, currentFranja]);

  // Rival substitution intelligence for current minute
  const subIntelligence = useMemo(() => {
    if (!rivalStats) return null;
    const subs = rivalStats.substitutions;
    const minute = currentMinute;
    
    // Check if within rival's frequent change window
    let isWindow = false;
    let windowText = '';

    if (minute >= 33 && minute <= 37) {
      isWindow = true;
      windowText = `Descanso (35'): El rival concentra ${subs.cambiosDescanso} cambios (${subs.porcentajeDescanso.toFixed(0)}% del total) en el intermedio. Esperar modificaciones tácticas y piernas frescas en su reinicio.`;
    } else if (minute >= 48 && minute <= 58) {
      isWindow = true;
      windowText = `Minutos 48'-58': Ventana de fatiga rival. Han realizado ${subs.distribucionFranjas['51-65']} cambios en este periodo. Momento para castigar físicamente con nuestros extremos.`;
    } else if (minute < 30 && subs.cambiosPrimeraParte > 2) {
      isWindow = true;
      windowText = `1ª Parte temprana: Este rival ya ha efectuado ${subs.cambiosPrimeraParte} cambios en 1ª parte por corrección táctica o desgate.`;
    }

    return {
      isWindow,
      windowText,
      primerCambioMin: subs.minutoPrimerCambio,
      totalCambios: subs.totalCambios,
      promedio: subs.promedioPorPartido.toFixed(1)
    };
  }, [rivalStats, currentMinute]);

  // Pre-configured Scenarios
  const PRESET_SCENARIOS: TacticalScenario[] = useMemo(() => [
    {
      id: 'sc-1',
      name: 'Ventaja por la mínima al Descanso (1-0, min 35\')',
      scoreafe: 1,
      scoreRival: 0,
      minute: 35,
      description: 'Llegamos al intermedio ganando. El rival suele reaccionar con intensidad o cambios entre el 35\' y el 45\'.',
      tacticalFocus: 'Control de ritmo y contragolpe vertical',
      recommendedBlock: 'medio',
      subAdvice: 'Pausar los primeros 10 min de la 2ª parte. Preparar doble cambio de extremos en el 48\' para explotar sus espaldas.',
      abpAdvice: 'Evitar faltas innecesarias a menos de 30 metros. Cerrar zona en balones parados rivales.',
      keyInstructions: [
        'No precipitarse en saque de portería: buscar apoyos seguros de interiores.',
        'Presión tras pérdida de 5 segundos; si no se recupera, repliegue ordenado a bloque medio.',
        'Extremos con orden de fijar a laterales rivales para evitar subidas 2v1.'
      ]
    },
    {
      id: 'sc-2',
      name: 'Gol tempranero encajado (0-1, min 10\')',
      scoreafe: 0,
      scoreRival: 1,
      minute: 10,
      description: 'Accidente al inicio del partido. Restan 60 minutos de juego en Segunda Infantil.',
      tacticalFocus: 'Serenidad posicional y circulación exterior',
      recommendedBlock: 'medio',
      subAdvice: 'No alterar el plan ni realizar sustituciones prematuras. Transmitir calma desde la banda.',
      abpAdvice: 'Buscar saques de esquina directos al punto de penalti donde el rival duda en salida aérea.',
      keyInstructions: [
        'Cero histeria: el rival suele sufrir bajón físico en los tramos 51\'-65\'.',
        'Buscar amplitud total con los laterales abiertos y el mediocentro bajando entre centrales.',
        'Prohibido el balón dividido frontal: progresar con paredes en banda.'
      ]
    },
    {
      id: 'sc-3',
      name: 'Empate en el tramo caliente (1-1, min 55\')',
      scoreafe: 1,
      scoreRival: 1,
      minute: 55,
      description: 'Partido cerrado entrando en el último cuarto. El equipo que domine la frescura se lleva los 3 puntos.',
      tacticalFocus: 'Presión alta asfixiante y refresco físico masivo',
      recommendedBlock: 'alto',
      subAdvice: 'Ejecutar 2 o 3 sustituciones inmediatas: meter extremo desequilibrante y centrocampista ' + 'box-to-box' + '.',
      abpAdvice: 'Jugada ensayada en córner corto para sacar de zona a sus dos centrales más altos.',
      keyInstructions: [
        'Adelantar la línea defensiva al círculo central para ahogar su salida de balón.',
        'Forzar córners y faltas en banda: el rival acumula tarjetas en los últimos 20 minutos.',
        'Disparo de media distancia aprovechando el desgaste de sus mediocentros.'
      ]
    },
    {
      id: 'sc-4',
      name: 'Inferioridad numérica (Expulsión / Lesión min 45\')',
      scoreafe: 1,
      scoreRival: 1,
      minute: 45,
      description: 'Jugamos con 10 futbolistas tras una cartulina roja o lesión sin recambio inmediato.',
      tacticalFocus: 'Estructura 1-4-4-1 compacta y basculación en bloque bajo',
      recommendedBlock: 'bajo',
      subAdvice: 'Retirar un punta o mediapunta y reforzar el doble pivote defensivo.',
      abpAdvice: '100% de jugadores en repliegue en córners defensivos (dejar solo 1 descolgado para salida veloz).',
      keyInstructions: [
        'Cerrar carriles interiores: obligar al rival a enviar centros bombeados laterales.',
        'Temporizar cada saque de banda y falta para que el bloque tome aire.',
        'Aprovechar la velocidad del único punta atacando la espalda de su central lento.'
      ]
    },
    {
      id: 'sc-5',
      name: 'Cierre de partido agónico (2-1 ganando, min 65\')',
      scoreafe: 2,
      scoreRival: 1,
      minute: 65,
      description: 'Últimos 5 minutos reglamentarios. El rival va a quemar todas sus naves al ataque.',
      tacticalFocus: 'Bunker defensivo, despejes a bandas y posesión en esquina rival',
      recommendedBlock: 'bajo',
      subAdvice: 'Último cambio: refrescar central o mediocentro destructor para frenar segundos balones.',
      abpAdvice: 'Marcar al hombre al jugador más alto rival en cualquier balón colgado.',
      keyInstructions: [
        'Prohibido cometer faltas en la frontal del área: aguantar el uno contra uno sin tirarse.',
        'Cuando tengamos el balón, conducirlo al banderín de córner contrario para agotar el cronómetro.',
        'Portero con orden de asegurar balones aéreos y pausar la reanudación con seguridad.'
      ]
    },
    {
      id: 'sc-6',
      name: 'Acoso final por la remontada (0-1 perdiendo, min 63\')',
      scoreafe: 0,
      scoreRival: 1,
      minute: 63,
      description: 'Restan 7 minutos. Oportunidad de rescatar puntos mediante juego directo agresivo.',
      tacticalFocus: 'Transición a 1-3-4-3 ofensivo con 2 delanteros centro',
      recommendedBlock: 'alto',
      subAdvice: 'Quitar un defensa lateral y meter un segundo delantero rematador alto.',
      abpAdvice: 'Subir a un central de envergadura a rematar todos los balones parados.',
      keyInstructions: [
        'Balones diagonales directos a la espalda de sus centrales: cazar la segunda jugada.',
        'Poner centros tensos desde tres cuartos sin esperar a línea de fondo.',
        'Presión suicida tras pérdida: no permitir que el rival respire ni pierda tiempo.'
      ]
    }
  ], []);

  // Apply a scenario
  const handleApplyScenario = (scenario: TacticalScenario) => {
    setSelectedScenarioId(scenario.id);
    setCurrentMinute(scenario.minute);
    setScoreAfe(scenario.scoreafe);
    setScoreRival(scenario.scoreRival);
    setCurrentBlock(scenario.recommendedBlock);
    setIsPlaying(false);
    toast.info(`Escenario cargado: ${scenario.name}`);
  };

  // Generate tactical tokens based on formation & block
  const playerTokens: PlayerToken[] = useMemo(() => {
    // Y adjustments based on block: alto = higher y (closer to rival), bajo = lower y (closer to own goal)
    const blockShift = currentBlock === 'alto' ? 14 : currentBlock === 'bajo' ? -12 : 0;

    if (ourFormation === '1-4-3-3') {
      return [
        { id: 'p1', dorsal: '1', role: 'POR', label: 'Portero', x: 50, y: 10, task: 'Líbero y salida en corto.' },
        { id: 'p2', dorsal: '2', role: 'LD', label: 'Lat. Derecho', x: 86, y: 26 + blockShift * 0.7, task: 'Vigilancia al extremo rival; doblar en 2v1.' },
        { id: 'p4', dorsal: '4', role: 'DFC', label: 'Central Der.', x: 62, y: 22 + blockShift * 0.7, task: 'Anticipación y pase tenso a interior.' },
        { id: 'p5', dorsal: '5', role: 'DFC', label: 'Central Izq.', x: 38, y: 22 + blockShift * 0.7, task: 'Cobertura a banda y juego aéreo.' },
        { id: 'p3', dorsal: '3', role: 'LI', label: 'Lat. Izquierdo', x: 14, y: 26 + blockShift * 0.7, task: 'Cerrar pasillo interior al repliegue.' },
        { id: 'p6', dorsal: '6', role: 'MCD', label: 'Pivote Def.', x: 50, y: 40 + blockShift * 0.8, task: 'Equilibrio defensivo; tapar tiros de media distancia.' },
        { id: 'p8', dorsal: '8', role: 'MC', label: 'Interior Der.', x: 68, y: 52 + blockShift * 0.9, task: 'Conexión con extremo y llegada al remate.' },
        { id: 'p10', dorsal: '10', role: 'MC', label: 'Interior Izq.', x: 32, y: 52 + blockShift * 0.9, task: 'Filtrar pases interiores y presión tras pérdida.' },
        { id: 'p7', dorsal: '7', role: 'ED', label: 'Extremo Der.', x: 84, y: 72 + blockShift, task: 'Desborde 1v1 y centro al segundo palo.' },
        { id: 'p9', dorsal: '9', role: 'DC', label: 'Delantero', x: 50, y: 76 + blockShift, task: 'Fijar centrales rivales y buscar segundas jugadas.' },
        { id: 'p11', dorsal: '11', role: 'EI', label: 'Extremo Izq.', x: 16, y: 72 + blockShift, task: 'Diagonal hacia dentro y disparo cruzado.' }
      ];
    } else if (ourFormation === '1-4-2-3-1') {
      return [
        { id: 'p1', dorsal: '1', role: 'POR', label: 'Portero', x: 50, y: 10, task: 'Comando aéreo y saques tensos.' },
        { id: 'p2', dorsal: '2', role: 'LD', label: 'Lat. Der.', x: 86, y: 24 + blockShift * 0.7, task: 'Cierre de banda.' },
        { id: 'p4', dorsal: '4', role: 'DFC', label: 'Central Der.', x: 62, y: 21 + blockShift * 0.7, task: 'Firmeza en duelo terrestre.' },
        { id: 'p5', dorsal: '5', role: 'DFC', label: 'Central Izq.', x: 38, y: 21 + blockShift * 0.7, task: 'Salida limpia de balón.' },
        { id: 'p3', dorsal: '3', role: 'LI', label: 'Lat. Izq.', x: 14, y: 24 + blockShift * 0.7, task: 'Apoyo constante en progresión.' },
        { id: 'p6', dorsal: '6', role: 'MCD', label: 'Pivote 1', x: 40, y: 38 + blockShift * 0.8, task: 'Robo y descarga rápida.' },
        { id: 'p8', dorsal: '8', role: 'MCD', label: 'Pivote 2', x: 60, y: 38 + blockShift * 0.8, task: 'Cambios de orientación.' },
        { id: 'p10', dorsal: '10', role: 'MCO', label: 'Mediapunta', x: 50, y: 55 + blockShift * 0.9, task: 'Último pase y sorpresa desde segunda línea.' },
        { id: 'p7', dorsal: '7', role: 'ED', label: 'Extremo Der.', x: 82, y: 68 + blockShift, task: 'Profundidad por banda derecha.' },
        { id: 'p11', dorsal: '11', role: 'EI', label: 'Extremo Izq.', x: 18, y: 68 + blockShift, task: 'Atacar el intervalo entre lateral y central.' },
        { id: 'p9', dorsal: '9', role: 'DC', label: 'Delantero', x: 50, y: 78 + blockShift, task: 'Referencia ofensiva y remate en área.' }
      ];
    } else {
      // 1-4-4-2 or others
      return [
        { id: 'p1', dorsal: '1', role: 'POR', label: 'Portero', x: 50, y: 10, task: 'Seguridad bajo palos.' },
        { id: 'p2', dorsal: '2', role: 'LD', label: 'Lat. Der.', x: 86, y: 24 + blockShift * 0.7, task: 'Defensa férrea de costado.' },
        { id: 'p4', dorsal: '4', role: 'DFC', label: 'Central Der.', x: 62, y: 21 + blockShift * 0.7, task: 'Despeje y contundencia.' },
        { id: 'p5', dorsal: '5', role: 'DFC', label: 'Central Izq.', x: 38, y: 21 + blockShift * 0.7, task: 'Liderazgo en línea de fuera de juego.' },
        { id: 'p3', dorsal: '3', role: 'LI', label: 'Lat. Izq.', x: 14, y: 24 + blockShift * 0.7, task: 'Repliegue inmediato.' },
        { id: 'p7', dorsal: '7', role: 'MD', label: 'Interior Der.', x: 84, y: 48 + blockShift * 0.9, task: 'Recorrido ida y vuelta.' },
        { id: 'p6', dorsal: '6', role: 'MC', label: 'Medio Centro', x: 60, y: 45 + blockShift * 0.8, task: 'Contención física.' },
        { id: 'p8', dorsal: '8', role: 'MC', label: 'Medio Centro', x: 40, y: 45 + blockShift * 0.8, task: 'Dirección de juego.' },
        { id: 'p11', dorsal: '11', role: 'MI', label: 'Interior Izq.', x: 16, y: 48 + blockShift * 0.9, task: 'Centros templados al área.' },
        { id: 'p9', dorsal: '9', role: 'DC', label: 'Delantero 1', x: 40, y: 74 + blockShift, task: 'Fijar central izquierdo.' },
        { id: 'p10', dorsal: '10', role: 'DC', label: 'Delantero 2', x: 60, y: 74 + blockShift, task: 'Desmarque de ruptura.' }
      ];
    }
  }, [ourFormation, currentBlock]);

  // Rival tokens for 2D chalkboard representation
  const rivalTokens = useMemo(() => {
    // Rival starts from top (y: 90 down towards y: 20)
    return [
      { id: 'r1', label: 'P', x: 50, y: 92 },
      { id: 'r2', label: 'LD', x: 18, y: 80 },
      { id: 'r4', label: 'DF', x: 38, y: 82 },
      { id: 'r5', label: 'DF', x: 62, y: 82 },
      { id: 'r3', label: 'LI', x: 82, y: 80 },
      { id: 'r6', label: 'MC', x: 50, y: 64 },
      { id: 'r8', label: 'MC', x: 34, y: 56 },
      { id: 'r10', label: 'MC', x: 66, y: 56 },
      { id: 'r7', label: 'ED', x: 18, y: 38 },
      { id: 'r9', label: 'DC', x: 50, y: 34 },
      { id: 'r11', label: 'EI', x: 82, y: 38 }
    ];
  }, []);

  // Quick Minute jumps
  const handleJumpToMinute = (min: number) => {
    setCurrentMinute(min);
  };

  // WhatsApp briefing export
  const handleCopyBriefing = () => {
    const isAhead = scoreAfe > scoreRival;
    const isTied = scoreAfe === scoreRival;
    const situation = isAhead ? 'Ganando' : isTied ? 'Empate' : 'Desventaja';

    const text = `⚽ *SIMULADOR TÁCTICO RFFM - FUNDACIÓN AFE 'B'* ⚽
🆚 *Rival:* ${rivalStats?.team.name} (G50)
⏱ *Minuto Simulado:* ${currentMinute}' / 70' (${currentPeriod})
📊 *Marcador:* Fundación AFE 'B' ${scoreAfe} - ${scoreRival} ${rivalStats?.team.shortName} (${situation})
🛡 *Sistema Propio:* ${ourFormation} (Bloque ${currentBlock.toUpperCase()})
⚠️ *Nivel de Peligro Rival:* ${dangerAnalysis.label}
🔍 *Diagnóstico:* ${dangerAnalysis.desc}
🎯 *Ventana Ofensiva:* ${vulnerabilityAnalysis.label}
🔄 *Pautas de Sustituciones:*
${subIntelligence?.windowText || 'Gestión según fatiga y rendimiento en Segunda Infantil.'}

📌 *Consigna Inmediata de Banda:*
${selectedScenarioId !== 'custom' 
  ? PRESET_SCENARIOS.find(s => s.id === selectedScenarioId)?.tacticalFocus 
  : 'Mantener solidez posicional, intensidad en duelos y concentración en segundas jugadas.'}`;

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    toast.success('Pautas tácticas copiadas al portapapeles para WhatsApp.');
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Save to Match Plan
  const handleSaveToMatchPlan = async () => {
    setIsSavingPlan(true);
    try {
      const activeScenario = PRESET_SCENARIOS.find(s => s.id === selectedScenarioId);
      const planPayload = {
        team: 'INFANTIL B',
        rival_name: rivalStats.team.shortName,
        fecha_partido: new Date().toISOString().split('T')[0],
        sistema: ourFormation,
        sistema_rival: rivalFormation,
        convocatoria: [],
        objetivos_tacticos: `[SIMULADOR TÁCTICO RFFM]\nMinuto crítico: ${currentMinute}' (Franja ${currentFranja}')\nBloque: ${currentBlock}\nFoco: ${activeScenario?.tacticalFocus || dangerAnalysis.desc}\n${activeScenario?.keyInstructions?.join('\n') || ''}`,
        alineacion_propuesta: ourFormation,
        puntos_fuertes_rival: `${dangerAnalysis.label}. ${dangerAnalysis.desc}`,
        balon_parado: activeScenario?.abpAdvice || `Cuidar faltas laterales en franja ${currentFranja}'.`
      };

      try {
        await supabase
          .from('match_plans')
          .upsert(planPayload, { onConflict: 'team,rival_name' });
      } catch (err) {
        // Fallback to local storage
      }

      localStorage.setItem(`tactical_simulation_${selectedRivalId}`, JSON.stringify({
        ...planPayload,
        scoreAfe,
        scoreRival,
        currentMinute,
        currentBlock,
        timestamp: new Date().toISOString()
      }));

      toast.success(`Estrategia sincronizada en el Plan de Partido contra ${rivalStats.team.shortName}.`);
    } catch (e) {
      toast.error('Error al sincronizar con el Plan de Partido.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* 1. Header Banner & Rival Selection Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-2">
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Motor Táctico y Simulación de Partidos RFFM (70 Minutos)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-3">
              Simulador Inteligente Segunda Infantil Grupo 50
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Simula minutos de partido (1' a 70'), fases de fatiga, cambios rivales y escenarios de marcador cruzados con las actas arbitrales oficiales.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleCopyBriefing}
              className="flex-1 lg:flex-none px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all border border-slate-700 cursor-pointer shadow-sm"
              title="Copiar informe táctico para WhatsApp"
            >
              {copiedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
              <span>{copiedSuccess ? '¡Copiado!' : 'Copiar WhatsApp'}</span>
            </button>

            <button
              onClick={handleSaveToMatchPlan}
              disabled={isSavingPlan}
              className="flex-1 lg:flex-none px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-900/30"
              title="Guardar como plan de partido oficial"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingPlan ? 'Guardando...' : 'Guardar en Plan'}</span>
            </button>

            {onOpenDashboard && (
              <button
                onClick={() => onOpenDashboard(selectedRivalId)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                title="Abrir Dashboard Integral del Rival"
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">Dashboard Rival</span>
              </button>
            )}

            {onOpenReport && (
              <button
                onClick={() => onOpenReport(selectedRivalId)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
                title="Abrir Informe Técnico Completo"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Ver Informe Técnico</span>
              </button>
            )}
          </div>
        </div>

        {/* Rival Selector Dropdown */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <label htmlFor="rival-select-simulator" className="text-xs font-bold text-white block">
                  Seleccionar Rival de Competición:
                </label>
                <span className="text-[11px] text-slate-400">
                  {stats.length} Equipos catalogados • RFFM Segunda Infantil Grupo 50
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Previous Rival Button */}
              <button
                type="button"
                onClick={() => {
                  const currentIndex = stats.findIndex(s => s.team.id === selectedRivalId);
                  const newIndex = currentIndex > 0 ? currentIndex - 1 : stats.length - 1;
                  setSelectedRivalId(stats[newIndex].team.id);
                  setSelectedScenarioId('custom');
                }}
                className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                title="Rival anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Styled Dropdown Container */}
              <div className="relative flex-1 sm:w-96">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                  <img
                    src={rivalStats.team.crestUrl}
                    alt={rivalStats.team.shortName}
                    className="w-5 h-5 rounded-full object-contain bg-white/10 p-0.5"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <select
                  id="rival-select-simulator"
                  value={selectedRivalId}
                  onChange={(e) => {
                    setSelectedRivalId(e.target.value);
                    setSelectedScenarioId('custom');
                  }}
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

              {/* Next Rival Button */}
              <button
                type="button"
                onClick={() => {
                  const currentIndex = stats.findIndex(s => s.team.id === selectedRivalId);
                  const newIndex = currentIndex < stats.length - 1 ? currentIndex + 1 : 0;
                  setSelectedRivalId(stats[newIndex].team.id);
                  setSelectedScenarioId('custom');
                }}
                className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 flex items-center justify-center cursor-pointer transition-all flex-shrink-0"
                title="Siguiente rival"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Match Control Console: Minute Timeline, Scoreboard, Pace */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        
        {/* Top: Scoreboard & Venue */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4">
          
          {/* Our Team Score */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-start">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black">
              AFE
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Fundación AFE 'B'</span>
              <h4 className="text-sm font-black text-white">Segunda Infantil</h4>
            </div>
            <div className="flex items-center gap-1.5 ml-auto sm:ml-4">
              <button
                onClick={() => setScoreAfe(prev => Math.max(0, prev - 1))}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="text-2xl font-black text-white w-8 text-center">{scoreAfe}</span>
              <button
                onClick={() => setScoreAfe(prev => prev + 1)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Central Minute Clock */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {currentPeriod} • Franja {currentFranja}'
            </span>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-amber-400 tracking-wider font-mono">
                {String(currentMinute).padStart(2, '0')}:00'
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                / 70'
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <button
                onClick={() => setVenue('local')}
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold cursor-pointer transition-all ${
                  venue === 'local' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Casa
              </button>
              <button
                onClick={() => setVenue('visitante')}
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold cursor-pointer transition-all ${
                  venue === 'visitante' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                Fuera
              </button>
            </div>
          </div>

          {/* Rival Score */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 mr-auto sm:mr-4">
              <button
                onClick={() => setScoreRival(prev => Math.max(0, prev - 1))}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="text-2xl font-black text-white w-8 text-center">{scoreRival}</span>
              <button
                onClick={() => setScoreRival(prev => prev + 1)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-amber-400 uppercase">Rival RFFM</span>
              <h4 className="text-sm font-black text-white truncate max-w-[140px]">{rivalStats.team.shortName}</h4>
            </div>
            <img
              src={rivalStats.team.crestUrl}
              alt={rivalStats.team.shortName}
              className="w-10 h-10 rounded-xl bg-white/5 border border-slate-700 p-1 object-contain"
            />
          </div>

        </div>

        {/* Interactive Minute Slider (1' to 70') */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Línea Temporal de Simulación:
            </span>
            <span className="text-white font-mono">{currentMinute}' de 70'</span>
          </div>

          <div className="relative pt-1 pb-2">
            <input
              type="range"
              min={1}
              max={70}
              value={currentMinute}
              onChange={(e) => setCurrentMinute(Number(e.target.value))}
              className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
            />
            {/* Visual Milestones */}
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mt-1 px-1">
              <span className="cursor-pointer hover:text-white" onClick={() => handleJumpToMinute(1)}>1' Inicio</span>
              <span className="cursor-pointer hover:text-white" onClick={() => handleJumpToMinute(15)}>15'</span>
              <span className="cursor-pointer hover:text-amber-400 text-amber-500/80 font-black" onClick={() => handleJumpToMinute(35)}>
                35' Descanso
              </span>
              <span className="cursor-pointer hover:text-white" onClick={() => handleJumpToMinute(50)}>50'</span>
              <span className="cursor-pointer hover:text-white" onClick={() => handleJumpToMinute(65)}>65'</span>
              <span className="cursor-pointer hover:text-white" onClick={() => handleJumpToMinute(70)}>70' Final</span>
            </div>
          </div>

          {/* Player controls & Quick Jump Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMinute(1)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Reiniciar a minuto 1"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentMinute(prev => Math.max(1, prev - 5))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Retroceder 5 minutos"
              >
                <Rewind className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                }`}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pausar Simulación' : 'Simular en Vivo'}</span>
              </button>
              <button
                onClick={() => setCurrentMinute(prev => Math.min(70, prev + 5))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Avanzar 5 minutos"
              >
                <FastForward className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                <span className="text-slate-400 px-1.5">Vel:</span>
                {[1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaySpeed(speed)}
                    className={`px-2 py-0.5 rounded-lg cursor-pointer ${
                      playSpeed === speed ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Tactical Jump Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Saltar a:</span>
              <button
                onClick={() => handleJumpToMinute(1)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentMinute === 1 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                1' Inicio
              </button>
              <button
                onClick={() => handleJumpToMinute(35)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentMinute === 35 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
                }`}
              >
                35' Descanso
              </button>
              <button
                onClick={() => handleJumpToMinute(50)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentMinute === 50 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                50' Fatiga
              </button>
              <button
                onClick={() => handleJumpToMinute(65)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentMinute === 65 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
                }`}
              >
                65' Cierre
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Live Minute Diagnostic Alerts: Danger Zone, Attack Window, Substitution Trigger */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Danger Level in this minute */}
        <div className={`rounded-2xl p-4 border transition-all ${
          dangerAnalysis.level === 'critico'
            ? 'bg-rose-950/40 border-rose-500/40 shadow-lg shadow-rose-950/20'
            : dangerAnalysis.level === 'alto'
            ? 'bg-amber-950/30 border-amber-500/30 shadow-md'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <Flame className={`w-3.5 h-3.5 ${dangerAnalysis.level === 'critico' ? 'text-rose-400' : 'text-amber-400'}`} />
              Peligro Ofensivo Rival ({currentFranja}')
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              dangerAnalysis.level === 'critico'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : dangerAnalysis.level === 'alto'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {dangerAnalysis.label}
            </span>
          </div>
          <p className="text-xs text-slate-300 font-medium">
            {dangerAnalysis.desc}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>GF en franja: <strong className="text-white">{currentIntervalData?.golesFavor || 0}</strong></span>
            <span>% del total rival: <strong className="text-white">{currentIntervalData?.porcentajeFavor.toFixed(1) || 0}%</strong></span>
          </div>
        </div>

        {/* Card 2: Vulnerability Window in this minute */}
        <div className={`rounded-2xl p-4 border transition-all ${
          vulnerabilityAnalysis.level === 'oro'
            ? 'bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
            : vulnerabilityAnalysis.level === 'propicio'
            ? 'bg-cyan-950/30 border-cyan-500/30'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              Oportunidad de Gol AFE ({currentFranja}')
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              vulnerabilityAnalysis.level === 'oro'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            }`}>
              {vulnerabilityAnalysis.label}
            </span>
          </div>
          <p className="text-xs text-slate-300 font-medium">
            {vulnerabilityAnalysis.desc}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>GC encajados por rival: <strong className="text-white">{currentIntervalData?.golesContra || 0}</strong></span>
            <span>% de sus goles recibidos: <strong className="text-white">{currentIntervalData?.porcentajeContra.toFixed(1) || 0}%</strong></span>
          </div>
        </div>

        {/* Card 3: Substitution & Fatigue intelligence */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-purple-400" />
              Gestión de Cambios Arbitrales
            </span>
            <span className="text-[10px] font-black text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
              {currentPeriod}
            </span>
          </div>
          <p className="text-xs text-slate-300 font-medium">
            {subIntelligence?.windowText || `1º cambio medio del rival: min ${subIntelligence?.primerCambioMin || 35}'. Monitorizar frescura física de sus laterales.`}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Cambios en Descanso: <strong className="text-white">{rivalStats.substitutions.cambiosDescanso}</strong></span>
            <span>Cambios en 2ª Parte: <strong className="text-white">{rivalStats.substitutions.cambiosSegundaParte}</strong></span>
          </div>
        </div>

      </div>

      {/* 4. Tactical Scenarios Selector ("Qué Pasa Si...") */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Escenarios Tácticos Simulados ("Qué Pasa Si..."):
          </span>
          <span className="text-xs text-slate-400">
            Selecciona un escenario para ajustar la pizarra y directrices en 1 clic
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {PRESET_SCENARIOS.map((sc) => {
            const isActive = selectedScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => handleApplyScenario(sc)}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden ${
                  isActive
                    ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg ring-1 ring-blue-400/50'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-blue-400">
                    Minuto {sc.minute}' • Marcador {sc.scoreafe}-{sc.scoreRival}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    sc.recommendedBlock === 'alto' 
                      ? 'bg-emerald-500/20 text-emerald-300' 
                      : sc.recommendedBlock === 'bajo' 
                      ? 'bg-rose-500/20 text-rose-300' 
                      : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    Bloque {sc.recommendedBlock.toUpperCase()}
                  </span>
                </div>
                <h4 className="text-xs font-black text-white line-clamp-1">{sc.name}</h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{sc.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Main Tactical Chalkboard Field (2D Pitch) + Dynamic Instruction Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visual Tactical Pitch (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
          
          {/* Pitch Configuration Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 border border-slate-800 p-2.5 rounded-2xl">
            {/* Formation Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">Sistema AFE:</span>
              <select
                value={ourFormation}
                onChange={(e) => setOurFormation(e.target.value as Formation)}
                className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="1-4-3-3">1-4-3-3 (Ofensivo)</option>
                <option value="1-4-2-3-1">1-4-2-3-1 (Equilibrado)</option>
                <option value="1-4-4-2">1-4-4-2 (Doble Punta)</option>
                <option value="1-3-5-2">1-3-5-2 (Carrileros)</option>
              </select>
            </div>

            {/* Block Height Selector */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <span className="text-[10px] text-slate-400 px-1">Altura:</span>
              {(['alto', 'medio', 'bajo'] as TacticalBlock[]).map((blk) => (
                <button
                  key={blk}
                  onClick={() => setCurrentBlock(blk)}
                  className={`px-2.5 py-1 rounded-lg uppercase text-[10px] font-black cursor-pointer transition-all ${
                    currentBlock === blk
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {blk}
                </button>
              ))}
            </div>
          </div>

          {/* 2D Green Tactical Pitch */}
          <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-950 rounded-2xl border-4 border-emerald-700/50 overflow-hidden shadow-inner p-3 select-none">
            
            {/* Pitch Grass Strips */}
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_30px,rgba(255,255,255,0.1)_30px,rgba(255,255,255,0.1)_60px)] pointer-events-none" />

            {/* Field Boundary Lines */}
            <div className="absolute inset-3 border-2 border-white/30 pointer-events-none rounded-sm">
              {/* Center Line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/30 -translate-y-1/2" />
              {/* Center Circle */}
              <div className="absolute top-1/2 left-1/2 w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
              <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />

              {/* Bottom Penalty Area (AFE Goal) */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-24 border-t-2 border-l-2 border-r-2 border-white/30" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-10 border-t-2 border-l-2 border-r-2 border-white/30" />
              <div className="absolute bottom-18 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/50" />

              {/* Top Penalty Area (Rival Goal) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 border-b-2 border-l-2 border-r-2 border-white/30" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-10 border-b-2 border-l-2 border-r-2 border-white/30" />
              <div className="absolute top-18 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white/50" />
            </div>

            {/* Tactical Block Shaded Area */}
            <div 
              className={`absolute left-4 right-4 rounded-xl border border-blue-400/40 transition-all duration-500 pointer-events-none ${
                currentBlock === 'alto'
                  ? 'top-24 bottom-44 bg-blue-500/10'
                  : currentBlock === 'bajo'
                  ? 'top-48 bottom-12 bg-blue-500/10'
                  : 'top-32 bottom-24 bg-blue-500/10'
              }`}
            >
              <span className="absolute top-2 right-2 text-[9px] font-black uppercase text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-400/30">
                Bloque {currentBlock.toUpperCase()} ({currentMinute}')
              </span>
            </div>

            {/* Rival Tokens (Defending top goal) */}
            {rivalTokens.map((r) => (
              <div
                key={r.id}
                style={{ left: `${r.x}%`, top: `${100 - r.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-rose-600/90 text-white font-black text-[10px] flex items-center justify-center border-2 border-white/80 shadow-md shadow-rose-950/40 pointer-events-none z-10"
              >
                {r.label}
              </div>
            ))}

            {/* Our Team Tokens (Fundación AFE 'B' blue tokens) */}
            {playerTokens.map((p) => {
              const isSelected = selectedPlayer?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayer(p)}
                  style={{ left: `${p.x}%`, top: `${100 - p.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full font-black text-xs flex items-center justify-center border-2 transition-all cursor-pointer z-20 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 border-white ring-4 ring-amber-400/50 scale-125 z-30 shadow-xl'
                      : 'bg-blue-600 text-white border-cyan-300 hover:scale-110 shadow-lg shadow-blue-950/50'
                  }`}
                  title={`${p.role} (#${p.dorsal}): ${p.label}`}
                >
                  <span>{p.dorsal}</span>
                </button>
              );
            })}

          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              Fundación AFE 'B' (Azul)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              {rivalStats.team.shortName} (Rojo)
            </span>
            <span>Haz clic en un dorsal para ver su asignación</span>
          </div>

        </div>

        {/* Right Column: In-Game Directives & Tactical Assignments (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Active Player Inspector Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                Asignación de Puesto en Este Minuto:
              </span>
              {selectedPlayer && (
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-black">
                  #{selectedPlayer.dorsal} • {selectedPlayer.role}
                </span>
              )}
            </div>

            {selectedPlayer ? (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-lg flex items-center justify-center">
                    {selectedPlayer.dorsal}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white">{selectedPlayer.label}</h4>
                    <span className="text-xs text-blue-400 font-bold">{selectedPlayer.role} • Segunda Infantil</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Directriz Táctica para Minuto {currentMinute}':
                  </span>
                  <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                    {selectedPlayer.task}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-xs">Toca cualquier ficha en la pizarra para ver la instrucción individual del jugador en esta situación de juego.</p>
              </div>
            )}
          </div>

          {/* Minute Coach Directive Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                <Compass className="w-4 h-4" />
                Pautas de Banda del Entrenador:
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                Min {currentMinute}'
              </span>
            </div>

            <div className="space-y-2">
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-3.5 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">
                  🎯 Foco Principal en Este Escenario:
                </span>
                <p className="text-xs text-slate-200 font-bold leading-relaxed">
                  {selectedScenarioId !== 'custom' 
                    ? PRESET_SCENARIOS.find(s => s.id === selectedScenarioId)?.tacticalFocus
                    : dangerAnalysis.level === 'critico'
                    ? 'Bloque defensivo muy compacto. Priorizar despejes a bandas y repliegue veloz.'
                    : vulnerabilityAnalysis.level === 'oro'
                    ? 'Atacar el intervalo entre lateral y central rival. Buscar centros al segundo palo.'
                    : 'Conservar la posesión en campo contrario sin precipitarse.'
                  }
                </p>
              </div>

              {/* Specific Key Instructions */}
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] uppercase font-bold text-blue-400 block">
                  ⚡ 3 Consignas Inmediatas para el Equipo:
                </span>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  {selectedScenarioId !== 'custom' && PRESET_SCENARIOS.find(s => s.id === selectedScenarioId) ? (
                    PRESET_SCENARIOS.find(s => s.id === selectedScenarioId)?.keyInstructions.map((ins, i) => (
                      <li key={i} className="leading-snug">{ins}</li>
                    ))
                  ) : (
                    <>
                      <li>Cerrar líneas de pase interior para obligar al rival a jugar por fuera.</li>
                      <li>Vigilancia estricta sobre su atacante más adelantado en caso de pérdida.</li>
                      <li>Aprovechar la fatiga rival entre el minuto 50' y 65' para acelerar la velocidad del balón.</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Set Piece Strategy (ABP) vs this rival */}
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] uppercase font-bold text-purple-400 block flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Estrategia a Balón Parado (ABP):
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedScenarioId !== 'custom'
                    ? PRESET_SCENARIOS.find(s => s.id === selectedScenarioId)?.abpAdvice
                    : `Córner a favor: Buscar envío tenso al primer palo para peinar hacia el segundo. En faltas defensivas: mantener la línea en la frontal del área y evitar segundas jugadas.`
                  }
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
