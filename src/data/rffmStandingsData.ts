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
  form: ('V' | 'E' | 'D' | 'G' | 'P')[];
  escudoUrl?: string;
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
  escudoLocal?: string;
  escudoVisitante?: string;
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

// Exact RFFM URL configuration provided by user
export const RFFM_URL_CONFIG = {
  temporada: "22",
  competicion: "26738324",
  grupo: "27306559",
  tipojuego: "1",
  getResultadosUrl: (jornada: number) => 
    `https://www.rffm.es/competicion/resultados-y-jornadas?temporada=22&competicion=26738324&grupo=27306559&jornada=${jornada}&tipojuego=1`,
  getClasificacionUrl: (jornada: number) => 
    `https://www.rffm.es/competicion/clasificaciones?temporada=22&competicion=26738324&grupo=27306559&jornada=${jornada}&tipojuego=1`
};

export const RFFM_INFANTIL_G50_INFO: GroupCompetitionInfo = {
  categoria: "2ª Infantil",
  grupo: "Grupo 50",
  federacion: "Real Federación de Fútbol de Madrid (RFFM)",
  webOficial: RFFM_URL_CONFIG.getResultadosUrl(4),
  temporada: "Temporada 2026-2027",
  jornadaActual: 4,
  totalJornadas: 26,
  puestosAscenso: 2,
  fechaInicio: "2026-10-10"
};

/**
 * Exact official classification extracted directly from RFFM (Jornada 4)
 */
