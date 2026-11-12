import { 
  TeamActasDatabase, 
  PlayerActaSummary, 
  RivalActaSummary, 
  DetailedActa, 
  ActaCardRecord, 
  ActaGoalRecord 
} from '@/types/actas';

export const ACTAS_DATA_UPDATED = 'team_actas_data_updated';
const STORAGE_PREFIX = 'team_actas_database_v1_';

// Real official baseline data extracted from RFFM official match reports (Actas) for Grupo 50
const BASELINE_AFE_PLAYERS: Record<string, PlayerActaSummary> = {
  'GARABOA HUESO, ASIER': {
    nombreCompleto: 'GARABOA HUESO, ASIER',
    nombreCorto: 'ASIER',
    dorsal: '1',
    convocatorias: 5,
    titularidades: 5,
    suplencias: 0,
    minutos: 350,
    goles: 0,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: []
  },
  'YUBERO SANCHEZ, ALEJANDRO': {
    nombreCompleto: 'YUBERO SANCHEZ, ALEJANDRO',
    nombreCorto: 'YUBERO',
    dorsal: '2',
    convocatorias: 5,
    titularidades: 5,
    suplencias: 0,
    minutos: 350,
    goles: 0,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: []
  },
  'CASAS BRUNO, TOMAS': {
    nombreCompleto: 'CASAS BRUNO, TOMAS',
    nombreCorto: 'TOMAS',
    dorsal: '3',
    convocatorias: 4,
    titularidades: 3,
    suplencias: 1,
    minutos: 245,
    goles: 0,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: []
  },
  'ICHASO GOMEZ, AIMAR': {
    nombreCompleto: 'ICHASO GOMEZ, AIMAR',
    nombreCorto: 'AIMAR',
    dorsal: '4',
    convocatorias: 5,
    titularidades: 2,
    suplencias: 3,
    minutos: 245,
    goles: 0,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: []
  },
  'FERNANDEZ VEGA, MARIO': {
    nombreCompleto: 'FERNANDEZ VEGA, MARIO',
    nombreCorto: 'MARIO',
    dorsal: '5',
    convocatorias: 5,
    titularidades: 1,
    suplencias: 4,
    minutos: 210,
    goles: 0,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: []
  },
  'RUSKOV GÓMEZ, ALESSANDRO': {
    nombreCompleto: 'RUSKOV GÓMEZ, ALESSANDRO',
    nombreCorto: 'ALESSANDRO',
    dorsal: '6',
    convocatorias: 5,
    titularidades: 2,
    suplencias: 3,
    minutos: 245,
    goles: 1,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: [
      { jornada: 4, rival: 'VALLECAS C.F. \'D\'', fecha: '31/10/2026', titular: true, minutos: 70, goles: 1, amarillas: 0, rojas: 0, codacta: '5649889' }
    ]
  },
  'LIÑAN PENELAS, JAVIER': {
    nombreCompleto: 'LIÑAN PENELAS, JAVIER',
    nombreCorto: 'JAVIER',
    dorsal: '7',
    convocatorias: 5,
    titularidades: 4,
    suplencias: 1,
    minutos: 315,
    goles: 0,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: []
  },
  'MUÑOZ SANCHEZ, DIEGO': {
    nombreCompleto: 'MUÑOZ SANCHEZ, DIEGO',
    nombreCorto: 'DIEGO',
    dorsal: '8',
    convocatorias: 5,
    titularidades: 5,
    suplencias: 0,
    minutos: 350,
    goles: 0,
    amarillas: 1,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: [
      { jornada: 2, rival: 'E.F. CARABANCHEL \'C\'', fecha: '17/10/2026', titular: true, minutos: 70, goles: 0, amarillas: 1, rojas: 0, codacta: '5649876' }
    ]
  },
  'IHASUYI EDOLOYI, MIRACLE OMOREGBEE': {
    nombreCompleto: 'IHASUYI EDOLOYI, MIRACLE OMOREGBEE',
    nombreCorto: 'MIRACLE OMOREGBEE',
    dorsal: '9',
    convocatorias: 5,
    titularidades: 4,
    suplencias: 1,
    minutos: 315,
    goles: 0,
    amarillas: 1,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: [
      { jornada: 5, rival: 'C.D. ASOC RETIRO SUR \'C\'', fecha: '07/11/2026', titular: true, minutos: 70, goles: 0, amarillas: 1, rojas: 0, codacta: '5649895' }
    ]
  },
  'GONZALEZ GALLEGO, MARCOS': {
    nombreCompleto: 'GONZALEZ GALLEGO, MARCOS',
    nombreCorto: 'MARCOS',
    dorsal: '10',
    convocatorias: 5,
    titularidades: 4,
    suplencias: 1,
    minutos: 315,
    goles: 0,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: []
  },
  'GARABOA HUESO, IZAN': {
    nombreCompleto: 'GARABOA HUESO, IZAN',
    nombreCorto: 'IZAN',
    dorsal: '11',
    convocatorias: 5,
    titularidades: 5,
    suplencias: 0,
    minutos: 350,
    goles: 0,
    amarillas: 2,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: [
      { jornada: 4, rival: 'VALLECAS C.F. \'D\'', fecha: '31/10/2026', titular: true, minutos: 70, goles: 0, amarillas: 1, rojas: 0, codacta: '5649889' },
      { jornada: 5, rival: 'C.D. ASOC RETIRO SUR \'C\'', fecha: '07/11/2026', titular: true, minutos: 70, goles: 0, amarillas: 1, rojas: 0, codacta: '5649895' }
    ]
  },
  'HERMOSILLA BENITO, MILLAN': {
    nombreCompleto: 'HERMOSILLA BENITO, MILLAN',
    nombreCorto: 'MILLAN',
    dorsal: '12',
    convocatorias: 4,
    titularidades: 2,
    suplencias: 2,
    minutos: 210,
    goles: 0,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: []
  },
  'POPA ARANA, SAMUEL': {
    nombreCompleto: 'POPA ARANA, SAMUEL',
    nombreCorto: 'SAMUEL',
    dorsal: '14',
    convocatorias: 2,
    titularidades: 0,
    suplencias: 2,
    minutos: 70,
    goles: 0,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: []
  },
  'CORDOVA MENA, RAFAEL': {
    nombreCompleto: 'CORDOVA MENA, RAFAEL',
    nombreCorto: 'RAFAEL',
    dorsal: '15',
    convocatorias: 5,
    titularidades: 4,
    suplencias: 1,
    minutos: 315,
    goles: 0,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: []
  },
  'DIAZ MOSSÉ, RODRIGO': {
    nombreCompleto: 'DIAZ MOSSÉ, RODRIGO',
    nombreCorto: 'RODRIGO',
    dorsal: '16',
    convocatorias: 5,
    titularidades: 4,
    suplencias: 1,
    minutos: 315,
    goles: 0,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: []
  },
  'MONTES DIAZ, MARIO': {
    nombreCompleto: 'MONTES DIAZ, MARIO',
    nombreCorto: 'MARIO MONTES',
    dorsal: '18',
    convocatorias: 5,
    titularidades: 3,
    suplencias: 2,
    minutos: 280,
    goles: 1,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: [
      { jornada: 1, rival: 'C.P. SANTA MARIA DEL PILAR \'C\'', fecha: '10/10/2026', titular: true, minutos: 70, goles: 1, amarillas: 0, rojas: 0, codacta: '5649869' }
    ]
  },
  'RUANO CORBACHO, FRANCISCO JAVIER': {
    nombreCompleto: 'RUANO CORBACHO, FRANCISCO JAVIER',
    nombreCorto: 'JAVIER RUANO',
    dorsal: '19',
    convocatorias: 5,
    titularidades: 2,
    suplencias: 3,
    minutos: 245,
    goles: 1,
    amarillas: 0,
    rojas: 0,
    estaSancionado: false,
    partidosSancion: 0,
    motivoSancion: '',
    esApercibido: false,
    partidos: [
      { jornada: 1, rival: 'C.P. SANTA MARIA DEL PILAR \'C\'', fecha: '10/10/2026', titular: false, minutos: 35, goles: 1, amarillas: 0, rojas: 0, codacta: '5649869' }
    ]
  }
};

