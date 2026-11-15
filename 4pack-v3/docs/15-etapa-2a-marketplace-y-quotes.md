# 4PACK 3.0 — Etapa 2A: marketplace y cotizaciones

Fecha: 14 de noviembre de 2026. Alcance: checkpoint Git local, perfil comercial seguro y cotizaciones normalizadas/versionadas. No se implementaron Capacity, contratación directa, recontratación, pagos por tramos o controversias.

## 1. Checkpoint Git local

- Raíz Git real: `C:/Users/Asus Tuf/Documents/4PACK`. Se actuó únicamente sobre `4pack-v3`.
- Rama: `codex/4pack-qa-readiness`.
- Checkpoint: **`ca1367319f593f6ce872077ba3d68d3202ab6237`**.
- Mensaje: `chore(4pack): checkpoint local aprobado de etapa 1`.
- Identidad técnica usada solo en ese comando: `Codex <codex@localhost>`; no se modificó configuración global ni se atribuyó el commit al usuario.
- El diff del checkpoint contiene 132 rutas, todas de `4pack-v3`. Incluye el producto aprobado de la etapa 1, migraciones 0001–0016, Functions, panel, mobile, Android, dominio, scripts, pruebas y documentación. No incorpora cambios de proyectos hermanos.
- Se verificó inmediatamente después del commit que el proyecto estaba limpio y no había fuentes necesarias sin seguimiento. Los cambios de 2A se realizaron después y quedan en el árbol de trabajo para revisión; no forman parte del checkpoint anterior.

### Exclusiones revisadas

Se enumeraron 135.418 archivos ignorados en el entorno local. El inventario está en `.4pack-demo/stage2a/ignored-inventory.txt`, fuera de Git. Predominan dependencias, caches y builds; no se copiaron sus contenidos al baseline. Se revisaron las rutas candidatas y patrones de claves privadas/tokens sin imprimir valores: no se detectaron coincidencias en los candidatos incorporados. Esto no certifica todo el historial remoto ni los archivos secretos ignorados.

Se excluyen `.env` y variantes salvo ejemplos, secretos/material de firma, `.4pack-demo`, logs, capturas, bases temporales, `node_modules`, `.next*`, `.test-dist`, `dist`, `.expo`, builds/Gradle/.cxx, APK y AAB. Los `.env.example` contienen placeholders, no credenciales operativas.

`apps/mobile/android/app/debug.keystore` quedó ignorado y no se borró del equipo. No es firma productiva ni hace falta para export Hermes. El procedimiento para regenerar una clave de desarrollo en otra copia está en [14b-checkpoint-local.md](14b-checkpoint-local.md). La configuración Gradle preexistente referencia debug también en release: no se certificó una firma de distribución ni se generó APK.

### Recuperación del checkpoint

Preservar primero los cambios actuales. Desde la raíz Git, crear un archivo en una ruta nueva con:

```text
git archive --format=zip --output=<ruta-nueva/checkpoint-4pack.zip> ca1367319f593f6ce872077ba3d68d3202ab6237 4pack-v3
```

Extraerlo en un directorio vacío para inspeccionar/usar la fuente previa a 2A. El comando es una instrucción de recuperación, no fue ejecutado aquí. No usar reset/clean/checkout destructivo sobre trabajo pendiente. La referencia no contiene secretos ni datos locales. El ZIP anterior a etapa 1 permanece fuera de Git en `.4pack-demo/restore-stage1`.

## 2. Modelo comercial público/privado

Se eligió **tabla comercial independiente + RPC con allowlist**, en lugar de abrir `profiles` u `operator_profiles` o exponer `SELECT *` de datos legales.

`operator_commercial_profiles` guarda nombre comercial público, identificador público UUID independiente, logo HTTPS, descripción, ubicación general, modalidades, especialidades, cobertura, categorías y experiencia declarada. Se agregan publicación voluntaria y ocultamiento administrativo. La tabla solo puede leerse directamente por su propietario o administración y escribirse mediante las RPC autorizadas.

`commercial_directory` devuelve exclusivamente campos permitidos y métricas calculadas. No devuelve `operator_id`, CUIT, domicilio exacto, representante, teléfono, correo, documentos, finanzas ni motivos de suspensión. La verificación se obtiene de la ficha legal y la reputación de operaciones completed; no son campos editables del perfil comercial.

Reglas:

