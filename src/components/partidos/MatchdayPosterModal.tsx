import React, { useState, useMemo } from 'react';
import { 
  X, 
  Download, 
  Copy, 
  Send, 
  Sparkles, 
  MapPin, 
  Clock, 
  CalendarDays, 
  Trophy, 
  Flame, 
  FileDown, 
  Layers, 
  Smartphone, 
  Square as SquareIcon,
  Shield,
  Target,
  TrendingUp,
  Phone,
  Paintbrush,
  UserCheck,
  Swords,
  Zap,
  Users,
  Palette,
  Check,
  Mail,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import UDLaPovedaLogo from '@/components/layout/UDLaPovedaLogo';
import { cleanPhotoUrl } from '@/lib/utils';
import povedaPlayerBrushImg from '@/assets/images/poveda_player_brush_1788964313566.jpg';
import playerBrushActionImg from '@/assets/images/player_brush_action_1788963018733.jpg';
import femalePlayerBrushImg from '@/assets/images/female_player_brush_1788963036471.jpg';
import stadiumNightImg from '@/assets/images/stadium_night_matchday_1788963681857.jpg';
import playerHeroCelebrationImg from '@/assets/images/player_hero_celebration_1788963937522.jpg';
import playerHeroCaptainImg from '@/assets/images/player_hero_captain_1788963961101.jpg';
import retroSixtiesPlayerImg from '@/assets/images/retro_sixties_player_1788965361349.jpg';
import retroSixtiesBgImg from '@/assets/images/retro_sixties_bg_1788965376731.jpg';

export interface MatchdayMatch {
  id: string;
  rival: string;
  fecha: string;
  hora: string;
  tipo: 'Local' | 'Visitante';
  competicion: 'Liga' | 'Copa' | 'Amistoso';
  estado?: 'Programado' | 'Finalizado';
  lugar?: string;
  hora_citacion?: string;
  equipacion?: string;
  observaciones?: string;
  mensaje_motivacional?: string;
  convocatoria?: string[];
  estadisticas?: any;
}

interface MatchdayPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMatch: MatchdayMatch | null;
  allMatches: MatchdayMatch[];
  teamName: string;
  players: any[];
}

export type PosterTheme =
  | 'vintage_60s'      // Authentic 1960s letterpress Spanish football match poster (woodblock type, aged paper & vintage player)
  | 'poveda_captacion' // Flagship: Official U.D. La Poveda poster with blue sky, paint splatters, watermark, dynamic player & brush ribbons
  | 'stadium_night'    // Authentic Matchday stadium under bright floodlights
  | 'poveda_brush'     // Dynamic club poster with royal blue paint splatters and value badges
  | 'editorial_press'; // Clean, high-impact federated sports split poster

export type PosterBgColor = 
  | 'papel_60s'        // Authentic 1960s aged cream paper with carmine & navy letterpress ink (#fbf5e8 -> #f5eedc)
  | 'sepia_vintage'    // Vintage duotone sepia halftone print (#eadecc -> #d6c4a8)
  | 'azul_poveda'      // Royal Blue & Navy (#00358e -> #051a44)
  | 'noche_estadio'    // Pitch Black & Midnight Blue (#020617 -> #091a38)
  | 'blanco_limpio'    // Clean White & Sky Blue brush (#f8fafc -> #ffffff)
  | 'oro_champions'    // Champions Gold & Deep Navy (#120e03 -> #04102c)
  | 'rojo_furia'       // Crimson Red & Royal Blue (#2e040c -> #041a42)
  | 'verde_cesped'     // Emerald Grass Stadium (#01190d -> #05301a)
  | 'carbon_stealth'   // Graphite Carbon & Electric Blue (#0c1017 -> #172033)
  | 'cian_electrico';  // Electric Cyan & Cobalt (#021a36 -> #044372)

export type CharacterMode =
  | 'retro_player_60s' // Authentic 1960s vintage football player with classic laced leather ball
  | 'captacion_player' // Exact dynamic youth player in Poveda white/blue kit with paint splatters
  | 'celebration_hero' // Arms open in celebration, high emotion
  | 'captain_portrait' // Intense captain close-up portrait with armband
  | 'female_brush'     // Dynamic female player in motion with ball
  | 'male_brush'       // Male player volley strike
  | 'squad_player'     // Real player loaded from squad
  | 'duel_badges';     // Clash of official team shields

export type PhotoFrameStyle =
  | 'halo_neon'         // Radiant neon energy halo
  | 'marco_hexagonal'   // Futuristic sports hexagonal polygon
  | 'tarjeta_diamante'  // Beveled diamond athletic shield
  | 'circulo_pro'       // Dual-ring championship medallion
  | 'silueta_libre';    // Borderless athletic figure blending into pitch

