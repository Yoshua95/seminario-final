# Bloque 02 — HAZMAT/MSDS y cierre del checkpoint multirrol

Fecha: **2026-11-17** (America/Buenos_Aires).

| Referencia | Valor |
| --- | --- |
| Rama local | `codex/4pack-qa-readiness` |
| SHA de partida | `15f966226679ee6e72b18631e7193786f514065d` |
| Checkpoint multirrol creado | `29c832f9785f4b95a929503c1f70168fff0aac02` |
| SHA final de implementación HAZMAT | `10a57224f94f2879fdc78238853ee3deb0a3000d` |
| Publicación remota de este bloque | No realizada; pendiente de publicación. |

## Resultado y alcance acreditado

**Implementado y aprobado en las verificaciones locales**: publicación estándar
y HAZMAT en web, adaptador de publicación mobile con selector de PDF, protección
de publicación y adjudicación en base, reintentos sin duplicados dentro del mismo
intento y conservación del recorrido multirrol estándar.

No se acredita ejecución contra Supabase real ni sobre dispositivo físico. La
exportación Android es un bundle local, no un APK instalado. El video queda
diferido por instrucción del usuario.

Se creó el checkpoint multirrol porque no existía: el HEAD inicial seguía en
`15f9662` y los cambios del bloque anterior estaban sin commit. Ese commit incluye
el informe histórico `docs/17-bloque-1-multirrol-local.md`; no se sobrescribió.

## Diagnóstico, decisiones y motivo

1. **Corte anterior en web:** `new-cargo-form.tsx` insertaba una carga abierta y
   luego intentaba escribir directamente en Storage y `documents`. La migración
   **0015** había revocado esas escrituras a clientes autenticados: debía usarse
   `document-upload` y `register_document_upload`.
2. **Corte anterior en mobile:** `createCargo` insertaba directamente una carga
   abierta; la pantalla no ofrecía seleccionar ni subir MSDS. La detección miraba
   solo la descripción.
3. **Protección ausente en adjudicación:** la **0016** reemplazó `award_offer` con
   el contrato común de operaciones; la **0022** lo envolvió con Capacity. No
   existía una validación equivalente de MSDS válido. No se modificaron 0015,
   0016 ni otras migraciones históricas: se agregó **0023**.
4. **Circuito elegido:** preparar un borrador privado con clave de idempotencia,
   subir mediante el gateway autorizado y publicar mediante RPC. Si falla la
   subida o la respuesta, el reintento conserva las claves y recupera la misma
   carga/documento. Una carga estándar usa el mismo circuito sin subir archivos.
5. **Defensa en base:** el servidor/base detecta términos en título, descripción
   y categoría; no confía en `msds_required=false` enviado por el cliente. La
   exigencia no puede eliminarse cambiando esas banderas. La actualización a
   `open`/`awarded` y la inserción de una operación exigen un MSDS vinculado cuando
   corresponde; también hay una validación explícita en `award_offer`.
6. **Qué significa válido aquí:** PDF con extensión, MIME, tamaño (1 byte a 10 MB)
   y firma binaria admitidos por el gateway; vínculo al mismo cargo e importador,
   objeto de Storage, hash y metadatos concordantes, sin rechazo ni versión
   posterior. Se admiten documentos `pending` o `approved`: es validez técnica
   de subida, **no aprobación técnica/regulatoria del contenido HAZMAT**. No se
   analiza semánticamente la ficha ni se certifica su contenido como MSDS.
7. **Históricos inseguros:** 0023 conserva como borradores las cargas abiertas
   HAZMAT sin vínculo válido. Si se rechaza administrativamente un MSDS de una
   carga abierta, vuelve a borrador. No se borran cargas ni operaciones históricas.
8. **Gateway y respuesta incierta:** la ruta del objeto se deriva de una clave
   estable por intento. Un conflicto de objeto permite verificar y recuperar el
   registro existente; se rechazan cambios de hash, autor o destino. Ante un
   error RPC incierto no se elimina un objeto que podría haberse vinculado: queda
   privado para reintentar, y puede requerir limpieza posterior de huérfanos.
9. **Demo conservada:** las cargas ficticias HAZMAT antiguas reciben bytes MSDS
   explícitamente ficticios mediante la misma función de registro confiable del
   adaptador local. Esto conserva la demostración sin debilitar la regla nueva.
   No se leen ni empaquetan bases locales dentro del código.

## Cambios por archivo

