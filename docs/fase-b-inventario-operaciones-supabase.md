# Fase B — inventario de operaciones Supabase por módulo

**Rama:** `feat/fase-b-hardening-supabase`  
**Fecha:** 22-11-2026  
**Alcance:** lectura estática del código versionado en esta rama. No equivale a telemetría de producción ni a una inspección de consultas ejecutadas en vivo.

## 1. Resumen ejecutivo

La aplicación no usa Supabase únicamente como lectura de datos. Hay escrituras directas desde navegador, sincronización bidireccional, importación/restauración, edición de jugadores, asistencia y planes de partido. Endurecer RLS sin cubrir estos flujos puede romper operaciones legítimas.

Tablas vistas en llamadas de código:
- `players`
- `player_attributes`
- `observers`
- `needs`
- `coaches`
- `tactics`
- `team_matches`
- `attendance_sessions`
- `match_plans`
- `users`

La auditoría del proyecto de producción informó además `anthropometrics`, `physical_tests`, `team_sessions` y otras tablas hasta un total de 13. En los archivos inspeccionados no se encontraron llamadas directas a las tres tablas citadas; pueden existir en vistas, servicios, otras ramas, SQL, funciones o en el entorno desplegado. Deben mantenerse protegidas y no se debe inferir que están sin uso.

## 2. Operaciones observadas por tabla

| Tabla | Lectura | Escritura observada | Módulos/archivos |
|---|---|---|---|
| `players` | SELECT, filtros, maybeSingle, limit | INSERT, UPDATE, UPSERT, DELETE | Players, PlayerForm, PlayerDetail, Plantilla, Campograma, Asistencia, Partidos, Analytics, Comparison, Admin, seed, sincronización |
| `player_attributes` | SELECT y relaciones anidadas | UPSERT, DELETE por jugador y prefijo | PlayerForm, Antropometría, Pruebas Físicas, Plantilla, sincronización |
| `observers` | SELECT | INSERT, UPDATE, DELETE (incluye limpieza de duplicados) | `src/lib/observers.ts`, página Admin y gestión |
| `needs` | SELECT | INSERT, UPDATE, DELETE | `src/lib/needs.ts` |
| `coaches` | SELECT | INSERT, UPDATE, DELETE | `src/lib/coaches.ts` |
| `tactics` | SELECT por temporada/equipo | UPSERT | Campograma |
| `team_matches` | SELECT por equipo y sincronización global | INSERT, UPSERT | Partidos, Plantilla, Admin, sincronización |
| `attendance_sessions` | SELECT por equipo | UPSERT; calendario mensual y sesiones | Asistencia, Plantilla, Admin, sincronización |
| `match_plans` | SELECT por equipo/rival | INSERT, UPDATE, UPSERT | PlanPartido, Partidos, Admin, sincronización |
| `users` | SELECT `*` | No se observó escritura directa en la muestra revisada | Admin |

## 3. Hallazgos operativos que condicionan la política

### 3.1 Escrituras de scouting desde el cliente

El cliente realiza altas, ediciones y bajas de jugadores. Las bajas se ejecutan desde `Players.tsx` y `Plantilla.tsx`; por tanto, una regla "scout nunca puede borrar" rompería flujos existentes si el usuario scout dispone de esos controles. La decisión debe ser funcional, no solo técnica: o se elimina/oculta y bloquea esa acción para scout, o se concede permiso acotado tras validar autorización en servidor.

### 3.2 Atributos antropométricos y pruebas físicas

Ambos módulos usan `player_attributes` y distinguen registros mediante prefijos `Antropo:` y `Physical:`. No son tablas independientes en el código revisado. RLS por tabla no puede distinguir por sí sola con seguridad esos prefijos si el cliente puede manipular el valor; para separar permisos por módulo se necesitarían políticas por filas con validación robusta o normalizar el modelo en tablas específicas.

### 3.3 Sincronización y restauración administrativa

`clubAccessAndSync.ts` lee conjuntos completos de `players`, `player_attributes`, `team_matches` y `match_plans`, y sincroniza datos a Firestore según módulos autorizados. `Admin.tsx` realiza UPSERT masivos en jugadores, partidos, sesiones, planes, entrenadores y necesidades. No se debe tratar esta funcionalidad como una escritura de usuario ordinaria; hay que verificar si debe mantenerse en el cliente admin o trasladarse a backend controlado.

### 3.4 Asistencia y calendarios