- Usuarios autenticados pueden consultar el directorio; no se habilita acceso anónimo ni indexación pública como requisito.
- Pendientes pueden preparar su perfil privado, pero no se listan.
- Aprobados aparecen cuando publican y no están ocultos por administración.
- Suspendidos desaparecen del directorio. El importador participante de una operación existente puede consultar por identificador la referencia comercial histórica segura, marcada no disponible.
- El operador solo escribe su propio perfil mediante `save_commercial_profile`, sin poder cambiar dueño, UUID, verificación, reputación o moderación. La publicación del operador no revierte un ocultamiento administrativo.
- Administración puede ocultar/restaurar, cambiar nombre/descripcion y, por RPC, logo. Se auditan los cambios.
- Se restringió adicionalmente la lectura de `profiles` y `operator_profiles` a propio/admin. Una relación operativa ya no abre toda la ficha legal. `operation_contacts` devuelve exclusivamente el teléfono operativo a participantes autorizados; los nombres de terceros en snapshot/chat se muestran de forma genérica cuando no hay identidad comercial autorizada.

No se copiaron automáticamente nombres legales, direcciones o descripciones privadas a la tabla pública. Los campos se preparan expresamente. La validación bloquea contactos evidentes en textos comerciales y limita tamaños/listas, pero no sustituye moderación humana frente a información sensible escrita deliberadamente de manera no reconocible.

### Interfaz

- Directorio: `/operadores`, detalle: `/operadores/[id]`.
- Búsqueda por nombre y filtros combinables por modalidad, especialidad y cobertura.
- Tarjetas con estado, métricas, cantidad de evaluaciones y presentación «Operador nuevo · Sin historial» cuando corresponde.
- Logo y experiencia son opcionales; no se completan valores desconocidos.
- «Solicitar cotización · Próximamente» está deshabilitado. No inicia contratación.
- Sección independiente «Perfil comercial público» dentro del panel privado `/operador/perfil`.
- Moderación: `/admin/operadores/comercial`, con guard de rol y RPC administrativa; enlazada desde revisión de operadores.
- Demo del importador: `/demo/operadores` y detalle. Usa identidad simulada fija de importador, solo en entornos donde ya estaba permitida la demo. Los perfiles demo son fixtures ficticios explícitos.
- El comparador usa `offer_public_profile`: proyección comercial autorizada por oferta. No consulta datos legales de otro usuario para obtener el nombre.

## 3. Taxonomía y cotización normalizada

Taxonomía mínima en `packages/domain/src/services.json` y `quote_taxonomy()`:

| Código | Servicio |
|---|---|
| international_transport | Transporte internacional |
| origin_handling | Manipulación en origen |
| customs_coordination | Coordinación aduanera |
| destination_handling | Manipulación en destino |
| domestic_delivery | Entrega nacional |
| storage | Almacenamiento |
| insurance | Seguro |
| integrated_service | Servicio integral |
| other | Otro |

Se prueba la igualdad entre la taxonomía SQL y la del dominio. Son claves extensibles, no una habilitación profesional. La interfaz aclara que coordinación aduanera no equivale a actuar como despachante habilitado.

Cada propuesta presentada exige:

- modalidad, servicios y alcance;
- precio total como cadena decimal, moneda USD o ARS;
- incluidos y excluidos explícitos, sin contradicción literal;
- seguro/cobertura;
- plazo entero de 1–365 días, vigencia con zona horaria y dentro del cierre de la licitación;
- condiciones de pago, documentación requerida, responsabilidades y observaciones.

Los importes persistidos siguen siendo `numeric`. No se usa float para el precio contractual en SQL. Se conservan los nombres históricos `_usd` para compatibilidad; la moneda asociada determina su significado. No se convierte ni se suma USD con ARS. El comparador advierte monedas distintas y no asigna mejor precio global entre ellas.

La comisión continúa calculándose sobre el servicio ofertado, nunca sobre FOB. Los rechazos de moneda ambigua, suspensión y vencimiento y la idempotencia de adjudicación de etapa 1 se conservan.

## 4. Borradores, versiones y snapshot contractual

`quote_drafts` guarda contenido editable, privado del operador/admin, con auditoría de cada inserción/edición. Se permite contenido incompleto pero estructuralmente seguro; no se puede presentar sin completar y validar todos los términos. El borrador no es visible al importador ni a competidores.

`quote_command` es la API autorizada: guardar, presentar y retirar. Se revoca al cliente INSERT/UPDATE/DELETE directo de ofertas. Las propuestas presentadas conservan `quote_group_id`, revisión y `replaces_offer_id`.

