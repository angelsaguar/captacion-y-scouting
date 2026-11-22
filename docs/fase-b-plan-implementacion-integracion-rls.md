# Fase B — Plan de implementación Firebase ↔ Supabase y endurecimiento RLS

**Rama:** feat/fase-b-hardening-supabase  
**Estado:** plan técnico para implementación y validación aislada. No desplegado.  
**Fecha:** 22-11-2026

## 1. Objetivo

Cerrar las brechas identificadas en la auditoría de Supabase sin interrumpir la aplicación de Captación y Scouting ni perder datos. El trabajo se realizará por etapas, con pruebas negativas y funcionales, y con un procedimiento de reversión.

## 2. Situación confirmada

1. Firebase Authentication se inicializa en src/lib/firebase.ts.
2. src/App.tsx reconoce actualmente dos cuentas por email verificado y asigna admin o scout en el estado del cliente.
3. Los módulos del scout se leen desde Firestore club_access/alejandro_scout; el control de rutas se realiza en frontend.
4. Supabase Third-Party Auth para el proyecto Firebase gen-lang-client-0091658680 aparece habilitado en la configuración mostrada por el usuario.
5. src/lib/supabase.ts crea el cliente con URL y anon key, pero no configura accessToken para enviar el Firebase ID token. También contiene un cliente alternativo localStorage cuando faltan las variables de entorno.
6. No se ha verificado aún un JWT Firebase con los claims requeridos aceptado por Supabase.
7. El repositorio contiene firebase-admin en dependencias, pero la rama inspeccionada no contiene firebase.json ni una carpeta functions/; no se ha identificado un backend de Firebase Admin desplegado.
8. La aplicación realiza operaciones de negocio directamente desde el navegador. Algunas tareas administrativas y sincronizaciones también se ejecutan desde el cliente.
9. La auditoría de producción mostró políticas RLS permisivas y GRANT excesivos en tablas de negocio. No se ha ejecutado ninguna corrección en producción.
10. public.users.id referencia auth.users.id como UUID. No se debe equiparar ese identificador con Firebase UID, que es texto y no necesariamente UUID.
11. El trigger public.handle_new_user() pertenece al flujo de Supabase Auth; no debe asumirse que se ejecutará para altas de Firebase Third-Party Auth.
12. El bucket avatars es público y el código cliente intenta subir archivos bajo player-photos/; la consulta de pg_policies no devolvió políticas para storage.objects. La aplicación usa fallback Base64 si falla la subida.

## 3. Arquitectura objetivo

### 3.1 Identidad

- Firebase Authentication sigue siendo el proveedor de identidad de la aplicación.
- Firebase ID token es la credencial que el cliente entrega a Supabase mediante el mecanismo oficial de Third-Party Auth.
- Supabase valida el token del proyecto Firebase configurado.
- El claim PostgreSQL role: authenticated selecciona el rol SQL authenticated; no representa el perfil funcional.
- Claims funcionales firmados por Firebase Admin SDK: app_role, app_active y allowed_modules.
- Los claims se asignan únicamente desde backend de confianza. El navegador nunca puede asignarse rol, estado activo o módulos.

### 3.2 Backend de confianza

Antes de implementar endpoints, elegir y documentar un único destino:
- Vercel Functions con Firebase Admin SDK; o
- Firebase Cloud Functions con Firebase Admin SDK.

Criterios de elección:
- soporte de secretos de servidor;
- identidad de servicio/IAM;
- región y disponibilidad;
- logs y auditoría;
- límites de ejecución y coste;
- procedimiento de despliegue y rollback.

El backend deberá:
1. verificar el Firebase ID token con Firebase Admin SDK;
2. comprobar que el usuario está autorizado y activo contra una fuente de verdad protegida;
3. validar que el actor es admin para cambiar permisos;
4. asignar claims con setCustomUserClaims;
5. registrar actor, usuario afectado, cambio, fecha y resultado;
6. nunca aceptar app_role, app_active o allowed_modules como autoridad desde el body del cliente;
7. proporcionar un mecanismo controlado de refresco de token y revocación.

