# Fase B — Inventario de hallazgos y decisiones pendientes

## Hallazgos confirmados por consultas de solo lectura

| Elemento | Evidencia | Riesgo / lectura |
|---|---|---|
| RLS | 13/13 tablas con RLS habilitado | Positivo, pero no basta sin políticas correctas |
| FORCE RLS | 0/13 tablas con FORCE RLS | Revisar propietarios y roles privilegiados; no activarlo indiscriminadamente |
| Privilegios SQL | anon y authenticated aparecen con SELECT/INSERT/UPDATE/DELETE en las 13 tablas | Amplía la superficie; combinar con revisión de RLS y privilegios de API |
| Políticas | 66 políticas exportadas | Varias políticas permisivas anulan controles más específicos |
| SECURITY DEFINER | public.handle_new_user, propietario postgres | Revisar search_path, EXECUTE y lógica del trigger |

## Tablas con ALL sin restricciones para anon y authenticated

Las siguientes ocho tablas tienen una política permisiva ALL con qual=true y with_check=true para roles anon y authenticated:

- anthropometrics
- attendance_sessions
- match_plans
- physical_tests
- players
- tactics
- team_matches
- team_sessions

En player_attributes existe una política equivalente ALL para authenticated. Esto puede anular las políticas más específicas porque las políticas permisivas se combinan mediante OR.

## Otras políticas relevantes

- coaches: lectura para public; operaciones de escritura para authenticated con condiciones true; hay políticas duplicadas y políticas adicionales basadas en auth.uid().
- needs: misma combinación general que coaches.
- observers: lectura para public e INSERT/DELETE para authenticated con condiciones true y duplicados.
- users: SELECT y UPDATE condicionados a auth.uid() = id. Debe protegerse especialmente la columna role.
- La exportación muestra 66 filas en total; el análisis debe conservar los nombres y expresiones exactas de pg_policies.

## Política de implementación

No escribir todavía políticas con auth.uid(): el cliente Supabase revisado se inicializa con URL y anon key y no muestra integración del JWT Firebase. Primero hay que cerrar el diseño de identidad.

## No hacer

- No copiar una migración genérica de internet.
- No conceder acceso amplio a authenticated por el mero hecho de iniciar sesión.
- No poner service_role en el frontend.
- No revocar todos los permisos sin inventario de dependencias.
- No ejecutar cambios sobre producción desde el SQL Editor durante esta fase.
