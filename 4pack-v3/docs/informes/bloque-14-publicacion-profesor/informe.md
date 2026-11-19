# Bloque 14 — Publicación para revisión del profesor

Fecha: 19/11/2026. Rama: `codex/4pack-qa-readiness`.

## Resultado

**PASS:** web publicada, acceso público sin login de Vercel, autorización por rol, APK release descargable y probado sin Metro. No se repitió el pago de OP-1026. No hubo merge, migraciones ni despliegues de funciones Supabase en este bloque.

Partida funcional: `4cad7d4ad52e1216f3ade9989a155b506deb4e85`; HEAD inicial documental: `256e46735e769608be9f12d9b07f72338852c710`. Checkpoint funcional publicado: [`e3ed41606e20df02c96230a202a06ebfd9898918`](https://github.com/Yoshua95/seminario-final/commit/e3ed41606e20df02c96230a202a06ebfd9898918). Este informe se versiona después del checkpoint; el APK y el despliegue corresponden al código funcional indicado, no a un SHA documental posterior.

## Enlaces verificados

| Entregable | Evidencia disponible | URL pública verificada |
|---|---|---|
| Web | HTTP 200, portada y sesiones nuevas | https://seminario-final-five.vercel.app |
| Operador | Login público y panel con Auth real | https://seminario-final-five.vercel.app/acceso |
| Administración | Acceso separado; operador rechazado por servidor | https://seminario-final-five.vercel.app/admin/acceso |
| APK Android 3.0.4, código 5 | Descarga anónima, SHA-256 e instalación comprobados | https://github.com/Yoshua95/seminario-final/releases/download/v3.0.4-seminario-b14/4PACK-3.0.4-Android.apk |
| Release | APK asociado al checkpoint | https://github.com/Yoshua95/seminario-final/releases/tag/v3.0.4-seminario-b14 |
| Código | Repositorio público, push normal QA | https://github.com/Yoshua95/seminario-final/commit/e3ed41606e20df02c96230a202a06ebfd9898918 |
| PR existente | #11 abierto, sin merge | https://github.com/Yoshua95/seminario-final/pull/11 |
| CI del checkpoint | `validate`: success | https://github.com/Yoshua95/seminario-final/actions/runs/44582462721/job/135766441770 |
| Guía | Archivo de este bloque, publicado con el informe | [guia-recorrido.md](guia-recorrido.md) |

La prueba de acceso público usó HTTP sin autenticación y contextos Chrome limpios contra el dominio HTTPS. No se hizo una prueba física desde una segunda PC. El lector de páginas externo disponible devolvió un error interno; ese resultado no se presenta como una validación externa exitosa. El dominio público respondió 200 por HTTP directo sin cookies ni bypass de Vercel.

## Cambios por archivo y decisión

| Archivos | Cambio y motivo |
|---|---|
| `apps/web/src/features/operator/workbench-state.ts` | Cálculo neto sobre liberaciones registradas, débitos y garantías; tareas derivadas de hitos, documentos, pago y Capacity. No transforma cobros brutos en saldo disponible. |
| `collections.tsx` | Dos tarjetas netas ARS verde/naranja, ambas «Saldo de prueba»; pagos aprobados en un detalle secundario. |
| `operation-row.tsx`, `panel.tsx` | Etapa física, estado contractual, último hito, responsable y próxima acción. OP-1026 muestra «En tránsito» por un hito real y «Confirmada» como estado contractual. «En aduana» exige un hito correspondiente. |
| `offer-detail.tsx`, `offers-list.tsx` | Precio, plazo y vigencia primero; alcance, inclusiones/exclusiones, condiciones y documentación agrupados. |
| `drawer.tsx` | Conserva diálogo nativo, Escape y retorno de foco; apertura contextual del chat. |
| `app/review-delivery.css` | Jerarquía, cifras, separadores y colores de estado del bloque. |
| `components/brand-mark.tsx`, `dashboard-shell.tsx`, `operator/shell.tsx`, `app/layout.tsx`, `public/branding/*` | Marca aprobada del ZIP en operador, administración y portada; favicon. El bitmap original se conserva: el componente recorta únicamente la leyenda de muestra ubicada debajo del logo. |
| `components/public-landing.tsx`, `app/page.tsx` | Portada con acción principal «Ingresar como operador», sin acceso administrativo en el menú público. |
| `components/access-form.tsx`, `app/acceso/page.tsx`, `app/admin/acceso/page.tsx`, `proxy.ts` | Entradas separadas, comprobación de usuario/rol del servidor y cierre de sesión si el rol no corresponde al formulario. El panel administrativo conserva su validación propia. |
| `apps/mobile/features/importer/brand.tsx`, `ui.tsx`, `app/login.tsx`, `assets/branding/4pack-logo.png` | Misma marca aprobada en login y pantallas del importador; sin modificar pagos ni el recorrido de negocio Android. |
| `apps/mobile/package.json`, `app.json`, `android/app/build.gradle`, `package-lock.json` | Versión 3.0.4 / código 5 para identificar el APK de esta entrega. |
| `tests/operator-delivery.test.mjs` | Seis pruebas de saldos, moneda, hitos, responsables, documentos y pago pendiente. |

Las rutas abreviadas de la tabla pertenecen a `apps/web/src/features/operator/`, salvo indicación explícita. El diff exacto está en el commit enlazado.

## Datos usados y resultados

Supabase compartido con Android y web: **4pack-seminario-final**, `umiracgmhjglqoftoljn`. No se cargaron claves de servidor ni secretos Mercado Pago en Vercel: únicamente URL y clave pública publishable del proyecto.

| Comprobación | Resultado observado |
|---|---|
| Cobros disponibles | **PASS**: ARS 240.750 = liberación neta registrada ARS 243.750 menos débito ARS 3.000. Se exige operación completada y garantía liberada. |
| Cobros pendientes | **PASS**: ARS 780.000 netos de cuatro operaciones, con condición de completar servicio/confirmar entrega; controversia requiere resolución. No son fondos bancarios retirables. |
| OP-1026 | **PASS**: UUID `971af114-98ce-46c2-91dc-866ad672c9e0`, ARS 120.000; último hito «En tránsito», tarea «Adjuntar Factura comercial», responsable Importador, naranja. No se inventó hito aduanero. |
| OP-1016 completada | **PASS**: UUID `72fc5f22-4953-4d81-bfed-cf8f77147ccc`; cierre/liberación registrados, sin tarea pendiente, verde. |
| Oferta LC-10019 | **PASS**: ARS 120.000, nueve días, vigencia 22/11; alcance y condiciones legibles; Escape cierra y devuelve foco a «Ver detalle». |
| Operador → administración | **PASS**: sesión nueva del operador ARS redirigida desde `/admin` a `/operador/oportunidades`. |
| Anónimo → administración | **PASS**: redirección a `/admin/acceso`; formulario público responde 200. |
| Administrador | **PASS**: sesión nueva abre Panel administrativo. |
| Marca | **PASS**: logo aprobado visible en web y APK; capturas adjuntas. |
| Android limpio | **PASS**: usuario Android descartable 11, datos de app independientes, login con la cuenta ficticia visual existente; llegó a Inicio. Metro apagado. |
| Android sesión existente | **PASS**: usuario Android 0, cierre y reapertura del proceso, sesión recuperada y OP-1026 muestra «Mercado Pago · PRUEBA · Aprobado». Metro apagado. |
| Pago OP-1026 | **PASS de lectura**, sin crear ni reprocesar un pago: un registro aprobado `189418265535`; el ensayo y la idempotencia anteriores están en el bloque 13. |
| Checkout desactivado | **PASS**: `mp_test_settings.enabled=false` y secreto de función `MP_TEST_ENABLED=false`, reverificados al finalizar las pruebas. |

Las sesiones web nuevas fueron autenticadas con OTP real generado para las cuentas demo existentes dentro del runner privado. Se comprobó la autorización del servidor con esas sesiones; no se simula el rol en el navegador. No se publican contraseñas. La entrada Android se comprobó por el formulario real con contraseña temporal de la cuenta visual autorizada, mantenida en memoria. No se restablecieron contraseñas del operador ni del administrador.

## Pruebas y comandos ejecutados

| Comando | Resultado |
|---|---|
| `node --test tests/operator-delivery.test.mjs` | **PASS 6/6**, repetido después del ajuste de etapa física. |
| `npm.cmd run typecheck` | **PASS**, workspaces web/mobile/domain. |
| `npm.cmd run lint` | **PASS**, sin autofix. |
| `npm.cmd run build:web` | **PASS**, Next 16.4.6. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-android-release.ps1 -Task Assemble -ArtifactName block14` | **PASS**, `:app:assembleRelease`, con red, 125,7 s, 695 tareas. |
| `adb -s emulator-5556 install -r <APK>` + instalación habilitada en usuario limpio | **PASS**; login limpio y reapertura con sesión existente, sin Metro. |
| `node .4pack-demo/block14/job.mjs .4pack-demo/block14/check-final-local.input.json` | **PASS**, seis vistas, saldos, permisos, Escape/foco; sin errores JavaScript observados. |
| `node .4pack-demo/block14/job.mjs .4pack-demo/block14/check-public.input.json` | **PASS**, mismas comprobaciones contra la publicación HTTPS con sesiones nuevas. |
| `node .4pack-demo/block14/android-existing.mjs` | **PASS**: aprobado visible, login no requerido tras reabrir, Metro no utilizado. |
| `git diff --cached --check` y revisión de candidatos | **PASS**; se excluyeron `.env`, datos, sesiones, ZIPs, APK y artefactos generados. |
| `git push origin codex/4pack-qa-readiness` | **PASS**, push normal de `15f9662` a `e3ed416`; PR #11 actualizado por el push. |
| Vercel CLI oficial 66.2.0: `deploy <exportación Git> --project seminario-final --prod --yes` | **PASS**, despliegue `dpl_HyRbgPCKD2R4bCVUKAhUeYovnGUH`, build remoto 42 s, estado Ready. |
| Descarga anónima del APK y SHA-256 | **PASS**, coincide con el APK local; 90.554.477 bytes. |

Los runners privados quedan ignorados; los resultados sanitizados y capturas se incluyen en `evidencia/`. Las seis pruebas de lógica quedan versionadas y reproducibles. No se afirma haber repetido aquí toda la batería PGlite, la conciliación del proveedor ni un pago nuevo. La CI del checkpoint terminó en success, con sus comprobaciones propias.

## APK y publicación

APK local: `.4pack-demo/block14/build/outputs/apk/release/app-release.apk`.

SHA-256: `576953098fdb02f73b83fbb5f96de38857d50a684172d42a80637e1150c7ebc3`.

Build release autónomo con arquitecturas `x86_64` y `arm64-v8a`; se mantiene la firma debug existente del proyecto para distribución académica directa. No es una publicación Play Store. La comprobación Android fue en emulador Pixel 7, no dispositivo físico.

Vercel se publicó explícitamente en el proyecto existente `seminario-final`, conservando la rama de producción Git `main` y sin merge. Se ajustó su Root Directory a `4pack-v3/apps/web` y se mantuvo acceso a los paquetes compartidos del monorepo. El despliegue se hizo desde una exportación del checkpoint, no desde el working tree con archivos privados. Continúa desactivado el autodeploy Git de la rama QA. El dominio «production» de Vercel muestra este **entorno académico de pruebas**, no un servicio comercial con pagos reales.

## Incidencias y límites

- Primeros intentos del automatizador Android fallaron por foco incorrecto y límite de captura de ADB, no por una corrección funcional de Auth. Se corrigió el runner privado y se repitió hasta obtener login exitoso. No se publican capturas de esos campos ni entradas privadas.
- Vercel rechazó clasificar variables `NEXT_PUBLIC_` como Secret. Se configuraron como Config, apropiado para URL/clave publishable. No se trasladaron secretos de servidor.
- OP-1026 sigue contractual `confirmed`, aunque existe un hito físico «En tránsito». La web muestra ambos datos sin modificar su historial; completar el recorrido requiere la documentación pendiente y las acciones legítimas restantes.
- Los importes disponibles son del libro de prueba, no una acreditación bancaria. La liberación real por hitos sigue sin implementarse; se informa en su punto de uso.
- Las credenciales de acceso para el profesor deben entregarse por canal privado. No se dejan contraseñas en la guía ni en Git.
- No se alteró la reserva histórica USD ni se inventó capital. No hubo nuevas escrituras de negocio para producir las capturas.
- Los informes/ZIPs antiguos sin seguimiento y `supabase/.temp` se preservaron localmente, sin incorporarlos a esta publicación. El APK se publica como asset, no dentro de Git.

## Evidencia

[Resultado público](evidencia/check-public.json), [resultado local](evidencia/check-local.json), [APK y descarga](evidencia/apk.json), [Cobros](evidencia/cobros.png), [operaciones](evidencia/operaciones.png), [operación completada](evidencia/completada.png), [oferta](evidencia/oferta-detalle.png), [portada](evidencia/portada.png), [administración](evidencia/admin.png), [Android limpio](evidencia/android-limpio.png), [Android Inicio](evidencia/android-inicio.png), [Android OP-1026](evidencia/android-op1026.png).
