# Fase B — revisión de autenticación, altas y asignación de roles

**Estado:** auditoría estática de la rama `feat/fase-b-hardening-supabase`.  
**Fecha de revisión:** 24-11-2026.  
**Cambios funcionales:** ninguno.  
**Supabase producción:** no modificado.

## 1. Resultado principal

La aplicación inspeccionada utiliza Firebase Authentication como mecanismo de inicio de sesión y Firestore para la configuración de acceso del observador. El cliente Supabase se inicializa con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, pero en los flujos revisados no se ha encontrado un intercambio de token Firebase por una sesión Supabase ni una llamada a `supabase.auth.setSession()`.

Esto es un bloqueo arquitectónico importante para aplicar directamente las políticas propuestas en el documento `fase-b-propuesta-correccion-seguridad-users.md`.

Las expresiones RLS basadas en `auth.uid()` evalúan la identidad de Supabase Auth. Un usuario autenticado únicamente en Firebase no queda automáticamente identificado como usuario `authenticated` de Supabase. Por tanto, no debemos dar por hecho que `auth.uid() = id` identifica a los usuarios Firebase actuales.

## 2. Flujos de inicio de sesión comprobados

### 2.1. Login Google

Archivo: `src/pages/Login.tsx`.

- Usa `signInWithPopup` y `signInWithRedirect` de Firebase Auth.
- Comprueba `fbUser.emailVerified`.
- Autoriza explícitamente la cuenta administradora y la cuenta del observador mediante funciones de `clubAccessAndSync.ts`.
- Establece el usuario de interfaz en el store local.
- No se observa en este flujo una creación o actualización de fila en `public.users`.

### 2.2. Restauración de sesión

Archivo: `src/App.tsx`.

- Usa `onAuthStateChanged(auth, ...)` de Firebase.
- Repite la validación de correo y cuenta autorizada.
- Recupera la configuración del observador desde Firestore.
- Cierra sesión Firebase si la cuenta no está autorizada.
- No se observa creación de sesión Supabase a partir del token Firebase.

### 2.3. Registro

Archivo: `src/pages/Register.tsx`.

- El registro público está deshabilitado.
- La pantalla informa de que el acceso requiere una cuenta Google expresamente autorizada y vinculada por UID en Firebase Authentication.
- No hay un formulario de alta pública en este componente.

### 2.4. UID y perfil del observador

Archivo: `src/lib/clubAccessAndSync.ts`.

- `ensureAlejandroAccessInitializedByAdmin()` crea, si no existe, el documento Firestore `club_access/alejandro_scout` con rol de aplicación `scout`, módulos vacíos, UID sin sellar y estado activo.
- `bindAndVerifyAlejandroUid()` verifica el correo del observador y, si el UID aún no está sellado, lo persiste en Firestore. Si ya está sellado, comprueba que coincide.
- Estos flujos operan sobre Firestore; no crean una fila en `public.users`.

### 2.5. Servidor Express

Archivo: `server.ts`.

- Usa Firebase Admin `verifyIdToken()` en `requireClubAuth`.
- Comprueba proyecto Firebase, correo verificado, identidad autorizada, UID de administrador configurado y perfil de observador en Firestore.
- `/api/admin/sync-scout-access` lee el perfil de Firestore.
- `/api/scout/seal-uid` verifica el UID sellado; no lo modifica.
- `/api/admin/sync-firebase-claims` está deshabilitado salvo que `ENABLE_FIREBASE_CLAIMS_ISSUANCE=true`; emite custom claims Firebase después de validar identidades y perfil.
- En el código inspeccionado no se ha localizado un cliente Supabase de servidor ni un endpoint que gestione `public.users`.

## 3. Uso observado de public.users

En `src/pages/Admin.tsx`, alrededor de la línea 188, el panel ejecuta:

```ts
const { data: usersData } = await supabase.from('users').select('*');
if (usersData) setUsers(usersData);
```

La tabla se utiliza después para mostrar perfiles y su campo `role` en el panel de administración. No se ha encontrado en ese archivo una escritura directa sobre `users`.

Consecuencia: antes de retirar permisos SELECT o cambiar la política de lectura, hay que comprobar cómo se está poblando actualmente esa tabla y si el panel realmente recibe filas. Con la autenticación Firebase actual, no debe suponerse que `auth.uid()` está disponible en la sesión Supabase.

## 4. Implicaciones para la corrección

1. No ejecutar todavía el SQL candidato de `fase-b-propuesta-correccion-seguridad-users.md`.
2. No confiar en una política `auth.uid() = id` para identificar a usuarios autenticados solo en Firebase.
3. No añadir un intercambio de tokens Firebase/Supabase sin diseñar y probar formalmente el mecanismo de confianza.
4. La opción arquitectónica ya documentada sigue siendo navegador → Express → Firebase Admin (identidad y autorización) → Supabase servidor. El servidor deberá derivar el UID y el rol del token verificado; no aceptarlos como autoridad desde el cuerpo de la petición.
5. Antes de implementar la conexión de servidor, confirmar el mecanismo de credenciales Supabase privado en el despliegue. No pedir ni registrar el valor del secreto. Nunca debe exponerse con prefijo `VITE_`.
6. Si el panel necesita seguir mostrando perfiles, definir si `public.users` es un registro histórico, una tabla auxiliar o una fuente autoritativa. Actualmente el rol autoritativo de la aplicación se deriva de reglas Firebase/Firestore y de la configuración de cuentas permitidas; no se debe asumir que `public.users.role` gobierna el login.

## 5. Próximas comprobaciones seguras

- Revisar todos los usos de `supabase.from('users')` y cualquier acceso dinámico a la tabla.
- Confirmar mediante una prueba funcional no destructiva si el listado de usuarios del panel recibe filas o falla silenciosamente.
- Revisar las reglas Firestore y los flujos de administración de `club_access/alejandro_scout`.
- Confirmar únicamente la existencia/nombre de una variable privada Supabase en el entorno de servidor, sin revelar su valor.
- Diseñar el endpoint de lectura administrativa de perfiles con columnas explícitas y autorización Firebase Admin.
- Preparar tests unitarios de autorización y tests locales con datos ficticios antes de plantear cambios SQL.

## 6. Límites de esta auditoría

Esta es una revisión estática de los archivos indicados en la rama. No demuestra el estado de variables del despliegue, el comportamiento real de cada consulta en producción ni la configuración de reglas Firestore. Tampoco se han cambiado archivos funcionales, políticas, grants ni datos.
