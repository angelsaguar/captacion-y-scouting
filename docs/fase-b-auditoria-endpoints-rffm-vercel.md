# Fase B — Auditoría de endpoints RFFM desplegables en Vercel

**Rama:** `feat/fase-b-hardening-supabase`  
**Tipo de revisión:** estática, solo lectura.  
**Fecha:** 24-11-2026.  
**Alcance:** funciones `api/rffm/*.ts` inspeccionadas en esta rama. No se han realizado peticiones de prueba contra producción ni cambios de código, configuración o base de datos.

## 1. Resultado ejecutivo

Se han revisado los cinco endpoints RFFM:

- `acta-detail.ts`
- `clasificacion.ts`
- `resultados.ts`
- `extract-calendar.ts`
- `sync-actas-detailed.ts`

**Hallazgo principal: ninguno implementa autenticación Firebase ni autorización por rol/módulo dentro de su propio handler.** Todos aceptan solicitudes sin comprobar un token Firebase. Los cinco configuran CORS con `Access-Control-Allow-Origin: *`.

Esto es distinto de las rutas RFFM equivalentes definidas en `server.ts`, que sí pasan por `requireClubAuth(["estadisticas-rivales", "gestion-equipo"])`. La protección del middleware Express no se hereda automáticamente en las funciones independientes de Vercel.

## 2. Matriz de endpoints

| Endpoint | Métodos observados | Autenticación en handler | Limitación de frecuencia local |
|---|---|---|---|
| `GET /api/rffm/acta-detail` | GET y OPTIONS por CORS; no valida método explícitamente | No | No observada |
| `GET /api/rffm/clasificacion` | GET y OPTIONS por CORS; no valida método explícitamente | No | No observada |
| `GET /api/rffm/resultados` | GET y OPTIONS por CORS; no valida método explícitamente | No | No observada |
| `/api/rffm/extract-calendar` | GET, POST, OPTIONS | No | No observada |
| `/api/rffm/sync-actas-detailed` | GET, POST, OPTIONS | No | No observada |

La indicación de métodos en CORS no equivale a una validación del método HTTP en el servidor. En particular, los handlers simples no rechazan explícitamente métodos distintos de GET/OPTIONS.

## 3. Observaciones por archivo

### 3.1 acta-detail.ts

- Acepta `codacta` desde query string.
- Comprueba que el parámetro no esté vacío, pero en el archivo inspeccionado no aplica una validación numérica estricta.
- Consulta la URL de acta de la RFFM y devuelve los datos extraídos.
- No verifica `Authorization: Bearer`, token Firebase, UID, rol o módulo.
- No se observa limitador de frecuencia.

### 3.2 clasificacion.ts y resultados.ts

- Reciben temporada, competición, grupo y tipo de juego por query string.
- Utilizan valores predeterminados si faltan parámetros.
- Consultan páginas de la RFFM y extraen datos de `__NEXT_DATA__`.
- No verifican autenticación ni permisos.
- No se observa limitador de frecuencia ni validación estricta de los identificadores.

### 3.3 extract-calendar.ts

- Acepta GET y POST.
- Obtiene URL y parámetros de calendario desde body o query.
- Extrae clasificación, calendario y resultados; puede efectuar múltiples consultas adicionales a la RFFM para completar jornadas.
- No verifica autenticación Firebase, UID, rol ni módulo.
- CORS permite cualquier origen.
- No se observa limitador de frecuencia en el handler.

### 3.4 sync-actas-detailed.ts

- Acepta GET y POST.
- Recibe URL/parámetros de competición y equipo desde body o query.
- Recorre calendario y resultados, y puede realizar múltiples consultas a la RFFM para procesar actas.
- No verifica autenticación Firebase, UID, rol ni módulo.
- CORS permite cualquier origen.
- No se observa limitador de frecuencia en el handler.
- Por su volumen potencial de consultas, es el endpoint que requiere mayor prioridad de protección operativa.

## 4. Riesgos y prioridades

| Prioridad | Hallazgo | Motivo |
|---|---|---|
| Crítica | Endpoints sin autenticación ni autorización | Cualquier cliente que alcance la URL puede intentar invocarlos; no se aplica la política de cuentas/módulos del proyecto. |
| Alta | Sin limitación de frecuencia visible | Riesgo de abuso, consumo de recursos y exceso de consultas a la RFFM. |
| Alta | Extracción y sincronización realizan varias consultas externas | Especialmente relevante para `extract-calendar` y `sync-actas-detailed`. |
| Media | CORS con origen comodín | No sustituye autenticación. Un cliente no navegador también puede llamar al endpoint. |
| Media | Validación de parámetros desigual | Los identificadores deben validarse y acotarse antes de construir URLs externas. |
| Media | Métodos HTTP no restringidos de forma uniforme | Conviene aceptar solo los métodos funcionalmente necesarios y rechazar el resto con 405. |

