# Corrección para revisar — pago nuevo del panel del operador

19/11/2026. **Revisión aprobada y ejecutada en pruebas.** La migración figura una vez; funciones activas con JWT obligatorio. La inspección real pasó todos los controles; el pago nuevo se concilió y su repetición conservó un registro. Android mostró Aprobado al reabrir. Ver [resultado final](informe.md).

Destino único propuesto: `4pack-seminario-final / umiracgmhjglqoftoljn`.

## Error real observado

Operación `971af114-98ce-46c2-91dc-866ad672c9e0` / OP-1026, contrato ARS 120.000. Preferencia guardada por el servidor `3858067934-58de5f3a-27d2-422f-b756-0fcec93ccd45`; referencia `97dd8a5f-77c5-42a5-99f0-d46a74224329`.

Mercado Pago devuelve pago `189418265535` aprobado, `live_mode=true` y **sin campo `is_test`**. La función actual rechaza correctamente la conciliación en `payment.validate`, HTTP 409, `PAYMENT_CONTRACT_MISMATCH`, `test_mode=false`; vendedor, referencia, moneda e importe coinciden. La excepción anterior está ligada exclusivamente al pago viejo. No se creó otro pago para evitar este rechazo.

## Parche propuesto

- [Migración 20261119140102](../../../supabase/migrations/20261119140102_mp_registered_test_preference_evidence.sql): redefine únicamente `record_mp_test_payment`. Conserva acceso exclusivo de `service_role`, validación de actor, operación de prueba/ARS, preferencia registrada, coincidencia de referencia/importe, bloqueo de Capacity, idempotencia y conservación de `live_mode`. La clasificación interna exige evidencia completa y reciente del proveedor; `is_test=true` alegado por sí solo sigue sin habilitar un pago live. No reescribe tablas ni históricos.
- [Función nueva](../../../supabase/functions/mercado-pago-reconcile-registered-test/index.ts): JWT obligatorio, proyecto fijo, propietario real de la operación y allowlist de una operación configurada en servidor. Requiere creación de checkouts apagada tanto en función como en base. Consulta por GET el pago, orden, preferencia, vendedor y comprador de prueba esperados. Comprueba todos los vínculos antes de guardar. `inspect` no escribe; `reconcile` usa la RPC existente.
- [Verificador compartido](../../../supabase/functions/_shared/mercado-pago-linked-test.mjs): contexto opcional suministrado por backend a partir de la preferencia guardada; su comportamiento por defecto conserva el caso histórico anterior. Nunca toma importe, vendedor, comprador o preferencia del cliente.
- [Adaptador del APK existente](../../../supabase/functions/mercado-pago-test/index.ts): con creación apagada, encamina la sincronización de la operación permitida al verificador registrado; conserva la ruta del pago viejo. El APK no necesita recompilarse.

Vendedor de prueba esperado: `3858067934`, `MLA` y etiqueta `test_user` verificados desde el proveedor. Comprador esperado: `3858067936`, identidad de prueba confirmada por el titular y comprobada por ID/país; no se inventa su etiqueta pública `test_user` si la API no la expone.

## Pruebas locales

`node --test tests/mercado-pago-registered-test.test.mjs tests/mercado-pago-registered-http.test.mjs tests/mercado-pago-linked-test.test.mjs tests/mercado-pago-linked-http.test.mjs tests/mercado-pago-http.test.mjs`

**59/59 PASS**, aproximadamente 2 s. Incluye PGlite, discrepancias de orden/preferencia/vendedor/comprador/importe/moneda, roles sin permiso de escritura, proyecto incorrecto, sesión, propietario, modo apagado, inspección sin escrituras y reintentos sin duplicar. No equivale a haber conciliado el pago nuevo en Supabase.

## Orden remoto autorizado y ejecutado

1. Confirmar proyecto, migración ausente e historial, flags apagados y estado de la operación histórica USD.
2. Aplicar y registrar solo `20261119140102_mp_registered_test_preference_evidence`, conservando el SQL exacto.
3. Desplegar `mercado-pago-reconcile-registered-test` y actualizar `mercado-pago-test`, ambas con JWT obligatorio; verificar versiones activas. No desplegar web ni modificar credenciales del proveedor.
4. Configurar `MP_TEST_SYNC_OPERATION_ID=971af114-98ce-46c2-91dc-866ad672c9e0`, manteniendo `MP_TEST_ENABLED=false` y `mp_test_settings.enabled=false`.
5. Ejecutar primero `inspect`. Si no se demuestra el vínculo pago–orden–preferencia, **no conciliar** y registrar el primer control fallido.
6. Solo si todos los controles pasan, conciliar ese intento, repetir y comprobar un único pago. Reabrir el APK actual sin Metro y verificar el estado de esa misma operación.
7. Confirmar flags apagados, ausencia de nuevos checkouts/pagos y conservación de históricos. Guardar evidencia sanitizada y versiones/hashes efectivamente desplegados.

La liberación por hitos sigue fuera de esta corrección. El registro de un pago aprobado de prueba no representa custodia ni desembolso real al operador.
