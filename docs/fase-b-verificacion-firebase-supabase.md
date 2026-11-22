# Verificación de integración Firebase Auth → Supabase

## Objetivo
Confirmar la configuración de identidad antes de modificar el cliente Supabase o las políticas RLS. Este documento es una guía de verificación; no ejecuta cambios en Firebase ni Supabase.

## Evidencia del repositorio
En `firebase-applet-config.json` de esta rama aparece el proyecto Firebase:

- Project ID: `gen-lang-client-0091658680`
- Auth domain: `gen-lang-client-0091658680.firebaseapp.com`

Este valor procede de la configuración versionada del repositorio. **No debe darse por hecho que es el proyecto Firebase que autentica la aplicación Vercel de producción**. Hay que contrastarlo con Firebase Console y con la configuración de despliegue de cada entorno.

La configuración de Supabase del repositorio usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. No se deben copiar claves ni tokens a este documento, a GitHub ni al chat.

## Verificación manual en el Dashboard de Supabase
En el proyecto Supabase correcto:

1. Abrir **Authentication → Third-Party Auth**.
2. Comprobar si aparece un proveedor **Firebase**.
3. Si no aparece, no añadirlo todavía. Primero confirmar el Project ID de Firebase que usa producción.
4. Si aparece, comprobar que el Project ID coincide exactamente con el proyecto Firebase esperado.
5. Anotar únicamente el estado (configurado/no configurado) y el Project ID. No compartir tokens, claves privadas ni secretos.

La documentación oficial vigente indica que Firebase se registra como proveedor de terceros desde Authentication → Third-Party Auth y que el cliente web entrega el Firebase ID token mediante la opción `accessToken`. También requiere que el JWT incluya el claim `role: authenticated`; los tokens Firebase por defecto no incluyen ese claim. Referencia: https://supabase.com/docs/guides/auth/third-party/firebase-auth

## Verificación en Firebase Console
En el proyecto Firebase que realmente utiliza producción:

1. Abrir Project settings → General y comprobar el **Project ID**.
2. Confirmar que Authentication está habilitado y que los usuarios de la aplicación pertenecen a ese proyecto.
3. Verificar si ya existe una solución de Cloud Functions / Identity Platform que asigne el custom claim `role: authenticated`.
4. No desplegar funciones ni cambiar claims de usuarios durante esta verificación.

## Requisitos antes de cambiar código
No implementar todavía `accessToken` en `src/lib/supabase.ts` hasta confirmar:

- Firebase Project ID de producción y de Preview/pruebas.
- Integración Firebase registrada en el proyecto Supabase correcto.
- Estrategia fiable para asignar `role: authenticated` a usuarios existentes y futuros.
- Qué claims se utilizarán para distinguir admin y scout; el claim `role: authenticated` solo selecciona el rol PostgreSQL, no sustituye los permisos de negocio.
- Políticas RLS por tabla, basadas en claims verificados y en una identidad estable.
- Separación de las operaciones seed/limpieza de `syncJugadorasToDatabaseAndLocalStorage()` del inicio de sesión normal.

## Precaución específica sobre Firebase
La integración oficial permite confiar en tokens Firebase de un proyecto registrado. La autorización de cada usuario sigue dependiendo de RLS. No convertir el rol local del frontend (`admin`/ `scout`) en un permiso de base de datos sin validarlo desde claims confiables o desde un backend.

## Pruebas posteriores, en entorno aislado
Cuando la configuración esté confirmada, preparar pruebas para:
- token ausente o expirado;
- usuario Firebase autenticado sin claim `role`;
- scout y administrador;
- acceso cruzado entre usuarios;
- SELECT, INSERT, UPDATE y DELETE por tabla;
- operaciones de Storage si se utilizan;
- seed/limpieza y sincronización.

## Límites
- No ejecutar SQL ni cambiar RLS, privilegios, triggers o funciones en producción.
- No modificar datos de producción.
- No añadir secretos a VITE_* ni al navegador.
- No fusionar a `main` ni desplegar producción.