export default function MatchdayPosterModal({
  isOpen,
  onClose,
  currentMatch,
  allMatches,
  teamName,
  players
}: MatchdayPosterModalProps) {
  // Selected match
  const [selectedMatchId, setSelectedMatchId] = useState<string>(currentMatch?.id || '');

  React.useEffect(() => {
    if (currentMatch?.id) {
      setSelectedMatchId(currentMatch.id);
    } else if (allMatches.length > 0 && !selectedMatchId) {
      const upcoming = allMatches.find(m => m.estado === 'Programado') || allMatches[0];
      if (upcoming) setSelectedMatchId(upcoming.id);
    }
  }, [currentMatch, allMatches]);

  const activeMatch = useMemo(() => {
    return allMatches.find(m => m.id === selectedMatchId) || currentMatch || allMatches[0] || null;
  }, [selectedMatchId, allMatches, currentMatch]);

  // Poster theme: defaulting to 1960s authentic vintage football match poster
  const [posterTheme, setPosterTheme] = useState<PosterTheme>('vintage_60s');

  // Quick Preset Mode for Match announcement: 'vintage_60s' | 'dia_de_partido' | 'matchday' | 'aficion' | 'custom'
  const [posterPreset, setPosterPreset] = useState<'vintage_60s' | 'dia_de_partido' | 'matchday' | 'aficion' | 'custom'>('vintage_60s');

  // Background color palette: defaulting to authentic 1960s aged paper with letterpress ink
  const [bgColor, setBgColor] = useState<PosterBgColor>('papel_60s');

  // Aspect ratio: 'poster' (2:3 standard print/poster), 'story' (9:16 WhatsApp status), 'feed' (1:1 social feed)
  const [aspectRatio, setAspectRatio] = useState<'poster' | 'story' | 'feed'>('poster');

  // Player figure on poster: defaulting to authentic 1960s vintage football player
  const [characterMode, setCharacterMode] = useState<CharacterMode>('retro_player_60s');
  const [photoFrameStyle, setPhotoFrameStyle] = useState<PhotoFrameStyle>('halo_neon');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  // Editable fields for Matchday announcement poster (vintage 1960s letterpress defaults)
  const [topHeadline, setTopHeadline] = useState<string>('¡GRAN ENCUENTRO DE FÚTBOL!');
  const [ribbonLine1, setRibbonLine1] = useState<string>('CAMPEONATO OFICIAL DE LIGA');
  const [ribbonLine2, setRibbonLine2] = useState<string>('FEDERACIÓN REGIONAL • JORNADA OFICIAL');
  const [impactLine1, setImpactLine1] = useState<string>('U. D. LA POVEDA');
  const [impactLine2, setImpactLine2] = useState<string>('CONTRA RIVAL');
  const [bodyMessage, setBodyMessage] = useState<string>('EMOCIONANTE DISPUTA DE LOS DOS PUNTOS EN JUEGO. ¡ACUDE A ANIMAR AL EQUIPO DE TU PUEBLO!');
  const [actionBannerText, setActionBannerText] = useState<string>('¡ENTRADA GENERAL LIBRE!');
  const [iconBarMode, setIconBarMode] = useState<'partido' | 'valores'>('partido');
  const [sloganLine1, setSloganLine1] = useState<string>('CAMPO MUNICIPAL DE DEPORTES "LA POVEDA"');
  const [sloganLine2, setSloganLine2] = useState<string>('SE RUEGA LA MAYOR PUNTUALIDAD AL RESPETABLE PÚBLICO');
  const [contactEmail, setContactEmail] = useState<string>('COLEGIO OFICIAL DE ÁRBITROS');
  const [contactPhone, setContactPhone] = useState<string>('PRECIOS POPULARES');

  // Legacy editable text elements
  const [mainHeadline, setMainHeadline] = useState<string>('DÍA DE PARTIDO');
  const [subHeadline, setSubHeadline] = useState<string>('TU EQUIPO. NUESTRA PASIÓN.');
  const [grandstandCallout, setGrandstandCallout] = useState<string>('¡TE ESPERAMOS EN LA GRADA! FORMA PARTE DE ALGO GRANDE');
  const [mottoScript, setMottoScript] = useState<string>('ENTRENA. LUCHA. SUPÉRATE. VIVE LA POVEDA.');
  const [isExporting, setIsExporting] = useState(false);

  // Initialize selected player
  React.useEffect(() => {
    if (!selectedPlayerId && players.length > 0) {
      const withPhoto = players.find(p => p.foto_url);
      setSelectedPlayerId(withPhoto?.id || players[0]?.id || '');
    }
  }, [players, selectedPlayerId]);

  const featuredPlayer = useMemo(() => {
    return players.find(p => p.id === selectedPlayerId) || null;
  }, [players, selectedPlayerId]);

  if (!isOpen || !activeMatch) return null;

  // Extract match data
  const rivalName = activeMatch.rival || 'Rival';
  const isLocal = activeMatch.tipo === 'Local';
  const matchCompeticion = activeMatch.competicion || 'Amistoso';
  const matchHora = activeMatch.hora || '13:15';
  const matchLugar = activeMatch.lugar || activeMatch.estadisticas?.lugar || (isLocal ? 'Polideportivo Municipal La Poveda (Campo Principal)' : `Campo Municipal de ${rivalName}`);
  const horaCitacion = activeMatch.hora_citacion || activeMatch.estadisticas?.hora_citacion || '1h 15m antes';
  const equipacion = activeMatch.equipacion || activeMatch.estadisticas?.equipacion || '1ª Equipación Oficial + Chándal';

  // Format date
  const formatMatchDate = (dateStr: string) => {
    if (!dateStr) return { fullDate: 'POR DEFINIR', weekday: 'SÁBADO', dayNum: '12', monthName: 'SEPTIEMBRE', year: '2026', shortDate: '12/09', bannerDate: 'SÁBADO 12 SEP.' };
    
    let d: Date;
    if (dateStr.includes('-')) {
      const [y, m, day] = dateStr.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else if (dateStr.includes('/')) {
      const [day, m, y] = dateStr.split('/').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(dateStr);
    }

    if (isNaN(d.getTime())) {
      return { fullDate: dateStr, weekday: 'SÁBADO', dayNum: '12', monthName: 'SEPTIEMBRE', year: '2026', shortDate: dateStr, bannerDate: dateStr };
    }

    const weekdays = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const monthsShort = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    
    const weekday = weekdays[d.getDay()];
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthName = months[d.getMonth()];
    const monthShort = monthsShort[d.getMonth()];
    const year = d.getFullYear();

    return {
      weekday,
      dayNum,
      monthName,
      monthShort,
      year,
      fullDate: `${weekday}, ${dayNum} DE ${monthName} DE ${year}`,
      shortDate: `${dayNum}/${String(d.getMonth() + 1).padStart(2, '0')}/${year}`,
      bannerDate: `${weekday} ${dayNum} ${monthShort}.`
    };
  };

  const formattedDate = formatMatchDate(activeMatch.fecha);

  // Synchronize poster texts automatically with active match data
  const syncWithMatch = React.useCallback((match: MatchdayMatch) => {
    if (!match) return;
    const isLoc = match.tipo === 'Local';
    const riv = match.rival || 'Rival';
    const fDate = formatMatchDate(match.fecha);
    const comp = match.competicion ? match.competicion.toUpperCase() : 'LIGA RFFM';
    const hora = match.hora || '11:30';
    const lug = match.lugar || match.estadisticas?.lugar || (isLoc ? 'Polideportivo Municipal La Poveda' : `Campo Municipal de ${riv}`);

    setRibbonLine1(`${comp} • ${isLoc ? 'JUGAMOS EN CASA' : 'A DOMICILIO'}`);
    setRibbonLine2(`${fDate.bannerDate} • ${hora} H`);
    setImpactLine1(isLoc ? 'U.D. LA POVEDA' : riv.toUpperCase());
    setImpactLine2(isLoc ? `VS ${riv.toUpperCase()}` : 'VS U.D. LA POVEDA');
    setBodyMessage(
      isLoc
        ? 'DEFENDEMOS NUESTROS COLORES EN CASA. ¡A POR LOS TRES PUNTOS!'
        : `VISITAMOS AL ${riv.toUpperCase()} CON TODA LA ENTREGA. ¡A POR LA VICTORIA!`
    );
    setSloganLine1(lug.toUpperCase());
    setSloganLine2('¡JUNTOS SOMOS LA POVEDA!');
    setContactEmail(isLoc ? 'POLIDEPORTIVO MUNICIPAL LA POVEDA' : lug.toUpperCase());
    setContactPhone('ENTRADA LIBRE');
  }, []);

  // Update when match selection changes
  React.useEffect(() => {
    if (activeMatch) {
      syncWithMatch(activeMatch);
    }
  }, [activeMatch?.id, syncWithMatch]);

  // Background color palette definitions
  const bgPaletteConfig: Record<PosterBgColor, {
    name: string;
    sub: string;
    swatchGrad: string;
    stadiumOverlayGrad: string;
    brushBg: string;
    editorialSplit: string;
    accentGlow: string;
    accentBadge: string;
    accentBorder: string;
    primaryText: string;
    subText: string;
    isDark: boolean;
  }> = {
    papel_60s: {
      name: 'Papel Años 60',
      sub: 'Tipografía & Imprenta',
      swatchGrad: 'from-[#fbf5e8] via-[#f5eedc] to-[#e6d8be]',
      stadiumOverlayGrad: 'from-[#fbf5e8]/95 via-[#f5eedc]/90 to-[#e6d8be]/95',
      brushBg: 'bg-[#fbf5e8]',
      editorialSplit: 'from-[#8b1e1e] via-[#1a2f6b] to-[#141d33]',
      accentGlow: 'bg-amber-600/20',
      accentBadge: 'bg-[#8b1e1e] text-[#fbf5e8]',
      accentBorder: 'border-[#8b1e1e]/60',
      primaryText: 'text-[#1a1814]',
      subText: 'text-[#8b1e1e]',
      isDark: false
    },
    sepia_vintage: {
      name: 'Sepia Fotograbado',
      sub: 'Años 60 Monocromo',
      swatchGrad: 'from-[#eadecc] via-[#d6c4a8] to-[#bfa886]',
      stadiumOverlayGrad: 'from-[#eadecc]/95 via-[#d6c4a8]/90 to-[#bfa886]/95',
      brushBg: 'bg-[#eadecc]',
      editorialSplit: 'from-[#4a3928] via-[#382b1e] to-[#241a10]',
      accentGlow: 'bg-[#4a3928]/20',
      accentBadge: 'bg-[#382b1e] text-[#eadecc]',
      accentBorder: 'border-[#382b1e]/60',
      primaryText: 'text-[#2b1f14]',
      subText: 'text-[#5a4430]',
      isDark: false
    },
    azul_poveda: {
      name: 'Azul Poveda',
      sub: 'Oficial Club',
      swatchGrad: 'from-blue-600 via-blue-800 to-indigo-950',
      stadiumOverlayGrad: 'from-[#010c22] via-[#002878]/85 to-[#00174a]/90',
      brushBg: 'bg-slate-50',
      editorialSplit: 'from-blue-600 via-blue-800 to-indigo-950',
      accentGlow: 'bg-blue-400/25',
      accentBadge: 'bg-amber-400 text-slate-950',
      accentBorder: 'border-blue-400/40',
      primaryText: 'text-white',
      subText: 'text-cyan-300',
      isDark: true
    },
    noche_estadio: {
      name: 'Noche Estadio',
      sub: 'Champions Dark',
      swatchGrad: 'from-slate-900 via-slate-950 to-black',
      stadiumOverlayGrad: 'from-[#020617] via-[#05143a]/80 to-[#020617]/95',
      brushBg: 'bg-slate-950',
      editorialSplit: 'from-slate-900 via-slate-950 to-black',
      accentGlow: 'bg-cyan-400/20',
      accentBadge: 'bg-amber-400 text-slate-950',
      accentBorder: 'border-slate-700/50',
      primaryText: 'text-white',
      subText: 'text-cyan-300',
      isDark: true
    },
    blanco_limpio: {
      name: 'Lienzo Blanco',
      sub: 'Pincelada Pura',
      swatchGrad: 'from-slate-100 via-white to-blue-100',
      stadiumOverlayGrad: 'from-white/95 via-blue-50/90 to-white/95',
      brushBg: 'bg-white',
      editorialSplit: 'from-slate-100 via-white to-blue-100',
      accentGlow: 'bg-blue-600/15',
      accentBadge: 'bg-blue-900 text-white',
      accentBorder: 'border-blue-900/30',
      primaryText: 'text-blue-950',
      subText: 'text-blue-700',
      isDark: false
    },
    oro_champions: {
      name: 'Oro Champions',
      sub: 'Gala & Final',
      swatchGrad: 'from-amber-600 via-amber-900 to-slate-950',
      stadiumOverlayGrad: 'from-[#0b0802] via-[#211703]/85 to-[#0b0802]/95',
      brushBg: 'bg-amber-950/20',
      editorialSplit: 'from-amber-600 via-amber-900 to-slate-950',
      accentGlow: 'bg-amber-400/30',
      accentBadge: 'bg-amber-400 text-slate-950',
      accentBorder: 'border-amber-400/40',
      primaryText: 'text-white',
      subText: 'text-amber-300',
      isDark: true
    },
    rojo_furia: {
      name: 'Rojo Furia',
      sub: 'Pasión & Duelo',
      swatchGrad: 'from-red-600 via-rose-900 to-blue-950',
      stadiumOverlayGrad: 'from-[#1a0208] via-[#2d050f]/85 to-[#030e2a]/95',
      brushBg: 'bg-rose-950/20',
      editorialSplit: 'from-red-600 via-rose-900 to-blue-950',
      accentGlow: 'bg-red-500/25',
      accentBadge: 'bg-amber-400 text-slate-950',
      accentBorder: 'border-red-500/40',
      primaryText: 'text-white',
      subText: 'text-rose-300',
      isDark: true
    },
    verde_cesped: {
      name: 'Verde Césped',
      sub: 'Terreno de Juego',
      swatchGrad: 'from-emerald-600 via-emerald-900 to-slate-950',
      stadiumOverlayGrad: 'from-[#01140b] via-[#032a17]/85 to-[#01140b]/95',
      brushBg: 'bg-emerald-950/20',
      editorialSplit: 'from-emerald-600 via-emerald-900 to-slate-950',
      accentGlow: 'bg-emerald-400/25',
      accentBadge: 'bg-amber-400 text-slate-950',
      accentBorder: 'border-emerald-400/40',
      primaryText: 'text-white',
      subText: 'text-emerald-300',
      isDark: true
    },
    carbon_stealth: {
      name: 'Grafito Stealth',
      sub: 'Fibra de Carbono',
      swatchGrad: 'from-slate-700 via-slate-800 to-slate-950',
      stadiumOverlayGrad: 'from-[#0a0e17] via-[#111827]/85 to-[#050810]/95',
      brushBg: 'bg-slate-900',
      editorialSplit: 'from-slate-700 via-slate-800 to-slate-950',
      accentGlow: 'bg-cyan-400/20',
      accentBadge: 'bg-cyan-400 text-slate-950',
      accentBorder: 'border-cyan-400/30',
      primaryText: 'text-white',
      subText: 'text-cyan-300',
      isDark: true
    },
    cian_electrico: {
      name: 'Cian Eléctrico',
      sub: 'Alta Velocidad',
      swatchGrad: 'from-cyan-500 via-blue-700 to-slate-950',
      stadiumOverlayGrad: 'from-[#021830] via-[#04335c]/85 to-[#010e20]/95',
      brushBg: 'bg-cyan-950/20',
      editorialSplit: 'from-cyan-500 via-blue-700 to-slate-950',
      accentGlow: 'bg-cyan-400/35',
      accentBadge: 'bg-cyan-300 text-slate-950',
      accentBorder: 'border-cyan-400/40',
      primaryText: 'text-white',
      subText: 'text-cyan-200',
      isDark: true
    }
  };

  const currentBg = bgPaletteConfig[bgColor];

  // Resolve player photo source
  const getPlayerPhotoSrc = () => {
    switch (characterMode) {
      case 'retro_player_60s':
        return retroSixtiesPlayerImg;
      case 'captacion_player':
        return povedaPlayerBrushImg;
      case 'celebration_hero':
        return playerHeroCelebrationImg;
      case 'captain_portrait':
        return playerHeroCaptainImg;
      case 'female_brush':
        return femalePlayerBrushImg;
      case 'male_brush':
        return playerBrushActionImg;
      case 'squad_player':
        return featuredPlayer?.foto_url ? cleanPhotoUrl(featuredPlayer.foto_url) : null;
      case 'duel_badges':
      default:
        return null;
    }
  };

  const activePhotoSrc = getPlayerPhotoSrc();

  // Quick preset applicator specifically for MATCHDAY ANNOUNCEMENT
  const applyPreset = (preset: 'vintage_60s' | 'dia_de_partido' | 'matchday' | 'aficion') => {
    setPosterPreset(preset);

    if (preset === 'vintage_60s') {
      setPosterTheme('vintage_60s');
      setCharacterMode('retro_player_60s');
      setBgColor('papel_60s');
      setIconBarMode('partido');
      setTopHeadline('¡GRAN ENCUENTRO DE FÚTBOL!');
      setRibbonLine1('CAMPEONATO OFICIAL DE LIGA');
      setRibbonLine2(`FEDERACIÓN REGIONAL • JORNADA ${formattedDate.dayNum} DE ${formattedDate.monthName}`);
      setImpactLine1(isLocal ? 'U. D. LA POVEDA' : rivalName.toUpperCase());
      setImpactLine2(isLocal ? `CONTRA ${rivalName.toUpperCase()}` : 'CONTRA U. D. LA POVEDA');
      setBodyMessage('EMOCIONANTE DISPUTA DE LOS DOS PUNTOS EN JUEGO. ¡ACUDE A ANIMAR AL EQUIPO DE TU PUEBLO!');
      setActionBannerText('¡ENTRADA GENERAL LIBRE!');
      setSloganLine1(isLocal ? 'CAMPO MUNICIPAL DE DEPORTES "LA POVEDA"' : matchLugar.toUpperCase());
      setSloganLine2('SE RUEGA LA MAYOR PUNTUALIDAD AL RESPETABLE PÚBLICO');
      setContactEmail('COLEGIO OFICIAL DE ÁRBITROS');
      setContactPhone('PRECIOS POPULARES');
      toast.success('Cartel: Estilo Clásico Años 60');
      return;
    }

    setPosterTheme('poveda_captacion');
    setIconBarMode('partido');
    setCharacterMode('captacion_player');
    setBgColor('azul_poveda');

    if (preset === 'dia_de_partido') {
      setTopHeadline('DÍA DE PARTIDO');
      setRibbonLine1(`${matchCompeticion.toUpperCase()} • ${isLocal ? 'JUGAMOS EN CASA' : 'A DOMICILIO'}`);
      setRibbonLine2(`${formattedDate.bannerDate} • ${matchHora} H`);
      setImpactLine1(isLocal ? 'U.D. LA POVEDA' : rivalName.toUpperCase());
      setImpactLine2(isLocal ? `VS ${rivalName.toUpperCase()}` : 'VS U.D. LA POVEDA');
      setBodyMessage(isLocal ? 'DEFENDEMOS NUESTROS COLORES EN CASA. ¡A POR LOS TRES PUNTOS!' : `VISITAMOS AL ${rivalName.toUpperCase()} CON TODA LA ENTREGA. ¡A POR LA VICTORIA!`);
      setActionBannerText('¡TE ESPERAMOS EN LA GRADA!');
      setSloganLine1(matchLugar.toUpperCase());
      setSloganLine2('¡JUNTOS SOMOS LA POVEDA!');
      setContactEmail(isLocal ? 'POLIDEPORTIVO MUNICIPAL LA POVEDA' : matchLugar.toUpperCase());
      setContactPhone('ENTRADA LIBRE');
      toast.success('Cartel: Día de Partido Oficial');
    } else if (preset === 'matchday') {
      setTopHeadline('MATCHDAY');
      setRibbonLine1(`${matchCompeticion.toUpperCase()} • JORNADA OFICIAL`);
      setRibbonLine2(`${formattedDate.bannerDate} • ${matchHora} H`);
      setImpactLine1(isLocal ? 'U.D. LA POVEDA' : rivalName.toUpperCase());
      setImpactLine2(isLocal ? `VS ${rivalName.toUpperCase()}` : 'VS U.D. LA POVEDA');
      setBodyMessage('CON TODO NUESTRO EQUIPO Y NUESTRA AFICIÓN. ¡A POR EL TRIUNFO!');
      setActionBannerText('¡A POR LA VICTORIA!');
      setSloganLine1(matchLugar.toUpperCase());
      setSloganLine2('¡JUNTOS A POR LOS 3 PUNTOS!');
      setContactEmail(isLocal ? 'POLIDEPORTIVO MUNICIPAL LA POVEDA' : matchLugar.toUpperCase());
      setContactPhone('U.D. LA POVEDA');
      toast.success('Cartel: Matchday Épico');
    } else if (preset === 'aficion') {
      setTopHeadline('¡HOY JUGAMOS!');
      setRibbonLine1(`TU ALIENTO EN LA GRADA NOS HACE FUERTES`);
      setRibbonLine2(`${formattedDate.bannerDate} • ${matchHora} H`);
      setImpactLine1('U.D. LA POVEDA');
      setImpactLine2(`VS ${rivalName.toUpperCase()}`);
      setBodyMessage('TU APOYO ES NUESTRO JUGADOR NÚMERO 12. ¡TODOS CON EL EQUIPO!');
      setActionBannerText('¡LLENEMOS EL POLIDEPORTIVO!');
      setSloganLine1('ENTRADA LIBRE PARA TODA LA AFICIÓN');
      setSloganLine2('¡MÁS QUE UN CLUB, UNA FAMILIA!');
      setContactEmail(isLocal ? 'POLIDEPORTIVO MUNICIPAL LA POVEDA' : matchLugar.toUpperCase());
      setContactPhone('ENTRADA GRATUITA');
      toast.success('Cartel: Llamada a la Afición');
    }
  };

  // Generate WhatsApp announcement text
  const generateWhatsappAnnouncement = () => {
    return `📢⚽ *${topHeadline} | U.D. LA POVEDA* ⚽📢\n` +
      `🔵⚪ *${isLocal ? 'U.D. LA POVEDA vs ' + rivalName.toUpperCase() : rivalName.toUpperCase() + ' vs U.D. LA POVEDA'}* ⚪🔵\n\n` +
      `🏆 *Competición:* ${matchCompeticion.toUpperCase()} (${teamName})\n` +
      `📍 *Condición:* ${isLocal ? 'Local (Polideportivo La Poveda)' : 'Visitante (Fuera)'}\n\n` +
      `📅 *Fecha:* ${formattedDate.fullDate}\n` +
      `⏰ *Hora del Partido:* ${matchHora} h (Citación: ${horaCitacion})\n` +
      `🏟️ *Campo de Juego:* ${matchLugar}\n` +
      `👕 *Indumentaria:* ${equipacion}\n\n` +
      `🔥 *${actionBannerText}*\n` +
      `✨ _"${bodyMessage}"_\n\n` +
      `❤️ *${sloganLine2}*\n` +
      `_#UDLaPoveda #AúpaPoveda #DíaDePartido #FútbolArganda_`;
  };

  // Helper to reliably render the poster element to a high-quality data URL
  const getPosterDataUrl = async (el: HTMLElement): Promise<string> => {
    const bg = posterTheme === 'vintage_60s'
      ? '#faf4e6'
      : (currentBg.isDark ? '#020617' : '#ffffff');

    // 1. Primary: toPng (from html-to-image) - fast, preserves SVG logos and modern CSS without canvas tainting
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 2.2,
        backgroundColor: bg,
        filter: (node) => !node.classList?.contains('export-exclude')
      });
      if (dataUrl && dataUrl.length > 500) {
        return dataUrl;
      }
    } catch (err1) {
      console.warn('toPng failed, falling back to html2canvas:', err1);
    }

    // 2. Secondary fallback: html2canvas with allowTaint: false and useCORS: true
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: bg,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedEl = clonedDoc.getElementById('matchday-official-poster-canvas');
          if (clonedEl) {
            clonedEl.style.transform = 'none';
            clonedEl.style.boxShadow = 'none';
          }
        }
      });
      const dataUrl = canvas.toDataURL('image/png');
      if (dataUrl && dataUrl.length > 500) {
        return dataUrl;
      }
    } catch (err2) {
      console.warn('html2canvas standard failed, trying minimal scale fallback:', err2);
    }

    // 3. Last-resort fallback: lower scale
    const fallbackCanvas = await html2canvas(el, {
      scale: 1.5,
      useCORS: true,
      allowTaint: false,
      backgroundColor: bg,
      logging: false
    });
    return fallbackCanvas.toDataURL('image/png');
  };

  // Export to HD PNG
  const handleExportPng = async () => {
    const el = document.getElementById('matchday-official-poster-canvas');
    if (!el) return;

    setIsExporting(true);
    const toastId = toast.loading('Generando Cartel de Fútbol en Alta Definición...');

    try {
      const dataUrl = await getPosterDataUrl(el);
      const cleanRival = (rivalName || 'Rival').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `CARTEL_PARTIDO_UD_LA_POVEDA_VS_${cleanRival}.png`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss(toastId);
      toast.success('¡Cartel oficial descargado en alta definición!');
    } catch (err) {
      console.error('Error generating image:', err);
      toast.dismiss(toastId);
      toast.error('No se pudo generar la imagen del cartel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PDF (Standard A4 format with perfect centering)
  const handleExportPdf = async () => {
    const el = document.getElementById('matchday-official-poster-canvas');
    if (!el) {
      toast.error('No se encontró el lienzo del cartel.');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Generando Cartel en formato PDF...');

    try {
      const imgData = await getPosterDataUrl(el);

      // Load image to determine native pixel aspect ratio
      const img = new Image();
      img.src = imgData;
      await new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const maxW = pageWidth - margin * 2; // 190 mm
      const maxH = pageHeight - margin * 2; // 277 mm

      const imgWidth = img.naturalWidth || el.clientWidth || 460;
      const imgHeight = img.naturalHeight || el.clientHeight || 690;
      const imgAspect = imgWidth / imgHeight;

      let finalW = maxW;
      let finalH = finalW / imgAspect;

      if (finalH > maxH) {
        finalH = maxH;
        finalW = finalH * imgAspect;
      }

      const x = Math.round((pageWidth - finalW) / 2);
      const y = Math.round((pageHeight - finalH) / 2);

      // Color sheet background according to poster theme
      if (posterTheme === 'vintage_60s') {
        pdf.setFillColor(250, 244, 230); // #faf4e6
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      } else if (currentBg.isDark) {
        pdf.setFillColor(2, 6, 23); // #020617
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      }

      pdf.addImage(imgData, 'PNG', x, y, finalW, finalH, undefined, 'FAST');

      const cleanRival = (rivalName || 'Rival').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Cartel_Partido_UD_LA_POVEDA_VS_${cleanRival}.pdf`;

      try {
        pdf.save(filename);
      } catch (saveErr) {
        console.warn('Standard pdf.save failed, using blob fallback:', saveErr);
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }

      toast.dismiss(toastId);
      toast.success('¡PDF del cartel descargado correctamente!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.dismiss(toastId);
      toast.error('Error al generar el PDF del cartel. Prueba con la descarga en PNG.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyWhatsapp = () => {
    navigator.clipboard.writeText(generateWhatsappAnnouncement());
    toast.success('¡Texto del cartel copiado al portapapeles!');
  };

  const handleOpenWhatsapp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(generateWhatsappAnnouncement())}`;
    window.open(url, '_blank');
    toast.success('Abriendo WhatsApp con el anuncio del partido...');
  };

  // Render the player photo inside the designated frame style
  const renderPlayerFigure = () => {
    if (characterMode === 'duel_badges') {
      return (
        <div className="relative my-auto flex items-center justify-center py-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white p-2 shadow-2xl border-4 border-blue-600 flex items-center justify-center transform hover:scale-105 transition-transform">
            <UDLaPovedaLogo className="w-full h-full" />
          </div>
        </div>
      );
    }

    if (!activePhotoSrc && characterMode === 'squad_player') {
      return (
        <div className="relative my-auto flex flex-col items-center">
          <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-2xl bg-slate-900 flex flex-col items-center justify-center text-slate-400">
            <Users className="w-12 h-12 text-slate-500 mb-1" />
            <span className="text-[10px] font-bold">Sin foto de jugadora</span>
          </div>
          <div className="mt-1 bg-amber-400 text-slate-950 font-black text-[11px] px-3 py-0.5 rounded-full uppercase shadow">
            #{featuredPlayer?.dorsal || '—'} {featuredPlayer?.nombre || 'Jugadora'}
          </div>
        </div>
      );
    }

    // 1. HALO NEON: Glowing athletic energy aura
    if (photoFrameStyle === 'halo_neon') {
      return (
        <div className="relative w-44 sm:w-52 h-44 sm:h-52 my-auto flex items-center justify-center">
          {/* Pulsating background light aura */}
          <div className={`absolute inset-0 rounded-full blur-2xl pointer-events-none scale-90 ${currentBg.accentGlow}`} />
          <div className="absolute -inset-2 rounded-full border border-cyan-400/30 animate-pulse pointer-events-none" />
          <img
            src={activePhotoSrc!}
            alt="Futbolista"
            className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] transform hover:scale-105 transition-transform"
            crossOrigin="anonymous"
          />
          {characterMode === 'squad_player' && featuredPlayer && (
            <div className="absolute -bottom-2 bg-amber-400 text-slate-950 font-black text-[10px] sm:text-[11px] px-3 py-0.5 rounded-full uppercase shadow-lg border border-white">
              #{featuredPlayer.dorsal || '—'} {featuredPlayer.nombre}
            </div>
          )}
        </div>
      );
    }

    // 2. MARCO HEXAGONAL: Geometric futuristic sports polygon badge
    if (photoFrameStyle === 'marco_hexagonal') {
      return (
        <div className="relative my-auto flex flex-col items-center justify-center">
          <div 
            className="relative w-40 sm:w-48 h-44 sm:h-52 p-1.5 flex items-center justify-center overflow-hidden bg-gradient-to-b from-amber-400 via-blue-500 to-indigo-900 shadow-2xl"
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          >
            <div 
              className="w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              <img
                src={activePhotoSrc!}
                alt="Futbolista"
                className="w-full h-full object-cover object-top filter contrast-105"
                crossOrigin="anonymous"
              />
            </div>
          </div>
          {characterMode === 'squad_player' && featuredPlayer && (
            <div className="mt-1.5 bg-blue-600 text-white font-black text-[10px] sm:text-[11px] px-3 py-0.5 rounded-full uppercase shadow border border-blue-400">
              #{featuredPlayer.dorsal || '—'} {featuredPlayer.nombre}
            </div>
          )}
        </div>
      );
    }

    // 3. TARJETA DIAMANTE: Beveled octagon athletic shield
    if (photoFrameStyle === 'tarjeta_diamante') {
      return (
        <div className="relative my-auto flex flex-col items-center justify-center">
          <div 
            className="relative w-40 sm:w-48 h-44 sm:h-50 p-1 bg-gradient-to-tr from-blue-600 via-amber-400 to-cyan-400 shadow-2xl"
            style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%, 0% 15%)' }}
          >
            <div 
              className="w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center"
              style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 15%, 100% 85%, 85% 100%, 15% 100%, 0% 85%, 0% 15%)' }}
            >
              <img
                src={activePhotoSrc!}
                alt="Futbolista"
                className="w-full h-full object-cover object-center filter contrast-110"
                crossOrigin="anonymous"
              />
            </div>
          </div>
          {characterMode === 'squad_player' && featuredPlayer && (
            <div className="mt-1.5 bg-amber-400 text-slate-950 font-black text-[10px] sm:text-[11px] px-3 py-0.5 rounded-full uppercase shadow">
              #{featuredPlayer.dorsal || '—'} {featuredPlayer.nombre}
            </div>
          )}
        </div>
      );
    }

    // 4. CIRCULO PRO: Dual metallic ring medallion
    if (photoFrameStyle === 'circulo_pro') {
      return (
        <div className="relative my-auto flex flex-col items-center justify-center">
          <div className="w-38 sm:w-46 h-38 sm:h-46 rounded-full p-1.5 bg-gradient-to-br from-amber-300 via-blue-600 to-cyan-400 shadow-2xl">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-slate-950 bg-slate-950 flex items-center justify-center">
              <img
                src={activePhotoSrc!}
                alt="Futbolista"
                className="w-full h-full object-cover object-top"
                crossOrigin="anonymous"
              />
            </div>
          </div>
          {characterMode === 'squad_player' && featuredPlayer && (
            <div className="mt-1.5 bg-amber-400 text-slate-950 font-black text-[10px] sm:text-[11px] px-3 py-0.5 rounded-full uppercase shadow">
              #{featuredPlayer.dorsal || '—'} {featuredPlayer.nombre}
            </div>
          )}
        </div>
      );
    }

    // 5. SILUETA LIBRE: Pure cutout athlete blending into the pitch
    return (
      <div className="relative w-44 sm:w-52 h-44 sm:h-52 my-auto flex flex-col items-center justify-center">
        <img
          src={activePhotoSrc!}
          alt="Futbolista"
          className="w-full h-full object-contain filter drop-shadow-[0_16px_28px_rgba(0,0,0,0.95)]"
          crossOrigin="anonymous"
        />
        {characterMode === 'squad_player' && featuredPlayer && (
          <div className="mt-1 bg-amber-400 text-slate-950 font-black text-[10px] sm:text-[11px] px-3 py-0.5 rounded-full uppercase shadow">
            #{featuredPlayer.dorsal || '—'} {featuredPlayer.nombre}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-6xl my-auto overflow-hidden shadow-2xl flex flex-col max-h-[96vh]">
        
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 p-2 flex items-center justify-center shadow-lg shadow-blue-600/30 text-white font-black">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-white text-base sm:text-lg uppercase tracking-tight flex items-center gap-2">
                  <span>Cartel Oficial de Partido (Matchday)</span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded-full font-extrabold">
                    U.D. LA POVEDA
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Personaliza colores de fondo, diseño de foto del jugador/a y datos del partido
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Content: Controls on Left, Live Canvas on Right */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Controls & Customization (5 / 12 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* QUICK PRESET SELECTOR: 1-Click Matchday Setup */}
            <div className="bg-gradient-to-r from-blue-950/90 via-slate-900/90 to-indigo-950/90 border border-blue-500/40 p-4 rounded-2xl space-y-2.5 shadow-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Estilo de Anuncio de Partido</span>
                </label>
                <span className="text-[10px] text-cyan-300 font-bold bg-cyan-400/10 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                  Diseño Oficial Poveda
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('vintage_60s')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    posterPreset === 'vintage_60s'
                      ? 'bg-gradient-to-r from-amber-700 to-amber-900 border-amber-300 text-white font-black shadow-lg ring-2 ring-amber-400/50 scale-[1.02]'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-amber-300 text-xs">📻</span>
                    <span className="text-[11px] font-black uppercase">Años 60</span>
                  </div>
                  <span className="text-[8px] text-amber-200 block mt-0.5 leading-tight">
                    Cartel de época
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('dia_de_partido')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    posterPreset === 'dia_de_partido'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-300 text-white font-black shadow-lg ring-2 ring-blue-400/50 scale-[1.02]'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-amber-300 text-xs">⚽</span>
                    <span className="text-[11px] font-black uppercase">Día Partido</span>
                  </div>
                  <span className="text-[8px] text-blue-200 block mt-0.5 leading-tight">
                    Anuncio oficial
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('matchday')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    posterPreset === 'matchday'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-300 text-white font-black shadow-lg ring-2 ring-blue-400/50 scale-[1.02]'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-amber-300 text-xs">🔥</span>
                    <span className="text-[11px] font-black uppercase">Matchday</span>
                  </div>
                  <span className="text-[8px] text-blue-200 block mt-0.5 leading-tight">
                    Fuerza & Victoria
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('aficion')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    posterPreset === 'aficion'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-300 text-white font-black shadow-lg ring-2 ring-blue-400/50 scale-[1.02]'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-amber-300 text-xs">🏟️</span>
                    <span className="text-[11px] font-black uppercase">¡A la Grada!</span>
                  </div>
                  <span className="text-[8px] text-blue-200 block mt-0.5 leading-tight">
                    Llamada afición
                  </span>
                </button>
              </div>
            </div>

            {/* Match Selector from PARTIDOS */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                  <span>Partido Seleccionado</span>
                </label>
                <button
                  type="button"
                  onClick={() => syncWithMatch(activeMatch)}
                  className="text-[10px] text-cyan-300 hover:text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                  title="Recargar datos de este partido en el cartel"
                >
                  <span>🔄 Recargar datos</span>
                </button>
              </div>

              <select
                value={selectedMatchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {allMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fecha} • {m.tipo === 'Local' ? `UD LA POVEDA vs ${m.rival}` : `${m.rival} vs UD LA POVEDA`} ({m.competicion})
                  </option>
                ))}
              </select>

              {/* Match details summary */}
              <div className="bg-slate-950/70 border border-slate-850 p-3 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-400">Rival:</span>
                  <span className="text-amber-400 uppercase font-black">{rivalName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Fecha y Hora:</span>
                  <span className="text-white font-bold">{formattedDate.shortDate} • {matchHora} h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Condición:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${isLocal ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40' : 'bg-amber-600/30 text-amber-300 border border-amber-500/40'}`}>
                    {isLocal ? '🏠 Local (La Poveda)' : '🚌 Visitante (Fuera)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Campo de Juego:</span>
                  <span className="text-slate-200 truncate max-w-[200px] text-right font-medium" title={matchLugar}>
                    {matchLugar}
                  </span>
                </div>
              </div>
            </div>

            {/* Background Colors Palette Selector */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Color de Fondo del Cartel</span>
                </label>
                <span className="text-[10px] text-cyan-400 font-bold">
                  {currentBg.name}
                </span>
              </div>

              {/* Grid of 8 color palettes */}
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(bgPaletteConfig) as PosterBgColor[]).map((key) => {
                  const item = bgPaletteConfig[key];
                  const isSelected = bgColor === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBgColor(key)}
                      className={`relative p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-14 ${
                        isSelected
                          ? 'border-cyan-400 ring-2 ring-cyan-500/50 shadow-lg scale-[1.02]'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950'
                      }`}
                    >
                      {/* Gradient swatch preview */}
                      <div className={`w-full h-4 rounded-md bg-gradient-to-r ${item.swatchGrad} shadow-inner flex items-center justify-end px-1`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div className="leading-none mt-1">
                        <span className="block text-[10px] font-black text-white truncate">
                          {item.name}
                        </span>
                        <span className="block text-[8px] text-slate-400 truncate">
                          {item.sub}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Poster Styles / Themes */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
              <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Estilo del Cartel de Fútbol</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* 0. Vintage 1960s Poster */}
                <button
                  type="button"
                  onClick={() => {
                    setPosterTheme('vintage_60s');
                    setBgColor('papel_60s');
                    setCharacterMode('retro_player_60s');
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-black uppercase text-left transition-all cursor-pointer col-span-2 ${
                    posterTheme === 'vintage_60s'
                      ? 'bg-amber-950/60 border-amber-400 text-amber-200 ring-2 ring-amber-500/50 shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-400 text-base">📻</span>
                      <span className="leading-tight font-black text-white">Cartel Años 60 (Clásico)</span>
                    </div>
                    <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                      Estilo Años 60
                    </span>
                  </div>
                  <span className="text-[9px] text-amber-200/80 font-normal normal-case block mt-1">
                    Tipografía de madera, papel envejecido, balón de cuero y estética de imprenta de época
                  </span>
                </button>

                {/* 1. Official Club / Captación style */}
                <button
                  type="button"
                  onClick={() => setPosterTheme('poveda_captacion')}
                  className={`p-2.5 rounded-xl border text-xs font-black uppercase text-left transition-all cursor-pointer ${
                    posterTheme === 'poveda_captacion'
                      ? 'bg-blue-950 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/50 shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="block leading-tight font-black text-white">Oficial Poveda</span>
                    <span className="text-[9px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold">Moderno</span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-normal normal-case block mt-0.5">salpicaduras & cielo</span>
                </button>

                {/* 2. Stadium Night */}
                <button
                  type="button"
                  onClick={() => setPosterTheme('stadium_night')}
                  className={`p-2.5 rounded-xl border text-xs font-black uppercase text-left transition-all cursor-pointer ${
                    posterTheme === 'stadium_night'
                      ? 'bg-blue-950 border-blue-400 text-blue-200 ring-2 ring-blue-500/50 shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block leading-tight">Estadio Noche</span>
                  <span className="text-[9px] text-slate-400 font-normal normal-case block mt-0.5">focos & césped</span>
                </button>

                {/* 3. Poveda Brush */}
                <button
                  type="button"
                  onClick={() => setPosterTheme('poveda_brush')}
                  className={`p-2.5 rounded-xl border text-xs font-black uppercase text-left transition-all cursor-pointer ${
                    posterTheme === 'poveda_brush'
                      ? 'bg-blue-950 border-blue-400 text-blue-200 ring-2 ring-blue-500/50 shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block leading-tight">Pincelada Club</span>
                  <span className="text-[9px] text-slate-400 font-normal normal-case block mt-0.5">valores & arte</span>
                </button>

                {/* 4. Editorial Press */}
                <button
                  type="button"
                  onClick={() => setPosterTheme('editorial_press')}
                  className={`p-2.5 rounded-xl border text-xs font-black uppercase text-left transition-all cursor-pointer ${
                    posterTheme === 'editorial_press'
                      ? 'bg-blue-950 border-blue-400 text-blue-200 ring-2 ring-blue-500/50 shadow-lg'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block leading-tight">Federación Pro</span>
                  <span className="text-[9px] text-slate-400 font-normal normal-case block mt-0.5">corte deportivo</span>
                </button>
              </div>
            </div>

            {/* NEW SECTION: Player Photo & Presentation Design */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
              <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Fotografía Deportiva Central</span>
              </label>

              {/* Photo Modes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                
                {/* 0. Jugador Años 60 */}
                <button
                  type="button"
                  onClick={() => setCharacterMode('retro_player_60s')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    characterMode === 'retro_player_60s'
                      ? 'bg-amber-500/20 border-amber-400 text-white font-black ring-1 ring-amber-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs font-black">Jugador Años 60</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Balón de cuero clásico</span>
                </button>

                {/* 1. Jugador Oficial Poveda */}
                <button
                  type="button"
                  onClick={() => setCharacterMode('captacion_player')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    characterMode === 'captacion_player'
                      ? 'bg-cyan-500/20 border-cyan-400 text-white font-black ring-1 ring-cyan-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-xs font-black">Jugador Poveda</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Acción & pintura oficial</span>
                </button>

                {/* 1. Celebración Épica */}
                <button
                  type="button"
                  onClick={() => setCharacterMode('celebration_hero')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    characterMode === 'celebration_hero'
                      ? 'bg-amber-500/20 border-amber-400 text-white font-black ring-1 ring-amber-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs font-black">Celebración</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Brazos en alto</span>
                </button>

                {/* 2. Retrato Capitán/a */}
                <button
                  type="button"
                  onClick={() => setCharacterMode('captain_portrait')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    characterMode === 'captain_portrait'
                      ? 'bg-amber-500/20 border-amber-400 text-white font-black ring-1 ring-amber-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-xs font-black">Capitán/a</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Primer plano</span>
                </button>

                {/* 3. Jugadora en Carrera */}
                <button
                  type="button"
                  onClick={() => setCharacterMode('female_brush')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    characterMode === 'female_brush'
                      ? 'bg-blue-900/60 border-blue-400 text-white font-black ring-1 ring-blue-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="text-xs font-black">En Carrera</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Acción con balón</span>
                </button>

                {/* 4. Jugador en Golpeo */}
                <button
                  type="button"
                  onClick={() => setCharacterMode('male_brush')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    characterMode === 'male_brush'
                      ? 'bg-blue-900/60 border-blue-400 text-white font-black ring-1 ring-blue-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-xs font-black">En Golpeo</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Remate atlético</span>
                </button>

                {/* 5. Foto Plantilla Real */}
                <button
                  type="button"
                  onClick={() => setCharacterMode('squad_player')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    characterMode === 'squad_player'
                      ? 'bg-emerald-950/60 border-emerald-400 text-white font-black ring-1 ring-emerald-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-black">Plantilla</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Foto de jugadora</span>
                </button>

                {/* 6. Duelo de Escudos */}
                <button
                  type="button"
                  onClick={() => setCharacterMode('duel_badges')}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    characterMode === 'duel_badges'
                      ? 'bg-blue-900/60 border-blue-400 text-white font-black ring-1 ring-blue-400/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Swords className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="text-xs font-black">Escudos</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block leading-tight">Sin jugador/a</span>
                </button>
              </div>

              {/* Player Selector dropdown when squad_player is selected */}
              {characterMode === 'squad_player' && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Seleccionar Jugadora de la Plantilla:
                  </span>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.dorsal || '—'} {p.nombre} {p.apellidos || ''} ({p.posicion || 'Jugadora'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Marco / Diseño de Presentación de la Foto */}
              {characterMode !== 'duel_badges' && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Diseño y Marco de la Foto:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    
                    <button
                      type="button"
                      onClick={() => setPhotoFrameStyle('halo_neon')}
                      className={`p-1.5 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer ${
                        photoFrameStyle === 'halo_neon'
                          ? 'bg-blue-600 border-blue-400 text-white font-black shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Halo Neón
                    </button>

                    <button
                      type="button"
                      onClick={() => setPhotoFrameStyle('marco_hexagonal')}
                      className={`p-1.5 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer ${
                        photoFrameStyle === 'marco_hexagonal'
                          ? 'bg-blue-600 border-blue-400 text-white font-black shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Hexágono
                    </button>

                    <button
                      type="button"
                      onClick={() => setPhotoFrameStyle('tarjeta_diamante')}
                      className={`p-1.5 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer ${
                        photoFrameStyle === 'tarjeta_diamante'
                          ? 'bg-blue-600 border-blue-400 text-white font-black shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Diamante
                    </button>

                    <button
                      type="button"
                      onClick={() => setPhotoFrameStyle('circulo_pro')}
                      className={`p-1.5 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer ${
                        photoFrameStyle === 'circulo_pro'
                          ? 'bg-blue-600 border-blue-400 text-white font-black shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Medalla
                    </button>

                    <button
                      type="button"
                      onClick={() => setPhotoFrameStyle('silueta_libre')}
                      className={`p-1.5 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer ${
                        photoFrameStyle === 'silueta_libre'
                          ? 'bg-blue-600 border-blue-400 text-white font-black shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Silueta
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Editable Text Fields */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Paintbrush className="w-3.5 h-3.5 text-blue-400" />
                  <span>Textos y Mensajes del Cartel</span>
                </label>
                {posterTheme === 'poveda_captacion' && (
                  <span className="text-[10px] text-cyan-400 font-bold">
                    Estilo Oficial Referencia
                  </span>
                )}
              </div>

              {posterTheme === 'poveda_captacion' ? (
                /* Specialized inputs for Match Announcement Poster */
                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-300 uppercase">
                        Titular Superior (Cielo Azul):
                      </span>
                      <div className="flex items-center gap-1">
                        {['DÍA DE PARTIDO', 'MATCHDAY', '¡HOY JUGAMOS!'].map((titleOption) => (
                          <button
                            key={titleOption}
                            type="button"
                            onClick={() => setTopHeadline(titleOption)}
                            className="text-[9px] bg-slate-950 hover:bg-blue-950 text-cyan-300 border border-slate-800 hover:border-cyan-500/50 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            {titleOption}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={topHeadline}
                      onChange={(e) => setTopHeadline(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-black focus:outline-none focus:border-cyan-500"
                      placeholder="DÍA DE PARTIDO"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Cinta L1 (Competición):
                      </span>
                      <input
                        type="text"
                        value={ribbonLine1}
                        onChange={(e) => setRibbonLine1(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                        placeholder="LIGA RFFM • JUGAMOS EN CASA"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Cinta L2 (Fecha & Hora):
                      </span>
                      <input
                        type="text"
                        value={ribbonLine2}
                        onChange={(e) => setRibbonLine2(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                        placeholder="SÁB. 12 OCT. • 11:30 H"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Equipo 1 (Impacto L1):
                      </span>
                      <input
                        type="text"
                        value={impactLine1}
                        onChange={(e) => setImpactLine1(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-black italic focus:outline-none focus:border-cyan-500"
                        placeholder="U.D. LA POVEDA"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Equipo 2 (Impacto L2):
                      </span>
                      <input
                        type="text"
                        value={impactLine2}
                        onChange={(e) => setImpactLine2(e.target.value.toUpperCase())}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-black italic focus:outline-none focus:border-cyan-500"
                        placeholder="VS RIVAL"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Mensaje a la Afición / Motivación:
                    </span>
                    <input
                      type="text"
                      value={bodyMessage}
                      onChange={(e) => setBodyMessage(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
                      placeholder="DEFENDEMOS NUESTROS COLORES EN CASA. ¡A POR LOS TRES PUNTOS!"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Franja / Llamamiento:
                      </span>
                      <div className="flex items-center gap-1">
                        {['¡TE ESPERAMOS EN LA GRADA!', '¡A POR LA VICTORIA!', '¡LLENEMOS EL POLI!'].map((callout) => (
                          <button
                            key={callout}
                            type="button"
                            onClick={() => setActionBannerText(callout)}
                            className="text-[9px] bg-slate-950 hover:bg-blue-950 text-cyan-300 border border-slate-800 hover:border-cyan-500/50 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            {callout}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={actionBannerText}
                      onChange={(e) => setActionBannerText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-black uppercase focus:outline-none focus:border-cyan-500"
                      placeholder="¡TE ESPERAMOS EN LA GRADA!"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Barra Central de 4 Iconos:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIconBarMode('partido')}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-black uppercase transition-all cursor-pointer ${
                          iconBarMode === 'partido'
                            ? 'bg-blue-600 border-blue-400 text-white shadow'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        ⚽ Datos del Partido
                      </button>
                      <button
                        type="button"
                        onClick={() => setIconBarMode('valores')}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-black uppercase transition-all cursor-pointer ${
                          iconBarMode === 'valores'
                            ? 'bg-blue-600 border-blue-400 text-white shadow'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        ⭐ Valores de Club
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Campo / Lugar (Lema L1):
                      </span>
                      <input
                        type="text"
                        value={sloganLine1}
                        onChange={(e) => setSloganLine1(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Grito de Guerra (Lema L2):
                      </span>
                      <input
                        type="text"
                        value={sloganLine2}
                        onChange={(e) => setSloganLine2(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Pie Izquierda (Instalación):
                      </span>
                      <input
                        type="text"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
                        placeholder="POLIDEPORTIVO LA POVEDA"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Pie Derecha (Acceso / Info):
                      </span>
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
                        placeholder="ENTRADA LIBRE"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* General inputs for the other themes */
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Titular Principal:
                    </span>
                    <input
                      type="text"
                      value={mainHeadline}
                      onChange={(e) => setMainHeadline(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-black focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Subtítulo / Lema de Club:
                    </span>
                    <input
                      type="text"
                      value={subHeadline}
                      onChange={(e) => setSubHeadline(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Llamamiento a la Grada:
                    </span>
                    <input
                      type="text"
                      value={grandstandCallout}
                      onChange={(e) => setGrandstandCallout(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Formato / Aspect Ratio */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Formato de Pantalla / Impresión:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('poster')}
                    className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      aspectRatio === 'poster'
                        ? 'bg-blue-600 border-blue-500 text-white font-black shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Cartel (2:3)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio('story')}
                    className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      aspectRatio === 'story'
                        ? 'bg-blue-600 border-blue-500 text-white font-black shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>Story (9:16)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio('feed')}
                    className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      aspectRatio === 'feed'
                        ? 'bg-blue-600 border-blue-500 text-white font-black shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <SquareIcon className="w-3 h-3" />
                    <span>Feed (1:1)</span>
                  </button>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={handleExportPng}
                    disabled={isExporting}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase h-11 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar PNG HD</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    variant="outline"
                    className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase h-11 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-blue-400" />
                    <span>Descargar PDF</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={handleCopyWhatsapp}
                    variant="outline"
                    className="border-slate-800 hover:bg-slate-900 text-slate-200 font-bold text-xs uppercase h-10 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-sky-400" />
                    <span>Copiar Texto</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleOpenWhatsapp}
                    className="bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase h-10 rounded-xl shadow-lg shadow-green-950 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar WhatsApp</span>
                  </Button>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: The Football Match Poster Canvas (7 / 12 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-950/90 rounded-3xl p-3 sm:p-6 border border-slate-900 overflow-x-auto min-h-[640px]">
            
            {/* The Poster Canvas Container */}
            <div
              id="matchday-official-poster-canvas"
              className={`relative overflow-hidden flex flex-col justify-between transition-all select-none shadow-[0_25px_70px_rgba(0,0,0,0.85)] ${
                aspectRatio === 'poster'
                  ? 'w-full max-w-[460px] aspect-[2/3]'
                  : (aspectRatio === 'story'
                      ? 'w-full max-w-[410px] aspect-[9/16]'
                      : 'w-full max-w-[480px] aspect-square')
              }`}
              style={{
                fontFamily: '"Montserrat", "DIN Alternate", "Impact", "Arial Black", sans-serif'
              }}
            >

              {/* ========================================================================= */}
              {/* THEME VINTAGE 60s: AUTHENTIC 1960s SPANISH FOOTBALL MATCH POSTER          */}
              {/* ========================================================================= */}
              {posterTheme === 'vintage_60s' && (
                <div 
                  className="w-full h-full relative flex flex-col justify-between overflow-hidden bg-[#faf4e6] text-[#1c1917] p-3 sm:p-4 select-none"
                  style={{
                    fontFamily: '"Cinzel", "Playfair Display", "Times New Roman", "Georgia", "Impact", serif'
                  }}
                >
                  {/* Background Paper Texture with authentic letterpress grain and vintage patina */}
                  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <img
                      src={retroSixtiesBgImg}
                      alt="Papel Vintage Años 60"
                      className="w-full h-full object-cover mix-blend-multiply opacity-40"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                    {/* Subtle warm aging gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#8f6834]/10 via-transparent to-[#543b17]/15 pointer-events-none" />
                  </div>

                  {/* DOUBLE RETRO BORDER with authentic corner fleurons / stars */}
                  <div className="absolute inset-2 sm:inset-2.5 border-2 border-[#8b1e1e] pointer-events-none z-20">
                    <div className="absolute inset-1 border border-[#8b1e1e]/40 border-dashed" />
                    
                    {/* Corner Ornaments */}
                    <div className="absolute -top-1.5 -left-1.5 text-[#8b1e1e] text-[11px] font-black leading-none bg-[#faf4e6] px-0.5">✦</div>
                    <div className="absolute -top-1.5 -right-1.5 text-[#8b1e1e] text-[11px] font-black leading-none bg-[#faf4e6] px-0.5">✦</div>
                    <div className="absolute -bottom-1.5 -left-1.5 text-[#8b1e1e] text-[11px] font-black leading-none bg-[#faf4e6] px-0.5">✦</div>
                    <div className="absolute -bottom-1.5 -right-1.5 text-[#8b1e1e] text-[11px] font-black leading-none bg-[#faf4e6] px-0.5">✦</div>
                  </div>

                  {/* INNER CONTENT LAYER */}
                  <div className="relative z-10 flex flex-col justify-between h-full p-2 sm:p-2.5 space-y-1">
                    
                    {/* 1. TOP MASTHEAD: Federation & Season */}
                    <div className="text-center border-b-2 border-[#8b1e1e] pb-1.5">
                      <div className="text-[7.5px] sm:text-[9px] font-serif font-black tracking-[0.25em] uppercase text-[#6b2222]">
                        FEDERACIÓN REGIONAL DE FÚTBOL • COLEGIO OFICIAL
                      </div>
                      <div className="flex items-center justify-center gap-2 my-0.5">
                        <span className="text-[#8b1e1e] text-[9px]">★ ★ ★</span>
                        <span className="text-[9px] sm:text-[10.5px] font-black uppercase tracking-wider text-[#1a2b54]">
                          {ribbonLine1}
                        </span>
                        <span className="text-[#8b1e1e] text-[9px]">★ ★ ★</span>
                      </div>
                    </div>

                    {/* 2. GRAND HEADLINE (WOODBLOCK CONDENSED VINTAGE LETTERPRESS) */}
                    <div className="text-center py-0.5">
                      <div className="inline-block bg-[#8b1e1e] text-[#faf4e6] px-3 py-0.5 rounded-xs shadow-xs mb-1">
                        <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em]">
                          {ribbonLine2}
                        </span>
                      </div>

                      <h1 
                        className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-[#8b1e1e] tracking-tight leading-none"
                        style={{
                          fontFamily: '"Impact", "Arial Black", "Cinzel", sans-serif',
                          textShadow: '1px 1px 0px #e6d3ba, 2px 2px 0px rgba(0,0,0,0.1)'
                        }}
                      >
                        {topHeadline}
                      </h1>

                      <div className="flex items-center justify-center gap-2 mt-0.5">
                        <div className="h-[1px] w-12 bg-[#8b1e1e]/40" />
                        <span className="text-[8.5px] sm:text-[9.5px] font-bold text-[#8b1e1e] uppercase tracking-widest">
                          EN EL CAMPO DE DEPORTES
                        </span>
                        <div className="h-[1px] w-12 bg-[#8b1e1e]/40" />
                      </div>
                    </div>

                    {/* 3. THE CLASH: LOCAL TEAM vs RIVAL (WOODBLOCK CARTOUCHE) */}
                    <div className="bg-[#f2e7ce]/90 border-y-2 border-[#1a2b54] p-2 text-center shadow-xs">
                      {/* Local Team */}
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border border-[#1a2b54] p-0.5 shrink-0 shadow-xs">
                          <UDLaPovedaLogo className="w-full h-full" />
                        </div>
                        <h2 
                          className="text-lg sm:text-2xl font-black uppercase text-[#14234b] tracking-wider leading-none"
                          style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}
                        >
                          {impactLine1}
                        </h2>
                      </div>

                      {/* Vintage separator */}
                      <div className="flex items-center justify-center gap-2 my-1">
                        <div className="h-[1px] flex-1 bg-[#8b1e1e]/50" />
                        <span className="bg-[#8b1e1e] text-[#faf4e6] text-[8px] sm:text-[9px] font-black uppercase px-2 py-0.5 tracking-widest rounded-xs">
                          {isLocal ? '— CONTRA —' : '— VISITA A —'}
                        </span>
                        <div className="h-[1px] flex-1 bg-[#8b1e1e]/50" />
                      </div>

                      {/* Rival Team */}
                      <h2 
                        className="text-lg sm:text-2xl font-black uppercase text-[#8b1e1e] tracking-wider leading-none"
                        style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}
                      >
                        {impactLine2.replace(/^VS\s+/i, '').replace(/^CONTRA\s+/i, '')}
                      </h2>
                    </div>

                    {/* 4. CENTERPIECE: RETRO 1960s FOOTBALL PLAYER & MATCH DETAILS */}
                    <div className="grid grid-cols-12 gap-2 items-center my-0.5 py-0.5">
                      
                      {/* Left: Vintage Date & Time Box */}
                      <div className="col-span-4 bg-[#f4ebd4] border border-[#8b1e1e]/50 p-1.5 rounded-xs text-center flex flex-col justify-center shadow-xs">
                        <span className="text-[7.5px] sm:text-[8px] font-black uppercase text-[#8b1e1e] tracking-wider block border-b border-[#8b1e1e]/30 pb-0.5">
                          FECHA OFICIAL
                        </span>
                        <span className="text-[10px] sm:text-xs font-black uppercase text-[#14234b] block mt-0.5 leading-tight">
                          {formattedDate.weekday}
                        </span>
                        <span className="text-base sm:text-xl font-black text-[#8b1e1e] leading-none my-0.5">
                          {formattedDate.dayNum}
                        </span>
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase text-[#14234b] leading-none">
                          {formattedDate.monthName}
                        </span>
                        <div className="mt-1 pt-1 border-t border-[#8b1e1e]/30">
                          <span className="text-[9px] sm:text-[10px] font-black text-[#8b1e1e] block">
                            {matchHora} H.
                          </span>
                          <span className="text-[7px] font-serif text-stone-600 block">
                            EN PUNTO
                          </span>
                        </div>
                      </div>

                      {/* Center: Vintage 1960s Football Player Illustration with Leather Ball */}
                      <div className="col-span-4 flex items-center justify-center">
                        <div className="relative w-28 sm:w-34 aspect-[3/4] rounded-sm overflow-hidden border-2 border-[#1a2b54] shadow-md bg-[#eaddc4]">
                          <img
                            src={activePhotoSrc || retroSixtiesPlayerImg}
                            alt="Futbolista Años 60"
                            className="w-full h-full object-cover object-top contrast-110 sepia-[0.25]"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                          />
                          {/* Halftone & duotone vintage ink wash */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#14234b]/30 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute bottom-0 inset-x-0 bg-[#14234b]/90 text-white text-[7px] sm:text-[8px] font-black uppercase text-center py-0.5 tracking-wider">
                            U.D. LA POVEDA
                          </div>
                        </div>
                      </div>

                      {/* Right: Pitch & Access Box */}
                      <div className="col-span-4 bg-[#f4ebd4] border border-[#1a2b54]/50 p-1.5 rounded-xs text-center flex flex-col justify-center shadow-xs">
                        <span className="text-[7.5px] sm:text-[8px] font-black uppercase text-[#1a2b54] tracking-wider block border-b border-[#1a2b54]/30 pb-0.5">
                          TERRENO DE JUEGO
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-black uppercase text-[#14234b] block mt-0.5 leading-tight">
                          {isLocal ? 'CAMPO DE DEPORTES' : 'CAMPO MUNICIPAL'}
                        </span>
                        <span className="text-xs sm:text-sm font-black text-[#8b1e1e] leading-tight my-0.5">
                          {isLocal ? '"LA POVEDA"' : rivalName.toUpperCase()}
                        </span>
                        <span className="text-[7.5px] sm:text-[8px] font-bold uppercase text-stone-600 leading-none">
                          {isLocal ? 'ARGANDA DEL REY' : 'MADRID'}
                        </span>
                        <div className="mt-1 pt-1 border-t border-[#1a2b54]/30">
                          <span className="text-[8px] sm:text-[9px] font-black text-[#1a2b54] block">
                            {isLocal ? 'EN CASA' : 'A DOMICILIO'}
                          </span>
                          <span className="text-[7px] font-bold text-emerald-800 uppercase block">
                            {actionBannerText}
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* 5. CALL TO THE FANS (EXHORTACIÓN POPULAR DE ÉPOCA) */}
                    <div className="bg-[#ede1c7]/80 border border-[#8b1e1e]/40 p-1.5 text-center rounded-xs">
                      <p className="text-[8px] sm:text-[9px] font-serif font-bold text-[#14234b] leading-tight tracking-wide">
                        «{bodyMessage}»
                      </p>
                      <div className="text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-[#8b1e1e] mt-0.5">
                        {sloganLine2}
                      </div>
                    </div>

                    {/* 6. VINTAGE TICKET STUB / FOOTER OFICIAL */}
                    <div className="border-t-2 border-dashed border-[#8b1e1e] pt-1 mt-auto">
                      <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-black uppercase text-[#14234b] tracking-wider">
                        <span>LOCALIDADES: ENTRADA LIBRE</span>
                        <span className="text-[#8b1e1e]">✦</span>
                        <span>{contactEmail}</span>
                        <span className="text-[#8b1e1e]">✦</span>
                        <span>{contactPhone}</span>
                      </div>
                      <div className="text-center text-[6px] sm:text-[7px] font-serif text-stone-500 mt-0.5 uppercase tracking-widest">
                        Tipografía y Litografía Municipal • Depósito Legal M-1964 • ¡Viva el Deporte!
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* THEME 0: POVEDA OFICIAL (Captación & Pincel - Matches Reference Image)     */}
              {/* ========================================================================= */}
              {posterTheme === 'poveda_captacion' && (
                <div className="w-full h-full relative flex flex-col justify-between overflow-hidden bg-white text-slate-900">
                  
                  {/* Subtle Background Watermark Crest */}
                  <div className="absolute -right-16 top-1/4 w-84 h-84 opacity-[0.06] pointer-events-none rotate-12 z-0">
                    <UDLaPovedaLogo className="w-full h-full" />
                  </div>

                  {/* 1. TOP HEADER: Vivid Sky Blue with Ink/Cloud Splatter & Large 3D Headline */}
                  <div className="relative z-10 bg-gradient-to-r from-[#0742a8] via-[#0e5cd1] to-[#1c75eb] pt-4 pb-6 px-4 shadow-md">
                    {/* Atmospheric ink clouds and texture in header */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.8),transparent_60%)]" />
                    <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-cyan-300/20 blur-xl pointer-events-none" />

                    {/* Top row: Club Crest + Top Club Name */}
                    <div className="relative z-10 flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-white p-0.5 shadow-lg flex items-center justify-center border-2 border-blue-400">
                          <UDLaPovedaLogo className="w-full h-full" />
                        </div>
                        <div>
                          <span className="block text-[11px] font-black uppercase text-white tracking-widest leading-none drop-shadow">
                            U.D. LA POVEDA
                          </span>
                          <span className="block text-[8px] font-bold uppercase text-cyan-200 tracking-wider">
                            Arganda del Rey • Madrid
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block bg-white/20 backdrop-blur-sm border border-white/40 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                          Temporada 2024 / 2025
                        </span>
                      </div>
                    </div>

                    {/* Big Bold Condensed Headline: "CAPTACIÓN" */}
                    <div className="relative z-10 text-center py-1">
                      <h1 
                        className="text-4xl sm:text-5xl md:text-[54px] font-black uppercase tracking-[0.04em] text-white leading-none transform scale-y-110 drop-shadow-[0_4px_12px_rgba(2,18,60,0.7)]"
                        style={{ textShadow: '0 3px 6px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.8)' }}
                      >
                        {topHeadline}
                      </h1>
                    </div>

                    {/* Torn paper / Paint splatter transition into white canvas */}
                    <div className="absolute -bottom-4 left-0 right-0 h-5 overflow-hidden pointer-events-none z-20">
                      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full text-white fill-current">
                        <path d="M0,0 C120,80 280,-30 450,70 C620,130 820,-20 1000,65 C1120,40 1180,20 1200,50 L1200,120 L0,120 Z" />
                      </svg>
                    </div>

                    {/* Blue paint droplets below the torn edge */}
                    <div className="absolute -bottom-2 left-12 w-2 h-2 rounded-full bg-[#0e5cd1] pointer-events-none z-20" />
                    <div className="absolute -bottom-4 left-16 w-1.5 h-1.5 rounded-full bg-[#0742a8] pointer-events-none z-20" />
                    <div className="absolute -bottom-3 right-16 w-2.5 h-2.5 rounded-full bg-[#1c75eb] pointer-events-none z-20" />
                    <div className="absolute -bottom-5 right-24 w-1 h-1 rounded-full bg-[#0e5cd1] pointer-events-none z-20" />
                  </div>

                  {/* 2. MAIN BODY: Left Soccer Player with Blue Splatters + Right Ribbon & Headlines */}
                  <div className="relative z-10 flex-1 px-3 sm:px-5 pt-3 pb-1 grid grid-cols-12 items-center gap-2">
                    
                    {/* Left Side: Dynamic Soccer Player with Blue Splatters (5 cols) */}
                    <div className="col-span-5 relative flex items-center justify-center h-full min-h-[190px]">
                      {/* Vibrant blue paint splatters around player */}
                      <div className="absolute -inset-2 bg-gradient-to-tr from-blue-600/20 via-cyan-500/15 to-transparent rounded-full blur-xl pointer-events-none" />
                      
                      {/* Paint splash artistic shapes */}
                      <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-blue-500/20 rounded-full blur-md pointer-events-none" />
                      <div className="absolute top-4 -right-1 w-12 h-12 bg-cyan-400/20 rounded-full blur-md pointer-events-none" />

                      <img
                        src={activePhotoSrc || povedaPlayerBrushImg}
                        alt="Jugador UD La Poveda"
                        className="relative z-10 w-full max-h-[260px] object-contain drop-shadow-[0_12px_24px_rgba(4,24,72,0.35)] transform -scale-x-100 hover:scale-105 transition-transform"
                        crossOrigin="anonymous"
                      />
                    </div>

                    {/* Right Side: Ribbon, Impact Title, Message, Action Box (7 cols) */}
                    <div className="col-span-7 flex flex-col justify-center pl-1 space-y-2">
                      
                      {/* Angled Dark Navy Brush Ribbon */}
                      <div className="relative inline-block self-start transform -rotate-1 shadow-md">
                        <div className="bg-[#051d4d] text-white px-3 py-1 rounded-sm border-l-4 border-cyan-400">
                          <span className="block text-[11px] sm:text-xs font-black tracking-wider uppercase leading-tight text-cyan-200">
                            {ribbonLine1}
                          </span>
                          <span className="block text-[12px] sm:text-sm font-black tracking-wide uppercase leading-tight text-white">
                            {ribbonLine2}
                          </span>
                        </div>
                      </div>

                      {/* Large Forward-Slanted Italic Impact Title */}
                      <div className="leading-none pt-0.5">
                        <div className="text-2xl sm:text-3xl lg:text-[34px] font-black uppercase italic tracking-tighter text-[#062463] transform scale-y-110 drop-shadow-sm">
                          {impactLine1}
                        </div>
                        <div className="text-2xl sm:text-3xl lg:text-[34px] font-black uppercase italic tracking-tighter text-[#0c44b8] transform scale-y-110 drop-shadow-sm">
                          {impactLine2}
                        </div>
                      </div>

                      {/* Motivational Description */}
                      <div className="text-[#051d4d] font-extrabold text-[9px] sm:text-[10px] leading-tight tracking-tight uppercase max-w-[200px]">
                        {bodyMessage}
                      </div>

                      {/* Action Callout Brush Box */}
                      <div className="self-start transform -rotate-0.5 pt-1">
                        <div className="bg-gradient-to-r from-[#051d4d] to-[#082a72] text-white font-black text-[10px] sm:text-[11px] py-1 px-3 rounded-sm shadow-md uppercase tracking-wider border border-blue-400/30">
                          {actionBannerText}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 3. 4-ICON STRIP (Valores del Club or Datos de Partido) */}
                  <div className="relative z-10 mx-3 sm:mx-4 my-1 bg-gradient-to-r from-blue-50 via-white to-blue-50 border-y-2 border-blue-200 py-1.5 px-2 shadow-inner">
                    <div className="grid grid-cols-4 divide-x-2 divide-blue-200 text-center">
                      
                      {iconBarMode === 'valores' ? (
                        <>
                          {/* 1. Compañerismo */}
                          <div className="flex flex-col items-center justify-center px-1">
                            <Users className="w-4 h-4 text-[#0c44b8] mb-0.5" />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#051d4d] tracking-tight">
                              COMPAÑERISMO
                            </span>
                          </div>

                          {/* 2. Esfuerzo */}
                          <div className="flex flex-col items-center justify-center px-1">
                            <Trophy className="w-4 h-4 text-[#0c44b8] mb-0.5" />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#051d4d] tracking-tight">
                              ESFUERZO
                            </span>
                          </div>

                          {/* 3. Formación */}
                          <div className="flex flex-col items-center justify-center px-1">
                            <Target className="w-4 h-4 text-[#0c44b8] mb-0.5" />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#051d4d] tracking-tight">
                              FORMACIÓN
                            </span>
                          </div>

                          {/* 4. Valores */}
                          <div className="flex flex-col items-center justify-center px-1">
                            <Shield className="w-4 h-4 text-[#0c44b8] mb-0.5" />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#051d4d] tracking-tight">
                              VALORES
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* 1. Campo */}
                          <div className="flex flex-col items-center justify-center px-1">
                            <MapPin className="w-4 h-4 text-[#0c44b8] mb-0.5" />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#051d4d] tracking-tight truncate w-full">
                              {isLocal ? 'EN CASA' : 'A DOMICILIO'}
                            </span>
                          </div>

                          {/* 2. Hora */}
                          <div className="flex flex-col items-center justify-center px-1">
                            <Clock className="w-4 h-4 text-[#0c44b8] mb-0.5" />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#051d4d] tracking-tight">
                              {matchHora} H
                            </span>
                          </div>

                          {/* 3. Equipación */}
                          <div className="flex flex-col items-center justify-center px-1">
                            <Shield className="w-4 h-4 text-[#0c44b8] mb-0.5" />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#051d4d] tracking-tight truncate w-full">
                              {equipacion || 'OFICIAL'}
                            </span>
                          </div>

                          {/* 4. Competición */}
                          <div className="flex flex-col items-center justify-center px-1">
                            <Trophy className="w-4 h-4 text-[#0c44b8] mb-0.5" />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase text-[#051d4d] tracking-tight truncate w-full">
                              {matchCompeticion.toUpperCase()}
                            </span>
                          </div>
                        </>
                      )}

                    </div>
                  </div>

                  {/* 4. SLOGAN BANNER & CLUB MOTTO */}
                  <div className="relative z-10 text-center py-1 px-4">
                    <div className="text-[9px] sm:text-[10px] font-black uppercase text-[#051d4d] tracking-wider leading-none">
                      {sloganLine1}
                    </div>
                    <div className="text-xs sm:text-sm font-black uppercase text-[#0c44b8] tracking-widest leading-tight mt-0.5">
                      {sloganLine2}
                    </div>
                  </div>

                  {/* 5. FOOTER PILL: Deep Navy Oval with Match Location and Access */}
                  <div className="relative z-10 px-4 pb-4 pt-1">
                    <div className="bg-gradient-to-r from-[#04163b] via-[#072460] to-[#04163b] text-white py-2 px-4 rounded-full flex items-center justify-center gap-3 text-[9px] sm:text-[10px] font-black tracking-wider uppercase shadow-xl border border-blue-400/30">
                      <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                        <MapPin className="w-3 h-3 text-cyan-300 shrink-0" />
                        <span className="truncate">{contactEmail}</span>
                      </div>
                      <span className="text-blue-400 font-normal">|</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                        <span>{contactPhone}</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ========================================================================= */}
              {/* THEME 1: STADIUM NIGHT (Authentic Matchday with Dynamic Background Color) */}
              {/* ========================================================================= */}
              {posterTheme === 'stadium_night' && (
                <>
                  {/* Background Stadium Photo with dynamic gradient overlay matching chosen color */}
                  <div className="absolute inset-0 z-0">
                    <img
                      src={stadiumNightImg}
                      alt="Stadium Night"
                      className="w-full h-full object-cover object-center"
                      crossOrigin="anonymous"
                    />
                    {/* Atmospheric gradient according to chosen color palette */}
                    <div className={`absolute inset-0 bg-gradient-to-t ${currentBg.stadiumOverlayGrad}`} />
                    
                    {/* Atmospheric Glow Beams */}
                    <div className={`absolute -top-10 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none ${currentBg.accentGlow}`} />
                    <div className="absolute top-10 right-1/4 w-80 h-80 bg-cyan-300/15 rounded-full blur-3xl pointer-events-none" />
                  </div>

                  {/* Top Bar: Official Club & Match Header */}
                  <div className="relative z-10 p-4 sm:p-5 pb-0 flex flex-col">
                    <div className={`flex items-center justify-between border-b pb-2 ${currentBg.isDark ? 'border-white/20' : 'border-blue-900/20'}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white p-0.5 shadow-md flex items-center justify-center">
                          <UDLaPovedaLogo className="w-full h-full" />
                        </div>
                        <div>
                          <span className={`block font-black text-xs tracking-wider uppercase leading-tight ${currentBg.primaryText}`}>
                            U.D. LA POVEDA
                          </span>
                          <span className={`block font-bold text-[9px] uppercase tracking-widest leading-none ${currentBg.subText}`}>
                            {teamName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-600 text-white tracking-wider border border-blue-400/30">
                          {matchCompeticion}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider shadow ${currentBg.accentBadge}`}>
                          {isLocal ? 'EN CASA' : 'FUERA'}
                        </span>
                      </div>
                    </div>

                    {/* Powerful Headline */}
                    <div className="mt-3 text-center">
                      <span className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] drop-shadow ${currentBg.subText}`}>
                        {subHeadline}
                      </span>
                      <h1 
                        className={`text-4xl sm:text-5xl font-black uppercase tracking-tight leading-none mt-0.5 drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)] ${currentBg.primaryText}`}
                        style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}
                      >
                        {mainHeadline}
                      </h1>
                    </div>
                  </div>

                  {/* Center Action & Clash Section */}
                  <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 my-1">
                    
                    {/* The Match Face-Off: Shields & Names */}
                    <div className="w-full max-w-sm bg-gradient-to-r from-slate-950/85 via-blue-950/90 to-slate-950/85 border border-blue-500/40 rounded-2xl p-3 shadow-2xl backdrop-blur-md">
                      <div className="flex items-center justify-around">
                        
                        {/* Club 1: U.D. La Poveda */}
                        <div className="flex flex-col items-center text-center max-w-[120px]">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white p-1 shadow-lg shadow-blue-500/30 border-2 border-blue-600 flex items-center justify-center">
                            <UDLaPovedaLogo className="w-full h-full" />
                          </div>
                          <span className="mt-1.5 text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-tight">
                            U.D. LA POVEDA
                          </span>
                          <span className="text-[9px] font-extrabold text-blue-300 uppercase">
                            {isLocal ? 'LOCAL' : 'VISITANTE'}
                          </span>
                        </div>

                        {/* VS Emblem */}
                        <div className="flex flex-col items-center px-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg shadow-amber-500/40 border border-white">
                            VS
                          </div>
                          <span className="text-[9px] font-black text-amber-300 mt-1 uppercase tracking-widest">
                            DUELO
                          </span>
                        </div>

                        {/* Club 2: Rival */}
                        <div className="flex flex-col items-center text-center max-w-[120px]">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-900 border-2 border-slate-700 shadow-lg flex items-center justify-center text-amber-400">
                            <Shield className="w-8 h-8 fill-current text-amber-400/80" />
                          </div>
                          <span className="mt-1.5 text-xs sm:text-sm font-black text-amber-300 uppercase tracking-tight leading-tight truncate max-w-[110px]">
                            {rivalName}
                          </span>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase">
                            {isLocal ? 'VISITANTE' : 'LOCAL'}
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Central Athletic Action Player Visual with Selected Frame Design */}
                    {renderPlayerFigure()}

                    {/* Big Date, Time & Stadium Info Card */}
                    <div className="w-full max-w-sm mt-auto space-y-1.5 text-center">
                      
                      {/* Big Kickoff Time Block */}
                      <div className={`rounded-xl p-2 sm:p-2.5 shadow-xl border text-white flex items-center justify-between px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 ${currentBg.accentBorder}`}>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-5 h-5 text-amber-300 shrink-0" />
                          <div className="text-left">
                            <span className="block text-[9px] uppercase font-bold text-blue-200 leading-none">FECHA OFICIAL</span>
                            <span className="text-xs sm:text-sm font-black uppercase tracking-tight text-white leading-tight">
                              {formattedDate.bannerDate}
                            </span>
                          </div>
                        </div>

                        <div className="h-7 w-px bg-white/30" />

                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <span className="block text-[9px] uppercase font-bold text-amber-300 leading-none">HORA DE PARTIDO</span>
                            <span className="text-base sm:text-lg font-black text-amber-300 leading-none">
                              {matchHora} H
                            </span>
                          </div>
                          <Clock className="w-5 h-5 text-amber-300 shrink-0" />
                        </div>
                      </div>

                      {/* Location info */}
                      <div className="bg-slate-950/85 border border-slate-850 rounded-xl py-1.5 px-3 flex items-center justify-center gap-1.5 text-slate-200 text-xs shadow">
                        <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span className="truncate font-bold text-[11px] sm:text-xs">{matchLugar}</span>
                      </div>

                      {/* Grandstand callout stamp */}
                      <div className={`font-black text-[10px] sm:text-[11px] py-1 px-3 rounded-lg uppercase tracking-wide shadow-md ${currentBg.accentBadge}`}>
                        {grandstandCallout}
                      </div>
                    </div>

                  </div>

                  {/* Bottom Corporate Footer Bar */}
                  <div className="relative z-10 bg-[#061b40] border-t border-blue-900/80 px-4 py-2 flex items-center justify-between text-white text-[10px]">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white p-0.5">
                        <UDLaPovedaLogo className="w-full h-full" />
                      </div>
                      <span className="font-extrabold uppercase tracking-wide text-slate-200 truncate">
                        U.D. LA POVEDA • MÁS QUE UN CLUB, UNA FAMILIA.
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-300 font-bold hidden sm:flex shrink-0">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-amber-400" />
                        609 037 165
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* ========================================================================= */}
              {/* THEME 2: POVEDA BRUSH (Artistic Club Poster with Values)                  */}
              {/* ========================================================================= */}
              {posterTheme === 'poveda_brush' && (
                <div className={`relative w-full h-full flex flex-col justify-between overflow-hidden ${currentBg.brushBg}`}>
                  
                  {/* Dynamic Paint Splatters & Background Texture */}
                  <div className="absolute inset-0 pointer-events-none opacity-90">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="poveda-brush-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0047b3" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#061b40" stopOpacity="0.3" />
                        </linearGradient>
                      </defs>
                      <path d="M -50,150 Q 80,60 220,120 T 480,40 L 520,320 Q 300,280 180,380 Z" fill="url(#poveda-brush-grad)" />
                      <circle cx="90%" cy="15%" r="140" fill="#0047b3" fillOpacity="0.08" />
                      <circle cx="10%" cy="80%" r="160" fill="#00358e" fillOpacity="0.06" />
                    </svg>
                  </div>

                  {/* Watermark Crest in Center Background */}
                  <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/4 w-80 h-80 opacity-10 pointer-events-none">
                    <UDLaPovedaLogo className="w-full h-full" />
                  </div>

                  {/* Top Area: Brush Title & Date */}
                  <div className="relative z-10 p-4 sm:p-5 pb-0">
                    
                    {/* Club Header & Subtitle */}
                    <div className="flex items-center justify-between border-b border-blue-900/20 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white p-0.5 shadow border border-blue-900 flex items-center justify-center">
                          <UDLaPovedaLogo className="w-full h-full" />
                        </div>
                        <div>
                          <span className="block text-blue-950 font-black text-xs uppercase tracking-wider leading-none">
                            U.D. LA POVEDA
                          </span>
                          <span className="block text-blue-700 font-bold text-[9px] uppercase tracking-widest leading-none mt-0.5">
                            {teamName}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-900 text-white tracking-wider">
                        {matchCompeticion}
                      </span>
                    </div>

                    {/* Grand Headline with dynamic angle */}
                    <div className="mt-3 transform -rotate-1 text-center">
                      <span className="text-[11px] font-black text-blue-800 tracking-[0.2em] uppercase block">
                        {subHeadline}
                      </span>
                      <h1 
                        className="text-4xl sm:text-5xl font-black uppercase text-blue-950 tracking-tight leading-none drop-shadow-sm"
                        style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}
                      >
                        {mainHeadline}
                      </h1>
                      {/* Brush Underline stroke */}
                      <div className="w-48 h-1.5 bg-gradient-to-r from-blue-700 via-blue-600 to-amber-400 mx-auto rounded-full mt-1" />
                    </div>

                    {/* Date and Time pill */}
                    <div className="mt-2 text-center">
                      <span className="inline-block bg-blue-950 text-amber-300 font-black text-xs sm:text-sm px-4 py-1 rounded-full uppercase tracking-wider shadow">
                        {formattedDate.bannerDate} • {matchHora} H
                      </span>
                    </div>

                  </div>

                  {/* Center Match Banner & Player Action */}
                  <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 my-2">
                    
                    {/* The Angled Painted Match Banner */}
                    <div className="w-full max-w-sm transform -rotate-1 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white p-3 rounded-2xl shadow-xl border-2 border-amber-400 text-center">
                      <div className="text-[9px] font-bold text-amber-300 uppercase tracking-widest mb-0.5">
                        {isLocal ? 'PARTIDO EN NUESTRO FEUDO' : 'PARTIDO A DOMICILIO'}
                      </div>
                      <div className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center justify-center gap-2">
                        <span>U.D. LA POVEDA</span>
                        <span className="text-amber-400 font-black text-sm">VS</span>
                        <span className="text-yellow-200">{rivalName}</span>
                      </div>
                      <div className="text-[10px] text-blue-100 font-semibold mt-1 flex items-center justify-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-300" />
                        <span className="truncate max-w-[280px]">{matchLugar}</span>
                      </div>
                    </div>

                    {/* Central Visual with Selected Frame Design */}
                    {renderPlayerFigure()}

                    {/* The 4 Iconic Club Value Badges */}
                    <div className="grid grid-cols-4 gap-2 w-full max-w-xs my-1">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-9 h-9 rounded-full bg-blue-900 text-white flex items-center justify-center shadow font-black text-xs">
                          <Target className="w-4 h-4 text-amber-300" />
                        </div>
                        <span className="text-[8px] font-black text-blue-950 uppercase mt-1">Ambición</span>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <div className="w-9 h-9 rounded-full bg-blue-900 text-white flex items-center justify-center shadow font-black text-xs">
                          <Users className="w-4 h-4 text-amber-300" />
                        </div>
                        <span className="text-[8px] font-black text-blue-950 uppercase mt-1">Equipo</span>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <div className="w-9 h-9 rounded-full bg-blue-900 text-white flex items-center justify-center shadow font-black text-xs">
                          <TrendingUp className="w-4 h-4 text-amber-300" />
                        </div>
                        <span className="text-[8px] font-black text-blue-950 uppercase mt-1">Compromiso</span>
                      </div>

                      <div className="flex flex-col items-center text-center">
                        <div className="w-9 h-9 rounded-full bg-blue-900 text-white flex items-center justify-center shadow font-black text-xs">
                          <Trophy className="w-4 h-4 text-amber-300" />
                        </div>
                        <span className="text-[8px] font-black text-blue-950 uppercase mt-1">Orgullo</span>
                      </div>
                    </div>

                    {/* Handwritten Script & Grandstand Callout */}
                    <div className="w-full max-w-sm mt-1 text-center space-y-1">
                      <p className="text-[10px] sm:text-[11px] font-extrabold italic text-blue-900 tracking-wide">
                        {mottoScript}
                      </p>

                      <div className="bg-blue-900 text-white font-black text-[10px] sm:text-[11px] py-1.5 px-3 rounded-xl uppercase tracking-wide shadow-md border border-amber-400/40">
                        {grandstandCallout}
                      </div>
                    </div>

                  </div>

                  {/* Navy Blue Corporate Footer */}
                  <div className="relative z-10 bg-[#061b40] text-white px-4 py-2 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white p-0.5">
                        <UDLaPovedaLogo className="w-full h-full" />
                      </div>
                      <span className="font-extrabold uppercase tracking-wide text-slate-200 truncate">
                        U.D. LA POVEDA • MÁS QUE UN CLUB, UNA FAMILIA.
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-300 font-bold hidden sm:flex shrink-0">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-amber-400" />
                        609 037 165
                      </span>
                    </div>
                  </div>

                </div>
              )}

              {/* ========================================================================= */}
              {/* THEME 3: EDITORIAL FEDERATION (Modern Split Sports Poster)                */}
              {/* ========================================================================= */}
              {posterTheme === 'editorial_press' && (
                <div className="relative w-full h-full bg-[#071329] text-white flex flex-col justify-between overflow-hidden">
                  
                  {/* Diagonal Geometric Split matching chosen color palette */}
                  <div 
                    className={`absolute inset-0 bg-gradient-to-br ${currentBg.editorialSplit} pointer-events-none`}
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 65%, 0 85%)' }}
                  />

                  {/* Header */}
                  <div className="relative z-10 p-4 sm:p-5 pb-0 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-white p-1 shadow-xl border border-blue-950 flex items-center justify-center">
                        <UDLaPovedaLogo className="w-full h-full" />
                      </div>
                      <div>
                        <span className="text-white font-black text-sm uppercase tracking-wider block leading-none">
                          U.D. LA POVEDA
                        </span>
                        <span className="text-amber-300 text-[10px] font-bold uppercase tracking-widest block mt-0.5">
                          {teamName} • {matchCompeticion}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-xl text-center">
                      <span className="text-[10px] font-black uppercase text-amber-300 block">JORNADA</span>
                      <span className="text-xs font-black uppercase text-white block leading-none">OFICIAL</span>
                    </div>
                  </div>

                  {/* Title & Clash */}
                  <div className="relative z-10 px-4 text-center my-auto">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-cyan-300 block">
                      {subHeadline}
                    </span>
                    <h1 
                      className="text-4xl sm:text-5xl font-black uppercase text-white tracking-tight leading-none my-1 drop-shadow-md"
                      style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}
                    >
                      {mainHeadline}
                    </h1>

                    {/* Big Clash Box */}
                    <div className="my-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:p-3.5 shadow-2xl flex items-center justify-around">
                      <div className="text-center">
                        <span className="block text-base sm:text-lg font-black text-white uppercase">U.D. LA POVEDA</span>
                        <span className="text-[9px] font-bold text-cyan-300 uppercase">{isLocal ? 'LOCAL' : 'VISITANTE'}</span>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center shadow">
                        VS
                      </div>
                      <div className="text-center">
                        <span className="block text-base sm:text-lg font-black text-amber-300 uppercase truncate max-w-[130px]">{rivalName}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{isLocal ? 'VISITANTE' : 'LOCAL'}</span>
                      </div>
                    </div>

                    {/* Player Figure in Editorial View */}
                    <div className="my-1 flex items-center justify-center">
                      {renderPlayerFigure()}
                    </div>

                    {/* Kickoff Clock & Venue in High Contrast Box */}
                    <div className="bg-white text-slate-950 rounded-2xl p-2.5 shadow-xl space-y-1 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <div className="text-left">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase">FECHA</span>
                          <span className="text-xs sm:text-sm font-black text-slate-900 uppercase">{formattedDate.bannerDate}</span>
                        </div>
                        <div className="h-6 w-px bg-slate-300" />
                        <div className="text-left">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase">HORA</span>
                          <span className="text-base sm:text-lg font-black text-blue-700 leading-none">{matchHora} H</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-1 text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        <span className="truncate">{matchLugar}</span>
                      </div>
                    </div>

                    {/* Slogan */}
                    <div className="mt-1.5 text-center text-xs font-black uppercase text-amber-400 tracking-wide">
                      {grandstandCallout}
                    </div>
                  </div>

                  {/* Corporate Footer */}
                  <div className="relative z-10 bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[10px] text-slate-300">
                    <span className="font-extrabold text-white uppercase truncate">
                      U.D. LA POVEDA • MÁS QUE UN CLUB, UNA FAMILIA.
                    </span>
                    <span className="font-bold text-slate-400 shrink-0">
                      Arganda del Rey, Madrid
                    </span>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