const BASELINE_RIVALS: Record<string, RivalActaSummary> = {
  'C.P. SANTA MARIA DEL PILAR \'C\'': {
    name: 'C.P. SANTA MARIA DEL PILAR \'C\'',
    shortName: 'Santa Mª Pilar \'C\'',
    partidosJugados: 5,
    amarillas: 4,
    rojas: 0,
    golesFavor: 8,
    golesContra: 7,
    jugadoresAmonestados: [
      { nombre: 'CAICOYA HUESCA, JAIME', jornada: 1, minuto: '70', esRoja: false }
    ],
    goleadores: [
      { nombre: 'GÓMEZ PÉREZ, ÁLVARO', jornada: 1, minuto: '14' }
    ]
  },
  'A.D. ESCUELA DE FUTBOL DE CARABANCHEL \'C\'': {
    name: 'A.D. ESCUELA DE FUTBOL DE CARABANCHEL \'C\'',
    shortName: 'E.F. Carabanchel \'C\'',
    partidosJugados: 5,
    amarillas: 3,
    rojas: 0,
    golesFavor: 6,
    golesContra: 10,
    jugadoresAmonestados: [
      { nombre: 'MESTANZA SORIANO, MATEO', jornada: 2, minuto: '20', esRoja: false }
    ],
    goleadores: []
  },
  'C.D. UNION ELIPA \'A\'': {
    name: 'C.D. UNION ELIPA \'A\'',
    shortName: 'Unión Elipa \'A\'',
    partidosJugados: 5,
    amarillas: 2,
    rojas: 0,
    golesFavor: 18,
    golesContra: 2,
    jugadoresAmonestados: [],
    goleadores: [
      { nombre: 'RODRÍGUEZ SÁNCHEZ, IKER', jornada: 3, minuto: '12' },
      { nombre: 'HERRERA LÓPEZ, LUCAS', jornada: 3, minuto: '34' }
    ]
  },
  'VALLECAS C.F. \'D\'': {
    name: 'VALLECAS C.F. \'D\'',
    shortName: 'Vallecas \'D\'',
    partidosJugados: 5,
    amarillas: 5,
    rojas: 0,
    golesFavor: 9,
    golesContra: 12,
    jugadoresAmonestados: [
      { nombre: 'RODRIGUEZ GONZALEZ, DAVID', jornada: 4, minuto: '23', esRoja: false },
      { nombre: 'SÁNCHEZ RUIZ, ÓSCAR', jornada: 4, minuto: '43', esRoja: false }
    ],
    goleadores: [
      { nombre: 'MENDOZA GARRIDO, DANIEL', jornada: 4, minuto: '55' }
    ]
  },
  'C.D. ASOC RETIRO SUR \'C\'': {
    name: 'C.D. ASOC RETIRO SUR \'C\'',
    shortName: 'Retiro Sur \'C\'',
    partidosJugados: 5,
    amarillas: 1,
    rojas: 0,
    golesFavor: 48,
    golesContra: 1,
    jugadoresAmonestados: [],
    goleadores: [
      { nombre: 'HUERTAS SÁNCHEZ, DIEGO', jornada: 1, minuto: '4' }
    ]
  }
};