- Una presentación genera una fila nueva e inmutable de oferta y vincula el borrador al resultado.
- Reintentar la presentación del mismo borrador devuelve la oferta existente.
- Antes del cierre y de su vencimiento se puede retirar o presentar una revisión que reemplaza la anterior.
- El reemplazo retira la propuesta previa, conserva todo su contenido y crea una fila con revisión siguiente. Hay unicidad de revisión, de hijo de reemplazo y de oferta activa por carga/operador.
- Si otra sesión ya reemplazó la revisión, se rechaza una rama alternativa. PGlite prueba serialización local; no certifica concurrencia PostgreSQL real.
- Tras aceptar o cerrar/vencer no se editan ni se retiran/reemplazan esas propuestas por la API del cliente.
- Adjudicación toma primero el bloqueo de carga y conserva las verificaciones del comando anterior. No acepta una oferta histórica incompleta.

`operation_contract_snapshots` captura los términos normalizados, identificador de oferta/grupo, revisión y comisión al crear una operación nueva. El snapshot es privado de participantes/admin e inmutable por trigger. La operación y la garantía conservan la moneda contractual. El panel de operación y el resumen del importador muestran ese snapshot.

Las ofertas históricas conservan `normalized_quote = null`. Las operaciones anteriores reciben `state = requires_review`, `content = null`; no se les inventan condiciones. Su precio/moneda y datos anteriores siguen en sus columnas originales. Una propuesta histórica abierta necesita una nueva revisión completa para ser adjudicada. Un reintento de una adjudicación histórica ya existente recupera su operación, no inventa un contrato normalizado.

La UI actualiza formulario, borradores, Mis Ofertas, detalle por `?offer=<id>`, reemplazo/retiro, comparador y operación. Muestra «Incluye», «No incluye», alcance, precio, moneda, plazo y vigencia. `sameQuoteScope` compara modalidad, servicios, alcance, incluidos/excluidos, cobertura, responsabilidades, documentación y condiciones de pago; advierte diferencias sin afirmar equivalencia semántica de textos distintos.

## 5. Migraciones creadas y upgrade

| Archivo | Responsabilidad |
|---|---|
| 0017_commercial_profiles.sql | Tabla/RLS comercial, índices, validación, edición/moderación, auditoría, directorio seguro y contactos operativos explícitos |
| 0018_normalized_quotes.sql | Borradores, validación, versiones, unicidades, RPC, auditoría, snapshot inmutable y wrapper de adjudicación |
| 0019_marketplace_snapshot.sql | Snapshot privado actualizado y proyección comercial autorizada para ofertas |

No se modificaron migraciones 0001–0016 respecto del checkpoint. Las nuevas migraciones son de aplicación única con seguimiento por el proceso habitual; no se afirma que sus archivos puedan ejecutarse dos veces manualmente.

El paquete `demo-sql.json` se regeneró desde fuentes locales y contiene las 19 migraciones. El generador concatena las nuevas fixtures comerciales a los escenarios simulados; las pruebas comparan el paquete con todos los archivos originales.

Se probó upgrade **desde 0016 con datos**, además del upgrade histórico anterior de regresión. La prueba comprueba tabla comercial vacía, ofertas históricas sin normalización y tres contratos existentes con contenido null/requiere revisión. Las fixtures públicas se agregan únicamente a demo, no a datos reales durante la migración.

Las migraciones se ejecutaron exclusivamente en PGlite de pruebas/demo. No se aplicaron a una base remota.

## 6. Pruebas y resultados

| Comando exacto | Resultado | Duracion | Casos / evidencia |
|---|---|---|---|
| `npm.cmd test` | exit 0 | 18.64 s | 61/61: dominio 12, base 33, etapa 2A 12, Preview 4; log `.4pack-demo/stage2a/final/01.log` |
| `npm.cmd run typecheck` | exit 0 | 11.95 s | 3 workspaces, sin errores; log `.4pack-demo/stage2a/final/02.log` |
| `npm.cmd run lint` | exit 0 | 5.54 s | Sin autofix, sin errores; log `.4pack-demo/stage2a/final/03.log` |
| `npm.cmd run test:web` | exit 0 | 61.71 s | 20/20 recorridos Chrome headless; log `.4pack-demo/stage2a/final/04.log` |
| `npm.cmd run build:web` | exit 0 | 9.68 s | Compilacion y rutas nuevas correctas; log `.4pack-demo/stage2a/final/05.log` |
| `npm.cmd run build:mobile` | exit 0 | 15.17 s | Bundle Hermes + 25 assets y metadata; log `.4pack-demo/stage2a/final/06.log` |
| `npm.cmd run check:contract` | exit 0 | 0.72 s | Contrato de estados sincronizado; log `.4pack-demo/stage2a/final/07.log` |
| `git diff --check -- .` | exit 0 | 0.16 s | Sin errores de whitespace; avisos LF/CRLF; log `.4pack-demo/stage2a/final/08.log` |

