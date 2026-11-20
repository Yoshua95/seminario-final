# Bloque 22 · Envío de oferta LC-10004

Fecha: **20/11/2026**. Resultado: **PASS del criterio de cierre**.

Proyecto exclusivo: **4pack-candidata / khtfjogqvtjuxhmzkmue**. Rama `codex/mvp-defense-close`. Partida: `9d0e1b7558c7169025a554cbb4cd0a78c6ab91ad`. Código corregido y desplegado: **`379737882fe49d59de55e283c8f04222b53a5029`**. El commit documental posterior contiene este expediente.

## Resultado comprobado

| Comprobación | Resultado |
|---|---|
| Cargas disponibles → LC-10004 → Cotizar → Revisar → Enviar | **PASS**, sesión real del operador en la web publicada |
| Precarga | **PASS**: modalidad `air`; servicios `["international_transport"]` |
| Opción no habilitada | **PASS**: identificada como «Sin habilitación» y desactivada; prueba manipulada también rechazada por backend |
| Error visible y accionable | **PASS**, panel abierto, mensaje enfocado y visible, con indicación de actualizar habilitaciones/quitar opciones/revisar Perfil empresarial |
| Guardado único en Supabase | **PASS**: 1 oferta y 1 solicitud registrada para ese envío |
| Mis ofertas | **PASS**, LC-10004, ARS 135.000, 9 días, Presentada |
| APK del importador | **PASS**, misma carga, ARS 135.000 y 9 días estimados, oferta vigente |

**Carga:** LC-10004 — INDUMENTARIA PRUEBA 1, UUID `43d2e5b7-4667-4f6f-a1a6-99f3d0c14200`.

**Oferta guardada:** `8b77607c-affe-41ce-bb94-891e8635bacf`, estado `submitted`, **ARS 135.000**, **9 días**, modalidad `air`, único servicio `international_transport`.

Operador: `operador.candidata@4pack.demo`, UUID `34d24945-1509-4c62-a705-3bcdc18df463`. Importador: UUID `18d2b021-5f3d-4a3a-b9f3-84a9bbb4add9`. Credenciales reutilizadas por canal privado, no incluidas en código, logs ni evidencia.

## Diagnóstico exacto

Se confirmaron en los logs de PostgreSQL los errores **P0001** de `quote_command` a las **16:31:35.928 y 16:32:24.285 de Argentina**, equivalentes a 19:31:35.928 y 19:32:24.285 UTC. Mensaje: «La oferta excede los servicios o modalidades habilitados».

**Los parámetros de esos dos intentos históricos no quedaron registrados.** Por ello no se atribuye retrospectivamente un servicio específico a esos eventos.

La reproducción controlada desde la interfaz publicada envió:

```json
{"mode":"air","services":["international_transport","origin_handling"]}
```

La autorización real de la empresa contiene:

```json
{"modes":["air","sea","consolidated"],"services":["international_transport"]}
```

El valor exacto que disparó el rechazo en la reproducción fue **`origin_handling` — Manipulación en origen**. `air` sí estaba autorizado. El formulario ofrecía el catálogo completo aunque la empresa solo tenía transporte internacional; además, los servicios iniciales estaban vacíos en vez de precargar el solicitado por la carga.

No era un problema de importe, moneda, plazo ni de la compatibilidad de ruta corregida en el bloque 21. El backend actuó correctamente y se conservó.

## Corrección en origen

- `operator/data.ts`: consulta, con la sesión del operador y RLS, sus servicios/modalidades autorizados y los servicios solicitados de las cargas. Propaga esa información a los formularios; no usa service_role ni amplía permisos.
- `types.ts`, `forms.tsx`, `panel.tsx`, `offers-list.tsx`: pasan el alcance real a la cotización nueva, borradores y reemplazos.
- `quote-authorization.mjs` y su declaración de tipos: precarga la intersección solicitada/autorizada, conserva borradores incompatibles para que el usuario los corrija explícitamente y produce mensajes accionables. No borra servicios de un borrador de forma silenciosa.
- `quote-composer.tsx`: precarga modalidad y servicios correctos; identifica opciones no autorizadas y evita seleccionarlas; valida antes de revisar, enfoca y muestra el error. Conserva Server Actions, validaciones, clave de idempotencia y revisión previa al envío.
- `executeQuoteCommand`: traduce el rechazo de habilitación a una explicación recuperable sin ocultar otras reglas del backend.
- `tests/mvp-nonfinancial.test.mjs`: comprueba que un servicio incompatible no guarda nada y que, al corregirlo y repetir con la misma clave, queda una sola oferta.
- `tests/operator-quote-authorization.test.mjs`: cubre precarga, borrador incompatible, modalidad no habilitada, ausencia de autorización y mensaje del backend. Incluido en `npm run test:mvp`.

**Sin migraciones ni cambios de funciones SQL, RLS, roles, habilitación empresarial o datos de la carga.** No se alteraron los controles para conseguir un envío aprobado.

## Prueba negativa publicada

En el formulario corregido, Manipulación en origen está desactivada y marcada «Sin habilitación». Además, para comprobar el control del servidor, se añadió mediante el runner un campo oculto `services=storage` después de revisar la propuesta. Esto simula una petición manipulada; no es una opción que la interfaz permita seleccionar normalmente.

El payload de esa prueba fue `air` con `["international_transport","storage"]`. El backend lo rechazó; no creó oferta. La web mostró, dentro del panel abierto:

> El servidor rechazó los servicios o la modalidad de la oferta. Actualizá la página para cargar tus habilitaciones vigentes, quitá las opciones no habilitadas y volvé a enviar. Revisá Perfil empresarial si necesitás otra habilitación.