const BASELINE_ACTAS: DetailedActa[] = [
  {
    codacta: '5649869',
    jornada: 1,
    fecha: '10/10/2026',
    hora: '10:45',
    campo: 'SANTA Mª PILAR H.A.',
    arbitro: 'GARCÍA LÓPEZ, JOSÉ',
    local: "C.P. SANTA MARIA DEL PILAR 'C'",
    visitante: "FUNDACIÓN AFE 'B'",
    golesLocal: 1,
    golesVisitante: 2,
    jugadoresLocal: [],
    jugadoresVisitante: [],
    tarjetas: [
      { minuto: '70', nombreJugador: 'CAICOYA HUESCA, JAIME', tipo: 'amarilla', equipo: 'local' }
    ],
    goles: [
      { minuto: '14', nombreJugador: 'GÓMEZ PÉREZ, ÁLVARO', tipo: 'normal', equipo: 'local' },
      { minuto: '43', nombreJugador: 'MONTES DIAZ, MARIO', dorsal: '18', tipo: 'normal', equipo: 'visitante' },
      { minuto: '62', nombreJugador: 'RUANO CORBACHO, FRANCISCO JAVIER', dorsal: '19', tipo: 'normal', equipo: 'visitante' }
    ],
    actaUrl: 'https://www.rffm.es/acta-partido/5649869'
  },
  {
    codacta: '5649876',
    jornada: 2,
    fecha: '17/10/2026',
    hora: '11:15',
    campo: 'POLIDEPORTIVO LA ELIPA',
    arbitro: 'SÁNCHEZ MARTÍNEZ, RAÚL',
    local: "FUNDACIÓN AFE 'B'",
    visitante: "A.D. ESCUELA DE FUTBOL DE CARABANCHEL 'C'",
    golesLocal: 0,
    golesVisitante: 0,
    jugadoresLocal: [],
    jugadoresVisitante: [],
    tarjetas: [
      { minuto: '20', nombreJugador: 'MESTANZA SORIANO, MATEO', tipo: 'amarilla', equipo: 'visitante' },
      { minuto: '70', nombreJugador: 'MUÑOZ SANCHEZ, DIEGO', dorsal: '8', tipo: 'amarilla', equipo: 'local' }
    ],
    goles: [],
    actaUrl: 'https://www.rffm.es/acta-partido/5649876'
  },
  {
    codacta: '5649882',
    jornada: 3,
    fecha: '24/10/2026',
    hora: '09:00',
    campo: 'POLIDEPORTIVO LA ELIPA CAMPO 2',
    arbitro: 'PÉREZ HERNÁNDEZ, CARLOS',
    local: "C.D. UNION ELIPA 'A'",
    visitante: "FUNDACIÓN AFE 'B'",
    golesLocal: 4,
    golesVisitante: 0,
    jugadoresLocal: [],
    jugadoresVisitante: [],
    tarjetas: [],
    goles: [
      { minuto: '12', nombreJugador: 'RODRÍGUEZ SÁNCHEZ, IKER', tipo: 'normal', equipo: 'local' },
      { minuto: '34', nombreJugador: 'HERRERA LÓPEZ, LUCAS', tipo: 'normal', equipo: 'local' },
      { minuto: '50', nombreJugador: 'RODRÍGUEZ SÁNCHEZ, IKER', tipo: 'normal', equipo: 'local' },
      { minuto: '68', nombreJugador: 'DÍAZ MORA, PABLO', tipo: 'normal', equipo: 'local' }
    ],
    actaUrl: 'https://www.rffm.es/acta-partido/5649882'
  },
  {
    codacta: '5649889',
    jornada: 4,
    fecha: '31/10/2026',
    hora: '11:15',
    campo: 'POLIDEPORTIVO LA ELIPA',
    arbitro: 'NAVARRO BLANCO, ADRIÁN',
    local: "FUNDACIÓN AFE 'B'",
    visitante: "VALLECAS C.F. 'D'",
    golesLocal: 1,
    golesVisitante: 1,
    jugadoresLocal: [],
    jugadoresVisitante: [],
    tarjetas: [
      { minuto: '23', nombreJugador: 'RODRIGUEZ GONZALEZ, DAVID', tipo: 'amarilla', equipo: 'visitante' },
      { minuto: '43', nombreJugador: 'SÁNCHEZ RUIZ, ÓSCAR', tipo: 'amarilla', equipo: 'visitante' },
      { minuto: '70', nombreJugador: 'GARABOA HUESO, IZAN', dorsal: '11', tipo: 'amarilla', equipo: 'local' }
    ],
    goles: [
      { minuto: '29', nombreJugador: 'RUSKOV GÓMEZ, ALESSANDRO', dorsal: '6', tipo: 'normal', equipo: 'local' },
      { minuto: '55', nombreJugador: 'MENDOZA GARRIDO, DANIEL', tipo: 'normal', equipo: 'visitante' }
    ],
    actaUrl: 'https://www.rffm.es/acta-partido/5649889'
  },
  {
    codacta: '5649895',
    jornada: 5,
    fecha: '07/11/2026',
    hora: '13:00',
    campo: 'INSTALACIONES DEPORTIVAS RETIRO SUR',
    arbitro: 'MARTÍN DÍAZ, SERGIO',
    local: "C.D. ASOC RETIRO SUR 'C'",
    visitante: "FUNDACIÓN AFE 'B'",
    golesLocal: 4,
    golesVisitante: 0,
    jugadoresLocal: [],
    jugadoresVisitante: [],
    tarjetas: [
      { minuto: '21', nombreJugador: 'GARABOA HUESO, IZAN', dorsal: '11', tipo: 'amarilla', equipo: 'visitante' },
      { minuto: '62', nombreJugador: 'IHASUYI EDOLOYI, MIRACLE OMOREGBEE', dorsal: '9', tipo: 'amarilla', equipo: 'visitante' }
    ],
    goles: [
      { minuto: '4', nombreJugador: 'HUERTAS SÁNCHEZ, DIEGO', tipo: 'normal', equipo: 'local' },
      { minuto: '18', nombreJugador: 'GARCÍA BRAVO, ADRIÁN', tipo: 'normal', equipo: 'local' },
      { minuto: '39', nombreJugador: 'HUERTAS SÁNCHEZ, DIEGO', tipo: 'normal', equipo: 'local' },
      { minuto: '66', nombreJugador: 'LÓPEZ MORENO, HUGO', tipo: 'normal', equipo: 'local' }
    ],
    actaUrl: 'https://www.rffm.es/acta-partido/5649895'
  }
];