Todas las rutas de esta tabla son relativas a `4pack-v3`.

| Archivo | Cambio y símbolo relevante |
| --- | --- |
| `supabase/migrations/0023_hazmat_publication.sql` | Detección `cargo_requires_msds`, comprobación `cargo_has_valid_msds`, triggers de publicación/operación, envoltorio `award_offer`, retiro de publicación ante rechazo, RPC `prepare_cargo_publication`/`publish_cargo`, tabla privada de reintentos y registro documental idempotente. |
| `supabase/functions/document-upload/index.ts` | Admite `upload_request_id`, reutiliza ruta estable, verifica conflictos por RPC y evita borrar evidencia ante una respuesta de registro incierta. Conserva autenticación y validación de bytes existentes. |
| `packages/domain/src/cargo-publication.ts` | `validateMsdsFile` y `publishCargoWithMsds`: secuencia compartida de borrador, subida y publicación, con puertos testeables. |
| `packages/domain/src/index.ts` | Exporta el contrato compartido de publicación. |
| `apps/web/src/app/cargas/nueva/actions.ts` | `submitCargoPublication`: acción de servidor, identidad derivada de sesión, validación binaria, RPC y gateway. Soporta Supabase y el adaptador PGlite explícitamente autorizado. |
| `apps/web/src/lib/local-document-upload.ts` | Implementación local del límite documental autorizado: verifica destino, calcula hash, escribe bytes y registra/reutiliza el vínculo. No acepta el actor desde un campo del navegador. |
| `apps/web/src/components/new-cargo-form.tsx` | Elimina Storage/metadata directos; adjunta PDF a la acción de servidor y conserva claves durante el reintento del formulario. Mantiene el flujo estándar. |
| `apps/web/src/features/multirole/pages.tsx` | Reutiliza el mismo formulario real en la demo multirrol; elimina el aviso que excluía HAZMAT. |
| `apps/web/src/features/multirole/actions.ts` | Retira el antiguo publicador demo exclusivo de cargas estándar, sustituido por la acción común. |
| `apps/web/src/features/operator/demo-runtime.mjs` | `prepareHazmatFixtures`: vincula las fichas ficticias de las cargas históricas de demo, con hash y bytes. |
| `apps/web/src/features/operator/demo-sql.json` | Paquete regenerado desde SQL versionado, incluida 0023; no contiene datos de bases locales ni variables de entorno. |
| `apps/web/next.config.ts` | Resuelve el módulo TypeScript compartido para Turbopack. |
| `apps/mobile/app/cargo/new.tsx` | Selector nativo `expo-document-picker`, requisito por título/descripción/categoría, metadatos del PDF y claves de reintento con `expo-crypto`. |
| `apps/mobile/lib/cargo-publication.ts` | `publishMobileCargo`: usa RPC y gateway; construye el multipart con URI nativa y nunca publica tras fallar la subida. |
| `apps/mobile/lib/dashboard.ts` | `createCargo` usa el adaptador común en lugar de insertar una carga abierta. |
| `apps/mobile/metro.config.cjs` | Resolución del módulo compartido para Metro. |
| `apps/mobile/package.json` | Agrega `expo-document-picker ~14.0.8` y `expo-crypto ~15.0.9`, compatibles con el SDK 54 instalado. |
| `package-lock.json` | Bloquea esas dos dependencias; no se actualizaron otras dependencias deliberadamente. |
| `package.json` | Agrega `test:hazmat` y `test:hazmat:web`; incorpora las 13 pruebas nuevas a `npm test`. |
| `tests/hazmat.test.mjs` | 8 pruebas PGlite de invariantes, permisos, fallo/reintento, documentos rechazados/ajenos y adjudicación. |
| `tests/mobile-publication.test.mjs` | 5 pruebas del adaptador mobile real transpilado, con transporte y FormData nativo simulados; no son pruebas en dispositivo. |
| `tests/multirole-browser.test.mjs` | Extensión `--hazmat`, fallo real de filesystem, reenvío real del formulario, conteos tras reinicios, puerto configurable y logs del servidor. |
| `tests/database.test.mjs` | Verifica privacidad de documentos de la operación específica, sin confundirlos con MSDS de licitaciones abiertas autorizados por RLS. |
| `tests/demo-preview.test.mjs` | Busca la ficha histórica por su ID; deja de depender del orden no garantizado entre varios MSDS. |
| `docs/informes/bloque-02-hazmat-msds/informe.md` | Informe propio de este bloque. |

