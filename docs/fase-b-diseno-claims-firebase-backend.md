# Fase B — identidad Firebase, claims y backend confiable

**Rama:** `feat/fase-b-hardening-supabase`  
**Estado:** diseño técnico, no desplegado.  
**Fecha:** 22-11-2026

## 1. Situación verificada en el repositorio

- Firebase Web SDK se inicializa en `src/lib/firebase.ts`.
- `src/App.tsx` autoriza actualmente por email verificado y dos direcciones concretas, asignando `admin`/ `scout` en estado React.
- El permiso de módulos del scout procede de Firestore `club_access/alejandro_scout`.
- No existe carpeta `functions/`, ni `firebase.json` en la raíz de la rama revisada.
- `package.json` incluye `firebase-admin`, pero eso no constituye un backend desplegado ni una asignación de custom claims.
- Las rutas API de Vercel revisadas no implementan verificación Firebase común. En concreto, `api/tactical-advice.ts` no verifica token ni usuario y permite CORS `*`; los endpoints públicos de consulta RFFM también permiten CORS `*`. Los endpoints RFFM pueden tener un propósito público, pero hay que fijar límites de uso y validar parámetros. No confundir estos endpoints públicos de consulta con endpoints administrativos o de datos privados.

## 2. Diseño de claims

Claims mínimos propuestos, firmados por Firebase Admin SDK:

```json
{
  "role": "authenticated",
  "app_role": "admin",
  "app_active": true,
  "allowed_modules": ["scouting", "campograma", "needs", "gestion-equipo", "estadisticas-rivales"]
}
```

Para scout:
- `app_role = scout`
- `app_active = true`
- `allowed_modules` contiene solo los módulos asignados en el documento de autorización del usuario.
- Si el usuario está desactivado, `app_active = false` o se revocan los claims y sesiones.

El claim PostgreSQL `role = authenticated` es necesario para que Supabase asigne el rol de base de datos. No significa admin ni scout.

## 3. Fuente de verdad y sincronización

No duplicar permisos editables en React. Propuesta:

1. Mantener una fuente de verdad de permisos en servidor (Firestore protegido o tabla administrativa protegida), con UID Firebase, estado, rol, módulos y registro de cambios.
2. Un backend de administración verifica el ID token Firebase con Admin SDK y comprueba que el llamante es administrador según una fuente confiable.
3. El backend asigna custom claims mediante `setCustomUserClaims(uid, claims)`.
4. El usuario renueva el ID token (`getIdToken(true)`) para recibir claims actualizados.
5. El backend registra actor, usuario objetivo, cambio, fecha y resultado.
6. Las bajas o cambios de permisos invalidan/renuevan sesiones y claims según procedimiento documentado.

No permitir que el usuario se envíe a sí mismo `app_role`, `app_active` ni `allowed_modules`. Nunca aceptar estos valores desde el body de una petición sin autorización de servidor.

## 4. Usuarios existentes y futuros

### Usuarios existentes
- Exportar únicamente UID y email de cuentas activas desde Firebase Authentication.
- Comparar contra la lista autorizada y fuente de permisos vigente.
- Asignar claims por lote con Admin SDK desde entorno seguro, tras revisión de doble control.
- No asignar automáticamente admin por email sin una lista explícita aprobada.
- Probar primero con una cuenta de prueba que no tenga acceso a producción.

### Usuarios futuros
- Crear usuario con flujo de alta aprobado.
- El backend determina rol y módulos por defecto (deny by default).
- Asignar claims mediante Admin SDK después de validar la identidad y aprobación.
- No permitir acceso a Supabase antes de completar asignación.

## 5. Dónde ejecutar el backend

La rama no contiene actualmente Firebase Cloud Functions. Opciones:
- Firebase Cloud Functions con Admin SDK; o
- Vercel Functions protegidas, con Firebase Admin SDK y credenciales de servicio configuradas solo como secretos de servidor.

No se recomienda introducir una función nueva sin definir primero despliegue, secretos, permisos IAM, región, logs y procedimiento de rollback. No almacenar JSON de service account ni secretos en GitHub, en el bundle cliente o en variables `VITE_*`.

## 6. Cliente Supabase

Solo después de:
- claims emitidos y verificados con token de prueba;
- políticas RLS y privilegios probados;
- operaciones administrativas movidas o restringidas;
- pruebas negativas superadas;

se añadirá en la rama de desarrollo la opción `accessToken: async () => await auth.currentUser?.getIdToken()` al cliente Supabase. Si el usuario no está autenticado, no se debe proporcionar un token alternativo ni fallback de acceso remoto.

No añadir aún `accessToken` al cliente actual. No activar acceso real Firebase→Supabase desde la aplicación hasta que la matriz de RLS esté lista.

## 7. Hallazgo adicional: API de Vercel

La revisión de `api/tactical-advice.ts` observa:
- no verifica Firebase ID token;
- CORS permite cualquier origen;
- puede consumir `GEMINI_API_KEY` en peticiones POST.

Antes de producción debe definirse autenticación, rate limiting, validación de tamaño/campos y límites de coste. Para endpoints RFFM de consulta pública, documentar que son públicos y aplicar validación/rate limiting, pero no exigir autenticación si el producto necesita acceso público.

## 8. Pruebas requeridas

- Token de Firebase de otro proyecto: denegado.
- Token expirado, ausente o revocado: denegado.
- Token Firebase sin claim `role: authenticated`: Supabase deniega.
- Scout sin módulo: denegado por RLS incluso llamando REST directamente.
- Scout inactivo: denegado.
- Scout no puede autoasignarse rol ni módulos.
- Admin puede gestionar permisos solo mediante endpoint protegido.
- Tras revocar módulo, token antiguo no conserva privilegios indefinidamente: probar TTL/refresco y estrategia de revocación.
- Claims de usuario existente y futuro se sincronizan correctamente.
- No se filtran credenciales de Admin SDK en frontend, logs o repositorio.

