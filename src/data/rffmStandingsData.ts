export interface StandingTeam {
  pos: number;
  name: string;
  shortName: string;
  pts: number;
  pj: number;
  pg: number;
  pe: number;
  pp: number;
  gf: number;
  gc: number;
  dg: number;
  form: ('V' | 'E' | 'D')[];
  isMyTeam?: boolean;
}

export interface JornadaMatch {
  id: string;
  jornada: number;
  local: string;
  visitante: string;
  golesLocal?: number;
  golesVisitante?: number;
  jugado: boolean;
  fecha: string;
  hora: string;
  campo: string;
}

export interface GroupCompetitionInfo {
  categoria: string;
  grupo: string;
  federacion: string;
  webOficial: string;
  temporada: string;
  jornadaActual: number;
  totalJornadas: number;
  puestosAscenso: number;
  fechaInicio: string;
}

export const RFFM_INFANTIL_G50_INFO: GroupCompetitionInfo = {
  categoria: "2ª Infantil",
  grupo: "Grupo 50",
  federacion: "Real Federación de Fútbol de Madrid (RFFM)",
  webOficial: "https://www.rffm.es",
  temporada: "Temporada 2026/2027",
  jornadaActual: 5,
  totalJornadas: 26,
  puestosAscenso: 2,
  fechaInicio: "2026-10-10"
};

// All 14 clubs registered in RFFM 2ª Infantil Grupo 50
export const ALL_RFFM_G50_TEAMS = [
  { name: "C.D. Asoc. Retiro Sur 'C'", shortName: "Retiro Sur 'C'", isMyTeam: false },
  { name: "C.D. Unión Elipa 'A'", shortName: "Unión Elipa 'A'", isMyTeam: false },
  { name: "Club Sección Deportiva Del Pozo 'B'", shortName: "S.D. Del Pozo 'B'", isMyTeam: false },
  { name: "A.D. Escuela de Fútbol de Carabanchel 'C'", shortName: "E.F. Carabanchel 'C'", isMyTeam: false },
  { name: "S.A.D. Fundación Escuela de Fútbol AFE 'B'", shortName: "Fundación AFE 'B'", isMyTeam: true },
  { name: "C.P. Santa María del Pilar 'C'", shortName: "Santa Mª Pilar 'C'", isMyTeam: false },
  { name: "Club de Atletismo Los Olmos 'A'", shortName: "Los Olmos 'A'", isMyTeam: false },
  { name: "S.A.D. Stella Maris La Gavia 'B'", shortName: "Stella Maris 'B'", isMyTeam: false },
  { name: "Esc. F. Juventud Madrid 'B'", shortName: "Juventud Madrid 'B'", isMyTeam: false },
  { name: "Vallecas C.F. 'D'", shortName: "Vallecas 'D'", isMyTeam: false },
  { name: "A.D. Madrid Sur 'A'", shortName: "Madrid Sur 'A'", isMyTeam: false },
  { name: "C.D.E. Innova Moratalaz 'D'", shortName: "Innova Moratalaz 'D'", isMyTeam: false },
  { name: "C.D. Ciudad de Madrid 2018 'A'", shortName: "Ciudad Madrid 'A'", isMyTeam: false },
  { name: "C.D.E. de Fútbol Inter Victoria 'A'", shortName: "Inter Victoria 'A'", isMyTeam: false }
];

/**
 * Official match results and pairings of RFFM 2ª Infantil Grupo 50
 * Disputadas: Jornadas 1, 2, 3, 4 (4 partidos jugados)
 * En curso / Programada: Jornada 5 (07/11/2026 - 08/11/2026)
 */
