export type Role = 'admin' | 'scout';

export interface User {
  id: string;
  nombre: string;
  email: string;
  role: Role;
  allowedModules?: string[];
  uidLocked?: boolean;
  created_at?: string;
}

export type PlayerStatus = 'Observado' | 'En seguimiento' | 'Interesa' | 'Fichado' | 'Rechazado';
export type ContactType = 'Padre' | 'Madre' | 'Jugador';
export type Lateralidad = 'Izquierdo' | 'Derecho' | 'Ambidiestro';

export interface Player {
  id: string;
  nombre: string;
  apellidos: string;
  apodo?: string;
  telefono?: string;
  email?: string; // New field for player/family email
  contacto_tipo?: ContactType;
  equipo_actual?: string;
  equipo_asignado?: string; // New field for assigned team in Fundación AFE
  dorsal?: string;
  posicion: string;
  posicion_secundaria?: string;
  lateralidad?: Lateralidad;
  anio_nacimiento?: number;
  fecha_nacimiento?: string;
  foto_url?: string;
  observaciones?: string;
  motivos_rechazo?: string;
  fecha_seguimiento?: string;
  potencial: number; // 1-5
  estado: PlayerStatus;
  observador?: string; // name of the observer/scout
  created_by?: string;
  created_at?: string;
  attributes?: PlayerAttribute[];
  tags?: string[];
}

export interface Observer {
  id: string;
  nombre: string;
  foto_url?: string;
  created_at?: string;
}

export interface Need {
  id: string;
  equipo: string;
  posicion: string;
  solicitante: string;
  observaciones?: string;
  created_by?: string;
  created_at?: string;
}

export interface PlayerAttribute {
  player_id: string;
  atributo: string;
  valor: number; // 0-5
}

export interface Coach {
  id: string;
  nombre: string;
  club: string;
  equipo: string;
  categoria: string;
  edad?: number;
  email?: string; // New field for coach email
  telefono?: string; // New field for coach phone number
  observaciones?: string;
  equipo_asignado?: string; // New field for assigned team in Fundación AFE
  created_by?: string;
  created_at?: string;
}

export interface ClubTeamRegistryItem {
  /** Identificador interno único e inmutable del equipo (independiente del nombre visible) */
  teamId: string;
  /** Código interno estable */
  code: string;
  /** Nombre visible actual del equipo en la interfaz */
  displayName: string;
  /** Alias históricos o alternativos reconocidos para este mismo equipo */
  aliases: string[];
}

