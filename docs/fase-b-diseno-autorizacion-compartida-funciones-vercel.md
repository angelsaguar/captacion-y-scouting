# Fase B — Diseño de autorización compartida para funciones Vercel

**Rama:** `feat/fase-b-hardening-supabase`  
**Fecha:** 24-11-2026  
**Estado:** diseño previo a implementación. No desplegar ni aplicar cambios en producción.

## 1. Objetivo

Unificar la autenticación y autorización de los endpoints API desplegados como funciones independientes en Vercel, sin duplicar reglas de identidad y permisos entre handlers.

El diseño reutiliza la política que ya existe en `server.ts` y conserva Firestore como fuente autoritativa del acceso del scout. No introduce Supabase Auth ni requiere crear un proyecto Supabase adicional.

## 2. Política de autorización que ya existe

En `server.ts` se verifican actualmente estos elementos:

1. Cabecera `Authorization: Bearer <Firebase ID token>`.
2. Verificación criptográfica mediante Firebase Admin `verifyIdToken()`.
3. Audience/proyecto esperado: `gen-lang-client-0091658680`.
4. Correo verificado.
5. Administrador: correo autorizado y coincidencia con `CLUB_ADMIN_FIREBASE_UID`.
6. Scout: correo autorizado, perfil Firestore existente, activo, UID bloqueado y coincidente, y módulo requerido habilitado.

La evaluación de reglas puras está centralizada en `evaluateDecodedClubToken()`, pero actualmente vive en `server.ts`. Las funciones Vercel no pueden heredar automáticamente el middleware Express; deben invocar una capa compartida compatible con ambos entornos.

## 3. Arquitectura propuesta

Crear un módulo servidor compartido, por ejemplo:

- `src/server/clubAuth.ts`: inicialización Firebase Admin, lectura del perfil Firestore, verificación del token y evaluación de permisos.
- `src/server/clubAuthTypes.ts` (solo si la separación de tipos resulta necesaria): tipos de identidad, módulos y resultado de autorización.

Responsabilidades de `clubAuth.ts`:

- Reutilizar una única instancia de Firebase Admin (`getApps()` / `initializeApp()`).
- Usar el proyecto Firebase esperado.
- Abrir la base Firestore configurada actualmente.
- Verificar ID tokens con Firebase Admin.
- Leer el documento `club_access/alejandro_scout` para la cuenta scout.
- Aplicar las mismas reglas de identidad y UID que `server.ts`.
- Autorizar módulos requeridos.
- Devolver una identidad mínima: `uid`, `email` y `role`.
- Distinguir credenciales inválidas/no autorizadas de fallos de dependencia (Firestore/Firebase).

El módulo debe ser exclusivamente de servidor. No puede importarse desde componentes React ni desde código que Vite incluya en el bundle del navegador.

## 4. Contrato de autorización

Propuesta conceptual:

```ts
type ClubModule =
  | "scouting"
  | "campograma"
  | "needs"
  | "gestion-equipo"
  | "estadisticas-rivales";

type ClubIdentity = {
  uid: string;
  email: string;
  role: "admin" | "scout";
};

type AuthorizationResult =
  | { ok: true; identity: ClubIdentity }
  | { ok: false; statusCode: 401 | 403 | 503; error: string };

async function authorizeClubRequest(
  authorizationHeader: string | undefined,
  requiredModules: ClubModule[]
): Promise<AuthorizationResult>;
```

Este bloque describe la interfaz deseada; todavía no es código incorporado al repositorio.

Reglas:
- Sin Bearer token o token inválido/expirado: 401.
- Identidad válida pero cuenta, UID o módulo no autorizado: 403.
- No se puede consultar Firestore o verificar la dependencia de autorización: 503, sin permitir el acceso.
- Nunca convertir un error de Firestore en una autorización válida.
- El administrador conserva el comportamiento actual de acceso global definido en `evaluateDecodedClubToken`; no se le debe imponer una lista de módulos scout.

## 5. Asignación preliminar de módulos a endpoints

| Función Vercel | Módulo scout propuesto | Métodos permitidos |
|---|---|---|
| `api/rffm/clasificacion.ts` | `estadisticas-rivales` y/o `gestion-equipo` | GET, OPTIONS |
| `api/rffm/resultados.ts` | `estadisticas-rivales` y/o `gestion-equipo` | GET, OPTIONS |
| `api/rffm/acta-detail.ts` | `estadisticas-rivales` y/o `gestion-equipo` | GET, OPTIONS |
| `api/rffm/extract-calendar.ts` | `estadisticas-rivales` y/o `gestion-equipo` | POST, OPTIONS (GET solo si se confirma uso real) |
| `api/rffm/sync-actas-detailed.ts` | `estadisticas-rivales` y/o `gestion-equipo` | POST, OPTIONS (GET solo si se confirma uso real) |

