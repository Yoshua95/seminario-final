# Primera etapa de implementación de 4PACK 3.0

Fecha: 2026-11-14. Alcance: preservación, baseline y correcciones de seguridad e integridad. Sin Capacity, contratación directa, pagos por tramos ni rediseño visual.

## Hechos y punto de restauración

- Raíz Git: `C:/Users/Asus Tuf/Documents/4PACK`; proyecto: subdirectorio `4pack-v3`.
- Rama inicial: `codex/4pack-qa-readiness`; HEAD inicial: `f808655`.
- Antes de modificar lógica se creó `.4pack-demo/restore-stage1/4pack-v3-before-stage1.zip`: 171 archivos versionados o no ignorados del proyecto, incluidos panel, migraciones 0009–0014, pruebas, scripts, documentación y configuración Android/mobile.
- SHA-256 del ZIP: `049B78DC7C539A9F94F8DEEC961B671EA5D1300F0A33D7629AF8539FA0F5300E`.
- Se verificaron los 171 contenidos del ZIP contra `inventory.json`, byte a byte mediante SHA-256. No contiene otros proyectos, historial Git, dependencias, caches ni archivos `.env` ignorados.
- `git-status.txt` conserva cambios iniciales y borrados preexistentes, incluida la ausencia de `apps/mobile/expo-env.d.ts`. `head.txt` conserva la referencia inicial. No se creó un commit ni se modificó el índice Git.
- Restauración: extraer el ZIP en un directorio nuevo, conservando rutas relativas, y contrastar sus hashes con el inventario. El directorio nuevo reproduce los archivos fuente iniciales y su ausencia de archivos borrados. No superponerlo automáticamente al trabajo actual: eso no retiraría los archivos agregados durante esta etapa. Los secretos y artefactos ignorados quedan fuera del snapshot y permanecen en su ubicación original.

## Cambios realizados

### Documentos

Migración `0015_document_gateway.sql`:

- Revoca inserción/borrado directo de documentos; limita actualizaciones a validación administrativa.
- Revoca subidas/borrados directos del cliente en Storage.
- Agrega `document_objects`, vínculo privado e inmutable entre objeto, documento, usuario, ruta y hash SHA-256.
- La lectura de Storage comprueba ese vínculo y el destino autorizado. Crear metadatos con una ruta conocida ya no concede acceso.
- `document_upload_target` y `register_document_upload` solo son ejecutables por el rol de servicio, además del propietario de base. Las antiguas RPC de operador no permiten insertar documentos.
- La Edge Function `document-upload` verifica JWT con `getUser`, destino, tamaño, MIME, extensión y firma; genera UUID/ruta, calcula hash, sube bytes y registra el objeto. Compensa la subida si falla la vinculación.
- El rol de servicio se usa exclusivamente en el runtime de Edge; no se agregó una clave a web, mobile o archivos de entorno.
- Web original y panel llaman la subida mediante servidor. Las descargas conservan URLs firmadas de 60 segundos. La demo usa un adaptador local confiable y el mismo registro SQL.
- Los documentos anteriores solo se vinculan automáticamente si existe un objeto y coinciden propietario, ruta y cargador. Los que no cumplen permanecen inaccesibles por Storage hasta revisión. La migración no certifica la firma de bytes históricos.

### Adjudicación y concurrencia

`0016_operation_contract.sql` reemplaza `award_offer`:

- Bloquea primero la carga y después la oferta; todas las adjudicaciones de esa carga comparten ese primer bloqueo.
- Verifica sesión, rol importador, propiedad, pertenencia oferta/carga, estado presentado, vigencia, cierre de licitación y aprobación vigente del operador. Mantiene bloqueada la aprobación durante la transacción.
- Reintentar la misma oferta devuelve la operación existente. Una oferta diferente para una carga contratada es rechazada. Se mantienen las claves únicas.
- Deja un punto explícito para incorporar validación/reserva de capacidad en otra etapa, dentro de la misma transacción. No implementa Capacity.

### Estados y mobile

- Fuente de verdad: `packages/domain/src/operation-contract.json`. TypeScript la consume directamente y `prepare-operation-contract.mjs` genera el contrato SQL; `check:contract` detecta divergencias.
- Estados: created, confirmed, in_progress, awaiting_delivery_confirmation, completed, incident, disputed, cancelled, failed.
- Migra fases históricas sin borrar operaciones. Conserva `cargo_status` como proyección de compatibilidad y los hitos como eventos logísticos.
- `transition_operation` valida estados, rol y garantía en servidor. El operador inicia/gestiona la ejecución desde web; el importador confirma recepción y finaliza. No se libera pago simulado por una marca unilateral del operador.
- `advance_operation` anterior rechaza clientes incompatibles. Se deshabilitan helpers de oferta/avance de operador en mobile y se bloquea la navegación de cuentas no importadoras. Se conserva código histórico con consumidores identificados.
- Mobile permite seguimiento, mensajería, confirmación de garantía y confirmación de recepción del importador.
- No se implementó resolución de controversias: disputed sigue requiriendo una etapa posterior.

### Monedas

- Nuevas ofertas admiten USD o ARS; se elimina USD/ARS del selector y se impide su contratación.
- Operación, garantía y movimiento de liberación conservan la moneda contractual. Todos los importes persistidos siguen siendo `numeric`; comisión de 2,5% sobre el servicio ofertado, nunca sobre FOB.
- El comparador ordena por moneda y luego importe, sin premiar como mejor precio global ofertas en monedas distintas. Wallet mantiene balances por moneda; métricas USD excluyen ARS.
- Deuda deliberada: los nombres históricos `_usd` se conservan para no romper contratos anteriores. Para nuevas ofertas representan importes de la moneda contractual asociada, sin conversión implícita.
- Ofertas históricas ambiguas quedan preservadas y bloqueadas por la nueva restricción `NOT VALID` al intentar escribirlas/contratarlas. Requieren reconciliación explícita.
- Si existen operaciones históricas ya adjudicadas con moneda distinta de USD, la migración se detiene para exigir reconciliación; no reetiqueta silenciosamente un ledger existente.

