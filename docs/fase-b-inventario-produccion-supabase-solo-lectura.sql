-- FASE B · INVENTARIO DE PRODUCCIÓN SUPABASE (SOLO LECTURA)
-- Ejecutar en Supabase SQL Editor del proyecto CAPTACION Y SCOUTING.
-- Este script NO consulta filas de negocio ni datos personales.
-- No crea ni modifica objetos. Termina con ROLLBACK.
BEGIN TRANSACTION READ ONLY;

-- 1) Tablas, esquema, RLS y FORCE RLS
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relkind AS relation_kind,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls,
  pg_get_userbyid(c.relowner) AS owner
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
  AND c.relkind IN ('r','p','v','m','f')
ORDER BY n.nspname, c.relname;

-- 2) Columnas y tipos (sin consultar contenido)
SELECT
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema IN ('public','storage')
ORDER BY table_schema, table_name, ordinal_position;

-- 3) Constraints e índices
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public','storage')
ORDER BY n.nspname, c.relname, con.conname;

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname IN ('public','storage')
ORDER BY schemaname, tablename, indexname;

-- 4) Políticas RLS completas
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname IN ('public','storage')
ORDER BY schemaname, tablename, policyname;

-- 5) Privilegios efectivos por tabla/vista y rol
SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema IN ('public','storage')
  AND grantee IN ('anon','authenticated','service_role','postgres')
ORDER BY table_schema, table_name, grantee, privilege_type;

-- 6) Privilegios de secuencias
SELECT
  object_schema AS sequence_schema,
  object_name AS sequence_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_usage_grants
WHERE object_type = 'SEQUENCE'
  AND object_schema IN ('public','storage')
ORDER BY object_schema, object_name, grantee, privilege_type;

-- 7) Buckets de Storage (metadatos, no objetos/archivos)
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- 8) Funciones: identidad, seguridad, configuración y permisos EXECUTE
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer,
  p.provolatile AS volatility,
  p.proconfig AS function_config,
  pg_get_functiondef(p.oid) AS definition,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public','storage')
ORDER BY n.nspname, p.proname, identity_arguments;

-- 9) Vistas y su definición / seguridad
SELECT
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname IN ('public','storage')
ORDER BY schemaname, viewname;

-- 10) Publicaciones Realtime: qué tablas se emiten
SELECT
  pub.pubname,
  pub.puballtables,
  ns.nspname AS schema_name,
  cls.relname AS table_name
FROM pg_publication pub
LEFT JOIN pg_publication_rel pr ON pr.prpubid = pub.oid
LEFT JOIN pg_class cls ON cls.oid = pr.prrelid
LEFT JOIN pg_namespace ns ON ns.oid = cls.relnamespace
ORDER BY pub.pubname, ns.nspname, cls.relname;

-- 11) Roles existentes y atributos no secretos
SELECT
  rolname,
  rolsuper,
  rolinherit,
  rolcreaterole,
  rolcreatedb,
  rolcanlogin,
  rolreplication,
  rolbypassrls
FROM pg_roles
WHERE rolname IN ('anon','authenticated','service_role','authenticator','postgres')
ORDER BY rolname;

-- 12) Configuración relevante (solo nombres/valores no secretos)
SELECT
  name,
  setting
FROM pg_settings
WHERE name IN ('row_security','search_path')
ORDER BY name;

ROLLBACK;

-- IMPORTANTE:
-- Comparte los resultados de las consultas 1 a 12. Puedes exportarlos como CSV
-- o enviar capturas legibles. No compartas claves API, service_role keys,
-- tokens JWT, contraseñas ni archivos de credenciales.
