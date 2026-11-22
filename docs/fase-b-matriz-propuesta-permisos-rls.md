# Fase B — Matriz propuesta de permisos RLS

**Rama:** `feat/fase-b-hardening-supabase`  
**Estado:** diseño de seguridad; no ejecutar en producción.  
**Fecha:** 22-11-2026

## 1. Objetivo y criterios obligatorios

La auditoría del proyecto Supabase de producción identificó políticas permisivas para `anon` y `authenticated` en ocho tablas, una política general permisiva en `player_attributes` y permisos de escritura excesivos en tablas de gestión. Esta matriz propone sustituir ese modelo por permisos mínimos.

Reglas globales:

- `anon`: sin acceso a tablas de negocio ni a Storage con información de scouting.
- `authenticated`: solo usuarios con JWT Firebase del proyecto registrado y claims válidos.
- Roles de negocio permitidos: `admin` y `scout`. Ningún rol se obtiene de datos enviados por el navegador.
- El administrador puede gestionar todos los módulos.
- El scout queda limitado a los módulos habilitados expresamente en su autorización.
- Borrado de registros sensibles: solo admin, salvo excepción justificada y aprobada.
- Los roles, estado activo y módulos se asignan en servidor mediante Firebase Admin SDK; nunca desde el frontend.
- No usar políticas permisivas generales que anulen otras políticas más restrictivas.

## 2. Identidad Firebase: condición técnica crítica

La aplicación usa Firebase Authentication y entrega un UID Firebase como identidad de usuario. El esquema SQL histórico contiene `public.users.id UUID REFERENCES auth.users(id)`. No se debe asumir que un UID Firebase es UUID ni que existe una fila correspondiente en `auth.users`.

Por ello:

- No basar las políticas Firebase en `auth.uid()` hasta verificar el tipo y comportamiento con un token real de prueba.
- Para identificar al usuario Firebase, utilizar el claim firmado `auth.jwt()->>'sub'` como texto, después de validar emisor/proyecto y el rol PostgreSQL.
- El claim literal `role: authenticated` selecciona el rol PostgreSQL `authenticated`; **no** es el rol funcional admin/scout.
- Claims de negocio propuestos: `app_role` (`admin` o `scout`), `app_active` (boolean) y `allowed_modules` (lista de identificadores de módulo). Solo Firebase Admin SDK o un proceso backend confiable puede asignarlos.
- El cliente no puede cambiar custom claims ni escribir perfiles de permisos.
- Revisar y rediseñar la relación `public.users`/trigger `handle_new_user()`: un Firebase user externo no crea automáticamente una fila en `auth.users` ni dispara el trigger Supabase Auth. No reutilizar ese trigger como mecanismo de alta Firebase.

No desplegar ni asignar claims hasta verificar el comportamiento con un usuario de pruebas y un JWT emitido por el proyecto correcto.

## 3. Matriz propuesta por tabla

Convenciones:
- **R** = SELECT.
- **C** = INSERT.
- **U** = UPDATE.
- **D** = DELETE.
- **—** = denegado.
- Admin: CRUD en tablas operativas; administración de permisos únicamente desde backend.
- Scout: solo cuando `app_active=true` y el módulo correspondiente está incluido en `allowed_modules`.

| Tabla | Anónimo | Admin | Scout con módulo autorizado | Restricción adicional |
|---|---:|---:|---:|---|
| `players` | — | CRUD | R/C/U | D solo admin; validar campos y autoría en servidor/RLS |
| `player_attributes` | — | CRUD | R/C/U | D solo admin |
| `anthropometrics` | — | CRUD | R/C/U | D solo admin; acceso por módulo de scouting/valoración |
| `physical_tests` | — | CRUD | R/C/U | D solo admin; acceso por módulo de scouting/valoración |
| `observers` | — | CRUD | R | Altas/bajas solo admin hasta confirmar flujo de mantenimiento |
| `needs` | — | CRUD | R/C/U | D solo admin; módulo `needs` |
| `coaches` | — | CRUD | R/C/U | D solo admin; módulo `gestion-equipo` |
| `tactics` | — | CRUD | R/C/U | D solo admin; módulo `campograma` |
| `team_matches` | — | CRUD | R/C/U | D solo admin; módulo `gestion-equipo` |
| `match_plans` | — | CRUD | R/C/U | D solo admin; módulo `gestion-equipo` |
| `team_sessions` | — | CRUD | R/C/U | D solo admin; módulo `gestion-equipo` |
| `attendance_sessions` | — | CRUD | R/C/U | D solo admin; módulo `gestion-equipo` |
| `users` | — | R | R propio | C/actualización de rol/estado/módulos solo backend; no permitir autoascenso |

### Notas de alcance