La respuesta HTTP de Server Actions es 200 con resultado de negocio `ok:false`; **no se interpreta ese HTTP como un envío exitoso**. El siguiente intento válido se hizo desde una sesión limpia, con los servicios autorizados y sin manipulación.

## Recorrido válido publicado y Android

1. Login real del operador candidato; Cargas disponibles; fila LC-10004; apertura de Cotizar.
2. Verificación de precarga `air` + transporte internacional y opción incompatible desactivada.
3. Ingreso de ARS 135.000 y plazo 9 días; revisión del alcance y envío.
4. Resultado de negocio `ok:true`; navegación por el menú a Mis ofertas y lectura de la fila LC-10004.
5. Consulta de Supabase: **1 oferta**, UUID indicado arriba, y **1 solicitud de envío registrada**. Se volvió a consultar tras revisar Android; siguió siendo una sola.
6. En el emulador 5556, usuario 12, se reutilizó el APK candidato **3.0.5 / código 6**, paquete `com.yoshuachavez.fourpack.candidate`. Inicio → Comparar ofertas de INDUMENTARIA PRUEBA 1. La pantalla mostró **ARS 135.000**, **9 días estimados**, transporte internacional y oferta vigente.

No se recompiló Android: no cambió su código. Metro permaneció apagado (sin listeners 8081/8085). SHA-256 del APK existente: `a311bd09cf86a31da2312b4c6585b46b0595a369b656f07d6b4e33da6fb65364`. No se adjudicó ni se abrió un checkout en este ensayo.

## Pruebas de regresión ejecutadas

| Comando | Resultado | Duración aproximada / artefactos |
|---|---|---|
| `npm.cmd run typecheck` | **PASS**, tres workspaces | ~8 s; tsbuildinfo ignorados |
| `npm.cmd run lint` | **PASS**, sin autofix | ~3 s |
| `npm.cmd run test:domain` | **12 PASS** | ~2 s incluida compilación; .test-dist ignorado |
| `npm.cmd run test:mvp` | **45 PASS** | ~2 s; PGlite y dobles de proveedor para las pruebas de pagos |
| `npm.cmd run test:payments` | **43 PASS** | ~3 s; no transacción externa |
| `npm.cmd run build:web`, con raíz Turbopack explícita y `.next-b22-build` | **PASS** | Build local; directorio Next ignorado |
| Build Vercel de la candidata | **PASS / READY** | Despliegue identificado debajo |
| Runner web publicado: incompatible y válido | **PASS ambos** | Sesión Auth real; JSON y capturas |
| ADB: lectura de la oferta desde APK | **PASS** | APK existente, sin Metro, captura y texto visible |

No se volvió a ejecutar `npm test` global: el informe del bloque 20 ya documenta su fallo de sincronización del paquete SQL de la demo anterior. No se declara esa suite global aprobada. Los comandos indicados arriba sí se ejecutaron para esta corrección.

Durante la reproducción hubo una carrera del runner: abría Cotizar antes de terminar la navegación a la ficha, y el cambio de página descartaba el panel. Se corrigió la espera por URL y red estable, y se reprodujo el rechazo visible también en la versión anterior. No se atribuye esa pérdida al producto. Se descartó la alternativa experimental de un API nuevo; no forma parte del parche.

Una ejecución anterior fue detenida por el límite de uso de la revisión automática, sin que se ejecutara el comando. Tras «retoma» pudo continuarse. No fue un rechazo por inseguridad ni se eludió esa revisión.

## Publicación y conservación

- URL probada: **https://4pack-candidata-mvp.vercel.app/operador/oportunidades**.
- Mis ofertas: **https://4pack-candidata-mvp.vercel.app/operador/mis-ofertas**.
- Despliegue: **`dpl_7rHDBWdzea4pRRUaXzsNTfKka9Xf`**, READY, metadata `sourceCommit=379737882fe49d59de55e283c8f04222b53a5029`, sin gitDirty heredado.
- Rama: **codex/mvp-defense-close**, sin merge. Publicación exclusiva del proyecto candidato `prj_97maq4W852s5VTlo4tgASXhOhbfv`.
- Defensa verificada sin cambios: `dpl_HyRbgPCKD2R4bCVUKAhUeYovnGUH`, dominio seminario-final-five.vercel.app. No se tocó Supabase de defensa ni se desplegó allí.
- Archivos previos preservados y excluidos: ajustes generados de Next/tsconfig, informe anterior del bloque 18 y supabase/.temp. Entornos, credenciales, logs y APK permanecen fuera de Git.

## Evidencia para la planilla

| Entregable | Evidencia disponible | URL pública verificada |
|---|---|---|
| Envío válido LC-10004 | [Resultado web](evidencia/envio-valido.json), [captura Mis ofertas](evidencia/mis-ofertas.png) | https://4pack-candidata-mvp.vercel.app/operador/mis-ofertas |
| Rechazo incompatible | [Resultado](evidencia/rechazo-incompatible.json), [captura](evidencia/rechazo-incompatible.png) | https://4pack-candidata-mvp.vercel.app/operador/oportunidades |
| Guardado único | [Verificación Supabase](evidencia/supabase.json) | Evidencia en la rama candidata |
| APK importador | [Texto observado](evidencia/android.json), [captura](evidencia/android-oferta.png) | APK candidato publicado en release v3.0.5-candidata-mvp-b20 |
| Código desplegado | [Metadata](evidencia/despliegue.json) | https://github.com/Yoshua95/seminario-final/commit/379737882fe49d59de55e283c8f04222b53a5029 |

**Este criterio de cierre está cumplido.** El pago y cierre integral del MVP del bloque 20 siguen siendo un trabajo separado; esta oferta no fue adjudicada.
