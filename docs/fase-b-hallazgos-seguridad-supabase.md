# Fase B — revisión inicial de seguridad Supabase

## Alcance y límites
Esta revisión se basa en los archivos del repositorio `main` y en los resultados de solo lectura que el usuario ejecutó en el proyecto Supabase de producción. No se han cambiado políticas, privilegios, tablas, datos ni configuración.

## Hallazgos confirmados
1. En la tabla `public.attendance_sessions` aparecen dos políticas:
   - Una política `FOR ALL` para `anon, authenticated`, con `USING (true)` y `WITH CHECK (true)`.
   - Una política `FOR SELECT` pública con `USING (true)`.
   Estas políticas son excesivamente permisivas. El impacto efectivo depende también de los privilegios SQL concedidos a los roles; por eso hay que ejecutar la auditoría de permisos antes de concluir qué operaciones pueden realizarse mediante la API.
2. El archivo `supabase_schema.sql` del repositorio define explícitamente esas políticas abiertas para `attendance_sessions` y también contiene políticas permisivas para otras tablas (por ejemplo `match_plans`, además de tablas de scouting). El script del repositorio no prueba por sí solo que todas las políticas actuales de producción coincidan con él.
3. `src/lib/supabase.ts` crea el cliente Supabase con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, sin configuración visible de un proveedor de tokens Firebase en ese cliente.
4. `src/lib/clubAccessAndSync.ts` utiliza Firebase Auth para decidir qué usuarios pueden iniciar la sincronización Firestore y para generar tokens Firebase destinados a rutas API. Esa comprobación de la aplicación no constituye por sí misma una política RLS de Supabase.
5. En la sincronización revisada, las sesiones de entrenamiento se sincronizan mediante localStorage y Firestore `club_sync`. No se ha encontrado una llamada a `attendance_sessions` en ese flujo concreto. Antes de cambiar esa tabla hay que confirmar si está en uso por otra pantalla, versión o integración.

## Decisión técnica
No sustituir todavía las políticas por reglas basadas en `auth.uid()`: el código revisado autentica mediante Firebase y no se ha demostrado que Supabase reciba un JWT compatible que establezca `auth.uid()`. Aplicar ese cambio sin adaptar la autenticación podría bloquear operaciones legítimas.

## Siguiente comprobación
Ejecutar `fase-b-auditoria-seguridad-rls.sql` en modo de solo lectura y revisar:
- RLS habilitado y FORCE RLS por tabla.
- Privilegios efectivos de `anon` y `authenticated`.
- Todas las políticas existentes en `public`.
- Funciones `SECURITY DEFINER` y roles disponibles.

Después se diseñará una solución alineada con Firebase Auth: preferentemente un backend/API que valide el Firebase ID token y opere con permisos mínimos, o una integración formal de JWT si se configura y valida de extremo a extremo. No introducir una clave `service_role` en el navegador.

## Límites de autorización
Esta fase no autoriza cambios en producción, ejecución de DDL, cambios de RLS, revocaciones, migraciones, merge a `main` ni despliegue. Todo cambio se preparará primero en una rama independiente y requerirá revisión y autorización explícita antes de aplicarlo.
