# Fase B — Primera implementación de autorización compartida

**Fecha:** 24-11-2026  
**Rama:** `feat/fase-b-hardening-supabase`  
**Estado:** cambios de autorización y validación en rama de trabajo. La implementación de validaciones RFFM está pendiente de CI tras los últimos commits. No desplegado.

## Cambios realizados

### 1. Módulo compartido
Creado `src/server/clubAuth.ts`:
- Inicializa Firebase Admin con el proyecto existente.
- Lee el perfil scout desde Firestore `club_access/alejandro_scout`.
- Valida el ID token Firebase con `verifyIdToken`.
- Comprueba proyecto/audience, email verificado, correo y UID de administrador configurado.
- Comprueba para scout estado activo, UID bloqueado y coincidente y módulo requerido.
- Devuelve 401 para sesión ausente/no válida, 403 para identidad/permisos no autorizados y 503 si Firestore no permite verificar el acceso.
- Incluye una política CORS por lista de orígenes, separada de la autenticación.

### 2. Express
`server.ts` importa ahora las constantes, lectura Firestore y evaluación de token del módulo compartido. Se mantiene el middleware Express y la emisión de claims existente; no se ha cambiado la política funcional de usuarios.

### 3. Funciones RFFM protegidas
Se añadió autenticación Firebase obligatoria y autorización de módulo en:
- `api/rffm/clasificacion.ts`
- `api/rffm/resultados.ts`
- `api/rffm/acta-detail.ts`
- `api/rffm/extract-calendar.ts`
- `api/rffm/sync-actas-detailed.ts`

Las funciones aceptan únicamente los métodos que ya se identificaron como necesarios (GET en lectura; GET/POST en los dos handlers que admitían ambos), con OPTIONS para preflight. Los handlers devuelven 405 ante otros métodos. CORS ya no utiliza comodín `*`; se limita a producción, localhost de desarrollo y orígenes adicionales expresamente configurados mediante `APP_ALLOWED_ORIGINS`.

Para el scout se exige al menos uno de los módulos `estadisticas-rivales` o `gestion-equipo`, manteniendo la compatibilidad de los flujos identificados. El administrador sigue las reglas de identidad existentes.

### 4. Validación defensiva de parámetros RFFM
Creado `src/server/rffmValidation.ts` y aplicado en los cinco handlers:
- Temporada: entre 1 y 3 dígitos después de normalizar los formatos de temporada ya reconocidos.
- Competición y grupo: solo dígitos, con máximo de 12 caracteres.
- Tipo de juego: únicamente 1, 2 o 3, que son los valores usados por la lógica de consulta y fallback.
- Jornada: número entre 1 y 60.
- Código de acta: entre 1 y 40 caracteres alfanuméricos, guion o guion bajo. No se restringe a numérico porque no se ha demostrado que todos los identificadores de la Federación sean exclusivamente numéricos.
- Nombre de equipo: máximo 80 caracteres.
- URL de calendario: máximo 2048 caracteres.

En `sync-actas-detailed` se limita cada ejecución a 60 actas y se valida el código devuelto por la Federación antes de construir la URL del acta. El límite es una protección de volumen por petición, no un rate limit global.

### 5. Pruebas
- Creado `src/server/clubAuth.test.ts` con pruebas de token ausente, proyecto incorrecto, email no verificado, UID de administrador, perfil scout activo, UID sellado y permisos de módulo.
- Creado `src/server/rffmValidation.test.ts` para los formatos válidos e inválidos, los límites de jornada y longitudes.
- Actualizado `test:security` para ejecutar las pruebas de autorización y validación.

## Validación CI anterior y estado de los últimos cambios

El workflow `Fase B security checks` terminó correctamente para el commit `d86f5d0b95304e15c41349fbf21d59e4908372ff`. Los pasos `Security unit tests`, `TypeScript validation` y `Production build` finalizaron con éxito.

[Consultar ejecución CI anterior](https://github.com/angelsaguar/captacion-y-scouting/actions/runs/45386378298)

Los cambios de validación RFFM se incorporaron después de esa ejecución; por tanto, no se consideran validados hasta que termine un nuevo CI. Incluso con CI verde, las pruebas automatizadas y compilación no demuestran que Firebase Admin disponga de credenciales funcionales en el runtime de Vercel.

## Riesgos y límites todavía abiertos

1. **Credenciales Firebase en Vercel:** no se ha demostrado aún mediante una invocación autenticada que Firebase Admin pueda verificar tokens y leer Firestore en el runtime Vercel. La configuración debe comprobarse sin revelar secretos.
2. **Preview:** los dominios temporales de Preview no se permiten por defecto. Si se prueba desde Preview, habrá que añadir el origen concreto a `APP_ALLOWED_ORIGINS` solo después de verificarlo; no se recomienda permitir todos los dominios `*.vercel.app`.
3. **Rate limiting:** esta primera implementación no añade un límite global para funciones serverless. El Map en memoria de Express no sería un límite global fiable en Vercel. Debe diseñarse un control adicional sin contratar servicios nuevos.
4. **Rate limiting global:** sigue pendiente un límite global entre instancias serverless. No se ha añadido un proveedor externo ni se presenta el límite de 60 actas por petición como sustituto de ese control.
5. **Endpoints no RFFM:** `api/tactical-advice.ts` mantiene su propia verificación Firebase duplicada. Conviene migrarlo al helper después de validar esta primera integración.
6. **Despliegue:** no se ha realizado ni se debe realizar despliegue a producción hasta que CI esté verde, se confirme Firebase Admin en Vercel y se complete una revisión manual del diff.

## Seguridad de cambios

No se han modificado Supabase, RLS, grants, datos ni variables de entorno. No se ha añadido `SUPABASE_SERVICE_ROLE_KEY`. Los cambios están únicamente en la rama de trabajo.
