# Registro de aplicación exclusiva en candidata

**YA APLICADA. No repetir el DDL.** Se verificó una única versión 20261120205426 en el historial; checkout apagado. El texto siguiente conserva el procedimiento de revisión ejecutado.

Destino permitido: 4pack-candidata, khtfjogqvtjuxhmzkmue.
Destino excluido: defensa umiracgmhjglqoftoljn.

Migración única: 20261120205426_china_origin_coordination.sql.
SHA-256: 3c5fec2c3788367364b76e3967b8ba80cbd2eab841f3db5a9374d6def6cc857f.
No repetir 0001 ni migraciones anteriores. Conservar la versión 20261120205426 asignada por el conector en el historial. El SQL fue aprobado originalmente con nombre 20261120202217; se renombró solo el archivo local, conservando su SHA-256, por decisión del usuario de no modificar el historial remoto.

## Antes

Comprobar destino, historial y ausencia de la versión nueva. Registrar conteos de cargo_requests, offers, operations, documents, auth.users; conservar LC-10004, su oferta y los importes. Verificar checkout apagado. La candidata observada tiene cero operaciones y una oferta LC-10004.

La migración es transaccional. No borra datos ni cambia precios históricos. Nuevas publicaciones requieren origin_plan y el APK actualizado. Congelar publicaciones mientras se coordina el cambio del backend y el cliente; no servir la web nueva antes de tener las tablas nuevas.

## Aplicación

Aplicar solo el SQL de la migración revisada. Registrar su versión exacta únicamente si toda la transacción terminó. Si falla, registrar error y no marcarla aplicada. No activar MP_TEST_ENABLED ni mp_test_settings.enabled como parte de esta aplicación. No cambiar roles ni habilitaciones del operador para simular retiro.

## Después

Comparar conteos y datos anteriores. Revisar RLS, EXECUTE y privilegios de las tablas nuevas: anon sin ejecución/lectura; authenticated con SELECT limitado por dueño/participación, sin INSERT/UPDATE/DELETE directos; helpers internos sin EXECUTE público. Verificar que las RPC originales privadas no puedan invocarse directamente.

Publicar solo la web candidata y actualizar el paquete Android candidato (com.yoshuachavez.fourpack.candidate). Defensa y APK de defensa permanecen intactos.

Ensayar agente y proveedor con sesiones reales. No usar cambios manuales de filas para simular aceptación ni recepción. Para retiro, el operador debe tener habilitado origin_pickup mediante aprobación administrativa real; el operador actual solo tiene international_transport.

La adjudicación Android pasa por award_offer_for_test_checkout: requiere configuración y habilitación temporal autorizada de Mercado Pago. Si falta, registrar bloqueo, sin usar un pago ficticio como evidencia del proveedor. No se implementa cobro de diferencias: una revisión con precio distinto exige conciliación adicional y bloquea el avance económico.
