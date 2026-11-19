# Bloque 15 — Capital al ofertar y Administración aislada

Fecha: 19/11/2026, Argentina. **Estado: PARCIAL. No promover a la versión de defensa.**

## Resumen para ChatGPT Work

Se implementó y probó localmente el núcleo de reserva de capital al enviar una oferta, con transferencia a la operación sin segundo descuento. Se implementaron además las migraciones y pantallas de ampliaciones de capital y Administración. El backend pasó 16 pruebas y dos ensayos de concurrencia con conexiones PostgreSQL reales. El recorrido completo desde pantallas todavía no pasó: la última corrida visual falló al leer una pantalla en estado de carga y la repetición final no se pudo ejecutar por un límite de la revisión automática de herramientas.

La web pública, el APK de la defensa y el Supabase `4pack-seminario-final` no se modificaron en este bloque. No hubo push, merge, despliegue ni migraciones remotas.

## Rama, checkpoint y ubicación

- Base funcional solicitada: `e3ed41606e20df02c96230a202a06ebfd9898918`.
- Rama de desarrollo: `codex/capital-admin-isolated`.
- Checkpoint inicial del núcleo: `cfc9f53dfc84b880f74195b666ef7bd90cebb8c3`.
- **Hay cambios posteriores sin commit**, incluidos ajustes del núcleo, las nuevas pantallas, la segunda migración y este informe. El checkpoint `cfc9f53` por sí solo NO contiene el estado actual completo.
- Worktree separado, relativo a la raíz habitual de `4pack-v3`: `.4pack-demo/block15/worktree/4pack-v3/`.
- La rama habitual `codex/4pack-qa-readiness` se conservó en el worktree original; su último HEAD informado es `192e3203d7bdaf070fb026f2f4e0b20e1ac35711`, documental posterior al código público `e3ed416`.
- Se preservaron los ZIPs, informes anteriores, demo PGlite y archivos locales sin seguimiento del worktree original.

Para continuar hay que abrir **este worktree**, no editar la rama QA ni aplicar solamente el commit inicial. Primero revisar su `git status --short` y el diff completo.

## Entornos usados

| Entorno | Uso y alcance |
|---|---|
| PGlite en memoria | Pruebas transaccionales, permisos SQL, adjudicación, garantía simulada, cierre y evaluación. Auth/Storage son adaptadores ficticios del proyecto. |
| PostgreSQL 17.12 descartable | Dos conexiones reales a `127.0.0.1:55415`. Datos exclusivamente ficticios; no conexión remota. Binarios extraídos del ZIP oficial EDB ya descargado. |
| Web aislada | Puerto 3015, sesiones locales separadas de importador, operador y administrador; bases `environment`, `environment-v2` y `environment-v3` preservadas durante el diagnóstico del runner. |
| Supabase de la defensa | **No utilizado para escrituras ni migraciones de este bloque.** |
| Android | Se modificó el código de disponibilidad, pero no se compiló ni instaló otro APK. No se certifica el recorrido nativo nuevo. |

La última orden de arranque con `environment-v4` y la última repetición visual fueron rechazadas por la revisión automática antes de ejecutarse. **No afirmar que el servidor 3015 sigue levantado.** El servidor PostgreSQL local había arrancado correctamente; no se acredita su detención posterior.

## 1. Núcleo de capital implementado

Migración: [`20261119180708_offer_capital_reservations.sql`](../../../supabase/migrations/20261119180708_offer_capital_reservations.sql).

- `offer_capital_reservations`: reserva privada por oferta, en ARS, con estados `reserved`, `transferred` y `released`.
- `quote_command`: reserva y validación dentro de la misma transacción; si falta capital devuelve el faltante y revierte oferta y borrador.
- `offer_submission_requests`: reintentos de envío con clave y payload; no crean una segunda oferta/reserva. Un payload diferente con la misma clave se rechaza.
- `reserve_operation_capacity`: transfiere el importe respaldado a la reserva de la operación; no vuelve a restarlo del disponible.
- Retiro o rechazo de una oferta libera su reserva. Al adjudicar, las ofertas competidoras de esa carga se liberan por sus cambios de estado.
- El capital de ofertas vencidas deja de computarse inmediatamente en el disponible. La actualización material de su estado se realiza en la siguiente mutación/reconciliación; **no se agregó un cron remoto**.
- `lock_capital_market`: un mutex global previo a los locks de operador/carga evita que ofertas/adjudicaciones simultáneas comprometan el mismo capital. Es una solución conservadora para el MVP; serializa las escrituras del mercado.
- `capital_commitment` separa comprometido en ofertas y operaciones; conserva las reservas históricas desconocidas como pendientes de revisión.
- `offer_backing`: expone disponibilidad sin revelar al importador el capital privado del operador.
- `reconcile_offer_capital`: solo admin; evalúa ofertas anteriores por antigüedad, respalda las que alcanzan y deja el resto no disponible. No inventa capital ni convierte históricos.
- Se elimina el límite por cantidad en la nueva reserva/transferencia. El campo anterior `max_operations` se conserva por compatibilidad, pero no gobierna el nuevo flujo.