No se almacenarán claves de service account, secretos de Supabase ni claves privilegiadas en Git, en el bundle cliente o en variables VITE_*.

### 3.3 Cliente Supabase

Solo después de validar tokens y políticas en un proyecto aislado:
- configurar el cliente Supabase con accessToken: async () => await auth.currentUser?.getIdToken() según la versión instalada de supabase-js;
- gestionar estado sin usuario y expiración de token;
- no enviar token alternativo cuando no exista usuario Firebase válido;
- distinguir el modo localStorage del modo Supabase real y evitar que el fallback simule una autorización de servidor;
- probar refresco de token y cambios de claims.

No activar esta integración contra el proyecto de producción hasta completar las pruebas de RLS.

## 4. Fuente de verdad de roles y módulos

Mantener un registro de autorización administrado en servidor. Para cada usuario:
- Firebase UID;
- email verificado (solo como atributo, no como único identificador);
- estado activo;
- rol funcional;
- módulos autorizados;
- fecha y actor de la última modificación.

El registro Firestore actual club_access/alejandro_scout puede ser fuente inicial de migración, pero no se debe confiar en una lectura del cliente para autorizar SQL. El backend valida la fuente protegida y emite claims. Los cambios de permisos deben tener auditoría.

Política por defecto: deny by default. Un usuario nuevo o no reconocido no recibe acceso de negocio.

## 5. Orden de implementación

### Etapa A — Preparación y entorno de pruebas
- Crear proyecto Supabase aislado (no producción) y configurar proveedor Firebase de pruebas.
- Crear cuentas de prueba separadas: admin, scout con módulos, scout sin módulos, usuario inactivo y usuario sin claims.
- Preparar dataset sintético sin datos reales.
- Confirmar versión exacta de supabase-js y despliegue elegido para backend.
- Exportar esquema y políticas del entorno aislado.

**Puerta de salida:** tokens de prueba emitidos por el proyecto Firebase correcto y aceptados/rechazados como se espera por Supabase.

### Etapa B — Backend de identidad
- Implementar verificación de ID token con Firebase Admin SDK.
- Implementar endpoint admin-only para emitir/actualizar claims.
- Implementar revocación/desactivación y registro de auditoría.
- Proteger endpoint con validación server-side; no confiar en el rol enviado por el navegador.
- Configurar secretos exclusivamente en el entorno de pruebas.
- Añadir pruebas unitarias e integración.

**Puerta de salida:** un scout no puede autoasignarse permisos ni cambiar claims de otro usuario; admin autorizado sí puede hacerlo.

### Etapa C — Cliente Supabase
- Conectar Firebase ID token a Supabase en rama aislada.
- Verificar role=authenticated, iss, aud y sub del token.
- Verificar token expirado, ausencia de sesión y refresco.
- Desactivar cualquier ruta de fallback que pueda aparentar acceso remoto autenticado.
- No tocar producción.

**Puerta de salida:** llamadas Supabase llegan con el JWT correcto y los usuarios sin token no acceden a tablas protegidas.

### Etapa D — SQL RLS y GRANT
- Generar migración idempotente para entorno aislado.
- Revocar políticas permisivas antiguas por nombre exacto.
- Revocar GRANT innecesarios a anon y authenticated.
- Crear políticas por tabla, operación, rol y módulo.
- Definir helpers RLS con search_path seguro y EXECUTE mínimo.
- Asegurar que users no permite autoascenso ni modificación de claims/roles.
- Revisar Storage avatars, funciones SECURITY DEFINER y triggers.
- Evitar cambios indiscriminados en tablas cuya utilización no esté confirmada.

**Puerta de salida:** pruebas positivas y negativas de RLS superadas.

