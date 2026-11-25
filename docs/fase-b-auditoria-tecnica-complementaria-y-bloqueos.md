# Fase B — auditoría técnica complementaria y condiciones previas a la implementación

**Rama:** `feat/fase-b-hardening-supabase`  
**Alcance:** revisión estática de `server.ts`, `src/lib/supabase.ts`, `package.json`, `src/server/clubAuthorization.test.ts`, `tsconfig.json` y `.env.example`.  
**Impacto:** únicamente documentación. No se han modificado rutas, lógica de negocio, configuración, políticas RLS, grants, triggers ni datos de Supabase.

## 1. Estado confirmado

### 1.1 Autenticación backend existente

`server.ts` ya incorpora:

- Verificación criptográfica de Firebase ID tokens mediante `getAuth().verifyIdToken()`.
- Comprobación del proyecto Firebase esperado.
- Exigencia de correo verificado.
- Comprobación de identidad del administrador mediante UID configurado en `CLUB_ADMIN_FIREBASE_UID`.
- Validación del perfil del observador contra Firestore, incluyendo estado activo, UID sellado y módulos permitidos.
- Middleware `requireClubAuth(requiredModules, adminOnly)`.
- Limitador de peticiones por IP en rutas protegidas.

Este middleware es una base reutilizable para nuevas rutas. No debe confundirse con autorización automática de operaciones ejecutadas directamente desde el navegador.

### 1.2 Acceso Supabase desde navegador

`src/lib/supabase.ts` inicializa el cliente real con:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Ambas variables están destinadas al bundle del navegador. La clave anon no equivale a una autorización por usuario: el acceso efectivo depende de grants y RLS en Supabase.

No se ha localizado en los archivos revisados un cliente Supabase de servidor ni una variable privada de servidor para la clave `service_role`.

### 1.3 Fallback local

Cuando Supabase no está configurado, `src/lib/supabase.ts` utiliza un cliente simulado con persistencia en `localStorage`. Su constructor de consultas implementa operaciones SELECT, INSERT, UPSERT, UPDATE y DELETE localmente y devuelve errores nulos en operaciones ordinarias.

**Riesgo:** este modo puede dar apariencia de persistencia correcta sin que los datos hayan llegado a Supabase. Las nuevas rutas backend no deben reproducir ese patrón ni convertir fallos reales de base de datos en respuestas satisfactorias o colecciones vacías.

La sustitución global de este fallback queda fuera de esta revisión: podría afectar a flujos existentes y requiere un plan de migración y pruebas funcionales.

### 1.4 Configuración de entorno

El archivo `.env.example` contiene `GEMINI_API_KEY`, `VITE_REGISTRATION_KEY`, `VITE_SUPABASE_ANON_KEY` y `VITE_SUPABASE_URL`. No documenta una credencial Supabase privada de servidor.

Esto no demuestra que la variable no exista en el entorno de despliegue; solo significa que no aparece en el ejemplo de configuración revisado.

### 1.5 Pruebas actuales

`package.json` define:

- `lint`: `tsc --noEmit`
- `test:security`: ejecuta `src/server/clubAuthorization.test.ts`

La batería existente prueba el evaluador de autorización Firebase y la construcción de custom claims. No cubre todavía endpoints CRUD de Supabase, validación de DTO, aislamiento por equipo, errores de persistencia, paginación ni autorización por operación.

## 2. Implicaciones para el diseño

1. Reutilizar `requireClubAuth` en cada endpoint de datos y exigir el módulo apropiado.
2. Si se usa `service_role` en backend, mantenerla exclusivamente como secreto del servidor. Esta credencial omite RLS; por tanto, cada endpoint debe aplicar autorización explícita y no confiar en identificadores enviados por el cliente.
3. Crear un cliente servidor separado; no importar el cliente de `src/lib/supabase.ts` en rutas backend.
4. Seleccionar columnas explícitas y validar entradas con esquemas/DTO. No aceptar nombres de tabla, columnas, filtros ni fragmentos SQL arbitrarios desde el navegador.
5. Diferenciar ausencia legítima de datos de errores de consulta. Los errores deben producir respuestas HTTP de error y quedar registrados sin incluir secretos ni datos personales innecesarios.
6. Mantener los flujos de sincronización Firestore/localStorage existentes fuera de una sustitución simplista hasta documentar sus reglas de reconciliación.
7. Añadir pruebas de integración de endpoints antes de trasladar operaciones de producción.

## 3. Bloqueos que siguen pendientes

No se debe implementar ni desplegar el endpoint de usuarios hasta cerrar estos puntos:

- **Privilegios Supabase:** recibir el resultado de la consulta de `information_schema.role_table_grants` para conocer los grants efectivos de `anon` y `authenticated`. Verificar además privilegios por columna de `public.users`, especialmente `role`.
- **Credencial de servidor:** confirmar únicamente si el entorno de despliegue dispone de una variable privada Supabase de servidor. No compartir su valor. Nunca debe llevar prefijo `VITE_`.
- **Entorno de pruebas:** disponer de un proyecto Supabase no productivo para probar cliente servidor, endpoints y autorización.
- **Decisiones funcionales:** confirmar permisos de lectura/escritura para `needs`, `coaches` y `observers`; política de borrado e histórico de jugadoras; y alcance de las tablas que deben incluirse en backup.

## 4. Próximo paso técnico seguro

Con los bloqueos anteriores resueltos, implementar en esta rama, primero en entorno de pruebas:

1. Cliente Supabase exclusivo de servidor, con validación estricta de configuración y sin fallback local.
2. Endpoint `GET /api/admin/users`, protegido por `requireClubAuth([], true)`.
3. Consulta con columnas explícitas y paginación limitada.
4. Pruebas para usuario no autenticado, scout, administrador autorizado, configuración ausente, error de Supabase y respuesta sin campos sensibles.
5. Verificación de build, lint y pruebas de seguridad.

El endpoint no debe permitir crear, modificar roles ni borrar usuarios. Tampoco debe cambiar la FK `users.id -> auth.users.id` ni las políticas RLS actuales.

## 5. Límites de esta auditoría

Esta revisión es estática y se limita a los archivos enumerados. No acredita el contenido de secretos del despliegue, los grants reales de la base de datos, la configuración de producción ni el comportamiento de todos los módulos en ejecución.
