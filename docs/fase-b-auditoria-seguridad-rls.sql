-- FASE B · AUDITORÍA DE SEGURIDAD SUPABASE / RLS
-- SOLO LECTURA: no crea, modifica ni elimina objetos o datos.
-- Ejecutar en el SQL Editor del proyecto correcto.
-- Esta consulta revisa permisos SQL y políticas; no prueba accesos desde Internet.

BEGIN TRANSACTION READ ONLY;

-- 1) Estado RLS y FORCE RLS en las tablas del esquema public.
SELECT
  n.nspname AS esquema,
  c.relname AS tabla,
  c.relrowsecurity AS rls_habilitado,
  c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p')
ORDER BY c.relname;

-- 2) Privilegios efectivos de anon y authenticated en las tablas públicas.
-- has_table_privilege comprueba privilegios SQL, aparte de las políticas RLS.
SELECT
  c.relname AS tabla,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'SELECT') AS anon_select,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'INSERT') AS anon_insert,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'UPDATE') AS anon_update,
  has_table_privilege('anon', format('%I.%I', n.nspname, c.relname), 'DELETE') AS anon_delete,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'SELECT') AS authenticated_select,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'INSERT') AS authenticated_insert,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'UPDATE') AS authenticated_update,
  has_table_privilege('authenticated', format('%I.%I', n.nspname, c.relname), 'DELETE') AS authenticated_delete
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p')
ORDER BY c.relname;

-- 3) Todas las políticas RLS del esquema public.
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4) Confirmar si hay funciones SECURITY DEFINER en public.
-- Solo metadatos; revisar manualmente su código antes de cambiar permisos.
SELECT
  n.nspname AS esquema,
  p.proname AS funcion,
  pg_get_userbyid(p.proowner) AS propietario,
  p.prosecdef AS security_definer,
  pg_get_function_identity_arguments(p.oid) AS argumentos
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

-- 5) Comprobar si existen roles de aplicación adicionales.
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin
FROM pg_roles
WHERE rolname IN ('anon','authenticated','service_role')
   OR rolname ILIKE '%app%'
ORDER BY rolname;

ROLLBACK;