`apps/web/next-env.d.ts` y `apps/web/tsconfig.json` fueron tocados por Next al
generar rutas/builds locales; se excluyen de los commits de implementación.
El ZIP académico previo permanece local y sin seguimiento. `.4pack-demo`,
`node_modules`, `.next`, `.expo`, `dist`, logs y cachés no se publican ni versionan.

## Resultados por criterio

| Criterio | Resultado observado | Entorno/evidencia |
| --- | --- | --- |
| PDF admitido y vínculo correcto | Publicación exitosa, un documento por intento. | PGlite y navegador Chrome con Next real. |
| PDF falso | El gateway/acción rechaza la firma; no aparece carga publicada. | Prueba de bytes y formulario web con archivo que declara PDF pero contiene otro texto. |
| Falta de MSDS obligatorio | Bloqueo en formulario; RPC/trigger rechaza publicar aun eludiendo el cliente. | Web, PGlite y adaptador mobile. |
| Fallo de subida | Carga permanece como borrador privado, sin enlace de publicación. | En navegador se convierte temporalmente el directorio de archivos de esa base aislada en un archivo para provocar `EEXIST`/`ENOTDIR`; se restaura en `finally`. |
| Reintento | Mismas claves: una carga, un documento y un registro de intento. | Doble envío real del formulario web, RPC PGlite y transporte simulado mobile. |
| Respuesta perdida | El reintento conserva la misma identidad de publicación. | Adaptador mobile con respuesta simulada perdida; idempotencia de RPC/registro comprobada en PGlite. |
| Adjudicación sin MSDS válido | Rechazada antes de crear operación/garantía/reserva; también tras rechazo administrativo o pérdida del vínculo al objeto. | PGlite; se verifica que no se creó operación y, por sus FK, tampoco sus efectos asociados. |
| Acceso horizontal | Operador y otro importador no pueden vincular documentos/publicar una carga ajena; el borrador no es visible al operador. | RLS y RPC en PGlite, más verificaciones multirrol de sesión. |
| Carga estándar | Publica sin documento y completa cotización, adjudicación, garantía, hitos, entrega y evaluación bilateral. | Recorrido de navegador y suites de regresión. |
| Persistencia | Dos reinicios conservan estado y bytes; una reserva, una liberación, un movimiento USD 975 y dos evaluaciones para el recorrido estándar. | Servidor Next reiniciado con el mismo directorio PGlite. La carga HAZMAT conserva un único documento y sigue publicada. |
| Mobile | Selector y adaptador implementados; 5 pruebas del adaptador, typecheck y exportación Android aprobados. | Automatización local; selector nativo/transferencia real todavía no observados en dispositivo. |

## Comandos ejecutados y artefactos

Los logs de ejecución quedan bajo `.4pack-demo/` y no forman parte de los commits.
Las duraciones son aproximadas y dependen del calentamiento de Next/Metro.

| Comando | Resultado final | Duración aprox. / artefactos |
| --- | --- | --- |
| `git status --short`, `git branch --show-current`, `git log -5 --oneline`, revisión de diff | Rama y base confirmadas; cambios previos preservados. | <2 s; diff de checkpoint guardado localmente. |
| `git -c user.name=Codex -c user.email=codex@localhost commit -m "feat(demo): checkpoint isolated multirole MVP rehearsal"` | Checkpoint `29c832f`; identidad tomada de los commits anteriores, sin cambiar configuración global. | <1 s tras permisos del índice Git. |
| `npm.cmd install --workspace=@4pack/mobile expo-document-picker@~14.0.8 expo-crypto@~15.0.9 --no-audit --no-fund` | Dos paquetes agregados, requeridos para la función solicitada. | 4 s tras habilitar acceso de red del comando. |
| `node scripts/prepare-demo-assets.mjs` | Paquete SQL sincronizado con fuentes. | <1 s; `demo-sql.json`. |
| `npm.cmd test` | **105 pruebas aprobadas**: 92 anteriores + 8 PGlite HAZMAT + 5 adaptador mobile. | Aproximadamente 25–35 s; `.test-dist`, bases PGlite y `hazmat-regression.log`. |
| `npm.cmd run test:hazmat` | **13 aprobadas**. | 3 s; `hazmat-targeted.log`. |
| `npm.cmd run test:multirole:web` con `FOURPACK_TEST_PORT=3004` | **9 verificaciones aprobadas**, recorrido estándar. | Aproximadamente 30–50 s; `hazmat-multirole-browser.log`. |
| `npm.cmd run test:hazmat:web` con `FOURPACK_TEST_PORT=3004` | **10 verificaciones aprobadas**, HAZMAT más recorrido estándar completo. | Aproximadamente 40–60 s; `hazmat-web.log`, reporte JSON y base aislada. |
| `npm.cmd run test:web` | **21 verificaciones aprobadas**, regresión del panel operador. | Aproximadamente 35–60 s; `hazmat-operator-browser.log`. |
| `npm.cmd run typecheck` | Aprobado en mobile, web y dominio. | 8–10 s; `hazmat-typecheck.log`, cachés TypeScript. |
| `npm.cmd run lint` | Aprobado, sin autofix. | 4–5 s; `hazmat-lint.log`. |
| `npm.cmd run build:web` con `FOURPACK_DIST_DIR=.next/hazmat-build` | Aprobado. | 12–20 s; build aislado y `hazmat-build-web.log`. |
| `npm.cmd run build:mobile` con `CI=1` | Exportación Android aprobada, sin construir ni instalar APK. | Aproximadamente 15–30 s; `apps/mobile/dist/android`, `hazmat-build-mobile.log`. |
| `git diff --check` | Sin errores de espacios. | <1 s; avisos LF/CRLF de Windows. |

