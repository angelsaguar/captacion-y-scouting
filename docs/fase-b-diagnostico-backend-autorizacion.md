# Fase B — Diagnóstico del backend de autorización

Fecha: 22-11-2026  
Rama de trabajo: `feat/fase-b-hardening-supabase`  
Estado: análisis y diseño; **sin cambios en producción**.

## 1. Identidad confirmada

El administrador ha confirmado que el UID que facilitó corresponde a `angel.saguar@telefonica.net` en el proyecto Firebase `gen-lang-client-0091658680`. Por seguridad, el UID literal no se reproduce en este documento ni se incorpora al repositorio.

## 2. Comportamiento observado en el código actual

Revisión de `server.ts`, `src/lib/clubAccessAndSync.ts`, `src/lib/firebase.ts`, `firebase-applet-config.json` y `package.json` en esta rama.

### 2.1 Autenticación de API

- `server.ts` verifica criptográficamente los Firebase ID tokens mediante `getAuth().verifyIdToken()`.
- La autorización posterior compara correo, verificación del correo y proyecto/audience.
- La identidad de administrador y scout se determina actualmente por correo autorizado.
- No se están usando todavía custom claims de Firebase para `app_role`, `app_active` ni `allowed_modules`.
- El servidor inicializa Firebase Admin con el projectId, sin credenciales embebidas; la ejecución depende de credenciales de entorno/identidad de servicio del runtime.

### 2.2 Permisos del scout: problema de persistencia

- El documento persistente de permisos está en Firestore: `club_access/alejandro_scout`.
- El cliente lo lee y lo actualiza desde `src/lib/clubAccessAndSync.ts`.
- El servidor mantiene una segunda copia en la variable global `serverScoutAccessMirror`.
- Esa copia se inicializa en memoria con permisos vacíos y se modifica mediante `POST /api/admin/sync-scout-access`.
- El middleware `requireClubAuth` evalúa los módulos contra esa copia en memoria, no contra el documento de Firestore.
- El estado en memoria puede perderse al reiniciar, escalar o reciclar el proceso. También puede quedarse desactualizado respecto de Firestore si no se ejecuta la sincronización.
- El endpoint de sincronización acepta campos de UID, estado activo y módulos enviados por el cliente administrador. Aunque exige token admin, crea una segunda fuente de verdad que no es necesaria si Firestore ya contiene el estado autorizado.

### 2.3 Vinculación UID

- El cliente scout comprueba el UID frente a Firestore y, si no está sellado, escribe el UID y `uidLocked=true` en el documento.
- Después llama a `POST /api/scout/seal-uid`.
- El endpoint del servidor vuelve a sellar únicamente la copia en memoria; no persiste el vínculo en Firestore.
- Por tanto, el endpoint no aporta una garantía durable y puede responder de forma inconsistente tras un reinicio.

### 2.4 Configuración Firestore

- El proyecto usa una base de datos Firestore con ID nombrado, definido en `firebase-applet-config.json`; no debe asumirse que la base por defecto es la correcta.
- La futura integración Admin SDK debe abrir explícitamente esa base de datos nombrada.
- La cuenta de servicio debe proceder de Application Default Credentials / identidad de servicio del entorno de ejecución. Nunca se añadirá un JSON de cuenta de servicio al repositorio ni al frontend.

## 3. Diseño de corrección propuesto

### Etapa A — Una sola fuente de verdad

1. Leer `club_access/alejandro_scout` desde Firestore Admin en cada petición protegida (o con caché breve, invalidable y documentada).
2. Abrir explícitamente el ID de base de datos nombrada que usa la aplicación.
3. Fallar en modo cerrado si Firestore no está disponible, el documento no existe, el UID no coincide, `active=false` o el módulo requerido no está autorizado.
4. Eliminar la autorización basada en `serverScoutAccessMirror`.
5. Convertir `/api/admin/sync-scout-access` en endpoint de lectura/diagnóstico o retirarlo junto con sus llamadas cliente; nunca aceptar del navegador la fuente de verdad de permisos.
6. Convertir `/api/scout/seal-uid` en una comprobación de consistencia de solo lectura o retirarlo. La escritura atómica del primer vínculo debe ejecutarse en un único lugar de confianza, con transacción/condición que impida sustituir un UID ya sellado.

