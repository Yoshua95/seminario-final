# 4PACK 3.0 — Etapa 2B: Capacity

Fecha: 2026-11-15. Implementación y verificación exclusivamente locales.

## 1. Resultado y alcance

Capacity quedó integrada a la adjudicación por licitación: PostgreSQL valida las dimensiones y crea la reserva dentro de la misma transacción que crea la operación. Un rechazo revierte también ofertas, carga, snapshot y garantía. El operador consulta su capacidad; administración configura límites, registra revisiones y consulta la auditoría.

Resultado final: **89 pruebas automatizadas y 21 recorridos de navegador aprobados**, typecheck, lint sin autofix, build web, export Android, contrato y sincronización SQL aprobados. No se certifica concurrencia multiconexión con PGlite.

No se implementaron contratación directa, recontratación, pagos por tramos ni controversias completas. Los valores de origen `direct` y `rehire` preparan únicamente el modelo y la función interna de reserva. No existen nuevas rutas de contratación para esos orígenes.

## 2. Checkpoint local aprobado de Etapa 2A

- Rama: `codex/4pack-qa-readiness`.
- Base indicada por el usuario: `ca1367319f593f6ce872077ba3d68d3202ab6237`.
- Commit creado: **`1e34d82a4badddeb56cd2b54d418c57cf65c1ad7`**.
- Mensaje: `chore(4pack): checkpoint local aprobado de etapa 2A`.
- Identidad técnica del commit: `Codex <codex@localhost>`, configurada solamente para ese comando.
- Se revisaron e incluyeron 43 archivos de 2A: 22 existentes modificados y 21 nuevos. El árbol del proyecto quedó limpio inmediatamente después del checkpoint.
- Se excluyeron secretos, `.env` reales, caches, builds, logs, capturas, bases temporales, `.4pack-demo`, APK/AAB y `debug.keystore`. No hubo hallazgos en el escaneo de secretos de los candidatos al commit. Las fuentes, lockfile y migraciones de 2A quedaron versionados.

El repositorio Git tiene su raíz en el directorio padre `4PACK`; el proyecto está en su subdirectorio `4pack-v3`. Para recuperar las fuentes de 2A en otro árbol sin descartar el trabajo actual, ejecutar desde la raíz de `4pack-v3`:

```powershell
git -C .. worktree add --detach ..\4PACK-2A-recovery 1e34d82a4badddeb56cd2b54d418c57cf65c1ad7
```

El proyecto recuperado estará dentro de `4PACK-2A-recovery\4pack-v3`. Este comando de recuperación **no se ejecutó**. No usar un reset destructivo para recuperar 2A sin preservar previamente los archivos nuevos y modificados de 2B. Volver a fuentes anteriores no revierte una base de datos migrada: esa recuperación requiere una copia previa de la base o una base local nueva.

## 3. Migraciones y modelo

Las migraciones **0001–0019 permanecen intactas** respecto del checkpoint. Se agregan, en este orden:

| Migración | Contenido |
| --- | --- |
| `0020_capacity_model.sql` | Límites, mutex, reservas, eventos, decisiones terminales, RLS, backfill, consulta privada, configuración administrativa y revisión histórica. |
| `0021_capacity_quote_contract.sql` | Capital estimado obligatorio en nuevas propuestas y validación de moneda; conserva el versionado de 2A; unifica el orden de bloqueo del comando de cotizaciones. |
| `0022_capacity_workflows.sql` | Reserva/liberación internas, triggers transaccionales, integración con award, garantía, transiciones y cierre administrativo documentado. |

Estas tres migraciones están creadas localmente, todavía sin commit de 2B. Se ejecutaron contra bases locales PGlite de prueba; **no contra Supabase remoto**.

### Límites

- `operator_capacity_limits`: una fila por operador; máximo global de operaciones simultáneas, peso y volumen opcionales, estado y vigencia operativa, administrador, fecha de aprobación, motivo y timestamps.
- `operator_capacity_currency_limits`: una fila por operador y moneda; precio máximo por operación, exposición máxima, capital declarado y capital aprobado, estado y vigencia de esa moneda, administrador, fecha, motivo y timestamps.
- `operator_capacity_mutex`: fila privada con revisión incremental. Proporciona conflicto de escritura además del bloqueo para impedir decisiones basadas en snapshots antiguos a niveles REPEATABLE READ/SERIALIZABLE. Una transacción concurrente abortada debe reintentarse.

