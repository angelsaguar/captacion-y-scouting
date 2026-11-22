# Fase B — Matriz propuesta de permisos RLS

**Rama:** `feat/fase-b-hardening-supabase`  
**Estado:** diseño de seguridad; no ejecutar en producción.  
**Fecha:** 22-11-2026

## 1. Objetivo y criterios obligatorios

La auditoría del proyecto Supabase de producción identificó políticas permisivas para `anon` y `authenticated` en ocho tablas, una política general permisiva en `player_attributes` y permisos de escritura excesivos en tablas de gestión. Esta matriz propone sustituir ese modelo por permisos mínimos.

Reglas globales:

- `anon`: sin acceso a tablas de negocio ni a Storage con información de scouting.
- `authenticated`: solo usuarios con JWT Firebase del proyecto registrado y claims válidos.
- Roles de negocio permitidos: `admin` y `scout`. Ningún rol se obtiene de datos enviados por el navegador.
- El administrador puede gestionar todos los módulos.
- El scout queda limitado a los módulos habilitados expresamente en su autorización.
- Borrado de registros sensibles: solo admin, salvo excepción justificada y aprobada.
- Los roles, estado activo y módulos se asignan en servidor mediante Firebase Admin SDK; nunca desde el frontend.
- No usar políticas permisivas generales que anulen otras políticas más restrictivas.

## 2. Identidad Firebase: condición técnica crítica

La aplicación usa Firebase Authentication y entrega un UID Firebase como identidad de usuario. El esquema SQL histórico contiene `public.users.id UUID REFERENCES auth.users(id)`. No se debe asumir que un UID Firebase es UUID ni que existe una fila correspondiente en `auth.users`.

Por ello:

- No basar las políticas Firebase en `auth.uid()` hasta verificar el tipo y comportamiento con un token real de prueba.
- Para identificar al usuario Firebase, utilizar el claim firmado `auth.jwt()->>'sub'` como texto, después de validar emisor/proyecto y el rol PostgreSQL.
- El claim literal `role: authenticated` selecciona el rol PostgreSQL `authenticated`; **no** es el rol funcional admin/scout.
- Claims de negocio propuestos: `app_role` (`admin` o `scout`), `app_active` (boolean) y `allowed_modules` (lista de identificadores de módulo). Solo Firebase Admin SDK o un proceso backend confiable puede asignarlos.
- El cliente no puede cambiar custom claims ni escribir perfiles de permisos.
- Revisar y rediseñar la relación `public.users`/trigger `handle_new_user()`: un Firebase user externo no crea automáticamente una fila en `auth.users` ni dispara el trigger Supabase Auth. No reutilizar ese trigger como mecanismo de alta Firebase.

No desplegar ni asignar claims hasta verificar el comportamiento con un usuario de pruebas y un JWT emitido por el proyecto correcto.

## 3. Matriz propuesta por tabla

Convenciones:
- **R** = SELECT.
- **C** = INSERT.
- **U** = UPDATE.
- **D** = DELETE.
- **—** = denegado.
- Admin: CRUD en tablas operativas; administración de permisos únicamente desde backend.
- Scout: solo cuando `app_active=true` y el módulo correspondiente está incluido en `allowed_modules`.

| Tabla | Anónimo | Admin | Scout con módulo autorizado | Restricción adicional |
|---|---:|---:|---:|---|
| `players` | — | CRUD | R/C/U | D solo admin; validar campos y autoría en servidor/RLS |
| `player_attributes` | — | CRUD | R/C/U | D solo admin |
| `anthropometrics` | — | CRUD | R/C/U | D solo admin; acceso por módulo de scouting/valoración |
| `physical_tests` | — | CRUD | R/C/U | D solo admin; acceso por módulo de scouting/valoración |
| `observers` | — | CRUD | R | Altas/bajas solo admin hasta confirmar flujo de mantenimiento |
| `needs` | — | CRUD | R/C/U | D solo admin; módulo `needs` |
| `coaches` | — | CRUD | R/C/U | D solo admin; módulo `gestion-equipo` |
| `tactics` | — | CRUD | R/C/U | D solo admin; módulo `campograma` |
| `team_matches` | — | CRUD | R/C/U | D solo admin; módulo `gestion-equipo` |
| `match_plans` | — | CRUD | R/C/U | D solo admin; módulo `gestion-equipo` |
| `team_sessions` | — | CRUD | R/C/U | D solo admin; módulo `gestion-equipo` |
| `attendance_sessions` | — | CRUD | R/C/U | D solo admin; módulo `gestion-equipo` |
| `users` | — | R | R propio | C/actualización de rol/estado/módulos solo backend; no permitir autoascenso |

