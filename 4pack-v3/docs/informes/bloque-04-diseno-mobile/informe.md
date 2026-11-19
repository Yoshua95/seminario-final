# Bloque 04 — Experiencia visual Android del importador

Fecha: **2026-11-17** · America/Buenos_Aires.

**Resultado:** cuatro pantallas adaptadas a la identidad de la web, vistas en
Pixel 7 con datos ficticios y componentes compartidos con las rutas reales.
Revisión visual local aprobada; recorrido con backend conectado **pendiente**.
No se presenta una maqueta como prueba de Auth, persistencia o transacciones.

## Git y preservación del bloque anterior

| Referencia | Valor |
| --- | --- |
| Rama | `codex/4pack-qa-readiness` |
| HEAD inicial | `51715140fb3edab8656d13da3475cac5e62ba4f1` |
| Checkpoint parcial bloque 03 | **`cd9e3401d4f09c02021b2e6c676671f05fd1972f`** |
| Mensaje del checkpoint | `chore(mobile): checkpoint partial block 03 importer app` |
| HEAD al cierre | `cd9e3401d4f09c02021b2e6c676671f05fd1972f` |
| Bloque 04 | Cambios de esta revisión visual locales y sin commit |

Se leyó el informe del bloque 03 y se revisaron status, rama y log antes de
modificar pantallas. El checkpoint guarda sus 11 archivos de implementación,
prueba, script Android e informe, y lo identifica expresamente como **parcial**.
Se excluyeron ZIP académico, archivos de entorno, datos, logs, dependencias y
generados de Next. El informe histórico del bloque 03 no se sobrescribió.

## Referencia visual inspeccionada

Se abrió la **web local vigente** en
`http://localhost:3000/demo/acceso`, se entró al escenario ficticio del operador
aprobado y se inspeccionó la mesa de licitación. El título observado fue
«Mesa de Licitación Ciega». Se capturó su render real, no solo el CSS.

Fuentes revisadas:

- `apps/web/src/app/operator.css`: tokens oscuros, bordes, tarjetas, tipografía,
  botones y estados.
- `apps/web/src/app/globals.css`: estructura de marca y sistema base.
- `apps/web/src/app/layout.tsx`: Geist Sans/Mono.
- `apps/web/src/features/operator/ui.tsx`: iconos lineales y jerarquía de UI.

El navegador confirmó `GeistSans` en el encabezado. La referencia se conserva en
[00-referencia-web.png](capturas/00-referencia-web.png).

| Rasgo trasladado | Implementación Android |
| --- | --- |
| Fondo | `#07070a` |
| Tarjeta / superficie secundaria | `#171718` / `#202021` |
| Bordes | `#303033`, 1 dp; tarjetas de radio 14 dp |
| Texto / secundario | `#f4f4f5` / `#b1b1ba` |
| Marca y acción principal | Naranja `#ff762e`, palabra 4PACK con punto y símbolo logístico |
| Estados | Verde `#34d399`, amarillo `#fbbf24`, rojo `#fb7185` |
| Tipografía | Geist TTF cargada con `expo-font`; pesos y jerarquía adaptados al teléfono |
| Iconografía | Ionicons de contorno: caja, navegación, documentos, adjunto y estrellas |
| Espaciado | Márgenes de 22 dp, separación de 16 dp, tarjetas de 18 dp |
| Controles | Acción principal de mínimo 52 dp, acciones secundarias de 44 dp; foco naranja, deshabilitado atenuado, error y carga explícitos |

