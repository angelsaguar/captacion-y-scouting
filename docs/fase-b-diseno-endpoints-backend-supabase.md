# Fase B — Diseño de endpoints backend para sustituir el acceso directo a Supabase

**Rama:** `feat/fase-b-hardening-supabase`  
**Fecha:** 2026-11-24  
**Tipo:** diseño técnico; no implementado.  
**Estado de producción:** sin cambios.

## 1. Objetivo

Trasladar progresivamente las operaciones Supabase que hoy se ejecutan desde el navegador a endpoints Express protegidos por la autenticación Firebase Admin ya existente. El objetivo es que la autorización de negocio se compruebe en servidor y que el navegador deje de depender de políticas RLS permisivas para realizar operaciones CRUD.

Este documento no autoriza todavía a crear endpoints, modificar pantallas, cambiar variables de entorno ni alterar políticas o grants en producción.

## 2. Hallazgos que condicionan el diseño

1. El cliente de navegador se inicializa en `src/lib/supabase.ts` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
2. El middleware `requireClubAuth(requiredModules, adminOnly)` de `server.ts` valida Firebase ID tokens y establece `req.clubUser` con `uid`, `email` y `role`.
3. Ese middleware protege endpoints Express existentes, pero no las peticiones directas de Supabase realizadas por el navegador.
4. Las consultas directas localizadas abarcan jugadoras, atributos, entrenadores, necesidades, observadores, partidos, sesiones, planes y usuarios.
5. `src/lib/encryptedBackup.ts` define `AUDITED_SUPABASE_TABLES` con 10 tablas: users, players, player_attributes, team_matches, attendance_sessions, match_plans, coaches, needs, observers y tactics. No incluye anthropometrics, physical_tests ni team_sessions, aunque existen en el esquema inventariado. La cobertura de backup debe revisarse antes de cualquier endurecimiento.
6. No se ha confirmado en el código inspeccionado un cliente Supabase de servidor ni la presencia/configuración de una credencial privada de Supabase. No asumir que `SUPABASE_SERVICE_ROLE_KEY` existe en el despliegue.

## 3. Arquitectura objetivo

**Navegador → Express API → Firebase Admin (identidad/permisos) → Supabase (acceso de servidor).**

- El navegador envía `Authorization: Bearer <Firebase ID token>`.
- Express valida el token con `requireClubAuth`.
- El endpoint comprueba el módulo y el rol necesarios. No aceptar el rol, UID o módulos enviados en el cuerpo como autoridad.
- El servidor utiliza una credencial Supabase privada, exclusivamente desde variables de entorno del servidor.
- Las operaciones reciben DTOs validados y campos permitidos por lista blanca; nunca aceptar `select *`, nombre de tabla, columna o filtro SQL arbitrario desde el cliente.
- Los endpoints deben limitar paginación, tamaño de payload y frecuencia.
- Los errores Supabase se registran en servidor sin filtrar secretos, tokens ni datos personales en la respuesta.
- La clave `service_role` omite RLS; por eso cada endpoint debe implementar autorización de negocio explícita y pruebas negativas. No basta con comprobar que el usuario está autenticado.

## 4. Matriz propuesta de endpoints

Los nombres son propuesta de diseño, no rutas ya creadas.

