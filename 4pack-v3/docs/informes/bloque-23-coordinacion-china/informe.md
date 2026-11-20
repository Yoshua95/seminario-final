# Bloque 23 · Coordinación China → Argentina

**Estado: PARCIAL.** Fecha: 20/11/2026, Argentina. Ambos casos se publicaron desde Android y recibieron una oferta desde la web candidata, sin duplicados. La adjudicación real está bloqueada por Mercado Pago deshabilitado y sin secretos configurados. No se acreditan despacho, recepción ni revisión contractual en los clientes reales.

## 1. Checkpoints y entorno

- Rama: `codex/mvp-defense-close`, worktree aislado `.4pack-demo/block15/worktree/4pack-v3`.
- Partida: `40355a6b6d96a60d6ed9f2598bbb9b49162ed6a9`.
- Regresión de partida: `379737882fe49d59de55e283c8f04222b53a5029`, LC-10004.
- Implementación y fuente del APK: `1e96a7dca32990f6e158a99e41957af3fd59f13e`.
- Corrección de clave de reintento: `db37bb65c2e001c11dbd2e008394f776732a13ad`.
- Código web publicado final: **`fcb5397622b7f33d8c729e8857bad0b876503218`**. Los commits posteriores del informe/pruebas no cambian ese código funcional.
- Supabase candidato exclusivo: **`khtfjogqvtjuxhmzkmue`**, cuentas ficticias preexistentes de importador, operador y admin; no se restablecieron contraseñas ni crearon cuentas.
- Web: https://4pack-candidata-mvp.vercel.app/acceso . Despliegue `dpl_DLuMJpzgAPXYwHeScPH436sEgJbf`, READY, metadata `sourceCommit=fcb5397…`, sin gitDirty.
- Android: **3.0.6, versionCode 7**, paquete `com.yoshuachavez.fourpack.candidate`, emulador `emulator-5556`, usuario 12. Actualización sobre la instalación candidata, conservando sesión. Metro 8081/8085 apagado durante los ensayos.
- Defensa preservada: `seminario-final-five.vercel.app`, despliegue `dpl_HyRbgPCKD2R4bCVUKAhUeYovnGUH`, metadata `e3ed41606e20df02c96230a202a06ebfd9898918`; sin cambios en su proyecto `umiracgmhjglqoftoljn` ni en su APK.

## 2. Qué se implementó

### Publicación y elegibilidad

China y Argentina quedan fijos; el servidor asigna CN/AR. Provincia, ciudad, distrito y dirección se guardan en `origin_plan`, separados de las etiquetas históricas. Argentina ofrece 23 provincias y CABA. Se distinguen agente/depósito y proveedor directo, envío por agente/proveedor o retiro. El formulario calcula volumen por cantidad de bultos iguales y dimensiones; registra si las medidas son estimadas o confirmadas. El FOB sigue en USD; las ofertas nuevas siguen en ARS. Se conserva el flujo MSDS y su gateway.

La elegibilidad usa países del corredor, operador aprobado, carga abierta, modalidad y servicios. No compara la escritura de la ciudad. `origin_pickup` es un servicio específico: no se confunde con manipulación en origen. La ficha del operador muestra quién entrega, ubicación actual, retiro solicitado, referencia y medidas, sin pedirlos de nuevo.

### Depósitos y ofertas

Perfil empresarial permite agregar, editar, elegir predeterminado y desactivar depósitos. La cotización precarga un depósito activo y exige condiciones de recepción; el retiro exige inclusión y condiciones. Antes de adjudicar, el importador recibe solo un resumen de localidad y condiciones. La dirección completa queda en una tabla privada y luego se copia a la operación, conservando lo ofrecido aunque se edite o desactive el depósito.

### Despacho, recepción y revisiones

El código Android muestra la dirección adjudicada, copia destinatario/teléfono/dirección/referencia de operación/instrucciones y registra despacho del importador. El operador registra el retiro cuando está contratado y confirma recepción con medidas reales. Las RPC generan hitos con operación, fecha y responsable, con claves idempotentes. El seguimiento y la tarea por rol leen los datos persistidos.