**Decisión que Work debe revisar:** el nuevo flujo usa el capital respaldado como criterio económico; no vuelve a aplicar los antiguos topes de precio/exposición ni los cupos operativos al transferir la reserva. El volumen sigue debiendo estar confirmado antes de adjudicar; peso y volumen se conservan como datos de las reservas.

## 2. Ampliaciones y Administración implementadas

Migración: [`20261119181203_capital_requests_admin_workbench.sql`](../../../supabase/migrations/20261119181203_capital_requests_admin_workbench.sql).

- Solicitudes de ampliación con nuevo total, documentos propios aprobados y sin reemplazo, estados, motivo y decisión administrativa.
- Aprobación por el total solicitado o uno menor, sin superar lo pedido ni reducir el total vigente mediante una aprobación desactualizada.
- Ajuste directo protegido contra reducción por debajo del capital comprometido; bloqueo si hay capital histórico no determinado.
- Postulaciones con checklist de identidad, empresa y documentos; aprobación con capital inicial, corrección o rechazo; decisiones idempotentes y auditadas.
- Gestión de reclamos con responsable, revisión, pedido de información y resolución persistida; el reintento no duplica mensajes.
- Activación individual de una identidad Auth **ya existente**, sin crear ni duplicar usuarios por SQL. Las cuentas nuevas quedan pendientes de activación para publicar; las existentes conservan acceso activo.
- `admin_workbench`: lectura administrativa protegida por rol; las tablas nuevas tienen RLS y permisos explícitos.
- Navegación: Inicio, Operadores, Capacidad, Operaciones, Reclamos, Importadores y Mi perfil. Documentos se consultan en el contexto de la empresa/solicitud/operación/reclamo.
- Filtros y fichas, fechas legibles, estados con texto y color, logo aprobado, carbón/grafito/mineral.

La invitación por correo y el login de un importador nuevo con Supabase Auth real **no están comprobados ni configurados** en un proyecto separado. El camino implementado es la activación individual de una identidad existente; la prueba de activación/publicación fue SQL local con Auth simulado.

## 3. Archivos principales

| Grupo | Archivos y símbolos |
|---|---|
| Reserva y concurrencia | Primera migración; `tests/offer-capital.test.mjs`; `scripts/test-capital-postgres.mjs`. |
| Ampliación, alta y auditoría | Segunda migración; `tests/capital-admin.test.mjs`; RPC `request_capital_increase`, `admin_review_capital`, `admin_review_operator`, `admin_manage_claim`, `admin_activate_importer`. |
| Administración web | `apps/web/src/features/admin/{types,data,actions,form,workspace}.ts[x]`; páginas de `/admin` y `/demo/admin`; `app/admin-workspace.css`; `app/admin/archivos/route.ts`. |
| Capacidad operador | `features/capacity/view.tsx`, `request-form.tsx`, `request-action.ts`, `types.ts`, `admin-data.ts`. |
| Cotización y reintentos | `features/operator/actions.ts`, `quote-composer.tsx`, `journey.ts`. |
| Importador web | `features/multirole/pages.tsx`, `app/ofertas/[cargoId]/page.tsx`. Disponibilidad sujeta al respaldo del backend. |
| Android | `apps/mobile/lib/importer-flow.ts`, `dashboard.ts`, `features/importer/views.tsx`. Consulta `offer_backing`; si falla no muestra una oferta como respaldada. Sin APK nuevo. |
| Aislamiento | `scripts/prepare-capital-demo.mjs`, `scripts/start-capital-local.ps1`, `features/operator/capital-sql.json`, `demo-runtime.mjs`, `supabase/demo/capital-admin-isolated-seed.sql`. |
| Build | `apps/web/postcss.config.mjs`, `next.config.ts`, `eslint.config.mjs`, `.gitignore`. El worktree reutiliza dependencias mediante junction; no se instalaron dependencias nuevas. |
| Prueba visual | `tests/capital-admin-browser.mjs`. |

`apps/web/next-env.d.ts` y `apps/web/tsconfig.json` también muestran cambios generados por Next durante el ensayo. Revisarlos y separarlos antes del checkpoint final. Excluir `supabase/.temp`, cachés, logs, datos y el junction de dependencias.

## 4. Pruebas ejecutadas

