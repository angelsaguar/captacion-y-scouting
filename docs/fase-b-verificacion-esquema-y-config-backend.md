# Fase B · Comprobación del esquema y configuración backend

Fecha de revisión: 22/11/2026  
Rama: `feat/fase-b-hardening-supabase`  
Alcance: inspección de código y SQL versionado. No se han ejecutado consultas contra Supabase de producción ni se ha modificado código funcional.

## Resultado ejecutivo

La estructura histórica de `public.users` está identificada en los scripts versionados, pero todavía no puede darse por validada contra producción. La implementación de `GET /api/admin/users` debe esperar a confirmar el inventario real de Supabase y la disponibilidad de una credencial backend protegida.

## Hallazgos verificados en el repositorio

### 1. Esquema de `public.users`

En `supabase_schema.sql` la tabla se define con:

- `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `nombre TEXT NOT NULL`
- `email TEXT NOT NULL`
- `role TEXT NOT NULL DEFAULT 'scout'`
- `created_at TIMESTAMP WITH TIME ZONE ... NOT NULL`

En `supabase.sql` aparece otra definición: `id UUID PRIMARY KEY DEFAULT auth.uid()`, `email TEXT UNIQUE NOT NULL`, `role TEXT DEFAULT 'scout'` y `created_at TIMESTAMPTZ DEFAULT now()`. No declara la misma FK ni las mismas restricciones.

**Conclusión:** los campos funcionales previstos coinciden, pero hay divergencia entre los dos scripts. No se debe usar ninguno como sustituto del esquema real de producción.

### 2. Trigger `handle_new_user()`

- `supabase_schema.sql` crea la función y ejecuta `DROP TRIGGER IF EXISTS` seguido de `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users`.
- `supabase.sql` crea la función, pero deja la sentencia de creación del trigger en un comentario.
- Las dos versiones de la función tampoco son idénticas: una aplica `COALESCE` al nombre y `ON CONFLICT`; la otra inserta directamente el metadato `nombre`.

**Conclusión:** el repositorio contiene dos estados posibles. Solo el inventario de producción puede confirmar cuál está instalado.

### 3. Políticas RLS de `public.users`

En `supabase_schema.sql` se habilita RLS y se definen:
- SELECT: el usuario puede ver su propio perfil (`auth.uid() = id`).
- UPDATE: el usuario puede actualizar su propio perfil (`auth.uid() = id`).

La política UPDATE no restringe por sí sola las columnas actualizables. Deben verificarse también los privilegios SQL efectivos y cualquier concesión/revocación por columna en producción. El campo `role` no debe tratarse como fuente de autorización de la aplicación.

En `supabase.sql` se habilita RLS para `users`, pero en el fragmento versionado no aparecen políticas específicas para esa tabla.

### 4. Configuración del backend

- `.env.example` solo documenta `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; no documenta una clave de servidor.
- `src/lib/supabase.ts` crea el cliente de navegador con esas variables `VITE_*`.
- `server.ts` implementa autenticación/autorización con Firebase Admin y Firestore; no se ha localizado un cliente Supabase de servidor ni una lectura de `public.users` desde backend.
- La búsqueda del literal `SUPABASE_SERVICE_ROLE_KEY` en el código indexado no devolvió coincidencias.

**Conclusión:** no está demostrada la existencia de una credencial backend de Supabase en el entorno de despliegue. La clave `service_role`, si se utiliza, debe permanecer exclusivamente en el servidor y nunca en variables `VITE_*`, el navegador o el repositorio.

### 5. Lectura actual en la interfaz

`src/pages/Admin.tsx` consulta directamente `supabase.from('users').select('*')`. Esta lectura debe migrarse al endpoint administrativo protegido, sin convertir el rol histórico en permiso efectivo.

## Decisión técnica

1. Mantener `public.users` como histórico; no eliminar tabla, función, trigger ni políticas durante esta fase.
2. Mantener Firebase Admin + Firestore como fuente de autenticación/autorización de la aplicación.
3. El futuro endpoint debe reutilizar `createRateLimiter(30)` y `requireClubAuth([], true)`.
4. No implementar el acceso servidor a Supabase hasta confirmar el esquema real y la configuración segura de credenciales en el entorno de despliegue.
5. No devolver HTTP 200 con una lista vacía si falla la lectura de Supabase.

## Verificación pendiente en el proyecto Supabase

Ejecutar por separado las consultas de solo lectura del archivo:

`docs/fase-b-inventario-produccion-supabase-solo-lectura.sql`

Compartir los resultados de las consultas 1 a 8, en especial:
- columnas y tipos de `public.users`;
- constraints e índices;
- políticas RLS y roles;
- privilegios efectivos de `anon`, `authenticated` y `service_role`;
- definición exacta de `handle_new_user()` y existencia del trigger `on_auth_user_created`.

No compartir claves, tokens, contraseñas ni valores de secretos.

## Estado

- Inspección del SQL versionado: completada.
- Inspección de configuración backend versionada: completada.
- Esquema y trigger reales de producción: pendientes de inventario.
- Disponibilidad de credencial Supabase exclusivamente backend: pendiente de confirmar en el proveedor de despliegue.
- Implementación del endpoint y cambio de la interfaz: no iniciados.
- Código funcional y producción: sin modificaciones.
