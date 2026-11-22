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