USD y ARS son independientes, sin conversión ni suma entre monedas. La exposición es el precio contractual del servicio, no FOB ni valor de mercadería. La cantidad, el peso y el volumen son globales entre monedas. `null` en peso/volumen significa sin límite administrativo; cero es un límite real. Capital aprobado no puede superar capital declarado. No se crean límites económicos automáticamente para operadores reales.

El estado y la vigencia globales son independientes de los de cada moneda. La interfaz envía ambos explícitamente. Para compatibilidad de los fixtures/API, si faltan las claves `operational_*`, la configuración global toma los valores de estado/vigencia del payload de moneda. Cambiar de moneda no debe confundirse con aprobar documentalmente al operador.

### Reservas y eventos

`operation_capacity_reservations` conserva operación, operador, origen, moneda, exposición, capital requerido, peso, volumen, estado, fechas de reserva/activación/liberación, motivo y clave idempotente. La PK es la operación; la clave idempotente también es única.

Estados: `reserved`, `active`, `released`, `requires_review`. El consumo suma las reservas no liberadas; las liberadas permanecen como historial. `capacity_events` registra reserva, activación, liberación, configuración antes/después, revisión histórica y decisión terminal con actor, motivo y clave única. `capacity_terminal_decisions` conserva consecuencias contractuales y estado de la garantía al cancelar/fallar.

No hay contador financiero editable por clientes. `capacity_usage` calcula el consumo desde las reservas bajo la serialización del operador. Las vistas no presentan disponibilidad negativa; la administración no puede reducir límites por debajo del consumo activo. Una capacidad desactivada/vencida conserva su consumo y bloquea reservas nuevas.

## 4. Adjudicación, transacción, concurrencia e idempotencia

`award_offer` verifica el importador y su carga, bloquea al operador antes de entrar al flujo de 2A y conserva las comprobaciones de oferta, vencimiento, estado, habilitación y unicidad de operación por carga. El trigger `capacity_reserve` invoca `reserve_operation_capacity` después de insertar la operación y dentro de esa misma transacción.

La función valida: configuración aprobada y vigente, operador aprobado, precio por operación, exposición acumulada de su moneda, capital acumulado de su moneda, cantidad global, peso agregado, volumen agregado y ausencia de reservas históricas sin revisar. No confía en totales enviados por el navegador. La falta de capacidad devuelve:

> El operador no dispone actualmente de capacidad suficiente para asumir esta operación.

`AwardOfferButton` muestra exclusivamente ese mensaje cuando coincide con la excepción esperada; otros errores mantienen un mensaje general. No imprime el error SQL arbitrario ni los límites privados.

Orden compartido de bloqueo de las APIs afectadas:

1. `operator_profiles` del operador, `FOR UPDATE`.
2. Escritura en su mutex.
3. Límite global y filas de moneda en orden de código de moneda.
4. Filas de carga/oferta/operación/reserva del flujo correspondiente.

`quote_command`, `transition_operation` y `simulate_guarantee` toman el bloqueo del operador antes de entrar en las funciones anteriores. Esto evita invertir operador/carga u operador/operación, incluidas las referencias FK de borradores y las activaciones por garantía. Las implementaciones anteriores renombradas quedan revocadas a `public` y `authenticated`, sin atajos RPC para saltear Capacity.

El reintento de la misma adjudicación devuelve la operación existente sin duplicar ni volver a reservar. Incluso después de liberar, reintentar award no reactiva la reserva. Otro ganador para la misma carga sigue rechazándose. Las escrituras directas con privilegios de propietario/service role están fuera del contrato de clientes y requieren disciplina operativa.

**Límite de la evidencia:** PGlite serializa transacciones. `Promise.allSettled` verifica peticiones encoladas, rollback e invariantes, pero no reproduce múltiples conexiones, contención real, deadlocks, aislamiento de PostgREST ni retries de serialización. Los bloqueos, restricciones únicas y mutex se implementaron y revisaron; no se afirma que exista una prueba multiconexión exitosa. Ese ensayo sigue siendo requisito previo al uso remoto con tráfico concurrente.

