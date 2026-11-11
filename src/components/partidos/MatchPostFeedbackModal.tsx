import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trophy, 
  Star, 
  MessageSquareQuote, 
  Sparkles, 
  Copy, 
  Printer, 
  CheckCircle2, 
  Award, 
  TrendingUp, 
  ShieldCheck, 
  Swords, 
  Calendar, 
  Users, 
  Target, 
  Share2, 
  AlertCircle,
  HelpCircle,
  Check,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface MatchPostFeedback {
  valoracion_general: 'Excelente' | 'Muy Positivo' | 'Ajustado' | 'A Mejorar' | 'Exigente';
  puntuacion_general: number; // 1 to 5
  resumen_mister: string; // Balance global
  fase_ofensiva: {
    valoracion: number; // 1 to 5
    aspectos_positivos: string;
    aspectos_a_mejorar: string;
  };
  fase_defensiva: {
    valoracion: number; // 1 to 5
    aspectos_positivos: string;
    aspectos_a_mejorar: string;
  };
  transiciones_y_abp: {
    valoracion: number; // 1 to 5
    comentarios: string;
  };
  actitud_y_competitividad: {
    valoracion: number; // 1 to 5
    comentarios: string;
  };
  puntos_clave_proximo_entrenamiento: string[];
  jugadores_destacados: string[]; // Nombres o menciones
  mensaje_vestuario: string;
  fecha_registro?: string;
  autor?: string;
}

interface MatchPostFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: {
    id: string;
    rival: string;
    fecha: string;
    hora: string;
    tipo: 'Local' | 'Visitante';
    competicion: string;
    estado: 'Programado' | 'Finalizado';
    goles_favor?: number;
    goles_contra?: number;
    feedback_post_partido?: MatchPostFeedback;
    acta?: string;
    convocatoria?: string[];
  };
  teamName: string;
  playersList?: { id: string; nombre: string; apodo?: string; dorsal?: string }[];
  onSaveFeedback: (matchId: string, feedback: MatchPostFeedback) => Promise<void> | void;
}

