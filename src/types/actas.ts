export interface ActaCardRecord {
  minuto: string;
  nombreJugador: string;
  dorsal?: string;
  tipo: 'amarilla' | 'roja' | 'doble_amarilla';
  equipo: 'local' | 'visitante';
}

export interface ActaGoalRecord {
  minuto: string;
  nombreJugador: string;
  dorsal?: string;
  tipo: string;
  equipo: 'local' | 'visitante';
}

export interface ActaPlayerLineupRecord {
  codjugador: string;
  nombreJugador: string;
  dorsal: string;
  titular: boolean;
  suplente: boolean;
  capitan: boolean;
  portero: boolean;
  minutos: number;
}

export interface DetailedActa {
  codacta: string;
  jornada: number;
  fecha: string;
  hora: string;
  campo: string;
  arbitro: string;
  local: string;
  visitante: string;
  golesLocal: number;
  golesVisitante: number;
  jugadoresLocal: ActaPlayerLineupRecord[];
  jugadoresVisitante: ActaPlayerLineupRecord[];
  tarjetas: ActaCardRecord[];
  goles: ActaGoalRecord[];
  actaUrl: string;
}

export interface PlayerActaSummary {
  nombreCompleto: string;
  nombreCorto: string;
  dorsal: string;
  convocatorias: number;
  titularidades: number;
  suplencias: number;
  minutos: number;
  goles: number;
  amarillas: number;
  rojas: number;
  estaSancionado: boolean;
  partidosSancion: number;
  motivoSancion: string;
  esApercibido: boolean;
  partidos: Array<{
    jornada: number;
    rival: string;
    fecha: string;
    titular: boolean;
    minutos: number;
    goles: number;
    amarillas: number;
    rojas: number;
    codacta: string;
  }>;
}

export interface RivalActaSummary {
  name: string;
  shortName: string;
  partidosJugados: number;
  amarillas: number;
  rojas: number;
  golesFavor: number;
  golesContra: number;
  jugadoresAmonestados: Array<{ nombre: string; jornada: number; minuto: string; esRoja: boolean }>;
  goleadores: Array<{ nombre: string; jornada: number; minuto: string }>;
}

export interface TeamActasDatabase {
  teamName: string;
  categoryName: string;
  temporada: string;
  updatedAt: string;
  playersSummary: Record<string, PlayerActaSummary>;
  rivalsSummary: Record<string, RivalActaSummary>;
  actas: DetailedActa[];
}