Se agregó la fuente desde el repositorio oficial Google Fonts, con su licencia
OFL en `apps/mobile/assets/fonts/OFL.txt`:
[Geist](https://github.com/google/fonts/tree/main/ofl/geist).
`expo-font ~14.0.12` ya estaba instalado transitivamente e incluido en el
development client; se declaró como dependencia directa. No se cambiaron
versiones de Expo o React Native.

## Pantallas y decisiones

### Inicio

- «Nueva carga» es la única acción principal.
- Si hay una operación no terminal, se muestra su título, ruta, estado y acceso
  directo al seguimiento. No se confunde una operación completada con una activa.
- Hay estado vacío y se conserva el manejo de carga/error.

### Nueva carga

Formulario de tres pasos con progreso y vuelta al paso anterior:

1. Mercadería, origen y destino.
2. Descripción, categoría, dimensiones, FOB y modalidad.
3. Revisión y documentos correspondientes a esa carga.

La ficha MSDS aparece solo cuando la detección existente la requiere. Se muestra
el límite de 10 MB y el botón de publicación permanece deshabilitado si falta la
selección obligatoria. El flujo real conserva selector nativo, claves de
reintento, `createCargo`, gateway y validaciones de servidor/base del bloque 02.
La vista ficticia no sube ningún archivo.

### Ofertas

- Tarjetas con precio, moneda, plazo y alcance visibles.
- Inclusiones, exclusiones, seguro, pago, documentos, responsabilidades,
  observaciones y vigencia se despliegan con un toque.
- Se conserva la advertencia de monedas o alcances distintos; no se genera un
  ranking de precios que los considere equivalentes.
- La selección de tarjeta es secundaria; «Elegir esta oferta» es la acción
  principal y mantiene la confirmación del importador.
- Se conserva el acceso a los datos de la carga, la operación ya creada y la
  actualización mediante gesto. No se exponen límites de Capacity del operador.

### Seguimiento

- Estado, próximo paso y acción pendiente arriba: garantía simulada, entrega o
  evaluación según corresponda.
- Hitos, evidencia y mensajes se consultan en la misma operación mediante
  pestañas; la evidencia real sigue abriéndose con URL firmada autorizada.
- Se conservan confirmación antes de finalizar, evaluación posterior y límites
  de comentario/mensaje. Los estados de garantía se presentan en castellano.
- La administración y el operador siguen usando la web. No se agregaron acciones
  operativas o administrativas en mobile.

## Vista ficticia: aislamiento y entrega

`apps/mobile/dev/visual-preview.tsx` está **fuera de `app/`**, por lo que no es
una ruta Expo Router. Requiere simultáneamente `__DEV__` y
`EXPO_PUBLIC_IMPORTER_VISUAL_PREVIEW=1`. Es un reemplazo visual completo del
árbol de pantallas de revisión, no una sesión ni una cuenta de prueba autenticada.

- Lleva un banner permanente «REVISIÓN VISUAL · DATOS FICTICIOS · SIN BACKEND».
- No llama a los servicios de datos ni a Auth. La comprobación de sesión real
  tampoco se ejecuta mientras está seleccionada esa vista aislada.
- Publicar, adjudicar, confirmar, enviar o abrir evidencia muestran un aviso
  explícito de simulación visual. No escriben datos ni mueven fondos.
- Usa `HomeView`, `CargoFormView`, `OffersView` y `TrackingView`, los mismos
  componentes que reciben datos/handlers reales desde las rutas de la aplicación.
- Las pestañas y escenarios adicionales pertenecen al visor de desarrollo; no
  se añaden a la navegación de entrega.
- Al abrir Inicio en el visor se restablecen los datos ficticios para repetir
  la revisión. Esto no modifica el comportamiento de los formularios reales.

**Control de exclusión ejecutado:** se exportó Android en modo entrega con la
variable visual deliberadamente activada y se examinó el bundle Hermes. El
marcador y los identificadores exclusivos de las fixtures no están presentes.
Además, dos tests verifican que el modo no se habilite fuera de desarrollo ni
sin opt-in. La autenticación normal no se sustituye por las fixtures en entrega.

## Android observado y capturas

Se usó **Pixel_7 / emulator-5554**, API 35, x86_64, con el development client
aislado `com.yoshuachavez.fourpack.block03` ya instalado en el bloque 03.
Se conectó a **Metro 8084** mediante ADB reverse y se observó el render nativo
de Geist, iconos y componentes. No se usó un navegador para simular Android.

No fue necesario generar ni instalar un nuevo APK en este bloque: el binario
existente ya contiene los módulos nativos necesarios y carga el código/font
actuales desde Metro. Esto se diferencia de la exportación JS de entrega, que
sí se regeneró. No hay un nuevo APK release ni una prueba en dispositivo físico.

| Captura real del emulador | Qué acredita |
| --- | --- |
| [01-inicio.png](capturas/01-inicio.png) | Marca, Nueva carga, operación en curso y seguimiento |
| [02-publicacion.png](capturas/02-publicacion.png) | Paso inicial breve con tres campos |
| [02b-dimensiones.png](capturas/02b-dimensiones.png) | Datos adicionales en el segundo paso |
| [02c-revision.png](capturas/02c-revision.png) | Revisión estándar, sin MSDS innecesario |
| [02d-msds.png](capturas/02d-msds.png) | Ficha MSDS condicional al indicar baterías/litio |
| [03-ofertas.png](capturas/03-ofertas.png) | Precio, moneda, plazo, alcance y advertencia de comparación |
| [04-seguimiento.png](capturas/04-seguimiento.png) | Estado, próximo paso y pestañas del seguimiento |
| [04b-garantia.png](capturas/04b-garantia.png) | Acción pendiente de garantía simulada |
| [04c-evaluacion.png](capturas/04c-evaluacion.png) | Evaluación posterior al cierre |
| [04d-entrega.png](capturas/04d-entrega.png) | Confirmación de entrega |

Cada PNG tiene un dump UI XML junto a él. El archivo
[revision.json](capturas/revision.json) registra la revisión nativa con
`passed: true`, diez capturas/comprobaciones, `fixture: true` y
`backendConnected: false`. Las capturas no acreditan cambios persistentes.

### Cómo abrir la revisión en Pixel 7

Metro **ya permanece ejecutándose en la sesión 10287, puerto 8084**, y el visor
queda abierto en Inicio. Si el proceso no está disponible, desde `4pack-v3`:

```powershell
$env:EXPO_PUBLIC_IMPORTER_VISUAL_PREVIEW = "1"
npm.cmd run start:dev-client --workspace=@4pack/mobile -- --port 8084 --localhost
```

Con Pixel_7 iniciado, desde otra terminal:

```powershell
$env:ANDROID_USER_HOME = Join-Path $env:USERPROFILE '.android'
$androidAdb = Join-Path $env:LOCALAPPDATA 'Android/Sdk/platform-tools/adb.exe'
& $androidAdb -s emulator-5554 reverse tcp:8084 tcp:8084
& $androidAdb -s emulator-5554 shell am start -n com.yoshuachavez.fourpack.block03/com.yoshuachavez.fourpack.MainActivity -a android.intent.action.VIEW -d 'exp+4pack://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8084'
```

Usar las pestañas Inicio, Publicar, Ofertas y Seguimiento del visor. En seguimiento,
los escenarios 1–4 muestran garantía, ejecución, entrega y evaluación. Para ver
MSDS, indicar baterías/litio en el título y completar los pasos del formulario.
No es una prueba de selección/subida real del PDF.

Para repetir la revisión y generar las capturas:

```powershell
npm.cmd run test:mobile:visual:emulator
```

El script verifica el identificador de la fixture antes de cada interacción.
Para volver al acceso real, detener ese Metro con `Ctrl+C`, quitar la variable
visual y abrir la app contra un Metro sin opt-in. La configuración Supabase real
sigue siendo necesaria; el visor no aporta credenciales ni cuentas.

## Archivos modificados

| Archivo o grupo | Cambio |
| --- | --- |
| `apps/mobile/features/importer/ui.tsx` | Tokens de web, marca, tipografía, tarjetas, campos, foco, botones, etiquetas y página con estados/refresco |
| `apps/mobile/features/importer/views.tsx` | Cuatro vistas compartidas; formulario progresivo y jerarquía por decisión |
| `apps/mobile/app/(tabs)/index.tsx` | Conecta Inicio a los datos existentes; filtra operaciones terminales |
| `apps/mobile/app/(tabs)/_layout.tsx` | Barra inferior alineada con marca, colores y tipografía |
| `apps/mobile/app/cargo/new.tsx` | Conserva lógica y validaciones; renderiza `CargoFormView` |
| `apps/mobile/app/cargo/[cargoId].tsx` | Conserva carga/ofertas/adjudicación; renderiza `OffersView` |
| `apps/mobile/app/operation/[operationId].tsx` | Conserva acciones, evidencia, mensajes y rating; renderiza `TrackingView` |
| `apps/mobile/app/_layout.tsx` | Carga Geist y limita el visor aislado a desarrollo explícito |
| `apps/mobile/dev/visual-preview.tsx` | Fixtures sin acceso al backend y escenarios visuales |
| `apps/mobile/lib/visual-environment.mjs` / `.d.mts` | Guardia de entorno del visor |
| `apps/mobile/assets/fonts/Geist.ttf` / `OFL.txt` | Fuente y licencia |
| `apps/mobile/package.json` / `package-lock.json` | Dependencia directa `expo-font`, ya existente |
| `tests/stage1.test.mjs` | Sigue verificando los controles de rol en la vista extraída, además de rechazos RPC en PGlite |
| `tests/mobile-visual-environment.test.mjs` | Dos tests de exclusión/opt-in |
| `tests/mobile-visual-emulator.mjs` | Revisión nativa y capturas del visor, sin ejecutar acciones conectadas |
| `scripts/check-mobile-visual-release.mjs` | Control de ausencia de fixtures en el bundle de entrega |
| `package.json` | Comandos de revisión visual y control de entrega |
| `docs/informes/bloque-04-diseno-mobile/` | Este informe, capturas, dumps y resultado de la revisión |

No se modificó `dashboard.ts`, el gateway ni las migraciones en este bloque. La
lógica de datos del bloque 03 permanece en su checkpoint. Los cambios generados
preexistentes de Next y el ZIP académico quedan locales.

## Verificaciones ejecutadas

| Comando | Resultado / alcance |
| --- | --- |
| Inspección Playwright de la web local | Entrada demo, render real, fuente computada y captura; sin modificar datos de negocio |
| `npm.cmd run typecheck` | Aprobado en mobile, web y dominio |
| `npm.cmd test` | **111 pruebas aprobadas**: 109 anteriores y dos del visor |
| `npm.cmd run lint` | Aprobado; el script existente ejecuta ESLint web, no hay lint mobile independiente |
| `npm.cmd run test:mobile:visual:emulator` | **Diez comprobaciones/capturas aprobadas** en Pixel 7 con fixtures |
| `npm.cmd run build:mobile` con `CI=1` y variable visual `1` | Exportación JS/Hermes Android de entrega aprobada |
| `npm.cmd run check:mobile:release` | Un bundle examinado; fixtures exclusivas ausentes |
| `git diff --check` | Sin errores de espacios; avisos LF/CRLF de Windows |

Logs locales: `.4pack-demo/block04-{typecheck,regression,lint,emulator,release,release-check,metro}.log`.
Artefactos: capturas/dumps documentales y `apps/mobile/dist/android` ignorado.
No se instalaron versiones nuevas de frameworks ni se generó un APK nuevo.

Durante la revisión se corrigieron dos esperas del harness: la web exigía entrar
primero a su demo y su encabezado real no coincidía con el texto de navegación;
en Android, un gesto de scroll se enviaba antes de terminar de cambiar de paso.
Se agregaron la espera/confirmación de pantalla y el restablecimiento de fixtures.
El último recorrido completo es el que consta en `revision.json`.

Persisten avisos de Legacy Architecture y de colores de consola; no impidieron
la revisión. No se observaron errores de render en las capturas finales. Esto no
certifica pantallas con datos conectados ni todos los tamaños/dispositivos.

## Backend conectado y bloqueos

**No se ejecutó un recorrido conectado en este bloque.** Sigue faltando el
Supabase compartido del bloque 03: URL y clave pública configuradas para ambos
clientes, Auth con cuentas separadas, esquema hasta 0023, Storage privado y gateway
documental preparado. La vista ficticia no resuelve ese requisito.

Pendientes P1: revisión con sesión real de importador, publicación estándar/MSDS,
comparación/adjudicación, evidencia, garantía, entrega y evaluación en el mismo
recorrido Android/web. Pendientes posteriores: dispositivo físico, escalado de
fuente, teclado y accesibilidad con datos reales, y validación de un APK de entrega.
No se acredita selector/subida MSDS real a partir de una captura de revisión.

## Evidencia para la planilla

| Entregable | Evidencia disponible | URL pública verificada |
| --- | --- | --- |
| Checkpoint bloque 03 parcial | Commit local `cd9e3401d4f09c02021b2e6c676671f05fd1972f` | pendiente de publicación |
| Referencia visual vigente | Web local y `00-referencia-web.png`; CSS/componentes identificados | pendiente de publicación |
| Inicio, publicación, ofertas, seguimiento Android | Diez capturas nativas y componentes compartidos con la aplicación real | pendiente de publicación |
| Revisión aislada | Banner, escenarios ficticios y `revision.json`, diez comprobaciones aprobadas | pendiente de publicación |
| Exclusión de fixtures en entrega | Tests de guardia y escaneo del bundle exportado con flag activado | pendiente de publicación |
| Backend conectado | No ejecutado; sigue bloqueado por configuración | No disponible |
| APK release / dispositivo físico | No generados/probados en este bloque; se reutilizó development client instalado | No disponible |
| Informe bloque 04 | Este Markdown y carpeta de capturas | pendiente de publicación |
| Video | Diferido por instrucción del usuario | No disponible |

No se verificaron nuevas URLs públicas, PR ni CI remota. No se hizo **push,
merge, despliegue ni migración remota**. La aplicación instalada y sus datos
anteriores se conservaron. El único commit creado es el checkpoint parcial del
bloque 03; el diseño de este bloque queda disponible para revisión local.
