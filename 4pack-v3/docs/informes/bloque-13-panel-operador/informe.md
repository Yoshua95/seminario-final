# Bloque 13 — Panel web del operador y validación Android ↔ web

**19/11/2026. Recorrido funcional PASS en el entorno de pruebas. Publicación para el profesor: pendiente.**

Se rediseñó el panel sobre la rama `codex/4pack-qa-readiness`, conservando el APK actual y las integraciones locales anteriores. Checkpoint funcional: **`4cad7d4ad52e1216f3ade9989a155b506deb4e85`**. SHA de partida: `95a6edbda94902a580c8a0cd564467990d31c5aa`. El checkpoint incluye 87 archivos de código pendientes de etapas anteriores y de esta etapa para que el estado sea reproducible, no solo los cambios visuales. No hubo push, merge ni despliegue web.

El ensayo requirió una corrección adicional de conciliación. La migración y las dos funciones se aplicaron **solo después de autorización expresa** y solo en **4pack-seminario-final / umiracgmhjglqoftoljn**. La creación de checkouts terminó apagada tanto en base como en función.

[Guía del recorrido](guia-recorrido.md) · [Manifiesto de fuentes y APK](manifest.json) · [Registro del checkpoint](evidencia/checkpoint-source.json).

## Qué cambió en la experiencia

| Pantalla | Qué ocurre / qué hacer / cuánto implica |
|---|---|
| Cargas disponibles | Ficha con ruta, mercadería, peso, volumen y modalidad solicitada. Cotizar abre un panel lateral manteniendo la ficha visible. Volumen desconocido mantiene Proponer volumen y la confirmación posterior del importador |
| Cotización | Modalidad, servicios con búsqueda y selección múltiple, precio ARS y plazo primero. Alcance inicial editable derivado de servicios. Opciones rápidas de vigencia, seguro y documentos; exclusiones y condiciones desplegables; excepciones en texto libre. Revisión antes de enviar. El capital propio está separado y muestra motivos concretos cuando faltan cupos, capital, vigencia, peso o volumen |
| Mis ofertas | Una fila por oferta con ruta, importe, plazo, estado y acción. Ver detalle abre alcance y condiciones; una adjudicada lleva a Ver operación. Borradores, retirada y reemplazo siguen disponibles cuando el estado lo permite |
| Operación | Ruta y estado en encabezado, Próximo paso arriba, línea de tiempo conservada. Hitos muestran fecha, responsable registrado y evidencia. Importador, modalidad y precio en el lateral; Ver contrato abre un panel amplio y Enviar mensaje abre el chat de ese UUID |
| Documentación | Dentro de la operación se muestran faltantes, responsable y estado. Subir packing list preselecciona operación y tipo. Se identifica al importador como origen de los datos de mercadería; el operador puede adjuntar el archivo que recibió. La empresa gestiona lo propio desde Perfil empresarial. Documentos dejó de ser navegación principal; el archivo general queda como consulta secundaria |
| Cobros | Reemplaza el nombre Mi Billetera; conserva la ruta `/operador/billetera` para no romper enlaces. Separa pagos de prueba confirmados de saldos del libro simulado, sin presentarlos como dinero retirable. Por operación: importe, comisión, neto y condición de liberación. No inventa fechas estimadas |
| Capacidad | Capital propio disponible para comprometer y ya comprometido en ARS, además de cupos y límites. Sin leyendas genéricas de simulación académica. No confunde capital aprobado con saldo de Mercado Pago ni fondos custodiados |
| Historial | Conserva moneda e importes originales y permite consultar históricos USD, además de operaciones cerradas |

Paleta carbón `#0C0C0E`, grafito `#17181B`, gris `#A9ABB2` y blanco mineral `#F2F2EF`. El tema nuevo queda acotado al panel `.op-app`, sin cambiar el APK ni el tema de las otras áreas web. Cifras tabulares alineadas a la derecha, una acción principal por contexto, controles secundarios neutros y color para estados. Paneles nativos `dialog` conservan Escape, foco y navegación de teclado. Se comprobó escritorio y ancho de 390 px.