| Endpoint | Método | Módulo / rol | Operación y alcance |
|---|---|---|---|
| `/api/admin/users` | GET | Administrador principal | Lista acotada de usuarios históricos; campos explícitos, nunca `select *`. No usar `public.users.role` como autoridad de permisos. |
| `/api/players` | GET | `scouting` | Listado paginado y filtros permitidos; atributos relacionados solo cuando sean necesarios. |
| `/api/players/:id` | GET | `scouting` | Detalle de una jugadora y atributos asociados. |
| `/api/players` | POST | `scouting` | Alta de jugadora; validar esquema y campos permitidos. |
| `/api/players/:id` | PATCH | `scouting` | Actualización parcial; no permitir cambiar campos de auditoría/propiedad sin regla explícita. |
| `/api/players/:id` | DELETE | Administrador o permiso específico | Borrado controlado; verificar dependencias y política de conservación antes de implementarlo. |
| `/api/players/:id/attributes` | PUT | `scouting` | Sustituir/actualizar atributos en una operación transaccional o segura frente a fallos parciales. |
| `/api/coaches` | GET/POST | `gestion-equipo` | Consulta y alta de entrenadores. |
| `/api/coaches/:id` | PATCH/DELETE | `gestion-equipo` / administrador según decisión | Modificación y borrado de entrenadores. |
| `/api/needs` | GET/POST | `scouting` o módulo que se confirme | Consulta y alta de necesidades. Confirmar módulo exacto en la matriz funcional. |
| `/api/needs/:id` | PATCH/DELETE | Permiso del módulo / administrador | Actualización y borrado controlados. |
| `/api/observers` | GET | Módulo autorizado | Lectura del catálogo de observadores. |
| `/api/observers` | POST | Administrador | Alta de observador. |
| `/api/observers/:id` | PATCH/DELETE | Administrador | Cambios y borrado controlados. |
| `/api/team-matches` | GET/PUT | `gestion-equipo` | Lectura y sincronización por equipo autorizado; no aceptar un equipo arbitrario sin validar pertenencia/permisos. |
| `/api/attendance-sessions` | GET/PUT | `gestion-equipo` | Lectura y sincronización de sesiones por equipo. |
| `/api/match-plans` | GET/PUT | `gestion-equipo` | Lectura y sincronización de planes por equipo. |
| `/api/admin/supabase-backup` | POST | Administrador principal | Backup de tablas explícitamente permitidas; registrar manifiesto y errores, limitar tamaño y duración. |

### Notas sobre permisos

- La matriz de módulos debe alinearse con los valores reales admitidos por `ClubModuleId` y `evaluateDecodedClubToken`; no inventar identificadores de módulo.
- El endpoint de necesidades requiere confirmar qué módulo de producto debe habilitarlo.
- Las operaciones de gestión de equipos deben comprobar que el usuario puede actuar sobre el equipo concreto. Un permiso genérico `gestion-equipo` no debe convertirse automáticamente en acceso a cualquier equipo si el modelo de autorización contempla alcance por equipo.
- El endpoint de administración de usuarios debe devolver solo los campos necesarios. La tabla histórica `public.users` no debe convertirse en el registro autoritativo de roles.

## 5. Contrato común de API

### Petición

- Cabecera: `Authorization: Bearer <Firebase ID token>`.
- `Content-Type: application/json` para POST, PUT y PATCH.
- Identificadores validados por formato y existencia.
- Filtros y ordenaciones permitidos por listas cerradas.
- Paginación con límites máximos definidos en servidor.

### Respuestas

- `200`: lectura o actualización correcta.
- `201`: creación correcta.
- `400`: DTO o parámetros inválidos.
- `401`: token ausente, inválido o caducado.
- `403`: identidad válida sin permiso suficiente.
- `404`: recurso inexistente o no visible para el usuario.
- `409`: conflicto de integridad/versión.
- `413`: payload demasiado grande.
- `429`: límite de frecuencia excedido.
- `500/503`: error interno o dependencia no disponible.

Nunca devolver `200` con una lista vacía como sustituto de un error de consulta. Si Supabase falla, devolver error explícito y registrar el detalle solo en servidor.

## 6. Requisitos de implementación