`Asistencia.tsx` usa `attendance_sessions` para sesiones, calendarios mensuales y sincronización. Los IDs de calendario pueden ser sintéticos y algunos payloads incluyen `teamId` aunque el esquema SQL histórico mostrado no declara esa columna. Debe verificarse el esquema real antes de diseñar políticas o constraints por equipo.

### 3.5 Usuarios y permisos

`Admin.tsx` consulta `users.select('*')`. La matriz de permisos debe permitir esa lectura solo a administrador y limitar al scout a su propio perfil. Ninguna política de UPDATE general debe permitir que el usuario modifique `role`, estado, módulos o identidad.

### 3.6 Semilla y limpieza automáticas

`src/lib/seedJugadoras.ts` se ejecuta tras inicio de sesión según el flujo revisado. Hace:
- SELECT de jugadores con URLs Unsplash;
- UPDATE de `foto_url` para limpiar registros;
- SELECT para comprobar si hay jugadores;
- UPSERT de una plantilla inicial si la tabla está vacía;
- además modifica datos locales de `localStorage`.

Este flujo no debe seguir ejecutando escrituras remotas automáticamente al iniciar sesión. Separar limpieza/seed en una tarea administrativa de una sola ejecución, con dry-run, backup y logs; o eliminarla si ya no es necesaria. No permitir que una política amplia mantenga esta escritura abierta para todos.

## 4. Storage

`PlayerForm.tsx` utiliza el bucket `avatars`:
- `storage.from('avatars').upload(filePath, photo, { upsert: false })`
- genera URL con `getPublicUrl(filePath)`.

La generación de URL pública no concede por sí sola permiso de lectura: depende de la configuración del bucket. Debe confirmarse si `avatars` es público y revisar las políticas reales de `storage.objects`. Propuesta inicial:
- upload: usuarios autenticados y activos, con path asociado a su identidad o a un ámbito administrado;
- overwrite/update: denegado por defecto, salvo flujo explícito;
- delete: admin o proceso backend;
- lectura: pública solo si se confirma que las fotos de jugadores son deliberadamente públicas; en otro caso bucket privado y URLs firmadas.
No cambiar bucket ni políticas sin validar impacto en fotos existentes y URLs guardadas en `players.foto_url`.

## 5. Realtime, RPC, Edge Functions y APIs

En los archivos inspeccionados no se encontraron llamadas explícitas `supabase.rpc()` ni `supabase.channel()`. Esto no demuestra que no haya RPC, Realtime o funciones usadas desde otros paquetes, paneles, jobs o configuración de Supabase. Antes de migrar:
- revisar catálogo real de funciones y permisos EXECUTE;
- revisar publicaciones Realtime;
- revisar Edge Functions y APIs del despliegue;
- revisar vistas y funciones SECURITY DEFINER;
- buscar uso de REST directo en servicios externos.

## 6. Consecuencias para la matriz de permisos

La matriz propuesta debe ajustarse con estas decisiones funcionales antes de producir SQL:

1. ¿Puede el scout borrar jugadores? El código actual contempla borrado desde interfaz; por defecto de seguridad se propone denegar hasta definir alternativa.
2. ¿Puede el scout crear/editar/borrar observadores? El código contempla alta, edición y limpieza de duplicados; propuesta inicial: lectura para scout, mantenimiento admin.
3. ¿Puede el scout ejecutar importación/restauración masiva? Propuesta: no; solo admin, preferiblemente backend.
4. ¿Pueden los módulos de antropometría y pruebas físicas escribir atributos? El código actual lo hace. La autorización debe reconocer ambos módulos y no confiar en prefijos aportados por el navegador.
5. ¿Las fotos son públicas? Confirmar bucket `avatars` y requisitos de privacidad.

## 7. Próxima fase técnica

- Obtener snapshot del esquema real de producción (tablas/columnas/constraints/indexes).
- Obtener inventario de políticas/privilegios actuales de `storage.objects`, buckets, vistas, funciones y Realtime.
- Preparar proyecto Supabase aislado y usuarios Firebase de prueba.
- Validar custom claims y el comportamiento de `sub`, `role`, `auth.uid()` con token real no sensible.
- Trasladar seed/limpieza y operaciones masivas a backend controlado o retirarlas.
- Ajustar controles UI para reflejar permisos RLS; recordar que UI no es control de seguridad.
- Generar migración idempotente y rollback solo después de las validaciones.

## 8. Seguridad y límites