El bloque de capital es interno a la decisión del operador en la interfaz. No se creó una nueva política de confidencialidad por columna para el JSON histórico del contrato; se conservaron sus permisos y datos existentes.

## Entorno y registros usados

- Supabase de pruebas: `https://umiracgmhjglqoftoljn.supabase.co`. Web y Android usan el mismo proyecto.
- Web local: `http://localhost:3000`, perfiles Chrome separados de operador y administrador. Se recuperaron las sesiones de cuentas demo existentes sin crear usuarios ni cambiar contraseñas.
- Operador ARS: `fffa6167-bb2c-4c73-8b68-2bf0714db6ba`; importador: `2539778f-297e-4f97-ade2-f3c2abcf0423`.
- Emulador `emulator-5556`, AVD `4PACKReleaseClean37`, Pixel 7/API 37. APK **3.0.3, código 4**, sin recompilar ni reinstalar en este bloque. Se cerró y reabrió para probar persistencia con Metro apagado.
- Se conservó PGlite. La evidencia principal de este recorrido es Supabase real de pruebas; no se presenta la demo local como evidencia del proveedor.

| Registro nuevo | Identificador |
|---|---|
| Carga / código | `a8f4226e-6e36-4c0e-9282-d12b41ef3c2d` / LC-10019 |
| Oferta | `12876e9d-396f-4998-ac4d-3322f5716ca3` |
| Operación común | **`971af114-98ce-46c2-91dc-866ad672c9e0` / OP-1026** |
| Preferencia registrada | `3858067934-58de5f3a-27d2-422f-b756-0fcec93ccd45` |
| Referencia externa | `97dd8a5f-77c5-42a5-99f0-d46a74224329` |
| Pago / orden | **`189418265535` / `46276101328`** |
| Packing list | `4d2321af-e18c-47a0-a200-62372ecaeb67` |
| Hito con evidencia | `7ae855c7-e9df-4be6-a99f-20aa4c7cb5d4` |

## Resultado del recorrido por canal