La recepción en China es `received_in_china`, distinta de la entrega en Argentina; no completa la operación ni libera fondos. Los ajustes se proponen como anexos con motivo, precio ARS, plazo y condiciones. Solo el importador puede decidirlos; las versiones previas quedan guardadas. El contrato y pago originales no se sobrescriben. Si el último precio aceptado cambia, el avance económico queda bloqueado hasta disponer de conciliación adicional: **no está implementado el cobro de diferencias**.

## 3. Migración aplicada y conservación

Archivo final: [20261120205426_china_origin_coordination.sql](../../../supabase/migrations/20261120205426_china_origin_coordination.sql).

SHA-256 del archivo real y del blob Git, coincidentes:

`3c5fec2c3788367364b76e3967b8ba80cbd2eab841f3db5a9374d6def6cc857f`

Fue aprobado originalmente como `20261120202217_china_origin_coordination.sql`. El conector lo aplicó con versión `20261120205426`. La revisión automática rechazó modificar directamente esa versión del historial por falta de autorización específica. El usuario indicó **dejar el historial sin cambios**: se renombró únicamente el archivo local para coincidir con el registro remoto, con idéntico SQL y hash. No se repitió DDL ni se modificó el historial. La versión final figura exactamente una vez.

| Control | Antes | Después de aplicar | Al cerrar el ensayo |
|---|---:|---:|---:|
| Cargas | 2 | 2 | 5 |
| Ofertas | 2 | 2 | 4 |
| Operaciones | 0 | 0 | 0 |
| Documentos | 0 | 0 | 0 |
| Cuentas Auth | 3 | 3 | 3 |
| Depósitos China | — | 0 | 1 |

Las diferencias finales son tres cargas ficticias y dos ofertas del ensayo. LC-10004 conserva texto original `SHENZENG CHINA → EZEIZA ARGENTINA`, corredor legacy, una oferta ARS 135.000 / 9 días. No se alteraron sus datos para adaptarlos al corredor nuevo.

Seguridad posterior observada: las cinco tablas nuevas tienen RLS; anon no tiene SELECT y authenticated no tiene INSERT/UPDATE/DELETE directos. Cero helpers privados examinados tienen EXECUTE efectivo para authenticated. Importador autenticado ve cero depósitos completos y cero términos privados antes de adjudicar; la RPC de resumen no devuelve dirección exacta. Una escritura directa se rechaza con `42501: permission denied for table china_warehouses`.

[Revisión de aplicación](REVISION_CANDIDATA.md), [manifiesto](manifest-revision.json) y [controles de solo lectura](controles-solo-lectura.sql).

## 4. Registros reales del ensayo

| Caso | Carga | UUID de carga | Oferta | Precio / plazo |
|---|---|---|---|---|
| A · agente envía | LC-10006 | `a7a60aab-0f52-4ad4-af62-bf9a053fdaa7` | `b82070f8-656d-4f54-86d9-9b4e8458ad56` | ARS 120.000 / 7 días |
| B · proveedor envía | LC-10008 | `26eae735-db4b-4095-ae61-f215ed3f6852` | `c3174604-05f8-4827-9460-00f6686473d5` | ARS 130.000 / 9 días |
| Variante retiro, solo API | LC-10010 | `798dfbba-3f09-45b9-b8ab-3f3ba5f9e1fe` | Sin oferta | Excluida para operador sin retiro |

Depósito ficticio único: `5b4c7253-af15-434d-9fff-0a5f770a95ff`. Sus datos indican no enviar mercadería real. Ambos casos principales: FOB USD 1.100; 2 bultos, 20 kg, 100 × 50 × 40 cm por bulto, volumen 0,400 m³, medidas estimadas. Origen A `SHENZENG`, B `Shenzhen`. La variante usa `SHENZHEN`, pero se excluye por retiro solicitado, no por escritura de ciudad.

**UUID de operación real: no existe.** La adjudicación no se confirmó y no se generó una operación para simular el cierre.

## 5. Resultado por criterio y entorno