### Etapa B — Claims de Firebase

Claims objetivo, emitidos exclusivamente por un backend con Firebase Admin:
- `role: "authenticated"` para que Supabase reconozca el rol PostgreSQL autenticado en la integración de terceros.
- `app_role: "admin" | "scout"`.
- `app_active: boolean`.
- `allowed_modules: string[]`.

Reglas:
- No confiar en claims que el usuario pueda enviar en el cuerpo HTTP.
- Antes de llamar a `setCustomUserClaims`, recuperar los claims actuales y preservar los que no gestiona esta aplicación; la función reemplaza el conjunto completo.
- El admin UID confirmado se configurará mediante variable de entorno protegida, nunca como literal en el código.
- Para el scout, derivar los claims de Firestore, no del navegador.
- No asignar ni modificar claims de usuarios reales hasta tener pruebas aprobadas y autorización expresa para esa operación.
- Tras emitir claims, el cliente deberá renovar el token con `getIdToken(true)`.

### Etapa C — Supabase

- Configurar el cliente Supabase para enviar el Firebase ID token mediante `accessToken` solo después de que la emisión de claims y la política RLS estén verificadas.
- Mantener Firebase como proveedor de identidad; no crear un segundo flujo de contraseña en Supabase.
- Las políticas RLS deben validar el sujeto Firebase como texto cuando corresponda. No asumir que el UID Firebase es un UUID ni que `auth.uid()` representa automáticamente ese UID.
- Mantener la clave `service_role` únicamente en servidor.

## 4. Pruebas mínimas antes de cualquier activación

1. Sin token: 401.
2. Token inválido, expirado o de otro proyecto: denegado.
3. Correo no verificado o cuenta no autorizada: denegado.
4. Admin confirmado: acceso administrativo sin depender de un espejo en memoria.
5. Scout activo con UID correcto y módulo permitido: acceso solo al módulo autorizado.
6. Scout inactivo, UID distinto, documento inexistente o módulo no permitido: denegado.
7. Firestore inaccesible: denegación segura, sin recurrir a permisos antiguos en memoria.
8. Reinicio del servidor: permisos idénticos a los persistidos en Firestore.
9. Cambios de permisos en Firestore: aplicados sin requerir una llamada de sincronización desde el navegador.
10. Claims: preservar claims ajenos a la aplicación y comprobar renovación del token.
11. Supabase: token Firebase reconocido como rol `authenticated`; RLS separa admin/scout y bloquea acceso no autorizado.
12. Pruebas negativas de escalada: un scout no puede autoasignarse módulos, rol admin ni UID.

## 5. Límites de ejecución

Esta entrega es un diagnóstico y diseño en rama. No se han modificado:
- Firestore de producción ni reglas Firestore.
- Custom claims de usuarios reales.
- Supabase de producción: tablas, grants, políticas RLS, funciones o Storage.
- Variables de entorno de producción.
- Rama `main`, despliegues ni publicación de la aplicación.

La implementación deberá continuar en esta rama y someterse a pruebas aisladas antes de solicitar autorización para cualquier operación sobre usuarios o servicios de producción.


## 6. Implementación preparada en rama (sin despliegue)

Se han aplicado cambios de código en esta rama:

- `server.ts` deja de mantener `serverScoutAccessMirror`; se elimina la fuente de permisos en memoria.
- El servidor consulta `club_access/alejandro_scout` directamente con Firebase Admin SDK en la base de datos Firestore nombrada configurada por la aplicación.
- Cada petición protegida del scout valida correo verificado, proyecto Firebase, estado activo, UID sellado y módulo requerido contra el documento persistente.
- Si Firestore no está disponible, la API responde 503 y deniega la petición; no utiliza permisos antiguos en memoria.
- Los endpoints antiguos de sincronización y sellado UID se mantienen temporalmente por compatibilidad, pero son de solo lectura: no aceptan cambios de permisos ni escriben UID.
- Se han retirado del cliente las llamadas que sincronizaban el espejo de memoria.
- La autorización del administrador requiere ahora que `CLUB_ADMIN_FIREBASE_UID` esté configurada en el entorno del servidor y coincida con el UID del token. El valor no está escrito en el repositorio.

### Configuración pendiente para pruebas

En un entorno aislado de preview/staging, configurar `CLUB_ADMIN_FIREBASE_UID` con el UID administrador confirmado, usando el gestor de variables de entorno del proveedor. No ponerlo en archivos versionados ni en variables `VITE_*`.

La identidad de servicio del servidor debe tener permisos mínimos de lectura sobre el documento de permisos en la base Firestore nombrada. No se debe reutilizar una clave privada en el frontend.

### Verificación aún pendiente

No se ha ejecutado compilación TypeScript, pruebas de integración ni prueba con credenciales reales desde este entorno. Antes de dar la implementación por validada hay que ejecutar el pipeline de build/lint y probar los casos negativos/positivos enumerados en la sección 4. No desplegar ni activar custom claims todavía.


## 7. Pruebas automatizadas y preparación de claims (22-11-2026)

Se han añadido los siguientes elementos a la rama:

- `src/server/clubAuthorization.test.ts`: pruebas unitarias de token ausente, proyecto incorrecto, correo no verificado, UID de administrador, configuración ausente, UID scout, estado activo, módulo no autorizado, documento inexistente y construcción de claims.
- Script `npm run test:security`.
- Workflow `.github/workflows/fase-b-security.yml` para ejecutar pruebas, TypeScript y build en GitHub Actions.
- Función pura `buildClubCustomClaims()`: preserva claims ajenos a la aplicación, establece `role: authenticated`, `app_role`, `app_active` y `allowed_modules`; filtra módulos desconocidos y elimina permisos de módulos cuando el scout está inactivo.
- Endpoint administrativo `POST /api/admin/sync-firebase-claims`, expresamente deshabilitado por defecto. Solo se ejecuta si el entorno tiene `ENABLE_FIREBASE_CLAIMS_ISSUANCE=true`, además de exigir autenticación admin y UID protegido. Antes de escribir, valida ambas cuentas y deriva los permisos del scout del documento Firestore.

### Límites y estado de validación

- El endpoint de claims no se ha invocado; no se ha modificado ningún claim real.
- No se ha configurado `CLUB_ADMIN_FIREBASE_UID` ni `ENABLE_FIREBASE_CLAIMS_ISSUANCE` en ningún entorno.
- No se ha conectado aún el Firebase ID token al cliente Supabase. Esa modificación queda condicionada a validar los claims y la matriz RLS de Supabase.
- Se ha añadido el workflow, pero no se dispone todavía de un resultado de GitHub Actions que confirme ejecución satisfactoria. El estado consultado del commit muestra únicamente el check de Vercel pendiente; por tanto, las pruebas, el lint y el build siguen **pendientes de ejecución**.
- La sincronización de claims de dos usuarios no es una transacción atómica de Firebase. El endpoint valida las dos identidades y prepara ambos payloads antes de iniciar escrituras, pero un fallo entre ambas operaciones podría dejar una actualización parcial; debe contemplarse en el procedimiento de verificación y recuperación.

No activar el flag de emisión ni llamar al endpoint hasta completar la revisión del workflow, confirmar la identidad de servicio y autorizar expresamente la primera asignación real de claims.