Este documento no es un script SQL ni autorización de cambio productivo.
- No se ejecutó SQL.
- No se modificaron tablas, datos, privilegios, RLS, Storage ni funciones.
- No se modificó código ejecutable.
- No se fusionó ni desplegó.


## 9. Contraste con el esquema real de producción (consulta 2, 22-11-2026)

El usuario aportó el resultado completo de `information_schema.columns` del proyecto de producción. Se confirman las 13 tablas públicas auditadas y estas precisiones:

- `public.users.id` es UUID NOT NULL sin default; no se puede asumir que un Firebase UID de texto se pueda guardar directamente ahí ni que coincida con `auth.uid()`.
- `public.players` contiene teléfono, tipo de contacto, año de nacimiento, email y observaciones; tratar estos campos como información personal y limitar exposición por rol/módulo.
- `public.coaches` contiene email, teléfono y observaciones; limitar su lectura y exportación.
- `public.anthropometrics` y `public.physical_tests` son tablas independientes con `player_id UUID`, `team text`, `fecha date` y campos físicos específicos. No asumir que todo se guarda en `player_attributes`.
- `public.player_attributes` contiene `player_id UUID`, `atributo text` y `valor integer`; revisar los valores reales de `atributo` sin exportar datos personales para clasificar el alcance.
- `public.attendance_sessions` contiene `team text`, `fecha date`, `tipo text`, `records/tareas/archivos JSONB`; **no** contiene `teamId`.
- `public.team_sessions` existe como tabla independiente y contiene `team text`, `fecha date`, `hora text`, `tipo text`, `asistentes JSONB`.
- `public.tactics` guarda `roster` y `lineup` en JSONB; `team_matches` guarda estadísticas JSONB; `match_plans` guarda convocatoria JSONB. Las políticas RLS no filtran automáticamente los elementos internos de esos JSONB: cada fila completa queda visible a quien pueda hacer SELECT.
- `observers` contiene nombre y foto_url, sin columna de propietario/created_by; no se debe diseñar una política de propiedad por usuario sin cambiar el modelo.
- `needs` y `coaches` tienen `created_by UUID`, pero su relación con Firebase aún debe definirse.
- Las tablas de negocio tienen IDs UUID generados por `gen_random_uuid()`, salvo `users.id`, que requiere valor explícito.
- La exportación incluye metadatos de Storage, pero no aporta todavía la configuración real de buckets, sus políticas ni los permisos de `storage.objects`.

Este contraste corrige las suposiciones del inventario inicial. La matriz debe incorporar las tablas `anthropometrics`, `physical_tests` y `team_sessions` con políticas explícitas. También debe tener en cuenta que la autorización por fila basada en propietario no es viable en `observers` con el esquema actual.

La información recibida describe columnas y tipos, no contiene filas de negocio; no se han inspeccionado registros personales.


## 10. Constraints y relaciones confirmadas en producción (consulta 3, 22-11-2026)

Resultado aportado por el usuario desde `pg_constraint`:

### Relaciones con jugadores
- `anthropometrics.player_id → players.id`, ON DELETE CASCADE.
- `physical_tests.player_id → players.id`, ON DELETE CASCADE.
- `player_attributes.player_id → players.id`, ON DELETE CASCADE.
- `player_attributes` tiene UNIQUE (`player_id`, `atributo`).

Consecuencia: borrar un jugador elimina en cascada sus datos antropométricos, pruebas físicas y atributos. El permiso DELETE sobre `players` tiene un impacto destructivo indirecto y debe reservarse a un flujo administrativo controlado, con confirmación y respaldo; no concederlo al scout por defecto.

### Relaciones de identidad
- `users.id → auth.users.id`, ON DELETE CASCADE.
- `players.created_by → auth.users.id`.
- `needs.created_by → auth.users.id`.
- `coaches.created_by → public.users.id`.
- `tactics.updated_by → public.users.id`, ON DELETE SET NULL.

Consecuencia crítica: el esquema mezcla referencias directas a `auth.users` con referencias a `public.users`. La conexión Supabase Third-Party Auth con Firebase valida JWT para acceder a Postgres, pero no crea automáticamente una fila en `auth.users` para cada Firebase UID. No se debe asumir que un usuario Firebase puede insertarse en `players.created_by` o `needs.created_by`, ni que la tabla `public.users` se poblará automáticamente. Antes de activar el cliente Supabase con tokens Firebase, hay que resolver explícitamente el modelo de identidad y las claves foráneas. No eliminar ni alterar constraints en producción durante esta fase.

