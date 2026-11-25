# Fase B — Auditoría complementaria de autenticación y rutas Express

**Fecha:** 24-11-2026  
**Rama:** `feat/fase-b-hardening-supabase`  
**Alcance:** revisión estática de `src/server/clubAuth.ts`, rutas Express de `server.ts` y comparación con los handlers serverless de `api/`.  
**Estado:** hallazgos documentados; no se han cambiado rutas ni políticas de autenticación en este informe.

## 1. Resultado de cobertura de rutas Express

La revisión de `server.ts` confirma que las rutas de administración, scouting, RFFM y asesoramiento táctico examinadas aplican `requireClubAuth`:
- `POST /api/admin/sync-scout-access`: administrador.
- `POST /api/scout/seal-uid`: cuenta scout autorizada y UID coincidente/sellado.
- `POST /api/admin/sync-firebase-claims`: administrador y, además, variable `ENABLE_FIREBASE_CLAIMS_ISSUANCE=true`.
- Rutas Express RFFM de clasificación, resultados, extract-calendar, acta-detail y sync-actas-detailed: módulos `estadisticas-rivales` o `gestion-equipo`.
- `POST /api/tactical-advice`: módulo `gestion-equipo`.

`GET /api/health` permanece público y devuelve estado, identificador de proyecto Firebase y fecha. El identificador de proyecto no es una credencial; mantener este endpoint público es una decisión operativa, no una omisión de autenticación en una ruta de datos.

## 2. Hallazgos y decisiones pendientes

### H-01 — No se comprueba revocación de ID tokens

En `authorizeClubRequest` y en el middleware Express, la llamada actual es `verifyIdToken(token)`, sin el segundo argumento `checkRevoked=true`.

**Impacto:** un ID token ya emitido podría seguir siendo aceptado hasta su expiración aunque la sesión o refresh tokens del usuario se hayan revocado. La comprobación de revocación añade una consulta de verificación y puede aumentar latencia/coste y dependencia de Firebase Auth.

**Recomendación:** decidir explícitamente si se requiere revocación inmediata. Si se adopta, aplicar la misma política en helper serverless y middleware Express, probar errores de red y mantener el comportamiento fail-closed. No cambiarlo automáticamente sin medir impacto y revisar compatibilidad.

### H-02 — Sincronización de custom claims no atómica

`POST /api/admin/sync-firebase-claims` valida previamente los dos usuarios y construye ambos objetos de claims, pero después ejecuta dos llamadas secuenciales a `setCustomUserClaims`.

**Impacto:** si la primera escritura termina y la segunda falla, las cuentas pueden quedar temporalmente con claims desalineados.

**Controles actuales:** ruta protegida para administrador; variable `ENABLE_FIREBASE_CLAIMS_ISSUANCE` debe ser exactamente `true`; se comprueban correo verificado y UID de ambas identidades antes de escribir.

**Recomendación:** mantener la variable desactivada salvo operación planificada. Si se necesita activar en el futuro, preparar procedimiento de reconciliación/reintento y registro de resultado por cuenta. Firebase Admin no ofrece una transacción atómica para actualizar claims de dos usuarios.

### H-03 — Validación distinta de codacta entre Express y Vercel

La ruta Express `/api/rffm/acta-detail` admite actualmente solo códigos numéricos de 1 a 12 dígitos. El validador compartido usado por los handlers serverless acepta entre 1 y 40 caracteres alfanuméricos, guion o guion bajo.

**Impacto:** la misma operación podría aceptar un identificador en Vercel y rechazarlo en Express, o viceversa si cambia el contrato de la Federación.

**Recomendación:** confirmar el formato real admitido por RFFM y unificar ambos caminos. No ampliar ni restringir el patrón sin evidencia de identificadores reales y revisión de consumidores.

### H-04 — Duplicación de lógica entre Express y handlers serverless

Hay rutas RFFM y de asesoramiento en `server.ts` además de sus handlers en `api/`. Los handlers serverless usan el helper de autorización compartido, pero algunas operaciones de Express conservan lógica propia de parseo/validación y de negocio.

**Impacto:** riesgo de divergencia de autorización, validación de parámetros, límites y respuestas ante errores al mantener dos entradas para una misma operación.

**Recomendación:** inventariar qué runtime utiliza cada despliegue y consumidores. Después decidir si Express debe conservarse como compatibilidad o delegar en funciones compartidas. No eliminar rutas sin verificar clientes y despliegues activos.

### H-05 — Rate limiting en memoria no global

El limitador Express almacena contadores en un `Map` local al proceso. No coordina instancias ni reinicios y no constituye un límite global en serverless/distribuido.

**Impacto:** el límite puede variar según la instancia que atienda la petición. No debe presentarse como protección global.

**Recomendación:** mantenerlo como defensa best-effort en el proceso Express. Para Vercel, no afirmar que existe límite global mientras no haya un mecanismo compartido. Cualquier solución futura debe respetar la restricción de no contratar servicios adicionales.

## 3. Controles positivos observados

- El helper compartido valida el proyecto/audience del token, correo verificado y las identidades permitidas.
- La cuenta scout requiere perfil Firestore activo, UID bloqueado y coincidente, y al menos uno de los módulos solicitados.
- Los errores de lectura Firestore en el helper serverless fallan cerrados con 503.
- Los endpoints serverless RFFM y tactical-advice usan `authorizeClubRequest` y `applyApiCors`.
- CORS no se usa como sustituto de autenticación.
- La sincronización de claims está separada y desactivada por defecto salvo configuración expresa.

## 4. Límites de esta auditoría

- Es una revisión estática del código en la rama indicada.
- No se han invocado endpoints de producción.
- No se han probado tokens reales, revocación Firebase, credenciales ADC ni lectura Firestore en Vercel.
- No se ha cambiado Firebase, Vercel, Supabase, RLS, grants ni datos.
- No se ha añadido ningún servicio externo ni secreto.

## 5. Orden recomendado de resolución

1. Confirmar qué runtime está activo para cada ruta (Express y/o Vercel) y qué consumidores siguen utilizándolo.
2. Acordar la política de revocación de tokens y su coste/latencia.
3. Unificar el contrato de validación de `codacta` entre Express y serverless.
4. Mantener deshabilitada la sincronización de claims hasta que exista procedimiento operativo de reconciliación.
5. Diseñar, si se necesita, un límite compartido sin introducir servicios de pago.

**Conclusión:** la cobertura de autenticación examinada es consistente en las rutas revisadas, pero quedan decisiones de ciclo de vida de tokens, divergencia entre runtimes y operación de claims que deben resolverse antes de considerar cerrada la auditoría de backend.
