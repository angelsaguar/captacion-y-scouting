# Fase B — Separación de escrituras de players por módulo

**Rama:** `feat/fase-b-hardening-supabase`  
**Fecha:** 22-11-2026  
**Estado:** diseño técnico basado en inspección de los puntos de escritura; no ejecutado.

## 1. Decisión funcional aplicada

El scout puede crear y editar jugadoras desde el ámbito de scouting, pero no borrarlas. Esta decisión no concede automáticamente permisos de escritura sobre `players` a cualquier otra pantalla o módulo.

Por tanto:
- `scouting`: SELECT, INSERT, UPDATE en `players`; sin DELETE.
- `gestion-equipo`: lectura de jugadores necesaria para plantillas y asistencia; no obtiene escritura general sobre `players` por el mero hecho de tener el módulo.
- Admin: puede gestionar jugadores; borrados y operaciones masivas se canalizan por backend.
- `player_attributes`: escritura del scout únicamente cuando la operación pertenece al flujo de scouting y tiene el módulo `scouting`; DELETE de atributos no se concede al scout mientras la UI utilice reemplazo destructivo de atributos.

## 2. Puntos de escritura localizados

| Archivo | Operación | Contexto funcional | Tratamiento propuesto |
|---|---|---|---|
| `src/pages/PlayerForm.tsx` | UPSERT `players` | Alta/edición desde scouting | Mantener para scout con claim `scouting`; validar campos y evitar cambios de ID/autoría |
| `src/pages/PlayerForm.tsx` | DELETE + UPSERT `player_attributes` | Reemplazo completo de atributos | Refactorizar a UPSERT por clave única y operación segura; no permitir DELETE general al scout |
| `src/pages/Players.tsx` | DELETE `players` | Borrado de jugadora | Admin/backend exclusivamente; la UI debe ocultar/deshabilitar acción a scout |
| `src/pages/gestion/Plantilla.tsx` | UPSERT `players` | Edición/alta desde plantilla | No conceder por `gestion-equipo`; migrar a endpoint específico que exija admin o `scouting`, o dejar escritura local hasta que el usuario disponga de scouting |
| `src/pages/gestion/Plantilla.tsx` | DELETE `players` | Borrado desde plantilla/sincronización | Admin/backend exclusivamente; evitar borrado remoto directo desde navegador |
| `src/pages/gestion/Plantilla.tsx` | INSERT `players` | Incorporación de jugadora existente a persistencia remota | Validar si es alta real o vinculación de roster; endpoint con autorización específica |
| `src/pages/gestion/Asistencia.tsx` | UPSERT `players` | Alta rápida de jugadora durante asistencia | No autorizar por `gestion-equipo` sin decisión expresa; convertir en alta local pendiente o exigir `scouting`/admin |
| `src/lib/clubAccessAndSync.ts` | SELECT `players`, SELECT/UPSERT `player_attributes` | Sincronización del módulo scouting | Mantener lectura/sincronización condicionada a `scouting`; separar escrituras de otras tablas por módulo |
| `src/pages/Admin.tsx` | UPSERT `players` | Restauración/importación masiva | Backend admin-only; no ampliar RLS de scout para soportar esta función |

Los puntos anteriores se han localizado en la rama de trabajo. El inventario completo y los números de línea deben volver a generarse al implementar porque pueden cambiar con las modificaciones.

## 3. Diseño de autorización de endpoints

No crear un endpoint genérico que acepte tabla, operación y payload arbitrarios.

Endpoints específicos propuestos:

- `POST /api/admin/players/bulk-import`: admin exclusivamente; validar formato, tamaño, columnas permitidas y resultado por registro.
- `DELETE /api/admin/players/:id`: admin exclusivamente; comprobar cascadas y registrar auditoría.
- `POST /api/players` y `PATCH /api/players/:id`: admin o scout activo con claim `scouting`; validar esquema de campos y bloquear columnas de sistema.
- `POST /api/attendance/player-draft`: preferible persistencia local/cola pendiente; no insertar en `players` sin autorización de scouting/admin.
- `POST /api/roster/player-link`: solo si se confirma que la operación de Plantilla es vincular un jugador ya existente y no crear/editar la ficha completa; validar equipo y relación.

Todos los endpoints deben verificar Firebase ID token en servidor, UID, audiencia/proyecto, email verificado y autorización persistente/claims firmados. El cliente nunca elige el rol ni puede enviar un UID de otro usuario como actor.

## 4. Protección de player_attributes

El código actual elimina todos los atributos del jugador y vuelve a insertarlos. Una política RLS de DELETE negado al scout rompería esa secuencia. No se debe abrir DELETE global para resolverlo.

Opciones técnicas:
1. Cambiar el cliente a UPSERT por la clave única `(player_id, atributo)`, con actualización solo de atributos enviados y un mecanismo explícito y autorizado para retirar un atributo.
2. Encapsular reemplazo completo en un endpoint de scouting que valide el jugador y el conjunto de atributos y registre la acción.
3. Separar atributos por ámbito/módulo en tablas distintas si las reglas de acceso requieren permisos realmente independientes.

La opción recomendada inicial es UPSERT sin borrado destructivo; el borrado puntual debe diseñarse y probarse después.

## 5. Requisitos de prueba

- Scout con `scouting`: crea/edita ficha y atributos; no borra jugadora ni atributos.
- Scout solo con `gestion-equipo`: consulta jugadores y trabaja con partidos/asistencia según permisos; no crea/edita fichas de `players`.
- Scout con `gestion-equipo` + `scouting`: escritura solo mediante flujo autorizado de scouting; no gana DELETE.
- Scout con `needs`: solo SELECT en `needs`.
- Scout con `gestion-equipo`: solo SELECT en `coaches`.
- Admin: operaciones administrativas disponibles a través de backend.
- REST directo: todas las pruebas se repiten omitiendo la interfaz.
- Intentos de alterar `id`, `created_by`, `updated_by`, `equipo_asignado` o campos de rol deben rechazarse o quedar determinados por servidor.

## 6. Bloqueo de identidad

La autorización no debe implementarse hasta resolver las claves foráneas:
- `players.created_by` referencia `auth.users.id`.
- `needs.created_by` referencia `auth.users.id`.
- `coaches.created_by` referencia `public.users.id`.
- `tactics.updated_by` referencia `public.users.id`.
- `public.users.id` es UUID y no equivale al Firebase UID de texto.

La opción preferida para una futura migración controlada es una tabla interna de identidades con UUID propio y columna Firebase UID única de tipo texto. El backend vincula el token Firebase verificado con esa identidad interna. La migración deberá conservar los datos históricos y no sustituir automáticamente las FK por casts ni UUID fabricados en el cliente. Hay que decidir si las FK existentes se migran a la nueva tabla o si se mantienen perfiles Supabase internos gestionados exclusivamente por backend.

## 7. Fuera de alcance y seguridad de producción

- No se han modificado archivos funcionales de la aplicación.
- No se ha creado SQL ejecutable.
- No se ha ejecutado ninguna consulta de escritura en Supabase.
- No se han alterado RLS, GRANT, Storage, Firebase, Firestore, claims ni datos.
- No se ha fusionado la rama ni desplegado.
