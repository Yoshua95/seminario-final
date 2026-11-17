# Bloque 03 — Android exclusivo del importador

Fecha: **2026-11-17**, America/Buenos_Aires.

**Resultado: PARCIAL.** APK nuevo generado, instalado y abierto en emulador;
acceso y bloqueo de configuración observados. Cortes de comparación/adjudicación,
evidencia y evaluación resueltos en código y verificados parcialmente mediante
automatización local. El circuito Android ↔ web con cuentas conectadas **no pudo
ejecutarse** por falta de un backend Supabase compartido.

## Referencias Git y alcance

| Referencia | Valor |
| --- | --- |
| Rama | `codex/4pack-qa-readiness` |
| SHA funcional del bloque 02 | `10a57224f94f2879fdc78238853ee3deb0a3000d` |
| SHA inicial de esta sesión | `51715140fb3edab8656d13da3475cac5e62ba4f1` — commit documental posterior |
| SHA final de HEAD | `51715140fb3edab8656d13da3475cac5e62ba4f1` — sin nuevo commit en este bloque parcial |
| Cambios del bloque 03 | Permanecen locales, sin commit; inventario más abajo |

Antes de editar se leyó `docs/informes/bloque-02-hazmat-msds/informe.md` y se
confirmaron rama, log y estado. Se preservaron el ZIP académico y los cambios
generados preexistentes de Next. No se sobrescribieron informes anteriores.

## Entorno comprobado antes de modificar pantallas

| Componente | Comprobación | Resultado |
| --- | --- | --- |
| Android SDK | SDK instalado; AVD `Pixel_7` y `Medium_Phone_API_37.0` disponibles | Disponible |
| Aceleración | `emulator -accel-check` | WHPX instalado y utilizable |
| Emulador | Se inició el AVD Pixel_7 sin borrar datos; `adb devices -l` y `sys.boot_completed` | `emulator-5554`, arrancado; Android API 35, ABI x86_64 |
| Java / compilación | JDK 17, Gradle wrapper, SDK compile/target 36, NDK 27.1.12297006 | Disponibles; ajustes locales de compilación descritos abajo |
| Configuración mobile | Inspección de presencia de variables, sin imprimir valores | `apps/mobile/.env` existe, pero URL y clave pública Expo están vacías |
| Configuración web conectada | No hay `.env` raíz ni `apps/web/.env.local` configurado | No disponible |
| Supabase local | Sin Docker/Supabase CLI/configuración local preparada | No disponible |
| Auth y tres cuentas | No hay endpoint configurado para autenticar importador, operador y admin | No verificable; las identidades ficticias PGlite no son cuentas Supabase Auth |
| Esquema hasta 0023 | Las pruebas PGlite cargan el paquete SQL versionado | Verificado en PGlite; remoto no verificado |
| Storage y gateway | Código/políticas existentes; pruebas locales de registro documental y publicación | No se verificó Storage HTTP ni la función Edge en Supabase real |
| Conectividad Android → host | `adb reverse tcp:8083 tcp:8083`; la app descargó el bundle desde Metro | Verificada para Metro, no para un backend inexistente |

**Requisito exacto para compartir datos:** un mismo Supabase local/de pruebas
preparado, con URL alcanzable por Android y web, clave pública, Auth operativo,
cuentas ficticias separadas por rol, esquema completo hasta 0023, bucket privado
`documents`, RLS/políticas de Storage y función `document-upload` configurada en
servidor con sus credenciales internas. Configurar en mobile
`EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y en web
`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para el mismo
proyecto. Para un servicio localhost del host, Android necesita una dirección
alcanzable (por ejemplo el alias del host del emulador o un reverse explícito).
No se configuró una dirección ficticia para hacer pasar el ensayo.

Si el entorno preparado no tiene 0023 o el gateway actualizado, se necesita
autorización y preparación de ese entorno antes de probarlo. **No se aplicó
ninguna migración ni se desplegó una función remota en esta sesión.**

## Build, instalación y apertura observados

Se distinguen tres evidencias diferentes:

1. **Exportación JS Android:** `npm.cmd run build:mobile` aprobó y generó
   `apps/mobile/dist/android`, bundle Hermes de aproximadamente 3,3 MB.
   Esto por sí solo no es un APK ni prueba instalación.