export const CLUB_TEAM_REGISTRY: readonly ClubTeamRegistryItem[] = [
  {
    teamId: 'team_01_senior_femenino',
    code: 'SENIOR_FEMENINO',
    displayName: 'SENIOR FEMENINO',
    aliases: ['SENIOR FEMENINO', 'SENIOR FEM', 'team_01_senior_femenino'],
  },
  {
    teamId: 'team_02_senior_masculino',
    code: 'SENIOR_MASCULINO',
    displayName: 'SENIOR MASCULINO',
    aliases: ['SENIOR MASCULINO', 'SENIOR MASC', 'team_02_senior_masculino'],
  },
  {
    teamId: 'team_03_juvenil_a',
    code: 'JUVENIL_A',
    displayName: 'JUVENIL A',
    aliases: ['JUVENIL A', 'team_03_juvenil_a'],
  },
  {
    teamId: 'team_04_juvenil_b',
    code: 'JUVENIL_B',
    displayName: 'JUVENIL B',
    aliases: ['JUVENIL B', 'team_04_juvenil_b'],
  },
  {
    teamId: 'team_05_cadete_a',
    code: 'CADETE_A',
    displayName: 'CADETE A',
    aliases: ['CADETE A', 'team_05_cadete_a'],
  },
  {
    teamId: 'team_06_cadete_b',
    code: 'CADETE_B',
    displayName: 'CADETE B',
    aliases: ['CADETE B', 'team_06_cadete_b'],
  },
  {
    teamId: 'team_07_infantil_a',
    code: 'INFANTIL_A',
    displayName: 'INFANTIL A',
    aliases: ['INFANTIL A', 'team_07_infantil_a'],
  },
  {
    teamId: 'team_08_infantil_b',
    code: 'INFANTIL_B',
    displayName: 'INFANTIL B',
    aliases: ['INFANTIL B', 'team_08_infantil_b'],
  },
  {
    teamId: 'team_09_infantil_c',
    code: 'INFANTIL_C',
    displayName: 'INFANTIL C',
    aliases: ['INFANTIL C', 'team_09_infantil_c'],
  },
  {
    teamId: 'team_10_alevin_a_f11',
    code: 'ALEVIN_A_F11',
    displayName: 'ALEVIN A F11',
    aliases: ['ALEVIN A F11', 'ALEVÍN A F11', 'team_10_alevin_a_f11'],
  },
  {
    teamId: 'team_11_alevin_a_f7',
    code: 'ALEVIN_A_F7',
    displayName: 'ALEVIN A F7',
    aliases: ['ALEVIN A F7', 'ALEVÍN A F7', 'team_11_alevin_a_f7'],
  },
  {
    teamId: 'team_12_alevin_b_f7',
    code: 'ALEVIN_B_F7',
    displayName: 'ALEVIN B F7',
    aliases: ['ALEVIN B F7', 'ALEVÍN B F7', 'team_12_alevin_b_f7'],
  },
  {
    teamId: 'team_13_benjamin_a',
    code: 'BENJAMIN_A',
    displayName: 'BENJAMIN A',
    aliases: ['BENJAMIN A', 'BENJAMÍN A', 'team_13_benjamin_a'],
  },
  {
    teamId: 'team_14_benjamin_b',
    code: 'BENJAMIN_B',
    displayName: 'BENJAMIN B',
    aliases: ['BENJAMIN B', 'BENJAMÍN B', 'team_14_benjamin_b'],
  },
  {
    teamId: 'team_15_benjamin_c',
    code: 'BENJAMIN_C',
    displayName: 'BENJAMIN C',
    aliases: ['BENJAMIN C', 'BENJAMÍN C', 'team_15_benjamin_c'],
  },
  {
    teamId: 'team_16_pre_benjamin_a',
    code: 'PRE_BENJAMIN_A',
    displayName: 'PRE BENJAMIN A',
    aliases: ['PRE BENJAMIN A', 'PREBENJAMIN A', 'PRE BENJAMÍN A', 'team_16_pre_benjamin_a'],
  },
  {
    teamId: 'team_17_prebenjamin_b',
    code: 'PREBENJAMIN_B',
    displayName: 'PREBENJAMIN B',
    aliases: ['PREBENJAMIN B', 'PRE BENJAMIN B', 'PREBENJAMÍN B', 'team_17_prebenjamin_b'],
  },
];

export const CLUB_TEAMS = CLUB_TEAM_REGISTRY.map((t) => t.displayName);


export interface AttributeGroup {
  category: string;
  items: string[];
}