La asignación exacta queda pendiente de confirmar la funcionalidad de cada llamada. La regla de Express para clasificación/resultados usa ambos módulos; el diseño debe mantener compatibilidad mientras se confirma si las funciones Vercel tienen consumidores adicionales.

## 6. CORS y métodos

- CORS no es autenticación: un cliente fuera del navegador puede invocar directamente una URL.
- En endpoints que solo usa la aplicación web, permitir únicamente el origen de producción y los orígenes de desarrollo expresamente aprobados.
- Responder OPTIONS sin ejecutar lógica de negocio; los métodos reales siempre requieren autenticación.
- Declarar explícitamente `Access-Control-Allow-Headers: Authorization, Content-Type`.
- Rechazar métodos no previstos con 405 y encabezado `Allow`.
- No aceptar GET en funciones de sincronización salvo que la auditoría de uso confirme una dependencia.

## 7. Limitación de frecuencia y recursos

El rate limiter de `server.ts` usa un Map en memoria del proceso. En funciones serverless, varias instancias pueden tener contadores separados y reiniciarse; por tanto, no equivale a un límite global fiable.

Propuesta por etapas:
1. En la primera implementación, límites defensivos por instancia y límites de entrada/tiempo, sin afirmar que son globales.
2. Evitar incorporar Redis u otro servicio de pago, ya que el proyecto busca no asumir costes adicionales.
3. Si más adelante se requiere un límite global, estudiar una alternativa ya disponible en la infraestructura antes de contratar servicios.
4. Establecer límites más estrictos para `sync-actas-detailed` y `extract-calendar`, por su volumen de consultas externas.
5. Validar longitud y formato de temporada, competición, grupo, tipo de juego, jornada, codacta y URL. Para URL, permitir únicamente los hosts oficiales esperados de la RFFM.

## 8. Credenciales y despliegue Vercel

En la captura revisada de variables del proyecto Vercel aparecen únicamente:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

No aparece `SUPABASE_SERVICE_ROLE_KEY`; no es necesaria para este trabajo de autenticación Firebase y no debe añadirse por esta razón.

El código de las funciones usa Firebase Admin y Firestore. Antes de modificar el módulo compartido hay que comprobar, sin mostrar valores secretos, que las funciones Vercel disponen de la identidad/credenciales servidor necesarias para Firebase Admin. La captura de variables compartida no demuestra si Vercel dispone de credenciales ADC u otra configuración segura.

No crear variables nuevas ni pedir al usuario que revele secretos. Si falta configuración, detener la implementación y documentar la decisión antes de solicitar cualquier cambio.

## 9. Plan de implementación y pruebas

1. Extraer las constantes, tipos y evaluación pura de `server.ts` al módulo servidor compartido sin cambiar reglas.
2. Adaptar `server.ts` para usar ese módulo y mantener el mismo comportamiento.
3. Añadir pruebas unitarias para token ausente, token inválido, proyecto incorrecto, correo no verificado, UID admin incorrecto, scout inactivo, UID no sellado, módulo no permitido y error Firestore.
4. Proteger primero un endpoint de lectura de bajo impacto en la rama.
5. Proteger el resto de endpoints RFFM, uno por uno.
6. Añadir pruebas de métodos, CORS, ausencia de token, token inválido, usuario admin, scout autorizado y scout sin módulo.
7. Ejecutar `npm run lint` y `npm run test:security`; añadir pruebas específicas para funciones Vercel.
8. Revisar diff y resultado CI antes de valorar cualquier despliegue.

## 10. Límites de esta fase

- No modificar Supabase, RLS, grants, datos ni credenciales.
- No crear ni contratar servicios externos.
- No desplegar a producción.
- No cambiar la política de acceso de los usuarios sin una decisión expresa.
- No asumir que una función es pública solo porque no se haya encontrado una llamada en los componentes inspeccionados.

**Decisión recomendada:** implementar el módulo compartido en la rama de trabajo, conservando exactamente las reglas de autorización existentes, y validar primero con pruebas. La configuración de credenciales Firebase en Vercel debe confirmarse antes de cualquier despliegue.