| Criterio | Android / web publicados | API Supabase autenticada | PGlite |
|---|---|---|---|
| Regresión LC-10004 | PASS, APK nuevo y web: ARS 135.000 / 9 días | PASS, una oferta | Regresión MVP PASS |
| Publicar agente y proveedor | PASS, ambos desde APK sin Metro | PASS, ambos open y CN/AR | PASS |
| Bandeja y ficha de origen | PASS, ambos visibles al operador | PASS, elegibilidad | PASS, tres escrituras de ciudad |
| Cotizar con depósito y condiciones | PASS, web; mismos importes/plazos en APK | PASS, una oferta por caso | PASS |
| Reintento sin duplicación | PASS del flujo de revisión corregido, caso B | PASS: A dos reintentos mismo ID; B mismo ID | PASS |
| Resumen sin dirección privada | PASS, visible en APK | PASS, dirección completa oculta | PASS |
| Retiro incompatible | NO PROBADO por pantalla | PASS: operador incompatible, cero filas en bandeja | PASS, servicio y modalidad; retiro completo local |
| Adjudicar | **BLOQUEADO en A**, mensaje visible | **BLOQUEADO P0001**, cero operaciones | PASS con habilitación ficticia local |
| Copiar dirección adjudicada | NO PROBADO | NO PROBADO | Formato y snapshot cubiertos; no acredita portapapeles nativo |
| Despacho/retiro y recepción medida | NO PROBADO | NO PROBADO | PASS, ambos casos y retiro, reintentos y roles |
| Revisión y aceptación del importador | NO PROBADO | NO PROBADO | PASS, conserva versiones y bloquea diferencia económica |
| Dirección congelada al editar/desactivar | NO PROBADO | NO PROBADO | PASS |
| Recibir en China no libera fondos | NO PROBADO con operación real | No hay operaciones | PASS, cero movimientos de liberación |
| Recuperar sesión al reabrir | PASS, force-stop y reapertura sin Metro | Auth existente reutilizado | No sustituye Auth real |
| Admin y acceso por rol | PASS: seis secciones, operador rechazado en /admin | Sesiones separadas existentes | Regresión de tareas y contratos PASS |

Los datos ficticios de PGlite y su bandera de checkout local **no acreditan** un pago del proveedor ni un recorrido real completado.

## 6. Primer bloqueo reproducible y requisito pendiente

1. Abrir LC-10006 en APK 3.0.6, seleccionar ARS 120.000 / 7 días.
2. Pulsar **Aceptar oferta y pagar**, confirmar en el diálogo nativo.
3. Android muestra **«Pago de prueba no disponible; la oferta no fue adjudicada»**. La RPC `award_offer_for_test_checkout` devuelve el mismo mensaje, código **P0001**.
4. Supabase conserva carga open, oferta submitted y cero operaciones.

`mp_test_settings.enabled=false`. La consulta oficial de nombres de secretos al cierre devolvió **cero nombres MP_TEST_*** en la candidata. No se imprimieron ni pidieron tokens. No se habilitó checkout ni se creó preferencia/pago.

Work debe completar por canal privado `MP_TEST_ACCESS_TOKEN`, `MP_TEST_SELLER_ID`, `MP_TEST_WEBHOOK_SECRET` y `MP_TEST_RETURN_BASE`, verificar vendedor/comprador de prueba distintos y el retorno de la candidata, y coordinar la habilitación temporal autorizada. Luego retomar **las ofertas existentes**; no republicar ni duplicar cargas. No usar el backend o secretos de defensa como sustituto.

## 7. Comandos y pruebas ejecutados

Comandos desde la raíz del monorepo candidato, salvo Gradle desde apps/mobile/android. Logs de trabajo en `.4pack-demo/china-*.log`, ignorados por Git; log de coordinación sanitizado en evidencia/.