export const OFFICIAL_RFFM_G50_MATCHES: JornadaMatch[] = [
  // --- JORNADA 1 (10/10/2026) ---
  {
    id: 'j1-1',
    jornada: 1,
    local: "C.P. Santa María del Pilar 'C'",
    visitante: "S.A.D. Fundación Escuela de Fútbol AFE 'B'",
    golesLocal: 1,
    golesVisitante: 2,
    jugado: true,
    fecha: "2026-10-10",
    hora: "10:00",
    campo: "Colegio Santa María del Pilar"
  },
  {
    id: 'j1-2',
    jornada: 1,
    local: "C.D. Unión Elipa 'A'",
    visitante: "S.A.D. Stella Maris La Gavia 'B'",
    golesLocal: 7,
    golesVisitante: 1,
    jugado: true,
    fecha: "2026-10-10",
    hora: "09:00",
    campo: "Instalación Deportiva La Elipa"
  },
  {
    id: 'j1-3',
    jornada: 1,
    local: "Vallecas C.F. 'D'",
    visitante: "A.D. Madrid Sur 'A'",
    golesLocal: 2,
    golesVisitante: 2,
    jugado: true,
    fecha: "2026-10-10",
    hora: "11:15",
    campo: "Campo Municipal de Vallecas"
  },
  {
    id: 'j1-4',
    jornada: 1,
    local: "A.D. Escuela de Fútbol de Carabanchel 'C'",
    visitante: "C.D. Ciudad de Madrid 2018 'A'",
    golesLocal: 13,
    golesVisitante: 0,
    jugado: true,
    fecha: "2026-10-10",
    hora: "12:30",
    campo: "Polideportivo La Mina (Carabanchel)"
  },
  {
    id: 'j1-5',
    jornada: 1,
    local: "Club Sección Deportiva Del Pozo 'B'",
    visitante: "C.D.E. Innova Moratalaz 'D'",
    golesLocal: 6,
    golesVisitante: 0,
    jugado: true,
    fecha: "2026-10-10",
    hora: "13:00",
    campo: "Campo Del Pozo - Entrevías"
  },
  {
    id: 'j1-6',
    jornada: 1,
    local: "Esc. F. Juventud Madrid 'B'",
    visitante: "C.D.E. de Fútbol Inter Victoria 'A'",
    golesLocal: 2,
    golesVisitante: 1,
    jugado: true,
    fecha: "2026-10-10",
    hora: "10:30",
    campo: "Campo San Cristóbal de los Ángeles"
  },
  {
    id: 'j1-7',
    jornada: 1,
    local: "Club de Atletismo Los Olmos 'A'",
    visitante: "C.D. Asoc. Retiro Sur 'C'",
    golesLocal: 0,
    golesVisitante: 2,
    jugado: true,
    fecha: "2026-10-10",
    hora: "12:00",
    campo: "Campo Los Olmos"
  },

  // --- JORNADA 2 (17/10/2026) ---
  {
    id: 'j2-1',
    jornada: 2,
    local: "S.A.D. Fundación Escuela de Fútbol AFE 'B'",
    visitante: "A.D. Escuela de Fútbol de Carabanchel 'C'",
    golesLocal: 0,
    golesVisitante: 0,
    jugado: true,
    fecha: "2026-10-17",
    hora: "10:15",
    campo: "Polideportivo La Elipa - Campo 2"
  },
  {
    id: 'j2-2',
    jornada: 2,
    local: "C.D. Asoc. Retiro Sur 'C'",
    visitante: "C.D. Ciudad de Madrid 2018 'A'",
    golesLocal: 16,
    golesVisitante: 0,
    jugado: true,
    fecha: "2026-10-17",
    hora: "11:30",
    campo: "Campo Municipal Retiro"
  },
  {
    id: 'j2-3',
    jornada: 2,
    local: "C.D. Unión Elipa 'A'",
    visitante: "C.D.E. Innova Moratalaz 'D'",
    golesLocal: 10,
    golesVisitante: 0,
    jugado: true,
    fecha: "2026-10-17",
    hora: "09:00",
    campo: "Instalación Deportiva La Elipa"
  },
  {
    id: 'j2-4',
    jornada: 2,
    local: "Club Sección Deportiva Del Pozo 'B'",
    visitante: "A.D. Madrid Sur 'A'",
    golesLocal: 7,
    golesVisitante: 1,
    jugado: true,
    fecha: "2026-10-17",
    hora: "13:00",
    campo: "Campo Del Pozo - Entrevías"
  },
  {
    id: 'j2-5',
    jornada: 2,
    local: "C.P. Santa María del Pilar 'C'",
    visitante: "Club de Atletismo Los Olmos 'A'",
    golesLocal: 3,
    golesVisitante: 1,
    jugado: true,
    fecha: "2026-10-17",
    hora: "10:00",
    campo: "Colegio Santa María del Pilar"
  },
  {
    id: 'j2-6',
    jornada: 2,
    local: "S.A.D. Stella Maris La Gavia 'B'",
    visitante: "Esc. F. Juventud Madrid 'B'",
    golesLocal: 1,
    golesVisitante: 0,
    jugado: true,
    fecha: "2026-10-17",
    hora: "12:00",
    campo: "Campo La Gavia"
  },
  {
    id: 'j2-7',
    jornada: 2,
    local: "C.D.E. de Fútbol Inter Victoria 'A'",
    visitante: "Vallecas C.F. 'D'",
    golesLocal: 0,
    golesVisitante: 1,
    jugado: true,
    fecha: "2026-10-17",
    hora: "11:00",
    campo: "Palomeras Bajas (HA)"
  },

  // --- JORNADA 3 (24/10/2026) ---
  {
    id: 'j3-1',
    jornada: 3,
    local: "Esc. F. Juventud Madrid 'B'",
    visitante: "S.A.D. Fundación Escuela de Fútbol AFE 'B'",
    golesLocal: 0,
    golesVisitante: 3,
    jugado: true,
    fecha: "2026-10-24",
    hora: "10:30",
    campo: "Campo San Cristóbal de los Ángeles"
  },
  {
    id: 'j3-2',
    jornada: 3,
    local: "Vallecas C.F. 'D'",
    visitante: "C.D. Asoc. Retiro Sur 'C'",
    golesLocal: 0,
    golesVisitante: 3,
    jugado: true,
    fecha: "2026-10-24",
    hora: "11:00",
    campo: "Campo Municipal de Vallecas"
  },
  {
    id: 'j3-3',
    jornada: 3,
    local: "A.D. Madrid Sur 'A'",
    visitante: "C.D. Unión Elipa 'A'",
    golesLocal: 1,
    golesVisitante: 10,
    jugado: true,
    fecha: "2026-10-24",
    hora: "12:15",
    campo: "Polideportivo Palomeras"
  },
  {
    id: 'j3-4',
    jornada: 3,
    local: "A.D. Escuela de Fútbol de Carabanchel 'C'",
    visitante: "Club Sección Deportiva Del Pozo 'B'",
    golesLocal: 2,
    golesVisitante: 2,
    jugado: true,
    fecha: "2026-10-24",
    hora: "12:30",
    campo: "Polideportivo La Mina (Carabanchel)"
  },
  {
    id: 'j3-5',
    jornada: 3,
    local: "C.D. Ciudad de Madrid 2018 'A'",
    visitante: "C.P. Santa María del Pilar 'C'",
    golesLocal: 1,
    golesVisitante: 4,
    jugado: true,
    fecha: "2026-10-24",
    hora: "13:00",
    campo: "Campo Puente de Vallecas"
  },
  {
    id: 'j3-6',
    jornada: 3,
    local: "C.D.E. Innova Moratalaz 'D'",
    visitante: "S.A.D. Stella Maris La Gavia 'B'",
    golesLocal: 1,
    golesVisitante: 3,
    jugado: true,
    fecha: "2026-10-24",
    hora: "09:30",
    campo: "Polideportivo Moratalaz"
  },
  {
    id: 'j3-7',
    jornada: 3,
    local: "Club de Atletismo Los Olmos 'A'",
    visitante: "C.D.E. de Fútbol Inter Victoria 'A'",
    golesLocal: 2,
    golesVisitante: 1,
    jugado: true,
    fecha: "2026-10-24",
    hora: "11:45",
    campo: "Campo Los Olmos"
  },

  // --- JORNADA 4 (31/10/2026) ---
  {
    id: 'j4-1',
    jornada: 4,
    local: "S.A.D. Fundación Escuela de Fútbol AFE 'B'",
    visitante: "Vallecas C.F. 'D'",
    golesLocal: 2,
    golesVisitante: 0,
    jugado: true,
    fecha: "2026-10-31",
    hora: "10:15",
    campo: "Polideportivo La Elipa - Campo 2"
  },
  {
    id: 'j4-2',
    jornada: 4,
    local: "C.D.E. de Fútbol Inter Victoria 'A'",
    visitante: "C.D. Asoc. Retiro Sur 'C'",
    golesLocal: 0,
    golesVisitante: 7,
    jugado: true,
    fecha: "2026-10-31",
    hora: "09:30",
    campo: "Palomeras Bajas (HA)"
  },
  {
    id: 'j4-3',
    jornada: 4,
    local: "C.D.E. Innova Moratalaz 'D'",
    visitante: "A.D. Escuela de Fútbol de Carabanchel 'C'",
    golesLocal: 0,
    golesVisitante: 4,
    jugado: true,
    fecha: "2026-10-31",
    hora: "11:00",
    campo: "Polideportivo Moratalaz"
  },
  {
    id: 'j4-4',
    jornada: 4,
    local: "Club de Atletismo Los Olmos 'A'",
    visitante: "C.D. Unión Elipa 'A'",
    golesLocal: 1,
    golesVisitante: 4,
    jugado: true,
    fecha: "2026-10-31",
    hora: "12:15",
    campo: "Campo Los Olmos"
  },
  {
    id: 'j4-5',
    jornada: 4,
    local: "Esc. F. Juventud Madrid 'B'",
    visitante: "C.P. Santa María del Pilar 'C'",
    golesLocal: 2,
    golesVisitante: 2,
    jugado: true,
    fecha: "2026-10-31",
    hora: "10:30",
    campo: "Campo San Cristóbal de los Ángeles"
  },
  {
    id: 'j4-6',
    jornada: 4,
    local: "A.D. Madrid Sur 'A'",
    visitante: "Club Sección Deportiva Del Pozo 'B'",
    golesLocal: 0,
    golesVisitante: 5,
    jugado: true,
    fecha: "2026-10-31",
    hora: "13:00",
    campo: "Polideportivo Palomeras"
  },
  {
    id: 'j4-7',
    jornada: 4,
    local: "S.A.D. Stella Maris La Gavia 'B'",
    visitante: "C.D. Ciudad de Madrid 2018 'A'",
    golesLocal: 3,
    golesVisitante: 0,
    jugado: true,
    fecha: "2026-11-01",
    hora: "11:00",
    campo: "Campo La Gavia"
  },

  // --- JORNADA 5 (07/11/2026 - EN CURSO / ACTUAL) ---
  {
    id: 'j5-1',
    jornada: 5,
    local: "S.A.D. Fundación Escuela de Fútbol AFE 'B'",
    visitante: "Club Sección Deportiva Del Pozo 'B'",
    jugado: false,
    fecha: "2026-11-07",
    hora: "10:15",
    campo: "Polideportivo La Elipa - Campo 2"
  },
  {
    id: 'j5-2',
    jornada: 5,
    local: "C.D. Asoc. Retiro Sur 'C'",
    visitante: "C.P. Santa María del Pilar 'C'",
    jugado: false,
    fecha: "2026-11-07",
    hora: "11:30",
    campo: "Campo Municipal Retiro"
  },
  {
    id: 'j5-3',
    jornada: 5,
    local: "C.D. Unión Elipa 'A'",
    visitante: "Club de Atletismo Los Olmos 'A'",
    jugado: false,
    fecha: "2026-11-07",
    hora: "09:00",
    campo: "Instalación Deportiva La Elipa"
  },
  {
    id: 'j5-4',
    jornada: 5,
    local: "A.D. Escuela de Fútbol de Carabanchel 'C'",
    visitante: "S.A.D. Stella Maris La Gavia 'B'",
    jugado: false,
    fecha: "2026-11-07",
    hora: "12:45",
    campo: "Polideportivo La Mina (Carabanchel)"
  },
  {
    id: 'j5-5',
    jornada: 5,
    local: "Esc. F. Juventud Madrid 'B'",
    visitante: "Vallecas C.F. 'D'",
    jugado: false,
    fecha: "2026-11-07",
    hora: "10:00",
    campo: "Campo San Cristóbal de los Ángeles"
  },
  {
    id: 'j5-6',
    jornada: 5,
    local: "A.D. Madrid Sur 'A'",
    visitante: "C.D.E. Innova Moratalaz 'D'",
    jugado: false,
    fecha: "2026-11-08",
    hora: "11:00",
    campo: "Polideportivo Palomeras"
  },
  {
    id: 'j5-7',
    jornada: 5,
    local: "C.D. Ciudad de Madrid 2018 'A'",
    visitante: "C.D.E. de Fútbol Inter Victoria 'A'",
    jugado: false,
    fecha: "2026-11-08",
    hora: "13:00",
    campo: "Campo Puente de Vallecas"
  }
];