### Notas de alcance

1. Los módulos `scouting`, `campograma`, `needs` y `gestion-equipo` se corresponden con los módulos declarados en el código revisado.
2. La matriz trata `anthropometrics` y `physical_tests` como datos sensibles de valoración y no permite acceso anónimo.
3. La política de `users` no debe permitir que un usuario actualice `role`, `active`, `allowed_modules`, UID o email de identidad. Si se requiere editar nombre/avatar, hacerlo con columnas permitidas o endpoint de servidor.
4. Esta es la matriz objetivo, no prueba de que cada módulo utilice hoy exactamente esas tablas. Antes de generar la migración ejecutable se debe completar el inventario de llamadas SELECT/INSERT/UPDATE/DELETE, Storage y Realtime por módulo.
5. La autorización por módulo debe verificarse en RLS, no solo ocultando rutas o botones en React.

## 4. Modelo de claims propuesto

Ejemplo conceptual de claims firmados por Firebase (no copiar a mano ni editar desde el cliente):

```json
{
  "role": "authenticated",
  "app_role": "scout",
  "app_active": true,
  "allowed_modules": ["scouting", "needs"]
}
```

Para el administrador, `app_role` será `admin`; los módulos pueden resolverse como acceso total mediante una regla de servidor. No incluir datos personales, emails ni información de jugadores en los claims.

Firebase limita el tamaño de custom claims y recomienda utilizarlos solo para control de acceso. La lista de módulos debe mantenerse pequeña. La asignación de claims debe ser centralizada, auditable y revocable.

## 5. Funciones auxiliares RLS previstas

La implementación SQL posterior podrá incluir funciones pequeñas y de solo lectura que consulten los claims verificados:

- `public.current_firebase_uid()` → `auth.jwt()->>'sub'` como texto.
- `public.current_app_role()` → `auth.jwt()->>'app_role'`.
- `public.current_user_is_active()` → comprueba `app_active` y `role = authenticated`.
- `public.current_user_has_module(text)` → comprueba admin o módulo en `allowed_modules`.

Estas funciones deberán tener `search_path` seguro, permisos EXECUTE mínimos y no aceptar identidad/rol como parámetros controlados por el cliente. La comprobación de emisor Firebase debe quedar explícita donde sea necesaria y coherente con el proveedor registrado.

## 6. Privilegios SQL además de RLS

RLS no sustituye a los GRANT/REVOKE. La migración debe revisar privilegios efectivos y:
- revocar de `anon` los privilegios de tablas de negocio;
- conceder a `authenticated` solo las operaciones que realmente requiera la aplicación;
- limitar secuencias, funciones RPC y Storage;
- revisar vistas y funciones SECURITY DEFINER;
- no conceder `service_role` al navegador ni guardar claves de servidor en variables `VITE_*`.

## 7. Migración: no ejecutar todavía

No se incluye un script ejecutable deliberadamente. Faltan verificaciones imprescindibles:

1. Confirmar el esquema real de producción tabla por tabla, columnas, constraints, vistas, funciones, buckets y publicaciones Realtime.
2. Confirmar que `sub` de Firebase puede ser utilizado como texto en las políticas y que no se depende de `auth.uid()` UUID.
3. Inventariar todas las operaciones de la aplicación por tabla y módulo.
4. Resolver el perfil de identidad y retirar el supuesto de que el trigger `handle_new_user()` crea perfiles Firebase.
5. Acordar si el scout puede borrar o mantener observadores; por defecto queda denegado.
6. Preparar pruebas en un proyecto Supabase aislado con usuarios admin/scout y token sin claims.
7. Preparar rollback y backup verificado antes de cualquier cambio real.

## 8. Criterios de aceptación

- Token ausente, expirado, de otro proyecto o sin `role: authenticated`: sin acceso.
- Usuario inactivo o sin `app_role` válido: sin acceso.
- Scout sin módulo: sin acceso aunque invoque directamente REST/Storage.
- Scout con módulo: solo operaciones de su matriz.
- Scout no puede borrar ni cambiar permisos.
- Admin puede realizar operaciones aprobadas.
- Ningún usuario puede modificar sus propios claims o elevar su rol.
- No hay política permisiva antigua que amplíe el acceso mediante OR.
- Pruebas funcionales de todos los módulos superadas antes de activar el cliente Supabase Firebase.