| Comando | Resultado / cantidad | Duración aproximada | Artefactos locales |
|---|---|---|---|
| `npm.cmd run test:domain` | PASS, 12 | 1 s | .test-dist |
| `npm.cmd run test:mvp` | PASS, 45 | 2 s | Fixture PGlite temporal |
| `npm.cmd run test:payments` | PASS, 43 | 3 s | Fixture PGlite temporal |
| `npm.cmd run test:hazmat` | PASS, 13 | 3 s | .test-dist y fixture |
| `node --test tests/china-origin.test.mjs` | PASS, 8 | 2 s | Fixture PGlite temporal |
| `npm.cmd run test:mobile:importer` | PASS, 4 | 2 s | .test-dist y fixture |
| `npm.cmd run test:mobile:visual` | PASS, 2 | <1 s | Sin fixture dentro de entrega |
| `npm.cmd run typecheck` | PASS, mobile/web/domain | 8–10 s | Cachés TypeScript |
| `npm.cmd run lint` | PASS, sin autofix | 4–6 s | Sin correcciones |
| `npm.cmd run build:web` | PASS, también tras las correcciones web | 10–20 s | apps/web/.next |
| `npm.cmd run build:mobile` | PASS, exportación JS Android | ~20 s | apps/mobile/dist/android |
| `npm.cmd run check:mobile:release` | PASS, un bundle revisado sin marcadores del visor | <1 s | Lee exportación |
| `.\gradlew.bat :app:createBundleReleaseJsAndAssets --rerun-tasks --init-script ../../../scripts/android-release.init.gradle --no-daemon --max-workers=2` | BUILD SUCCESSFUL | 1m13s, última ejecución | Bundle y sourcemap |
| `.\gradlew.bat :app:assembleRelease --init-script ../../../scripts/android-release.init.gradle --no-daemon --max-workers=2` | BUILD SUCCESSFUL | 4m34s inicial; 33s final | APK y reportes Gradle |
| `adb -s emulator-5556 install --user 12 -r <APK>` | Success, actualización candidata | ~10 s | Instalación emulador |
| Runners block23 de Android, web y API | Resultados por criterio arriba | 5 s a varios minutos por formulario | Capturas/JSON sin credenciales |
| `node .4pack-demo/block23/final-verification.mjs` | PASS, origen A/B y regresión; metadata de ambos dominios | ~15 s | JSON/capturas |
| `FOURPACK_CANDIDATE_WEB=… node .4pack-demo/block20/verify-browser.mjs` (variable configurada en PowerShell) | PASS, seis secciones admin y denegación al operador | ~15 s | Capturas/JSON |

**127 pruebas automatizadas aprobadas**, sin sumar capturas ni comprobaciones manuales a ese total. No se ejecutó `npm test` completo ni se certifica toda la suite Preview. No hay prueba en dispositivo físico ni una instalación limpia en este bloque: se actualizó la candidata existente.

## 8. Fallos y advertencias, sin ocultar resultados

- La prueba inicial de taxonomía esperaba nueve servicios: se actualizó a diez e incluyó la etiqueta de retiro. Reejecución PASS.
- La preparación PGlite detectó referencias al nombre renombrado de prepare_cargo_publication, claves privadas rechazadas por el validador anterior y dependencia del OID de operator_compatible en RLS. Se corrigió la migración antes de aplicarla; los ocho tests finales pasan.
- La primera compilación web no encontraba Next por la junction de dependencias. Se completó una instalación local del monorepo. No se modificó la instalación original de defensa. Se agregó expo-clipboard 8.0.8 y su lockfile.
- npm informó 27 vulnerabilidades en el árbol instalado (22 moderadas, 5 altas). No se ejecutó audit fix ni una actualización masiva; su evaluación queda pendiente.
- El primer control de fixtures de release falló ENOENT porque faltaba la exportación JS; se exportó y repitió, PASS.
- Un paquete de publicación inicial quedó vacío por ejecutar git archive desde el subdirectorio. Vercel rechazó Root Directory apps/web; se recreó desde la raíz Git y se verificó apps/web/package.json antes de publicar. El dominio permaneció en su versión anterior hasta un despliegue READY.
- El primer reintento del caso A capturó una clave vacía tras abrir la revisión: `Sesion e identificador de reintento requeridos`. Se corrigió el estado del formulario en db37bb6. El caso B retiene la clave y repite sin duplicar; el payload registrado de A se reintentó dos veces con el mismo resultado.
- Los primeros runners ADB usaban Atrás al ocultar teclado y salían del formulario; se cambió la automatización, sin publicar cargas duplicadas. En el arranque en frío, leer la pantalla a los 2,5 s alcanzaba a ver los datos anteriores: se esperó la carga solicitada y se verificó la sesión recuperada. No se alteró Auth para forzar un PASS.
- Gradle emitió advertencias de APIs obsoletas y Metaspace. Un wrapper PowerShell devolvió 1 por stderr del compilador, aunque el log de Gradle terminó BUILD SUCCESSFUL; el APK final se generó, instaló y abrió.
- La revisión automática rechazó la modificación del historial; se respetó la decisión posterior del usuario de no cambiarlo. Se resolvió únicamente el nombre local, sin repetir la migración.

