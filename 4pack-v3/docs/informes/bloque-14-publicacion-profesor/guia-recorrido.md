# Guía para revisar 4PACK desde otra PC

Versión funcional: [`e3ed416`](https://github.com/Yoshua95/seminario-final/commit/e3ed41606e20df02c96230a202a06ebfd9898918). Backend: Supabase **de pruebas** `4pack-seminario-final`. No requiere la notebook ni Metro para navegar la web o ejecutar el APK.

## Accesos

- Web pública: https://seminario-final-five.vercel.app
- Operador: https://seminario-final-five.vercel.app/acceso
- Administración, enlace interno separado: https://seminario-final-five.vercel.app/admin/acceso
- [Descargar APK Android 3.0.4](https://github.com/Yoshua95/seminario-final/releases/download/v3.0.4-seminario-b14/4PACK-3.0.4-Android.apk).
- [Informe y evidencia](informe.md).

Las cuentas demo y sus contraseñas se entregan por un canal privado. El importador usa Android; operador y administrador usan web. Usar perfiles de navegador separados o ventanas privadas independientes para no mezclar sesiones. Una cuenta operador no tiene acceso administrativo.

## Recorrido de lectura recomendado

1. Ingresar como operador con la cuenta ARS provista por el responsable de la demo.
2. Abrir **Operaciones** y OP-1026. Revisar ruta, hito «En tránsito», estado contractual «Confirmada» y **Próxima acción: Adjuntar Factura comercial — Importador**. «Solicitar documento» abre el chat de esa operación.
3. En **Mis ofertas**, buscar LC-10019 y abrir **Ver detalle**. Precio ARS 120.000, nueve días y vigencia arriba; alcance, inclusiones/exclusiones y condiciones debajo. Escape cierra y devuelve foco al botón.
4. En **Cobros**, revisar ARS 240.750 disponibles por operaciones completadas y ARS 780.000 pendientes. Ambas tarjetas dicen **Saldo de prueba**. El detalle de cobros aprobados al comprador no es saldo retirable.
5. En **Operaciones**, filtrar completadas y abrir OP-1016: cierre/liberación registrados y sin tarea pendiente.
6. En otro perfil de navegador, ingresar por el enlace administrativo. Revisar empresas/operadores y Capacity sin cambiar límites para la revisión visual.
7. Instalar el APK, habilitando instalación desde esa fuente si Android lo solicita. Abrir e ingresar con la cuenta importadora provista. No necesita Metro. En OP-1026 comprobar el hito y **Mercado Pago · PRUEBA · Aprobado**.

OP-1026: `971af114-98ce-46c2-91dc-866ad672c9e0`.
OP-1016: `72fc5f22-4953-4d81-bfed-cf8f77147ccc`.

**No repetir el pago de OP-1026**: el pago aprobado ya registrado es `189418265535`. La creación de checkouts permanece apagada. No usar dinero ni tarjetas reales. La liberación real por hitos aún no está disponible; los saldos del libro son de prueba.

SHA-256 del APK: `576953098fdb02f73b83fbb5f96de38857d50a684172d42a80637e1150c7ebc3`.

La descarga fue verificada sin sesión GitHub. El APK fue probado en emulador Pixel 7; falta ensayo en un teléfono físico y en la PC del profesor. El sistema requiere conexión a Internet al Supabase de pruebas. No hay contraseñas incluidas en el APK, la guía ni el repositorio.
