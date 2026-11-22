# Fase B — hoja de ruta de implementación y bloqueos

**Rama:** `feat/fase-b-hardening-supabase`  
**Estado:** preparación técnica; no desplegado.  
**Fecha:** 22-11-2026

## Objetivo

Completar la autenticación Firebase → Supabase, el backend de confianza, la autorización por módulos, la matriz RLS/GRANT, Storage y pruebas funcionales sin alterar producción durante la preparación.

## Estado confirmado

- Supabase Third-Party Auth tiene registrado el proyecto Firebase `gen-lang-client-0091658680` (captura de producción facilitada por el usuario).
- El cliente remoto actual se crea con URL y anon key; no pasa Firebase ID token mediante `accessToken`.
- La aplicación establece `admin/scout` en el estado cliente después de comprobar emails y permisos Firestore. Esto no es una autorización de servidor.
- `firebase-admin` está instalado, pero el árbol de la rama no contiene `functions/` ni `firebase.json`.
- El árbol inspeccionado contiene `api/rffm/*` y `api/tactical-advice.ts`, pero no contiene los endpoints invocados por el cliente `/api/admin/sync-scout-access` y `/api/scout/seal-uid`. Confirmar si están ausentes también en el despliegue actual.
- `src/App.tsx` ejecuta `syncJugadorasToDatabaseAndLocalStorage()` en el efecto de sesión. `src/lib/seedJugadoras.ts` contiene UPDATE de `players.foto_url` y UPSERT de datos semilla. Debe separarse del login.
- `api/tactical-advice.ts` no verifica token Firebase y permite CORS `*`; puede consumir la clave Gemini del servidor.
- No se ha identificado en los archivos revisados un flujo de Storage para borrar fotografías antiguas.
- Hay tablas auditadas que no tienen uso directo confirmado en el código revisado: `anthropometrics`, `physical_tests`, `tactics`, `team_sessions`. No asignar permisos hasta confirmar persistencia real.

## Fases de ejecución

### A. Identidad Firebase y Supabase
1. Crear un entorno Supabase/Firebase de prueba separado de producción.
2. Verificar un token Firebase de prueba en servidor y comprobar issuer, audience, subject, email_verified y proyecto.
3. Asignar por Admin SDK los claims `role=authenticated`, `app_role`, `app_active`, `allowed_modules`.
4. Preservar claims existentes al actualizarlos: Firebase `setCustomUserClaims` reemplaza el objeto completo.
5. Forzar renovación del token y comprobar que Supabase reconoce al usuario como rol PostgreSQL `authenticated`.
6. Solo tras superar estas pruebas, implementar `accessToken` en el cliente Supabase de la rama de prueba.

### B. Backend de confianza
1. Definir credenciales Admin SDK como secretos de servidor, nunca en Git, frontend ni variables `VITE_*`.
2. Definir allowlist del UID Firebase administrador tras verificarlo en consola; no confiar solo en un email del body.
3. Para el scout, leer desde servidor el documento Firestore de acceso, validar active, UID sellado y módulos.
4. Crear endpoints protegidos para sincronización de claims y sellado de UID; comprobar las rutas ya invocadas por el cliente.
5. Aplicar rate limiting, validación de método/body, CORS restringido y logs sin tokens.
6. Mover seed/limpieza a una acción administrativa explícita, con IDs revisados y log de cambios.

### C. Autorización de datos
1. Finalizar la matriz tabla × operación × módulo a partir de todas las llamadas activas.
2. Confirmar columnas de producción, relaciones y cascadas antes de escribir SQL.
3. Preparar funciones RLS de solo lectura con `search_path` seguro.
4. Eliminar políticas permisivas antiguas y políticas duplicadas que amplían acceso por OR.
5. Aplicar GRANT mínimos además de RLS; denegar anon en tablas de negocio.
6. Proteger especialmente `users.role`, `players` y sus tablas hijas.
7. No activar FORCE RLS globalmente sin revisar propietarios, triggers y procesos administrativos.

### D. Storage
1. Mantener temporalmente bucket `avatars` público para no romper URLs existentes.
2. Añadir INSERT únicamente para usuarios autorizados y prefijo `player-photos/`.
3. Definir tamaño/MIME tras comprobar el archivo original que sube el frontend.
4. No permitir UPDATE/DELETE desde scout salvo necesidad demostrada; diseñar limpieza administrativa de objetos huérfanos.
5. Probar URL pública, subida autorizada, subida anónima denegada y borrado no autorizado.

### E. APIs
1. Proteger `api/tactical-advice.ts` con Firebase ID token verificado, validación de payload y rate limiting.
2. Restringir CORS a orígenes reales de la aplicación.
3. Revisar endpoints RFFM individualmente: si son públicos, mantener su propósito público con validación y límites; no aplicar autenticación indiscriminadamente.
4. Confirmar que ninguna clave de servidor aparece en bundle o logs.

### F. Pruebas y aceptación
- Anónimo: no puede leer/escribir datos de negocio.
- Token de proyecto distinto, token caducado o token ausente: denegado.
- Token sin `role=authenticated`: Supabase no debe otorgar acceso authenticated.
- Scout inactivo: denegado.
- Scout sin módulo: denegado incluso con llamada REST directa.
- Scout con módulo: solo lectura/escritura aprobadas; sin borrado privilegiado.
- Admin: operaciones aprobadas y gestión de permisos solo por backend.
- Nadie puede autoasignarse rol, estado o módulos.
- Las fotos siguen mostrándose y las subidas autorizadas funcionan.
- Pruebas funcionales de jugadores, plantillas, asistencias, partidos, entrenadores, necesidades, observadores, sincronización y fallback local.
- Build, TypeScript y pruebas automatizadas satisfactorias.

## Decisiones que no deben improvisarse

- No asignar `app_role=admin` a partir de un email no verificado en servidor; confirmar UID y allowlist.
- No asumir que Firebase UID es UUID ni usar `auth.uid()` sin validar el comportamiento; usar `sub` como texto para Firebase si la integración confirmada lo requiere.
- No hacer `setCustomUserClaims` sin preservar claims ajenos: la operación reemplaza todos los custom claims.
- No activar el cliente Supabase con Firebase token antes de claims y RLS.
- No eliminar el fallback Base64 ni el bucket público sin pruebas de compatibilidad.
- No ejecutar SQL de corrección en producción durante la preparación.

## Límites de autorización

La autorización dada para continuar Fase B permite análisis y preparación en esta rama. No autoriza:
- cambiar claims de usuarios Firebase reales;
- crear/editar secretos o credenciales de producción;
- modificar políticas, privilegios, funciones o buckets de Supabase producción;
- desplegar endpoints en Vercel producción;
- fusionar a `main` o desplegar la aplicación.

Cualquier cambio real de producción requerirá una autorización expresa posterior y un plan de ejecución con backup y rollback.
