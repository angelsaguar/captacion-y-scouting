# Fase B — propuesta de corrección de seguridad de public.users

**Estado:** propuesta técnica pendiente de validación; no aplicada en Supabase.  
**Entorno:** proyecto gratuito actual; no se creará un segundo proyecto de pago.  
**Alcance:** únicamente diagnóstico y diseño de la tabla `public.users`.  
**Restricción:** no modificar producción hasta revisar dependencias de la aplicación y aprobar expresamente el SQL.

## 1. Evidencias confirmadas

Las consultas de solo lectura ejecutadas en el proyecto actual han mostrado:

- `public.users` tiene RLS habilitado, pero no FORCE RLS.
- Columnas: `id UUID NOT NULL`, `nombre TEXT NOT NULL`, `email TEXT NOT NULL`, `role TEXT NOT NULL DEFAULT 'scout'` y `created_at TIMESTAMPTZ NOT NULL DEFAULT ...`.
- FK `users.id -> auth.users.id ON DELETE CASCADE`.
- Existen cinco políticas RLS: tres SELECT y dos UPDATE. Todas usan el rol `public` y la condición `auth.uid() = id`. Las políticas UPDATE no especifican `WITH CHECK`.
- La consulta agregada de privilegios muestra para `anon` y `authenticated` los privilegios de tabla DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE y UPDATE en `public.users`.
- La consulta `has_*_privilege` devolvió `true` para `anon` y `authenticated` en UPDATE de tabla, UPDATE de columna `role`, TRUNCATE de `players` y DELETE de `players`.

**Conclusión:** en el estado consultado, los roles `anon` y `authenticated` tienen privilegios SQL efectivos de UPDATE sobre `public.users.role`. La condición RLS limita la fila, pero no limita las columnas modificables. Esto crea un riesgo de modificación del rol propio.

Nota: los privilegios SQL y las políticas RLS son controles distintos. Tener un privilegio SQL no demuestra por sí solo que una operación concreta esté expuesta por cada interfaz/API, pero sí confirma que la capa de privilegios de la base de datos es demasiado amplia.

## 2. Objetivo de diseño

El navegador no debe poder modificar directamente el rol ni realizar escrituras generales sobre `public.users`.

Modelo propuesto:

- `anon`: sin acceso a `public.users`.
- `authenticated`: lectura de su propio perfil mediante RLS; sin INSERT, UPDATE, DELETE ni TRUNCATE directos.
- `service_role`: acceso privado desde el servidor, solo después de validar identidad, rol y autorización en Express/Firebase.
- El campo `role` solo podrá cambiarse mediante una operación administrativa del servidor con autorización explícita. Nunca se aceptará el rol enviado por el navegador como autoridad.

La propuesta inicial tampoco concede UPDATE directo sobre `nombre` o `email`. Si la aplicación necesita editar estos campos, se implementará una ruta de servidor específica tras revisar el flujo funcional. El email debe tratarse con especial cuidado para mantener coherencia con Firebase/Auth.

## 3. SQL candidato — NO EJECUTAR TODAVÍA

Este bloque es una propuesta para revisión. Antes de ejecutarlo hay que comprobar grants heredados, dependencias de la aplicación, existencia de políticas adicionales y comportamiento de los endpoints.

```sql
BEGIN;

-- Retirar privilegios directos de escritura y acceso anónimo
-- sobre la tabla de perfiles.
REVOKE ALL PRIVILEGES
ON TABLE public.users
FROM PUBLIC, anon, authenticated;

-- Mantener únicamente lectura para usuarios autenticados.
GRANT SELECT
ON TABLE public.users
TO authenticated;

-- Eliminar las políticas duplicadas conocidas.
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users view own profile" ON public.users;
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users update own profile" ON public.users;

-- Una única política de lectura del perfil propio.
CREATE POLICY "users_select_own_profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

COMMIT;
```

El SQL anterior elimina también las políticas UPDATE directas. No se concede UPDATE por columna porque el diseño propuesto es que las escrituras pasen por Express. El servidor deberá validar permisos antes de utilizar una credencial privada de Supabase.