## 9. Referencias técnicas

- Supabase — Firebase Auth: https://supabase.com/docs/guides/auth/third-party/firebase-auth
- Supabase — Third-party Auth: https://supabase.com/docs/guides/auth/third-party/overview
- Firebase — Custom claims: https://firebase.google.com/docs/auth/admin/custom-claims

## 10. Límites de seguridad de esta rama

- No se ejecutó SQL en Supabase.
- No se cambiaron permisos, RLS, tablas, funciones ni datos de producción.
- No se asignaron custom claims a usuarios.
- No se modificó el código de ejecución.
- No se modificó `main`, no se fusionó ni se desplegó a producción.


## 11. Refinamiento por módulos reales de la aplicación (22-11-2026)

Este apartado concreta la matriz anterior con los módulos declarados en `CLUB_MODULES` y las operaciones localizadas en la rama. Donde el código no permite determinar una necesidad funcional, se mantiene denegación por defecto y se deja explícito como decisión pendiente. No constituye autorización funcional definitiva.

### 11.1 Módulos reales y dependencias

Los únicos módulos de scout definidos en el código son:
- `scouting`: `/scouting`, `/players`, `/comparison`, `/analytics`.
- `campograma`: `/campograma`.
- `needs`: `/needs`.
- `gestion-equipo`: `/gestion-equipo`, `/coaches`.
- `estadisticas-rivales`: `/estadisticas-rivales`.

No existe actualmente un claim independiente `antropometria` ni `pruebas-fisicas`. Las páginas de antropometría y pruebas físicas consultadas usan `players` y `player_attributes`; no debe inventarse un módulo de autorización distinto sin modificar primero el modelo de módulos.

### 11.2 Matriz técnica refinada propuesta

| Tabla | Lectura scout | Escritura scout | Borrado scout | Claim de módulo requerido | Nota |
|---|---|---|---|---|---|
| `players` | Sí, cuando la pantalla autorizada lo necesita | Sí, solo flujos de scouting/gestión que se aprueben | No | `scouting` o `campograma` o `gestion-equipo` según operación | La fila contiene datos personales; la autorización por módulo no filtra columnas. Limitar campos sensibles en API/vistas o rediseñar el modelo |
| `player_attributes` | Sí | Sí para operaciones de valoración aprobadas | No | `scouting` | Antropometría y pruebas físicas también utilizan esta tabla; el esquema actual no separa ámbitos |
| `tactics` | Sí | Sí | No | `campograma` | UPSERT por clave única `season, team`; validar alcance por equipo |
| `needs` | Sí | Pendiente de aprobación funcional | No | `needs` | El código contiene CRUD; la matriz inicial no debe conceder escritura automáticamente |
| `coaches` | Sí | Pendiente de aprobación funcional | No | `gestion-equipo` | Contiene email/teléfono/observaciones; limitar exposición y exportación |
| `team_matches` | Sí | Sí | No | `gestion-equipo` | Validar que las filas correspondan a equipos permitidos |
| `match_plans` | Sí | Sí | No | `gestion-equipo` | Convocatoria JSONB queda visible como parte de la fila |
| `attendance_sessions` | Sí | Sí | No | `gestion-equipo` | Restringir por equipo/fecha y validar el contenido JSONB |
| `observers` | Solo admin por defecto | No | No | Admin | La UI restringe esta página a admin y la tabla no tiene columna de propietario |
| `users` | Solo perfil propio, si se habilita endpoint/consulta acotada | No desde cliente | No | Identidad autenticada | `Admin.tsx` consulta `select('*')`; mover a endpoint admin y no exponer filas completas a scout |
| `anthropometrics` | No conceder hasta confirmar uso | No | No | Ninguno hasta localizar flujo | Tabla SQL existe, pero no se encontró llamada directa desde las páginas revisadas |
| `physical_tests` | No conceder hasta confirmar uso | No | No | Ninguno hasta localizar flujo | La pantalla revisada usa `player_attributes`/almacenamiento local |
| `team_sessions` | No conceder hasta confirmar uso | No | No | Ninguno hasta localizar flujo | No se localizó llamada directa en la rama |

**Importante:** los permisos de `players` son la superficie más amplia. Una política por fila no limita columnas; conceder SELECT de la fila completa también puede exponer email, teléfono, año de nacimiento y observaciones. Antes de activar acceso scout a esta tabla hay que decidir si esos campos son necesarios para cada módulo. La solución robusta puede requerir vistas con columnas permitidas o endpoints que proyecten campos, no solo RLS.