export const POSITION_STRUCTURED_ATTRIBUTES: Record<string, AttributeGroup[]> = {
  PORTERO: [
    { category: 'Aspecto técnico', items: ['Blocaje', 'Desvíos', 'Juego aéreo', 'Uno contra uno', 'Reflejos', 'Paradas de media/larga distancia', 'Juego con los pies', 'Pase corto', 'Pase largo', 'Saque con mano', 'Saque con pie'] },
    { category: 'Aspecto táctico', items: ['Colocación', 'Lectura del juego', 'Cobertura de espacios', 'Anticipación', 'Comunicación con la defensa'] },
    { category: 'Aspecto físico', items: ['Agilidad', 'Explosividad', 'Velocidad de reacción', 'Fuerza', 'Coordinación'] },
    { category: 'Aspecto mental', items: ['Concentración', 'Personalidad', 'Toma de decisiones', 'Liderazgo', 'Gestión de la presión'] }
  ],
  CENTRAL: [
    { category: 'Defensa', items: ['Marcaje', 'Anticipación', 'Entradas', 'Timing defensivo', 'Interceptaciones', 'Coberturas', 'Duelos aéreos', 'Duelos terrestres'] },
    { category: 'Construcción', items: ['Primer pase', 'Pase medio', 'Pase largo', 'Cambio de orientación', 'Conducción', 'Salida de balón bajo presión'] },
    { category: 'Táctica', items: ['Posicionamiento', 'Coordinación de la línea defensiva', 'Lectura del juego', 'Defensa del área'] },
    { category: 'Físico', items: ['Velocidad', 'Potencia', 'Fuerza', 'Resistencia'] },
    { category: 'Mental', items: ['Concentración', 'Liderazgo', 'Agresividad competitiva', 'Calma con balón'] }
  ],
  LATERAL: [
    { category: 'Defensa', items: ['1 vs 1 defensivo', 'Entradas', 'Anticipación', 'Coberturas', 'Defensa del segundo palo'] },
    { category: 'Ataque', items: ['Incorporación ofensiva', 'Centros', 'Pase', 'Conducción', 'Regate', 'Asociación'] },
    { category: 'Táctica', items: ['Ocupación de espacios', 'Temporización', 'Lectura ofensiva', 'Lectura defensiva'] },
    { category: 'Físico', items: ['Velocidad', 'Resistencia', 'Aceleración', 'Capacidad de repetir esfuerzos'] },
    { category: 'Mental', items: ['Intensidad', 'Competitividad', 'Concentración'] }
  ],
  'LATERAL DERECHO': [
    { category: 'Defensa', items: ['1 vs 1 defensivo', 'Entradas', 'Anticipación', 'Coberturas', 'Defensa del segundo palo'] },
    { category: 'Ataque', items: ['Incorporación ofensiva', 'Centros', 'Pase', 'Conducción', 'Regate', 'Asociación'] },
    { category: 'Táctica', items: ['Ocupación de espacios', 'Temporización', 'Lectura ofensiva', 'Lectura defensiva'] },
    { category: 'Físico', items: ['Velocidad', 'Resistencia', 'Aceleración', 'Capacidad de repetir esfuerzos'] },
    { category: 'Mental', items: ['Intensidad', 'Competitividad', 'Concentración'] }
  ],
  'LATERAL IZQUIERDO': [
    { category: 'Defensa', items: ['1 vs 1 defensivo', 'Entradas', 'Anticipación', 'Coberturas', 'Defensa del segundo palo'] },
    { category: 'Ataque', items: ['Incorporación ofensiva', 'Centros', 'Pase', 'Conducción', 'Regate', 'Asociación'] },
    { category: 'Táctica', items: ['Ocupación de espacios', 'Temporización', 'Lectura ofensiva', 'Lectura defensiva'] },
    { category: 'Físico', items: ['Velocidad', 'Resistencia', 'Aceleración', 'Capacidad de repetir esfuerzos'] },
    { category: 'Mental', items: ['Intensidad', 'Competitividad', 'Concentración'] }
  ],
  'MEDIO CENTRO DEFENSIVO': [
    { category: 'Defensa', items: ['Recuperación', 'Interceptaciones', 'Duelos', 'Coberturas', 'Presión tras pérdida'] },
    { category: 'Organización', items: ['Primer pase', 'Cambios de orientación', 'Juego entre líneas', 'Ritmo del juego', 'Conservación del balón'] },
    { category: 'Táctica', items: ['Posicionamiento', 'Lectura del juego', 'Equilibrio del equipo', 'Ayudas defensivas'] },
    { category: 'Físico', items: ['Resistencia', 'Fuerza', 'Movilidad'] },
    { category: 'Mental', items: ['Toma de decisiones', 'Inteligencia táctica', 'Personalidad', 'Serenidad'] }
  ],
  PIVOTE: [
    { category: 'Defensa', items: ['Recuperación', 'Interceptaciones', 'Duelos', 'Coberturas', 'Presión tras pérdida'] },
    { category: 'Organización', items: ['Primer pase', 'Cambios de orientación', 'Juego entre líneas', 'Ritmo del juego', 'Conservación del balón'] },
    { category: 'Táctica', items: ['Posicionamiento', 'Lectura del juego', 'Equilibrio del equipo', 'Ayudas defensivas'] },
    { category: 'Físico', items: ['Resistencia', 'Fuerza', 'Movilidad'] },
    { category: 'Mental', items: ['Toma de decisiones', 'Inteligencia táctica', 'Personalidad', 'Serenidad'] }
  ],
  INTERIOR: [
    { category: 'Ataque', items: ['Pase', 'Pase filtrado', 'Conducción', 'Regate', 'Llegada al área', 'Disparo'] },
    { category: 'Defensa', items: ['Presión', 'Recuperación', 'Ayudas'] },
    { category: 'Táctica', items: ['Movilidad', 'Ocupación de espacios', 'Juego entre líneas', 'Interpretación del juego'] },
    { category: 'Físico', items: ['Resistencia', 'Dinamismo', 'Intensidad'] },
    { category: 'Mental', items: ['Creatividad', 'Decisión', 'Competitividad'] }
  ],
  MEDIOCAMPISTA: [
    { category: 'Ataque', items: ['Pase', 'Pase filtrado', 'Conducción', 'Regate', 'Llegada al área', 'Disparo'] },
    { category: 'Defensa', items: ['Presión', 'Recuperación', 'Ayudas'] },
    { category: 'Táctica', items: ['Movilidad', 'Ocupación de espacios', 'Juego entre líneas', 'Interpretación del juego'] },
    { category: 'Físico', items: ['Resistencia', 'Dinamismo', 'Intensidad'] },
    { category: 'Mental', items: ['Creatividad', 'Decisión', 'Competitividad'] }
  ],
  'MEDIA PUNTA': [
    { category: 'Creatividad', items: ['Último pase', 'Visión', 'Juego entre líneas', 'Asociación', 'Regate'] },
    { category: 'Finalización', items: ['Disparo', 'Definición', 'Llegada al área'] },
    { category: 'Táctica', items: ['Movimientos entre líneas', 'Recepción orientada', 'Lectura ofensiva'] },
    { category: 'Físico', items: ['Agilidad', 'Cambios de ritmo'] },
    { category: 'Mental', items: ['Imaginación', 'Toma de decisiones', 'Personalidad'] }
  ],
  EXTREMO: [
    { category: 'Desequilibrio', items: ['Regate', 'Uno contra uno', 'Cambios de ritmo', 'Velocidad'] },
    { category: 'Producción ofensiva', items: ['Centro', 'Pase atrás', 'Asistencia'] },
    { category: 'Definición', items: ['Disparo'] },
    { category: 'Táctica', items: ['Desmarques', 'Ataque al espacio', 'Amplitud', 'Juego interior'] },
    { category: 'Defensa', items: ['Repliegue', 'Presión'] },
    { category: 'Mental', items: ['Atrevimiento', 'Confianza', 'Capacidad competitiva'] }
  ],
  'EXTREMO DERECHO': [
    { category: 'Desequilibrio', items: ['Regate', 'Uno contra uno', 'Cambios de ritmo', 'Velocidad'] },
    { category: 'Producción ofensiva', items: ['Centro', 'Pase atrás', 'Asistencia'] },
    { category: 'Definición', items: ['Disparo'] },
    { category: 'Táctica', items: ['Desmarques', 'Ataque al espacio', 'Amplitud', 'Juego interior'] },
    { category: 'Defensa', items: ['Repliegue', 'Presión'] },
    { category: 'Mental', items: ['Atrevimiento', 'Confianza', 'Capacidad competitiva'] }
  ],
  'EXTREMO IZQUIERDO': [
    { category: 'Desequilibrio', items: ['Regate', 'Uno contra uno', 'Cambios de ritmo', 'Velocidad'] },
    { category: 'Producción ofensiva', items: ['Centro', 'Pase atrás', 'Asistencia'] },
    { category: 'Definición', items: ['Disparo'] },
    { category: 'Táctica', items: ['Desmarques', 'Ataque al espacio', 'Amplitud', 'Juego interior'] },
    { category: 'Defensa', items: ['Repliegue', 'Presión'] },
    { category: 'Mental', items: ['Atrevimiento', 'Confianza', 'Capacidad competitiva'] }
  ],
  DELANTERO: [
    { category: 'Finalización', items: ['Definición', 'Remate de cabeza', 'Remate con ambas piernas', 'Uno contra uno con el portero', 'Primer toque'] },
    { category: 'Juego ofensivo', items: ['Desmarques', 'Ataque del espacio', 'Juego de espaldas', 'Descargas', 'Protección del balón'] },
    { category: 'Táctica', items: ['Movilidad', 'Lectura del área', 'Ocupación de espacios'] },
    { category: 'Físico', items: ['Potencia', 'Velocidad', 'Salto'] },
    { category: 'Mental', items: ['Instinto goleador', 'Ambición', 'Sangre fría', 'Competitividad'] }
  ]
};

