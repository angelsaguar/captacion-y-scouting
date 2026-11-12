import { RivalTeam } from './rivals';

export interface MatchActaRecord {
  id?: string;
  jornada: number;
  fecha: string;
  hora: string;
  campo: string;
  codigoCampo?: string;
  arbitro?: string;
  local: string;
  visitante: string;
  escudoLocal?: string;
  escudoVisitante?: string;
  golesLocal?: string;
  golesVisitante?: string;
  codacta: string;
  actaUrl: string; // https://www.rffm.es/competiciones/acta?codacta=...
  actaOficialUrl?: string; // https://appweb.rffm.es/pnfg/NPcd/NFG_CmpActa1?cod_primaria=1000122&CodActa=...
  estado?: string;
  disputado?: boolean;
}

export interface TeamCompetitionConfig {
  teamName: string; // e.g. 'INFANTIL B', 'CADETE A'
  categoryName: string; // e.g. 'Segunda Infantil - Grupo 50'
  temporada: string; // e.g. '2026-2027'
  temporadaId?: string; // e.g. '22'
  competicionId?: string; // e.g. '26738324'
  grupoId?: string; // e.g. '27306559'
  federationName: string; // e.g. 'RFFM (Real Federación de Fútbol de Madrid)'
  urlCalendario: string; // URL oficial del calendario (the single main input)
  urlClasificacion: string; // URL oficial de la clasificación y resultados
  urlActas?: string; // URL oficial de actas arbitrales
  rivals: RivalTeam[]; // Lista de rivales y nuestro equipo en este grupo
  matches?: MatchActaRecord[]; // Partidos y actas arbitrales extraídos del calendario
  jornadasDisputadas?: number[]; // Lista de jornadas disputadas en este grupo
  lastSync?: string; // Timestamp de la última sincronización
  notes?: string;
  updatedAt: string;
}