### Reputación y reproducibilidad

- `public_reputation(usuario, rol)` diferencia importador y operador, cuenta solo operaciones completed e informa cantidad de evaluaciones.
- Cuentas sin evaluaciones tienen promedio null. Sin operaciones finalizadas: history="sin historial". UI y dominio no presentan una puntuación ficticia.
- Calificaciones nuevas requieren contraparte y operación completed.
- El runtime demo aplica migraciones nuevas una sola vez: no reinstala funciones antiguas al refrescar el paquete. La prueba de idempotencia histórica se ejecuta antes de las migraciones nuevas y luego prueba la actualización con datos existentes.
- Metro resuelve los imports NodeNext `.js` del dominio a su fuente TypeScript, corrigiendo el export Android.

## Baseline y validación

Logs completos en `.4pack-demo/restore-stage1/`. Los errores intermedios se conservaron.

| Comando | Baseline | Resultado final / artefactos |
|---|---|---|
| `npm.cmd test` | 10 dominio + 23 base + 4 preview, todos pasan | 10 dominio + 33 base + 4 preview, todos pasan; `.test-dist`, fixtures temporales PGlite |
| `npm.cmd run typecheck` | exit 0 | exit 0 en mobile/web/dominio; `.tsbuildinfo` |
| `npm.cmd run lint` | exit 0, sin autofix | exit 0 |
| `npm.cmd run test:database` | 23/23 | 33/33; incluye actualización desde esquema histórico poblado |
| `node --test tests/stage1.test.mjs` | No existía | 10/10, incluye peticiones solapadas a la misma oferta y ofertas competidoras |
| `npm.cmd run test:web` | Falló: Chrome CDP no disponible en 9222 | exit 0, 17 recorridos verificados en Chrome headless; capturas en `.4pack-demo/screenshots`, base aislada y `.next-e2e` |
| `npm.cmd run build:web` | exit 0 | exit 0; `apps/web/.next` |
| `npm.cmd run build:mobile` | Falló resolución `./operator.js` | exit 0; `apps/mobile/dist/android`, bundle Hermes y 25 assets |
| `npm.cmd run check:contract` | No existía | exit 0 |
| `git diff --check` | No ejecutado como baseline | exit 0 |

El primer intento con `npm` fue bloqueado por la política de ejecución de PowerShell. Se utilizó `npm.cmd`, sin modificar dicha política. Algunos intentos iniciales de registrar logs fallaron porque el nombre contenía `:`; se corrigieron los nombres y se repitieron los comandos correspondientes. Estos fallos de instrumentación no se contabilizan como pruebas aprobadas.

La prueba original de navegador dependía de un Chrome externo y su limpieza en Windows podía quedar esperando `taskkill`. Se adaptó para Chrome headless y un servidor de pruebas propio, sin afectar otros procesos de usuario. Los intentos fallidos y logs de diagnóstico quedan conservados.

Durante el diagnóstico también falló un intento de iniciar Next directamente sin su CLI (manifest de desarrollo ausente). Se descartó ese lanzador sin consumidores; el runner final utiliza la CLI de Next, comprueba que el puerto esté libre y termina únicamente los procesos de su servidor. El último recorrido completo terminó con exit 0 y dejó de escuchar en 3001. El archivo generado `apps/web/next-env.d.ts` se restituyó byte a byte desde el ZIP al finalizar para no conservar cambios de rutas de tipos introducidos por las pruebas.

## Límites verificados y pendientes

- PGlite serializa transacciones: las pruebas solapadas no prueban deadlocks ni aislamiento con varias conexiones PostgreSQL. Esa validación queda pendiente.
- La Edge Function está preparada como código local. No se ejecutó en Deno/Supabase: no hay CLI Deno/Supabase disponible en este entorno. El typecheck de workspaces no cubre el runtime Deno.
- Las pruebas de Storage modelan el esquema local y las políticas SQL; no sustituyen una prueba integrada contra Storage real. Deben verificarse metadata, user_metadata, migraciones y función en un entorno autorizado antes de promover esta versión.
- No se aplicaron migraciones remotas ni se desplegó la función. Producción permanece sin modificar; no se afirma que estas correcciones estén activas allí. Promover web sin migraciones/función compatibles causaría errores; aplicar la revocación documental sin gateway disponible bloquearía subidas de clientes anteriores.
- Demo local usa PGlite y filesystem; Vercel Preview usa almacenamiento temporal. Ninguno equivale a Storage durable de producción.
- No se verificó ejecución en dispositivo, emulador Android ni generación de APK. El export Hermes y typecheck sí fueron ejecutados.
- Los perfiles comerciales públicos y la política de identidad anterior no fueron cambiados: requieren una decisión de campos públicos/privados y una revisión posterior. No se incorporó contratación directa.
- Capacidad, pagos por tramos, resolución administrativa de controversias y demás alcance 3.0 quedan fuera de esta entrega.

## Archivos de esta etapa

El inventario exacto comparado con el ZIP inicial está en `.4pack-demo/restore-stage1/stage1-files.json`. Los archivos que ya estaban modificados antes de empezar se preservaron; no se confundieron con cambios nuevos usando únicamente `git diff HEAD`.

Las migraciones 0001–0014 no se modificaron. Se agregaron 0015 y 0016. No se cambiaron secretos ni archivos `.env`, no se instalaron dependencias, no se hizo commit, push, merge ni despliegue.
