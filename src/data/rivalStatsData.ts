import { 
  RivalTeam, 
  RivalMatchCollective, 
  TeamCollectiveStats, 
  Franja15Min, 
  IntervalStats, 
  CollectiveGoalEvent, 
  CollectiveCardEvent,
  GoalTimingRecord,
  GoalTimingStats,
  CollectiveSubstitutionEvent,
  SubstitutionPeriod,
  TeamSubstitutionStats
} from '@/types/rivals';

export const FRANJAS_15M: { franja: Franja15Min; label: string; periodo: '1ª Parte' | '2ª Parte' }[] = [
  { franja: '0-15', label: "1' a 15'", periodo: '1ª Parte' },
  { franja: '16-30', label: "16' a 30'", periodo: '1ª Parte' },
  { franja: '31-35', label: "31' a 35'+ (Final 1T)", periodo: '1ª Parte' },
  { franja: '36-50', label: "36' a 50'", periodo: '2ª Parte' },
  { franja: '51-65', label: "51' a 65'", periodo: '2ª Parte' },
  { franja: '66-70', label: "66' a 70'+ (Final 2T)", periodo: '2ª Parte' },
];

export function getFranjaFromMinute(min: number): Franja15Min {
  if (min <= 15) return '0-15';
  if (min <= 30) return '16-30';
  if (min <= 35) return '31-35';
  if (min <= 50) return '36-50';
  if (min <= 65) return '51-65';
  return '66-70';
}

export const RIVAL_TEAMS: RivalTeam[] = [
  {
    id: "team-retiro-sur",
    name: "C.D. ASOC RETIRO SUR 'C'",
    shortName: "Retiro Sur 'C'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0010963772_5146_asoc.retiro_sur.jpg?nova=1",
    isMyTeam: false
  },
  {
    id: "team-elipa",
    name: "C.D. UNION ELIPA 'A'",
    shortName: "Unión Elipa 'A'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011717616_LOGO__ByN.jpg?nova=1",
    isMyTeam: false
  },
  {
    id: "team-del-pozo",
    name: "CLUB SECCION DEPORTIVA DEL POZO 'B'",
    shortName: "S.D. Del Pozo 'B'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011685159_IMG_20190913_WA0008.jpg?nova=1",
    isMyTeam: false
  },
  {
    id: "team-carabanchel",
    name: "A.D. ESCUELA DE FUTBOL DE CARABANCHEL 'C'",
    shortName: "E.F. Carabanchel 'C'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011195225_WhatsApp_Image_2022_07_21_at_07.43.24.jpeg?nova=1",
    isMyTeam: false
  },
  {
    id: "team-santa-maria",
    name: "C.P. SANTA MARIA DEL PILAR 'C'",
    shortName: "Santa Mª Pilar 'C'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0000000668_3634-santa maria del pilar.jpg?nova=1",
    isMyTeam: false
  },
  {
    id: "team-los-olmos",
    name: "CLUB DE ATLETISMO LOS OLMOS 'A'",
    shortName: "Los Olmos 'A'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0014191144_escudo.jfif?nova=1",
    isMyTeam: false
  },
  {
    id: "team-stella-maris",
    name: "S.A.D. STELLA MARIS LA GAVIA 'B'",
    shortName: "Stella Maris 'B'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0014277134_LOGO_SMLG___OK__1_.png?nova=1",
    isMyTeam: false
  },
  {
    id: "team-vallecas",
    name: "VALLECAS C.F. 'D'",
    shortName: "Vallecas 'D'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011869145_vallecas_escudo__1_.png?nova=1",
    isMyTeam: false
  },
  {
    id: "team-afe-b",
    name: "S.A.D. FUNDACION ESCUELA DE FUTBOL AFE 'B'",
    shortName: "Fundación AFE 'B'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011230707_unnamed.jpg?nova=1",
    isMyTeam: true
  },
  {
    id: "team-ciudad-madrid",
    name: "C.D. CIUDAD DE MADRID 2018 'A'",
    shortName: "Ciudad Madrid 'A'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0014267478_EFC_MADRID_2018.png?nova=1",
    isMyTeam: false
  },
  {
    id: "team-juventud-madrid",
    name: "ESC.F. JUVENTUD MADRID 'B'",
    shortName: "Juventud Madrid 'B'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011741131_ESCUDO_JOTA_25ANV4.jpg?nova=1",
    isMyTeam: false
  },
  {
    id: "team-madrid-sur",
    name: "A.D. MADRID SUR 'A'",
    shortName: "Madrid Sur 'A'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0012178934_logo_Agrupacion_Deportiva_Madrid_Sur.jpg?nova=1",
    isMyTeam: false
  },
  {
    id: "team-innova",
    name: "C.D.E INNOVA MORATALAZ 'D'",
    shortName: "Innova Moratalaz 'D'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0011584923_LOGO_INNOVA_AMPLI.png?nova=1",
    isMyTeam: false
  },
  {
    id: "team-inter-victoria",
    name: "C.D.E. DE FUTBOL INTER VICTORIA 'A'",
    shortName: "Inter Victoria 'A'",
    crestUrl: "https://appweb.rffm.es/pnfg/pimg/Clubes/00100_0014267525_INTER_VICTORIA.png?nova=1",
    isMyTeam: false
  }
];

export const RIVAL_TEAMS_BY_NAME: Record<string, RivalTeam> = {};
RIVAL_TEAMS.forEach(t => {
  RIVAL_TEAMS_BY_NAME[t.name] = t;
  RIVAL_TEAMS_BY_NAME[t.shortName] = t;
});

// Helper to generate collective events for verified matches without player identity
function createCollectiveGoals(matchId: string, teamId: string, minutes: number[], esFavor: boolean): CollectiveGoalEvent[] {
  return minutes.map((min, idx) => ({
    id: `cg-${matchId}-${teamId}-${min}-${idx}`,
    matchId,
    teamId,
    minuto: min,
    franja: getFranjaFromMinute(min),
    esFavor
  }));
}

function createCollectiveCards(matchId: string, teamId: string, cards: { min: number; tipo: 'Amarilla' | 'Roja_Directa' | 'Doble_Amarilla' }[]): CollectiveCardEvent[] {
  return cards.map((c, idx) => ({
    id: `cc-${matchId}-${teamId}-${c.min}-${idx}`,
    matchId,
    teamId,
    minuto: c.min,
    tipo: c.tipo
  }));
}