## 5. Activación y liberación

| Situación | Regla |
| --- | --- |
| Creada por adjudicación | Reserva inmediata; consume desde `reserved`. |
| Confirmada por garantía simulada | Pasa a `active`, fecha/evento una sola vez. No duplica consumo. |
| `in_progress`, `awaiting_delivery_confirmation`, `incident`, `disputed` | Continúa ocupando capacidad. La disputa no libera. |
| `completed` | La transición canónica autorizada libera automáticamente, conservando el cierre financiero simulado existente. |
| `cancelled` | Solo mediante cierre con consecuencias registradas por administración; se mantienen las transiciones canónicas desde created/confirmed. |
| `failed` | Solo administración, desde incident, con motivo y consecuencias registradas. |
| Reintento de liberación | Devuelve la reserva existente; no altera otra vez consumo ni duplica el evento `release:<operation>`. |
| Suspensión/estado pendiente | Impide una nueva adjudicación; no elimina reservas existentes. |

`admin_capacity_terminal_transition` registra las consecuencias en la misma transacción que realiza la transición. Si la transición es inválida, se revierte también la decisión. Una garantía `held_simulated` queda registrada como `simulated_hold_pending_admin_review`: liberar capacidad **no reembolsa ni libera fondos automáticamente**. Esto es un cierre administrativo mínimo, no un sistema completo de controversias o liquidación contractual.

## 6. Cotizaciones y contratos históricos

`NormalizedQuote` agrega `working_capital_amount` y `working_capital_currency`. Son opcionales/nullable en el tipo de lectura para representar datos históricos; `validateQuote` y SQL los exigen en nuevas presentaciones. Se usan importes decimales como cadenas con hasta dos decimales, valor no negativo y la misma moneda contractual.

Regla explícita de esta etapa: **el capital estimado no puede superar el precio contractual**. No se permite superar ese valor con una advertencia silenciosa. El operador declara una estimación; no acredita fondos ni cambia sus límites aprobados.

Se puede guardar/modificar en borrador; al presentar queda sellado y el reemplazo crea otra revisión sin alterar la anterior. El snapshot contractual conserva los dos campos. Ningún límite total aprobado se copia a la oferta. El formulario muestra el impacto estimado de precio, capital, cantidad, peso y volumen, advierte posibles excesos y aclara que no reserva: la disponibilidad se confirma al adjudicar.

Las propuestas históricas no reciben cero por defecto. Los contratos activos anteriores generan reservas `requires_review`, con exposición/peso/volumen conocidos y capital `null`. Las completadas/canceladas/fallidas no se incorporan como consumo activo. El administrador debe declarar el capital con motivo; después puede aprobar límites que cubran el consumo. Revisar la reserva histórica no inventa ni reescribe la cotización o el snapshot histórico.

## 7. Interfaces y permisos

- Operador: `/operador/capacidad` y `/demo/operador/capacidad`. Muestra estado/vigencias, máximos, consumo y disponible por moneda, capital declarado/aprobado/requerido, operaciones/peso/volumen, reservas, enlaces a operaciones e historial. Sin formulario de edición de límites. Pendientes/suspendidos pueden consultar su capacidad aunque el acceso operativo siga bloqueado.
- Administrador: `/admin/capacidad`. Busca empresa, muestra empresa/verificación, configura USD/ARS y dimensión operativa global con motivo, estado/vigencias independientes, consumo, reservas, eventos y formularios de revisión histórica/cierre autorizado. Enlaces desde el panel y navegación administrativos.
- Demo administrativa: `/demo/admin/capacidad`, identidad administrativa fija **simulada**, permitida únicamente por la misma barrera de entorno local/Preview de la demo. No usa credenciales administrativas remotas ni habilita este acceso en producción.
- Importador/competidor: no reciben snapshots ni filas de capacidad ajenas. No se agregan límites, exposición total, reservas de terceros o motivos administrativos a directorios/perfiles públicos/ofertas.
- RLS de las tablas de negocio: SELECT del propietario operador o administrador. INSERT/UPDATE/DELETE revocados a `authenticated`, incluso administrador; las mutaciones pasan por RPC con comprobación de rol. El mutex es totalmente privado. La sesión administrativa también se comprueba en servidor antes de llamar a Supabase.
- Aprobación de documentos y aprobación de capacidad siguen siendo decisiones distintas. Un administrador no puede configurar a un usuario cuyo rol no sea operador.