| Paso | Resultado | Comprobación efectiva |
|---|---|---|
| Preparar carga estándar | **PASS — API** | Carga ficticia creada/publicada mediante RPC del importador con clave de solicitud idempotente. Repuestos, Shenzhen → Buenos Aires, 8 kg, 0,4 m³, FOB USD 1.100. No se afirma que esta publicación haya sido hecha desde Android |
| Cotizar | **PASS — web operador** | Se seleccionaron Transporte internacional y Entrega nacional cambiando la búsqueda; no se perdieron selecciones. Se editó alcance, eligió vigencia rápida y revisó el contenido antes de enviar. Una sola oferta guardada: ARS 120.000, 9 días y capital ARS 25.000. [Evidencia](evidencia/new-quote-1.result.json) |
| Cupo para el ensayo | **PASS — web admin** | Tenía 3/3 cupos ocupados. Con autorización se modificó solo el máximo ficticio a 4. Se verificó el UUID antes de guardar y se compararon límites monetarios/vigencias: sin cambios. [Evidencia](evidencia/fourth-slot.result.json) |
| Adjudicar | **PASS — APK** | Importador eligió la oferta y confirmó la adjudicación. Contrato, garantía y reserva en ARS; FOB conserva USD 1.100. Mismo UUID en ambos clientes |
| Abrir checkout nuevo | **PASS — APK + backend** | Android abrió una sola preferencia sandbox por ARS 120.000. Se habilitaron flags de prueba con vencimiento automático y se apagaron al abrirla. El comprador ingresó en la pantalla oficial por intervención del usuario; credenciales fuera del chat/Git |
| Pago nuevo | **PASS — sandbox y API del proveedor** | Se usó la Visa oficial de prueba terminada en 3704 ya guardada en el comprador de prueba. Mercado Pago informó aprobado. No se utilizó una tarjeta real ni se creó otro pago para superar el rechazo inicial |
| Verificación previa al guardado | **PASS — backend, solo lectura** | Se verificaron por GET autenticado pago, orden, preferencia y cuentas. Los 26 controles pasaron. Antes/después de inspeccionar había cero pagos nuevos persistidos. [Inspección](evidencia/inspect-registered.result.json) |
| Conciliar y repetir | **PASS — backend** | Dos conciliaciones devolvieron `approved`, conservando un único registro del pago `189418265535`. Se preservó `provider_live_mode=true` y se guardó clasificación/evidencia por separado. [Evidencia](evidencia/reconcile-registered.result.json) |
| Packing list contextual | **PASS — web + gateway** | Operación y tipo estaban preseleccionados; el archivo pasó por `document-upload`. Hay un documento, estado `pending`, no aprobado administrativamente. El primer chequeo del runner se adelantó a la respuesta; se consultó antes de repetir y no se subió otra copia |
| Hito con responsable y evidencia | **PASS — web y base** | Carga recibida en origen, Shenzhen, fecha registrada, actor operador ARS y `attachment_id` del packing list del mismo UUID. El texto identifica el ensayo como ficticio |
| Contrato, chat y navegación | **PASS — web** | Detalle contractual correcto; Escape devuelve foco. Se envió un mensaje ficticio de esta operación sin duplicarlo en la repetición del ensayo |
| Seguimiento al reabrir | **PASS — APK** | Tras force-stop y apertura, muestra Confirmada, **Mercado Pago · PRUEBA · Aprobado**, mismo título/ruta y hito con Abrir evidencia. Metro apagado; hash de APK intacto |
| Cobros y Capacity | **PASS — web/base** | OP-1026: total ARS 120.000, comisión ARS 3.000, neto ARS 117.000. Reserva activa: ARS 25.000 de capital, 8 kg y 0,4 m³. Uso total del operador: 4 operaciones, exposición ARS 800.000, capital ARS 275.000; disponible ARS 25.000 |
| Discrepancia y rol sin autorización | **PASS — Supabase** | Importe alterado rechazado con `P0001: Pago incompatible con el contrato de prueba`; RPC desde rol cliente rechazada con `42501`. Un pago aprobado antes/después, sin cambio de importe/estado. [Evidencia](evidencia/negative-payment.json) |
| Acceso horizontal | **PASS — Supabase** | Otro operador demo ve cero documentos de la operación y cero ofertas competidoras; no puede firmar una URL del objeto ni registrar un hito ajeno (`P0001: La operación no pertenece al operador`). [Evidencia](evidencia/permission-checks.result.json) |
| Histórico USD | **PASS — SQL administrativo de lectura** | Reserva `61000000-0000-0000-0000-000000000001` intacta: USD 565, `requires_review`, capital requerido NULL. No se fabricó capital ni se liberó esa reserva. [Postflight](evidencia/postflight.json) |
| Volumen desconocido | **PASS — regresiones automatizadas; ensayo real previo conservado** | Este ensayo nuevo usa volumen conocido. Las seis pruebas PGlite mantienen publicación NULL, permisos, confirmación del dueño y rechazo antes de reservar. No se declara un segundo ensayo de interfaz con NULL en este bloque |

No se completó la entrega ni se liberó la reserva nueva: la operación se dejó activa para revisión. No se probó un dispositivo físico ni un retiro bancario. La liberación por hitos sigue **no disponible** y está señalada en el flujo de pago, sin prometer retención/desembolso real de Mercado Pago.

## Fallo real encontrado y solución autorizada

La primera conciliación del pago nuevo falló: HTTP **409**, etapa **`payment.validate`**, código **`PAYMENT_CONTRACT_MISMATCH`**, `test_mode=false`. Vendedor, referencia, moneda, importe e ID coincidían. [Error inicial](evidencia/sync-new-payment.result.json).

El detalle autenticado devolvió `status=approved`, `live_mode=true` y **ningún `is_test`**. [Respuesta sanitizada](evidencia/inspect-new-payment-detail.result.json). No se convirtió `live_mode` a false ni se inventó un campo. La excepción anterior solo permitía la operación vieja; por eso no resolvía el pago de OP-1026.