1. Los módulos `scouting`, `campograma`, `needs` y `gestion-equipo` se corresponden con los módulos declarados en el código revisado.
2. La matriz trata `anthropometrics` y `physical_tests` como datos sensibles de valoración y no permite acceso anónimo.
3. La política de `users` no debe permitir que un usuario actualice `role`, `active`, `allowed_modules`, UID o email de identidad. Si se requiere editar nombre/avatar, hacerlo con columnas permitidas o endpoint de servidor.
4. Esta es la matriz objetivo, no prueba de que cada módulo utilice hoy exactamente esas tablas. Antes de generar la migración ejecutable se debe completar el inventario de llamadas SELECT/INSERT/UPDATE/DELETE, Storage y Realtime por módulo.
5. La autorización por módulo debe verificarse en RLS, no solo ocultando rutas o botones en React.

## 4. Modelo de claims propuesto

Ejemplo conceptual de claims firmados por Firebase (no copiar a mano ni editar desde el cliente):

```json
{
  "role": "authenticated",
  "app_role": "scout",
  "app_active": true,
  "allowed_modules": ["scouting", "needs"]
}
```

Para el administrador, `app_role` será `admin`; los módulos pueden resolverse como acceso total mediante una regla de servidor. No incluir datos personales, emails ni información de jugadores en los claims.

Firebase limita el tamaño de custom claims y recomienda utilizarlos solo para control de acceso. La lista de módulos debe mantenerse pequeña. La asignación de claims debe ser centralizada, auditable y revocable.

## 5. Funciones auxiliares RLS previstas

La implementación SQL posterior podrá incluir funciones pequeñas y de solo lectura que consulten los claims verificados:

- `public.current_firebase_uid()` → `auth.jwt()->>'sub'` como texto.
- `public.current_app_role()` → `auth.jwt()->>'app_role'`.
- `public.current_user_is_active()` → comprueba `app_active` y `role = authenticated`.
- `public.current_user_has_module(text)` → comprueba admin o módulo en `allowed_modules`.

Estas funciones deberán tener `search_path` seguro, permisos EXECUTE mínimos y no aceptar identidad/rol como parámetros controlados por el cliente. La comprobación de emisor Firebase debe quedar explícita donde sea necesaria y coherente con el proveedor registrado.

## 6. Privilegios SQL además de RLS

RLS no sustituye a los GRANT/REVOKE. La migración debe revisar privilegios efectivos y:
- revocar de `anon` los privilegios de tablas de negocio;
- conceder a `authenticated` solo las operaciones que realmente requiera la aplicación;
- limitar secuencias, funciones RPC y Storage;
- revisar vistas y funciones SECURITY DEFINER;
- no conceder `service_role` al navegador ni guardar claves de servidor en variables `VITE_*`.

## 7. Migración: no ejecutar todavía

No se incluye un script ejecutable deliberadamente. Faltan verificaciones imprescindibles:

1. Confirmar el esquema real de producción tabla por tabla, columnas, constraints, vistas, funciones, buckets y publicaciones Realtime.
2. Confirmar que `sub` de Firebase puede ser utilizado como texto en las políticas y que no se depende de `auth.uid()` UUID.
3. Inventariar todas las operaciones de la aplicación por tabla y módulo.
4. Resolver el perfil de identidad y retirar el supuesto de que el trigger `handle_new_user()` crea perfiles Firebase.
5. Acordar si el scout puede borrar o mantener observadores; por defecto queda denegado.
6. Preparar pruebas en un proyecto Supabase aislado con usuarios admin/scout y token sin claims.
7. Preparar rollback y backup verificado antes de cualquier cambio real.

## 8. Criterios de aceptación

- Token ausente, expirado, de otro proyecto o sin `role: authenticated`: sin acceso.
- Usuario inactivo o sin `app_role` válido: sin acceso.
- Scout sin módulo: sin acceso aunque invoque directamente REST/Storage.
- Scout con módulo: solo operaciones de su matriz.
- Scout no puede borrar ni cambiar permisos.
- Admin puede realizar operaciones aprobadas.
- Ningún usuario puede modificar sus propios claims o elevar su rol.
- No hay política permisiva antigua que amplíe el acceso mediante OR.
- Pruebas funcionales de todos los módulos superadas antes de activar el cliente Supabase Firebase.

## 9. Referencias técnicas

- Supabase — Firebase Auth: https://supabase.com/docs/guides/auth/third-party/firebase-auth
- Supabase — Third-party Auth: https://supabase.com/docs/guides/auth/third-party/overview
- Firebase — Custom claims: https://firebase.google.com/docs/auth/admin/custom-claims

## 10. Límites de seguridad de esta rama

- No se ejecutó SQL en Supabase.
- No se cambiaron permisos, RLS, tablas, funciones ni datos de producción.
- No se asignaron custom claims a usuarios.
- No se modificó el código de ejecución.
- No se modificó `main`, no se fusionó ni se desplegó a producción.