**Importante:** esta auditoría identifica exposición potencial por ausencia de controles en el código. No demuestra que haya existido explotación ni cuantifica tráfico real.

## 5. Arquitectura de corrección recomendada

Aplicar un mecanismo común en las funciones Vercel:

1. Leer el encabezado `Authorization: Bearer <Firebase ID token>`.
2. Verificar criptográficamente el token con Firebase Admin.
3. Comprobar proyecto/audience, correo verificado y UID.
4. Aplicar la política de identidad del proyecto: administrador autorizado o cuenta scout vinculada al UID y activa.
5. Comprobar que la cuenta tiene habilitado el módulo correspondiente, en este caso `estadisticas-rivales` o `gestion-equipo`, según la función y su uso real.
6. Aplicar rate limiting y límites de tamaño/tiempo de ejecución.
7. Validar estrictamente parámetros y métodos HTTP.
8. Mantener los secretos exclusivamente en variables servidor; nunca en variables `VITE_` ni en el bundle del navegador.

La verificación y autorización deben residir en cada función o en un módulo compartido importado por ellas. No basta con proteger rutas equivalentes en `server.ts`.

## 6. Bloqueos antes de modificar

- Confirmar cómo llama el frontend a cada endpoint y qué token Firebase envía actualmente.
- Confirmar que las funciones Vercel pueden inicializar Firebase Admin en producción con credenciales de entorno disponibles. No se deben solicitar ni copiar valores secretos.
- Definir los permisos exactos de cada endpoint y si hay alguna función que deba ser pública deliberadamente.
- Revisar el uso de estas funciones antes de restringir métodos o cambiar respuestas, para no romper la aplicación.

## 7. Alcance y seguridad de esta revisión

Esta revisión es estática y se limita al código de la rama indicada. No se han ejecutado pruebas dinámicas, no se ha accedido a secretos de Vercel, no se ha modificado producción, no se han cambiado políticas RLS ni grants, y no se ha ejecutado SQL.

**Decisión:** no desplegar correcciones todavía. Completar primero el inventario de llamadas del frontend y el diseño de autorización común; después preparar cambios en esta rama y validarlos mediante pruebas antes de cualquier despliegue.


## 8. Revisión de llamadas desde el frontend

Se inspeccionaron `src/lib/clubAccessAndSync.ts`, `src/services/rffmSyncService.ts` y `src/lib/actasArbitrales.ts`.

### 8.1 Mecanismo común disponible

`getAuthBearerHeaders()` obtiene el Firebase ID token del usuario actual mediante `auth.currentUser.getIdToken()` y lo incorpora como `Authorization: Bearer ...`. Si no hay usuario autenticado o falla la obtención del token, captura el error y devuelve igualmente los headers sin Authorization. Por ello, el helper no fuerza por sí mismo que la petición se cancele cuando no existe token.

### 8.2 Llamadas identificadas

- `src/services/rffmSyncService.ts` llama a `/api/rffm/clasificacion` y `/api/rffm/resultados` pasando los headers del helper.
- `src/lib/actasArbitrales.ts` llama a `/api/rffm/sync-actas-detailed` mediante POST y pasa los headers del helper.

Esto indica que el frontend ya intenta enviar el token en estas tres llamadas, pero los handlers correspondientes no lo verifican. Mientras el endpoint no lo compruebe, enviar el token no constituye una barrera de seguridad.

En la revisión de los archivos y referencias inspeccionados no se localizó una llamada directa a `/api/rffm/extract-calendar` ni a `/api/rffm/acta-detail`. No se concluye que no existan en toda la aplicación: debe completarse la búsqueda global de referencias y comprobar posibles llamadas indirectas o dinámicas.

### 8.3 Consecuencia para la corrección

- Los tres flujos identificados pueden conservar el envío del token y añadir verificación obligatoria en el servidor.
- El helper del frontend debería ofrecer un modo obligatorio que lance un error si no hay usuario/token, evitando llamadas sin credencial por error.
- El control decisivo debe permanecer en el servidor: nunca confiar en que el frontend haya enviado un token.
- Antes de proteger o retirar endpoints no localizados en el frontend, confirmar si los usa alguna pantalla, integración o cliente externo.
