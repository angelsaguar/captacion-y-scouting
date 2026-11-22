# Fase B — Plan de corrección de seguridad de Supabase

## Estado
Rama independiente: feat/fase-b-hardening-supabase.

Este documento prepara la remediación. No ejecuta cambios en Supabase, no modifica datos, no cambia producción y no autoriza un despliegue.

## 1. Evidencias de la auditoría

Resultados obtenidos en el proyecto Supabase consultado el 22-11-2026:
- 13 tablas en el esquema public.
- RLS aparece habilitado en las 13 tablas; FORCE ROW LEVEL SECURITY aparece deshabilitado en las 13.
- La consulta de privilegios efectivos mostró true para SELECT, INSERT, UPDATE y DELETE de anon y authenticated en las 13 tablas.
- La exportación contiene 66 políticas RLS. Entre ellas hay políticas permisivas ALL con condiciones true para roles anónimos y autenticados, incluyendo tablas de jugadores, sesiones, tácticas y partidos.
- Se encontró public.handle_new_user() como función SECURITY DEFINER, propiedad de postgres. Inserta en public.users, toma el nombre de raw_user_meta_data, guarda el email y asigna el rol fijo scout; en conflicto actualiza nombre y email.
- La consulta mostró proconfig = NULL para esa función; no se observó un search_path fijado a nivel de función.

Estos resultados demuestran una configuración permisiva en los metadatos consultados, pero no prueban por sí solos que una persona externa haya accedido a los datos. El alcance efectivo depende también de los privilegios concedidos, la API expuesta, las claves disponibles y las rutas reales de acceso.

## 2. Dependencia crítica: autenticación

La revisión de src/lib/supabase.ts muestra que el cliente se crea con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. No se observa en ese archivo un proveedor accessToken que entregue un JWT de Firebase al cliente Supabase. La aplicación usa Firebase Authentication en otros flujos.

Por tanto, no aplicar todavía políticas basadas en auth.uid(): el identificador de Firebase no debe asumirse equivalente a auth.uid() de Supabase. Antes hay que decidir e implementar una integración de identidad compatible.

Opciones técnicas a evaluar:
1. Integración formal de Firebase Auth como proveedor de terceros de Supabase, verificando issuer, audience, firma, claims y mapeo de identidad.
2. Backend o Edge Functions que verifiquen el Firebase ID token y ejecuten operaciones autorizadas en servidor. La clave service_role solo puede residir en servidor, nunca en variables VITE_* ni en el navegador.
3. Migración progresiva de las operaciones directas del navegador a endpoints de servidor, con autorización por usuario y rol y pruebas de regresión.

No se elegirá una opción hasta inventariar todas las operaciones de lectura y escritura de la aplicación y confirmar qué mecanismo de identidad utiliza cada una.

## 3. Matriz priorizada de corrección

### Prioridad crítica — datos sensibles
- players
- player_attributes
- anthropometrics / Pruebas físicas (confirmar nombre exacto en catálogo)
- attendance_sessions / sesiones_de_asistencia...
- team_sessions / sesiones_de_equipo
- match_plans
- tactics

Acción prevista: retirar acceso anónimo de escritura y limitar lectura y escritura a identidades verificadas y roles autorizados, una vez que la autenticación esté integrada y probada. Definir explícitamente qué datos pueden ser públicos; no asumir que todas las tablas deben quedar privadas.

### Prioridad alta — gestión y configuración
- users
- coaches / entrenadores
- observers / observadores
- needs / necesita
- team_matches / partidos_de_equipo

Acción prevista: separar lectura pública justificada de operaciones de escritura. Las operaciones administrativas deben comprobar el rol desde una fuente no manipulable por el propio usuario.

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
- Los nombres de tablas deben contrastarse con el catálogo real antes de generar la migración final: las capturas muestran nombres traducidos o recortados y el repositorio contiene esquemas históricos distintos.