Mobile mantiene el contrato de estados y acciones de importador de la etapa anterior. No se agregó un panel de capacidad privado al importador ni se rehabilitó el flujo antiguo de ofertas desde mobile. La exportación no equivale a una prueba de dispositivo ni a un APK/AAB firmado.

## 8. Demo, datos y sincronización

`supabase/demo/stage2b-capacity-seed.sql` contiene exclusivamente límites ficticios para las dos cuentas de operador aprobadas de demo y una revisión ficticia explícita del capital de la operación activa histórica. No asigna límites a pendientes/suspendidos ni a cuentas reales. Solo crea configuraciones ausentes y no pisa modificaciones administrativas existentes en demo.

`prepare-demo-assets.mjs` incluye esa semilla en `demo-sql.json`. Una base demo nueva ejecuta 0001–0019, carga los datos históricos de demo y después aplica 0020–0022; luego configura la capacidad ficticia. Esto permite migrar el ejemplo histórico sin inventar términos. Una base previa aplica las migraciones faltantes mediante `local_demo_versions`. `refreshLocalSchema` también aplica la semilla de capacidad antes de escenarios.

La igualdad exacta entre fuentes de migraciones/semillas y el paquete demo se verifica en `test:preview`. El upgrade separado desde 0019 **no carga la semilla ficticia de Capacity**: comprueba que no existan límites automáticos y que el capital histórico permanezca desconocido hasta revisión expresa.

Supabase remoto no fue inspeccionado ni migrado. Su estado puede continuar en 0019 o en otra versión: no se afirma equivalencia con local. Las bases temporales creadas durante el desarrollo son desechables; una base que ya hubiera marcado una versión intermedia de 0020–0022 no se considera actualizada solo por cambiar el SQL, porque el runtime aplica migraciones faltantes, no reejecuta versiones registradas. Usar una base local nueva o un upgrade desde 0019 para evaluar esta entrega.

## 9. Verificaciones ejecutadas

En PowerShell se utilizó `npm.cmd` para evitar la restricción de ejecución de `npm.ps1`. Los tiempos son de la última ejecución y pueden variar. Las suites hijas indicadas se ejecutaron dentro de `npm.cmd test`; sus cantidades no se deben sumar nuevamente al total 89.

| Comando exacto | Resultado / cantidad | Duración aproximada | Artefactos locales |
| --- | --- | --- | --- |
| `npm.cmd test` | PASS, 89 pruebas, 0 fallos/omitidas | 27 s | `.test-dist`, logs; PGlite temporal/en memoria |
| `npm.cmd run test:domain` (hijo) | PASS, 12 | 0,14 s de runner, más compilación | `.test-dist` |
| `npm.cmd run test:database` (hijo) | PASS, 33 | 5 s | Bases de prueba locales |
| `npm.cmd run test:stage2a` (hijo) | PASS, 12 | 4,6 s | PGlite, upgrade de regresión |
| `npm.cmd run test:stage2b` (hijo) | PASS, 28 | 5,8 s | PGlite, upgrade desde 0019 |
| `npm.cmd run test:preview` (hijo) | PASS, 4 | 5,6 s | Directorio temporal de demo |
| `npm.cmd run typecheck` | PASS, mobile/web/domain; no es suite de tests | 13 s | Cache incremental TypeScript según configuración |
| `npm.cmd run lint` | PASS, sin autofix; 0 errores/advertencias | 6 s | Log |
| `npm.cmd run test:web` | PASS, 21 recorridos, 0 excepciones JS | 71 s | `.next-e2e`, DB/files aislados, logs y capturas bajo `.4pack-demo` |
| `npm.cmd run build:web` | PASS, build productivo con rutas admin/demo Capacity | 14 s | `.next` y archivos generados de Next |
| `npm.cmd run build:mobile` | PASS, export Android/Hermes; no build nativo firmado | 34 s | `apps/mobile/dist/android`, assets/metadata |
| `npm.cmd run check:contract` | PASS, SQL y dominio sincronizados | < 2 s | No modifica el contrato |
| `node scripts/prepare-demo-assets.mjs` | PASS, paquete SQL regenerado | < 2 s | `demo-sql.json`, incluido en el diff |
| `git -c core.safecrlf=false diff --check` | PASS, sin errores de whitespace | < 1 s | Ninguno |