### Restricciones únicas
- `observers.nombre` es UNIQUE: no hay columna de propietario; las políticas por usuario no pueden aislar registros individuales.
- `tactics(season, team)` es UNIQUE: UPSERT debe conservar esa clave de conflicto.
- Todas las tablas públicas tienen PK. Los IDs de negocio son UUID con default salvo `users.id`, que es explícito.

### Consecuencias de diseño
1. Las operaciones DELETE sobre `players` deben denegarse a scout inicialmente por la cascada de datos asociados.
2. Los DELETE de antropometría, pruebas físicas y atributos deben probarse junto con la lógica de borrado del jugador para evitar inconsistencias.
3. Mantener la unicidad de `observers.nombre` y `tactics(season,team)` en pruebas de concurrencia/UPSERT.
4. La política de `created_by` no puede basarse en una columna homogénea; hay que decidir si se conserva Supabase Auth para ownership, se introduce una tabla de mapeo Firebase UID ↔ UUID Supabase, o se migra el modelo de referencias en una futura migración revisada.
5. No generar aún migración RLS ejecutable ni cambiar las FK; faltan consultas de índices, políticas Storage y permisos de funciones.


## 11. Políticas RLS reales de producción (consulta 4, 22-11-2026)

Resultado de `pg_policies` aportado por el usuario. Las políticas son PERMISSIVE, por lo que varias políticas aplicables se combinan mediante OR. Una política restrictiva no queda protegida si existe otra política permisiva más amplia para el mismo comando/rol.

### Hallazgos críticos

**Políticas ALL con `qual=true` y `with_check=true`:**
- `anthropometrics`: `anon, authenticated`.
- `attendance_sessions`: `anon, authenticated`; además SELECT público.
- `match_plans`: dos políticas ALL para `anon, authenticated`; además SELECT público.
- `physical_tests`: `anon, authenticated`.
- `players`: ALL para `anon, authenticated`; además ALL para authenticated.
- `tactics`: dos políticas ALL para `anon, authenticated`; además SELECT público.
- `team_matches`: ALL para `anon, authenticated`.
- `team_sessions`: ALL para `anon, authenticated`.

Estas reglas permiten acceso muy amplio a las tablas, sujeto también a los GRANT efectivos. En RLS, la política no otorga por sí sola privilegios SQL, pero cuando ambos existen permite operaciones que la política debería restringir.

**Otras tablas con políticas excesivas:**
- `coaches`: SELECT público y varias políticas INSERT/UPDATE/DELETE para authenticated con checks true. Hay políticas adicionales para rol public condicionadas solo a `auth.uid() IS NOT NULL`.
- `needs`: patrón equivalente al de coaches: SELECT público, CRUD authenticated sin condición real y escrituras public basadas solo en UID no nulo.
- `observers`: SELECT público y políticas INSERT/DELETE authenticated con true.
- `player_attributes`: política `Permitir todo a usuarios autenticados` con ALL true. Esta regla anula en la práctica las restricciones admin/scout de otras políticas permisivas. También hay INSERT y SELECT generales sin restricción.
- `users`: SELECT/UPDATE propio por `auth.uid() = id`, con políticas duplicadas; no se observa política de INSERT/DELETE en este resultado.

### Efecto OR y riesgo

Las políticas admin/scout de `players` y `player_attributes` no limitan el acceso si coexisten con políticas permisivas más abiertas. En particular:
- `players`: las políticas ALL públicas/anon-authenticated hacen irrelevantes las reglas admin-only de DELETE y las reglas de UPDATE por rol para cualquier rol incluido en esas políticas.
- `player_attributes`: la política ALL para authenticated hace irrelevantes las políticas que reservan DELETE a admin.
- `coaches` y `needs`: las políticas public condicionadas a UID no nulo permiten operaciones a cualquier usuario con identidad JWT aceptada, sin distinguir admin/scout.
- `observers`: lectura pública y escritura general authenticated; no existe ownership en el esquema para aislar por usuario.

### Relación con GRANT

RLS y GRANT son controles acumulativos: para acceder se necesita privilegio SQL y pasar la política RLS (salvo roles que eluden RLS, propietarios y service_role). La consulta 5 de privilegios efectivos sigue siendo necesaria para determinar la exposición efectiva por rol. No afirmar que anon puede operar una tabla únicamente por ver una política si no se han confirmado sus GRANT.

### Prioridad correctiva