### 11.3 Operaciones administrativas que deben salir del navegador

Propuesta de backend admin-only:
- importación/restauración masiva desde `Admin.tsx`;
- lectura administrativa de `users`;
- eliminación de jugadores (por las cascadas de FK);
- mantenimiento de `observers`;
- cambios de roles, estado y módulos;
- seed/limpieza de `seedJugadoras.ts`, o su retirada si ya no se necesita.

El backend debe verificar token Firebase, UID/rol firmado o autorización persistente de servidor, validar el payload y registrar actor/acción/resultado. No aceptar una propiedad `role: admin` enviada por el navegador.

### 11.4 Decisiones de negocio aún no resueltas

No se puede cerrar una matriz ejecutable sin estas decisiones:
1. ¿El scout puede crear y editar jugadoras desde el módulo `scouting`, o solo consultar y generar informes?
2. ¿Puede crear y editar jugadores/plantillas desde `gestion-equipo`, o esa escritura es exclusiva del administrador?
3. ¿Puede crear y editar necesidades desde el módulo `needs`?
4. ¿Puede crear y editar entrenadores desde `gestion-equipo`?
5. ¿Qué campos personales de jugadoras puede consultar el scout? El RLS de tabla no oculta columnas.
6. ¿La subida de fotografías seguirá siendo pública en el bucket `avatars` o debe pasar por backend?
7. ¿Se mantendrán las tablas `anthropometrics`, `physical_tests` y `team_sessions` aunque no se localice uso en la rama?

Hasta resolver estas decisiones, la política recomendada es conservadora: no conceder escritura scout en `needs` ni `coaches`, no conceder acceso a tablas sin uso confirmado, reservar borrados y operaciones masivas a admin y no exponer `users` al cliente scout.

### 11.5 Pruebas de autorización obligatorias

Para cada tabla y operación, probar con:
- JWT ausente / sin claim PostgreSQL `role=authenticated`;
- Firebase de proyecto distinto;
- usuario activo sin `app_role`;
- usuario inactivo;
- admin;
- scout con cada módulo individual;
- scout sin el módulo;
- scout con combinación de módulos;
- intento directo REST que omita la UI;
- payload que intente alterar UID, equipo, `created_by`, rol o campos no permitidos.

Las pruebas deben demostrar tanto el resultado permitido como el denegado y comprobar que ninguna política PERMISSIVE antigua amplía acceso por OR.

No se ha generado ni ejecutado SQL. No se han modificado permisos, tablas, datos, claims, Storage ni configuración de producción.


## 12. Decisiones funcionales confirmadas por el responsable (22-11-2026)

Se incorporan como requisitos aprobados para el diseño, no como permisos ya activados:

| Ámbito | Decisión confirmada | Consecuencia técnica |
|---|---|---|
| Jugadoras | El scout puede crear y editar; no borrar | Permitir INSERT/UPDATE bajo claim de módulo aprobado; DELETE solo admin |
| Necesidades | Solo lectura para scout | SELECT con claim `needs`; INSERT/UPDATE/DELETE solo admin |
| Entrenadores | Solo lectura para scout | SELECT con claim `gestion-equipo`; INSERT/UPDATE/DELETE solo admin |
| Datos personales de jugadoras | El scout puede consultar todos los campos disponibles | No aplicar ocultación de columnas por ahora; mantener autenticación, autorización por módulo y auditoría de acceso |

La autorización de todos los campos no elimina la obligación de protegerlos: el acceso seguirá limitado a usuarios autenticados y al módulo habilitado. Se recomienda registrar accesos administrativos y revisar periódicamente quién mantiene el módulo scouting.

## 13. Diseño técnico derivado de las decisiones

### 13.1 Matriz definitiva de scout para las tablas activas

