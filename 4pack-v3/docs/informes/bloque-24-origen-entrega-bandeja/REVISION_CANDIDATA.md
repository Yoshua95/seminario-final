# Alcance de la aplicación candidata

Proyecto único: khtfjogqvtjuxhmzkmue. No aplicar a umiracgmhjglqoftoljn.

La migración nueva agrega cuatro tablas con RLS y lecturas por dueño/participación, RPC de depósito de Argentina y bandeja, reglas de publicación v2, desglose y modalidad de ofertas, aceptación explícita y snapshot de entrega. Cambia la recepción v2 a un hito que conserva los valores declarados. No reescribe registros históricos ni importes, no activa pagos y no despliega funciones Edge.

Antes/después: comparar conteos y fingerprints de las cargas/ofertas, cuentas existentes, roles y banderas. Registrar la versión que asigne el conector y alinear únicamente el nombre local; no modificar el historial remoto ni reejecutar DDL.

Coordinar con web/APK nuevos: el APK anterior no puede publicar solicitudes nuevas v2 y mostrará una actualización requerida. Las lecturas históricas quedan disponibles.

Verificar permisos efectivos, invariantes del total, aceptación de la condición de solo retiro, rechazo de retiro en origen y peso/volumen ausentes, elegibilidad por operador y exclusión de la propia oferta sin afectar a otro operador.

Mercado Pago permanece deshabilitado. No usar la habilitación ficticia del fixture local como evidencia de proveedor.
