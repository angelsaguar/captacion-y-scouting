-- FASE B · AUDITORÍA HISTÓRICA DE ENTRENAMIENTOS
-- SOLO LECTURA. Ejecutar en Supabase SQL Editor para consultar.
-- No contiene INSERT, UPDATE, DELETE, ALTER, DROP ni CREATE.
-- Guarda los resultados antes de compartirlos. No compartas claves ni tokens.

BEGIN TRANSACTION READ ONLY;

-- 1) Confirmar la estructura REAL de la tabla en este proyecto.
SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'attendance_sessions'
ORDER BY ordinal_position;

-- 2) Volumen y rango temporal.
SELECT COUNT(*) AS total_sesiones, MIN(fecha) AS primera_fecha, MAX(fecha) AS ultima_fecha,
 COUNT(*) FILTER (WHERE team IS NULL OR btrim(team) = '') AS sin_equipo,
 COUNT(*) FILTER (WHERE tipo IS NULL OR btrim(tipo) = '') AS sin_tipo,
 COUNT(*) FILTER (WHERE records IS NULL) AS records_nulos,
 COUNT(*) FILTER (WHERE jsonb_typeof(records) <> 'array') AS records_no_array,
 COUNT(*) FILTER (WHERE jsonb_typeof(tareas) <> 'array') AS tareas_no_array,
 COUNT(*) FILTER (WHERE jsonb_typeof(archivos) <> 'array') AS archivos_no_array
FROM public.attendance_sessions;

-- 3) Distribución por equipo.
SELECT team, COUNT(*) AS sesiones, MIN(fecha) AS primera_fecha, MAX(fecha) AS ultima_fecha
FROM public.attendance_sessions
GROUP BY team ORDER BY sesiones DESC, team;

-- 4) Coincidencias por equipo + fecha + tipo. No son duplicados confirmados.
SELECT team, fecha, tipo, COUNT(*) AS cantidad,
 array_agg(id::text ORDER BY id::text) AS session_ids
FROM public.attendance_sessions
GROUP BY team, fecha, tipo
HAVING COUNT(*) > 1
ORDER BY cantidad DESC, fecha DESC, team;

-- 5) Campos vacíos o estructuras JSON inesperadas.
SELECT id, team, fecha, tipo, jsonb_typeof(records) AS records_tipo,
 CASE WHEN jsonb_typeof(records) = 'array' THEN jsonb_array_length(records) END AS num_records,
 jsonb_typeof(tareas) AS tareas_tipo, jsonb_typeof(archivos) AS archivos_tipo
FROM public.attendance_sessions
WHERE team IS NULL OR btrim(team) = '' OR tipo IS NULL OR btrim(tipo) = ''
 OR records IS NULL OR jsonb_typeof(records) <> 'array'
 OR tareas IS NULL OR jsonb_typeof(tareas) <> 'array'
 OR archivos IS NULL OR jsonb_typeof(archivos) <> 'array'
ORDER BY fecha DESC;

-- 6) Asistencias sin identificador de jugador o estado.
WITH expanded AS (
 SELECT s.id AS session_id, s.team, s.fecha, r.value AS record
 FROM public.attendance_sessions s
 CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(s.records) = 'array' THEN s.records ELSE '[]'::jsonb END
 ) AS r(value)
)
SELECT session_id, team, fecha, record FROM expanded
WHERE COALESCE(record->>'playerId', record->>'player_id', record->>'id') IS NULL
 OR btrim(COALESCE(record->>'playerId', record->>'player_id', record->>'id', '')) = ''
 OR COALESCE(record->>'estado', record->>'status', '') = ''
ORDER BY fecha DESC, team;

-- 7) Jugadores repetidos dentro de una misma sesión.
WITH expanded AS (
 SELECT s.id AS session_id, s.team, s.fecha,
  COALESCE(r.value->>'playerId', r.value->>'player_id', r.value->>'id') AS player_key
 FROM public.attendance_sessions s
 CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(s.records) = 'array' THEN s.records ELSE '[]'::jsonb END
 ) AS r(value)
)
SELECT session_id, team, fecha, player_key, COUNT(*) AS apariciones
FROM expanded
WHERE player_key IS NOT NULL AND btrim(player_key) <> ''
GROUP BY session_id, team, fecha, player_key
HAVING COUNT(*) > 1
ORDER BY fecha DESC, team, player_key;

-- 8) Políticas RLS actuales (metadatos).
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'attendance_sessions'
ORDER BY policyname;

ROLLBACK;
