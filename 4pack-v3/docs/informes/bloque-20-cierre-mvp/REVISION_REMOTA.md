# Revisión de cambios remotos pendientes — solo candidata

Destino exclusivo: `khtfjogqvtjuxhmzkmue`. La defensa `umiracgmhjglqoftoljn` queda fuera.

## Cambios a autorizar

1. Aplicar `20261120142007_mvp_test_delivery_protection.sql`: protección de pago y entrega, documentos por responsable, reclamos y resolución administrativa auditada, privilegios/RLS y próximas acciones respaldadas por datos.
2. Aplicar `20261120143457_mvp_registered_provider_binding.sql`: vinculación privada del proyecto con vendedor/comprador de prueba; conciliación limitada a la preferencia registrada, conservando datos originales del proveedor y evidencia separada.
3. Registrar únicamente estas aplicaciones exitosas con sus versiones fuente exactas en el historial. Nunca insertar una versión fallida ni reejecutar migraciones anteriores. Si el conector asigna un timestamp automático, corregir solo la entrada recién creada, tras verificar su contenido y ausencia de la versión objetivo.
4. Desplegar `document-upload` y `mercado-pago-mvp-test` con JWT obligatorio. Desplegar `mercado-pago-mvp-webhook` sin JWT de usuario porque Mercado Pago no lo envía, pero con HMAC obligatorio validado antes de consultar/procesar el pago. Firma inválida no escribe ni consulta al proveedor.
5. Tras comprobar configuración y cuentas, habilitar temporalmente ambas opciones de creación exclusivamente para el ensayo de una operación nueva; volver a desactivarlas al cerrar o fallar. La conciliación puede procesar solo intentos ya registrados con creación apagada.

## Preflight y orden

- Confirmar Project Ref, historial y estado de checkout false. Consultar conteos de datos antes/después sin publicar datos personales.
- Verificar que no existan las dos nuevas versiones ni tablas de protección parciales. Si existe alguna, detenerse y comparar objetos; no repetir.
- Aplicar cada SQL en transacción separada; comprobar objetos/permisos y registrar solo el éxito.
- Desplegar primero gateway documental, luego función de usuario y webhook; verificar configuración JWT/HMAC, vinculación y secretos por presencia, nunca mostrar valores.
- Configurar retorno HTTPS de la web candidata y esquema Android `fourpack-candidate`; no usar retornos de defensa.
- Verificar acceso por roles, rechazo de escritura directa, documento ajeno, reintentos, pago con referencia/importe incorrectos y notificación duplicada.
- El ensayo externo requiere comprador real de prueba y puede requerir intervención humana en el login/reCAPTCHA. No se elude ese desafío.

El `manifest-revision.json` adjunto contiene SHA-256 de ambos SQL y de todos los archivos de las tres funciones y sus compartidos. Es un expediente de revisión; su existencia no acredita despliegue ni pago externo.

Work configura los secretos por canal privado: `MP_TEST_ACCESS_TOKEN`, `MP_TEST_SELLER_ID`, `MP_TEST_WEBHOOK_SECRET`, `MP_TEST_RETURN_BASE`, manteniendo inicialmente `MP_TEST_ENABLED=false`. No se solicitan secretos en el chat.
