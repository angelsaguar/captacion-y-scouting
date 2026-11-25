# Fase B — Diseño del modelo de usuarios y endpoint administrativo

**Fecha:** 22-11-2026  
**Rama:** `feat/fase-b-hardening-supabase`  
**Estado:** diseño técnico; no implementado  
**Alcance:** revisión estática de `src/types.ts`, `src/pages/Admin.tsx`, `src/lib/supabase.ts` y `server.ts`. No se ha accedido a producción ni se han consultado filas de usuarios.

## 1. Decisión ejecutiva

Separar tres conceptos que hoy aparecen mezclados:

1. **Identidad/autenticación:** quién ha iniciado sesión y cómo se verifica (Firebase Authentication).
2. **Autorización vigente:** qué puede hacer esa identidad (middleware del servidor y registro de acceso de Firestore para el observador).
3. **Registro histórico:** datos conservados en `public.users`; no concede ni demuestra acceso actual.

Mantener `public.users` sin cambios. La pantalla Admin dejará de consultarla directamente en una fase posterior y utilizará un endpoint de solo lectura protegido en el servidor.

## 2. Evidencia revisada

### 2.1 Modelo actual

En `src/types.ts`:

```ts
export type Role = 'admin' | 'scout';

export interface User {
  id: string;
  nombre: string;
  email: string;
  role: Role;
  allowedModules?: string[];
  uidLocked?: boolean;
  created_at?: string;
}
```

El tipo `User` mezcla datos de perfil, rol, permisos de módulos y estado de vinculación UID. No representa de forma inequívoca una identidad Firebase ni una fila histórica de Supabase.

### 2.2 Dependencia en Admin

En `src/pages/Admin.tsx`:

- Estado: `useState<User[]>([])`.
- Carga: `supabase.from('users').select('*')`.
- La tabla visual muestra nombre, email, rol y una etiqueta de estado.
- La etiqueta actual se calcula comparando el email con `ADMIN_EMAIL` y `ALEJANDRO_EMAIL`.
- La consulta no comprueba expresamente el objeto `error` de Supabase.

El estado visual calculado por email no es una prueba de autorización. Tampoco debe convertirse en una respuesta de autorización del nuevo endpoint.

### 2.3 Autorización existente en servidor

En `server.ts` existe `requireClubAuth(requiredModules, adminOnly)`. El middleware:

- Exige `Authorization: Bearer <Firebase ID token>`.
- Verifica criptográficamente el token con Firebase Admin.
- Comprueba audiencia/proyecto Firebase y correo verificado.
- Para el administrador, exige coincidencia con `CLUB_ADMIN_FIREBASE_UID`.
- Para el observador, consulta el registro de acceso de Firestore y valida estado activo, UID sellado y módulos.
- Si se solicita `adminOnly=true`, rechaza cualquier rol distinto de admin.
- Adjunta `uid`, `email` y `role` verificados a `req.clubUser`.

Este es el control que debe proteger el endpoint; no se debe duplicar la lógica en React.

### 2.4 Cliente Supabase

`src/lib/supabase.ts` crea el cliente con variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Si faltan, utiliza un cliente de compatibilidad local basado en localStorage.

No se ha verificado en esta revisión la existencia/configuración de una credencial de servidor Supabase con privilegios de lectura. Antes de implementar el endpoint hay que comprobar de forma segura el mecanismo de conexión backend y confirmar que cualquier clave privilegiada permanece exclusivamente en variables de entorno del servidor. Nunca reutilizar ni exponer una service-role key en variables `VITE_*`.

## 3. Modelo de tipos propuesto

No reutilizar el tipo `User` actual como contrato de la tabla histórica. Introducir tipos separados en una fase de implementación posterior:

```ts
export interface HistoricalUserRecord {
  id: string;
  nombre: string | null;
  email: string | null;
  role: string | null; // dato histórico, no autoridad
  created_at: string | null;
  recordType: 'historical';
}

export interface AdminUsersResponse {
  users: HistoricalUserRecord[];
  total: number;
}
```

Reglas:

- `role` se conserva únicamente para representar el valor histórico que ya muestra la pantalla.
- No incluir `allowedModules`, `uidLocked`, tokens, claims ni secretos en este contrato.
- No devolver un campo `authorized` derivado de comparar emails.
- No afirmar que una fila histórica corresponde a una identidad Firebase activa salvo que exista una vinculación fiable y verificada por UID.
- Si en el futuro se necesita mostrar acceso vigente, diseñar una fuente autoritativa independiente y claramente diferenciada del registro histórico.

## 4. Endpoint propuesto

**Método y ruta:** `GET /api/admin/users`

**Middlewares previstos:**

1. `createRateLimiter(30)` (valor inicial propuesto; ajustar según el patrón de uso).
2. `requireClubAuth([], true)`.

**Comportamiento:**