Se preparó y ensayó la corrección, luego se pidió autorización. La función nueva prueba la cadena pago → orden → preferencia registrada, metadata de la operación, marca de prueba, precio/moneda, vendedor argentino `test_user` y comprador esperado distinto. El comprador se verifica por ID/país contra la identidad de prueba confirmada por el titular; la API pública no expone su etiqueta test y queda registrado `buyer_test_user_tag=false`, sin atribuirle una certificación inexistente.

Se permite inspección sin escrituras y conciliación solo desde backend. Tanto la operación como el pago a conciliar están acotados por configuración del servidor; no se aceptan IDs de pago, importe, moneda o preferencia suministrados por el cliente. La ruta del pago histórico anterior se conserva. No se vuelve a crear una preferencia al sincronizar.

## Migración y funciones efectivamente aplicadas

Único destino: **`umiracgmhjglqoftoljn`**. No se reaplicaron `0001–0024` ni otras migraciones previas.

- Nueva migración: `20261119140102_mp_registered_test_preference_evidence.sql`, registrada **una vez**.
- SHA-256 SQL: **`8af4c50d612f423f07930357535630f502e1cbe8e684bef2e7843436dcc19c5a`**.
- Redefine solo `record_mp_test_payment`; conserva permisos exclusivos de servicio y controles de contrato/identidad/evidencia. `anon` y `authenticated` sin EXECUTE; `service_role` con EXECUTE. La aplicación de la migración preservó los conteos y el histórico completos. [Aplicación](evidencia/migration-applied.json).
- `mercado-pago-test`: versión activa final **36**, JWT obligatorio.
- `mercado-pago-reconcile-registered-test`: versión activa final **4**, JWT obligatorio. [Metadatos verificados](evidencia/functions-proof.json). Los cambios de configuración también actualizaron las versiones; corresponden a las mismas fuentes del checkpoint.
- Ambos flags terminaron apagados. [Comprobación](evidencia/flags-final.json).
- No se extrajo ni volvió a pedir el Access Token. Se usó el secreto ya configurado. Credenciales y runner privado quedan fuera del código/documentación publicada.

Se requirió ajustar la respuesta del reconciliador para devolver el `status` persistido que espera el APK; se cubrió con una prueba del adaptador antes de la verificación final. El APK no se recompiló. [Revisión y orden aprobado](revision-conciliacion.md).

## Archivos y símbolos relevantes

| Archivo / grupo | Cambio |
|---|---|
| `apps/web/src/features/operator/quote-composer.tsx` | `QuoteComposer`: composición progresiva, búsqueda, presets, revisión y capital interno; usa la acción/RPC existente |
| `operator/drawer.tsx` | `Drawer`: panel lateral/amplio con foco, Escape y cierre accesible |
| `operator/journey.ts` | `capacityWarnings`, `nextOperationStep`, `collectionSummary`: advertencias y separación ARS/saldos simulados |
| `operator/offers-list.tsx`, `quote-editor.tsx` | Tabla de ofertas, detalle en panel; conserva borradores, retirada y reemplazo |
| `operator/collections.tsx` | Cobros, netos/comisiones/condiciones reales del sistema; retiros reales no se inventan |
| `operator/panel.tsx`, `forms.tsx`, `shell.tsx` | Ficha y cotización contextual; Próximo paso, responsable del hito, contrato/chat y documentación; navegación Cobros sin Documentos |
| `operator/data.ts`, `types.ts` | Lectura de pagos verificados usando la sesión del operador y RLS; error de consulta se distingue de cero pagos |
| `features/capacity/view.tsx` | Capital propio disponible/comprometido; vigencia y revisión impiden una disponibilidad optimista |
| `features/marketplace/quote-terms.tsx` | Detalle público sin bloque interno de capital; contrato original se preserva |
| `app/operator-journey.css`, `app/layout.tsx` | Tema acotado, cifras, paneles, jerarquía y adaptación móvil |
| `supabase/functions/mercado-pago-reconcile-registered-test/index.ts` | Inspección/conciliación de preferencia registrada; solo GET al proveedor y escritura vía RPC autorizada |
| `supabase/functions/mercado-pago-test/index.ts`, `_shared/mercado-pago-linked-test.mjs` | Puente de sincronización con creación apagada y verificación con contexto derivado del servidor; caso anterior conservado |
| `supabase/migrations/20261119140102_mp_registered_test_preference_evidence.sql` | Evidencia completa para un pago de prueba nuevo, sin reescribir señal del proveedor |
| `tests/operator-journey.test.mjs`, `mercado-pago-registered-test.test.mjs`, `mercado-pago-registered-http.test.mjs` | Capital/cobros, RPC real en PGlite y límites del endpoint, discrepancias, inspección e idempotencia |

