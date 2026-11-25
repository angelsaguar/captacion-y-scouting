# Fase B — auditoría estática de predespliegue Vercel

Fecha: 24/11/2026  
Rama: `feat/fase-b-hardening-supabase`

## Alcance

Revisión estática de `package.json`, `vercel.json`, `tsconfig.json`, `src/server/clubAuth.ts` y los seis handlers protegidos:

- `api/rffm/clasificacion.ts`
- `api/rffm/resultados.ts`
- `api/rffm/acta-detail.ts`
- `api/rffm/extract-calendar.ts`
- `api/rffm/sync-actas-detailed.ts`
- `api/tactical-advice.ts`

No se han consultado ni modificado secretos, variables, recursos de Firebase o Supabase, datos, configuración de Vercel ni despliegues.

## Resultado

La estructura de funciones es compatible, en principio, con el enrutamiento automático de Vercel: existe el directorio `api/`, los handlers exportan una función por defecto y `vercel.json` no contiene una configuración que desactive las funciones. `firebase-admin` figura como dependencia de producción en `package.json`.

La revisión estática no acredita que las funciones puedan autenticarse correctamente en el runtime real de Vercel. CI valida compilación y pruebas unitarias, pero no prueba credenciales reales ni acceso a Firebase Auth/Firestore.

## Bloqueos antes de desplegar

### B-01 — Credenciales de Firebase Admin en Vercel

`src/server/clubAuth.ts` inicializa Firebase Admin con `FIREBASE_SERVICE_ACCOUNT_JSON` cuando existe. Si no existe, inicializa la aplicación sin credenciales explícitas y deja que Firebase Admin recurra a Application Default Credentials, opción prevista en el comentario para entornos locales.

Según las capturas de configuración de Vercel aportadas anteriormente, `FIREBASE_SERVICE_ACCOUNT_JSON` no está configurada. No se debe volver a pedir una captura ni el contenido de una clave. Hay que resolver la provisión de credenciales de servidor antes de desplegar y verificar únicamente la existencia/configuración, sin revelar el valor.

Esta credencial es necesaria para las operaciones administrativas de Firebase y para las lecturas de Firestore del perfil scout. Si el runtime no dispone de credenciales ADC válidas, la autorización del scout fallará cerrada con 503.

### B-02 — UID del administrador

La política de autorización exige que `CLUB_ADMIN_FIREBASE_UID` coincida con el UID del token de la cuenta administradora. Según las capturas previas de Vercel, esta variable no estaba configurada. En ese estado, la cuenta administradora será rechazada con 403 aunque el correo esté verificado.

Antes del despliegue debe configurarse el UID correcto como variable server-side, sin compartirlo en el chat ni incluirlo en documentación pública. Verificar solo que la variable exista y tenga valor.

### B-03 — Comprobación de revocación

La implementación usa `verifyIdToken(token, true)`, que comprueba revocación y estado de usuario. Esto añade una comprobación remota frente a Firebase Auth y hace más importante que Firebase Admin disponga de credenciales operativas en el runtime. Las pruebas unitarias clasifican errores, pero no sustituyen una prueba de integración real.

## Comprobaciones estáticas satisfactorias

- Los seis handlers revisados importan `applyApiCors` y `authorizeClubRequest` desde el helper común.
- No se observan inicializaciones Firebase Admin duplicadas dentro de esos handlers.
- `firebase-admin` está en `dependencies`, no solo en `devDependencies`.
- `vercel.json` mantiene la exclusión de rutas `/api/` de la reescritura SPA.
- El build del proyecto ya fue validado por GitHub Actions en los runs documentados previamente.

## Variables: inventario de requisitos

| Variable | Uso | Situación conocida |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Credenciales Firebase Admin server-side | No configurada según capturas previas |
| `CLUB_ADMIN_FIREBASE_UID` | Vinculación de UID de administrador | No configurada según capturas previas |
| `APP_ALLOWED_ORIGINS` | Orígenes CORS adicionales | Opcional; hay una lista base en código |
| `GEMINI_API_KEY` | Servicio Gemini del endpoint táctico | No verificada en esta auditoría |
| `VITE_SUPABASE_URL` | Cliente Supabase frontend | Ya comprobada anteriormente; no repetir |
| `VITE_SUPABASE_ANON_KEY` | Cliente Supabase frontend | Ya comprobada anteriormente; no repetir |

No añadir `SUPABASE_SERVICE_ROLE_KEY`: no forma parte de la solución Firebase Auth y no debe exponerse al navegador.

## Secuencia segura recomendada

1. Preparar las dos variables Firebase server-side requeridas en Vercel, usando credenciales del proyecto Firebase esperado y el UID correcto. No compartir secretos.
2. Confirmar únicamente que ambas variables existen en el ámbito de entorno que se vaya a probar.
3. Desplegar primero a una Preview Deployment, no a producción, cuando el usuario autorice ese paso.
4. Validar en Preview: sesión válida, token revocado, usuario deshabilitado, cuenta admin, cuenta scout activa y scout sin módulo autorizado. Comprobar que los fallos de infraestructura devuelven 503 y no conceden acceso.
5. Revisar logs sin imprimir tokens, claves ni datos personales.
6. No promover a producción hasta superar la validación y recibir autorización expresa.

## Límites de esta auditoría

No se ha realizado despliegue, prueba de integración contra Firebase, modificación de variables, modificación de Supabase ni cambio de datos. Esta revisión no demuestra que las credenciales actuales de Vercel funcionen: identifica los requisitos pendientes a partir del código y de la configuración ya comunicada por el usuario.