1. Crear un módulo de servidor aislado, por ejemplo `server/supabaseAdmin.ts`, que inicialice el cliente solo si están presentes las variables privadas esperadas.
2. No importar el cliente de navegador `src/lib/supabase.ts` desde el servidor.
3. No incluir credenciales privadas en variables `VITE_*`, archivos versionados, respuestas HTTP o logs.
4. Reutilizar `requireClubAuth` y añadir comprobaciones de módulo/rol por endpoint.
5. Validar entradas con esquemas (por ejemplo Zod, si ya está instalado; verificar dependencias antes de elegir).
6. Proyectar columnas explícitas en las respuestas y excluir campos sensibles no necesarios.
7. Definir límites de paginación, rate limit y tamaño de petición.
8. Evitar escrituras parciales: usar transacciones/funciones RPC controladas cuando una operación afecte a varias tablas; si no es viable, diseñar compensación e idempotencia.
9. Añadir pruebas de acceso autorizado y denegado para cada endpoint.
10. Migrar pantallas por grupos funcionales y comprobar que la persistencia local y los mecanismos de sincronización siguen comportándose como antes.

## 7. Orden recomendado de migración

**Etapa A — Administración y usuarios**
- Crear `GET /api/admin/users` para sustituir la consulta de `Admin.tsx`.
- Acordar campos históricos expuestos y comportamiento ante errores.
- No implementar gestión de roles sobre `public.users`.

**Etapa B — Scouting**
- Lectura/listado, detalle, alta y edición de jugadoras.
- Atributos de jugadoras.
- Revisar cuidadosamente el borrado actual: `Players.tsx` borra por ID y además puede borrar por nombre/apellidos/equipo. La segunda operación puede afectar a más de una fila; no trasladarla literalmente sin una regla de unicidad y una revisión funcional.

**Etapa C — Gestión de equipo**
- Entrenadores, partidos, sesiones y planes.
- Mantener sincronización Firestore y tombstones/aislamiento por equipo.
- No sustituir el flujo de sincronización por escrituras simples sin preservar sus reglas de reconciliación.

**Etapa D — Necesidades y observadores**
- Definir módulo y alcance de permisos.
- Mantener la normalización/deduplicación de observadores y el comportamiento de caché mientras se migra.

**Etapa E — Backup**
- Ampliar la cobertura de backup de forma explícita tras confirmar qué tablas deben formar parte de la copia.
- No exponer un endpoint genérico que acepte nombres arbitrarios de tabla.

## 8. Pruebas obligatorias antes de producción

- Sin token: 401.
- Token inválido o expirado: 401.
- Scout sin módulo: 403.
- Scout con módulo y operación autorizada: éxito.
- Scout intentando operación exclusiva de administrador: 403.
- Administrador: éxito solo en operaciones expresamente administrativas.
- Acceso a recurso de otro equipo: 403 o 404 según política definida.
- Payload con campos no permitidos: 400.
- Paginación excesiva: límite aplicado.
- Error Supabase: respuesta 5xx, nunca falso éxito ni lista vacía.
- Reintento de una operación de sincronización: resultado idempotente.
- Regresión de caché local, backup, Firestore sync y tombstones.

## 9. Bloqueos que deben resolverse antes de codificar

1. Confirmar el resultado de privilegios efectivos de la consulta 5 del inventario SQL, incluyendo privilegios por columna para `public.users`.
2. Confirmar en el entorno de despliegue si existe una credencial privada Supabase disponible solo en servidor. No compartir su valor; basta con confirmar el nombre de la variable y que está configurada.
3. Acordar qué módulos pueden leer/escribir necesidades, entrenadores y observadores.
4. Confirmar si se mantienen los borrados de jugadoras y qué política de conservación se aplica.
5. Confirmar las tablas que deben cubrir los backups (el conjunto actual tiene 10, frente a 13 tablas públicas inventariadas).
6. Disponer de un proyecto Supabase de pruebas para validar el nuevo backend antes de tocar producción.

## 10. Estado

- Inventario estático principal: realizado; quedan por revisar usos indirectos/dinámicos y completar búsqueda global.
- Diseño de endpoints: documentado.
- Código funcional: no modificado.
- Supabase producción: no modificado.
- Próximo paso tras resolver bloqueos: implementar primero el cliente Supabase de servidor y `GET /api/admin/users` en la rama de trabajo, con pruebas, sin desplegar ni cambiar políticas de producción.