| Comando | Resultado observado |
|---|---|
| `node --test tests/offer-capital.test.mjs tests/capital-admin.test.mjs` | **PASS: 16/16**, aproximadamente 4 s, última salida `.capital-all.log`. |
| `node scripts/test-capital-postgres.mjs` con `FOURPACK_TEST_PG_BIN` al servidor local | **PASS: 2 escenarios con dos conexiones cada uno**. READ COMMITTED: una confirma y otra rechaza con faltante ARS 20. REPEATABLE READ: una confirma y otra recibe error de serialización. Comprometido final 60 sobre capital 100 en ambos. |
| `node --test tests/operator-delivery.test.mjs tests/operator-journey.test.mjs tests/offer-capital.test.mjs tests/capital-admin.test.mjs` | **PASS: 27/27 en una versión intermedia**, antes de agregar las dos últimas pruebas del núcleo. No presentar ese número como una ejecución final de 29 pruebas. |
| `npm.cmd run typecheck` | **PASS** en la corrida registrada, web/mobile/domain. Repetir sobre el checkpoint final aún no creado. |
| `npm.cmd run lint` | **PASS** después de excluir los artefactos `.next-*`. La primera corrida falló por analizar 249 incidencias en archivos generados, no se ocultaron errores de código fuente. |
| `npm.cmd run build:web` | **PASS**, Next 16.4.6; se generaron las rutas administrativas nuevas. No se publicó el build. |
| `node tests/capital-admin-browser.mjs` | **FAIL en la última corrida completada**; detalle a continuación. El runner fue corregido, pero la repetición final no se ejecutó. |

Las 16 pruebas finales cubren: idempotencia de envío, reserva insuficiente y rollback, transferencia sin doble descuento, reintento de adjudicación, simultaneidad en PGlite, retiro, vencimiento, oferta competidora, reconciliación anterior al cambio, privacidad/escritura directa, garantía/entrega/evaluación/liberación, alta de operador, ampliación parcial, evidencia ajena, corrección, permisos administrativos, reclamo auditado y activación individual.

La concurrencia real no se dedujo de PGlite: se ejecutó además en PostgreSQL 17.12 con procesos `psql` separados.

## 5. Resultado desde pantallas

| Paso | Resultado |
|---|---|
| Navegación administrativa de siete secciones | **PASS** local. |
| Importador/operador intentando abrir Administración | **PASS** local: redirigidos fuera del área; no certifica Auth remoto. |
| Aprobar postulante ficticio con checklist y capital inicial | **PASS** local; aprobación y auditoría visibles. |
| Publicar carga con FOB USD 1.100 | **PASS** local. |
| Enviar oferta ARS y comprobar la tarjeta de capital | **PARCIAL / corrida FAIL**: la oferta se presentó y apareció el aviso de oferta sellada, pero el runner leyó el skeleton de Capacidad antes de que llegaran los datos. |
| Comparar/adjudicar desde pantalla de importador | **NO PROBADO** en el runner final; sí pasó por SQL. |
| Ampliación parcial desde ambas pantallas | **NO PROBADO** en el runner final; sí pasó por SQL. |
| Filtrar operación y gestionar reclamo desde pantalla | **NO PROBADO** en el runner final; sí pasó el backend de gestión/auditoría. |
| Cierre/evaluación/liberación desde pantallas | **NO PROBADO** en el runner final; sí pasó por SQL. |
| Lectura/descarga de evidencia administrativa por rol | **NO PROBADO** end to end. |
| Android con backend separado | **NO PROBADO**; no hubo nuevo APK. |

Último error exacto del runner:

```text
The expression evaluated to a falsy value:
  assert.ok(body.includes('600,00'))
```

La captura correspondiente muestra el estado de carga de la página, no una tarjeta con un importe incorrecto. Se agregó `navigate()` para esperar el `h1` antes de leer datos; esa corrección **todavía debe validarse con una nueva corrida completa**. Antes hubo otros errores del runner: selectores que alcanzaban un `<meta>`, formularios desmontados tras una decisión exitosa, regiones ARIA vacías y una cotización de prueba sin documento requerido. Se corrigieron, sin afirmar que sustituyen el PASS pendiente.

No hay un UUID de operación nueva validada desde ambas interfaces que se pueda acreditar para este bloque. No inventar uno ni reutilizar OP-1026 como evidencia del nuevo modelo.

## 6. Riesgos y pendientes antes de promoción