### Etapa E — Refactor de operaciones privilegiadas
- Mover administración de usuarios/claims y tareas privilegiadas a backend.
- Revisar las operaciones de sincronización de Admin.tsx y clubAccessAndSync.ts.
- Proteger api/tactical-advice.ts con identidad, validación y rate limit; preservar deliberadamente los endpoints RFFM públicos que deban seguir siéndolo, añadiendo límites.
- Revisar borrados de jugadores, cascadas y limpieza de archivos.
- Separar autorización de frontend y autorización efectiva de servidor.

**Puerta de salida:** las acciones no autorizadas se deniegan aunque se invoquen directamente desde REST o se manipule el navegador.

### Etapa F — Regresión y entrega
- Ejecutar matriz completa de pruebas funcionales.
- Revisar logs y ausencia de filtración de secretos.
- Preparar exportación/backup, plan de rollback y orden de migración.
- Presentar PR y Preview para validación manual.
- Solicitar autorización separada antes de tocar producción, fusionar a main o desplegar.

## 6. Matriz mínima de pruebas

| Caso | Resultado esperado |
|---|---|
| Sin JWT | Denegado |
| JWT expirado o revocado | Denegado |
| JWT de otro proyecto Firebase | Denegado |
| JWT sin claim role=authenticated | Denegado |
| Usuario sin app_role válido | Denegado |
| Usuario app_active=false | Denegado |
| Scout sin módulo | Denegado en REST/RLS, no solo en interfaz |
| Scout con módulo | Solo operaciones aprobadas para ese módulo |
| Scout intenta DELETE de jugador | Denegado |
| Scout intenta cambiar rol o claims | Denegado |
| Scout intenta leer users de otro usuario | Denegado |
| Admin válido | Operaciones autorizadas según matriz |
| Token con claims antiguos tras revocación | Acceso revocado conforme a TTL/refresco probado |
| Upload avatar con MIME/tamaño no permitido | Denegado |
| Upload avatar permitido | Permitido solo a identidad y ruta autorizadas |
| Usuario anónimo intenta leer tablas negocio | Denegado |
| Fallback localStorage | No se presenta como garantía de seguridad del servidor |

## 7. Pendientes que requieren confirmación técnica antes del SQL definitivo

1. Confirmar el proveedor Third-Party Auth y el comportamiento real del token mediante una cuenta de prueba.
2. Confirmar si las políticas RLS pueden basarse directamente en claims Firebase y qué validación de emisor/audiencia aplica en el proyecto configurado.
3. Confirmar tablas realmente activas: anthropometrics, physical_tests, tactics, team_sessions.
4. Resolver el uso de public.users y el trigger handle_new_user() para identidades Firebase.
5. Confirmar permisos por módulo para operaciones de lectura/escritura; la matriz inicial es propuesta, no evidencia del uso de negocio.
6. Determinar si el scout debe crear/editar coaches o necesidades y si puede gestionar observadores. Por defecto, no conceder permisos administrativos.
7. Definir qué datos de jugadores pueden ver los scouts en cada módulo y si se requiere limitar columnas o filas.
8. Confirmar si la subida de imágenes debe permanecer directa desde el cliente y si el bucket seguirá siendo público.

## 8. Criterios de seguridad no negociables

- Ningún cambio en Supabase producción durante preparación.
- Ningún dato real en el entorno de pruebas.
- Ningún secreto privilegiado en frontend o repositorio.
- Ninguna política permisiva general que neutralice políticas restrictivas.
- Ningún rol o permiso aceptado desde input del cliente.
- Ningún cambio de esquema o permiso sin backup y rollback.
- Ningún merge a main ni despliegue sin autorización expresa.

## 9. Estado de esta entrega

Este documento es un plan de ejecución. No contiene una migración para producción y no se ha ejecutado SQL, asignado claims, desplegado backend ni modificado código funcional.