export function getSubstitutionPeriod(minuto: number): SubstitutionPeriod {
  if (minuto < 35) return '1ª Parte';
  if (minuto === 35) return 'Descanso';
  return '2ª Parte';
}

export function createCollectiveSubs(matchId: string, teamId: string, minutes: number[], jornada?: number): CollectiveSubstitutionEvent[] {
  return minutes.map((min, idx) => ({
    id: `cs-${matchId}-${teamId}-${min}-${idx}`,
    matchId,
    teamId,
    minuto: min,
    periodo: getSubstitutionPeriod(min),
    jornada
  }));
}

// MATCHES JORNADA 1 TO 4 WITH COLLECTIVE MINUTE INTERVALS & CARDS
export const COLLECTIVE_MATCHES: RivalMatchCollective[] = [
  // --- JORNADA 1 ---
  {
    id: "m-j1-1",
    jornada: 1,
    fecha: "2026-10-10",
    hora: "13:30",
    campo: "ARROYO MEDIA LEGUA (Trece Rosas)",
    localTeamId: "team-retiro-sur",
    visitanteTeamId: "team-ciudad-madrid",
    golesLocal: 14,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j1-1", "team-retiro-sur", [4, 9, 14, 18, 22, 29, 34, 38, 44, 49, 53, 58, 63, 68], true),
      ...createCollectiveGoals("m-j1-1", "team-ciudad-madrid", [4, 9, 14, 18, 22, 29, 34, 38, 44, 49, 53, 58, 63, 68], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j1-1", "team-ciudad-madrid", [{ min: 25, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j1-2",
    jornada: 1,
    fecha: "2026-10-11",
    hora: "15:45",
    campo: "NTRA. SRA. DE LA TORRE",
    localTeamId: "team-vallecas",
    visitanteTeamId: "team-madrid-sur",
    golesLocal: 2,
    golesVisitante: 2,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j1-2", "team-vallecas", [12, 48], true),
      ...createCollectiveGoals("m-j1-2", "team-madrid-sur", [12, 48], false),
      ...createCollectiveGoals("m-j1-2", "team-madrid-sur", [26, 62], true),
      ...createCollectiveGoals("m-j1-2", "team-vallecas", [26, 62], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j1-2", "team-vallecas", [{ min: 33, tipo: 'Amarilla' }, { min: 65, tipo: 'Amarilla' }]),
      ...createCollectiveCards("m-j1-2", "team-madrid-sur", [{ min: 54, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j1-3",
    jornada: 1,
    fecha: "2026-10-10",
    hora: "09:00",
    campo: "SAN LAMBERTO - LA ELIPA",
    localTeamId: "team-elipa",
    visitanteTeamId: "team-stella-maris",
    golesLocal: 7,
    golesVisitante: 1,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j1-3", "team-elipa", [6, 17, 24, 32, 45, 52, 64], true),
      ...createCollectiveGoals("m-j1-3", "team-stella-maris", [6, 17, 24, 32, 45, 52, 64], false),
      ...createCollectiveGoals("m-j1-3", "team-stella-maris", [58], true),
      ...createCollectiveGoals("m-j1-3", "team-elipa", [58], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j1-3", "team-stella-maris", [{ min: 41, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j1-4",
    jornada: 1,
    fecha: "2026-10-10",
    hora: "17:15",
    campo: "ESC. FUT. CARABANCHEL 1",
    localTeamId: "team-carabanchel",
    visitanteTeamId: "team-inter-victoria",
    golesLocal: 14,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j1-4", "team-carabanchel", [5, 11, 15, 20, 26, 31, 35, 40, 44, 50, 56, 61, 65, 69], true),
      ...createCollectiveGoals("m-j1-4", "team-inter-victoria", [5, 11, 15, 20, 26, 31, 35, 40, 44, 50, 56, 61, 65, 69], false)
    ],
    cardEvents: []
  },
  {
    id: "m-j1-5",
    jornada: 1,
    fecha: "2026-10-10",
    hora: "09:30",
    campo: "COLEGIO SANTA MARIA DEL PILAR",
    localTeamId: "team-santa-maria",
    visitanteTeamId: "team-afe-b",
    golesLocal: 1,
    golesVisitante: 2,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j1-5", "team-santa-maria", [28], true),
      ...createCollectiveGoals("m-j1-5", "team-afe-b", [28], false),
      ...createCollectiveGoals("m-j1-5", "team-afe-b", [14, 53], true),
      ...createCollectiveGoals("m-j1-5", "team-santa-maria", [14, 53], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j1-5", "team-santa-maria", [{ min: 61, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j1-6",
    jornada: 1,
    fecha: "2026-10-10",
    hora: "16:30",
    campo: "PVO. ENTREVIAS 1",
    localTeamId: "team-juventud-madrid",
    visitanteTeamId: "team-los-olmos",
    golesLocal: 2,
    golesVisitante: 3,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j1-6", "team-juventud-madrid", [19, 44], true),
      ...createCollectiveGoals("m-j1-6", "team-los-olmos", [19, 44], false),
      ...createCollectiveGoals("m-j1-6", "team-los-olmos", [8, 33, 67], true),
      ...createCollectiveGoals("m-j1-6", "team-juventud-madrid", [8, 33, 67], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j1-6", "team-juventud-madrid", [{ min: 30, tipo: 'Amarilla' }]),
      ...createCollectiveCards("m-j1-6", "team-los-olmos", [{ min: 55, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j1-7",
    jornada: 1,
    fecha: "2026-10-10",
    hora: "15:00",
    campo: "ASOC. VEC. DEL POZO",
    localTeamId: "team-del-pozo",
    visitanteTeamId: "team-innova",
    golesLocal: 7,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j1-7", "team-del-pozo", [9, 16, 28, 39, 47, 56, 65], true),
      ...createCollectiveGoals("m-j1-7", "team-innova", [9, 16, 28, 39, 47, 56, 65], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j1-7", "team-innova", [{ min: 42, tipo: 'Amarilla' }])
    ]
  },

  // --- JORNADA 2 ---
  {
    id: "m-j2-1",
    jornada: 2,
    fecha: "2026-10-17",
    hora: "18:00",
    campo: "ARROYO MEDIA LEGUA",
    localTeamId: "team-ciudad-madrid",
    visitanteTeamId: "team-del-pozo",
    golesLocal: 1,
    golesVisitante: 6,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j2-1", "team-ciudad-madrid", [51], true),
      ...createCollectiveGoals("m-j2-1", "team-del-pozo", [51], false),
      ...createCollectiveGoals("m-j2-1", "team-del-pozo", [7, 18, 27, 34, 46, 62], true),
      ...createCollectiveGoals("m-j2-1", "team-ciudad-madrid", [7, 18, 27, 34, 46, 62], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j2-1", "team-ciudad-madrid", [{ min: 21, tipo: 'Amarilla' }, { min: 66, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j2-2",
    jornada: 2,
    fecha: "2026-10-17",
    hora: "13:30",
    campo: "JOSE DURAN",
    localTeamId: "team-madrid-sur",
    visitanteTeamId: "team-retiro-sur",
    golesLocal: 1,
    golesVisitante: 4,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j2-2", "team-madrid-sur", [38], true),
      ...createCollectiveGoals("m-j2-2", "team-retiro-sur", [38], false),
      ...createCollectiveGoals("m-j2-2", "team-retiro-sur", [11, 23, 49, 64], true),
      ...createCollectiveGoals("m-j2-2", "team-madrid-sur", [11, 23, 49, 64], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j2-2", "team-madrid-sur", [{ min: 59, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j2-3",
    jornada: 2,
    fecha: "2026-10-17",
    hora: "09:00",
    campo: "JOSE DURAN",
    localTeamId: "team-stella-maris",
    visitanteTeamId: "team-vallecas",
    golesLocal: 1,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j2-3", "team-stella-maris", [67], true),
      ...createCollectiveGoals("m-j2-3", "team-vallecas", [67], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j2-3", "team-stella-maris", [{ min: 32, tipo: 'Amarilla' }]),
      ...createCollectiveCards("m-j2-3", "team-vallecas", [{ min: 48, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j2-4",
    jornada: 2,
    fecha: "2026-10-17",
    hora: "14:00",
    campo: "PALOMERAS BAJAS",
    localTeamId: "team-inter-victoria",
    visitanteTeamId: "team-elipa",
    golesLocal: 0,
    golesVisitante: 10,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j2-4", "team-elipa", [3, 10, 16, 25, 30, 39, 47, 53, 61, 68], true),
      ...createCollectiveGoals("m-j2-4", "team-inter-victoria", [3, 10, 16, 25, 30, 39, 47, 53, 61, 68], false)
    ],
    cardEvents: []
  },
  {
    id: "m-j2-5",
    jornada: 2,
    fecha: "2026-10-17",
    hora: "13:00",
    campo: "PVO. LA ELIPA",
    localTeamId: "team-afe-b",
    visitanteTeamId: "team-carabanchel",
    golesLocal: 0,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [],
    cardEvents: [
      ...createCollectiveCards("m-j2-5", "team-afe-b", [{ min: 29, tipo: 'Amarilla' }]),
      ...createCollectiveCards("m-j2-5", "team-carabanchel", [{ min: 52, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j2-6",
    jornada: 2,
    fecha: "2026-10-17",
    hora: "10:45",
    campo: "SAN LAMBERTO - LA ELIPA",
    localTeamId: "team-los-olmos",
    visitanteTeamId: "team-santa-maria",
    golesLocal: 0,
    golesVisitante: 2,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j2-6", "team-santa-maria", [21, 57], true),
      ...createCollectiveGoals("m-j2-6", "team-los-olmos", [21, 57], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j2-6", "team-los-olmos", [{ min: 46, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j2-7",
    jornada: 2,
    fecha: "2026-10-17",
    hora: "09:00",
    campo: "PVO. LILI ALVAREZ",
    localTeamId: "team-innova",
    visitanteTeamId: "team-juventud-madrid",
    golesLocal: 3,
    golesVisitante: 3,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j2-7", "team-innova", [13, 31, 59], true),
      ...createCollectiveGoals("m-j2-7", "team-juventud-madrid", [13, 31, 59], false),
      ...createCollectiveGoals("m-j2-7", "team-juventud-madrid", [18, 42, 65], true),
      ...createCollectiveGoals("m-j2-7", "team-innova", [18, 42, 65], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j2-7", "team-innova", [{ min: 28, tipo: 'Amarilla' }]),
      ...createCollectiveCards("m-j2-7", "team-juventud-madrid", [{ min: 55, tipo: 'Amarilla' }])
    ]
  },

  // --- JORNADA 3 ---
  {
    id: "m-j3-1",
    jornada: 3,
    fecha: "2026-10-24",
    hora: "12:15",
    campo: "SAN LAMBERTO",
    localTeamId: "team-ciudad-madrid",
    visitanteTeamId: "team-madrid-sur",
    golesLocal: 3,
    golesVisitante: 1,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j3-1", "team-ciudad-madrid", [15, 41, 62], true),
      ...createCollectiveGoals("m-j3-1", "team-madrid-sur", [15, 41, 62], false),
      ...createCollectiveGoals("m-j3-1", "team-madrid-sur", [50], true),
      ...createCollectiveGoals("m-j3-1", "team-ciudad-madrid", [50], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j3-1", "team-madrid-sur", [{ min: 61, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j3-2",
    jornada: 3,
    fecha: "2026-10-25",
    hora: "16:30",
    campo: "ARROYO MEDIA LEGUA",
    localTeamId: "team-retiro-sur",
    visitanteTeamId: "team-stella-maris",
    golesLocal: 14,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j3-2", "team-retiro-sur", [2, 8, 14, 19, 25, 30, 33, 37, 43, 48, 55, 60, 64, 69], true),
      ...createCollectiveGoals("m-j3-2", "team-stella-maris", [2, 8, 14, 19, 25, 30, 33, 37, 43, 48, 55, 60, 64, 69], false)
    ],
    cardEvents: []
  },
  {
    id: "m-j3-3",
    jornada: 3,
    fecha: "2026-10-24",
    hora: "18:45",
    campo: "NTRA. SRA. DE LA TORRE",
    localTeamId: "team-vallecas",
    visitanteTeamId: "team-inter-victoria",
    golesLocal: 14,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j3-3", "team-vallecas", [6, 11, 17, 21, 28, 33, 35, 41, 46, 52, 57, 62, 66, 70], true),
      ...createCollectiveGoals("m-j3-3", "team-inter-victoria", [6, 11, 17, 21, 28, 33, 35, 41, 46, 52, 57, 62, 66, 70], false)
    ],
    cardEvents: []
  },
  {
    id: "m-j3-4",
    jornada: 3,
    fecha: "2026-10-24",
    hora: "09:00",
    campo: "SAN LAMBERTO",
    localTeamId: "team-elipa",
    visitanteTeamId: "team-afe-b",
    golesLocal: 4,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j3-4", "team-elipa", [14, 27, 48, 63], true),
      ...createCollectiveGoals("m-j3-4", "team-afe-b", [14, 27, 48, 63], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j3-4", "team-afe-b", [{ min: 35, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j3-5",
    jornada: 3,
    fecha: "2026-10-24",
    hora: "12:30",
    campo: "ESC. FUT. CARABANCHEL 1",
    localTeamId: "team-carabanchel",
    visitanteTeamId: "team-los-olmos",
    golesLocal: 1,
    golesVisitante: 2,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j3-5", "team-carabanchel", [49], true),
      ...createCollectiveGoals("m-j3-5", "team-los-olmos", [49], false),
      ...createCollectiveGoals("m-j3-5", "team-los-olmos", [17, 64], true),
      ...createCollectiveGoals("m-j3-5", "team-carabanchel", [17, 64], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j3-5", "team-carabanchel", [{ min: 45, tipo: 'Amarilla' }]),
      ...createCollectiveCards("m-j3-5", "team-los-olmos", [{ min: 58, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j3-6",
    jornada: 3,
    fecha: "2026-10-24",
    hora: "14:00",
    campo: "COLEGIO SANTA MARIA DEL PILAR",
    localTeamId: "team-santa-maria",
    visitanteTeamId: "team-innova",
    golesLocal: 5,
    golesVisitante: 1,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j3-6", "team-santa-maria", [8, 22, 34, 47, 61], true),
      ...createCollectiveGoals("m-j3-6", "team-innova", [8, 22, 34, 47, 61], false),
      ...createCollectiveGoals("m-j3-6", "team-innova", [53], true),
      ...createCollectiveGoals("m-j3-6", "team-santa-maria", [53], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j3-6", "team-innova", [{ min: 66, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j3-7",
    jornada: 3,
    fecha: "2026-10-24",
    hora: "16:10",
    campo: "ASOC. VEC. DEL POZO",
    localTeamId: "team-del-pozo",
    visitanteTeamId: "team-juventud-madrid",
    golesLocal: 2,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j3-7", "team-del-pozo", [20, 56], true),
      ...createCollectiveGoals("m-j3-7", "team-juventud-madrid", [20, 56], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j3-7", "team-juventud-madrid", [{ min: 38, tipo: 'Amarilla' }])
    ]
  },

  // --- JORNADA 4 ---
  {
    id: "m-j4-1",
    jornada: 4,
    fecha: "2026-10-31",
    hora: "18:30",
    campo: "JOSE DURAN",
    localTeamId: "team-madrid-sur",
    visitanteTeamId: "team-del-pozo",
    golesLocal: 2,
    golesVisitante: 5,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j4-1", "team-madrid-sur", [31, 65], true),
      ...createCollectiveGoals("m-j4-1", "team-del-pozo", [31, 65], false),
      ...createCollectiveGoals("m-j4-1", "team-del-pozo", [9, 17, 26, 44, 58], true),
      ...createCollectiveGoals("m-j4-1", "team-madrid-sur", [9, 17, 26, 44, 58], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j4-1", "team-madrid-sur", [{ min: 49, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j4-2",
    jornada: 4,
    fecha: "2026-11-01",
    hora: "13:00",
    campo: "JOSE DURAN",
    localTeamId: "team-stella-maris",
    visitanteTeamId: "team-ciudad-madrid",
    golesLocal: 6,
    golesVisitante: 1,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j4-2", "team-stella-maris", [10, 22, 33, 48, 59, 67], true),
      ...createCollectiveGoals("m-j4-2", "team-ciudad-madrid", [10, 22, 33, 48, 59, 67], false),
      ...createCollectiveGoals("m-j4-2", "team-ciudad-madrid", [42], true),
      ...createCollectiveGoals("m-j4-2", "team-stella-maris", [42], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j4-2", "team-ciudad-madrid", [{ min: 36, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j4-3",
    jornada: 4,
    fecha: "2026-10-31",
    hora: "09:30",
    campo: "PALOMERAS BAJAS",
    localTeamId: "team-inter-victoria",
    visitanteTeamId: "team-retiro-sur",
    golesLocal: 0,
    golesVisitante: 12,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j4-3", "team-retiro-sur", [4, 12, 18, 23, 29, 34, 41, 46, 51, 57, 63, 68], true),
      ...createCollectiveGoals("m-j4-3", "team-inter-victoria", [4, 12, 18, 23, 29, 34, 41, 46, 51, 57, 63, 68], false)
    ],
    cardEvents: []
  },
  {
    id: "m-j4-4",
    jornada: 4,
    fecha: "2026-10-31",
    hora: "13:00",
    campo: "PVO. LA ELIPA",
    localTeamId: "team-afe-b",
    visitanteTeamId: "team-vallecas",
    golesLocal: 1,
    golesVisitante: 1,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j4-4", "team-afe-b", [24], true),
      ...createCollectiveGoals("m-j4-4", "team-vallecas", [24], false),
      ...createCollectiveGoals("m-j4-4", "team-vallecas", [52], true),
      ...createCollectiveGoals("m-j4-4", "team-afe-b", [52], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j4-4", "team-afe-b", [{ min: 46, tipo: 'Amarilla' }]),
      ...createCollectiveCards("m-j4-4", "team-vallecas", [{ min: 63, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j4-5",
    jornada: 4,
    fecha: "2026-10-31",
    hora: "13:30",
    campo: "SAN LAMBERTO",
    localTeamId: "team-los-olmos",
    visitanteTeamId: "team-elipa",
    golesLocal: 1,
    golesVisitante: 4,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j4-5", "team-los-olmos", [32], true),
      ...createCollectiveGoals("m-j4-5", "team-elipa", [32], false),
      ...createCollectiveGoals("m-j4-5", "team-elipa", [15, 27, 43, 61], true),
      ...createCollectiveGoals("m-j4-5", "team-los-olmos", [15, 27, 43, 61], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j4-5", "team-los-olmos", [{ min: 50, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j4-6",
    jornada: 4,
    fecha: "2026-10-31",
    hora: "10:45",
    campo: "PVO. LILI ALVAREZ",
    localTeamId: "team-innova",
    visitanteTeamId: "team-carabanchel",
    golesLocal: 0,
    golesVisitante: 6,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j4-6", "team-carabanchel", [8, 19, 31, 45, 54, 66], true),
      ...createCollectiveGoals("m-j4-6", "team-innova", [8, 19, 31, 45, 54, 66], false)
    ],
    cardEvents: []
  },
  {
    id: "m-j4-7",
    jornada: 4,
    fecha: "2026-10-31",
    hora: "16:30",
    campo: "PVO. ENTREVIAS 1",
    localTeamId: "team-juventud-madrid",
    visitanteTeamId: "team-santa-maria",
    golesLocal: 1,
    golesVisitante: 1,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j4-7", "team-juventud-madrid", [22], true),
      ...createCollectiveGoals("m-j4-7", "team-santa-maria", [22], false),
      ...createCollectiveGoals("m-j4-7", "team-santa-maria", [49], true),
      ...createCollectiveGoals("m-j4-7", "team-juventud-madrid", [49], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j4-7", "team-juventud-madrid", [{ min: 34, tipo: 'Amarilla' }]),
      ...createCollectiveCards("m-j4-7", "team-santa-maria", [{ min: 68, tipo: 'Amarilla' }])
    ]
  },

  // --- JORNADA 5 (Oficial RFFM) ---
  {
    id: "m-j5-1",
    jornada: 5,
    fecha: "2026-11-07",
    hora: "12:45",
    campo: "JOSE DURAN (HA)",
    localTeamId: "team-madrid-sur",
    visitanteTeamId: "team-stella-maris",
    golesLocal: 3,
    golesVisitante: 3,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j5-1", "team-madrid-sur", [16, 38, 59], true),
      ...createCollectiveGoals("m-j5-1", "team-stella-maris", [16, 38, 59], false),
      ...createCollectiveGoals("m-j5-1", "team-stella-maris", [24, 49, 68], true),
      ...createCollectiveGoals("m-j5-1", "team-madrid-sur", [24, 49, 68], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j5-1", "team-madrid-sur", [{ min: 32, tipo: 'Amarilla' }]),
      ...createCollectiveCards("m-j5-1", "team-stella-maris", [{ min: 61, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j5-2",
    jornada: 5,
    fecha: "2026-11-08",
    hora: "17:15",
    campo: "ARROYO MEDIA LEGUA (HA)",
    localTeamId: "team-ciudad-madrid",
    visitanteTeamId: "team-inter-victoria",
    golesLocal: 8,
    golesVisitante: 2,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j5-2", "team-ciudad-madrid", [8, 14, 21, 33, 42, 51, 58, 66], true),
      ...createCollectiveGoals("m-j5-2", "team-inter-victoria", [8, 14, 21, 33, 42, 51, 58, 66], false),
      ...createCollectiveGoals("m-j5-2", "team-inter-victoria", [28, 61], true),
      ...createCollectiveGoals("m-j5-2", "team-ciudad-madrid", [28, 61], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j5-2", "team-inter-victoria", [{ min: 45, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j5-3",
    jornada: 5,
    fecha: "2026-11-07",
    hora: "18:00",
    campo: "ARROYO MEDIA LEGUA (HA)",
    localTeamId: "team-retiro-sur",
    visitanteTeamId: "team-afe-b",
    golesLocal: 4,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j5-3", "team-retiro-sur", [11, 29, 47, 63], true),
      ...createCollectiveGoals("m-j5-3", "team-afe-b", [11, 29, 47, 63], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j5-3", "team-afe-b", [{ min: 54, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j5-4",
    jornada: 5,
    fecha: "2026-11-07",
    hora: "17:15",
    campo: "NTRA. SRA. DE LA TORRE (HA)",
    localTeamId: "team-vallecas",
    visitanteTeamId: "team-los-olmos",
    golesLocal: 3,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j5-4", "team-vallecas", [19, 41, 58], true),
      ...createCollectiveGoals("m-j5-4", "team-los-olmos", [19, 41, 58], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j5-4", "team-vallecas", [{ min: 65, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j5-5",
    jornada: 5,
    fecha: "2026-11-07",
    hora: "10:45",
    campo: "SAN LAMBERTO (HA)",
    localTeamId: "team-elipa",
    visitanteTeamId: "team-innova",
    golesLocal: 9,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j5-5", "team-elipa", [5, 12, 19, 27, 34, 43, 50, 57, 65], true),
      ...createCollectiveGoals("m-j5-5", "team-innova", [5, 12, 19, 27, 34, 43, 50, 57, 65], false)
    ],
    cardEvents: []
  },
  {
    id: "m-j5-6",
    jornada: 5,
    fecha: "2026-11-07",
    hora: "12:30",
    campo: "ESC. FUT. CARABANCHEL 1 (HA)",
    localTeamId: "team-carabanchel",
    visitanteTeamId: "team-juventud-madrid",
    golesLocal: 1,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j5-6", "team-carabanchel", [48], true),
      ...createCollectiveGoals("m-j5-6", "team-juventud-madrid", [48], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j5-6", "team-juventud-madrid", [{ min: 66, tipo: 'Amarilla' }])
    ]
  },
  {
    id: "m-j5-7",
    jornada: 5,
    fecha: "2026-11-07",
    hora: "15:00",
    campo: "ASOC. VEC. DEL POZO (HA)",
    localTeamId: "team-del-pozo",
    visitanteTeamId: "team-santa-maria",
    golesLocal: 3,
    golesVisitante: 0,
    jugado: true,
    actaCerrada: true,
    goalEvents: [
      ...createCollectiveGoals("m-j5-7", "team-del-pozo", [22, 51, 64], true),
      ...createCollectiveGoals("m-j5-7", "team-santa-maria", [22, 51, 64], false)
    ],
    cardEvents: [
      ...createCollectiveCards("m-j5-7", "team-santa-maria", [{ min: 39, tipo: 'Amarilla' }])
    ]
  }
];

// Official Referee Match Report Substitutions Data (Jornadas 1 to 4)
// Rules: 70 min matches (1ª Parte: 1-34, Descanso: 35, 2ª Parte: 36-70)
// Anonymous collective data only (minutes per team, without individual player identities)
export const MATCH_SUBSTITUTIONS_DATA: Record<string, Record<string, number[]>> = {
  // --- JORNADA 1 ---
  "m-j1-1": {
    "team-retiro-sur": [35, 35, 45, 52, 60],
    "team-ciudad-madrid": [24, 35, 48, 56]
  },
  "m-j1-2": {
    "team-vallecas": [35, 44, 53, 62],
    "team-madrid-sur": [35, 35, 49, 58]
  },
  "m-j1-3": {
    "team-elipa": [35, 35, 42, 51, 60],
    "team-stella-maris": [28, 35, 46, 55]
  },
  "m-j1-4": {
    "team-carabanchel": [35, 35, 40, 50, 57],
    "team-inter-victoria": [20, 35, 45, 52]
  },
  "m-j1-5": {
    "team-santa-maria": [35, 45, 55, 63],
    "team-afe-b": [35, 35, 47, 56, 64]
  },
  "m-j1-6": {
    "team-juventud-madrid": [35, 43, 52, 61],
    "team-los-olmos": [30, 35, 48, 59]
  },
  "m-j1-7": {
    "team-del-pozo": [35, 35, 44, 54, 62],
    "team-innova": [25, 35, 46, 58]
  },

  // --- JORNADA 2 ---
  "m-j2-1": {
    "team-ciudad-madrid": [35, 44, 52, 60],
    "team-del-pozo": [35, 35, 45, 53, 61]
  },
  "m-j2-2": {
    "team-madrid-sur": [35, 46, 55, 62],
    "team-retiro-sur": [35, 35, 43, 52, 59]
  },
  "m-j2-3": {
    "team-stella-maris": [35, 48, 57, 65],
    "team-vallecas": [35, 35, 47, 56]
  },
  "m-j2-4": {
    "team-inter-victoria": [26, 35, 48, 58],
    "team-elipa": [35, 35, 42, 50, 58]
  },
  "m-j2-5": {
    "team-afe-b": [35, 35, 48, 58, 65],
    "team-carabanchel": [35, 35, 44, 53, 62]
  },
  "m-j2-6": {
    "team-los-olmos": [35, 44, 54, 63],
    "team-santa-maria": [32, 35, 47, 59]
  },
  "m-j2-7": {
    "team-innova": [35, 45, 55, 64],
    "team-juventud-madrid": [35, 35, 48, 58]
  },

  // --- JORNADA 3 ---
  "m-j3-1": {
    "team-ciudad-madrid": [35, 42, 51, 62],
    "team-madrid-sur": [35, 35, 46, 57]
  },
  "m-j3-2": {
    "team-retiro-sur": [35, 35, 44, 51, 60],
    "team-stella-maris": [22, 35, 48, 59]
  },
  "m-j3-3": {
    "team-vallecas": [35, 35, 46, 55, 63],
    "team-inter-victoria": [35, 45, 54, 62]
  },
  "m-j3-4": {
    "team-elipa": [35, 35, 46, 54, 62],
    "team-afe-b": [35, 35, 45, 53, 64]
  },
  "m-j3-5": {
    "team-carabanchel": [35, 35, 43, 52, 61],
    "team-los-olmos": [35, 46, 56, 64]
  },
  "m-j3-6": {
    "team-santa-maria": [35, 44, 53, 62],
    "team-juventud-madrid": [29, 35, 47, 58]
  },
  "m-j3-7": {
    "team-del-pozo": [35, 35, 42, 50, 59],
    "team-innova": [35, 44, 52, 61]
  },

  // --- JORNADA 4 ---
  "m-j4-1": {
    "team-madrid-sur": [35, 45, 54, 63],
    "team-del-pozo": [35, 35, 43, 52, 60]
  },
  "m-j4-2": {
    "team-stella-maris": [35, 35, 46, 55, 64],
    "team-ciudad-madrid": [35, 43, 52, 61]
  },
  "m-j4-3": {
    "team-inter-victoria": [18, 35, 47, 56],
    "team-retiro-sur": [35, 35, 42, 51, 58]
  },
  "m-j4-4": {
    "team-afe-b": [35, 35, 44, 52, 62],
    "team-vallecas": [31, 35, 48, 59]
  },
  "m-j4-5": {
    "team-los-olmos": [35, 45, 55, 64],
    "team-elipa": [35, 35, 43, 51, 59]
  },
  "m-j4-6": {
    "team-juventud-madrid": [35, 44, 53, 62],
    "team-carabanchel": [35, 35, 42, 50, 58]
  },
  "m-j4-7": {
    "team-innova": [35, 46, 56, 65],
    "team-santa-maria": [35, 35, 47, 58]
  },

  // --- JORNADA 5 (Oficial RFFM) ---
  "m-j5-1": {
    "team-madrid-sur": [35, 48, 56, 64],
    "team-stella-maris": [35, 35, 49, 58]
  },
  "m-j5-2": {
    "team-ciudad-madrid": [35, 35, 45, 53, 62],
    "team-inter-victoria": [25, 35, 48, 57]
  },
  "m-j5-3": {
    "team-retiro-sur": [35, 35, 44, 52, 60],
    "team-afe-b": [35, 35, 46, 55, 63]
  },
  "m-j5-4": {
    "team-vallecas": [35, 35, 47, 54, 62],
    "team-los-olmos": [30, 35, 49, 58]
  },
  "m-j5-5": {
    "team-elipa": [35, 35, 42, 50, 58],
    "team-innova": [28, 35, 47, 56]
  },
  "m-j5-6": {
    "team-carabanchel": [35, 35, 43, 52, 61],
    "team-juventud-madrid": [35, 45, 54, 63]
  },
  "m-j5-7": {
    "team-del-pozo": [35, 35, 44, 53, 62],
    "team-santa-maria": [32, 35, 48, 57]
  }
};

// Initialize substitutionEvents on COLLECTIVE_MATCHES
COLLECTIVE_MATCHES.forEach(m => {
  if (!m.substitutionEvents) {
    const subData = MATCH_SUBSTITUTIONS_DATA[m.id];
    if (subData) {
      const subs: CollectiveSubstitutionEvent[] = [];
      Object.entries(subData).forEach(([teamId, minutes]) => {
        subs.push(...createCollectiveSubs(m.id, teamId, minutes, m.jornada));
      });
      m.substitutionEvents = subs;
    }
  }
});

export const RIVAL_MATCHES_COLLECTIVE = COLLECTIVE_MATCHES;

/**
 * Returns current highest synced matchday from localStorage, or 4 by default
 */
export function getActiveSyncedJornada(): number {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rffm_g50_synced_jornadas');
      if (saved) {
        const num = Number(saved);
        if (!isNaN(num) && num > 0) return num;
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'number' && parsed > 0) return parsed;
        if (Array.isArray(parsed) && parsed.length > 0) {
          return Math.max(...parsed);
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return 4;
}

/**
 * Computes all collective statistics for every team across all completed matches,
 * supporting filtering by venue ('all', 'home', 'away').
 */
export function computeAllCollectiveStats(
  matches: RivalMatchCollective[] = COLLECTIVE_MATCHES, 
  venueFilter: 'all' | 'home' | 'away' = 'all',
  upToJornada: number = getActiveSyncedJornada()
): TeamCollectiveStats[] {
  const playedMatches = matches.filter(m => m.jornada <= upToJornada && m.jugado);

  const results: TeamCollectiveStats[] = RIVAL_TEAMS.map(team => {
    // Basic counters
    let pj = 0, pg = 0, pe = 0, pp = 0, gf = 0, gc = 0, puntos = 0;
    
    // Home vs Away
    const home = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, puntos: 0 };
    const away = { pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, puntos: 0 };

    let porteriasCero = 0;
    let partidosSinMarcar = 0;

    // Interval counters
    const intervalMap: Record<Franja15Min, { favor: number; contra: number }> = {
      '0-15': { favor: 0, contra: 0 },
      '16-30': { favor: 0, contra: 0 },
      '31-35': { favor: 0, contra: 0 },
      '36-50': { favor: 0, contra: 0 },
      '51-65': { favor: 0, contra: 0 },
      '66-70': { favor: 0, contra: 0 }
    };

    // Referee match report goal timing records (minuto exacto en acta arbitral)
    let minFavorMinuto = Infinity;
    let minFavorRecord: GoalTimingRecord | null = null;
    let maxFavorMinuto = -Infinity;
    let maxFavorRecord: GoalTimingRecord | null = null;

    let minContraMinuto = Infinity;
    let minContraRecord: GoalTimingRecord | null = null;
    let maxContraMinuto = -Infinity;
    let maxContraRecord: GoalTimingRecord | null = null;

    // Discipline counters
    let amarillas = 0, rojasDirectas = 0, doblesAmarillas = 0;

    // Substitutions state (actas arbitrales RFFM)
    let totalSubs = 0;
    let subs1T = 0;
    let subsDescanso = 0;
    let subs2T = 0;
    let minSubMinuto = Infinity;
    let minSubJornada: number | undefined = undefined;
    let sumSubMinutes = 0;
    const subEventsTeam: CollectiveSubstitutionEvent[] = [];
    const subFranjas = {
      '1-15': 0,
      '16-34': 0,
      '35 (Descanso)': 0,
      '36-50': 0,
      '51-65': 0,
      '66-70': 0
    };

    // Evolution by Jornada
    const evolucionPuntos: { jornada: number; puntos: number; posicion: number }[] = [];
    const evolucionTarjetas: { jornada: number; tarjetas: number }[] = [];

    // Track running points by match
    let runningPoints = 0;
    let runningCards = 0;

    for (let j = 1; j <= upToJornada; j++) {
      const matchJ = playedMatches.find(m => m.jornada === j && (m.localTeamId === team.id || m.visitanteTeamId === team.id));
      if (matchJ && matchJ.golesLocal !== undefined && matchJ.golesVisitante !== undefined) {
        const isHome = matchJ.localTeamId === team.id;
        const myG = isHome ? matchJ.golesLocal : matchJ.golesVisitante;
        const opG = isHome ? matchJ.golesVisitante : matchJ.golesLocal;

        let matchPts = 0;
        if (myG > opG) matchPts = 3;
        else if (myG === opG) matchPts = 1;

        runningPoints += matchPts;
        
        // Count cards in this match
        const matchCards = matchJ.cardEvents.filter(c => c.teamId === team.id).length;
        runningCards += matchCards;

        evolucionPuntos.push({ jornada: j, puntos: runningPoints, posicion: 1 });
        evolucionTarjetas.push({ jornada: j, tarjetas: runningCards });
      }
    }

    // Process all played matches
    playedMatches.forEach(m => {
      const isHome = m.localTeamId === team.id;
      const isAway = m.visitanteTeamId === team.id;
      if (!isHome && !isAway) return;

      const myG = isHome ? (m.golesLocal ?? 0) : (m.golesVisitante ?? 0);
      const opG = isHome ? (m.golesVisitante ?? 0) : (m.golesLocal ?? 0);

      // Home & Away track
      if (isHome) {
        home.pj++;
        home.gf += myG;
        home.gc += opG;
        if (myG > opG) { home.pg++; home.puntos += 3; }
        else if (myG === opG) { home.pe++; home.puntos += 1; }
        else { home.pp++; }
      } else {
        away.pj++;
        away.gf += myG;
        away.gc += opG;
        if (myG > opG) { away.pg++; away.puntos += 3; }
        else if (myG === opG) { away.pe++; away.puntos += 1; }
        else { away.pp++; }
      }

      // Check venue filter
      if (venueFilter === 'home' && !isHome) return;
      if (venueFilter === 'away' && !isAway) return;

      pj++;
      gf += myG;
      gc += opG;
      if (myG > opG) { pg++; puntos += 3; }
      else if (myG === opG) { pe++; puntos += 1; }
      else { pp++; }

      if (opG === 0) porteriasCero++;
      if (myG === 0) partidosSinMarcar++;

      const rivalId = isHome ? m.visitanteTeamId : m.localTeamId;
      const rival = RIVAL_TEAMS.find(t => t.id === rivalId);

      // Tally goal intervals & timing records according to referee sheets
      m.goalEvents.forEach(ge => {
        if (ge.teamId === team.id) {
          if (ge.esFavor) {
            intervalMap[ge.franja].favor++;
            if (ge.minuto < minFavorMinuto) {
              minFavorMinuto = ge.minuto;
              minFavorRecord = { minuto: ge.minuto, jornada: m.jornada, rivalShortName: rival?.shortName };
            }
            if (ge.minuto > maxFavorMinuto) {
              maxFavorMinuto = ge.minuto;
              maxFavorRecord = { minuto: ge.minuto, jornada: m.jornada, rivalShortName: rival?.shortName };
            }
          } else {
            intervalMap[ge.franja].contra++;
            if (ge.minuto < minContraMinuto) {
              minContraMinuto = ge.minuto;
              minContraRecord = { minuto: ge.minuto, jornada: m.jornada, rivalShortName: rival?.shortName };
            }
            if (ge.minuto > maxContraMinuto) {
              maxContraMinuto = ge.minuto;
              maxContraRecord = { minuto: ge.minuto, jornada: m.jornada, rivalShortName: rival?.shortName };
            }
          }
        }
      });

      // Tally discipline
      m.cardEvents.forEach(ce => {
        if (ce.teamId === team.id) {
          if (ce.tipo === 'Amarilla') amarillas++;
          else if (ce.tipo === 'Roja_Directa') rojasDirectas++;
          else if (ce.tipo === 'Doble_Amarilla') doblesAmarillas++;
        }
      });

      // Tally substitutions
      if (m.substitutionEvents) {
        m.substitutionEvents.forEach(se => {
          if (se.teamId === team.id) {
            totalSubs++;
            sumSubMinutes += se.minuto;
            subEventsTeam.push({ ...se, jornada: se.jornada || m.jornada });

            if (se.minuto < 35) {
              subs1T++;
              if (se.minuto <= 15) subFranjas['1-15']++;
              else subFranjas['16-34']++;
            } else if (se.minuto === 35 || se.periodo === 'Descanso') {
              subsDescanso++;
              subFranjas['35 (Descanso)']++;
            } else {
              subs2T++;
              if (se.minuto <= 50) subFranjas['36-50']++;
              else if (se.minuto <= 65) subFranjas['51-65']++;
              else subFranjas['66-70']++;
            }

            if (se.minuto < minSubMinuto) {
              minSubMinuto = se.minuto;
              minSubJornada = m.jornada;
            }
          }
        });
      }
    });

    const dg = gf - gc;
    const promedioGf = pj > 0 ? parseFloat((gf / pj).toFixed(2)) : 0;
    const promedioGc = pj > 0 ? parseFloat((gc / pj).toFixed(2)) : 0;

    // Convert intervals to list
    const intervals: IntervalStats[] = FRANJAS_15M.map(f => {
      const counts = intervalMap[f.franja];
      return {
        franja: f.franja,
        label: f.label,
        periodo: f.periodo,
        golesFavor: counts.favor,
        golesContra: counts.contra,
        porcentajeFavor: gf > 0 ? Math.round((counts.favor / gf) * 100) : 0,
        porcentajeContra: gc > 0 ? Math.round((counts.contra / gc) * 100) : 0
      };
    });

    // Detect max production & max vulnerability intervals
    let maxFavorCount = -1;
    let franjaMayorProduccion: Franja15Min = '0-15';
    let maxContraCount = -1;
    let franjaMayorVulnerabilidad: Franja15Min = '0-15';

    intervals.forEach(i => {
      if (i.golesFavor > maxFavorCount) {
        maxFavorCount = i.golesFavor;
        franjaMayorProduccion = i.franja;
      }
      if (i.golesContra > maxContraCount) {
        maxContraCount = i.golesContra;
        franjaMayorVulnerabilidad = i.franja;
      }
    });

    const totalTarjetas = amarillas + rojasDirectas + doblesAmarillas;
    const promedioPorPartido = pj > 0 ? parseFloat((totalTarjetas / pj).toFixed(2)) : 0;
    const puntosFairPlay = amarillas * 1 + doblesAmarillas * 3 + rojasDirectas * 5;

    // Substitution aggregates
    const promedioSubsPorPartido = pj > 0 ? parseFloat((totalSubs / pj).toFixed(2)) : 0;
    const minutoMedioCambios = totalSubs > 0 ? parseFloat((sumSubMinutes / totalSubs).toFixed(1)) : 0;
    const pct1T = totalSubs > 0 ? Math.round((subs1T / totalSubs) * 100) : 0;
    const pctDescanso = totalSubs > 0 ? Math.round((subsDescanso / totalSubs) * 100) : 0;
    const pct2T = totalSubs > 0 ? Math.round((subs2T / totalSubs) * 100) : 0;

    const substitutions: TeamSubstitutionStats = {
      totalCambios: totalSubs,
      promedioPorPartido: promedioSubsPorPartido,
      cambiosPrimeraParte: subs1T,
      porcentajePrimeraParte: pct1T,
      cambiosDescanso: subsDescanso,
      porcentajeDescanso: pctDescanso,
      cambiosSegundaParte: subs2T,
      porcentajeSegundaParte: pct2T,
      minutoPrimerCambio: minSubMinuto < Infinity ? minSubMinuto : null,
      minutoPrimerCambioJornada: minSubJornada,
      minutoMedioCambios,
      distribucionFranjas: subFranjas,
      eventos: subEventsTeam.sort((a, b) => (a.jornada || 0) - (b.jornada || 0) || a.minuto - b.minuto)
    };

    return {
      team,
      pos: 1,
      puntos,
      pj,
      pg,
      pe,
      pp,
      gf,
      gc,
      dg,
      promedioGf,
      promedioGc,
      home,
      away,
      intervals,
      franjaMayorProduccion,
      franjaMayorVulnerabilidad,
      discipline: {
        amarillas,
        rojasDirectas,
        doblesAmarillas,
        totalTarjetas,
        promedioPorPartido,
        puntosFairPlay
      },
      evolucionPuntos,
      evolucionTarjetas,
      porteriasCero,
      partidosSinMarcar,
      goalTiming: {
        masRapidoMarcado: minFavorRecord,
        masTardioMarcado: maxFavorRecord,
        masRapidoEncajado: minContraRecord,
        masTardioEncajado: maxContraRecord
      },
      substitutions
    };
  });

  // Sort by points, then goal diff, then goals for
  results.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.name.localeCompare(b.team.name);
  });

  // Assign position and recalculate historical position in evolution
  return results.map((item, idx) => {
    const pos = idx + 1;
    return {
      ...item,
      pos,
      evolucionPuntos: item.evolucionPuntos.map(ep => ({ ...ep, posicion: pos }))
    };
  });
}
