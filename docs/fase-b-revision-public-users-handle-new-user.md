# Fase B — Revisión de dependencias de public.users y handle_new_user()

**Fecha de revisión:** 22-11-2026  
**Rama:** `feat/fase-b-hardening-supabase`  
**Alcance:** inspección estática del código y de los scripts SQL versionados. No se ha consultado ni modificado producción.

## 1. Resultado ejecutivo

La dependencia funcional directa de `public.users` localizada en el código de la aplicación es limitada:

- `src/pages/Admin.tsx` ejecuta `supabase.from('users').select('*')`.
- El resultado alimenta una tabla titulada **“Registro Histórico de Usuarios en Tabla Local”**.
- La interfaz muestra nombre, email, rol y un estado calculado comparando el email con dos direcciones autorizadas.
- En los archivos de aplicación revisados no se ha localizado INSERT, UPDATE ni DELETE sobre `public.users`.
- No se ha localizado una llamada de aplicación a `handle_new_user()` ni una llamada RPC a esa función.
- Los scripts SQL versionados sí definen la función y, en `supabase_schema.sql`, crean un trigger `on_auth_user_created` sobre `auth.users`.

**Conclusión provisional:** no hay evidencia en el código cliente revisado de que la tabla `public.users` sea necesaria para el flujo diario de scouting. Sí tiene una dependencia visible en la pantalla de administración y una posible dependencia histórica del trigger de Supabase Auth. No debe eliminarse ni cambiarse hasta validar el catálogo real de triggers y la necesidad del registro histórico.

## 2. Evidencia de código

### 2.1 Consulta en Admin

Archivo: `src/pages/Admin.tsx`

En la carga inicial:
```ts
const { data: usersData } = await supabase.from('users').select('*');
if (usersData) setUsers(usersData);
```

No se comprueba explícitamente el error de esa consulta. Si una futura policy RLS impide la lectura, la tabla puede quedar vacía sin explicar el motivo al administrador.

### 2.2 Uso de los datos

La tabla de administración muestra:
- `u.nombre`
- `u.email`
- `u.role`

El estado “Autorizado” o “Acceso Revocado (Histórico Conservado)” se calcula en frontend mediante comparación del email con `ADMIN_EMAIL` y `ALEJANDRO_EMAIL`.

Este estado es una etiqueta visual histórica; no debe considerarse un mecanismo de autorización. La autorización real debe seguir comprobándose en backend y RLS con UID y claims verificados.

### 2.3 Operaciones de escritura

En los archivos revisados:
- No se encontró `insert` sobre `users`.
- No se encontró `update` sobre `users`.
- No se encontró `delete` sobre `users`.

La consulta localizada es de solo lectura.

## 3. Evidencia de los scripts SQL

Los archivos versionados contienen definiciones de `public.handle_new_user()` como función `SECURITY DEFINER`.

En `supabase_schema.sql` se define un trigger:
```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

La función inserta o actualiza `public.users` a partir de `new.id`, `new.email` y metadatos del usuario.

En `supabase.sql` aparece otra variante de la función y el trigger se presenta como comentario, no como creación activa.

**Límite de evidencia:** esto demuestra que los scripts proponen o contienen esa lógica, pero no demuestra que el trigger esté instalado actualmente en producción ni que se siga ejecutando. Debe verificarse con el catálogo de triggers y funciones del entorno aislado y, antes de cualquier cambio productivo, con un snapshot aprobado del catálogo productivo.

## 4. Recomendación de arquitectura

### Mantener temporalmente public.users

- No eliminar la tabla durante la primera migración.
- No usar `public.users.role` como fuente de autorización.
- No permitir al cliente modificar `role`, identidad o estado.
- Mantener sus datos históricos hasta definir su destino.
- No crear automáticamente filas Supabase Auth para identidades Firebase.

### Sustituir la lectura directa de Admin

La consulta `select('*')` no debe conservarse como solución final si el modelo de identidad pasa a Firebase.

Diseño recomendado:
1. El frontend solicita al backend la lista de perfiles históricos/identidades que puede consultar un administrador.
2. El backend verifica token Firebase y UID de administrador.
3. Devuelve únicamente los campos necesarios para la pantalla: identificador interno, nombre visible, email, rol informativo y estado.
4. No devuelve credenciales, tokens, claims completos ni datos de autenticación innecesarios.
5. El backend distingue explícitamente registros históricos de identidades activas actuales.

Esta modificación se hará en una fase de código posterior, con pruebas y sin cambiar producción hasta autorización.

### Revisar el trigger

Antes de decidir su retirada:
- Confirmar si `on_auth_user_created` existe en el proyecto y está habilitado.
- Revisar si hay altas reales mediante Supabase Auth que dependan de él.
- Comprobar si `public.users` tiene filas huérfanas o perfiles sin uso mediante recuentos agregados, sin exportar emails.
- Revisar si alguna integración externa consume `public.users`.
- Si se conserva, endurecer la función con `SET search_path = ''` y referencias completamente cualificadas, tras probar el comportamiento en entorno aislado.
- Evitar que el trigger asigne roles privilegiados desde metadatos controlados por el usuario. El rol inicial, si se requiere, debe ser fijo y de mínimo privilegio.

## 5. Impacto sobre la migración de identidad

| Elemento | Estado observado | Tratamiento recomendado |
|---|---|---|
| `public.users` | Lectura directa en Admin | Mantener provisionalmente; sustituir por endpoint admin seguro |
| `public.users.role` | Se muestra en UI | Informativo/histórico; no autoritativo |
| `handle_new_user()` | Presente en scripts SQL | Confirmar trigger real; no eliminar todavía |
| `auth.users` | FK de `public.users.id` y otras tablas | No asumir que Firebase crea filas aquí |
| `app_identities` | Solo diseño propuesto | Prototipo aislado; no crear en producción |

## 6. Próximas tareas técnicas

1. Obtener un snapshot del catálogo de triggers y funciones en un entorno aislado.
2. Confirmar si el trigger está realmente instalado y habilitado.
3. Revisar el tipo `User` en `src/types` y todos los componentes que dependan de esa estructura.
4. Diseñar el endpoint de listado de usuarios para Admin con respuesta mínima.
5. Añadir manejo explícito de errores en la carga de la tabla de administración.
6. Preparar pruebas de autorización: scout no puede consultar el listado; admin sí.
7. Mantener el acceso histórico mientras se prepara la transición.

## 7. Límites de esta revisión

- No se ha consultado el catálogo productivo de triggers o funciones en esta revisión.
- No se han leído ni exportado filas de `public.users`.
- No se ha ejecutado SQL.
- No se ha modificado `public.users`, `auth.users`, el trigger ni la función.
- No se ha cambiado el frontend ni se ha desplegado código.
