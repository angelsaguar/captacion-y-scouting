# Fase B — Modelo de identidad Firebase ↔ Supabase

**Rama:** `feat/fase-b-hardening-supabase`  
**Fecha:** 22-11-2026  
**Estado:** propuesta de arquitectura; pendiente de validación en un proyecto Supabase aislado. No ejecutar en producción.

## 1. Problema que debe resolver

La aplicación autentica usuarios con Firebase Authentication y Supabase recibe el Firebase ID token mediante Third-Party Auth. El token identifica al usuario mediante `sub`, que contiene un Firebase UID de texto.

El esquema Supabase histórico mezcla relaciones UUID hacia `auth.users` y `public.users`:
- `public.users.id → auth.users.id` (UUID).
- `players.created_by → auth.users.id`.
- `needs.created_by → auth.users.id`.
- `coaches.created_by → public.users.id`.
- `tactics.updated_by → public.users.id`.

No debe convertirse un Firebase UID a UUID mediante cast, ni asumirse que el proveedor Third-Party Auth crea una fila `auth.users` para cada cuenta Firebase. Tampoco se debe aceptar un UUID de autoría enviado por el navegador.

## 2. Modelo objetivo propuesto

Introducir una tabla de identidad de aplicación independiente del mecanismo interno de usuarios de Supabase:

```sql
-- Diseño conceptual para el proyecto aislado; NO ejecutar en producción.
CREATE TABLE public.app_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL UNIQUE,
  email text,
  app_role text NOT NULL CHECK (app_role IN ('admin', 'scout')),
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

Propiedades:
- `id` es el UUID interno estable de la aplicación.
- `firebase_uid` conserva el UID original de Firebase como texto y tiene unicidad.
- `email` es un atributo informativo; no es clave de identidad ni prueba suficiente de autorización.
- `app_role` y `active` no son editables por el usuario final.
- Los cambios se realizan únicamente desde backend confiable y con auditoría.
- Los módulos autorizados no se mantienen duplicados en una segunda fuente SQL: los claims firmados por Firebase proceden del documento de autorización protegido en Firestore y se verifican por RLS. Si en el futuro se replica el permiso en SQL, debe existir un proceso transaccional/auditable para evitar divergencias.

**Importante:** la tabla es un modelo conceptual. No se ha confirmado todavía si conviene mantener una tabla separada o adaptar `public.users`; la decisión final depende de cómo se quieran migrar los registros históricos y de las FK actuales.

## 3. Estrategia de compatibilidad recomendada

### Opción A — Tabla de mapeo y migración gradual (recomendada para pruebas)

1. Crear `app_identities` en un proyecto aislado.
2. El backend verifica el Firebase ID token y obtiene `sub`.
3. El backend localiza la identidad por `firebase_uid`; nunca acepta el ID interno desde el body.
4. Para nuevas escrituras, el backend asigna `created_by = app_identities.id`.
5. Migrar en entorno aislado las columnas de autoría a FK `app_identities.id`, conservando las columnas/valores históricos mediante columnas temporales o tabla de correspondencia.
6. Mantener `public.users` solo como perfil de aplicación si realmente lo requiere la UI, con relación explícita a `app_identities`, no como supuesto de que todo Firebase user existe en `auth.users`.

Ventaja: la identidad de aplicación queda desacoplada de Supabase Auth.  
Coste: exige migración de FK y revisión de trigger `handle_new_user()`.

### Opción B — Mantener FK actuales hacia Supabase Auth

Solo sería válida si el proyecto de pruebas demuestra que cada usuario Firebase autorizado tiene una fila `auth.users` compatible y estable, y que el ciclo de vida está soportado oficialmente. No asumirlo ni crear usuarios Supabase duplicados con contraseñas ficticias. La prueba debe incluir alta, baja, refresco y revocación.

### Decisión provisional

Usar Opción A para el diseño y prototipo aislado. No tocar todavía el esquema de producción. La decisión de migración definitiva requerirá exportación de constraints, recuento de referencias, correspondencia de autores históricos y rollback probado.

## 4. Relación de autoría objetivo

En el modelo final, las columnas de autoría de negocio deberían apuntar a una misma entidad de identidad:

| Tabla/columna | Relación objetivo propuesta |
|---|---|
| `players.created_by` | `app_identities.id` |
| `needs.created_by` | `app_identities.id` |
| `coaches.created_by` | `app_identities.id` |
| `tactics.updated_by` | `app_identities.id` |
| futuras columnas `updated_by` | `app_identities.id` |

No cambiar automáticamente datos históricos: primero identificar qué valores no nulos existen, si corresponden a usuarios Supabase reales y cómo mapearlos sin pérdida.

## 5. Cómo resuelve el backend la identidad

Para cada endpoint protegido:
1. Extraer Bearer token.
2. Verificarlo con Firebase Admin SDK.
3. Comprobar `aud` y `iss` del proyecto Firebase esperado, `sub`, expiración y `email_verified`.
4. Comprobar claims firmados `role=authenticated`, `app_role`, `app_active` y `allowed_modules`.
5. Resolver el Firebase UID a `app_identities.id) en el servidor cuando la operación necesite autoría.
6. Derivar actor/autor desde el token verificado, nunca desde el body.
7. Validar el permiso de módulo y la operación concreta.
8. Registrar auditoría sin almacenar ID tokens ni datos personales innecesarios.