1. Preparar sustitución coordinada de las políticas abiertas en una migración atómica, no ir borrando reglas una a una en producción.
2. Verificar GRANT efectivos para anon/authenticated/service_role.
3. Probar tokens Firebase admin/scout y token sin claims en entorno aislado.
4. No usar `auth.uid()` como identidad Firebase hasta probar el comportamiento; las relaciones FK actuales apuntan a `auth.users`.
5. Incorporar tablas sensibles de datos físicos y asistencia con permisos de módulo explícitos.
6. Evitar acceso público a filas completas de jugadores, planes, tácticas, sesiones y personal si no hay requisito público validado.

Este hallazgo es evidencia de configuración permisiva, no evidencia de que haya ocurrido una filtración o acceso indebido. La exposición efectiva depende también de los GRANT, del proveedor JWT y de las vías de acceso configuradas.


## 12. Privilegios de tabla reportados (consulta 5, 22-11-2026)

El usuario aportó el resultado de `information_schema.role_table_grants` para los esquemas public/storage y los grantees anon, authenticated, service_role y postgres.

### Resultado observado en las 13 tablas public

- Para `anon`: aparecen filas de privilegios DELETE/INSERT/REFERENCES/SELECT/TRIGGER/TRUNCATE/UPDATE con `is_grantable=NO`.
- Para `authenticated`: aparecen las mismas operaciones con `is_grantable=NO`.
- Para `service_role`: aparecen las mismas operaciones con `is_grantable=NO`.
- Para `postgres`: aparecen las operaciones con `is_grantable=YES`.

**Interpretación importante:** `is_grantable=NO` significa que el rol no puede conceder ese privilegio a otros; no significa que no tenga el privilegio. La presencia de una fila para cada `privilege_type` indica que el rol tiene ese privilegio concedido, pero no grant option. Por tanto, la lectura inicial de este resultado como ausencia de GRANT sería incorrecta.

En consecuencia, los GRANT directos observados para anon/authenticated/service_role sí parecen conceder las operaciones enumeradas, mientras que las políticas RLS permisivas descritas en la consulta 4 son relevantes para el acceso efectivo. Debe comprobarse además la herencia/privilegios efectivos mediante `has_table_privilege()` y `has_any_column_privilege()` si se requiere resolver discrepancias.

### Storage

El resultado también muestra filas para anon/authenticated en algunas tablas internas de Storage (por ejemplo buckets, objects y tablas multipart) con `is_grantable=NO`. Esto no determina por sí solo la autorización de archivos: el acceso a objetos requiere revisar políticas RLS de `storage.objects`, bucket público/privado y el API de Storage. No cambiar permisos internos de Storage directamente sin seguir el modelo soportado por Supabase.

### Precaución de interpretación

El campo `is_grantable` no es un indicador de si el privilegio está concedido; solo expresa si puede ser concedido a terceros. Para confirmar privilegios efectivos se puede usar `has_table_privilege(role, 'public.tabla', 'SELECT')` para cada rol/tabla. No inferir ausencia de GRANT a partir de `is_grantable=NO`.


## 13. Privilegios de secuencias (consulta 6, 22-11-2026)

El usuario ejecutó la consulta de `information_schema.role_usage_grants` para secuencias en los esquemas `public` y `storage`; Supabase devolvió **Success. No rows returned**.

Interpretación: no se reportan privilegios de secuencias para los grantees incluidos en esa consulta. Esto no modifica la evaluación de privilegios sobre tablas. Las tablas de negocio usan UUID con `gen_random_uuid()` como default (según consulta 2), por lo que no requieren secuencias serial para generar esos IDs. No se debe inferir nada sobre funciones UUID o permisos de ejecución a partir de este resultado.


## 14. Buckets de Storage (consulta 7, 22-11-2026)

Resultado aportado por el usuario: un único bucket, `avatars`:
- `id/name`: `avatars`
- `public`: `true`
- `file_size_limit`: `NULL`
- `allowed_mime_types`: `NULL`

Interpretación: el bucket está configurado como público y no tiene límite de tamaño ni lista de MIME permitidos configurados a nivel de bucket. Esto no demuestra por sí solo que los roles anónimos o autenticados puedan subir, actualizar o borrar objetos: esas operaciones dependen de las políticas RLS de `storage.objects`, que deben auditarse por separado. No se ha modificado la configuración.


## 15. Funciones y SECURITY DEFINER (consulta 8, 22-11-2026)