/**
 * Calculates current active matchweek based on real/system date.
 * Season began Oct 10, 2026.
 */
export function getCurrentWeekJornada(targetDate: Date = new Date()): number {
  const startDate = new Date('2026-10-10T00:00:00');
  const now = targetDate.getTime();
  const diffMs = now - startDate.getTime();
  
  if (diffMs <= 0) return 1;
  
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const weeksElapsed = Math.floor(diffMs / oneWeekMs) + 1;
  
  return Math.min(Math.max(weeksElapsed, 1), 26);
}

/**
 * Mathematically and dynamically computes the complete standings table for all 14 teams
 * up to a specific jornada, directly from the match results.
 */
export function computeStandingsFromMatches(matches: JornadaMatch[], upToJornada: number): StandingTeam[] {
  // Initialize accumulator for each of the 14 teams
  const statsMap: Record<string, {
    name: string;
    shortName: string;
    isMyTeam: boolean;
    pts: number;
    pj: number;
    pg: number;
    pe: number;
    pp: number;
    gf: number;
    gc: number;
    form: ('V' | 'E' | 'D')[];
  }> = {};

  ALL_RFFM_G50_TEAMS.forEach(team => {
    statsMap[team.name] = {
      name: team.name,
      shortName: team.shortName,
      isMyTeam: !!team.isMyTeam,
      pts: 0,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      form: []
    };
  });

  // Filter matches up to the selected Jornada that were actually played
  const playedMatches = matches
    .filter(m => m.jornada <= upToJornada && m.jugado && m.golesLocal !== undefined && m.golesVisitante !== undefined)
    .sort((a, b) => a.jornada - b.jornada);

  playedMatches.forEach(match => {
    const localStats = statsMap[match.local];
    const visitStats = statsMap[match.visitante];

    const gl = match.golesLocal ?? 0;
    const gv = match.golesVisitante ?? 0;

    if (localStats) {
      localStats.pj += 1;
      localStats.gf += gl;
      localStats.gc += gv;

      if (gl > gv) {
        localStats.pts += 3;
        localStats.pg += 1;
        localStats.form.push('V');
      } else if (gl === gv) {
        localStats.pts += 1;
        localStats.pe += 1;
        localStats.form.push('E');
      } else {
        localStats.pp += 1;
        localStats.form.push('D');
      }
    }

    if (visitStats) {
      visitStats.pj += 1;
      visitStats.gf += gv;
      visitStats.gc += gl;

      if (gv > gl) {
        visitStats.pts += 3;
        visitStats.pg += 1;
        visitStats.form.push('V');
      } else if (gv === gl) {
        visitStats.pts += 1;
        visitStats.pe += 1;
        visitStats.form.push('E');
      } else {
        visitStats.pp += 1;
        visitStats.form.push('D');
      }
    }
  });

  // Convert to array
  const standingsList: StandingTeam[] = Object.values(statsMap).map(team => {
    const dg = team.gf - team.gc;
    // Keep last 5 results for form
    const recentForm = team.form.slice(-5);

    return {
      pos: 1,
      name: team.name,
      shortName: team.shortName,
      pts: team.pts,
      pj: team.pj,
      pg: team.pg,
      pe: team.pe,
      pp: team.pp,
      gf: team.gf,
      gc: team.gc,
      dg,
      form: recentForm.length > 0 ? recentForm : [],
      isMyTeam: team.isMyTeam
    };
  });

  // Sort by Points (descending), then Goal Difference (descending), then Goals For (descending)
  standingsList.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.name.localeCompare(b.name);
  });

  // Assign position numbers 1 to 14
  return standingsList.map((team, idx) => ({
    ...team,
    pos: idx + 1
  }));
}