Última evidencia de navegador HAZMAT:
`.4pack-demo/multirole-browser-dFle9Q/browser-report.json`: `passed: true`,
10 verificaciones, `errors: []`, tres arranques (inicial y dos reinicios).
La inspección de PGlite se realiza solo con el servidor detenido: no se abre
esa base simultáneamente desde otro proceso.

## Fallos encontrados y estado final

- El primer intento de commit no pudo escribir el índice Git situado en la
  carpeta padre; se resolvió con el permiso de herramienta correspondiente.
  Faltaba identidad Git: se reutilizó `Codex <codex@localhost>` por comando,
  sin configurar una identidad personal ni alterar ajustes globales.
- La primera instalación restringida falló con `EACCES` al acceder al registro
  npm; el comando autorizado completó la instalación de los dos módulos.
- Hubo errores de typecheck durante la adaptación de la firma `createCargo`
  y al retirar una rama demo que ya no se usaba; se corrigieron y el typecheck
  final terminó correctamente.
- Dos tests antiguos dependían de supuestos que dejaron de ser ciertos al
  agregar MSDS ficticios vinculados: ausencia de todo documento visible al
  competidor y orden del primer MSDS. Las verificaciones se hicieron específicas
  al documento privado/ID que querían proteger, conservando la exigencia original.
- El puerto 3002 estaba ocupado por el servidor de demo anterior; se preservó
  y se usó 3004 para pruebas. Los servidores propios de los tests se detienen.
- Reenviar con Playwright una captura multipart con archivo produjo
  `Unexpected end of form`: la captura no reconstruía el cuerpo binario completo.
  Se reemplazó por un segundo envío desde el formulario real y se comprobó la
  ausencia de duplicados en la base tras reiniciar.
- Los fallos `EEXIST`/`ENOTDIR` de la prueba de almacenamiento son **inyectados y
  esperados**, no errores abiertos del resultado final.
- Metro advirtió que `NO_COLOR` se ignora cuando está definido `FORCE_COLOR`;
  no impidió la exportación Android. Git muestra avisos LF/CRLF.

**No quedaron pruebas fallidas en la ejecución final.**

## Primer bloqueo pendiente y reproducción posterior

No queda un corte reproducible del circuito probado en el entorno PGlite aislado.
El primer bloqueo para certificar el mismo flujo conectado sigue siendo la falta
de un Supabase de pruebas preparado: URL, clave pública, Auth, base, Storage,
gateway documental y cuentas separadas. No se imprimieron secretos ni se
ejecutaron migraciones o funciones sobre un remoto.

Para observar la falta de configuración: iniciar la web sin el opt-in PGlite y
sin configuración Supabase y abrir `/cargas/nueva` o `/admin`; el proxy deriva a
`/acceso?configuracion=pendiente`. La demo aislada evita ese corte únicamente en
su modo explícito de ensayo.

Siguiente verificación, cuando se autorice y prepare ese entorno:

1. Aplicar 0023 y actualizar el gateway en un entorno de pruebas autorizado,
   revisar las cargas históricas que pasan a borrador y confirmar el bucket
   privado/políticas. **No se hizo en esta sesión.**