export const OFFICIAL_RFFM_JORNADA_4_STANDINGS: StandingTeam[] = [
  {
    pos: 1,
    name: "C.D. ASOC RETIRO SUR 'C'",
    shortName: "Retiro Sur 'C'",
    pts: 12,
    pj: 4,
    pg: 4,
    pe: 0,
    pp: 0,
    gf: 44,
    gc: 1,
    dg: 43,
    form: ['V', 'V', 'V', 'V'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0010963772_5146_asoc.retiro_sur.jpg?nova=1",
    isMyTeam: false
  },
  {
    pos: 2,
    name: "C.D. UNION ELIPA 'A'",
    shortName: "Unión Elipa 'A'",
    pts: 12,
    pj: 4,
    pg: 4,
    pe: 0,
    pp: 0,
    gf: 25,
    gc: 2,
    dg: 23,
    form: ['V', 'V', 'V', 'V'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011717616_LOGO__ByN.jpg?nova=1",
    isMyTeam: false
  },
  {
    pos: 3,
    name: "CLUB SECCION DEPORTIVA DEL POZO 'B'",
    shortName: "S.D. Del Pozo 'B'",
    pts: 12,
    pj: 4,
    pg: 4,
    pe: 0,
    pp: 0,
    gf: 20,
    gc: 3,
    dg: 17,
    form: ['V', 'V', 'V', 'V'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011685159_IMG_20190913_WA0008.jpg?nova=1",
    isMyTeam: false
  },
  {
    pos: 4,
    name: "A.D. ESCUELA DE FUTBOL DE CARABANCHEL 'C'",
    shortName: "E.F. Carabanchel 'C'",
    pts: 7,
    pj: 4,
    pg: 2,
    pe: 1,
    pp: 1,
    gf: 21,
    gc: 2,
    dg: 19,
    form: ['V', 'E', 'D', 'V'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011195225_WhatsApp_Image_2022_07_21_at_07.43.24.jpeg?nova=1",
    isMyTeam: false
  },
  {
    pos: 5,
    name: "C.P. SANTA MARIA DEL PILAR 'C'",
    shortName: "Santa Mª Pilar 'C'",
    pts: 7,
    pj: 4,
    pg: 2,
    pe: 1,
    pp: 1,
    gf: 9,
    gc: 4,
    dg: 5,
    form: ['D', 'V', 'V', 'E'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0000000668_3634-santa maria del pilar.jpg?nova=1",
    isMyTeam: false
  },
  {
    pos: 6,
    name: "CLUB DE ATLETISMO LOS OLMOS 'A'",
    shortName: "Los Olmos 'A'",
    pts: 6,
    pj: 4,
    pg: 2,
    pe: 0,
    pp: 2,
    gf: 6,
    gc: 9,
    dg: -3,
    form: ['V', 'D', 'V', 'D'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0014191144_escudo.jfif?nova=1",
    isMyTeam: false
  },
  {
    pos: 7,
    name: "S.A.D. STELLA MARIS LA GAVIA 'B'",
    shortName: "Stella Maris 'B'",
    pts: 6,
    pj: 4,
    pg: 2,
    pe: 0,
    pp: 2,
    gf: 8,
    gc: 22,
    dg: -14,
    form: ['D', 'V', 'D', 'V'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0014277134_LOGO_SMLG___OK__1_.png?nova=1",
    isMyTeam: false
  },
  {
    pos: 8,
    name: "VALLECAS C.F. 'D'",
    shortName: "Vallecas 'D'",
    pts: 5,
    pj: 4,
    pg: 1,
    pe: 2,
    pp: 1,
    gf: 17,
    gc: 4,
    dg: 13,
    form: ['E', 'D', 'V', 'E'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011869145_vallecas_escudo__1_.png?nova=1",
    isMyTeam: false
  },
  {
    pos: 9,
    name: "S.A.D. FUNDACION ESCUELA DE FUTBOL AFE 'B'",
    shortName: "Fundación AFE 'B'",
    pts: 5,
    pj: 4,
    pg: 1,
    pe: 2,
    pp: 1,
    gf: 3,
    gc: 6,
    dg: -3,
    form: ['V', 'E', 'D', 'E'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011230707_unnamed.jpg?nova=1",
    isMyTeam: true
  },
  {
    pos: 10,
    name: "C.D. CIUDAD DE MADRID 2018 'A'",
    shortName: "Ciudad Madrid 'A'",
    pts: 3,
    pj: 4,
    pg: 1,
    pe: 0,
    pp: 3,
    gf: 5,
    gc: 27,
    dg: -22,
    form: ['D', 'D', 'V', 'D'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0014267478_EFC_MADRID_2018.png?nova=1",
    isMyTeam: false
  },
  {
    pos: 11,
    name: "ESC.F. JUVENTUD MADRID 'B'",
    shortName: "Juventud Madrid 'B'",
    pts: 2,
    pj: 4,
    pg: 0,
    pe: 2,
    pp: 2,
    gf: 6,
    gc: 9,
    dg: -3,
    form: ['D', 'E', 'D', 'E'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011741131_ESCUDO_JOTA_25ANV4.jpg?nova=1",
    isMyTeam: false
  },
  {
    pos: 12,
    name: "A.D. MADRID SUR 'A'",
    shortName: "Madrid Sur 'A'",
    pts: 1,
    pj: 4,
    pg: 0,
    pe: 1,
    pp: 3,
    gf: 6,
    gc: 14,
    dg: -8,
    form: ['E', 'D', 'D', 'D'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0012178934_logo_Agrupacion_Deportiva_Madrid_Sur.jpg?nova=1",
    isMyTeam: false
  },
  {
    pos: 13,
    name: "C.D.E INNOVA MORATALAZ 'D'",
    shortName: "Innova Moratalaz 'D'",
    pts: 1,
    pj: 4,
    pg: 0,
    pe: 1,
    pp: 3,
    gf: 4,
    gc: 21,
    dg: -17,
    form: ['D', 'E', 'D', 'D'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011584923_LOGO_INNOVA_AMPLI.png?nova=1",
    isMyTeam: false
  },
  {
    pos: 14,
    name: "C.D.E. DE FUTBOL INTER VICTORIA 'A'",
    shortName: "Inter Victoria 'A'",
    pts: 0,
    pj: 4,
    pg: 0,
    pe: 0,
    pp: 4,
    gf: 0,
    gc: 50,
    dg: -50,
    form: ['D', 'D', 'D', 'D'],
    escudoUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0014267525_INTER_VICTORIA.png?nova=1",
    isMyTeam: false
  }
];

/**
 * Exact matches extracted directly from RFFM API for Jornadas 1, 2, 3, 4, 5
 */
export const OFFICIAL_RFFM_ALL_MATCHES: JornadaMatch[] = [
  // --- JORNADA 1 ---
  {
    id: "rffm-j1-1",
    jornada: 1,
    local: "C.D. ASOC RETIRO SUR 'C'",
    visitante: "C.D. CIUDAD DE MADRID 2018 'A'",
    golesLocal: 14,
    golesVisitante: 0,
    jugado: true,
    fecha: "10/10/2026",
    hora: "13:30",
    campo: "ARROYO MEDIA LEGUA (Trece Rosas) - (HA)"
  },
  {
    id: "rffm-j1-2",
    jornada: 1,
    local: "VALLECAS C.F. 'D'",
    visitante: "A.D. MADRID SUR 'A'",
    golesLocal: 2,
    golesVisitante: 2,
    jugado: true,
    fecha: "11/10/2026",
    hora: "15:45",
    campo: "NTRA. SRA. DE LA TORRE (HA)"
  },
  {
    id: "rffm-j1-3",
    jornada: 1,
    local: "C.D. UNION ELIPA 'A'",
    visitante: "S.A.D. STELLA MARIS LA GAVIA 'B'",
    golesLocal: 7,
    golesVisitante: 1,
    jugado: true,
    fecha: "10/10/2026",
    hora: "09:00",
    campo: "SAN LAMBERTO - Bº. LA ELIPA (HA)"
  },
  {
    id: "rffm-j1-4",
    jornada: 1,
    local: "A.D. ESCUELA DE FUTBOL DE CARABANCHEL 'C'",
    visitante: "C.D.E. DE FUTBOL INTER VICTORIA 'A'",
    golesLocal: 14,
    golesVisitante: 0,
    jugado: true,
    fecha: "10/10/2026",
    hora: "17:15",
    campo: "ESC. FUT. CARABANCHEL 1 (HA)"
  },
  {
    id: "rffm-j1-5",
    jornada: 1,
    local: "C.P. SANTA MARIA DEL PILAR 'C'",
    visitante: "S.A.D. FUNDACION ESCUELA DE FUTBOL AFE 'B'",
    golesLocal: 1,
    golesVisitante: 2,
    jugado: true,
    fecha: "10/10/2026",
    hora: "09:30",
    campo: "COLEGIO SANTA MARIA DEL PILAR (HA)"
  },
  {
    id: "rffm-j1-6",
    jornada: 1,
    local: "ESC.F. JUVENTUD MADRID 'B'",
    visitante: "CLUB DE ATLETISMO LOS OLMOS 'A'",
    golesLocal: 2,
    golesVisitante: 3,
    jugado: true,
    fecha: "10/10/2026",
    hora: "16:30",
    campo: "PVO. ENTREVIAS 1 (HA)"
  },
  {
    id: "rffm-j1-7",
    jornada: 1,
    local: "CLUB SECCION DEPORTIVA DEL POZO 'B'",
    visitante: "C.D.E INNOVA MORATALAZ 'D'",
    golesLocal: 7,
    golesVisitante: 0,
    jugado: true,
    fecha: "10/10/2026",
    hora: "15:00",
    campo: "ASOC. VEC. DEL POZO (HA)"
  },

  // --- JORNADA 2 ---
  {
    id: "rffm-j2-1",
    jornada: 2,
    local: "C.D. CIUDAD DE MADRID 2018 'A'",
    visitante: "CLUB SECCION DEPORTIVA DEL POZO 'B'",
    golesLocal: 1,
    golesVisitante: 6,
    jugado: true,
    fecha: "17/10/2026",
    hora: "18:00",
    campo: "ARROYO MEDIA LEGUA (Trece Rosas) - (HA)"
  },
  {
    id: "rffm-j2-2",
    jornada: 2,
    local: "A.D. MADRID SUR 'A'",
    visitante: "C.D. ASOC RETIRO SUR 'C'",
    golesLocal: 1,
    golesVisitante: 4,
    jugado: true,
    fecha: "17/10/2026",
    hora: "13:30",
    campo: "JOSE DURAN (HA)"
  },
  {
    id: "rffm-j2-3",
    jornada: 2,
    local: "S.A.D. STELLA MARIS LA GAVIA 'B'",
    visitante: "VALLECAS C.F. 'D'",
    golesLocal: 1,
    golesVisitante: 0,
    jugado: true,
    fecha: "17/10/2026",
    hora: "09:00",
    campo: "JOSE DURAN (HA)"
  },
  {
    id: "rffm-j2-4",
    jornada: 2,
    local: "C.D.E. DE FUTBOL INTER VICTORIA 'A'",
    visitante: "C.D. UNION ELIPA 'A'",
    golesLocal: 0,
    golesVisitante: 10,
    jugado: true,
    fecha: "17/10/2026",
    hora: "14:00",
    campo: "PALOMERAS BAJAS (HA)"
  },
  {
    id: "rffm-j2-5",
    jornada: 2,
    local: "S.A.D. FUNDACION ESCUELA DE FUTBOL AFE 'B'",
    visitante: "A.D. ESCUELA DE FUTBOL DE CARABANCHEL 'C'",
    golesLocal: 0,
    golesVisitante: 0,
    jugado: true,
    fecha: "17/10/2026",
    hora: "13:00",
    campo: "PVO. LA ELIPA (HA)"
  },
  {
    id: "rffm-j2-6",
    jornada: 2,
    local: "CLUB DE ATLETISMO LOS OLMOS 'A'",
    visitante: "C.P. SANTA MARIA DEL PILAR 'C'",
    golesLocal: 0,
    golesVisitante: 2,
    jugado: true,
    fecha: "17/10/2026",
    hora: "10:45",
    campo: "SAN LAMBERTO - Bº. LA ELIPA (HA)"
  },
  {
    id: "rffm-j2-7",
    jornada: 2,
    local: "C.D.E INNOVA MORATALAZ 'D'",
    visitante: "ESC.F. JUVENTUD MADRID 'B'",
    golesLocal: 3,
    golesVisitante: 3,
    jugado: true,
    fecha: "17/10/2026",
    hora: "09:00",
    campo: "PVO. LILI ALVAREZ (HA)"
  },

  // --- JORNADA 3 ---
  {
    id: "rffm-j3-1",
    jornada: 3,
    local: "C.D. CIUDAD DE MADRID 2018 'A'",
    visitante: "A.D. MADRID SUR 'A'",
    golesLocal: 3,
    golesVisitante: 1,
    jugado: true,
    fecha: "24/10/2026",
    hora: "12:15",
    campo: "SAN LAMBERTO - Bº. LA ELIPA (HA)"
  },
  {
    id: "rffm-j3-2",
    jornada: 3,
    local: "C.D. ASOC RETIRO SUR 'C'",
    visitante: "S.A.D. STELLA MARIS LA GAVIA 'B'",
    golesLocal: 14,
    golesVisitante: 0,
    jugado: true,
    fecha: "25/10/2026",
    hora: "16:30",
    campo: "ARROYO MEDIA LEGUA (Trece Rosas) - (HA)"
  },
  {
    id: "rffm-j3-3",
    jornada: 3,
    local: "VALLECAS C.F. 'D'",
    visitante: "C.D.E. DE FUTBOL INTER VICTORIA 'A'",
    golesLocal: 14,
    golesVisitante: 0,
    jugado: true,
    fecha: "24/10/2026",
    hora: "18:45",
    campo: "NTRA. SRA. DE LA TORRE (HA)"
  },
  {
    id: "rffm-j3-4",
    jornada: 3,
    local: "C.D. UNION ELIPA 'A'",
    visitante: "S.A.D. FUNDACION ESCUELA DE FUTBOL AFE 'B'",
    golesLocal: 4,
    golesVisitante: 0,
    jugado: true,
    fecha: "24/10/2026",
    hora: "09:00",
    campo: "SAN LAMBERTO - Bº. LA ELIPA (HA)"
  },
  {
    id: "rffm-j3-5",
    jornada: 3,
    local: "A.D. ESCUELA DE FUTBOL DE CARABANCHEL 'C'",
    visitante: "CLUB DE ATLETISMO LOS OLMOS 'A'",
    golesLocal: 1,
    golesVisitante: 2,
    jugado: true,
    fecha: "24/10/2026",
    hora: "12:30",
    campo: "ESC. FUT. CARABANCHEL 1 (HA)"
  },
  {
    id: "rffm-j3-6",
    jornada: 3,
    local: "C.P. SANTA MARIA DEL PILAR 'C'",
    visitante: "C.D.E INNOVA MORATALAZ 'D'",
    golesLocal: 5,
    golesVisitante: 1,
    jugado: true,
    fecha: "24/10/2026",
    hora: "14:00",
    campo: "COLEGIO SANTA MARIA DEL PILAR (HA)"
  },
  {
    id: "rffm-j3-7",
    jornada: 3,
    local: "CLUB SECCION DEPORTIVA DEL POZO 'B'",
    visitante: "ESC.F. JUVENTUD MADRID 'B'",
    golesLocal: 2,
    golesVisitante: 0,
    jugado: true,
    fecha: "24/10/2026",
    hora: "16:10",
    campo: "ASOC. VEC. DEL POZO (HA)"
  },

  // --- JORNADA 4 ---
  {
    id: "rffm-j4-1",
    jornada: 4,
    local: "A.D. MADRID SUR 'A'",
    visitante: "CLUB SECCION DEPORTIVA DEL POZO 'B'",
    golesLocal: 2,
    golesVisitante: 5,
    jugado: true,
    fecha: "31/10/2026",
    hora: "18:30",
    campo: "JOSE DURAN (HA)"
  },
  {
    id: "rffm-j4-2",
    jornada: 4,
    local: "S.A.D. STELLA MARIS LA GAVIA 'B'",
    visitante: "C.D. CIUDAD DE MADRID 2018 'A'",
    golesLocal: 6,
    golesVisitante: 1,
    jugado: true,
    fecha: "01/11/2026",
    hora: "13:00",
    campo: "JOSE DURAN (HA)"
  },
  {
    id: "rffm-j4-3",
    jornada: 4,
    local: "C.D.E. DE FUTBOL INTER VICTORIA 'A'",
    visitante: "C.D. ASOC RETIRO SUR 'C'",
    golesLocal: 0,
    golesVisitante: 12,
    jugado: true,
    fecha: "31/10/2026",
    hora: "09:30",
    campo: "PALOMERAS BAJAS (HA)"
  },
  {
    id: "rffm-j4-4",
    jornada: 4,
    local: "S.A.D. FUNDACION ESCUELA DE FUTBOL AFE 'B'",
    visitante: "VALLECAS C.F. 'D'",
    golesLocal: 1,
    golesVisitante: 1,
    jugado: true,
    fecha: "31/10/2026",
    hora: "13:00",
    campo: "PVO. LA ELIPA (HA)"
  },
  {
    id: "rffm-j4-5",
    jornada: 4,
    local: "CLUB DE ATLETISMO LOS OLMOS 'A'",
    visitante: "C.D. UNION ELIPA 'A'",
    golesLocal: 1,
    golesVisitante: 4,
    jugado: true,
    fecha: "31/10/2026",
    hora: "13:30",
    campo: "SAN LAMBERTO - Bº. LA ELIPA (HA)"
  },
  {
    id: "rffm-j4-6",
    jornada: 4,
    local: "C.D.E INNOVA MORATALAZ 'D'",
    visitante: "A.D. ESCUELA DE FUTBOL DE CARABANCHEL 'C'",
    golesLocal: 0,
    golesVisitante: 6,
    jugado: true,
    fecha: "31/10/2026",
    hora: "10:45",
    campo: "PVO. LILI ALVAREZ (HA)"
  },
  {
    id: "rffm-j4-7",
    jornada: 4,
    local: "ESC.F. JUVENTUD MADRID 'B'",
    visitante: "C.P. SANTA MARIA DEL PILAR 'C'",
    golesLocal: 1,
    golesVisitante: 1,
    jugado: true,
    fecha: "31/10/2026",
    hora: "16:30",
    campo: "PVO. ENTREVIAS 1 (HA)"
  },

  // --- JORNADA 5 (Semana Actual - 07/11/2026 - 08/11/2026) ---
  {
    id: "rffm-j5-1",
    jornada: 5,
    local: "A.D. MADRID SUR 'A'",
    visitante: "S.A.D. STELLA MARIS LA GAVIA 'B'",
    jugado: false,
    fecha: "07/11/2026",
    hora: "12:45",
    campo: "JOSE DURAN (HA)"
  },
  {
    id: "rffm-j5-2",
    jornada: 5,
    local: "C.D. CIUDAD DE MADRID 2018 'A'",
    visitante: "C.D.E. DE FUTBOL INTER VICTORIA 'A'",
    jugado: false,
    fecha: "08/11/2026",
    hora: "17:15",
    campo: "ARROYO MEDIA LEGUA (Trece Rosas) - (HA)"
  },
  {
    id: "rffm-j5-3",
    jornada: 5,
    local: "C.D. ASOC RETIRO SUR 'C'",
    visitante: "S.A.D. FUNDACION ESCUELA DE FUTBOL AFE 'B'",
    jugado: false,
    fecha: "07/11/2026",
    hora: "18:00",
    campo: "ARROYO MEDIA LEGUA (Trece Rosas) - (HA)"
  },
  {
    id: "rffm-j5-4",
    jornada: 5,
    local: "VALLECAS C.F. 'D'",
    visitante: "CLUB DE ATLETISMO LOS OLMOS 'A'",
    jugado: false,
    fecha: "07/11/2026",
    hora: "17:15",
    campo: "NTRA. SRA. DE LA TORRE (HA)"
  },
  {
    id: "rffm-j5-5",
    jornada: 5,
    local: "C.D. UNION ELIPA 'A'",
    visitante: "C.D.E INNOVA MORATALAZ 'D'",
    jugado: false,
    fecha: "07/11/2026",
    hora: "10:45",
    campo: "SAN LAMBERTO - Bº. LA ELIPA (HA)"
  },
  {
    id: "rffm-j5-6",
    jornada: 5,
    local: "A.D. ESCUELA DE FUTBOL DE CARABANCHEL 'C'",
    visitante: "ESC.F. JUVENTUD MADRID 'B'",
    jugado: false,
    fecha: "07/11/2026",
    hora: "12:30",
    campo: "ESC. FUT. CARABANCHEL 1 (HA)"
  },
  {
    id: "rffm-j5-7",
    jornada: 5,
    local: "CLUB SECCION DEPORTIVA DEL POZO 'B'",
    visitante: "C.P. SANTA MARIA DEL PILAR 'C'",
    jugado: false,
    fecha: "07/11/2026",
    hora: "15:00",
    campo: "ASOC. VEC. DEL POZO (HA)"
  }
];

export async function fetchLiveRFFMClasificacion(jornada: number = 4): Promise<StandingTeam[] | null> {
  try {
    const res = await fetch(`/api/rffm/clasificacion?jornada=${jornada}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.clasificacion || !Array.isArray(data.clasificacion)) return null;

    return data.clasificacion.map((item: any) => {
      const isAFE = item.nombre.includes("AFE");
      const racha = (item.racha_partidos || []).map((r: any) => {
        if (r.tipo === "G") return "V";
        if (r.tipo === "E") return "E";
        return "D";
      });

      return {
        pos: parseInt(item.posicion, 10) || 1,
        name: item.nombre,
        shortName: item.nombre.replace("C.D. ", "").replace("S.A.D. ", "").replace("CLUB ", "").replace("A.D. ", ""),
        pts: parseInt(item.puntos, 10) || 0,
        pj: parseInt(item.jugados, 10) || 0,
        pg: parseInt(item.ganados, 10) || 0,
        pe: parseInt(item.empatados, 10) || 0,
        pp: parseInt(item.perdidos, 10) || 0,
        gf: parseInt(item.goles_a_favor, 10) || 0,
        gc: parseInt(item.goles_en_contra, 10) || 0,
        dg: (parseInt(item.goles_a_favor, 10) || 0) - (parseInt(item.goles_en_contra, 10) || 0),
        form: racha,
        escudoUrl: item.url_img ? (item.url_img.startsWith("http") ? item.url_img : `https://appweb.rffm.es${item.url_img}`) : undefined,
        isMyTeam: isAFE
      };
    });
  } catch (e) {
    console.warn("Live fetch from RFFM failed:", e);
    return null;
  }
}

export async function fetchLiveRFFMResultados(jornada: number = 4): Promise<JornadaMatch[] | null> {
  try {
    const res = await fetch(`/api/rffm/resultados?jornada=${jornada}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.partidos || !Array.isArray(data.partidos)) return null;

    return data.partidos.map((p: any, idx: number) => {
      const gl = p.Goles_casa !== "" && p.Goles_casa !== undefined ? parseInt(p.Goles_casa, 10) : undefined;
      const gv = p.Goles_visitante !== "" && p.Goles_visitante !== undefined ? parseInt(p.Goles_visitante, 10) : undefined;
      const cerrado = p.acta_cerrada === "1" || (gl !== undefined && gv !== undefined);

      return {
        id: `rffm-live-j${jornada}-${p.codacta || idx}`,
        jornada,
        local: p.Nombre_equipo_local,
        visitante: p.Nombre_equipo_visitante,
        golesLocal: gl,
        golesVisitante: gv,
        jugado: cerrado,
        fecha: p.fecha || "",
        hora: p.hora || "",
        campo: p.campojuego || "",
        escudoLocal: p.url_img_local ? (p.url_img_local.startsWith("http") ? p.url_img_local : `https://appweb.rffm.es${p.url_img_local}`) : undefined,
        escudoVisitante: p.url_img_visitante ? (p.url_img_visitante.startsWith("http") ? p.url_img_visitante : `https://appweb.rffm.es${p.url_img_visitante}`) : undefined
      };
    });
  } catch (e) {
    console.warn("Live fetch matches from RFFM failed:", e);
    return null;
  }
}
