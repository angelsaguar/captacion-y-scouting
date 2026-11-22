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