Total: **61 pruebas automatizadas y 20 recorridos web**, todos aprobados. Los logs y duraciones medidos se conservan en `.4pack-demo/stage2a/final/results.json`. Se generaron artefactos locales ignorados: .test-dist, .next/.next-e2e, bases/capturas demo, caches/tsbuildinfo, dist/android y logs. No son fuentes incorporadas al checkpoint.

La suite `npm test` incluye dominio, base/regresión etapa 1, etapa 2A y Preview. Las pruebas de etapa están disponibles también con `npm run test:stage2a` (12 casos), ejecutado por separado durante el desarrollo.

Cobertura nueva de perfiles: aprobado visible, pendiente/suspendido oculto, referencia histórica segura, ausencia de campos privados y consultas alternativas, edición propia, rechazo de métricas/verificación/moderación por operador, cuenta nueva sin puntuación, filtros, moderación y auditoría.

Cobertura nueva de quotes: borrador privado/editable, presentación completa, moneda única y rechazo USD/ARS, tipos/colecciones válidos, incluidos/excluidos, vigencia, retiro, revisión sin sobrescritura, rechazo de ramas, cierre/aceptación/vencimiento inmutable, competencia aislada, snapshot contractual, taxonomía y upgrade sin inventar historia. La comparación de alcance tiene prueba de dominio.

La E2E conserva los recorridos anteriores y añade directorio comercial, reemplazo versionado y edición comercial separada de la legal. El guardado/presentación de borrador queda incorporado en el recorrido de oferta. Responsive y nombres accesibles se comprueban a 320/390/768/1440 px en las secciones del panel.

### Fallos de integración detectados y resueltos

- Las pruebas antiguas de ofertas no aportaban los nuevos términos obligatorios. Se agregaron fixtures **de prueba explícitas**, sin defaults en datos históricos reales. La prueba de actualización directa de oferta ahora exige denegación de permisos, más restrictiva que la antigua respuesta de cero filas.
- Se corrigió un import colocado antes de `use client` al integrar el editor.
- La E2E detectó dos campos `trade_name` y se acotó el selector anterior al formulario legal; la nueva edición comercial tiene su propio recorrido.
- La taxonomía ampliada desbordaba el formulario móvil. Se corrigió min-width de fieldset y wrapping de conceptos/acciones, sin eliminar la aserción responsive ni rediseñar el panel.

Los primeros logs fallidos se conservan en `.4pack-demo/stage2a/`; la tabla anterior usa únicamente la ejecución final. No se eliminaron assertions de seguridad para obtener verde.

## 7. Archivos de 2A y estado Git posterior

El checkpoint es anterior a las funciones de 2A. Los cambios siguientes quedan pendientes de revisión en el árbol de trabajo; no se creó un segundo commit de implementación ni se hizo push.