Resultado aportado por el usuario: 25 funciones en los esquemas `public` y `storage`.

Funciones con `SECURITY DEFINER=true` (4):
- `public.handle_new_user()`: owner `postgres`; `function_config=NULL` (sin `search_path` explícito); permisos de ejecución indicados como true para `anon`, `authenticated` y `service_role`. Es función trigger. Su cuerpo inserta en `public.users`, asigna rol fijo `scout` y, en conflicto, actualiza nombre/email sin cambiar role. La inserción usa nombre de tabla cualificado (`public.users`). El flag EXECUTE no significa que pueda invocarse como una función ordinaria: su retorno es `trigger` y se ejecuta mediante el trigger asociado. Revisar definición y trigger asociado antes de cualquier cambio.
- `storage.protect_active_lifecycle_states()`: owner `supabase_storage_admin`; `search_path=pg_catalog`; EXECUTE false para los tres roles consultados.
- `storage.reconcile_lifecycle_state(text, boolean)`: owner `supabase_storage_admin`; `search_path=pg_catalog`; EXECUTE false para anon/authenticated y true para service_role.
- `storage.wake_lifecycle_state()`: owner `supabase_storage_admin`; `search_path=pg_catalog`; EXECUTE false para los tres roles consultados.

Las otras funciones de Storage mostradas pertenecen a `supabase_storage_admin` y no tienen SECURITY DEFINER. Varias tienen EXECUTE true para anon/authenticated/service_role; interpretar esos permisos en el contexto de las funciones auxiliares de Storage, sin concluir por sí solos que permiten acceso directo a objetos o bypass de RLS.

Hallazgo a revisar: `public.handle_new_user()` es la única función de aplicación marcada SECURITY DEFINER y no fija `search_path` explícitamente. Aunque su INSERT está cualificado como `public.users` y su tipo trigger limita su invocación, conviene documentar el trigger asociado, revisar el contexto de ejecución y evaluar una configuración segura de `search_path` antes de proponer cambios. No se ha modificado ninguna función ni permiso.


## 16. Vistas de base de datos (consulta 9, 22-11-2026)

El usuario ejecutó la consulta de inventario de vistas y Supabase devolvió **Success. No rows returned**.

Interpretación limitada al alcance de la consulta: no se devolvieron vistas que coincidan con los filtros consultados. No se concluye que no existan vistas en otros esquemas o que no haya otras superficies de exposición. No se ha modificado ningún objeto.


## 17. Publicación Realtime (consulta 10, 22-11-2026)

Resultado aportado mediante captura:
- `pubname = supabase_realtime`
- `puballtables = false`
- `schema_name = NULL`
- `table_name = NULL`

Interpretación: la publicación existe, pero no está configurada para incluir automáticamente todas las tablas y la consulta no devuelve tablas concretas asociadas. Dentro del alcance de esta consulta no se observan tablas de la aplicación publicadas en Realtime. Resultado favorable para limitar la difusión de cambios. No se ha modificado la publicación.


## 18. Roles PostgreSQL (consulta 11, 22-11-2026)

Resultado aportado por el usuario:

| Rol | super | inherit | createrole | createdb | canlogin | replication | bypassrls |
|---|---:|---:|---:|---:|---:|---:|---:|
| anon | false | true | false | false | false | false | false |
| authenticated | false | true | false | false | false | false | false |
| authenticator | false | false | false | false | true | false | false |
| postgres | false | true | true | true | true | true | true |
| service_role | false | true | false | false | false | false | true |

Interpretación:
- `anon` y `authenticated` no tienen `BYPASSRLS`, ni atributos administrativos especiales.
- `authenticator` puede iniciar sesión y no tiene `BYPASSRLS`; normalmente actúa como rol de conexión que cambia al rol de API correspondiente.
- `postgres` tiene atributos administrativos y `BYPASSRLS`; es un rol privilegiado.
- `service_role` tiene `BYPASSRLS=true`, por lo que sus operaciones pueden eludir RLS. Su clave/credenciales deben mantenerse exclusivamente en entornos de servidor y nunca exponerse al cliente.
- `rolsuper=false` para postgres en esta salida no invalida sus privilegios administrativos mostrados; se registran exactamente los atributos devueltos por la consulta.

Este resultado no reduce el riesgo previamente identificado: `anon` y `authenticated` no necesitan BYPASSRLS para aprovechar políticas permisivas y privilegios de tabla que les concedan acceso. No se ha modificado ningún rol.