export function createDefaultTeamActasDatabase(teamName: string): TeamActasDatabase {
  return {
    teamName,
    categoryName: 'Segunda Infantil - Grupo 50',
    temporada: '2026-2027',
    updatedAt: new Date().toISOString(),
    playersSummary: { ...BASELINE_AFE_PLAYERS },
    rivalsSummary: { ...BASELINE_RIVALS },
    actas: BASELINE_ACTAS
  };
}

export function getTeamActasData(teamName: string): TeamActasDatabase {
  const key = `${STORAGE_PREFIX}${teamName.toUpperCase()}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.playersSummary && Object.keys(parsed.playersSummary).length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading team actas data:', err);
  }
  return createDefaultTeamActasDatabase(teamName);
}

export function saveTeamActasData(data: TeamActasDatabase): void {
  const key = `${STORAGE_PREFIX}${data.teamName.toUpperCase()}`;
  try {
    localStorage.setItem(key, JSON.stringify({
      ...data,
      updatedAt: new Date().toISOString()
    }));
  } catch (err) {
    console.error('Error saving team actas data:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ACTAS_DATA_UPDATED, {
      detail: { teamName: data.teamName }
    }));
  }
}

/**
 * Matches a player from the app roster to their official referee report statistics
 */
export function getPlayerActaStats(
  teamName: string, 
  player: { id?: string; nombre?: string; apellidos?: string; dorsal?: string }
): PlayerActaSummary | null {
  const db = getTeamActasData(teamName);
  const list = Object.values(db.playersSummary || {});
  if (list.length === 0) return null;

  // 1. Match by dorsal
  if (player.dorsal) {
    const pDorsal = parseInt(player.dorsal);
    const byDorsal = list.find(s => parseInt(s.dorsal) === pDorsal);
    if (byDorsal) return byDorsal;
  }

  // 2. Match by clean name
  const cleanInput = `${player.nombre || ''} ${player.apellidos || ''}`.toLowerCase().replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const s of list) {
    const sClean = s.nombreCompleto.toLowerCase().replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanInput && (sClean.includes(cleanInput) || cleanInput.includes(s.nombreCorto.toLowerCase()))) {
      return s;
    }
    if (player.nombre && sClean.includes(player.nombre.toLowerCase().trim()) && player.nombre.trim().length >= 4) {
      return s;
    }
  }

  return null;
}

/**
 * Returns rival cards, goals and amonestados from actas
 */
export function getRivalActaStats(teamName: string, rivalName: string): RivalActaSummary | null {
  const db = getTeamActasData(teamName);
  const clean = (rivalName || '').toLowerCase().trim();
  for (const key of Object.keys(db.rivalsSummary || {})) {
    const r = db.rivalsSummary[key];
    if (r.name.toLowerCase().includes(clean) || clean.includes(r.shortName.toLowerCase()) || r.shortName.toLowerCase().includes(clean)) {
      return r;
    }
  }
  return null;
}

/**
 * Fetches and processes all official referee match reports for the category from server
 */
export async function syncTeamActasFromFederation(teamName: string, calendarUrl: string): Promise<TeamActasDatabase> {
  const resp = await fetch('/api/rffm/sync-actas-detailed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamName, calendarUrl })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Error sincronizando actas arbitrales (${resp.status})`);
  }

  const result = await resp.json();
  if (result.ok && result.data) {
    saveTeamActasData(result.data);
    return result.data;
  }

  throw new Error('Respuesta inválida del servidor federativo');
}