| Archivo | Estado frente al checkpoint |
|---|---|
| `apps/mobile/metro.config.cjs` | Modificado |
| `apps/web/next.config.ts` | Modificado |
| `apps/web/src/app/admin/operadores/page.tsx` | Modificado |
| `apps/web/src/app/demo/acceso/page.tsx` | Modificado |
| `apps/web/src/app/ofertas/[cargoId]/page.tsx` | Modificado |
| `apps/web/src/app/operaciones/[operationId]/page.tsx` | Modificado |
| `apps/web/src/app/operator.css` | Modificado |
| `apps/web/src/components/dashboard-shell.tsx` | Modificado |
| `apps/web/src/features/operator/actions.ts` | Modificado |
| `apps/web/src/features/operator/data.ts` | Modificado |
| `apps/web/src/features/operator/demo-sql.json` | Modificado |
| `apps/web/src/features/operator/forms.tsx` | Modificado |
| `apps/web/src/features/operator/panel.tsx` | Modificado |
| `apps/web/src/features/operator/types.ts` | Modificado |
| `apps/web/src/lib/dashboard-data.ts` | Modificado |
| `package.json` | Modificado |
| `packages/domain/src/index.ts` | Modificado |
| `scripts/prepare-demo-assets.mjs` | Modificado |
| `tests/database.test.mjs` | Modificado |
| `tests/demo-preview.test.mjs` | Modificado |
| `tests/operator-browser.test.mjs` | Modificado |
| `tests/stage1.test.mjs` | Modificado |
| `apps/web/src/app/admin/operadores/comercial/page.tsx` | Nuevo |
| `apps/web/src/app/demo/operadores/[id]/page.tsx` | Nuevo |
| `apps/web/src/app/demo/operadores/page.tsx` | Nuevo |
| `apps/web/src/app/operadores/[id]/page.tsx` | Nuevo |
| `apps/web/src/app/operadores/page.tsx` | Nuevo |
| `apps/web/src/features/marketplace/data.ts` | Nuevo |
| `apps/web/src/features/marketplace/directory.tsx` | Nuevo |
| `apps/web/src/features/marketplace/moderation-action.ts` | Nuevo |
| `apps/web/src/features/marketplace/quote-terms.tsx` | Nuevo |
| `apps/web/src/features/operator/commercial-editor.tsx` | Nuevo |
| `apps/web/src/features/operator/quote-editor.tsx` | Nuevo |
| `docs/15-etapa-2a-marketplace-y-quotes.md` | Nuevo |
| `packages/domain/src/quotes.ts` | Nuevo |
| `packages/domain/src/services.json` | Nuevo |
| `supabase/demo/stage2a-scenarios.sql` | Nuevo |
| `supabase/migrations/0017_commercial_profiles.sql` | Nuevo |
| `supabase/migrations/0018_normalized_quotes.sql` | Nuevo |
| `supabase/migrations/0019_marketplace_snapshot.sql` | Nuevo |
| `tests/quote-fixture.mjs` | Nuevo |
| `tests/quotes.test.mjs` | Nuevo |
| `tests/stage2a.test.mjs` | Nuevo |

### Estado exacto

```text
 M apps/mobile/metro.config.cjs
 M apps/web/next-env.d.ts
 M apps/web/next.config.ts
 M apps/web/src/app/admin/operadores/page.tsx
 M apps/web/src/app/demo/acceso/page.tsx
 M apps/web/src/app/ofertas/[cargoId]/page.tsx
 M apps/web/src/app/operaciones/[operationId]/page.tsx
 M apps/web/src/app/operator.css
 M apps/web/src/components/dashboard-shell.tsx
 M apps/web/src/features/operator/actions.ts
 M apps/web/src/features/operator/data.ts
 M apps/web/src/features/operator/demo-sql.json
 M apps/web/src/features/operator/forms.tsx
 M apps/web/src/features/operator/panel.tsx
 M apps/web/src/features/operator/types.ts
 M apps/web/src/lib/dashboard-data.ts
 M apps/web/tsconfig.json
 M package.json
 M packages/domain/src/index.ts
 M scripts/prepare-demo-assets.mjs
 M tests/database.test.mjs
 M tests/demo-preview.test.mjs
 M tests/operator-browser.test.mjs
 M tests/stage1.test.mjs
?? apps/web/src/app/admin/operadores/comercial/
?? apps/web/src/app/demo/operadores/
?? apps/web/src/app/operadores/
?? apps/web/src/features/marketplace/
?? apps/web/src/features/operator/commercial-editor.tsx
?? apps/web/src/features/operator/quote-editor.tsx
?? docs/15-etapa-2a-marketplace-y-quotes.md
?? packages/domain/src/quotes.ts
?? packages/domain/src/services.json
?? supabase/demo/stage2a-scenarios.sql
?? supabase/migrations/0017_commercial_profiles.sql
?? supabase/migrations/0018_normalized_quotes.sql
?? supabase/migrations/0019_marketplace_snapshot.sql
?? tests/quote-fixture.mjs
?? tests/quotes.test.mjs
?? tests/stage2a.test.mjs
```