1. Verificar el administrador mediante el middleware existente.
2. Consultar desde el servidor exclusivamente las columnas necesarias de `public.users`: `id, nombre, email, role, created_at` (confirmar nombres reales de columnas contra el esquema antes de codificar).
3. Ordenar por `created_at` descendente si la columna existe y el esquema lo confirma.
4. Mapear explícitamente cada fila a `HistoricalUserRecord`; no devolver objetos de base de datos sin filtrar.
5. Responder con `{ users, total }`.
6. No aceptar parámetros de escritura ni modificar filas.
7. No registrar emails, tokens ni contenido completo de filas en logs.

**Respuestas HTTP previstas:**

| Código | Situación |
|---|---|
| 200 | Listado recuperado |
| 401 | Token ausente, inválido o caducado |
| 403 | Identidad autenticada que no es el administrador autorizado |
| 429 | Límite de peticiones superado |
| 503 | Servicio de base de datos no disponible o configuración backend incompleta |
| 500 | Error interno no esperado |

No se debe devolver detalle interno de Supabase al navegador.

## 5. Acceso backend a Supabase: decisión pendiente

La inspección confirma el cliente Supabase del navegador, pero no confirma una conexión de servidor disponible para consultar `public.users`.

Antes de implementar:

- Revisar los nombres de variables de entorno presentes en los despliegues sin revelar sus valores.
- Confirmar si existe una credencial backend dedicada.
- Si se utiliza una service-role key, mantenerla solo en el servidor y limitar el uso a esta operación de lectura.
- Preferir una credencial de mínimo privilegio si el diseño de RLS y permisos de Postgres lo permite.
- No usar la clave anónima como sustituto de una autorización backend.
- No cambiar RLS ni políticas para hacer funcionar el endpoint sin una revisión separada.

Si no hay credencial backend segura disponible, detener la implementación y documentar la dependencia; no degradar la seguridad usando una clave privilegiada en cliente.

## 6. Cambios de interfaz previstos (fase posterior)

En una implementación futura:

- Sustituir el estado `User[]` por `HistoricalUserRecord[]` en el bloque de registro histórico.
- Solicitar `GET /api/admin/users` enviando el Firebase ID token vigente como Bearer.
- Mostrar estados explícitos de carga, listado vacío y error.
- No representar un fallo de red/RLS como un listado vacío correcto.
- Cambiar la columna de estado actual por una indicación inequívoca: **“Registro histórico; no determina el acceso actual”**, hasta que exista una fuente autoritativa para mostrar permisos vigentes.
- Mantener el resto de funciones de Admin sin cambios.

## 7. Pruebas previstas

### Autenticación y autorización

- Sin token: 401.
- Token inválido/caducado: 401.
- Token de proyecto distinto: 403.
- Scout válido: 403.
- UID de administrador no coincidente o no configurado: 403.
- Administrador con token válido y UID autorizado: puede continuar.

### Contrato y datos

- Devuelve solo las columnas permitidas.
- No devuelve claims, credenciales ni campos internos.
- El rol histórico no concede privilegios.
- No deriva autorización comparando emails.
- Una tabla sin filas devuelve 200 con `users: []` y `total: 0`.
- Error de Supabase devuelve error controlado, nunca un 200 con lista vacía.
- Verificar que el endpoint no ejecuta INSERT, UPDATE ni DELETE.

### Regresión

- La pantalla Admin conserva el resto de sus secciones y acciones.
- Un error de carga del listado no bloquea la carga de observadores ni de la configuración del scout.
- Ejecutar TypeScript, build y pruebas de seguridad existentes, además de las nuevas pruebas del endpoint.

## 8. Archivos que podrían verse afectados en la implementación

| Archivo | Cambio futuro |
|---|---|
| `src/types.ts` | Añadir contrato histórico separado; evitar reutilizar `User` |
| `server.ts` | Endpoint GET protegido y acceso backend a Supabase |
| `src/pages/Admin.tsx` | Sustituir consulta directa por llamada al endpoint y mejorar estados |
| `src/server/adminUsers.test.ts` (propuesto) | Pruebas de autorización, contrato y errores |

No se deben modificar estos archivos durante la fase actual de diseño.

## 9. Límites y siguientes decisiones

- No se ha verificado el esquema real de columnas de `public.users`; los nombres deben confirmarse antes de programar.
- No se ha verificado una credencial backend de Supabase ni su alcance.
- No se ha demostrado que las filas de `public.users` correspondan a identidades Firebase.
- No se ha comprobado el estado del trigger `on_auth_user_created` en producción.
- No se han leído filas, ejecutado SQL, cambiado RLS ni modificado producción.

**Siguiente paso autorizado:** revisar el esquema SQL versionado para confirmar columnas y restricciones de `public.users`, e inventariar de forma segura la configuración backend requerida. Después presentar una especificación final del endpoint. La implementación funcional queda pendiente de autorización expresa.
