# Fase B — Diseño de migración de identidad y conservación de autoría

**Estado:** diseño técnico, no ejecutable  
**Rama:** `feat/fase-b-hardening-supabase`  
**Objetivo:** preparar una migración gradual desde las referencias actuales de identidad hacia una identidad interna compatible con Firebase, preservando los datos y la autoría histórica.

> Este documento no autoriza ni contiene una migración para producción. No se han consultado ni exportado valores personales de las tablas de negocio. Las relaciones descritas proceden de la auditoría de catálogo realizada previamente y deben volver a comprobarse en un entorno aislado antes de generar SQL.

## 1. Principios no negociables

1. No modificar producción durante esta fase de diseño.
2. No eliminar ni sobrescribir las columnas actuales de autoría.
3. No asignar una identidad histórica por coincidencia de correo solamente.
4. No aceptar desde el navegador el UUID interno de identidad como autor.
5. Resolver el Firebase UID desde un ID token verificado en backend.
6. Mantener una única fuente de verdad para permisos de módulos: autorización protegida en Firestore y claims firmados emitidos por backend.
7. Mantener la tabla de identidad como vínculo técnico y de auditoría, no como una segunda consola de permisos.
8. Toda migración deberá ser aditiva al principio, reversible y validada con datos sintéticos.

## 2. Relaciones de autoría observadas en el catálogo de producción

La auditoría previa identificó estas relaciones:

| Tabla | Columna actual | Referencia actual | Observación |
|---|---|---|---|
| `players` | `created_by` | `auth.users.id` | UID de identidad Supabase Auth |
| `needs` | `created_by` | `auth.users.id` | UID de identidad Supabase Auth |
| `coaches` | `created_by` | `public.users.id` | Perfil de aplicación |
| `tactics` | `updated_by` | `public.users.id` | Perfil de aplicación |
| `public.users` | `id` | `auth.users.id` | Perfil vinculado a Supabase Auth |

Estas relaciones no deben confundirse con las definiciones de los archivos `supabase.sql` y `supabase_schema.sql` del repositorio. Los archivos muestran variantes de esquema y políticas históricas; no son prueba suficiente del estado desplegado.

### Discrepancias documentales que deben resolverse

- Los scripts versionados no reflejan necesariamente el conjunto completo de tablas y constraints observados en producción.
- En algunos scripts, las referencias de `players.created_by` y `needs.created_by` apuntan a `public.users`, mientras que la auditoría de catálogo identificó referencias directas a `auth.users`.
- La definición de `public.users`, los triggers y las políticas varían entre los scripts.
- Antes de preparar SQL definitivo se necesita un snapshot actualizado del catálogo del entorno aislado, incluyendo constraints, índices, triggers, policies y grants.

## 3. Modelo objetivo propuesto

Crear una entidad interna `public.app_identities` con UUID propio:

| Campo | Tipo propuesto | Uso |
|---|---|---|
| `id` | UUID PK | Identificador interno estable |
| `firebase_uid` | TEXT UNIQUE NOT NULL | UID del usuario Firebase validado |
| `email` | TEXT | Dato informativo, no clave de autorización |
| `app_role` | TEXT | Rol funcional controlado por backend |
| `active` | BOOLEAN | Estado administrativo controlado por backend |
| `created_at` | TIMESTAMPTZ | Alta |
| `updated_at` | TIMESTAMPTZ | Última actualización |

Restricciones:
- No se habilitará CRUD directo para usuarios finales.
- No se expondrá `service_role` al navegador.
- La aplicación no podrá elegir `app_role` ni `active` desde el cliente.
- Los módulos autorizados seguirán procediendo de claims verificados y de la fuente protegida de Firestore.
- No se creará una relación entre Firebase UID y UUID interno por inferencia o coincidencia de email.

## 4. Estrategia de migración aditiva

No se recomienda cambiar las FK actuales directamente. Se propone una transición en fases, primero en un proyecto aislado.

### Fase 0 — Captura de línea base

Guardar, sin datos personales:
- Definición de tablas y columnas.
- PK, FK, acciones ON DELETE/ON UPDATE.
- Índices y restricciones UNIQUE.
- Triggers y funciones asociadas.
- Policies RLS y grants por rol.
- Recuentos agregados de filas y de valores NULL/no NULL en columnas de autoría.
- Dependencias de código sobre `public.users` y `handle_new_user()`.

Resultado: snapshot reproducible del estado inicial.

### Fase 1 — Crear identidad paralela

- Crear `app_identities` en el entorno aislado.
- No cambiar todavía las FK ni las columnas actuales.
- Añadir columnas nuevas de autoría, inicialmente NULL, en las tablas que realmente necesiten transición:
  - `players.created_by_identity`
  - `needs.created_by_identity`
  - `coaches.created_by_identity`
  - `tactics.updated_by_identity`
- Crear FK de las nuevas columnas hacia `app_identities.id`.
- No rellenar automáticamente las columnas nuevas.

### Fase 2 — Correspondencia controlada

Preparar una tabla temporal de correspondencia que relacione:
- Tipo y valor de la identidad histórica.
- UUID interno de `app_identities`.
- Evidencia que justifica la correspondencia.
- Estado: verificada, pendiente o no mapeable.
- Fecha y responsable de validación.