Advisories previos: tablas internas con RLS sin políticas (acceso directo bloqueado), cuatro funciones históricas con search_path mutable, funciones SECURITY DEFINER autenticadas y protección de contraseñas filtradas deshabilitada. No se modificaron componentes ajenos. Referencia: https://supabase.com/docs/guides/database/database-linter . Las nuevas RPC controlan rol/dueño/participación; helpers privados revocados.

## 9. APK y evidencia disponible

APK local:

`apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

SHA-256: **`ddc7781ca17a8fb1c6de2044d0017825e722d5604e1d27e47d65feef2452691a`**, 89.555.674 bytes. Descarga pública reverificada con el mismo hash. Se inspeccionó además assets/index.android.bundle dentro del APK: los tres marcadores del visor están ausentes. Código nativo/mobile/domain sin diferencias respecto de 1e96a7d; los cambios funcionales posteriores son web.

**Uso acreditado: emulador x86_64.** El ZIP APK contiene bibliotecas React Native para varias ABI, pero expo-modules-core está empaquetado para x86_64. No declarar este artefacto apto para un teléfono ARM; preparar y ensayar ese build antes de entregarlo para dispositivo físico.

Capturas principales:

- [Agente: origen Android](evidencia/android-agent-origen.png), [revisión](evidencia/android-agent-revision.png), [oferta en APK](evidencia/android-agent-oferta.png).
- [Proveedor: origen Android](evidencia/android-supplier-origen.png), [revisión](evidencia/android-supplier-revision.png), [oferta en APK](evidencia/android-supplier-oferta.png).
- [Depósito empresarial](evidencia/warehouse-web.png), [ficha agente publicada](evidencia/web-agent-ficha.png), [ficha proveedor publicada](evidencia/web-supplier-ficha.png).
- [Oferta agente web](evidencia/web-agent-oferta.png), [oferta proveedor web](evidencia/web-supplier-oferta.png).
- [Bloqueo real de adjudicación Android](evidencia/android-agent-adjudicacion.png), [LC-10004 en APK nuevo](evidencia/android-legacy-oferta.png).
- [Backend y permisos](evidencia/api-checks.json), [reintento A](evidencia/retry-agent.json), [reintento B](evidencia/quote-supplier.json), [retiro excluido](evidencia/pickup-variant.json), [verificación de despliegues](evidencia/final-verification.json), [pruebas de China](evidencia/china-origin-tests.txt).

## 10. Evidencia para la planilla

| Entregable | Evidencia disponible | URL pública verificada |
|---|---|---|
| Web candidata | Login y fichas A/B, misma base que APK | https://4pack-candidata-mvp.vercel.app/acceso |
| Administración candidata | Sesión admin, seis secciones y control por rol | https://4pack-candidata-mvp.vercel.app/admin/acceso |
| Código funcional web | fcb5397, publicado por push normal y Vercel | https://github.com/Yoshua95/seminario-final/commit/fcb5397622b7f33d8c729e8857bad0b876503218 |
| Fuente de APK | 1e96a7d, sin cambios posteriores de mobile/domain | https://github.com/Yoshua95/seminario-final/commit/1e96a7dca32990f6e158a99e41957af3fd59f13e |
| APK candidato PARCIAL | Descarga y SHA verificados, emulador x86_64 | https://github.com/Yoshua95/seminario-final/releases/download/v3.0.6-candidata-china-b23/4PACK-3.0.6-Candidata-China-Android.apk |
| Recorrido completo hasta recepción real | Bloqueado antes de adjudicar; no hay video ni operación real | pendiente de verificación |

Accesos de cuentas por canal privado, nunca en la planilla. Video diferido. Para abrir en el emulador: actualizar solo el paquete candidato, abrir 4PACK Candidata; en Cargas elegir LC-10006 o LC-10008. La web del operador usa Cargas disponibles / Mis ofertas. No seleccionar la app de defensa para este backend.

## 11. Archivos y símbolos relevantes

- `packages/domain/src/china-origin.mjs` y `.d.mts`: argentinaProvinces, measuredVolume, validateChinaPlan, warehouseAddress y tipos; `index.ts` exporta el módulo; `services.json` incorpora origin_pickup.
- `packages/domain/src/operation-work.mjs` y `.d.mts`: deriveOperationTask recibe el tramo China y revisiones.
- Migración 20261120205426: prepare_cargo_publication, operator_compatible, quote_command, china_offer_summaries, award_offer, save_china_warehouse, record_china_dispatch, confirm_china_receipt, propose_china_revision, decide_china_revision, transition_operation y guard del checkout ante cambio de importe.
- `apps/mobile/app/cargo/new.tsx`, `features/importer/china-cargo-form.tsx`: formulario nuevo; se conserva CargoFormView anterior para el visor aislado.
- `apps/mobile/lib/cargo-publication.ts`, `dashboard.ts`, `importer-flow.ts`: JSON de origen, compatibilidad previa a publicar, resúmenes y lectura de coordinación. `features/importer/china-operation.tsx` y `views.tsx`: dirección, copia, despacho, decisión y seguimiento.
- `apps/mobile/package.json`, `app.json`, `android/app/build.gradle`, `package-lock.json`: 3.0.6/code7 y expo-clipboard compatible con SDK54.
- `apps/web/src/features/operator/types.ts`, `data.ts`: datos estructurados y lecturas por RLS; `china-actions.ts` autentica servidor y llama una lista cerrada de RPC; `china-panels.tsx` maneja depósitos, despacho/recepción y revisión.
- `company-profile.tsx`, `panel.tsx`: perfil, ficha y operación; `forms.tsx`, `quote-composer.tsx`, `actions.ts`, `offers-list.tsx`: depósito/condiciones y clave idempotente estable; `workbench-state.ts`: próxima tarea.
- `tests/china-origin.test.mjs`: ocho casos de negocio/seguridad; `tests/quotes.test.mjs`: taxonomía; `tests/tsconfig.json`: compila el nuevo módulo.

## 12. Estado Git y siguiente paso

Los checkpoints funcionales 1e96a7d, db37bb6 y fcb5397 se publicaron por push normal a la misma rama. No hubo merge. Se preservaron los cambios previos de apps/web/tsconfig.json y docs/informes/bloque-18-candidata-mp/informe.md; supabase/.temp permanece local e ignorado/excluido. .env, cuentas privadas, node_modules, APK, .next, exportaciones y logs de trabajo no se agregaron a Git. El APK se distribuye únicamente como asset de prerelease candidata.

Próximo orden: completar configuración privada de pagos de candidata; habilitar temporalmente el ensayo según autorización; adjudicar las dos ofertas existentes; anotar sus UUID de operación; copiar dirección, despachar y confirmar recepción con medidas en ambas interfaces; aceptar una revisión y comprobar historial; editar/desactivar depósito después de adjudicar y contrastar el snapshot. Apagar las opciones al terminar. Ensayar un build ARM en dispositivo físico por separado.

El bloque **no está cerrado funcionalmente hasta recepción real**. No se inventaron pagos, operaciones ni capturas de pasos no realizados. La defensa mantiene su versión.