| Tabla | Claim requerido | SELECT scout | INSERT scout | UPDATE scout | DELETE scout |
|---|---|---:|---:|---:|---:|
| `players` | `scouting` | Sí | Sí | Sí | No |
| `player_attributes` | `scouting` | Sí | Sí | Sí | No |
| `needs` | `needs` | Sí | No | No | No |
| `coaches` | `gestion-equipo` | Sí | No | No | No |
| `tactics` | `campograma` | Sí | Sí | Sí | No |
| `team_matches` | `gestion-equipo` | Sí | Sí | Sí | No |
| `match_plans` | `gestion-equipo` | Sí | Sí | Sí | No |
| `attendance_sessions` | `gestion-equipo` | Sí | Sí | Sí | No |
| `observers` | Admin | No | No | No | No |
| `users` | Admin / perfil propio | Solo perfil propio, cuando se implemente lectura acotada | No | No desde cliente | No |
| `anthropometrics` | Sin claim por ahora | No | No | No | No |
| `physical_tests` | Sin claim por ahora | No | No | No | No |
| `team_sessions` | Sin claim por ahora | No | No | No | No |

Admin conserva las operaciones de negocio autorizadas, pero las operaciones masivas, gestión de identidad y borrados con cascada deben pasar por backend confiable. El backend no debe convertirse en un bypass genérico: cada endpoint tendrá autorización y validación específicas.

**Dependencia que hay que resolver antes de activar esta matriz:** la aplicación también crea/actualiza filas de `players` desde flujos de asistencia y sincronización de gestión de equipos. El requisito funcional aprobado permite al scout crear/editar jugadoras en scouting, pero no autoriza implícitamente a conceder escritura general de `players` a cualquier scout con `gestion-equipo`. Antes de escribir la migración, se separarán esas operaciones o se aprobará expresamente la escritura necesaria por flujo.

### 13.2 Patrón de autorización RLS

El SQL de pruebas deberá implementar funciones auxiliares equivalentes a:

- `current_firebase_uid()`: lee `auth.jwt()->>'sub'` como texto.
- `is_authenticated_app_user()`: exige claim PostgreSQL `role = authenticated`, `app_active = true` y `app_role` reconocido.
- `is_app_admin()`: usuario activo con `app_role = admin`.
- `has_app_module(module_id)`: administrador o scout activo cuyo `allowed_modules` contiene exactamente el módulo solicitado.

Las funciones serán de solo lectura, con `search_path` fijado, sin argumentos que permitan al cliente declarar su propio UID/rol, y con EXECUTE concedido solo a los roles necesarios. Los helpers no deben confiar en un campo del body, localStorage ni perfil editable desde React.

### 13.3 Políticas por operación, no una política ALL

Se crearán políticas separadas para SELECT, INSERT, UPDATE y DELETE. Se eliminarán por nombre exacto las políticas permisivas heredadas que amplían acceso. No se utilizará una política `ALL USING (true)`.

Para UPDATE, se exigirán tanto `USING` como `WITH CHECK` para impedir que el usuario cambie el propietario, equipo o ámbito de una fila hacia otro ámbito. Para INSERT, el servidor o la política debe comprobar la identidad y los campos de autoría cuando exista una relación de identidad válida.

### 13.4 Identidad y columnas de autoría

No utilizar `auth.uid()` ni comparar Firebase UID con UUID de `public.users.id` o `auth.users.id` hasta resolver el modelo de identidad. Las columnas `created_by` que referencian `auth.users` tampoco pueden rellenarse con Firebase UID arbitrario.

Antes de la migración aislada se debe decidir una de estas opciones:
1. Mantener Firebase UID como texto en una tabla propia de mapeo de identidades, con FK de negocio hacia esa tabla.
2. Utilizar una identidad UUID interna generada por backend y mapearla de forma explícita al UID Firebase.
3. Eliminar/redefinir las FK heredadas que dependan de Supabase Auth, mediante migración controlada y pruebas de integridad.

No se debe resolver este problema con casts de texto a UUID ni generando UUID deterministas en el navegador.

### 13.5 Orden de trabajo técnico inmediato

1. Separar las escrituras de `players` por módulo/flujo (scouting frente a gestión-equipo y sincronización).
2. Resolver identidad y autoría (`created_by`, `updated_by`, `public.users`).
3. Preparar proyecto Supabase aislado y dataset sintético.
4. Generar migración de prueba con REVOKE/GRANT mínimos y políticas por operación.
5. Añadir pruebas SQL/API para admin, scout con cada módulo, scout sin módulo, usuario inactivo y anónimo.
6. Probar todas las pantallas y sincronizaciones con la nueva matriz.
7. Preparar rollback y revisión antes de solicitar autorización independiente para producción.

**Estado:** las decisiones funcionales anteriores se consideran incorporadas al diseño. No se ha generado ni ejecutado una migración SQL, ni se ha modificado el proyecto Supabase de producción, Firebase, Storage, datos, claims o despliegues.