export const COMMON_ATTRIBUTES: AttributeGroup[] = [
  { category: 'Técnica', items: ['Control orientado', 'Calidad del pase', 'Dominio de ambas piernas', 'Primer toque'] },
  { category: 'Táctica', items: ['Comprensión del juego', 'Posicionamiento', 'Adaptación a diferentes sistemas', 'Transiciones ofensivas', 'Transiciones defensivas'] },
  { category: 'Física', items: ['Velocidad', 'Aceleración', 'Resistencia', 'Fuerza', 'Coordinación', 'Equilibrio'] },
  { category: 'Mental', items: ['Concentración', 'Personalidad', 'Toma de decisiones', 'Comunicación', 'Liderazgo', 'Resiliencia', 'Actitud competitiva', 'Inteligencia táctica'] }
];

export const POSITION_ATTRIBUTES: Record<string, string[]> = {};
Object.entries(POSITION_STRUCTURED_ATTRIBUTES).forEach(([pos, groups]) => {
  const specific = groups.flatMap(g => g.items);
  const common = COMMON_ATTRIBUTES.flatMap(g => g.items);
  POSITION_ATTRIBUTES[pos] = Array.from(new Set([...specific, ...common]));
});

export function resolveCanonicalPositionKey(rawPos?: string | null): string {
  const upper = (rawPos || '').trim().toUpperCase();
  if (!upper) return 'CENTRAL';
  if (POSITION_STRUCTURED_ATTRIBUTES[upper]) return upper;
  if (upper.includes('PORTER')) return 'PORTERO';
  if (upper.includes('LATERAL') || upper.includes('CARRILER')) return 'LATERAL';
  if (upper.includes('CENTRAL') || upper.includes('DEFENSA')) return 'CENTRAL';
  if (upper.includes('PIVOTE') || upper.includes('DEFENSIVO') || upper === 'MCD') return 'MEDIO CENTRO DEFENSIVO';
  if (upper.includes('MEDIA PUNTA') || upper.includes('MEDIAPUNTA') || upper === 'MP') return 'MEDIA PUNTA';
  if (upper.includes('EXTREMO') || upper.includes('BANDA')) return 'EXTREMO';
  if (upper.includes('DELANTER') || upper.includes('PUNTA') || upper === 'DC') return 'DELANTERO';
  if (upper.includes('INTERIOR') || upper.includes('MEDIO') || upper.includes('VOLANTE')) return 'INTERIOR';
  return 'CENTRAL';
}

export function getPositionStructuredAttributes(rawPos?: string | null): AttributeGroup[] {
  const key = resolveCanonicalPositionKey(rawPos);
  return POSITION_STRUCTURED_ATTRIBUTES[key] || POSITION_STRUCTURED_ATTRIBUTES.CENTRAL;
}

export function getPositionAttributes(rawPos?: string | null): string[] {
  const key = resolveCanonicalPositionKey(rawPos);
  const common = COMMON_ATTRIBUTES.flatMap((g) => g.items);
  const specific = (POSITION_STRUCTURED_ATTRIBUTES[key] || []).flatMap((g) => g.items);
  return Array.from(new Set([...specific, ...common]));
}
