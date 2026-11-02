export type Franja15Min = '0-15' | '16-30' | '31-35' | '36-50' | '51-65' | '66-70';

export interface RivalTeam {
  id: string;
  name: string;
  shortName: string;
  crestUrl: string;
  isMyTeam?: boolean;
}

export interface CollectiveGoalEvent {
  id: string;
  matchId: string;
  teamId: string;
  minuto: number;
  franja: Franja15Min;
  esFavor: boolean; // true = gol marcado por el equipo; false = gol encajado
}

export interface CollectiveCardEvent {
  id: string;
  matchId: string;
  teamId: string;
  minuto: number;
  tipo: 'Amarilla' | 'Roja_Directa' | 'Doble_Amarilla';
}

export interface RivalMatchCollective {
  id: string;
  jornada: number;
  fecha: string;
  hora: string;
  campo: string;
  localTeamId: string;
  visitanteTeamId: string;
  golesLocal?: number;
  golesVisitante?: number;
  jugado: boolean;
  actaCerrada: boolean;
  goalEvents: CollectiveGoalEvent[];
  cardEvents: CollectiveCardEvent[];
}

export interface IntervalStats {
  franja: Franja15Min;
  label: string;
  periodo: '1ª Parte' | '2ª Parte';
  golesFavor: number;
  golesContra: number;
  porcentajeFavor: number;
  porcentajeContra: number;
}

export interface TeamDisciplineStats {
  amarillas: number;
  rojasDirectas: number;
  doblesAmarillas: number;
  totalTarjetas: number;
  promedioPorPartido: number;
  puntosFairPlay: number; // 1 pt por amarilla, 3 pts por doble amarilla, 5 pts por roja directa
}

export interface GoalTimingRecord {
  minuto: number;
  jornada?: number;
  rivalShortName?: string;
}

export interface GoalTimingStats {
  masRapidoMarcado: GoalTimingRecord | null;
  masTardioMarcado: GoalTimingRecord | null;
  masRapidoEncajado: GoalTimingRecord | null;
  masTardioEncajado: GoalTimingRecord | null;
}

export interface TeamCollectiveStats {
  team: RivalTeam;
  pos: number;
  puntos: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  promedioGf: number;
  promedioGc: number;
  
  // Local vs Visitante
  home: {
    pj: number;
    pg: number;
    pe: number;
    pp: number;
    gf: number;
    gc: number;
    puntos: number;
  };
  away: {
    pj: number;
    pg: number;
    pe: number;
    pp: number;
    gf: number;
    gc: number;
    puntos: number;
  };

  // Franjas 15 min
  intervals: IntervalStats[];
  franjaMayorProduccion: Franja15Min;
  franjaMayorVulnerabilidad: Franja15Min;

  // Disciplina
  discipline: TeamDisciplineStats;

  // Evolución por jornadas (puntos acumulados por jornada)
  evolucionPuntos: { jornada: number; puntos: number; posicion: number }[];
  evolucionTarjetas: { jornada: number; tarjetas: number }[];
  
  // Porterías a cero y partidos marcando
  porteriasCero: number;
  partidosSinMarcar: number;

  // Cronometría arbitral de goles (más rápido / tardío)
  goalTiming: GoalTimingStats;
}