Cobertura específica de las 28 pruebas 2B: sin límites, precio, exposición, cantidad, peso, volumen, capital, vigencia futura/vencida/inactividad, FOB excluido, límites opcionales null, cero declarado explícito, acumulación de cada dimensión, USD/ARS separados y cantidad global, desactivación independiente por moneda, idempotencia y restricciones únicas, permisos/RLS/RPC internas, pendientes/suspendidos, activación/completed, disputed, cancelación/fallo autorizados, reducciones rechazadas y motivo auditado, borrador/revisión/snapshot/moneda del capital, upgrade histórico desde 0019.

La regresión mantiene perfiles comerciales, ofertas privadas, documentos/Storage, reputación, mensajería y wallet simulada. Navegador incluye todas las secciones a 320/390/768/1440 px, Capacity propia sin edición, protección de la ruta administrativa productiva sin sesión, configuración demo con motivo y persistencia del evento administrativo. No se verificó una sesión administrativa remota ni Storage remoto.

### Fallos iniciales y advertencias

- La primera invocación `npm run typecheck` fue bloqueada por la política de PowerShell sobre `npm.ps1`, antes de ejecutar TypeScript. Se reemplazó por `npm.cmd`; el typecheck final pasó.
- El primer lint detectó dos errores: un import antepuesto a `use client` en `forms.tsx` y `quote-editor.tsx`. Se corrigió la posición de la directiva. El primer navegador iniciado durante esa corrección capturó el error de compilación y falló la aserción final de cero excepciones JS. Los reruns finales de lint y navegador pasaron sobre el código corregido. Logs iniciales preservados localmente como `lint-initial-failure.log` y `web-initial-failure.log`.
- Metro avisó que `NO_COLOR` es ignorado por `FORCE_COLOR`; no impidió la exportación. Next muestra el aviso de experimento `serverActions` de la configuración existente. Git puede informar normalización LF/CRLF en este entorno; `diff --check` final no reporta errores.
- Algunas búsquedas exploratorias con glob/braces de sintaxis no compatible con PowerShell fallaron; se corrigieron. No son tests aprobados ni cambios de aplicación.
- Los logs de verificación están en `.4pack-demo/stage2b/` y permanecen excluidos de Git. Ningún fallo de prueba quedó abierto en la ejecución final.

## 10. Riesgos y deuda restante

| Prioridad | Estado / acción pendiente |
| --- | --- |
| P0 | No se identificó un bloqueo local abierto dentro de Capacity. Esto no constituye aprobación de producción. |
| P1 | Ejecutar pruebas multiconexión PostgreSQL/Supabase: adjudicaciones al mismo operador/diferente carga, ganadores competidores en una carga, quote/award, garantía/transición/configuración concurrentes y aislamiento/retry de serialización. PGlite no certifica ausencia de deadlocks reales. |
| P1 | Ensayar las migraciones y permisos con roles reales de Supabase/PostgREST en un entorno autorizado, incluyendo RLS, funciones internas revocadas, introspección RPC y upgrade con datos representativos. No desplegar solamente por el resultado local. |
| P1 | Evaluación administrativa real de límites y revisión explícita de capital histórico antes de habilitar nuevas adjudicaciones. No usar la semilla ficticia en cuentas reales. |
| P1 | El cierre cancelled/failed documenta las consecuencias pero no liquida dinero ni implementa controversias. Una retención simulada pendiente requiere revisión administrativa; antes de pagos reales se necesita ese flujo contractual/financiero. |
| P2 | Validación en dispositivo mobile, build nativo firmado y recorrido de red real pendientes. El export Android no los sustituye. |
| P2 | Paginar reservas/historial y medir consultas agregadas con datos reales. El snapshot devuelve todas las reservas y como máximo los últimos 100 eventos. |
| P2 | Mejorar presentación/localización del panel administrativo y fechas ISO; hoy usa controles funcionales y requiere zona horaria explícita al configurar vigencias. |
| P2 | Manejo específico de retries por conflictos de serialización y observabilidad de contención antes de alta carga. La seguridad rechaza la transacción; la UX puede pedir reintentar. |