El checkpoint también conserva los archivos de etapas previas necesarios para compilar y reproducir el MVP; el [registro](evidencia/checkpoint-source.json) enumera los 87 archivos. `tests/ars-only.test.mjs` solo recibió una normalización de línea vacía final durante el guardado. No se atribuye todo ese diff a este rediseño.

## Validaciones ejecutadas

| Comando | Resultado |
|---|---|
| `node --test tests/operator-journey.test.mjs tests/unknown-volume.test.mjs tests/ars-only.test.mjs tests/mercado-pago-database.test.mjs tests/mercado-pago-linked-test.test.mjs tests/mercado-pago-linked-http.test.mjs tests/mercado-pago-registered-test.test.mjs tests/mercado-pago-registered-http.test.mjs tests/mercado-pago-http.test.mjs` | **84/84 PASS**, 0 fallos, ~4,82 s. [Salida](evidencia/tests-final.log) |
| `npm.cmd run test:domain` | **12/12 PASS**, TypeScript de pruebas y casos de dominio/ofertas. [Salida](evidencia/domain.log) |
| `npm.cmd run typecheck` | **PASS**, mobile/web/dominio, salida 0. También se ejecutó el chequeo individual web. [Salida](evidencia/typecheck-all.log) |
| `npm.cmd run lint` | **PASS**, sin autofix; el workspace con lint es web. También se ejecutó su comando individual. [Salida](evidencia/lint-all.log) |
| `npm.cmd run build:web` | **PASS**, Next.js 16.4.6, compilación y TypeScript de producción. [Salida](evidencia/build-final.log) |
| Runner Playwright con sesiones reales | **PASS**, sin errores de JS; sin desbordamiento en las cuatro vistas medidas y a 390 px; contrato/chat/foco. [Resultado](evidencia/ui-checks-final.result.json) |
| APK existente, cierre y reapertura por ADB | **PASS**, Aprobado e hito persistidos; sin Metro. Capturas abajo |
| Inspección/conciliación y repetición en Supabase | **PASS**, pago único; discrepancia y rol cliente rechazados; histórico preservado |

**96 casos automatizados distintos en las dos primeras filas.** Las ejecuciones intermedias de 59/35 casos se superponen con ese total y no se suman otra vez. No se ejecutó la suite global completa ni se generó un APK nuevo en este bloque. Los builds/tests generaron artefactos locales habituales; no se incluyen cachés ni runners privados en Git.

Fallos intermedios corregidos: imports sin uso detectados por lint; sesión web caducada recuperada sin cambiar cuentas; comprobación del runner adelantada a la subida documental (se verificó el resultado antes de reintentar); respuesta del reconciliador sin `status` del adaptador corregida/probada. Al crear el checkpoint se detectaron una línea vacía final y ausencia de identidad Git; se corrigió whitespace y se usó identidad Codex solo para el comando, sin alterar configuración global. No quedan fallos funcionales reproducidos en el recorrido descrito.

## APK conservado

Ruta relativa al proyecto: `.4pack-demo/mobile-redesign/build/outputs/apk/release/app-release.apk`.

**3.0.3 / código 4**, SHA-256 **`61b8317b448301a6017343fab705942090d8e524a4534cb6d3e027d6d336b39f`**. Coincide con el APK previo al bloque. No se modificaron pantallas Android, no hubo build ni instalación limpia nueva; se validó la instalación ya existente al reabrirla sin Metro. Es release local con firma de desarrollo, no Play Store.