Para peticiones directas a Supabase, RLS utilizará los claims verificados del JWT para decidir acceso por rol y módulo. No se debe confiar en `app_identities.id` enviado por el navegador. Si una política necesita verificar autoría fila a fila, se resolverá mediante una función segura o una relación diseñada para el JWT, y se probará su comportamiento con el proveedor Firebase real.

## 6. Claims y relación con la tabla de identidad

Claims previstos:
- `role = authenticated`: rol PostgreSQL que Supabase requiere.
- `app_role = admin | scout`: rol funcional.
- `app_active = true | false`: estado de acceso.
- `allowed_modules = [ids]`: módulos autorizados.

Los claims deben ser emitidos por Firebase Admin SDK a partir de Firestore protegido. La tabla `app_identities` no debe convertirse en una segunda fuente independiente que permita discrepancias. Su fila representa identidad y autoría; la autorización de módulos seguirá una fuente de verdad única.

El UID Firebase debe ser el valor de `sub` del token validado. No se acepta `uid` proporcionado por cliente.

## 7. RLS de la tabla de identidades

- Anónimo: ningún acceso.
- Scout: no puede listar ni modificar identidades. Si la aplicación necesita mostrar su perfil, solo se ofrecerá una consulta/endpoint que devuelva campos mínimos de su propia identidad.
- Admin: lectura administrativa a través de backend protegido; no CRUD directo desde el navegador.
- INSERT/UPDATE/DELETE: backend de servicio con credenciales exclusivamente de servidor.
- No conceder `service_role` al cliente ni exponerlo en variables `VITE_*`.

## 8. Migración de prueba y conservación de datos

La migración aislada deberá:
1. Capturar esquema, constraints, índices, triggers, policies y grants.
2. Crear `app_identities`.
3. Crear tabla temporal de mapeo entre UUID histórico y Firebase UID/identidad interna, si hay datos históricos que puedan relacionarse.
4. Comprobar recuentos y valores NULL/no NULL de cada columna de autoría.
5. Añadir columnas nuevas de autoría sin eliminar las anteriores.
6. Rellenar solo registros con correspondencia demostrable; mantener sin mapear los históricos inciertos y documentarlos.
7. Validar integridad y operaciones de prueba.
8. Cambiar FK y aplicación solo tras pruebas completas.
9. Preparar rollback con las columnas originales preservadas.
10. Eliminar columnas antiguas únicamente en una fase posterior aprobada y nunca como parte de la primera migración.

## 9. Preguntas que requieren evidencia técnica, no decisión intuitiva

- ¿Third-Party Auth entrega claims Firebase a `auth.jwt()` tal como se esperan en las políticas RLS del proyecto alojado?
- ¿La función RLS puede resolver el UID Firebase a la identidad interna de forma eficiente y sin elevar privilegios?
- ¿Existen registros de `created_by` y `updated_by` en producción que necesiten correspondencia?
- ¿El trigger `handle_new_user()` se utiliza realmente en otros flujos Supabase Auth? No eliminarlo sin revisar dependencias.
- ¿Se necesita `public.users` en la UI o puede sustituirse por una proyección segura de `app_identities`?

Estas preguntas se resolverán con catálogo y datos sintéticos/anonimizados en un entorno aislado. No se deben consultar ni copiar datos personales de producción para preparar pruebas.

## 10. Límites

- Este documento no contiene una migración ejecutable.
- No se ha creado tabla ni modificado FK.
- No se ha ejecutado SQL en Supabase.
- No se han cambiado policies, grants, Storage ni triggers.
- No se han asignado claims a usuarios reales.
- No se han modificado Firebase, Firestore, Vercel ni datos de producción.
- No se ha fusionado la rama ni desplegado código.
