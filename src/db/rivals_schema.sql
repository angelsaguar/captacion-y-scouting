-- ==============================================================================
-- MÓDULO ESTADÍSTICAS COLECTIVAS RFFM (2ª INFANTIL - GRUPO 50)
-- ESQUEMA INDEPENDIENTE EN SUPABASE / POSTGRESQL
-- PROTECCIÓN DE PRIVACIDAD: Ningún dato personal de jugadores es registrado.
-- ==============================================================================

-- 1. Equipos del Grupo 50
CREATE TABLE IF NOT EXISTS rffm_rival_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rffm_code VARCHAR(30) UNIQUE NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  nombre_corto VARCHAR(60),
  escudo_url TEXT,
  es_nuestro_equipo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Partidos y Resultados Colectivos
CREATE TABLE IF NOT EXISTS rffm_rival_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rffm_codacta VARCHAR(30) UNIQUE,
  jornada INTEGER NOT NULL,
  fecha DATE,
  hora VARCHAR(10),
  campo TEXT,
  local_team_id UUID REFERENCES rffm_rival_teams(id),
  visitante_team_id UUID REFERENCES rffm_rival_teams(id),
  goles_local INTEGER,
  goles_visitante INTEGER,
  estado VARCHAR(20) DEFAULT 'Finalizado',
  datos_validados BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Eventos Colectivos de Gol (Sin identificación de jugadores - Minuto a minuto)
CREATE TABLE IF NOT EXISTS rffm_rival_goal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES rffm_rival_matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES rffm_rival_teams(id),
  es_gol_a_favor BOOLEAN NOT NULL,
  minuto INTEGER NOT NULL CHECK (minuto >= 1 AND minuto <= 80),
  franja_15m VARCHAR(10) NOT NULL, -- '0-15', '16-30', '31-35', '36-50', '51-65', '66-70'
  tipo_gol VARCHAR(20) DEFAULT 'Jugada'
);

-- 4. Eventos Colectivos de Disciplina (Sin identificación de jugadores)
CREATE TABLE IF NOT EXISTS rffm_rival_card_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES rffm_rival_matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES rffm_rival_teams(id),
  minuto INTEGER NOT NULL,
  tipo_tarjeta VARCHAR(20) NOT NULL CHECK (tipo_tarjeta IN ('Amarilla', 'Roja_Directa', 'Doble_Amarilla'))
);

-- 5. Tabla Agregada de Rendimiento Colectivo
CREATE TABLE IF NOT EXISTS rffm_rival_team_stats_aggregated (
  team_id UUID PRIMARY KEY REFERENCES rffm_rival_teams(id),
  partidos_jugados INTEGER DEFAULT 0,
  puntos INTEGER DEFAULT 0,
  victorias INTEGER DEFAULT 0,
  empates INTEGER DEFAULT 0,
  derrotas INTEGER DEFAULT 0,
  goles_favor INTEGER DEFAULT 0,
  goles_contra INTEGER DEFAULT 0,
  diferencia_goles INTEGER DEFAULT 0,
  promedio_gf_partido NUMERIC(4,2) DEFAULT 0.00,
  promedio_gc_partido NUMERIC(4,2) DEFAULT 0.00,
  pts_local INTEGER DEFAULT 0,
  pts_visitante INTEGER DEFAULT 0,
  gf_local INTEGER DEFAULT 0,
  gc_local INTEGER DEFAULT 0,
  gf_visitante INTEGER DEFAULT 0,
  gc_visitante INTEGER DEFAULT 0,
  total_amarillas INTEGER DEFAULT 0,
  total_rojas_directas INTEGER DEFAULT 0,
  total_dobles_amarillas INTEGER DEFAULT 0,
  promedio_tarjetas_partido NUMERIC(4,2) DEFAULT 0.00,
  franja_max_goles_favor VARCHAR(10),
  franja_max_goles_contra VARCHAR(10),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Historial de Sincronizaciones y Trazabilidad
CREATE TABLE IF NOT EXISTS rffm_rival_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_origen VARCHAR(40) NOT NULL, -- 'RFFM_OFFICIAL_URL', 'MANUAL_IMPORT'
  jornada_sincronizada INTEGER,
  registros_procesados INTEGER,
  estado VARCHAR(20) DEFAULT 'Completado',
  observaciones TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW()
);