2. Repetir con importador, operador y admin reales de prueba: PDF correcto,
   falso, ausente, fallo de red durante subida y respuesta perdida; verificar un
   solo cargo/documento y el rechazo de adjudicación sin vínculo válido.
3. Ejecutar adjudicación y rechazo documental con conexiones PostgreSQL reales
   concurrentes. PGlite serializa; no acredita ausencia de deadlocks en remoto.
4. Construir un development client/APK actualizado con los módulos nuevos y
   probar en dispositivo físico: selector de archivos, multipart desde URI,
   conectividad, error/reintento y recorrido estándar. La exportación JavaScript
   no certifica que un APK anterior incluya los módulos nativos nuevos.

## Riesgos y límites restantes

- **P1:** falta certificar Auth, Storage/gateway y RPC con Supabase real y el
  selector/subida en dispositivo. No se debe presentar como validación productiva.
- **P1:** el rechazo regulatorio del contenido de una ficha y su revisión humana
  son distintos de la validez técnica de este bloque; el sistema no determina
  si un PDF describe correctamente la mercadería peligrosa.
- **P2:** las claves se conservan durante el intento del formulario montado.
  Recargar/cerrar la pantalla inicia otro intento; no hay recuperación de borrador
  entre sesiones de edición. El reintento probado usa los mismos datos y claves;
  no se afirma deduplicación global de publicaciones intencionalmente nuevas.
- **P2:** pueden quedar borradores privados u objetos privados huérfanos tras
  abandonar un intento o una respuesta incierta; planificar limpieza trazable.
- No se desarrollaron contratación directa, rehire ni resolución integral de
  controversias. No se grabó video.

## Evidencia para la planilla

| Entregable | Evidencia disponible | URL pública verificada |
| --- | --- | --- |
| Checkpoint multirrol | Commit local `29c832f9785f4b95a929503c1f70168fff0aac02` y `docs/17-bloque-1-multirrol-local.md`. | pendiente de publicación |
| Publicación HAZMAT web | Formulario/acción, gateway y reporte de navegador `multirole-browser-dFle9Q/browser-report.json`. | pendiente de publicación |
| Seguridad de publicación/adjudicación | Migración 0023 y 8 tests PGlite en `tests/hazmat.test.mjs`. | pendiente de publicación |
| Publicación HAZMAT mobile | Pantalla, adaptador, 5 tests automatizados y bundle Android local. Dispositivo no verificado. | pendiente de publicación |
| Recorrido multirrol estándar preservado | 9 verificaciones específicas; también incluido en las 10 verificaciones HAZMAT con dos reinicios. | pendiente de publicación |
| Regresión y builds | 105 tests, 21 verificaciones del panel, typecheck, lint, build web y exportación Android locales. | pendiente de publicación |
| Informe del bloque 02 | Este archivo Markdown real, en carpeta propia sin reemplazar informes anteriores. | pendiente de publicación |
| Video | Diferido por el usuario; sin grabación de este bloque. | No disponible |

No se verificaron URLs públicas nuevas, PR, CI remota ni demo pública en esta
sesión local. No se atribuye evidencia de este bloque a un SHA remoto anterior.

## Estado Git y límites de la sesión

Se conserva la rama QA y el trabajo ajeno. El ZIP previo y los cambios generados
de Next quedan locales. No se incluyen archivos de entorno, secretos, bases de
demo ni directorios de dependencias en los commits.

El bloque funcional se guardó en `10a57224f94f2879fdc78238853ee3deb0a3000d`.
Este informe se guarda en un commit documental posterior para poder registrar
ese SHA completo; no agrega cambios funcionales. El HEAD documental se consulta
con `git log -1 --format=%H -- docs/informes/bloque-02-hazmat-msds/informe.md`.

Estado local que permanece excluido al cerrar:

```text
 M apps/web/next-env.d.ts
 M apps/web/tsconfig.json
?? 4PACK_Documentacion_Seminario_2026-11-16.zip
```

El control previo al commit funcional revisó 24 archivos preparados: no encontró
rutas de entorno/artefactos excluidos ni patrones de credenciales privadas. Es
una comprobación local de patrones, no una certificación externa de seguridad.

No se hizo **push, merge, despliegue ni migración remota**. Las migraciones se
ejecutaron únicamente en PGlite local para las verificaciones. El siguiente paso
es revisar el commit local y preparar la validación conectada/dispositivo antes
de publicar evidencias o grabar el video.
