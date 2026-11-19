# Guía del recorrido — 4PACK, panel del operador

19/11/2026. Código funcional local: **`4cad7d4ad52e1216f3ade9989a155b506deb4e85`**, rama `codex/4pack-qa-readiness`. Incluye las integraciones locales previas necesarias; no es solo un parche visual.

## Abrir la demostración ya preparada

1. Mantener la web local activa en `http://localhost:3000`. Operador y administrador tienen perfiles de Chrome separados; Android usa el importador. No compartir sus credenciales públicamente.
2. En el perfil del operador, abrir `http://localhost:3000/operador/operaciones/971af114-98ce-46c2-91dc-866ad672c9e0`. Es **OP-1026**, Shenzhen → Buenos Aires, ARS 120.000. Revisar Próximo paso, línea de tiempo, responsable y packing list del hito.
3. Abrir **Ver contrato**: comprobar servicios, inclusiones, exclusiones, plazo y condiciones. Escape cierra el panel y devuelve el foco. **Enviar mensaje** abre el chat privado de esa operación.
4. Abrir `http://localhost:3000/operador/mis-ofertas`: una fila por oferta. La oferta adjudicada permite Ver operación; Ver detalle abre sus condiciones.
5. Abrir `http://localhost:3000/operador/billetera`, cuyo nombre visible es **Cobros**: OP-1026 muestra Pago de prueba, aprobado por backend, ARS 120.000, comisión ARS 3.000 y neto ARS 117.000. Esto no acredita un desembolso bancario. La liberación por hitos continúa no disponible.
6. Abrir `http://localhost:3000/operador/capacidad`: el operador tiene ARS 275.000 comprometidos y ARS 25.000 disponibles dentro de su capital ficticio aprobado. Tiene 4/4 cupos ocupados después del ensayo. No aumentar capital ni cerrar históricos para repetirlo.
7. En el emulador `emulator-5556`, abrir **4PACK 3.0.3**. Se conserva el APK anterior al bloque y Metro permanece apagado. Abrir la misma operación: muestra **Mercado Pago · PRUEBA · Aprobado**. En Hitos aparece el packing list; Evidencia y Mensajes pertenecen al mismo UUID.

El documento de ensayo es ficticio. Su estado documental es pendiente de revisión; el pago aprobado no lo convierte en documento aprobado. El hito no equivale por sí solo a una transición de estado ni a una liberación de dinero.

## Revisar una cotización sin crear otra operación

En `http://localhost:3000/operador/oportunidades`, seleccionar una carga abierta y pulsar **Cotizar**. La ficha queda visible y el panel lateral reutiliza ruta, peso, volumen y modalidad solicitada.

Elegir servicios con el buscador; cambiar la búsqueda no pierde los seleccionados. Se propone un alcance inicial editable. Completar precio ARS, plazo, vigencia y capital propio requerido; revisar advertencias concretas de capacidad. Seguro y documentación tienen opciones rápidas; exclusiones y condiciones están agrupadas. **Revisar oferta** muestra lo que se enviará. **Volver a editar** no publica. Para no agregar datos al ensayo cerrado, no pulsar Enviar oferta durante una revisión visual.

Si el volumen falta, Proponer volumen envía una propuesta. El importador debe confirmarla antes de adjudicar y reservar Capacity. El volumen desconocido no se trata como cero.

La documentación empresarial se encuentra en **Perfil empresarial**. Documentos dejó de ser una entrada principal. Desde **Subir packing list**, la operación y el tipo ya están seleccionados; el archivo general queda disponible como consulta secundaria desde Perfil.

## Pago de prueba: qué se probó y cómo verificarlo sin volver a pagar

- Operación `971af114-98ce-46c2-91dc-866ad672c9e0`.
- Preferencia `3858067934-58de5f3a-27d2-422f-b756-0fcec93ccd45`.
- Pago **`189418265535`**, orden **`46276101328`**, ARS 120.000.
- Se verificaron pago, orden, preferencia, vendedor y comprador desde el backend. Se conservaron `live_mode=true` y la clasificación interna por separado; la API no devolvió `is_test`.
- **Verificar pago con Mercado Pago** reprocesa el intento permitido, sin crear otro checkout. El ensayo repitió la conciliación y conservó un único registro.
- La creación de nuevos checkouts está apagada en base y función. No volver a pagar ni crear otra preferencia para demostrar este resultado. El retorno HTTPS solo abre la app; no acredita el pago.

## APK

Archivo local:

`.4pack-demo/mobile-redesign/build/outputs/apk/release/app-release.apk` (desde la raíz del proyecto).

Versión **3.0.3 / código 4**. SHA-256:

`61b8317b448301a6017343fab705942090d8e524a4534cb6d3e027d6d336b39f`

Para instalarlo en otro emulador de prueba, usar `adb -s <serial> install -r <ruta-del-apk>` y abrir `com.yoshuachavez.fourpack/.MainActivity`. La sesión debe ser de importador; operador y administración usan web. No necesita Metro. No se certificó un dispositivo físico en este bloque. Es un release local con firma de desarrollo existente, no una publicación de Play Store.

## Reproducir el código sin sobrescribir el working tree

Desde la raíz Git, crear otro worktree del commit `4cad7d4ad52e1216f3ade9989a155b506deb4e85`. El monorepo está dentro de `4pack-v3/`. Instalar desde el lockfile en ese entorno nuevo y ejecutar los scripts existentes `npm run typecheck`, `npm run lint --workspace=@4pack/web` y `npm run build:web`.

La configuración local de Supabase se prepara en archivos ignorados por Git. Web y Android deben apuntar a `https://umiracgmhjglqoftoljn.supabase.co`, usando solo la clave pública en clientes. El token de Mercado Pago y las claves de servidor permanecen exclusivamente en el backend; no se incluyen en el checkpoint. No reaplicar migraciones al proyecto: la nueva `20261119140102` ya está registrada una vez.

La demo PGlite es un entorno distinto de Supabase: permite recorrer pantallas con datos locales, pero sus saldos simulados no acreditan el pago del proveedor ni el UUID real de este ensayo.

## Acceso del profesor y planilla

El repositorio público y el PR #11 existen, pero **el código de este checkpoint, el APK y esta guía aún no están publicados** al momento de escribir esta guía. Las URLs locales no son accesibles desde otro equipo por sí solas. El túnel de retorno es temporal y no expone el panel completo.

Para la entrega pública falta publicar el checkpoint y esta documentación, adjuntar el APK con su hash y desplegar/verificar una web de pruebas correspondiente a ese SHA. Las credenciales demo se entregan por un canal privado. No usar la URL de una demo anterior como evidencia de este código. Ver la tabla de enlaces verificados y pendientes en [informe.md](informe.md).