2. **APK generado:** Gradle terminó con `BUILD SUCCESSFUL` y creó
   `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.
   Es un development client debug x86_64, versión 3.0.0, versionCode 1,
   applicationId **`com.yoshuachavez.fourpack.block03`**.
3. **APK instalado y abierto:** ADB devolvió `Success`; se abrió su MainActivity
   explícita contra Metro en el emulador Pixel_7. Se cerraron las pantallas de
   bienvenida/menú de Expo y se observó la pantalla de acceso del importador.

SHA-256 del APK final instalado:
`8F33B0FFFE698D16937D2A480A281785AF8114A6B75B83BE0C7E22EA00203C1A`.

El autolinking generado incluye `expo.modules.crypto.CryptoModule` y
`expo.modules.documentpicker.DocumentPickerModule`, y Gradle compiló esos módulos.
La app arrancó con ese binario. **No se abrió el selector de PDF**, pues la
publicación permanece detrás del acceso y no se inventó una sesión para eludirlo.
No se usó Expo Go como sustituto del build solicitado.

### Fallos de build e instalación y solución local

- ADB inicialmente intentó escribir su configuración fuera de una ruta válida;
  se ejecutó con `ANDROID_USER_HOME` apuntando a la carpeta Android del usuario
  y el permiso de herramienta correspondiente.
- El primer build `--offline` falló por falta del JAR KSP
  `symbol-processing:2.1.20-2.0.1` en caché y errores de enlace nativo. El intento
  con red obtuvo el artefacto necesario, pero persistieron símbolos C++ sin resolver.
- La regla Ninja invocaba el alias Windows `CLANG_~1.EXE` de `clang++.exe`.
  Un init script optativo fuerza `--driver-mode=g++`; con ese ajuste el build
  terminó correctamente. No se editaron dependencias ni se cambiaron versiones.
- La instalación inicial del APK con ID original falló con
  `INSTALL_FAILED_VERSION_DOWNGRADE`: había una app con versionCode 2 instalada.
  **No se desinstaló, no se forzó un downgrade ni se borraron datos.** Se generó
  una variante debug con sufijo `.block03`, instalada en paralelo.
- El script reproducible es `scripts/android-importer-local.init.gradle`.
  No altera el ID publicado ni la configuración normal del proyecto: se aplica
  únicamente al invocarlo expresamente. El build aislado final tardó unos 19 s
  con cachés; el primer build exitoso con el ajuste tardó aproximadamente 75 s.
  Una comprobación final con `$LASTEXITCODE` explícito terminó con **código 0**
  y `BUILD SUCCESSFUL in 12s` (`block03-android-build-final.log`); el SHA-256 del
  APK no cambió respecto del instalado. Se repitió por una discrepancia del
  estado del proceso PowerShell, no por un nuevo cambio de código.

## Primer bloqueo reproducible

1. Abrir la app aislada instalada en Pixel_7, conectada a Metro.
2. La pantalla muestra «Falta configurar la conexión del entorno móvil».
3. Pulsar **Ingresar**: aparece «La conexión segura todavía no fue configurada».

Este resultado se observó realmente en emulador. No se envió una contraseña ni
se obtuvo una sesión. Evidencia: `.4pack-demo/block03/blocker.xml` y
`.4pack-demo/block03/blocker.png`. El recorrido compartido corta en el primer
paso de Auth, antes de publicar una carga.

## Recorrido solicitado: estado paso a paso

| Paso | Estado de ejecución en Android/web conectados | Evidencia local adicional |
| --- | --- | --- |
| Android inicia sesión | BLOQUEADO por configuración vacía; bloqueo observado en emulador | Captura y dump UI reales; acceso exclusivo del importador |
| Android publica carga estándar | No ejecutado desde Android autenticado | Adaptador de publicación existente; pruebas PGlite/HAZMAT y exportación JS aprobadas |
| Web operador ve esa misma carga y cotiza | No ejecutado contra Android; no hay ID compartido real de este ensayo | Test SQL prepara un cargo y presenta oferta como operador en la misma base PGlite |
| Android compara y elige oferta | Pantalla implementada; no observada autenticada | Nuevo adaptador ejecuta `award_offer`; prueba PGlite conserva ID y adjudicación idempotente |
| Android confirma garantía simulada | Acción existente conectada al adaptador común; no ejecutada desde Android | El test ejecuta `simulate_guarantee` sobre el mismo ID de operación |
| Web operador registra hito con evidencia y avanza | No ejecutado como parte de este recorrido conectado | El bloque 02 acredita el ensayo web previo; no se lo presenta como ejecución Android de esta sesión |
| Android ve avance y abre evidencia | Se agregó adjunto por evento y URL firmada respetando RLS/Storage; no ejecutado con datos conectados | Typecheck/exportación aprobados; descarga real pendiente |
| Android confirma entrega | Se agregó confirmación explícita; no ejecutada en emulador autenticado | Test PGlite usa el mismo ID, avanza como operador y confirma como importador |
| Android evalúa al operador | Formulario posterior al cierre y persistencia implementados; UI conectada pendiente | Validación automatizada de puntaje/comentario; reglas RLS de calificaciones cubiertas por regresión existente |
| Web comprueba cierre y Capacity | No observado en web para una operación nacida en Android | Test PGlite comprueba `completed`, garantía `released_simulated` y reserva `released` con el mismo ID |
| Android selecciona/sube MSDS, falla y reintenta | NO EJECUTADO por bloqueo de Auth | Los 5 tests del adaptador mobile del bloque 02 se reejecutaron; no equivalen a probar el selector/URI en Android |

La prueba «adaptador mobile y operador SQL comparten IDs» usa el módulo real
`importer-flow.ts` transpilado y un transporte que invoca SQL con roles en PGlite.
No usa Android, red, Supabase Auth, PostgREST ni la pantalla web. Su alcance se
limita al contrato de las acciones y sus efectos locales.

## Cambios realizados y motivo

| Archivo | Cambio |
| --- | --- |
| `apps/mobile/app/_layout.tsx` | Agrega control de sesión para rutas profundas y retorno a acceso; conserva el bloqueo de operador/admin para uso exclusivo desde web. |
| `apps/mobile/app/login.tsx` | Aclara que el acceso móvil es del importador. |
| `apps/mobile/app/(tabs)/opportunities.tsx` | Elimina la invitación a cotizar como operador; orienta la lista a las cargas y ofertas propias. |
| `apps/mobile/app/cargo/[cargoId].tsx` | Reutiliza el detalle existente para comparar ofertas y elegir con confirmación. Retira el formulario de cotización del operador y el aviso anterior que derivaba toda adjudicación a web. Muestra importe/moneda/plazo, advierte alcances distintos y ofrece condiciones bajo demanda. Si hay operación, prioriza abrirla. |
| `apps/mobile/app/operation/[operationId].tsx` | Reutiliza seguimiento/garantía; agrega evidencia autorizada por hito, confirmación antes de finalizar, evaluación del operador después del cierre y mensajería desplegable. |
| `apps/mobile/lib/dashboard.ts` | Lista cargas del importador en lugar de solo licitaciones abiertas; APIs para ofertas, operación de carga, adjudicación, evidencia firmada y evaluación. El destinatario de evaluación se deriva de una operación propia completada; reintentos recuperan la evaluación existente. Agrega `attachmentId` al seguimiento. |
| `apps/mobile/lib/importer-flow.ts` | Contrato testeable de las tres acciones importadoras, advertencia de comparación y validación de evaluación. |
| `tests/mobile-importer.test.mjs` | Cuatro pruebas nuevas, incluida integración PGlite de adjudicación, garantía, cierre y liberación con los mismos IDs. |
| `package.json` | Agrega `test:mobile:importer` a la regresión. |
| `scripts/android-importer-local.init.gradle` | Solución optativa de compilación Windows y variante instalada paralela; no cambia la aplicación publicada. |
| `docs/informes/bloque-03-mobile-importador/informe.md` | Informe propio, sin sobrescribir bloques anteriores. |

No se modificaron esquema, migraciones, gateway ni código funcional web en este
bloque. Se preservaron los datos demo. Las pantallas mantienen los componentes y
estilos existentes; la comparación no expone límites de Capacity ni capital
interno del operador, y no equipara monedas o alcances distintos.

## Comandos y pruebas ejecutados

| Comando/comprobación | Resultado y alcance |
| --- | --- |
| `git status --short`, rama, log y `git rev-parse HEAD` | Base y cambios previos confirmados. |
| `adb devices -l`, `emulator -list-avds`, `emulator -accel-check`, `getprop` | Emulador disponible, API 35 x86_64 arrancado con WHPX. |
| `gradlew.bat :app:assembleDebug -PreactNativeArchitectures=x86_64 --offline` | Falló: KSP ausente y enlace C++. Log `block03-android-build.log`. |
| Mismo build sin `--offline`, `--max-workers=2` | Resolvió KSP, persistió fallo de enlace. Log `block03-android-build-online.log`. |
| Build con `--init-script ../../../.4pack-demo/block03-ndk.init.gradle` | Aprobado; ajuste inicial de driver, todavía ID original. Log `block03-android-build-driver.log`. |
| Build con `--init-script ../../../scripts/android-importer-local.init.gradle` | Aprobado, APK aislado final. Log `block03-android-build-isolated.log`. |
| `adb install -r` sobre APK original | Falló sin modificar la app existente: version downgrade. |
| `adb install -r` sobre APK aislado; `adb reverse tcp:8083 tcp:8083`; `adb shell am start ...` | Instalación y apertura aprobadas; UI de acceso observada. |
| `adb shell uiautomator dump`, `screencap`, `adb pull` | Dumps y capturas locales de bienvenida, acceso y bloqueo. |
| `npm.cmd run typecheck` | Aprobado en mobile, web y dominio, aproximadamente 10 s. |
| `npm.cmd test` | **109 pruebas aprobadas**: 105 de regresión anterior y 4 nuevas; aproximadamente 35–45 s. |
| `node --test tests/mobile-importer.test.mjs` después de compilar dominio | **4 aprobadas**, aproximadamente 4 s. |
| `npm.cmd run lint` | Aprobado. El comando definido ejecuta ESLint web; no hay lint mobile configurado. |
| `npm.cmd run build:mobile` con `CI=1` | Exportación JS Android aprobada, no APK; aproximadamente 10–20 s. |
| `npm.cmd run start:dev-client --workspace=@4pack/mobile -- --port 8083 --localhost` con `CI=1` | Metro sirve el bundle descargado por la app; watch/hot reload deshabilitado por CI. |
| `git diff --check` | Sin errores de espacios; avisos LF/CRLF de Windows. |

Logs bajo `.4pack-demo/block03-*.log`, excluidos de Git. Los comandos ADB usaron
`ANDROID_USER_HOME` del usuario; los builds usaron `ANDROID_HOME` del SDK ya
instalado. No se imprimieron valores de claves o contraseñas.

Metro permanece en la sesión de terminal **66737**, puerto **8083**; el emulador
y la variante instalada permanecen disponibles. El development client necesita
Metro para mostrar este código; **no es una entrega release autónoma**. Se puede
detener Metro con `Ctrl+C` en esa terminal. No se grabó video.

Advertencias observadas: Legacy Architecture, `SafeAreaView` deprecado,
deprecaciones Gradle/Kotlin de clases React Native y `NO_COLOR`/`FORCE_COLOR`.
No impidieron generar, instalar ni abrir la variante final. No se afirma que
no existan errores en pantallas autenticadas que no pudieron ejecutarse.

## Próximos pasos y riesgos

1. **P1 / primer bloqueo:** preparar y autorizar el entorno Supabase compartido
   descrito arriba. Verificar esquema y gateway antes de conectar ambos clientes;
   cualquier migración remota requiere una tarea autorizada aparte.
2. **P1:** ejecutar el recorrido real Android/web conservando ID de carga y
   operación, con tres cuentas ficticias separadas. Registrar IDs, errores de
   navegador/Android, evidencia descargada, movimiento de billetera y liberación
   de Capacity. Las pantallas nuevas aún necesitan esta validación conectada.
3. **P1:** probar selector de PDF, bytes desde URI, error de subida y reintento en
   el APK instalado; repetir en dispositivo físico. No se logró ni se afirma esa
   prueba en esta sesión.
4. **P2:** completar revisión visual con datos reales de prueba, accesibilidad,
   manejo de errores de sesión y recuperación de edición tras cerrar pantallas.
   El ajuste de build Windows es optativo y debe revisarse para CI/otros hosts.

El video sigue diferido. No se hicieron push, merge, despliegues, instalaciones
de APK en dispositivo físico ni migraciones remotas.

## Evidencia para la planilla

| Entregable | Evidencia disponible | URL pública verificada |
| --- | --- | --- |
| App Android del importador | Pantallas/APIs locales actualizadas; typecheck y exportación aprobados | pendiente de publicación |
| APK con módulos nativos nuevos | APK debug aislado, SHA-256 consignado y autolinking de Crypto/DocumentPicker | pendiente de publicación |
| APK instalado en emulador | `Success`, datos de paquete y capturas `.4pack-demo/block03/login.png` / `blocker.png` | pendiente de publicación |
| Recorrido compartido Android/web | Bloqueado antes de Auth; no existe evidencia de ejecución conectada | No disponible |
| Contrato importador y Capacity | Cuatro pruebas nuevas; integración PGlite con los mismos IDs y cierre/liberación | pendiente de publicación |
| MSDS nativo | Código y pruebas automatizadas del adaptador; selector/subida en emulador y físico pendientes | pendiente de publicación |
| Informe bloque 03 | Este archivo real, carpeta numerada propia | pendiente de publicación |
| Video | Diferido por el usuario | No disponible |

No se verificaron PR, CI remota ni URLs públicas nuevas. No se vincula este
working tree a un SHA publicado anterior como si contuviera los cambios nuevos.

## Estado local al cierre

HEAD permanece en `51715140fb3edab8656d13da3475cac5e62ba4f1`. Los archivos del
bloque 03 y este informe quedan sin commit porque el circuito conectado está
parcial. También permanecen los cambios generados previos de
`apps/web/next-env.d.ts` y `apps/web/tsconfig.json`, y el ZIP académico sin
seguimiento. Bases demo, logs, APK, exportación, cachés, dependencias y `.env`
no se incorporan a Git. La app instalada originalmente se conserva separada.
