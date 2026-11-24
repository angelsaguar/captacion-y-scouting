# Fase B — Primera implementación de autorización compartida

**Fecha:** 24-11-2026  
**Rama:** `feat/fase-b-hardening-supabase`  
**Estado:** cambios de autorización, validación RFFM y credenciales Firebase Admin preparados en rama de trabajo. CI superado para el commit `01fe40159479516a5767ab484810ef73c4c1f4a1` (24-11-2026). No desplegado.

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

### 3. Endpoint de asesoramiento táctico
`api/tactical-advice.ts` también utiliza `authorizeClubRequest` y `applyApiCors` desde `src/server/clubAuth.ts`. Exige el módulo `gestion-equipo` y ya no mantiene inicialización Firebase ni comprobaciones de identidad duplicadas. Se conserva el método POST y la lógica de generación de asesoramiento.

### 4. Funciones RFFM protegidas
Se añadió autenticación Firebase obligatoria y autorización de módulo en:
- `api/rffm/clasificacion.ts`
- `api/rffm/resultados.ts`
- `api/rffm/acta-detail.ts`
- `api/rffm/extract-calendar.ts`
- `api/rffm/sync-actas-detailed.ts`

Las funciones aceptan únicamente los métodos que ya se identificaron como necesarios (GET en lectura; GET/POST en los dos handlers que admitían ambos), con OPTIONS para preflight. Los handlers devuelven 405 ante otros métodos. CORS ya no utiliza comodín `*`; se limita a producción, localhost de desarrollo y orígenes adicionales expresamente configurados mediante `APP_ALLOWED_ORIGINS`.

Para el scout se exige al menos uno de los módulos `estadisticas-rivales` o `gestion-equipo`, manteniendo la compatibilidad de los flujos identificados. El administrador sigue las reglas de identidad existentes.

### 5. Validación defensiva de parámetros RFFM
Creado `src/server/rffmValidation.ts` y aplicado en los cinco handlers:
- Temporada: entre 1 y 3 dígitos después de normalizar los formatos de temporada ya reconocidos.
- Competición y grupo: solo dígitos, con máximo de 12 caracteres.
- Tipo de juego: únicamente 1, 2 o 3, que son los valores usados por la lógica de consulta y fallback.
- Jornada: número entre 1 y 60.
- Código de acta: entre 1 y 40 caracteres alfanuméricos, guion o guion bajo. No se restringe a numérico porque no se ha demostrado que todos los identificadores de la Federación sean exclusivamente numéricos.
- Nombre de equipo: máximo 80 caracteres.
- URL de calendario: máximo 2048 caracteres.

En `sync-actas-detailed` se limita cada ejecución a 60 actas y se valida el código devuelto por la Federación antes de construir la URL del acta. El límite es una protección de volumen por petición, no un rate limit global.

### 6. Pruebas
- Creado `src/server/clubAuth.test.ts` con pruebas de token ausente, proyecto incorrecto, email no verificado, UID de administrador, perfil scout activo, UID sellado, permisos de módulo y parser de credenciales de servicio.
- Creado `src/server/rffmValidation.test.ts` para los formatos válidos e inválidos, los límites de jornada y longitudes.
- Actualizado `test:security` para ejecutar las pruebas de autorización y validación.

## Validación CI de los cambios actuales

El workflow `Fase B security checks` terminó correctamente para el commit `01fe40159479516a5767ab484810ef73c4c1f4a1`. Los pasos `Security unit tests`, `TypeScript validation` y `Production build` finalizaron con éxito. Las pruebas de seguridad registraron 24 casos superados y 0 fallidos. La ejecución valida la autorización compartida, el parser de credenciales, la validación RFFM y la compilación, incluido el endpoint de asesoramiento táctico.

[Consultar ejecución CI superada](https://github.com/angelsaguar/captacion-y-scouting/actions/runs/45397915781)

CI verde no demuestra por sí solo que Firebase Admin disponga de credenciales funcionales en el runtime de Vercel; esa comprobación sigue pendiente.

## Configuración de credenciales Firebase Admin para Vercel

El módulo compartido admite ahora `FIREBASE_SERVICE_ACCOUNT_JSON`, una variable exclusivamente de servidor que contiene el JSON completo de una cuenta de servicio del proyecto Firebase esperado. El código valida `project_id`, `client_email` y el formato PEM de `private_key`, y normaliza los saltos de línea escapados. Si la variable no existe, conserva Application Default Credentials para entornos locales; esto no demuestra que Vercel disponga de ADC.

La cuenta de servicio debe tener únicamente permisos de lectura necesarios para consultar el documento de acceso en Firestore (preferentemente un rol IAM de solo lectura, como Cloud Datastore Viewer, sujeto a validar las necesidades exactas del proyecto). No debe usarse una clave de propietario ni concederse Editor/Owner. La clave privada debe guardarse solo como variable cifrada de Vercel, nunca en Git, `.env.example`, el frontend o el chat. También será necesaria `CLUB_ADMIN_FIREBASE_UID` para autorizar al administrador; el valor debe obtenerse del UID real de Firebase Authentication y no inferirse del correo.

La modificación añade pruebas unitarias del parser, pero no crea ni carga credenciales, no modifica Firebase, Vercel ni producción y no demuestra aún acceso real a Firestore.

## Riesgos y límites todavía abiertos

1. **Credenciales Firebase en Vercel:** el código ya admite la variable de servicio, pero Vercel todavía no la tiene configurada según la revisión de variables compartida por el usuario. La lectura real de Firestore en runtime sigue sin estar probada.
2. **Preview:** los dominios temporales de Preview no se permiten por defecto. Si se prueba desde Preview, habrá que añadir el origen concreto a `APP_ALLOWED_ORIGINS` solo después de verificarlo; no se recomienda permitir todos los dominios `*.vercel.app`.
3. **Rate limiting:** esta primera implementación no añade un límite global para funciones serverless. El Map en memoria de Express no sería un límite global fiable en Vercel. Debe diseñarse un control adicional sin contratar servicios nuevos.
4. **Rate limiting global:** sigue pendiente un límite global entre instancias serverless. No se ha añadido un proveedor externo ni se presenta el límite de 60 actas por petición como sustituto de ese control.
5. **Endpoints:** los seis endpoints de `api/` identificados (cinco RFFM y asesoramiento táctico) usan el helper compartido. No se ha ejecutado una prueba end-to-end contra Firebase/Vercel con credenciales reales.
6. **Despliegue:** no se ha realizado ni se debe realizar despliegue a producción hasta que se configure de forma segura la credencial, se confirme Firebase Admin en un entorno controlado y se complete una revisión manual del diff.

## Seguridad de cambios

No se han modificado Supabase, RLS, grants, datos ni variables de entorno. No se ha añadido `SUPABASE_SERVICE_ROLE_KEY`. No se ha creado ni almacenado ninguna clave de servicio. Los cambios están únicamente en la rama de trabajo.
