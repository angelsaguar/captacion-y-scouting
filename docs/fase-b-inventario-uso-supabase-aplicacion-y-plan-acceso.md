# Fase B — Inventario de uso de Supabase desde la aplicación

**Rama revisada:** `feat/fase-b-hardening-supabase`  
**Fecha de revisión:** 2026-11-24  
**Alcance:** análisis estático del código de la rama y contraste con los resultados de inventario de producción compartidos durante la auditoría.  
**Cambios funcionales o de producción:** ninguno. Este documento no modifica políticas, permisos, tablas ni despliegues.

## 1. Conclusión ejecutiva

La aplicación realiza operaciones Supabase directamente desde el navegador con el cliente creado en `src/lib/supabase.ts`, que utiliza `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. El código revisado no muestra que el token de Firebase se intercambie por un JWT de Supabase ni que se establezca una sesión Supabase con `supabase.auth.setSession()`.

Por tanto, la autorización Firebase implementada en `server.ts` protege las rutas Express que usan `requireClubAuth`, pero no protege automáticamente las peticiones Supabase directas emitidas por el navegador. Las políticas RLS de Supabase deben ser seguras por sí mismas para la identidad que Supabase recibe. No debe asumirse que el login Firebase hace que `auth.uid()` de Supabase represente al usuario Firebase.

Los resultados de producción comunicados durante la auditoría muestran privilegios CRUD para `anon` y `authenticated` en las 13 tablas de `public`. En varias tablas existen políticas permisivas `ALL` con `USING true` y `WITH CHECK true`. Esa combinación constituye una exposición crítica mientras permanezca efectiva.

## 2. Arquitectura de identidad observada

### Cliente Supabase

- Archivo: `src/lib/supabase.ts`.
- Cliente creado en navegador con variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- No se encontró en los archivos revisados una integración del token Firebase como sesión JWT de Supabase.
- La clave anon es pública por diseño; la protección de datos depende de grants, RLS y de que las políticas no confíen en una identidad inexistente o distinta.

### Backend Firebase

- Archivo: `server.ts`.
- `requireClubAuth` verifica tokens Firebase mediante Firebase Admin.
- La evaluación de permisos diferencia administrador y scout y consulta Firestore para el acceso del scout.
- Las rutas Express protegidas no convierten por sí mismas las llamadas directas del navegador a Supabase en llamadas autenticadas por Firebase.

## 3. Uso de tablas localizado en el código

El inventario estático localizó estos usos directos relevantes:

| Tabla | Uso encontrado | Archivos principales |
|---|---|---|
| `players` | SELECT, UPSERT, DELETE; carga y filtros de jugadoras, detalle, comparativas, analítica, campograma y dashboard | `src/pages/Players.tsx`, `PlayerForm.tsx`, `PlayerDetail.tsx`, `Comparison.tsx`, `Analytics.tsx`, `Campograma.tsx`, `Dashboard.tsx`, `Admin.tsx` |
| `player_attributes` | SELECT relacionado con jugadoras, DELETE y UPSERT de atributos | `src/pages/Players.tsx`, `PlayerForm.tsx`, `src/lib/clubAccessAndSync.ts` |
| `coaches` | SELECT, INSERT y otras operaciones de mantenimiento (actualización y borrado) | `src/lib/coaches.ts`; carga/sincronización administrativa en `Admin.tsx` |
| `needs` | SELECT, INSERT, UPDATE y DELETE | `src/lib/needs.ts`; carga/sincronización administrativa en `Admin.tsx` |
| `observers` | SELECT, INSERT, UPDATE y DELETE | `src/lib/observers.ts`; invocado desde pantallas de gestión |
| `team_matches` | UPSERT desde sincronización administrativa; SELECT para reconciliación/sincronización | `src/pages/Admin.tsx`, `src/lib/clubAccessAndSync.ts` |
| `match_plans` | UPSERT desde sincronización administrativa; SELECT para reconciliación/sincronización | `src/pages/Admin.tsx`, `src/lib/clubAccessAndSync.ts` |
| `attendance_sessions` | UPSERT en sincronización administrativa | `src/pages/Admin.tsx` |
| `users` | SELECT de catálogo histórico en panel de administración | `src/pages/Admin.tsx` |

Además, `src/lib/encryptedBackup.ts` recorre una lista de tablas Supabase para realizar una copia de seguridad. Esa operación de lectura debe tenerse en cuenta al diseñar el acceso administrativo y el procedimiento de backup.

### Tablas sin uso directo confirmado en la revisión localizada

No se localizó una llamada directa por nombre de tabla en las búsquedas acotadas para `physical_tests` y `anthropometrics`. Tampoco se identificó en los archivos inspeccionados un flujo de cliente directo para `tactics` o `team_sessions`. Esto no demuestra que estén obsoletas: pueden existir accesos dinámicos, usos indirectos o datos históricos. Antes de revocar permisos hay que ampliar la búsqueda a todo el repositorio y validar el uso funcional.

## 4. Contraste con el inventario de producción compartido

Según los resultados SQL aportados durante la auditoría:

- Las 13 tablas de `public` tienen privilegios SELECT, INSERT, UPDATE y DELETE para `anon` y `authenticated`.
- Se identificaron políticas permisivas `ALL` con condiciones verdaderas para `anthropometrics`, `attendance_sessions`, `match_plans`, `players`, `physical_tests`, `tactics`, `team_matches` y `team_sessions`.
- `player_attributes` tiene una política `ALL true` para `authenticated`.
- `coaches`, `needs` y `observers` incluyen políticas amplias de lectura y escritura para usuarios autenticados, con duplicados.
- `users` concede UPDATE sobre todas las columnas a `authenticated`; la política limita la fila a `auth.uid() = id`, pero no limita columnas. El permiso de columna para `role` fue confirmado como verdadero.
- Las políticas permisivas se combinan mediante OR. Una política general verdadera puede neutralizar restricciones más específicas para el mismo rol y comando.

**Matiz de seguridad:** los grants CRUD por sí solos no prueban acceso irrestricto; el efecto real se obtiene al evaluarlos junto con RLS. En las tablas con políticas permisivas generales, ambos elementos están presentes.

## 5. Riesgos y decisiones técnicas

### P0 — No confiar en Firebase para proteger llamadas Supabase directas

La autorización Firebase del backend no se aplica automáticamente al cliente Supabase. Antes de endurecer RLS hay que elegir y documentar una arquitectura:

1. **Opción recomendada a medio plazo:** enrutar las operaciones sensibles por endpoints backend protegidos con Firebase Admin. El servidor realiza las operaciones Supabase con credenciales privadas mantenidas solo en servidor, valida la autorización y limita cada operación.
2. **Alternativa:** integrar formalmente Firebase con Supabase mediante un mecanismo JWT compatible y validado, con claims y políticas RLS diseñadas y probadas. No basta con enviar un Firebase ID token sin configurar la confianza correspondiente en Supabase.

No exponer nunca una clave `service_role` en variables `VITE_*`, navegador, repositorio o logs.

### P0 — Retirar políticas generales permisivas

No crear simplemente políticas restrictivas adicionales: hay que retirar o sustituir las políticas `ALL true` que anulan las restricciones específicas. Hacerlo solo después de trasladar los flujos de escritura/lectura que deban seguir funcionando a una vía autenticada y autorizada.

### P0 — Proteger `public.users.role`

El acceso UPDATE del usuario propio permite modificar la fila propia y alcanza también la columna `role`. Se recomienda impedir UPDATE de esa columna desde el cliente y reservar la asignación de roles a una operación backend administrativa. Evaluar también si `public.users` debe seguir siendo fuente de autorización; el backend actual utiliza Firebase/Firestore, no este campo como fuente autoritativa.

### P1 — Duplicados y permisos por tabla

Consolidar políticas duplicadas y definir para cada tabla comandos y roles explícitos. No usar políticas amplias para “authenticated” si todos los usuarios autenticados no deben compartir los mismos permisos.

### P1 — Integridad histórica y backups

Antes de cambios, exportar y verificar backup completo. Revisar la FK `public.users.id -> auth.users.id ON DELETE CASCADE`: borrar una cuenta Auth elimina la fila histórica relacionada, lo cual contradice el objetivo de conservar histórico si ese objetivo sigue vigente.

## 6. Matriz funcional provisional (no aplicar como SQL todavía)

| Dominio | Lectura | Escritura | Borrado | Observaciones |
|---|---|---|---|---|
| Jugadoras y atributos | Usuarios autorizados por módulo | Backend autorizado | Solo administrador | No dejar escritura pública; evitar que el rol de DB sea la autoridad |
| Entrenadores | Usuarios autorizados de gestión | Backend autorizado | Administrador/gestión autorizada | Confirmar roles funcionales y necesidad de histórico |
| Necesidades | Usuarios autorizados del módulo | Backend autorizado | Administrador/gestión autorizada | El código actual realiza CRUD directo desde cliente |
| Observadores | Usuarios autorizados de gestión | Backend autorizado | Administrador/gestión autorizada | Mantener catálogo histórico y revisar borrado |
| Partidos, sesiones y planes | Usuarios autorizados de gestión de equipo | Backend autorizado | Administrador/gestión autorizada | Actualmente parte de las operaciones se hacen en sincronización administrativa |
| Pruebas físicas y antropometría | Usuarios autorizados según equipo/módulo | Backend autorizado | Administrador/gestión autorizada | Confirmar uso actual y sensibilidad de datos |
| Tácticas | Usuarios autorizados de gestión de equipo | Backend autorizado | Administrador/gestión autorizada | Confirmar uso actual |
| Usuarios | Propio perfil o administración | Campos de perfil permitidos; rol solo backend | No borrar histórico sin política de retención | Proteger `role`, `id` y campos de auditoría |

Esta matriz es una propuesta de diseño y debe validarse con el propietario funcional antes de implementarla.

## 7. Plan de ejecución seguro

1. Congelar cambios de producción durante la auditoría.
2. Completar búsqueda estática de todas las referencias Supabase, incluidas llamadas dinámicas y backups.
3. Confirmar qué tablas se usan actualmente, por módulo y por operación.
4. Elegir arquitectura de acceso (backend Firebase + Supabase privado, o integración JWT formal).
5. Implementar primero endpoints backend y pruebas, sin retirar aún las políticas de producción.
6. Probar en proyecto Supabase no productivo: acceso anónimo denegado, acceso no autorizado denegado, operaciones permitidas para administrador/scout según módulo, y regresión de todas las pantallas.
7. Aplicar migración SQL versionada, revisada y reversible en ventana controlada.
8. Verificar después grants, políticas, operaciones y logs en producción.

## 8. Archivos revisados

- `server.ts`
- `src/lib/supabase.ts`
- `src/pages/Admin.tsx`
- `src/pages/Players.tsx`
- `src/pages/PlayerForm.tsx`
- `src/pages/PlayerDetail.tsx`
- `src/pages/Comparison.tsx`
- `src/pages/Analytics.tsx`
- `src/pages/Campograma.tsx`
- `src/lib/clubAccessAndSync.ts`
- `src/lib/coaches.ts`
- `src/lib/needs.ts`
- `src/lib/observers.ts`
- `src/lib/encryptedBackup.ts`

## 9. Estado

- Auditoría de metadatos de producción: realizada con resultados compartidos por el usuario.
- Inventario estático de uso: parcial; se han localizado los flujos principales indicados arriba.
- Cambios de código funcional: ninguno.
- Cambios en Supabase producción: ninguno.
- Próximo hito: completar búsqueda global y acordar arquitectura de acceso antes de escribir migraciones correctivas.