Reglas:
- Una correspondencia solo se acepta con evidencia técnica verificable.
- El correo electrónico por sí solo no demuestra que dos identidades sean la misma.
- Los registros históricos sin correspondencia demostrable permanecen intactos en las columnas originales y con la nueva columna NULL.
- No se elimina ni se reasigna autoría histórica para forzar una cobertura del 100 %.

### Fase 3 — Escrituras nuevas desde backend

- El backend verifica el ID token Firebase.
- Obtiene el UID exclusivamente del token validado.
- Resuelve ese UID en `app_identities`.
- Asigna el UUID interno en la nueva columna de autoría.
- Ignora cualquier `created_by` o `updated_by` enviado por el navegador.
- Rechaza la operación si no existe identidad activa o si falta el permiso del módulo correspondiente.

No se habilitará todavía el cliente Supabase directo con el token Firebase hasta completar las pruebas de claims, RLS y compatibilidad de identidad.

### Fase 4 — Validación funcional

Con datos sintéticos:
- Alta de jugador por scout autorizado.
- Edición de jugador por scout autorizado.
- Intento de borrado de jugador por scout: debe denegarse.
- Lectura de necesidades y entrenadores por scout: permitida según módulo.
- Intentos de modificación de necesidades y entrenadores por scout: denegados.
- Escrituras administrativas permitidas únicamente a admin.
- Identidad inexistente, inactiva o token inválido: denegación.
- Autoría nueva siempre derivada del token verificado.
- Ninguna operación debe cambiar el autor histórico original.

### Fase 5 — Cambio de lectura y consolidación

Solo después de superar las pruebas:
- Cambiar de forma controlada las lecturas de auditoría a la nueva identidad.
- Comparar recuentos y muestras sintéticas antes/después.
- Mantener las columnas originales durante un periodo de observación.
- Retirar las FK antiguas únicamente en una fase posterior, con aprobación específica y rollback ensayado.

## 5. Matriz de preservación de autoría

| Dato actual | Acción inicial | Dato nuevo | Condición para migrar |
|---|---|---|---|
| `players.created_by` | Conservar sin cambios | `created_by_identity` | Correspondencia verificada |
| `needs.created_by` | Conservar sin cambios | `created_by_identity` | Correspondencia verificada |
| `coaches.created_by` | Conservar sin cambios | `created_by_identity` | Correspondencia verificada |
| `tactics.updated_by` | Conservar sin cambios | `updated_by_identity` | Correspondencia verificada |

Los valores NULL originales deben seguir siendo NULL. Los valores no mapeables no se sustituyen por una identidad genérica ni por la identidad del administrador que ejecute la migración.

## 6. Rollback previsto

El rollback debe poder ejecutarse sin reconstruir datos históricos:

1. Desactivar el uso de las nuevas columnas en la aplicación.
2. Volver a la lectura y escritura anterior, si el flujo antiguo sigue disponible y es seguro.
3. Mantener `app_identities` y las columnas nuevas sin borrarlas durante la investigación.
4. Revertir policies y grants del entorno aislado al snapshot inicial.
5. Comparar recuentos, NULLs y valores de autoría originales.
6. No borrar las tablas de correspondencia hasta cerrar la validación.

No se considera rollback seguro una operación que elimine columnas originales o reescriba sus valores.

## 7. Consultas de validación que deberá cubrir el futuro paquete SQL

El paquete de pruebas deberá generar resultados agregados y no exponer datos personales:

- Número total de filas por tabla.
- Número de autores NULL y no NULL por columna.
- Número de valores históricos distintos por columna de autoría.
- Número de correspondencias verificadas, pendientes y no mapeables.
- Número de nuevas FK válidas y huérfanas.
- Recuento antes/después por tabla.
- Resultado de pruebas de permisos por rol, módulo y operación.
- Verificación de que las columnas originales no han cambiado.

Las consultas definitivas se escribirán solo después de validar el catálogo del proyecto aislado y los nombres reales de las columnas.

## 8. Decisiones funcionales que condicionan las pruebas RLS

Se mantienen las decisiones ya confirmadas:
- Scout: puede crear y editar jugadores, pero no eliminarlos.
- Scout: puede consultar todos los campos personales de jugadores cuando tiene acceso al módulo correspondiente.
- Scout: solo lectura de necesidades.
- Scout: solo lectura de entrenadores.
- Las escrituras de jugadores para scouting no conceden automáticamente permisos de gestión de plantilla, asistencia o administración.
- Observadores: administración restringida.
- Las tablas de antropometría, pruebas físicas y sesiones de equipo permanecen bloqueadas hasta confirmar su uso directo y el permiso funcional aplicable.

## 9. Bloqueos antes de generar SQL de migración

No se debe generar ni ejecutar SQL de migración hasta disponer de:
1. Proyecto Supabase aislado, separado de producción.
2. Snapshot de catálogo del entorno aislado y comparación documentada con producción.
3. Confirmación de cómo se relacionan las identidades Firebase con las identidades Supabase existentes, si existe esa relación.
4. Revisión de uso real de `public.users` y del trigger `handle_new_user()`.
5. Inventario de datos históricos de autoría mediante recuentos agregados.
6. Pruebas de rollback completadas.

## 10. Estado de ejecución

- Diseño documentado en rama de trabajo.
- No se ha creado `app_identities` en ningún proyecto.
- No se han añadido columnas ni FK.
- No se han cambiado policies, grants, triggers ni Storage.
- No se han asignado claims a usuarios reales.
- No se ha ejecutado SQL en Supabase.
- No se ha fusionado la rama ni desplegado código.
