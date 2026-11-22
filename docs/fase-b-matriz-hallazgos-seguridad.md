# Fase B — Inventario de hallazgos y decisiones pendientes

## Hallazgos confirmados por consultas de solo lectura

| Elemento | Evidencia | Riesgo / lectura |
|---|---|---|
| RLS | 13/13 tablas con RLS habilitado | Positivo, pero no basta sin políticas correctas |
| FORCE RLS | 0/13 tablas con FORCE RLS | Revisar propietarios y roles privilegiados; no activarlo indiscriminadamente |
| Privilegios SQL | anon y authenticated aparecen con SELECT/INSERT/UPDATE/DELETE en las 13 tablas | Amplía la superficie; combinar con revisión de RLS y privilegios de API |
| Políticas | 66 políticas exportadas; varias permisivas con ALL y condiciones true | Riesgo crítico si el rol puede alcanzar esas tablas por API |
| SECURITY DEFINER | public.handle_new_user, propietario postgres | Revisar search_path, EXECUTE y lógica del trigger |

## Política de implementación

No escribir todavía políticas con auth.uid(): el cliente Supabase revisado se inicializa con URL y anon key y no muestra integración del JWT Firebase. Primero hay que cerrar el diseño de identidad.

## Tablas que requieren reconciliación de nombres

El catálogo mostrado por Supabase contiene nombres traducidos o recortados (por ejemplo, antropometría, sesiones_de_asistencia..., Pruebas físicas). Los esquemas del repositorio contienen además nombres como players, attendance_sessions, match_plans y team_sessions. No asumir equivalencia hasta obtener el nombre SQL exacto y su definición actual.

## No hacer
- No copiar una migración genérica de internet.
- No conceder acceso amplio a authenticated por el mero hecho de iniciar sesión.
- No poner service_role en el frontend.
- No revocar todos los permisos sin inventario de dependencias.
- No ejecutar cambios sobre producción desde el SQL Editor durante esta fase.