const RATING_OPTIONS: { label: MatchPostFeedback['valoracion_general']; color: string; desc: string }[] = [
  { label: 'Excelente', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', desc: 'Gran partido en todas las fases' },
  { label: 'Muy Positivo', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40', desc: 'Objetivos cumplidos con buena dinámica' },
  { label: 'Ajustado', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40', desc: 'Partido disputado con aspectos a corregir' },
  { label: 'A Mejorar', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40', desc: 'Por debajo de nuestro nivel habitual' },
  { label: 'Exigente', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40', desc: 'Duelo muy complicado con alto aprendizaje' }
];

export const MatchPostFeedbackModal: React.FC<MatchPostFeedbackModalProps> = ({
  isOpen,
  onClose,
  match,
  teamName,
  playersList = [],
  onSaveFeedback
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'fases' | 'semana' | 'mensaje'>('general');
  const [isCopied, setIsCopied] = useState(false);

  // Initial feedback state
  const [valoracionGeneral, setValoracionGeneral] = useState<MatchPostFeedback['valoracion_general']>('Muy Positivo');
  const [puntuacionGeneral, setPuntuacionGeneral] = useState<number>(4);
  const [resumenMister, setResumenMister] = useState<string>('');

  // Fases
  const [ofensivaVal, setOfensivaVal] = useState<number>(4);
  const [ofensivaPos, setOfensivaPos] = useState<string>('');
  const [ofensivaMej, setOfensivaMej] = useState<string>('');

  const [defensivaVal, setDefensivaVal] = useState<number>(4);
  const [defensivaPos, setDefensivaPos] = useState<string>('');
  const [defensivaMej, setDefensivaMej] = useState<string>('');

  const [abpVal, setAbpVal] = useState<number>(3);
  const [abpCom, setAbpCom] = useState<string>('');

  const [actitudVal, setActitudVal] = useState<number>(5);
  const [actitudCom, setActitudCom] = useState<string>('');

  // Semana y destacados
  const [puntosClave, setPuntosClave] = useState<string[]>(['', '', '']);
  const [jugadoresDestacados, setJugadoresDestacados] = useState<string[]>([]);
  const [nuevoDestacado, setNuevoDestacado] = useState<string>('');

  // Mensaje vestuario
  const [mensajeVestuario, setMensajeVestuario] = useState<string>('');

  // Populate state when match changes or modal opens
  useEffect(() => {
    if (match.feedback_post_partido) {
      const fb = match.feedback_post_partido;
      setValoracionGeneral(fb.valoracion_general || 'Muy Positivo');
      setPuntuacionGeneral(fb.puntuacion_general || 4);
      setResumenMister(fb.resumen_mister || '');

      setOfensivaVal(fb.fase_ofensiva?.valoracion || 4);
      setOfensivaPos(fb.fase_ofensiva?.aspectos_positivos || '');
      setOfensivaMej(fb.fase_ofensiva?.aspectos_a_mejorar || '');

      setDefensivaVal(fb.fase_defensiva?.valoracion || 4);
      setDefensivaPos(fb.fase_defensiva?.aspectos_positivos || '');
      setDefensivaMej(fb.fase_defensiva?.aspectos_a_mejorar || '');

      setAbpVal(fb.transiciones_y_abp?.valoracion || 3);
      setAbpCom(fb.transiciones_y_abp?.comentarios || '');

      setActitudVal(fb.actitud_y_competitividad?.valoracion || 5);
      setActitudCom(fb.actitud_y_competitividad?.comentarios || '');

      setPuntosClave(
        fb.puntos_clave_proximo_entrenamiento && fb.puntos_clave_proximo_entrenamiento.length > 0
          ? fb.puntos_clave_proximo_entrenamiento
          : ['', '', '']
      );
      setJugadoresDestacados(fb.jugadores_destacados || []);
      setMensajeVestuario(fb.mensaje_vestuario || '');
    } else {
      // Default auto-fill based on score
      const gf = match.goles_favor ?? 0;
      const gc = match.goles_contra ?? 0;
      const isWin = gf > gc;
      const isDraw = gf === gc && match.estado === 'Finalizado';

      if (isWin) {
        setValoracionGeneral('Muy Positivo');
        setPuntuacionGeneral(4);
        setResumenMister(`Gran victoria por ${gf}-${gc} frente a ${match.rival}. El equipo mostró solidez, compromiso colectivo y buena efectividad en las áreas.`);
        setOfensivaPos('Buena verticalidad, desmarques de ruptura y aprovechamiento de los espacios a la espalda de la defensa rival.');
        setOfensivaMej('Paciencia en campo contrario para madurar la jugada y evitar pérdidas en salida.');
        setDefensivaPos('Intensidad en la presión tras pérdida y coberturas solidarias entre líneas.');
        setDefensivaMej('Atención en los balones parados laterales y segundas jugadas.');
        setAbpCom('Balón parado ofensivo generado con peligro; concentración correcta en saques de esquina rivales.');
        setActitudCom('Excelente actitud, compañerismo y energía positiva durante los 70 minutos.');
        setPuntosClave([
          'Salida limpia de balón ante presión alta rival',
          'Finalización rápida en transiciones 3 contra 2',
          'Defensa en zona de córners y faltas lejanas'
        ]);
        setMensajeVestuario(`👏 ¡ENHORABUENA EQUIPO! Gran trabajo de todos hoy en el partido contra ${match.rival}. Orgullo de vuestro esfuerzo, actitud y ganas de competir. Seguimos aprendiendo y mejorando juntos. ¡A preparar con ganas la semana de entrenamientos! 💪⚽`);
      } else if (isDraw) {
        setValoracionGeneral('Ajustado');
        setPuntuacionGeneral(3);
        setResumenMister(`Empate trabajado (${gf}-${gc}) frente a ${match.rival}. Partido muy competido donde supimos aguantar los momentos difíciles.`);
        setOfensivaPos('Capacidad para generar ocasiones claras en ataque organizado.');
        setOfensivaMej('Mayor contundencia y tranquilidad en la toma de decisiones en el último tercio.');
        setDefensivaPos('Compromiso en los duelos individuales y repliegue rápido.');
        setDefensivaMej('Minimizar faltas cerca de la frontal del área.');
        setAbpCom('Duelo parejo en juego aéreo.');
        setActitudCom('Muy buena capacidad de sufrimiento y unión en los minutos de mayor exigencia.');
        setPuntosClave([
          'Mejorar la precisión del último pase en el área',
          'Ajuste de marcas en la presión de inicio',
          'Conservación de la posesión bajo presión'
        ]);
        setMensajeVestuario(`Buen punto trabajado hoy chicos/as contra ${match.rival}. Nos vaciamos en el campo y demostramos que no nos rendimos nunca. Toca corregir detalles esta semana para seguir creciendo. ¡A tope para el siguiente! ⚽🔥`);
      } else {
        setValoracionGeneral('Exigente');
        setPuntuacionGeneral(3);
        setResumenMister(`Partido de gran aprendizaje y exigencia frente a ${match.rival} (${gf}-${gc}). Nos sirve de referencia para ver en qué detalles debemos incidir durante la semana.`);
        setOfensivaPos('Momentos de buen fútbol cuando logramos enlazar 4-5 pases seguidos.');
        setOfensivaMej('Velocidad en la circulación de balón y movilidad sin balón.');
        setDefensivaPos('Esfuerzo físico incansable en las ayudas defensivas.');
        setDefensivaMej('Comunicación constante y basculaciones más compactas.');
        setAbpCom('Reforzar las marcas al hombre en las acciones a balón parado en contra.');
        setActitudCom('Pese al marcador adverso, el equipo dio la cara y no bajó los brazos.');
        setPuntosClave([
          'Comunicación y distancias entre líneas en fase defensiva',
          'Temporización y duelos 1 contra 1',
          'Salida rápida y apoyos de emergencia en salida de balón'
        ]);
        setMensajeVestuario(`Ánimo a todo el equipo tras el partido de hoy contra ${match.rival}. De estos partidos es de donde más se aprende. Cabeza alta, a seguir trabajando con ilusión y a dar el 100% en los entrenos de la semana. ¡Juntos somos más fuertes! 💙⚽`);
      }
    }
  }, [match]);

  if (!isOpen) return null;

  // Handle Save
  const handleSave = () => {
    const feedback: MatchPostFeedback = {
      valoracion_general: valoracionGeneral,
      puntuacion_general: puntuacionGeneral,
      resumen_mister: resumenMister,
      fase_ofensiva: {
        valoracion: ofensivaVal,
        aspectos_positivos: ofensivaPos,
        aspectos_a_mejorar: ofensivaMej
      },
      fase_defensiva: {
        valoracion: defensivaVal,
        aspectos_positivos: defensivaPos,
        aspectos_a_mejorar: defensivaMej
      },
      transiciones_y_abp: {
        valoracion: abpVal,
        comentarios: abpCom
      },
      actitud_y_competitividad: {
        valoracion: actitudVal,
        comentarios: actitudCom
      },
      puntos_clave_proximo_entrenamiento: puntosClave.filter(p => p.trim() !== ''),
      jugadores_destacados: jugadoresDestacados,
      mensaje_vestuario: mensajeVestuario,
      fecha_registro: new Date().toLocaleDateString('es-ES'),
      autor: 'Cuerpo Técnico'
    };

    onSaveFeedback(match.id, feedback);
    toast.success('¡Feedback post-partido guardado correctamente!');
    onClose();
  };

  // Generate WhatsApp text
  const generateWhatsAppMessage = () => {
    const gf = match.goles_favor ?? 0;
    const gc = match.goles_contra ?? 0;
    const stars = '⭐'.repeat(puntuacionGeneral);

    let text = `📋 *FEEDBACK POST-PARTIDO • ${teamName.toUpperCase()}*\n`;
    text += `🆚 *${match.tipo === 'Local' ? teamName : match.rival} ${gf} - ${gc} ${match.tipo === 'Local' ? match.rival : teamName}*\n`;
    text += `📅 ${match.fecha} • ${match.competicion} (${match.tipo})\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `🌟 *VALORACIÓN GENERAL:* ${valoracionGeneral} (${stars})\n`;
    if (resumenMister) {
      text += `📝 *Balance del Cuerpo Técnico:*\n"${resumenMister}"\n\n`;
    }

    text += `⚔️ *ANÁLISIS POR FASES:*\n`;
    text += `• *Ataque (${'★'.repeat(ofensivaVal)}):* ${ofensivaPos || 'Buen juego'} ${ofensivaMej ? `| A pulir: ${ofensivaMej}` : ''}\n`;
    text += `• *Defensa (${'★'.repeat(defensivaVal)}):* ${defensivaPos || 'Compromiso colectivo'} ${defensivaMej ? `| A pulir: ${defensivaMej}` : ''}\n`;
    text += `• *Actitud y Energía:* ${'★'.repeat(actitudVal)}/5 (${actitudCom || 'Excelente entrega'})\n\n`;

    const cleanPuntos = puntosClave.filter(p => p.trim() !== '');
    if (cleanPuntos.length > 0) {
      text += `🎯 *OBJETIVOS DE ENTRENAMIENTO PARA LA SEMANA:*\n`;
      cleanPuntos.forEach((p, idx) => {
        text += `  ${idx + 1}. ${p}\n`;
      });
      text += `\n`;
    }

    if (jugadoresDestacados.length > 0) {
      text += `🏅 *MENCIONES ESPECIALES:* ${jugadoresDestacados.join(', ')}\n\n`;
    }

    if (mensajeVestuario) {
      text += `💬 *MENSAJE PARA EL VESTUARIO:*\n${mensajeVestuario}\n\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `¡A seguir trabajando juntos con máxima ilusión! 💪⚽`;

    return text;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success('¡Feedback copiado al portapapeles con formato WhatsApp!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const addDestacado = () => {
    if (nuevoDestacado.trim() && !jugadoresDestacados.includes(nuevoDestacado.trim())) {
      setJugadoresDestacados([...jugadoresDestacados, nuevoDestacado.trim()]);
      setNuevoDestacado('');
    }
  };

  const removeDestacado = (name: string) => {
    setJugadoresDestacados(jugadoresDestacados.filter(j => j !== name));
  };

  const updatePuntoClave = (index: number, val: string) => {
    const copy = [...puntosClave];
    copy[index] = val;
    setPuntosClave(copy);
  };

  const addPuntoClaveField = () => {
    if (puntosClave.length < 6) {
      setPuntosClave([...puntosClave, '']);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl my-auto overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/30 flex-shrink-0">
              <MessageSquareQuote className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Debrief & Feedback Técnico Post-Partido
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md">
                  {match.competicion} • {match.fecha}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight truncate mt-0.5">
                {match.tipo === 'Local' ? `${teamName} vs ${match.rival}` : `${match.rival} vs ${teamName}`}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyWhatsApp}
              className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 gap-1.5 h-9 rounded-xl hidden sm:flex font-bold"
              title="Copiar feedback para WhatsApp"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? '¡Copiado!' : 'Copiar WhatsApp'}</span>
            </Button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Score & Context Ribbon */}
        <div className="bg-slate-950/60 border-b border-slate-850 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400 uppercase font-bold text-[11px]">Marcador:</span>
            <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-750 font-black text-white text-sm flex items-center gap-2">
              <span className={match.tipo === 'Local' ? 'text-blue-400' : 'text-slate-300'}>
                {match.tipo === 'Local' ? (match.goles_favor ?? 0) : (match.goles_contra ?? 0)}
              </span>
              <span className="text-slate-500">-</span>
              <span className={match.tipo === 'Visitante' ? 'text-blue-400' : 'text-slate-300'}>
                {match.tipo === 'Local' ? (match.goles_contra ?? 0) : (match.goles_favor ?? 0)}
              </span>
            </div>
            <span className="text-slate-400 font-semibold">
              ({match.tipo === 'Local' ? 'Campo Local' : 'Campo Visitante'})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-bold uppercase">Puntuación:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setPuntuacionGeneral(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star 
                    className={`w-4 h-4 ${
                      star <= puntuacionGeneral 
                        ? 'text-amber-400 fill-amber-400' 
                        : 'text-slate-700'
                    }`} 
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2.5 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>1. Balance General</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fases')}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'fases'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>2. Fases de Juego (Ataque & Defensa)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('semana')}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'semana'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>3. Plan Semanal & Destacados</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mensaje')}
            className={`pb-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'mensaje'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>4. Mensaje Vestuario & WhatsApp</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: BALANCE GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-5">
              {/* Sensaciones del cuerpo técnico */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Sensación Global del Encuentro
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {RATING_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setValoracionGeneral(opt.label)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        valoracionGeneral === opt.label
                          ? `${opt.color} ring-2 ring-purple-500/50 shadow-lg scale-[1.02]`
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <span className="block font-black text-xs uppercase">{opt.label}</span>
                      <span className="block text-[10px] text-slate-400 mt-1 leading-tight">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen del Míster */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Balance & Conclusiones del Míster
                  </label>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Visión global del cuerpo técnico
                  </span>
                </div>
                <textarea
                  value={resumenMister}
                  onChange={(e) => setResumenMister(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-all font-medium leading-relaxed"
                  placeholder="Describe cómo se desarrolló el partido, si se cumplió el plan previsto, qué sensaciones deja el grupo y qué lectura táctica sacamos..."
                />
              </div>

              {/* Quick AI Suggestions helper */}
              <div className="bg-purple-950/30 border border-purple-500/20 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-black text-purple-300 uppercase tracking-wide block">
                    Espacio de Retroalimentación Formativa
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    Este feedback queda archivado en el histórico del partido. Sirve para evaluar la progresión técnico-táctica del equipo, planificar las sesiones de la semana y mantener una comunicación constructiva y formativa con los jugadores y familias.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FASES DE JUEGO */}
          {activeTab === 'fases' && (
            <div className="space-y-6">
              {/* Fase Ofensiva */}
              <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-black uppercase text-white tracking-wider">Fase Ofensiva & Ataque</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-bold mr-1">Nivel:</span>
                    {[1, 2, 3, 4, 5].map((st) => (
                      <button
                        key={`of-${st}`}
                        type="button"
                        onClick={() => setOfensivaVal(st)}
                        className="p-0.5 hover:scale-110"
                      >
                        <Star className={`w-3.5 h-3.5 ${st <= ofensivaVal ? 'text-blue-400 fill-blue-400' : 'text-slate-800'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">
                      ✓ Aspectos Positivos (Qué funcionó)
                    </label>
                    <textarea
                      value={ofensivaPos}
                      onChange={(e) => setOfensivaPos(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      placeholder="Ej. Buena circulación, llegadas claras por banda izquierda, valentía en el 1v1..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-amber-400 uppercase block mb-1">
                      ⚠ Aspectos a Mejorar (Puntos a pulir)
                    </label>
                    <textarea
                      value={ofensivaMej}
                      onChange={(e) => setOfensivaMej(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      placeholder="Ej. Precipitación en los últimos 20 metros, definición ante el portero..."
                    />
                  </div>
                </div>
              </div>

              {/* Fase Defensiva */}
              <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-black uppercase text-white tracking-wider">Fase Defensiva & Repliegue</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-bold mr-1">Nivel:</span>
                    {[1, 2, 3, 4, 5].map((st) => (
                      <button
                        key={`def-${st}`}
                        type="button"
                        onClick={() => setDefensivaVal(st)}
                        className="p-0.5 hover:scale-110"
                      >
                        <Star className={`w-3.5 h-3.5 ${st <= defensivaVal ? 'text-emerald-400 fill-emerald-400' : 'text-slate-800'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">
                      ✓ Aspectos Positivos (Qué funcionó)
                    </label>
                    <textarea
                      value={defensivaPos}
                      onChange={(e) => setDefensivaPos(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Ej. Línea defensiva coordinada, anticipaciones, solidez en duelos..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-amber-400 uppercase block mb-1">
                      ⚠ Aspectos a Mejorar (Puntos a pulir)
                    </label>
                    <textarea
                      value={defensivaMej}
                      onChange={(e) => setDefensivaMej(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      placeholder="Ej. Evitar desajustes a la espalda de laterales, cerrar el centro en repliegue..."
                    />
                  </div>
                </div>
              </div>

              {/* Balón Parado & Actitud */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white uppercase text-[11px]">Balón Parado (ABP)</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <button key={`abp-${st}`} type="button" onClick={() => setAbpVal(st)} className="p-0.5">
                          <Star className={`w-3 h-3 ${st <= abpVal ? 'text-amber-400 fill-amber-400' : 'text-slate-800'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={abpCom}
                    onChange={(e) => setAbpCom(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    placeholder="Comportamiento en saques de esquina, faltas y saques de banda..."
                  />
                </div>

                <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white uppercase text-[11px]">Actitud & Competitividad</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <button key={`act-${st}`} type="button" onClick={() => setActitudVal(st)} className="p-0.5">
                          <Star className={`w-3 h-3 ${st <= actitudVal ? 'text-purple-400 fill-purple-400' : 'text-slate-800'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={actitudCom}
                    onChange={(e) => setActitudCom(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white"
                    placeholder="Intensidad de juego, concentración, deportividad y compañerismo..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLAN SEMANAL & DESTACADOS */}
          {activeTab === 'semana' && (
            <div className="space-y-6">
              {/* Puntos clave a entrenar en la semana */}
              <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-black uppercase text-white tracking-wider">
                      Objetivos Clave para los Entrenamientos de la Semana
                    </h4>
                  </div>
                  {puntosClave.length < 6 && (
                    <button
                      type="button"
                      onClick={addPuntoClaveField}
                      className="text-xs text-purple-400 hover:text-purple-300 font-bold hover:underline"
                    >
                      + Añadir Objetivo
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {puntosClave.map((punto, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-black flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={punto}
                        onChange={(e) => updatePuntoClave(idx, e.target.value)}
                        placeholder={`Objetivo técnico-táctico #${idx + 1} (ej. Transición defensiva tras pérdida)`}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Jugadores destacados / Menciones de honor */}
              <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black uppercase text-white tracking-wider">
                      Menciones de Honor & Jugadores/as Destacados
                    </h4>
                  </div>
                </div>

                {/* Add player */}
                <div className="flex items-center gap-2">
                  {playersList.length > 0 ? (
                    <select
                      value={nuevoDestacado}
                      onChange={(e) => setNuevoDestacado(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold"
                    >
                      <option value="">Seleccionar de la plantilla...</option>
                      {playersList.map((p) => (
                        <option key={p.id} value={(p.apodo && p.apodo.trim()) ? p.apodo.trim() : p.nombre}>
                          {(p.apodo && p.apodo.trim()) ? p.apodo.trim() : p.nombre} {p.dorsal ? `(#${p.dorsal})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={nuevoDestacado}
                      onChange={(e) => setNuevoDestacado(e.target.value)}
                      placeholder="Escribir nombre o mención especial..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  )}
                  <Button
                    type="button"
                    onClick={addDestacado}
                    disabled={!nuevoDestacado.trim()}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl h-9"
                  >
                    Añadir Mención
                  </Button>
                </div>

                {/* Badges list */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {jugadoresDestacados.length > 0 ? (
                    jugadoresDestacados.map((name, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>{name}</span>
                        <button
                          type="button"
                          onClick={() => removeDestacado(name)}
                          className="hover:text-white ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      No hay menciones registradas aún. Puedes destacar actitudes positivas, esfuerzo o rendimiento colectivo.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MENSAJE PARA EL VESTUARIO & WHATSAPP */}
          {activeTab === 'mensaje' && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <span>Mensaje para el Vestuario / Chat de WhatsApp</span>
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCopyWhatsApp}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl gap-1.5 h-8 cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? '¡Copiado!' : 'Copiar Texto'}</span>
                  </Button>
                </div>
                <textarea
                  value={mensajeVestuario}
                  onChange={(e) => setMensajeVestuario(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all font-medium leading-relaxed font-sans"
                  placeholder="Escribe un mensaje de refuerzo positivo, reconocimiento del esfuerzo y motivación para el grupo..."
                />
              </div>

              {/* Preview of full WhatsApp report */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                  <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Vista previa del informe completo WhatsApp</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Formato Oficial</span>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap bg-slate-900/60 p-3 rounded-xl max-h-48 overflow-y-auto leading-relaxed border border-slate-850">
                  {generateWhatsAppMessage()}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs border-slate-800 text-slate-300 hover:text-white rounded-xl gap-1.5 h-9 hidden sm:flex"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Dossier</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs border-slate-800 text-slate-400 hover:text-white rounded-xl h-9"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase tracking-wider rounded-xl h-9 px-4 shadow-lg shadow-purple-900/40"
            >
              Guardar Feedback del Partido
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MatchPostFeedbackModal;
