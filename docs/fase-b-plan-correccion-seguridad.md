# Fase B — Plan de corrección de seguridad de Supabase

## Estado
Rama independiente: feat/fase-b-hardening-supabase.

Este documento prepara la remediación. No ejecuta cambios en Supabase, no modifica datos, no cambia producción y no autoriza un despliegue.

## 1. Evidencias de la auditoría

Resultados obtenidos en el proyecto Supabase consultado el 22-11-2026:

- 13 tablas en el esquema public.
- RLS aparece habilitado en las 13 tablas; FORCE ROW LEVEL SECURITY aparece deshabilitado en las 13.
- La consulta de privilegios efectivos mostró true para SELECT, INSERT, UPDATE y DELETE de anon y authenticated en las 13 tablas.
- La exportación contiene 66 políticas RLS. Hay políticas permisivas ALL con qual=true y with_check=true para anon y authenticated en ocho tablas: anthropometrics, attendance_sessions, match_plans, physical_tests, players, tactics, team_matches y team_sessions.
- En player_attributes hay además una política ALL para authenticated con qual=true y with_check=true. Esta política permisiva neutraliza en la práctica la intención de las políticas más específicas de admin/scout para ese rol.
- coaches y needs tienen políticas públicas de lectura y políticas authenticated de INSERT/UPDATE/DELETE con condiciones true, además de duplicados y reglas basadas en auth.uid().
- observers tiene lectura pública y políticas authenticated de INSERT/DELETE con condiciones true, también duplicadas.
- users tiene políticas de SELECT/UPDATE condicionadas a auth.uid() = id.
- Se encontró public.handle_new_user() como función SECURITY DEFINER, propiedad de postgres. La definición mostrada inserta en public.users, toma el nombre de raw_user_meta_data con fallback, guarda el email y asigna el rol fijo scout; en conflicto actualiza nombre y email.
- La consulta mostró proconfig = NULL para esa función; no se observó un search_path fijado a nivel de función.

Estas evidencias muestran políticas muy permisivas en metadatos. El riesgo efectivo depende también de privilegios SQL, exposición por API, configuración de claves y autenticación utilizada. No demuestran por sí solas que haya ocurrido un acceso indebido.

## 2. Dependencia crítica: autenticación

La revisión de src/lib/supabase.ts muestra que el cliente se crea con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. No se observa en ese archivo un proveedor accessToken que entregue un JWT de Firebase al cliente Supabase. La aplicación usa Firebase Authentication en otros flujos.

Por tanto, no aplicar todavía políticas basadas en auth.uid(): el identificador de Firebase no debe asumirse equivalente a auth.uid() de Supabase. Antes hay que decidir e implementar una integración de identidad compatible.

Opciones técnicas a evaluar:
1. Integración formal de Firebase Auth como proveedor de terceros de Supabase, verificando issuer, audience, firma, claims y mapeo de identidad.
2. Backend o Edge Functions que verifiquen el Firebase ID token y ejecuten operaciones autorizadas en servidor. La clave service_role solo puede residir en servidor, nunca en variables VITE_* ni en el navegador.
3. Migración progresiva de las operaciones directas del navegador a endpoints de servidor, con autorización por usuario y rol y pruebas de regresión.

No se elegirá una opción hasta inventariar todas las operaciones de lectura y escritura de la aplicación y confirmar qué mecanismo de identidad utiliza cada una.

## 3. Matriz priorizada de corrección

### Prioridad crítica — acceso anónimo de escritura sin filtro
- anthropometrics
- attendance_sessions
- match_plans
- physical_tests
- players
- tactics
- team_matches
- team_sessions

En estas tablas se encontraron políticas ALL para anon y authenticated con qual=true y with_check=true. La prioridad es eliminar el acceso anónimo de escritura y definir acceso de lectura pública solo cuando esté expresamente justificado. Para authenticated, sustituir el acceso general por permisos de rol verificados.

### Prioridad crítica — política general que anula controles específicos
- player_attributes

Existe una política ALL para authenticated con qual=true y with_check=true, además de políticas específicas para admin/scout. Por ser permisiva, la política general se combina mediante OR con las específicas y hace que las restricciones específicas no limiten el acceso de authenticated.

### Prioridad alta — gestión
- coaches
- needs
- observers

Separar la lectura pública justificada de las operaciones de escritura. Eliminar duplicados y asegurar que INSERT/UPDATE/DELETE se autoricen por rol y no solo por estar autenticado.

### Prioridad alta — perfiles
- users

Mantener la regla de acceso al propio perfil solo después de confirmar que auth.uid() corresponde a la identidad real del usuario de la aplicación. Proteger especialmente la columna role para impedir escalada de privilegios mediante actualización del perfil.

### Función privilegiada
Para public.handle_new_user():
- fijar un search_path seguro en la definición de la función;
- mantener el rol inicial fijo y no confiar en metadatos del cliente para conceder privilegios;
- revisar los permisos EXECUTE y el trigger asociado;
- comprobar que el upsert no puede alterar el rol de un usuario existente;
- probar alta, conflicto y rollback en entorno aislado.

No modificar la función en producción desde esta rama.

## 4. Secuencia de implementación propuesta

1. Inventariar todas las llamadas a Supabase y sus tablas y operaciones.
2. Confirmar el flujo real Firebase Auth → Supabase/API.
3. Definir matriz de permisos por rol y por tabla (admin/scout/anon), incluyendo excepciones públicas justificadas.
4. Implementar primero la capa de autenticación y autorización en una rama y entorno de pruebas.
5. Preparar migración SQL idempotente y reversible para políticas y privilegios.
6. Ejecutar pruebas automatizadas: anónimo, scout, admin, acceso cruzado, lectura, inserción, actualización y borrado.
7. Probar flujos funcionales completos: jugadores, fichas, pruebas físicas, entrenamientos, asistencias, tácticas, partidos y sincronización.
8. Solo tras validación y autorización expresa, planificar una ventana de despliegue con backup verificado y rollback.

## 5. Criterios de aceptación

- Ningún usuario anónimo puede leer o modificar información sensible.
- Un scout solo puede realizar las operaciones aprobadas para su rol.
- Las operaciones administrativas están reservadas a administradores verificados.
- Las políticas no se solapan de forma que una política permisiva anule la restricción pretendida.
- La función handle_new_user no permite autoasignación de rol privilegiado.
- La aplicación mantiene sus flujos funcionales y la sincronización sin pérdida de datos.
- No hay secretos de servidor en el bundle del navegador.

## 6. Límites de esta rama

- No ejecutar SQL contra Supabase.
- No cambiar políticas, privilegios, tablas, funciones ni datos en producción.
- No modificar main.
- No fusionar ramas ni crear despliegues de Vercel producción.
- Los nombres del CSV exportado son los nombres SQL exactos de las 13 tablas y se utilizan aquí tal como aparecen. Los esquemas del repositorio son históricos y no deben considerarse prueba de que coinciden con producción.
