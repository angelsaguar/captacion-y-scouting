# Fase B — Evaluación de revocación de Firebase ID tokens

**Rama:** `feat/fase-b-hardening-supabase`  
**Fecha:** 24-11-2026  
**Tipo:** análisis estático y propuesta; no modifica código ni configuración.

## 1. Estado de validación previo

El inventario de consumidores RFFM del commit `5c91e3596f60c39c5d33150756aeebd95b8ca9e6` ha superado el workflow [45400527785](https://github.com/angelsaguar/captacion-y-scouting/actions/runs/45400527785): tests de seguridad, TypeScript y build de producción correctos.

## 2. Situación observada

Se han localizado dos puntos de verificación de Firebase ID tokens:

- `src/server/clubAuth.ts`, función `authorizeClubRequest()`, línea de código revisada: `getAuth().verifyIdToken(token)`.
- `server.ts`, middleware `requireClubAuth()`, línea revisada: `getAuth().verifyIdToken(idToken)`.

Ambos verifican el token sin solicitar comprobación de revocación. El mismo patrón se aplica a las rutas Express y a los handlers Vercel que utilizan el helper compartido.

## 3. Qué cubre cada modalidad

### Verificación estándar (actual)

La verificación estándar valida la firma y las condiciones temporales del ID token, entre otras comprobaciones criptográficas. No consulta por defecto si el token fue revocado después de emitirse ni si la cuenta fue deshabilitada posteriormente.

Consecuencia: una sesión previamente emitida podría seguir siendo aceptada hasta su expiración, aunque se haya revocado o deshabilitado la cuenta, siempre que el token siga siendo criptográficamente válido.

### Verificación con revocación

Firebase Admin permite solicitar comprobación de revocación mediante el segundo argumento de `verifyIdToken(token, true)`.

Ventaja:
- Permite rechazar tokens revocados y cuentas deshabilitadas antes de autorizar una operación protegida.

Costes y efectos:
- Añade una comprobación contra el servicio de autenticación de Firebase y, por tanto, latencia y dependencia de disponibilidad.
- Puede aumentar el número de consultas y el coste operativo asociado al uso del servicio.
- Los errores deben clasificarse cuidadosamente: un token revocado o una cuenta deshabilitada no son lo mismo que un fallo transitorio de red o del servicio.

## 4. Riesgos de cambiarlo de forma mecánica

En el helper Vercel, cualquier excepción de `verifyIdToken` se convierte actualmente en respuesta 401. En Express, el bloque general de error también termina devolviendo 401.

Si se activa la comprobación de revocación sin distinguir errores:
- Un token realmente revocado debe rechazarse como no autenticado (401).
- Una cuenta deshabilitada debe rechazarse como no autenticada (401).
- Un fallo temporal al consultar Firebase podría presentarse incorrectamente como sesión inválida, provocando cierres de sesión aparentes y dificultando el diagnóstico.

La política de error debe ser coherente en ambos puntos de entrada. No se debe convertir un fallo de infraestructura en autorización concedida.

## 5. Alternativas

| Opción | Comportamiento | Ventaja | Inconveniente |
|---|---|---|---|
| A. Mantener verificación estándar | Firma y expiración; no consulta revocación en cada petición | Menor latencia y dependencia externa | La revocación puede tardar hasta la expiración del ID token en surtir efecto para estas rutas |
| B. Comprobar revocación en todas las rutas protegidas | `verifyIdToken(token, true)` en Express y Vercel | Política uniforme y revocación más inmediata | Más latencia y consultas a Firebase; requiere clasificar errores |
| C. Comprobación selectiva | Revocación en operaciones administrativas/sensibles y estándar en lecturas de bajo riesgo | Equilibra seguridad y rendimiento | Mayor complejidad y riesgo de políticas inconsistentes |

## 6. Recomendación técnica

Para una aplicación con dos cuentas autorizadas y endpoints administrativos, la opción más sólida desde el punto de vista de seguridad es **B: comprobación de revocación uniforme en todos los endpoints protegidos**, siempre que se implemente junto con:

1. Una función común de verificación que use `verifyIdToken(token, true)`.
2. Clasificación explícita de errores de token revocado, usuario deshabilitado o inexistente como 401.
3. Tratamiento de fallos transitorios del servicio de autenticación como error temporal (503), sin permitir el acceso.
4. Pruebas unitarias que cubran token válido, expirado, revocado, usuario deshabilitado y fallo del servicio.
5. Aplicación coherente tanto en Express como en Vercel.

La opción C puede ser válida si se define una matriz de sensibilidad por endpoint, pero no se recomienda improvisar excepciones en esta fase.

## 7. Cambios que NO se han realizado

- No se ha cambiado ninguna llamada a `verifyIdToken`.
- No se han modificado middlewares ni endpoints.
- No se ha cambiado configuración Firebase o Vercel.
- No se han consultado ni solicitado credenciales.
- No se ha modificado Supabase, RLS, grants o datos.
- No se ha desplegado a producción.

## 8. Punto de decisión antes de implementar

La propuesta es activar la comprobación de revocación de forma uniforme en los dos puntos de entrada, con clasificación de errores y pruebas. La implementación debe hacerse primero en esta rama, pasar CI y permanecer sin desplegar hasta autorización expresa.