Próxima etapa recomendada: auditar este diff y ejecutar la matriz multiconexión/roles sobre PostgreSQL autorizado, revisar la política económica de límites y el procedimiento histórico. No comenzar contratación directa ni Protect 3.0 con esta entrega.

## 11. Evidencia por rutas y símbolos

| Ruta | Símbolos / evidencia |
| --- | --- |
| `supabase/migrations/0020_capacity_model.sql` | Tablas y RLS; `lock_operator_capacity`, `capacity_usage`, `operator_capacity_snapshot`, `configure_operator_capacity`, `review_historical_capacity`; backfill requiere revisión. |
| `supabase/migrations/0021_capacity_quote_contract.sql` | `validate_normalized_quote`, `quote_command`: capital explícito, moneda, regla <= precio y orden de locks. |
| `supabase/migrations/0022_capacity_workflows.sql` | `reserve_operation_capacity`, `release_operation_capacity`, `capacity_reserve`, `capacity_phase`, `award_offer`, `transition_operation`, `simulate_guarantee`, `admin_capacity_terminal_transition`. |
| `packages/domain/src/quotes.ts` | `NormalizedQuote`, `validateQuote`; representación histórica nullable y validación de nuevas propuestas. |
| `apps/web/src/features/operator/{actions,data,quote-editor,panel,forms,shell,types}.ts*` | FormData de capital, carga del snapshot privado, impacto informativo, navegación y consulta de capacidad. |
| `apps/web/src/features/capacity/` | `CapacityView`, `CapacityAdminForm`, `CapacityAdminPage`, `capacityAdmin`, `capacityAdminRpc`, `capacityAction`; lectura propia y configuración administrativa. |
| `apps/web/src/app/admin/capacidad/page.tsx` y `apps/web/src/app/demo/admin/capacidad/page.tsx` | Rutas administrativas productiva y simulada. |
| `apps/web/src/components/award-offer-button.tsx` | `AwardOfferButton`: mensaje de capacidad sin filtrar detalles privados. |
| `apps/web/src/features/marketplace/quote-terms.tsx` | `QuoteTerms`: capital declarado o revisión histórica. |
| `apps/web/src/app/capacity.css`, `layout.tsx`, `components/dashboard-shell.tsx`, `app/admin/page.tsx` | Estilos y puntos de acceso. |
| `supabase/demo/stage2b-capacity-seed.sql` | Únicos límites iniciales: cuentas ficticias de demo. |
| `scripts/prepare-demo-assets.mjs`, `features/operator/demo-runtime.mjs`, `demo-sql.json` | Bundle sincronizado, instalación nueva y upgrade local. |
| `tests/stage2b.test.mjs` | 28 pruebas 2B y upgrade desde 0019 con datos; restricciones/permisos/rollback/capital/cierres. |
| `tests/operator-browser.test.mjs` | 21 recorridos, formulario de capital, Capacity, responsive y auditoría administrativa demo. |
| `tests/quote-fixture.mjs`, `tests/demo-preview.test.mjs`, `package.json` | Capital explícito solo en fixtures nuevos, igualdad SQL/semilla y ejecución de suite 2B desde npm test. |

## 12. Estado Git final

El checkpoint 2A es el HEAD actual; **los cambios de 2B quedan sin commit, preparados para auditoría local**. No hay eliminaciones ni renombres. Los archivos nuevos deben incluirse al revisar el diff: `git diff --stat` no cuenta archivos sin seguimiento.

No se hizo push, merge, despliegue ni migración remota. No se introdujeron secretos, artefactos de build, bases ni capturas en Git. Al terminar este informe se detuvo la implementación; no se inició otra etapa.

La captura de estado e inventario a continuación se generó después de crear este archivo.


Rama: `codex/4pack-qa-readiness`.

HEAD: `1e34d82a4badddeb56cd2b54d418c57cf65c1ad7`.

Inventario: 20 archivos existentes modificados, 15 nuevos sin seguimiento (incluye este informe), 0 eliminados. Index sin cambios de 2B.