1. **P1 — Completar el E2E visual** con datos nuevos, verificar reserva/transferencia, ampliación, reclamo, cierre y evaluación. No promover mientras falle o quede parcial.
2. **P1 — Entorno compartido con Auth/Storage reales:** falta probar estas migraciones en un Supabase separado de la defensa y conectar allí los clientes. No aplicar las migraciones nuevas a `umiracgmhjglqoftoljn` para salir del paso.
3. **P1 — Evidencia documental local:** el fixture de credencial es metadato ficticio aprobado, no una subida real completa por gateway. La ruta de lectura exige además objeto Storage vinculado; debe completarse ese fixture y comprobar descarga admin/propietario y rechazo ajeno. No afirmar que el enlace al archivo funciona por haber renderizado su nombre.
4. **P1 — Suspensiones y bandejas:** revisar la clasificación de operadores suspendidos. El filtro actual usa `approved` para Registrados y puede colocar un suspendido entre postulaciones con una etiqueta incorrecta. No permitir que el flujo de postulación se convierta en una reactivación implícita.
5. **P1 — Android:** probar `offer_backing`, errores recuperables, selección/adjudicación y seguimiento con el backend nuevo. Recién después generar un APK de esta rama; conservar el APK público de defensa.
6. **P1 — Revisión de permisos:** ejecutar advisors/controles equivalentes en el entorno separado, verificar todos los RPC nuevos, acciones, rutas y archivos por rol, incluidos accesos directos que no pasan por el menú.
7. **P2 — Vencimiento:** el cómputo libera el capital inmediatamente al vencer, pero la fila se materializa como `released` en la siguiente mutación/reconciliación. Definir el mantenimiento periódico si se necesita actualización física sin actividad.
8. **P2 — Escalabilidad:** el mutex global evita sobrecompromiso y orden inverso de locks, a costa de serializar el mercado. Mantenerlo para el MVP o sustituirlo solo con nuevas pruebas concurrentes de oferta, adjudicación y liberación competidora.
9. **P2 — Filtros/contadores administrativos:** revisar que el contador de reclamos abiertos y el enlace filtrado incluyan el mismo conjunto de estados; hoy el contador también contempla revisión/espera.
10. Crear el checkpoint final, separar archivos generados y repetir pruebas finales sobre su SHA. La migración inicial fue ajustada después de `cfc9f53`; las bases descartables usadas antes no equivalen automáticamente a su contenido actual.

## 7. Cómo continuar en local

En el worktree de este bloque, con puerto 3015 libre:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-capital-local.ps1 -Name capital-admin-revision -Port 3015
```

El script prepara un adaptador PGlite local, sin copiar credenciales Supabase, y no cierra servidores ajenos. Luego, desde otra terminal en el mismo worktree:

```powershell
node --test tests/offer-capital.test.mjs tests/capital-admin.test.mjs
node tests/capital-admin-browser.mjs
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build:web
```

El runner visual usa por defecto Chrome CDP `http://127.0.0.1:9233`; admite `FOURPACK_TEST_CDP`. Requiere una instancia local preparada. Solo admite el destino de ensayo `localhost:3015`/`127.0.0.1:3015`, no el dominio público.

Para PostgreSQL, `scripts/test-capital-postgres.mjs` exige `FOURPACK_TEST_PG_BIN`, fija loopback/puerto 55415 y crea una base ficticia nueva por ejecución. No acepta una URL remota. No incluye ni restaura datos del respaldo real.

## 8. Evidencia para la planilla

| Entregable | Evidencia disponible | URL pública verificada |
|---|---|---|
| Núcleo de reserva | Pruebas PGlite, SQL y concurrencia PostgreSQL locales | Pendiente de publicación |
| Ampliaciones/Administración | Código, 6 pruebas de backend y capturas locales parciales | Pendiente de publicación |
| E2E visual nuevo | Resultado FAIL y capturas de diagnóstico; repetición pendiente | Pendiente de publicación |
| Android nuevo | Cambios de fuente, sin APK nuevo probado | Pendiente de publicación |
| Versión de defensa anterior | No modificada por este bloque | https://seminario-final-five.vercel.app |
| Código funcional de defensa | Referencia publicada conservada; no es el código del bloque 15 | https://github.com/Yoshua95/seminario-final/commit/e3ed41606e20df02c96230a202a06ebfd9898918 |

Evidencias locales copiadas junto a este informe: [pruebas finales](evidencia/pruebas-backend.txt), [concurrencia real](evidencia/postgres-concurrencia.json), [última corrida visual](evidencia/resultado-visual.json), [pantalla de carga que causó el fallo](evidencia/fallo-capacidad.png), [alta aprobada](evidencia/alta-operador.png), [Inicio admin](evidencia/inicio-admin.png), [estado Git](evidencia/git-status.txt).

## 9. Motivo exacto de la interrupción

La revisión automática de permisos rechazó el arranque de la última corrida por límite de uso: `Automatic approval review failed: You've hit your usage limit`. El propio rechazo aclaró que la acción no se ejecutó y que no era una determinación de inseguridad. No se intentó eludirlo. El usuario pidió entonces este informe para continuar en Work.

**Recomendación a Work:** conservar la defensa, revisar el working tree de esta rama, completar primero el ensayo local fallido y los puntos P1; no presentar el bloque como cerrado ni desplegarlo por el solo hecho de que compile.
