# Bloque 18 — Candidata Android/web/Mercado Pago

Fecha: 19/11/2026. Rama aislada: `codex/capital-admin-isolated`. Base funcional solicitada: `55cd167`; se conservó el commit documental posterior `0e8c7bc`. Preparación funcional local: **`debb4a3fde366d590d915b4c275ea22e32583979`**.

**CANDIDATA NO LISTA.** El usuario eligió preparar un clon desde Work. Falta identificar y configurar ese backend separado antes de construir el APK conectado y ejecutar el pago real de sandbox. No se declara una prueba aprobada por haber probado mocks o PGlite.

## PASS / FAIL por paso solicitado

| Paso | Resultado | Evidencia y límite |
|---|---|---|
| 1. Admin, selector y Operaciones | **PASS local** | Selector solo Operador/Administrador, Operador inicial. Operaciones HTTP 200, cuatro registros existentes; OP-1001 muestra Contrato pendiente de revisión. Sin errores de página observados. |
| 2. Oferta respaldada, aceptar y pagar desde Android, transferencia | **FAIL — bloqueado, no ejecutado end to end** | Web candidata usa PGlite; APK instalado usa el Supabase de defensa. No existe aún un proyecto compartido separado identificado. La transferencia y el nuevo RPC pasaron pruebas locales, pero no se adjudicó desde Android contra ese backend. |
| 3. Checkout, aprobación backend y tres vistas, reconfirmación | **FAIL — bloqueado, no ejecutado con proveedor** | No se abrió ni creó un pago nuevo. No hay un UUID de operación/pago nuevo que acreditar en ambos clientes. No se confundió un pago anterior con el ensayo pedido. |
| 4. APK candidata y evidencia final | **FAIL — candidata pendiente** | Se inspeccionó el APK instalado y se preparó código para la acción nueva. No se generó ni instaló un APK con un backend incorrecto o sin configurar. |

FAIL en las filas bloqueadas significa que no se cumplió el criterio de entrega; no es un error de transacción observado en Mercado Pago.

## Entorno y APK realmente inspeccionados

La CLI autenticada lista únicamente `4pack-seminario-final / umiracgmhjglqoftoljn`. Ese proyecto sostiene la defensa. No se aplicaron allí las migraciones de capital ni otros cambios de este bloque.

La web aislada se inicia con `FOURPACK_MULTIROLE_DEMO=1`, PGlite y sin variables Supabase públicas configuradas en este worktree. Por tanto no comparte backend con el APK existente.

APK instalado, inspeccionado desde el dispositivo:

- Versión **3.0.4**, versionCode **5**.
- SHA-256: `576953098fdb02f73b83fbb5f96de38857d50a684172d42a80637e1150c7ebc3`.
- El bundle contiene `umiracgmhjglqoftoljn` y «Elegir esta oferta».
- El bundle **no contiene «Aceptar oferta y pagar»**.
- No se reemplazó la instalación ni se cambió la versión pública de defensa.

## Preparación implementada mientras se identifica el clon

1. Android: nueva acción **Aceptar oferta y pagar**, confirmación explícita, apertura del checkout de prueba y navegación a la operación creada. El pago no se aprueba por el retorno del navegador.
2. `accept-and-pay.ts`: conserva el UUID si el proveedor falla después de adjudicar; permite retomar el pago desde el seguimiento sin generar otra operación.
3. `award_offer_for_test_checkout`: RPC nuevo, transaccional, importador/ARS, que exige modo de prueba habilitado. Con checkout apagado rechaza antes de dejar una adjudicación. Transfiere la reserva mediante el flujo de capital existente y mantiene la idempotencia.
4. Android, Detalle de operación y Cobros preparan el texto **Pago de prueba aprobado** sobre el estado del backend; se agrega identificación de operación para cotejar canales. Estos cambios de pantalla aún requieren el ensayo real compartido.
5. Nueva migración local: `supabase/migrations/20261119225500_accept_offer_test_checkout.sql`. **No aplicada remotamente.**

No se habilitó checkout en la base de defensa ni en su función; no se modificaron sus secretos. Tampoco se cambió el esquema histórico USD.

## Pruebas ejecutadas

| Comando | Resultado |
|---|---|
| `node tests/admin-null-access-browser.mjs` | PASS local: selector, roles, OP-1001, cuatro filas, HTTP 200; captura web. |
| `node --test tests/accept-and-pay.test.mjs` | **4/4 PASS**: apagado sin adjudicación, modo de prueba/ARS/transferencia única y rol, no llamar proveedor si falla adjudicación, recuperar UUID/reintentar tras fallo del proveedor. PGlite y dependencias simuladas; no Mercado Pago real. |
| `npm.cmd run typecheck` | PASS, workspaces. |
| `npm.cmd run lint` | PASS, sin autofix. |
| Inspección ADB del APK instalado | PASS de diagnóstico de versión, hash, backend y textos; no prueba de la acción nueva. |

## Bloqueo adicional detectado para el clon

No basta copiar los secretos y desplegar las funciones sin revisar:

- `mercado-pago-test/index.ts` tiene un puente de conciliación con validación explícita de la URL `umiracgmhjglqoftoljn`.
- `mercado-pago-reconcile-registered-test/index.ts` está fijada a ese Project Ref y exige una operación autorizada mediante `MP_TEST_SYNC_OPERATION_ID`, además de un pago concreto mediante `MP_TEST_RECONCILE_PAYMENT_ID`.
- La RPC de registro y los validadores de evidencia también deben revisarse por referencias al proyecto original antes de autorizar una conciliación en el clon.
- Las evidencias y preferencias de OP-1026 y de pagos anteriores no acreditan el pago de una operación nueva.

Estas restricciones **no fueron eliminadas para conseguir un PASS**. Deben ajustarse al nuevo Project Ref, conservando vendedor/comprador de prueba, vínculo pago–orden–preferencia, referencia, moneda e importe. Ese parche debe probarse antes del checkout de la candidata.

## Requisito concreto a devolver desde Work

Ver [PROCEDIMIENTO_WORK.md](PROCEDIMIENTO_WORK.md). Hace falta la identificación pública del nuevo proyecto, confirmación de esquema y Auth/Storage, gateway y funciones de pago preparados para ese Ref. URL y publishable key se configuran en archivos locales ignorados; claves de servidor, vendedor y cuentas por canal privado, fuera del chat y Git.

Recién entonces: configurar ambos clientes al mismo destino, compilar/instalar una versión candidata identificable, verificar login sin Metro, crear la nueva operación, pagar en sandbox, verificar y repetir conciliación, y apagar los flags al terminar.

## Evidencia para la planilla

| Entregable | Evidencia disponible | URL pública verificada |
|---|---|---|
| Acceso y Operaciones de candidata local | [Resultado web](evidencia/web.json), [captura](evidencia/operaciones.png) | Pendiente de publicación |
| APK existente | [Inspección](evidencia/apk-inspection.json), [captura actual](evidencia/android-actual.png) | No es el APK candidato nuevo |
| Acción nueva y RPC | Código local `debb4a3`, [4 tests](evidencia/pruebas.txt) | Pendiente de publicación |
| Pago nuevo verificado | No ejecutado | Pendiente del clon y del ensayo |

No se declara lista la candidata. La defensa pública permanece conservada. Los archivos generados del build y `supabase/.temp` quedan fuera del checkpoint, sin descartarlos.