**Importante:** `REVOKE ALL PRIVILEGES` no debe considerarse suficiente hasta verificar si existen grants heredados por membresías de roles, permisos de esquema o privilegios concedidos por otros mecanismos. Tras cualquier cambio se repetirán las comprobaciones con `has_table_privilege` y `has_column_privilege`.

## 4. Consultas previas y posteriores obligatorias

### 4.1. Comprobar grants heredados y ACL de la tabla

```sql
SELECT
    c.relname AS table_name,
    c.relacl
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'users';

SELECT
    member_role.rolname AS member,
    granted_role.rolname AS granted_role
FROM pg_auth_members m
JOIN pg_roles member_role ON member_role.oid = m.member
JOIN pg_roles granted_role ON granted_role.oid = m.roleid
WHERE member_role.rolname IN ('anon', 'authenticated', 'service_role');
```

### 4.2. Verificar privilegios efectivos

```sql
SELECT
    rol AS database_role,
    has_table_privilege(rol, 'public.users', 'SELECT') AS users_select,
    has_table_privilege(rol, 'public.users', 'INSERT') AS users_insert,
    has_table_privilege(rol, 'public.users', 'UPDATE') AS users_update,
    has_column_privilege(rol, 'public.users', 'role', 'UPDATE') AS users_role_update,
    has_table_privilege(rol, 'public.users', 'DELETE') AS users_delete,
    has_table_privilege(rol, 'public.users', 'TRUNCATE') AS users_truncate
FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS roles(rol);
```

Resultado objetivo tras la corrección propuesta:
- `anon`: todos los valores deben ser `false`.
- `authenticated`: SELECT `true`; INSERT, UPDATE, UPDATE de `role`, DELETE y TRUNCATE `false`.
- `service_role`: debe conservar los privilegios requeridos por el servidor. Su uso debe permanecer exclusivamente en backend.

### 4.3. Verificar políticas RLS

```sql
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY cmd, policyname;
```

Resultado objetivo: una política SELECT para `authenticated`, con `auth.uid() = id`; ninguna política de escritura directa para `anon` o `authenticated`.

## 5. Dependencias que deben validarse antes de aplicar

1. Confirmar si existe algún flujo de registro que inserte directamente en `public.users` desde el navegador. Si existe, deberá migrarse a un proceso seguro del servidor/trigger antes de revocar INSERT.
2. Confirmar si algún flujo actual actualiza `nombre`, `email` o `role` directamente desde el navegador.
3. Confirmar cómo se crea la fila de perfil y cómo se sincroniza el UID de Firebase con `public.users.id` y/o Auth.
4. Confirmar si el endpoint administrativo existente ya sincroniza roles y si la autorización se valida en servidor.
5. Confirmar la existencia de la credencial privada Supabase en el entorno de despliegue, sin compartir su valor. Nunca debe tener prefijo `VITE_` ni exponerse al navegador.
6. Probar en local con datos ficticios los endpoints y sus pruebas automatizadas. La prueba local no sustituye la validación real de RLS en Supabase.

## 6. Criterios de aceptación

- Un usuario anónimo no puede leer ni escribir `public.users`.
- Un usuario autenticado solo puede leer su propia fila.
- Un usuario autenticado no puede cambiar `role`, `id`, `email` ni `nombre` mediante acceso directo a Supabase.
- La asignación o cambio de rol solo puede realizarse mediante servidor y autorización administrativa explícita.
- Las funciones de acceso, sincronización y administración existentes siguen funcionando.
- Los privilegios efectivos se verifican con consultas posteriores y pruebas controladas.
- No se modifica ninguna tabla distinta de `public.users` como parte de esta corrección inicial.

## 7. Alcance fuera de este documento

Los privilegios amplios detectados en las otras doce tablas de `public` y en el esquema `storage` requieren una matriz independiente por tabla y operación. No se deben revocar de forma masiva sin mapear previamente los flujos de la aplicación, las políticas RLS y los procesos de sincronización/backup.

Este documento no aplica cambios a Supabase, no modifica código funcional y no despliega nada.