## 9. Límites

Este documento no crea funciones, no asigna claims, no modifica Firebase Auth, Firestore ni Supabase, no cambia RLS y no despliega endpoints.


## 10. Validación adicional de la integración oficial y decisiones de implementación (22-11-2026)

Documentación oficial consultada:
- Supabase Firebase Auth: https://supabase.com/docs/guides/auth/third-party/firebase-auth
- Firebase custom claims: https://firebase.google.com/docs/auth/admin/custom-claims

### Requisitos confirmados por Supabase
- El cliente web debe pasar el Firebase ID token mediante la opción `accessToken` de `createClient`.
- El token Firebase debe incluir el claim literal `role: "authenticated"`; sin él, Supabase asigna el rol PostgreSQL `anon`.
- El proveedor Firebase ya está registrado como Third-Party Auth en el proyecto Supabase de producción (verificación previa del usuario), pero el registro del proveedor no añade claims a los usuarios ni modifica el cliente de la aplicación.
- Un cliente Supabase que utiliza `accessToken` debe autenticarse y cerrar sesión con Firebase; no debe depender de `supabase.auth.signInWithPassword()` ni del Auth session de Supabase para esos mismos usuarios.

### Requisitos confirmados por Firebase
- Solo un entorno servidor con Firebase Admin SDK puede asignar custom claims.
- Los claims actualizados se reflejan cuando el usuario recibe un token nuevo o fuerza su renovación con `getIdToken(true)`.
- `setCustomUserClaims()` reemplaza el objeto completo de custom claims existente; cualquier implementación debe leer y preservar claims actuales no gestionados antes de escribir el objeto combinado.
- El tamaño total de custom claims está limitado a 1000 bytes. Mantenerlos compactos; no guardar perfiles, emails, ni listas extensas.

### Mapeo de permisos decidido para el diseño
La interfaz actual usa `allowedModules` en camelCase, mientras el diseño de JWT usa `allowed_modules`. La implementación deberá mapear de forma explícita:
- Firebase custom claim `role = "authenticated"` → rol PostgreSQL.
- Firebase custom claim `app_role = "admin" | "scout"` → rol funcional.
- Firebase custom claim `app_active = true | false` → estado.
- Firebase custom claim `allowed_modules` → lista compacta de módulos.
No confiar en el objeto Zustand/React ni en el email del body de una petición.

### Hallazgo de endpoints administrativos ausentes
El cliente `src/lib/clubAccessAndSync.ts` invoca:
- `POST /api/admin/sync-scout-access`
- `POST /api/scout/seal-uid`

El árbol de archivos de esta rama no contiene `api/admin/sync-scout-access.ts` ni `api/scout/seal-uid.ts`. Antes de implementar el nuevo mecanismo, confirmar si estas rutas están realmente ausentes en la rama/deployment y corregir el desacoplamiento; no dar por hecho que el flujo de sellado y sincronización de UID ya dispone de backend.

### Riesgo adicional de seed automático
`src/App.tsx` invoca `syncJugadorasToDatabaseAndLocalStorage()` al iniciar sesión. En `src/lib/seedJugadoras.ts` se localizaron UPDATE de `players.foto_url` y UPSERT de registros iniciales. Debe extraerse del efecto general de login y convertirse en tarea administrativa explícita, protegida y auditable. No conservar permisos amplios para que el seed funcione desde cualquier sesión.

### Plan de implementación seguro
1. Crear backend Vercel Functions bajo `api/_lib` con Firebase Admin SDK inicializado mediante credenciales de entorno gestionadas por Vercel; nunca JSON de service account en Git.
2. Verificar cada ID token Firebase en servidor con revocación cuando corresponda y validar `email_verified`, proyecto y UID esperado.
3. Autorizar al administrador con allowlist de UID aprobado, no únicamente por un email enviado en el body. Confirmar UID real de administrador en Firebase Console antes de configurar el allowlist.
4. Para el scout, leer la configuración de Firestore desde Admin SDK, comprobar `active`, UID bloqueado y módulos permitidos. Denegar por defecto si falta el documento o hay inconsistencia.
5. Asignar claims preservando cualquier custom claim no gestionado, usando el mapeo anterior. Registrar auditoría de actor, UID objetivo, módulos y resultado, sin registrar tokens.
6. Renovar el token del cliente y verificar claims emitidos antes de conectar Supabase.
7. Solo entonces añadir `accessToken` al cliente remoto en una rama de prueba. El fallback local debe permanecer separado y no simular autenticación remota.
8. Añadir RLS y GRANT restrictivos después de que el token real funcione en el proyecto de prueba.

### Bloqueos que requieren verificación en consola o entorno aislado
- Confirmar si Firebase Authentication del proyecto tiene Identity Platform y si puede utilizar blocking functions. No asumirlo.
- Confirmar el UID Firebase real de administrador y scout; no se ha inferido ni inventado.
- Configurar credenciales Admin SDK en entorno de prueba; no solicitar ni introducir secretos en GitHub/chat.
- Verificar token de cada cuenta en servidor, incluyendo `iss`, `aud`, `sub`, `email_verified` y claims esperados.
- Confirmar que el proveedor Third-Party Auth de Supabase acepta el token de prueba y asigna `authenticated`.
- No cambiar claims de usuarios reales ni desplegar endpoints a producción durante esta fase de preparación.

### Límites
Esta revisión no ha asignado claims, no ha creado endpoints, no ha modificado el cliente Supabase, no ha ejecutado SQL y no ha cambiado Firebase/Supabase/Vercel producción.
