# Bloque 21 · LC-10004 ausente de Cargas disponibles

Fecha: 20/11/2026. Resultado: **CORREGIDO Y VERIFICADO EN LA WEB CANDIDATA**.

Destino exclusivo: `4pack-candidata`, **khtfjogqvtjuxhmzkmue**. Rama `codex/mvp-defense-close`, partida `ebdde5fab5036e795681d4366d53b6a8a56e3297`. Cambios previos ajenos preservados. Defensa, APK y pagos no modificados.

## Carga identificada y habilitación

| Dato | Carga nueva | Operador candidato |
|---|---|---|
| Referencia | **LC-10004 — INDUMENTARIA PRUEBA 1** | Empresa candidata China Argentina |
| UUID | `43d2e5b7-4667-4f6f-a1a6-99f3d0c14200` | `34d24945-1509-4c62-a705-3bcdc18df463` |
| Cuenta | Importador `18d2b021-5f3d-4a3a-b9f3-84a9bbb4add9` | `operador.candidata@4pack.demo` |
| Estado | `open`, publicada 20/11/2026; cierre 27/11/2026 | `approved` |
| Origen | **SHENZENG CHINA** | China |
| Destino | **EZEIZA ARGENTINA** | Argentina |
| Modalidad | `air` | `air`, `sea`, `consolidated` |
| Servicio | `international_transport` | `international_transport` |

Referencia del ensayo anterior: **LC-10002**, UUID `eb53d6c0-96de-4181-a39d-469916795a6b`, ruta «Shanghai, China → Buenos Aires, Argentina». No se confundió con la carga nueva.

## Causa y corrección

La función `public.route_region(text)` reconocía países/ciudades exactos o un país después de una coma. No reconocía el país separado de la ciudad únicamente por espacios. Por eso `operator_compatible` devolvía false y RLS excluía la carga, aunque país declarado, servicio y modalidad coincidían con la habilitación.

Se agregó la migración **`20261120192152_route_country_whitespace_boundary.sql`**, que acepta el país al final, delimitado por espacios o coma, sin aceptar subcadenas como Chinatown o NEWARGENTINA. No cambia el alcance autorizado ni los datos publicados. «SHENZENG» se conserva tal como lo ingresó el usuario: el criterio usa el país declarado, no verifica geográficamente ni corrige la ciudad.

No cambió ninguna política RLS ni la habilitación del operador. Las cargas de otro país, servicio o modalidad no autorizados continúan siendo incompatibles. No hizo falta desplegar otra web ni reconstruir el APK: ambos consumen la compatibilidad del backend.

## Verificación con sesión real

Se inició sesión mediante Auth con el operador candidato, usando su contraseña privada únicamente en memoria; no se utilizó service_role para comprobar la bandeja.

| Comprobación | Antes | Después |
|---|---|---|
| RPC `operator_compatible` para LC-10004 | false | **true** |
| RPC `operator_snapshot`, cargas visibles | LC-10002 | **LC-10004 y LC-10002** |
| Web publicada, sesión limpia del operador | Ausencia reproducida mediante su bandeja Auth | **LC-10004 visible con su título y ruta originales** |

URL verificada: **https://4pack-candidata-mvp.vercel.app/operador/oportunidades**.

Evidencia: [antes](evidencia/antes.json), [después y fila web](evidencia/despues.json), [captura de la web](evidencia/lc10004-visible.png).

## Pruebas y cambios

- **`npm.cmd run test:mvp`: 40 PASS**, 0 FAIL, aproximadamente 2,1 segundos. Se agregaron pruebas del formato sin coma y de compatibilidad real en PGlite para país, servicio y modalidad; se conservan los casos anteriores con coma y rechazo de coincidencias parciales.
- Archivos de código modificados: la nueva migración y `tests/mvp-nonfinancial.test.mjs`. No se alteraron migraciones anteriores.
- La migración se aplicó una vez y quedó registrada como **20261120192152**, versión asignada por Supabase. La revisión automática rechazó un intento de renombrar directamente esa entrada; no se ejecutó. Se conservó el historial remoto y se alineó el nombre del archivo local a su versión real, sin volver a aplicar SQL ni solicitar una mutación innecesaria del historial.
- No se modificaron cargas, ofertas, autorizaciones, cuentas ni saldos para hacer pasar la prueba. No se habilitaron checkouts ni se tocó el backend de defensa.

## Evidencia para la planilla

| Entregable | Evidencia disponible | URL pública verificada |
|---|---|---|
| Bandeja del operador elegible | LC-10004 visible, captura y sesión Auth real | https://4pack-candidata-mvp.vercel.app/operador/oportunidades |
| Regresión | 40 pruebas automatizadas; fuente SQL nueva | Rama codex/mvp-defense-close |

Para verlo: actualizar Cargas disponibles en la web candidata usando el operador candidato. No usar `/demo/` ni el dominio de defensa, que tienen otros entornos de datos. El circuito de pago/cierre del bloque 20 continúa pendiente y no forma parte de esta corrección.
