# Handoff a Work — preparar el backend candidato separado

Este paquete es de **revisión y preparación**, no un despliegue automático ni una candidata aprobada.

## Destino

Crear/identificar un proyecto Supabase separado de `4pack-seminario-final`. **No aplicar las migraciones nuevas en `umiracgmhjglqoftoljn`**, no alterar su configuración ni sus pagos. Registrar nombre, Project Ref y URL del destino antes de escribir.

Para clonar datos/identidades existentes, usar respaldo lógico actualizado y restauración por canal privado. No incluir respaldo, contraseñas, tokens ni sesiones en este paquete ni en Git. Validar la conservación de las identidades y datos ficticios necesarios en el destino. No reutilizar una exportación antigua como si representara el estado actual. Un clon por herramienta de infraestructura no implica que se hayan copiado automáticamente Auth, Storage, archivos, secretos o historial: comprobarlos.

## Esquema

1. Comparar historial y objetos del clon con los SQL versionados del paquete. No repetir DDL de migraciones ya existentes ni reparar el historial a ciegas.
2. Sobre la base equivalente a la defensa, las migraciones candidatas son, en orden:
   - `20261119180708_offer_capital_reservations.sql`
   - `20261119181203_capital_requests_admin_workbench.sql`
   - `20261119221524_capital_profile_consistency.sql`
   - `20261119225500_accept_offer_test_checkout.sql`
3. Revisar/aplicar únicamente al clon después del preflight y con las versiones exactas. Mantener históricos USD y reservas `requires_review` sin inventar capital.
4. No aplicar `supabase/demo/*`: son fixtures del adaptador PGlite, no una semilla remota segura.
5. Comprobar roles, RLS, grants, RPC, idempotencia, documentos privados y capital. Reconciliar ofertas anteriores antes de mostrarlas como respaldadas.

## Auth, documentos y clientes

- Comprobar cuentas demo separadas de importador, operador ARS y administrador; UUID/roles correctos. No duplicarlas si se restauraron.
- Confirmar bucket privado `documents`, objetos/vínculos y gateway `document-upload` con JWT y permisos por propietario/participante.
- Devolver solo el nombre/Project Ref/URL como identificación pública. Configurar URL y publishable key para web y Android mediante archivos locales ignorados. Credenciales Auth y secretos de servidor fuera del chat y Git.
- La web candidata debe correr con Supabase real; no activar `FOURPACK_MULTIROLE_DEMO` ni usar PGlite para aparentar conectividad Android.

## Mercado Pago: no desplegar sin revisar los pines

1. Mantener `MP_TEST_ENABLED=false` y `mp_test_settings.enabled=false` durante la preparación.
2. Configurar el vendedor/comprador argentinos de prueba y retorno HTTPS candidato por canal privado. No copiar sesiones del navegador ni credenciales al paquete.
3. Inspeccionar las funciones y RPC: existen pines de proyecto, operación y pago anteriores. Preparar el ajuste para el **Project Ref nuevo** sin quitar verificaciones de vínculo, vendedor, modo de prueba, referencia, moneda e importe. No reutilizar preferencias ni pagos de operaciones históricas como evidencia nueva.
4. En particular, revisar el puente de `mercado-pago-test`, `mercado-pago-reconcile-registered-test` y `record_mp_test_payment`. Las funciones de conciliación restringidas a pagos anteriores no deben desplegarse sin cambios como una solución genérica del clon.
5. Habilitar temporalmente solo en el clon cuando configuración, APK y retorno estén verificados. Después de crear la preferencia, coordinar la desactivación de creación y la allowlist de conciliación de **esa operación y ese pago**. Mantener el valor original `live_mode` y la evidencia interna, sin inventar `is_test`.
6. Confirmar por backend y repetir: mismo UUID/preferencia/pago; un solo registro aprobado. Apagar ambas opciones al terminar, también si el ensayo falla.

## Criterio de retorno a Codex

Informar nombre/Ref/URL del clon, migraciones confirmadas, estado Auth/Storage/gateway, configuración de las funciones de prueba y ubicación privada de las variables locales. No informar tokens ni contraseñas.

Con ese destino se podrá generar el APK candidato, instalarlo, ejecutar «Aceptar oferta y pagar» y acreditar los pasos Android → web → proveedor. Mientras falte, el informe permanece bloqueado y la defensa no se reemplaza.