## Capturas

- [Cargas disponibles](capturas/oportunidades-final.png) · [Panel de cotización](capturas/cotizar.png) · [Revisión antes de enviar](capturas/oferta-revision.png).
- [Mis ofertas](capturas/mis-ofertas-final.png).
- [Operación, responsable y documentos](capturas/operacion.png) · [Contrato](capturas/contrato.png) · [Chat](capturas/chat.png).
- [Cobros con pago nuevo aprobado](capturas/billetera-final.png) · [Capacidad](capturas/capacidad-final.png) · [Cobros a 390 px](capturas/cobros-390.png).
- [APK reabierto: Aprobado](capturas/b13-android-pago-aprobado.png) · [APK: hito y evidencia](capturas/b13-android-hito.png).

Son capturas de 4PACK con datos ficticios; no se guardaron capturas del formulario financiero de Mercado Pago ni credenciales del comprador.

## Pendientes y alcance de la entrega pública

1. **Publicación del checkpoint, guía, APK y web correspondiente al SHA.** El repositorio público y PR existen, pero el remoto seguía en `15f966226679ee6e72b18631e7193786f514065d` cuando se verificó. No acreditar el rediseño con esa versión anterior.
2. **Liberación por hitos no disponible.** Pago de prueba aprobado no es escrow ni desembolso al operador. Los saldos simulados están rotulados en su pantalla. No se probaron retiros reales ni se procesó dinero real.
3. **Acceso del profesor.** URLs locales requieren esta notebook; no se proporcionaron contraseñas públicas. Hace falta publicar/verificar un entorno web de pruebas y entregar acceso demo por canal privado. El túnel HTTPS de retorno es temporal y solo expone esa ruta, no el panel.
4. **Pruebas físicas y ramas adicionales.** Dispositivo físico, auditoría completa de accesibilidad, entrega/cierre de esta operación y controversias integrales no forman parte de lo acreditado aquí.
5. **Límites de prueba.** Se mantiene el cuarto cupo autorizado. Los cuatro quedan ocupados y el capital disponible es ARS 25.000. Una nueva adjudicación puede ser rechazada legítimamente por cupos/capital; no se elevan ni se liberan automáticamente para la demo.
6. La conciliación registrada está restringida al proyecto y a identidades de prueba conocidas, una operación permitida y el pago autorizado. No se presenta como integración productiva general de cobros.
7. Los scripts antiguos `operator-browser.test.mjs` y `multirole-browser.test.mjs` conservan selectores del diseño anterior y requieren adaptación antes de usarlos como regresión del panel nuevo. No se ejecutaron ni se declaran aprobados. Las comprobaciones de interfaz acreditadas aquí son las del runner con sesiones reales y los resultados/capturas adjuntos; el CI actual ejecuta typecheck, lint y build, no esos scripts de navegador.

## Evidencia para la planilla

| Entregable | Evidencia disponible | URL pública verificada |
|---|---|---|
| Repositorio público | API de GitHub confirmó `private=false` | [Yoshua95/seminario-final](https://github.com/Yoshua95/seminario-final), **no acredita todavía este checkpoint** |
| PR #11 | Abierto; HEAD remoto verificado `15f9662…` | [PR #11](https://github.com/Yoshua95/seminario-final/pull/11), versión previa |
| Código funcional de este bloque | Commit local `4cad7d4…`, fuentes y hashes | **pendiente de publicación** |
| Panel y operación nueva | Web local, capturas y OP-1026 con evidencia backend | **pendiente de publicación** |
| APK probado sin Metro | APK existente 3.0.3, hash y capturas de Aprobado | **pendiente de publicación** |
| Guía para el profesor | `guia-recorrido.md` y este informe | **pendiente de publicación** |
| Pago de prueba e idempotencia | Pago nuevo, cadena verificada y dos confirmaciones sin duplicar | Evidencia local sanitizada; **pendiente de publicación** |

La URL de demo anterior configurada en el repositorio no se verificó como despliegue de este SHA y no se incluye como entrega aprobada en la planilla. Video sigue diferido.