```text
 4pack-v3/apps/mobile/metro.config.cjs              |   4 +-
 4pack-v3/apps/web/next.config.ts                   |   2 +-
 .../apps/web/src/app/admin/operadores/page.tsx     |   2 +
 4pack-v3/apps/web/src/app/demo/acceso/page.tsx     |   1 +
 .../apps/web/src/app/ofertas/[cargoId]/page.tsx    |  13 ++-
 .../web/src/app/operaciones/[operationId]/page.tsx |   3 +-
 4pack-v3/apps/web/src/app/operator.css             |  20 ++++
 .../apps/web/src/components/dashboard-shell.tsx    |   1 +
 4pack-v3/apps/web/src/features/operator/actions.ts |  30 +++++
 4pack-v3/apps/web/src/features/operator/data.ts    |  13 +++
 .../apps/web/src/features/operator/demo-sql.json   |   7 +-
 4pack-v3/apps/web/src/features/operator/forms.tsx  | 128 +--------------------
 4pack-v3/apps/web/src/features/operator/panel.tsx  |  18 ++-
 4pack-v3/apps/web/src/features/operator/types.ts   |  18 ++-
 4pack-v3/apps/web/src/lib/dashboard-data.ts        |  32 ++++--
 4pack-v3/package.json                              |   7 +-
 4pack-v3/packages/domain/src/index.ts              |   2 +
 4pack-v3/scripts/prepare-demo-assets.mjs           |   4 +-
 4pack-v3/tests/database.test.mjs                   |   8 +-
 4pack-v3/tests/demo-preview.test.mjs               |   1 +
 4pack-v3/tests/operator-browser.test.mjs           |  75 ++++++++----
 4pack-v3/tests/stage1.test.mjs                     |  12 +-
 22 files changed, 217 insertions(+), 184 deletions(-)
```

El stat Git no incluye el contenido de archivos nuevos sin seguimiento. El inventario de arriba los enumera explícitamente. Las rutas generadas de tipos Next se restituyeron byte a byte al contenido del checkpoint tras las pruebas. Git status puede conservar marcas M transitorias para next-env.d.ts/tsconfig.json al no refrescar el ?ndice en esta lectura; git diff no presenta cambios de contenido y se comprob? igualdad binaria con HEAD. No son cambios funcionales de 2A.

## 8. Riesgos abiertos y decisiones para revisión

- No se verificaron Supabase remoto, Edge/Storage real, autenticación de usuarios reales, deploy Vercel ni dispositivo/emulador mobile. PGlite y las cuentas demo son simulaciones aisladas.
- Se necesita promoción coordinada de esquema y clientes: nuevas RPC/tablas y el cierre de lecturas legales amplias cambian contratos de datos. Los consumidores externos anteriores pueden requerir adaptación a `operation_contacts` y a la proyección comercial. No se activó nada remotamente.
- Los riesgos pendientes de etapa 1 sobre Edge documental, concurrencia PostgreSQL, estados excepcionales y firma de distribución no quedan resueltos por 2A. No se mueven fondos reales.
- La creación del índice único de oferta activa se detendrá si una base histórica tiene duplicados; no los elimina ni decide un ganador. Inventariar/reconciliar antes de migrar datos reales.
- Las cotizaciones históricas no pueden adjudicarse hasta reemplazarlas con términos completos. Esto es deliberado y necesita comunicación a usuarios al promover la versión.
- Las reglas de privacidad protegen datos legales almacenados y consultas alternativas; los campos comerciales son contenido publicado expresamente por el operador. La detección de contactos evidentes no es una garantía de clasificación semántica de toda información escrita manualmente. La moderación sigue siendo necesaria.
- El logo se expresa como URL HTTPS pública externa; no se implementó un nuevo flujo de subida de logos a Storage ni antimalware de imágenes.
- El directorio limita resultados a 100 y usa orden alfabético; quedan paginación/búsqueda a gran escala y validación integral de moderación con cuentas reales.
- Hay una referencia comercial segura para participantes históricos; no es un snapshot retrospectivo de identidad comercial. Las condiciones de contrato antiguas siguen en revisión. No se inventa una versión retrospectiva de lo que no existía.
- La modificación de borradores es mutable y auditada; las propuestas presentadas son versiones nuevas. No se implementó una clave global de idempotencia para todas las acciones del producto.
- El bloqueo de operador en mobile es un flujo de cliente/rol. Las RPC autorizan identidad, pertenencia y estados; no certifican el dispositivo físico que envía una petición.

## 9. Funcionalidades deliberadamente no implementadas

Capacity y reservas, contratación directa, recontratación, acción real de solicitar cotización desde el directorio, pagos por tramos, controversias, dinero real, escrow/custodia real, rediseño visual completo y despliegue de cualquier componente.

## 10. Cierre

Se creó un checkpoint local exclusivo del proyecto, se separó información comercial de legal/privada y se implementaron cotizaciones normalizadas con borradores, revisiones y snapshot contractual. Se preservaron las migraciones previamente auditadas.

No hubo push, merge, despliegue ni migración remota. No se modificaron secretos ni archivos `.env`. El trabajo se detiene al completar la etapa 2A y queda disponible para revisión antes de Capacity o contratación directa.
