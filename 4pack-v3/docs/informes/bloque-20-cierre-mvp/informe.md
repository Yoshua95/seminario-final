# Bloque 20 · Informe de cierre de tanda — candidata PARCIAL

Fecha: **20/11/2026**. **No aprobada para reemplazar la defensa.** Este informe distingue los resultados finales de los intentos intermedios y de las pruebas pendientes.

## Entregables y versiones finales

- Web candidata: **https://4pack-candidata-mvp.vercel.app/acceso**.
- Administración: **https://4pack-candidata-mvp.vercel.app/admin/acceso**.
- Registro empresarial: https://4pack-candidata-mvp.vercel.app/empresa/registro. Entrega real del correo todavía NO PROBADA.
- Código: https://github.com/Yoshua95/seminario-final/tree/codex/mvp-defense-close.
- Checkpoint funcional inicial: `2806f93ef8af1698633f82eb093e5bc395146938`; corrección de compatibilidad: `6104ed1e5159a4964d7817d8b3449f14306653e2`; último código web: **`59e58c8dad604dc1048bade1dfecb06ad3128616`**. Despliegue final READY **dpl_G3Ko97jt4p6noPBeG6bMGFuwx3SU**, exportado desde ese commit fuera del repositorio, metadata sourceCommit coincidente y sin gitDirty heredado. Evidencia `evidencia/publicacion.json`.
- APK **3.0.5 / código 6**, paquete separado `com.yoshuachavez.fourpack.candidate`: [descargar candidata](https://github.com/Yoshua95/seminario-final/releases/download/v3.0.5-candidata-mvp-b20/4PACK-3.0.5-Candidata-Android.apk).
- [Release preliminar](https://github.com/Yoshua95/seminario-final/releases/tag/v3.0.5-candidata-mvp-b20), objetivo Git `6104ed1`. Los archivos Android son idénticos a los compilados del checkpoint funcional inicial; los cambios posteriores afectan web/backend/documentación.
- Ruta local del APK: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` dentro del worktree candidato `.4pack-demo/block15/worktree/4pack-v3` del checkout original.
- APK de **89.516.806 bytes**. SHA-256 instalado y descarga pública verificada: **`a311bd09cf86a31da2312b4c6585b46b0595a369b656f07d6b4e33da6fb65364`**.
- Credenciales candidatas: `C:\Users\Asus Tuf\4PACK-Accesos-Candidata\ACCESOS-CANDIDATA-PRIVADO.txt`, **fuera de Git**, únicamente para entrega privada. No se modificaron las cuentas ni el archivo privado de defensa.

## Resultado real por paso

| Paso / rol | Resultado final | Evidencia y límites |
|---|---|---|
| Administración: seis secciones | **PASS**, local y dominio candidato, sesiones limpias | Inicio, Operadores, Operaciones, Reclamos, Importadores y Mi perfil: HTTP 200 y menú propio. Capturas `evidencia/publicado/`. |
| Operador intenta abrir admin | **PASS**, acceso denegado en ambos entornos | Navegación redirigida fuera de `/admin`; JSON de navegador. |
| Postulación, habilitación y activación | **PASS**, web + Supabase real candidato | Una empresa CUIT 30712345671, habilitación auditada China → Argentina / transporte internacional; importador activado por admin. Autoalta y entrega de email NO PROBADAS: fixtures confirmados con Auth Admin. |
| APK limpio, login y reapertura | **PASS**, emulador 5556 usuario 12, Metro apagado | Se borraron únicamente datos del paquete candidato. Formulario visible, sesión real y recuperación al reabrir; `evidencia/android-login.json`. No dispositivo físico. |
| Publicar desde Android | **PASS**, pantalla + Supabase | Carga **`eb53d6c0-96de-4181-a39d-469916795a6b`**, LC-10002, categoría Otro, Shanghai, China → Buenos Aires, Argentina; 20 kg, 1 m³, FOB **USD 1.100**. |
| Encontrar y cotizar desde web | **PASS tras corregir compatibilidad** | Oferta **`a7b39a46-6e28-4d3d-89ab-a9438d81bc8e`**, **ARS 120.000**, 7 días, submitted. Mis ofertas del dominio candidato y Supabase corroborados. No se duplicó al fallar una espera del runner. |
| Comparar desde Android | **PASS** | La misma oferta ARS 120.000, 7 días y estado vigente visible; captura `android-offers.png`. |
| Adjudicación y pago externo nuevo | **NO PROBADO en remoto** | Work todavía prepara secretos. Creación apagada. **No existe UUID de operación candidato**; consulta final: 1 carga, 1 oferta, 0 operaciones y 0 pagos. |
| Documento, hito, entrega, reclamo y liberación | **NO PROBADO de punta a punta en remoto** | Implementación y pruebas locales con proveedor simulado; no equivalen a un pago ni cierre reales. |
| Históricos USD | **Probados con fixtures locales; NO PROBADOS en candidata real** | No se restauraron datos de defensa. La defensa y sus históricos quedaron intactos. |

Oferta vigente hasta **22/11/2026 18:00 −03:00**. Si vence antes de retomar, presentar reemplazo por el flujo autorizado; no modificar su snapshot ni adjudicarla vencida.

## Backend aplicado y seguridad final

Destino exclusivo **khtfjogqvtjuxhmzkmue**. Las seis migraciones nuevas están registradas una sola vez: `20261120135235`, `20261120135605`, `20261120142007`, `20261120143457`, **`20261120165753`** y **`20261120172155`**. Las dos últimas retiran la ejecución anónima de funciones definer y reconocen país declarado tras una coma. No se editaron fuentes ya aplicadas. Se normalizaron únicamente entradas exitosas del historial al número fuente.

Funciones v1 activas: `document-upload` y `mercado-pago-mvp-test`, **JWT obligatorio**; `mercado-pago-mvp-webhook`, sin JWT de usuario pero **HMAC obligatorio** antes de consultar/procesar. Tres peticiones sin autorización/firma devolvieron **401**. Bucket documents privado, 10 MB, PDF/JPEG/PNG. No se acredita todavía una subida documental real de esta operación.

Verificación final: **0 funciones SECURITY DEFINER ejecutables por anon**. Se conservaron permisos legítimos authenticated/service_role. El cliente no puede registrar pagos ni modificar directamente protección. Base **`mp_test_settings.enabled=false`**; no hay secretos MP_TEST_* en la última comprobación de nombres, por lo que creación en Edge también permanece desactivada.

La conciliación candidata compara vendedor **3858067934**, comprador **3858067936**, preferencia registrada, orden, operación, referencia, ARS e importe; conserva `live_mode` original y evidencia separada. Probado con dobles; no observado aún con la API real en esta candidata. Reclamo pausa liberación; entrega confirmada y evidencia permiten liberación **de prueba**, sin custodia ni retiro bancario real.

Advertencias pendientes de revisión antes de promoción: cuatro funciones históricas con search_path mutable y protección de contraseñas filtradas deshabilitada. [Linter](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [Auth](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Las tablas internas sin políticas conservan RLS y acceso directo revocado; no se abrieron políticas para silenciar avisos.

## Pruebas finales y fallos abiertos

- **`npm.cmd run test:mvp`: 38 PASS**, ~2–3 s; PGlite, validadores y handlers con dobles HTTP/SDK/proveedor. Atomicidad, roles, ARS, retiro/vencimiento, CUIT, conciliación/idempotencia, HMAC, discrepancias, documento por responsable, reclamo y liberación de prueba.
- **PostgreSQL 17.12 real local: tres escenarios concurrentes PASS**, dos conexiones por escenario, una operación/snapshot y cero reservas monetarias nuevas; ofertas competidoras con un ganador. REPEATABLE READ requiere reintento de serialización. Sin deadlock observado. JSON preservado.
- **Rechazo real USD PASS:** RPC con sesión autorizada del operador devolvió P0001 «Las nuevas ofertas y su capital de trabajo deben estar en ARS» y el único ID de oferta quedó idéntico antes/después. El texto todavía menciona capital de trabajo: mensaje heredado pendiente de limpieza, sin reactivar esa regla. Evidencia rechazo-usd.json.
- **Typecheck y lint PASS** en la última ejecución. Web build local PASS y build remoto Vercel PASS del primer despliegue; el último despliegue se acredita en publicacion.json.
- Regresión histórica ejecutada: dominio **12/12**, base **33/33**, etapa 2A **12/12**, etapa 2B **28/28**, multirrol **3/3**, HAZMAT **13/13**, importador **4/4**, visor **2/2**, pagos **43/43**.
- **`npm test` global FAIL**: Preview tiene 3 PASS / 1 FAIL porque demo-sql.json no contiene todas las migraciones posteriores. Los comandos siguientes se ejecutaron individualmente. La demo anterior se conservó; no se declara sincronizada ni suite global verde.
- Gradle final: `:app:createBundleReleaseJsAndAssets --rerun-tasks` y `:app:assembleRelease`, con `--init-script ../../../scripts/android-release.init.gradle --no-daemon --max-workers=2`, ANDROID_HOME local y NODE_ENV=production: **PASS**. Bundle ~1 min, assemble ~1 min. Artefactos ignorados, advertencias de APIs obsoletas para Gradle 9.
- Fallos nativos intermedios resueltos: SDK/keystore debug ausentes; `operator new(unsigned long)` por modo C++; React duplicado (`useState` de null) y contexto Expo Router duplicado. Metro normaliza rutas físicas por junction, preservando módulos virtuales. Rebuild forzado e instalación/login/reapertura finales PASS. Firma debug de desarrollo; no firma Play Store.
- **Limitación detectada, pendiente:** la descripción «sin baterías ni químicos» activa el detector HAZMAT por palabras clave. No publicó una carga incompleta; se usó después descripción inequívoca de algodón. No se cambió el detector en este bloque.
- Los primeros runners tenían selectores/esperas erróneos (toast desmontado, email no visible y ruta `/operador/ofertas` en vez de **`/operador/mis-ofertas`**). Se corroboró estado persistido antes de repetir y se verificó lectura final. No se cuentan aquellos runners como PASS.

## Primer bloqueo y siguiente paso concreto

Work todavía prepara secretos. Configurar **por canal privado**, únicamente en la candidata: `MP_TEST_ACCESS_TOKEN`, `MP_TEST_SELLER_ID`, `MP_TEST_WEBHOOK_SECRET` de la integración oficial y **`MP_TEST_RETURN_BASE=https://4pack-candidata-mvp.vercel.app/pagos/retorno`**. Mantener `MP_TEST_ENABLED=false`. Webhook: `https://khtfjogqvtjuxhmzkmue.supabase.co/functions/v1/mercado-pago-mvp-webhook`.

Después de verificar vendedor/configuración: habilitar temporalmente las dos opciones ya autorizadas; adjudicar desde el APK reutilizando esta carga/oferta si sigue vigente, registrar el UUID real y pagar con el comprador de prueba. Apagar creación y verificar pago desde backend, reintento y notificación duplicada. Continuar packing list del importador, hito con evidencia, entrega, reclamo/resolución y liberación. Repetir sobre las URLs públicas. Un CAPTCHA requiere intervención humana.

Falta además incorporar el logo oficial de Mercado Pago al botón Android; no se inventó un logo. La autoalta por email, MSDS/archivo ajeno y recorrido completo deben ensayarse en la candidata antes de declararla lista. Los históricos del origen no se presentan como restaurados: el respaldo actualizado quedó pendiente por falta de conexión privada.

## Evidencia para la planilla

| Entregable | Evidencia disponible | URL pública verificada |
|---|---|---|
| Web/admin candidata | Sesiones limpias, seis secciones y oferta; capturas publicadas en este expediente | https://4pack-candidata-mvp.vercel.app |
| APK instalable | Login, reapertura, carga y oferta, SHA-256 de descarga | [APK 3.0.5 candidata](https://github.com/Yoshua95/seminario-final/releases/download/v3.0.5-candidata-mvp-b20/4PACK-3.0.5-Candidata-Android.apk) |
| Código e informe | Checkpoints y rama; guía GUIA_CANDIDATA.md | https://github.com/Yoshua95/seminario-final/tree/codex/mvp-defense-close/4pack-v3/docs/informes/bloque-20-cierre-mvp |
| Pago y operación completada nuevos | Solo pruebas locales; **0 operaciones/pagos remotos** | Pendiente del ensayo externo |
| Defensa anterior | Vercel sigue sirviendo dpl_HyRbgPCKD2R4bCVUKAhUeYovnGUH, metadata e3ed416 y gitDirty=1 | https://seminario-final-five.vercel.app |

No se modificaron PL04, la planilla compartida ni el backend/dominio de defensa. No hubo merge. La candidata tiene su propia publicación y la rama bloquea autodeploy al proyecto anterior. No se grabó video.

---

Verificación HTTPS realizada desde solicitudes sin cookies y Chrome limpio en esta notebook. No se ensayó otra PC física; la herramienta web externa no pudo abrir el dominio y no se usa como evidencia de accesibilidad externa.

La repetición final del navegador sobre el despliegue 59e58c8 pasó las seis secciones y el aislamiento del operador. Hubo un timeout intermedio de espera de navegación; el runner final comprueba explícitamente la ruta protegida del servidor y terminó PASS. Evidencia web-publica.json. No se saltearon Auth ni controles de rol.

Estado Git al cerrar código: rama codex/mvp-defense-close, funcional HEAD 59e58c8; commits publicados sin merge. El commit documental posterior contiene este informe y las capturas. Permanecen locales, preservados y excluidos del checkpoint: next-env.d.ts, includes generados de tsconfig.json, actualización anterior del informe del bloque 18 y supabase/.temp. APK, entornos, bases y logs están ignorados.