### git status --short -- .

```text
 M apps/web/src/app/admin/page.tsx
 M apps/web/src/app/layout.tsx
 M apps/web/src/components/award-offer-button.tsx
 M apps/web/src/components/dashboard-shell.tsx
 M apps/web/src/features/marketplace/quote-terms.tsx
 M apps/web/src/features/operator/actions.ts
 M apps/web/src/features/operator/data.ts
 M apps/web/src/features/operator/demo-runtime.mjs
 M apps/web/src/features/operator/demo-sql.json
 M apps/web/src/features/operator/forms.tsx
 M apps/web/src/features/operator/panel.tsx
 M apps/web/src/features/operator/quote-editor.tsx
 M apps/web/src/features/operator/shell.tsx
 M apps/web/src/features/operator/types.ts
 M package.json
 M packages/domain/src/quotes.ts
 M scripts/prepare-demo-assets.mjs
 M tests/demo-preview.test.mjs
 M tests/operator-browser.test.mjs
 M tests/quote-fixture.mjs
?? apps/web/src/app/admin/capacidad/
?? apps/web/src/app/capacity.css
?? apps/web/src/app/demo/admin/
?? apps/web/src/features/capacity/
?? docs/16-etapa-2b-capacity.md
?? supabase/demo/stage2b-capacity-seed.sql
?? supabase/migrations/0020_capacity_model.sql
?? supabase/migrations/0021_capacity_quote_contract.sql
?? supabase/migrations/0022_capacity_workflows.sql
?? tests/stage2b.test.mjs
```

### git diff --stat -- .

```text
 4pack-v3/apps/web/src/app/admin/page.tsx           |   1 +
 4pack-v3/apps/web/src/app/layout.tsx               |   1 +
 .../apps/web/src/components/award-offer-button.tsx |   5 +-
 .../apps/web/src/components/dashboard-shell.tsx    |   1 +
 .../web/src/features/marketplace/quote-terms.tsx   |   2 +-
 4pack-v3/apps/web/src/features/operator/actions.ts |   2 +-
 4pack-v3/apps/web/src/features/operator/data.ts    |   5 +
 .../web/src/features/operator/demo-runtime.mjs     |   6 +
 .../apps/web/src/features/operator/demo-sql.json   |   6 +-
 4pack-v3/apps/web/src/features/operator/forms.tsx  |   5 +-
 4pack-v3/apps/web/src/features/operator/panel.tsx  |   8 +-
 .../web/src/features/operator/quote-editor.tsx     | 286 +++++++++++++++++++--
 4pack-v3/apps/web/src/features/operator/shell.tsx  |   1 +
 4pack-v3/apps/web/src/features/operator/types.ts   |   4 +
 4pack-v3/package.json                              |   5 +-
 4pack-v3/packages/domain/src/quotes.ts             |   4 +
 4pack-v3/scripts/prepare-demo-assets.mjs           |   1 +
 4pack-v3/tests/demo-preview.test.mjs               |   1 +
 4pack-v3/tests/operator-browser.test.mjs           |  21 ++
 4pack-v3/tests/quote-fixture.mjs                   |   2 +-
 20 files changed, 334 insertions(+), 33 deletions(-)
```

### Archivos sin seguimiento, expandidos

```text
apps/web/src/app/admin/capacidad/page.tsx
apps/web/src/app/capacity.css
apps/web/src/app/demo/admin/capacidad/page.tsx
apps/web/src/features/capacity/admin-actions.ts
apps/web/src/features/capacity/admin-data.ts
apps/web/src/features/capacity/admin-form.tsx
apps/web/src/features/capacity/admin-page.tsx
apps/web/src/features/capacity/types.ts
apps/web/src/features/capacity/view.tsx
docs/16-etapa-2b-capacity.md
supabase/demo/stage2b-capacity-seed.sql
supabase/migrations/0020_capacity_model.sql
supabase/migrations/0021_capacity_quote_contract.sql
supabase/migrations/0022_capacity_workflows.sql
tests/stage2b.test.mjs
```

Los nuevos archivos suman 1895 lineas antes de anexar esta captura de estado al informe; no aparecen en el diff stat de archivos registrados. No se agregaron al index ni se creo un commit de 2B.
