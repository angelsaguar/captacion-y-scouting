# Fase B — Inventario de consumidores y divergencias RFFM

**Rama:** `feat/fase-b-hardening-supabase`  
**Fecha:** 24-11-2026  
**Tipo:** auditoría estática de solo lectura.  
**Alcance:** referencias encontradas en el código del frontend, handlers Vercel y rutas Express. No se han ejecutado llamadas contra producción.

## 1. Estado de CI de la auditoría anterior

El commit `157ba71987b18e9616c836953a0ecd1fafc790cc` ha superado el workflow **Fase B security checks**, ejecución [45400143367](https://github.com/angelsaguar/captacion-y-scouting/actions/runs/45400143367).

- Tests de seguridad: correctos.
- Validación TypeScript: correcta.
- Build de producción: correcto.

## 2. Matriz de llamadas localizadas

| Ruta | Consumidor frontend localizado | Autorización en servidor |
|---|---|---|
| `/api/rffm/clasificacion` | `src/services/rffmSyncService.ts` | Vercel: helper compartido Firebase. Express: `requireClubAuth`. |
| `/api/rffm/resultados` | `src/services/rffmSyncService.ts` | Vercel: helper compartido Firebase. Express: `requireClubAuth`. |
| `/api/rffm/sync-actas-detailed` | `src/lib/actasArbitrales.ts` | Vercel: helper compartido Firebase. Express: `requireClubAuth`. |
| `/api/rffm/extract-calendar` | No se ha localizado llamada directa en los archivos frontend inspeccionados | Vercel y Express tienen handlers protegidos. |
| `/api/rffm/acta-detail` | No se ha localizado llamada directa en los archivos frontend inspeccionados | Vercel y Express tienen handlers protegidos. |

La llamada de sincronización de actas del frontend usa `getAuthBearerHeaders()` y envía el token Firebase. Las llamadas de clasificación y resultados también utilizan ese helper.

La ausencia de referencias directas en los archivos inspeccionados no demuestra que las dos rutas sin consumidor localizado carezcan de clientes externos, llamadas dinámicas o integraciones. No se deben retirar ni cambiar sus contratos por esta observación.

## 3. Divergencia confirmada: codacta

- Vercel `api/rffm/acta-detail.ts` utiliza `validateRffmActaCode()`, que acepta entre 1 y 40 caracteres alfanuméricos, guion o guion bajo.
- Express `server.ts` exige entre 1 y 12 dígitos.
- Los códigos de acta incluidos en los datos de referencia inspeccionados son numéricos de 7 dígitos (por ejemplo, `5649869` y `5649895`).

La muestra observada es compatible con la validación estricta de Express, pero no basta para demostrar que todos los códigos oficiales futuros o históricos deban ser exclusivamente numéricos. Por tanto, no se modifica todavía el validador compartido ni el contrato de la ruta.

## 4. Duplicidad de implementación

Hay lógica RFFM en dos superficies:
- Handlers independientes bajo `api/rffm/`, desplegables como funciones Vercel.
- Rutas Express equivalentes en `server.ts`, con sus propios middlewares y limitadores.

Las rutas Express pasan por `requireClubAuth`; las funciones Vercel verifican mediante `src/server/clubAuth.ts`. La autorización ya se ha centralizado como helper compartido para los handlers Vercel, pero el flujo de negocio y algunas validaciones permanecen duplicados.

No se ha establecido todavía, solo con la inspección estática, qué superficie recibe cada petición en cada entorno. No se elimina ninguna ruta ni se cambia el enrutamiento.

## 5. Decisiones técnicas pendientes

1. Confirmar el contrato oficial de `codacta` antes de unificar su expresión de validación.
2. Determinar si las rutas Express y Vercel son ambas necesarias en los entornos soportados.
3. Si ambas deben mantenerse, extraer validadores puros comunes para parámetros y métodos HTTP, con pruebas de compatibilidad.
4. Mantener la autorización en cada punto de entrada servidor; no confiar en CORS ni en el envío del token por parte del frontend.
5. No retirar `extract-calendar` ni `acta-detail` hasta confirmar que no existen consumidores externos.

## 6. Alcance y restricciones

No se han modificado handlers, frontend, Firebase, Vercel, Supabase, datos, políticas RLS ni grants. No se han consultado ni mostrado secretos. No se ha desplegado a producción.
