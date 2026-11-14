# Informe post-implementación — 4PACK, etapa 1

Fecha de revisión: 14 de noviembre de 2026, zona America/Buenos_Aires.

Directorio auditado: `C:\Users\Asus Tuf\Documents\4PACK\4pack-v3`.

Este documento permite auditar el estado local sin depender del resumen del chat. Distingue **hechos observados**, **resultados ejecutados**, **inferencias de código** y **no verificado**. No se realizaron correcciones durante su preparación. Las referencias son relativas a la raíz de `4pack-v3`; las líneas corresponden al código inspeccionado en esta revisión.

## A. Resumen ejecutivo

1. La etapa implementada endureció documentos/Storage, adjudicación, estados, monedas y reputación. No implementó Capacity, contratación directa, recontratación, pagos por tramos ni resolución administrativa de controversias.
2. Hay **43 archivos agregados o modificados respecto del punto de restauración anterior a la etapa**. Esto es distinto del diff contra HEAD: parte del panel, Android, scripts, pruebas y migraciones ya estaban sin confirmar antes de intervenir.
3. La rama sigue en `codex/4pack-qa-readiness`, HEAD `f808655a1272e6dcdf70aabdb648ff2fda432644`. No hay cambios staged. Las nuevas correcciones y muchas piezas preexistentes continúan sin seguimiento Git.
4. En esta revisión se ejecutaron nuevamente las suites: **10 dominio + 33 base/RLS + 4 Preview = 47 pruebas**, todas aprobadas. También aprobaron **17 recorridos del panel** y una repetición de las **10 pruebas específicas** de la etapa. Estas últimas ya integran las 33 de base: no son diez casos únicos adicionales.
5. Typecheck, lint sin autofix, build web, export Android, comprobación del contrato y `git diff --check` terminaron con exit 0. Las duraciones y logs están en H.
6. **No hay validación integrada de la Edge Function con Supabase Storage real**, ni prueba de concurrencia entre conexiones PostgreSQL independientes, ni ejecución mobile en dispositivo. Un build exitoso no acredita estos recorridos.
7. Las migraciones 0015 y 0016 se ejecutaron en bases locales de prueba PGlite. No se aplicaron a Supabase remoto. El estado efectivo remoto y los despliegues actuales son **no verificados**.
8. No se identificó un P0 confirmado en la revisión local. Hay P1 abiertos antes del MVP/promoción: integración documental, adopción coordinada de esquema/clientes, concurrencia real, identidad comercial pública y cierre coherente de estados excepcionales, entre otros detallados en J.
9. La comparación SHA-256 antes/después de las verificaciones no detectó cambios en archivos fuente preexistentes. El único archivo fuente/documental creado durante esta preparación es este informe; las pruebas generaron o actualizaron artefactos locales ignorados.

Confianza: alta sobre los archivos y pruebas locales inspeccionados; limitada sobre infraestructura, datos, credenciales, políticas y clientes efectivamente desplegados. No se afirma preparación productiva completa.

## B. Punto de restauración

**Existe y fue verificado nuevamente en esta revisión.**

- Archivo: `.4pack-demo/restore-stage1/4pack-v3-before-stage1.zip`.
- Contenido: **171 archivos** versionados o no ignorados de `4pack-v3`, con sus rutas relativas; incluye el panel original de operador, migraciones 0009–0014, pruebas, scripts, documentación y Android/mobile.
- SHA-256 del ZIP: `049B78DC7C539A9F94F8DEEC961B671EA5D1300F0A33D7629AF8539FA0F5300E`.
- Inventario SHA-256: `.4pack-demo/restore-stage1/inventory.json`.
- Estado Git original: `.4pack-demo/restore-stage1/git-status.txt`; referencia original: `head.txt`.
- Se comprobaron los 171 contenidos de las entradas del ZIP contra sus hashes. No se incluyeron proyectos hermanos ni archivos externos a `4pack-v3`.
- No es un commit, tag, stash, backup de base ni snapshot de dependencias. Está en un directorio ignorado y solo conserva la copia local disponible. No preserva `.env` ignorados, `node_modules`, caches, bases demo ni historial Git. Los valores secretos no se incorporan a este informe.

### Cómo volver a ese estado

1. Conservar primero el estado actual en otra copia; no ejecutar una restauración sobre trabajo sin preservar.
2. Extraer el ZIP en un **directorio nuevo y vacío**. Verificar archivos y hashes con `inventory.json`. Ese directorio reproduce los fuentes previos a la etapa, incluidos los archivos que ya eran nuevos y sin seguimiento.
3. Revisar `git-status.txt`: `apps/mobile/expo-env.d.ts` ya estaba eliminado y por eso no aparece en el ZIP. Extraer en vacío conserva esa ausencia; superponer sobre otra versión no la reproduce necesariamente.
4. Para usar nuevamente el árbol original, comparar explícitamente esa extracción con el árbol actual y decidir qué reemplazar y qué archivos exclusivos de esta etapa retirar. No basta con superponer el ZIP: quedarían archivos agregados posteriormente. No se ejecutó esa restauración durante esta revisión.
5. Dependencias, configuración secreta e infraestructura deben recuperarse por separado. No usar `git reset --hard`, `git clean` o un checkout de HEAD como sustituto: HEAD no contiene los archivos originales sin seguimiento preservados en el ZIP.

Evidencia: ZIP e inventario anteriores; `docs/14-etapa-1-seguridad-y-baseline.md`, sección «Hechos y punto de restauración».

## C. Inventario de cambios

### C.1 Qué se compara

- **Contra HEAD:** muestra la totalidad del trabajo local versionado, incluidos cambios anteriores a esta etapa. No incluye el contenido de archivos sin seguimiento.
- **Contra el ZIP inicial:** atribuye los 43 archivos de esta etapa. Se verificó que sus hashes coinciden con `.4pack-demo/restore-stage1/stage1-files.json`, sin discrepancias al comenzar esta revisión.
- **Durante este informe:** se creó el presente Markdown y se generaron artefactos de verificación. No se corrigió código ni se alteraron migraciones, pruebas, manifiestos o configuraciones existentes.

### C.2 Los 43 archivos de esta etapa

| Archivo | Contra snapshot | Responsabilidad del cambio |
|---|---|---|
| `apps/mobile/metro.config.cjs` | Nuevo | Resolver imports NodeNext del dominio en Metro |
| `apps/web/src/app/documentos/actions.ts` | Nuevo | Subida desde servidor a Edge autenticado |
| `apps/web/src/features/operator/actions.ts` | Modificado | Subida por gateway, bytes y descarga temporal |
| `apps/web/src/features/operator/data.ts` | Modificado | Adaptador confiable de subida documental demo |
| `apps/web/src/features/operator/demo-runtime.mjs` | Modificado | Aplicacion unica de migraciones y soporte de Storage local |
| `apps/web/src/features/operator/demo-sql.json` | Modificado | Paquete SQL demo regenerado en la etapa implementada |
| `apps/web/src/features/operator/forms.tsx` | Modificado | USD/ARS eliminado, moneda contractual y confirmacion |
| `apps/web/src/features/operator/panel.tsx` | Modificado | Fases canonicas, monedas e historial sin puntuacion ficticia |
| `apps/web/src/features/operator/types.ts` | Modificado | Moneda en garantia y promedio nullable |
| `apps/web/src/features/operator/ui.tsx` | Modificado | Etiquetas del contrato canonico |
| `apps/web/src/lib/document-upload.ts` | Nuevo | Subida desde servidor a Edge autenticado |
| `docs/14-etapa-1-seguridad-y-baseline.md` | Nuevo | Entrega tecnica anterior con baseline, decisiones y limites |
| `packages/domain/src/operation-contract.json` | Nuevo | Fuente canonica de nueve estados |
| `packages/domain/src/operator.ts` | Modificado | Dominio usa contrato compartido y reputacion nullable |
| `scripts/prepare-operation-contract.mjs` | Nuevo | Generacion/comprobacion SQL del contrato |
| `supabase/demo/bootstrap.sql` | Modificado | Rol de servicio y metadata en Storage simulado |
| `supabase/demo/operator-seed.sql` | Modificado | Fixture operativo adaptado a fase in_progress |
| `supabase/functions/_shared/document-validation.d.mts` | Nuevo | Validador compartido de bytes y declaracion TypeScript |
| `supabase/functions/_shared/document-validation.mjs` | Nuevo | Validador compartido de bytes y declaracion TypeScript |
| `supabase/functions/document-upload/index.ts` | Nuevo | Gateway Edge autenticado para subida y registro |
| `supabase/migrations/0015_document_gateway.sql` | Nuevo | Vinculo privado de objetos, permisos y RPC documental |
| `supabase/migrations/0016_operation_contract.sql` | Nuevo | Contrato operativo, adjudicacion, monedas y reputacion |
| `tests/database.test.mjs` | Modificado | Upgrade historico y assertions del contrato/gateway nuevos |
| `tests/document-gateway-helper.mjs` | Nuevo | Doble explicito del gateway confiable |
| `tests/operator-browser.test.mjs` | Modificado | Chrome headless, contrato nuevo y limpieza del servidor propio |
| `tests/operator.test.mjs` | Modificado | Expectativas de estados y ausencia de historial |
| `tests/stage1.test.mjs` | Nuevo | Diez casos especificos de seguridad e integridad |
| `apps/mobile/app/(tabs)/index.tsx` | Modificado | Presentacion de estados y recepcion por importador |
| `apps/mobile/app/(tabs)/operations.tsx` | Modificado | Presentacion de estados y recepcion por importador |
| `apps/mobile/app/_layout.tsx` | Modificado | Restriccion mobile a cuentas de importador |
| `apps/mobile/app/operation/[operationId].tsx` | Modificado | Presentacion de estados y recepcion por importador |
| `apps/mobile/lib/dashboard.ts` | Modificado | Lectura de fase/moneda y cierre por importador; helpers bloqueados |
| `apps/web/src/app/admin/page.tsx` | Modificado | Moneda de cada garantia en registro administrativo |
| `apps/web/src/app/ofertas/[cargoId]/page.tsx` | Modificado | Comparacion monetaria y reputacion sin cero ficticio |
| `apps/web/src/app/ofertas/page.tsx` | Modificado | Comparacion monetaria y reputacion sin cero ficticio |
| `apps/web/src/app/operaciones/[operationId]/page.tsx` | Modificado | Estados canonicos, moneda y finalizacion por importador |
| `apps/web/src/app/operaciones/page.tsx` | Modificado | Estados canonicos, moneda y finalizacion por importador |
| `apps/web/src/components/document-repository.tsx` | Modificado | Sustituir insercion directa por accion autorizada |
| `apps/web/src/components/operation-controls.tsx` | Modificado | Garantia simulada y confirmacion de recepcion |
| `apps/web/src/lib/dashboard-data.ts` | Modificado | Adaptadores de fase, moneda y reputacion por rol |
| `package.json` | Modificado | Suite especifica de base y check del contrato |
| `packages/domain/tsconfig.json` | Modificado | Permitir importacion JSON del contrato |
| `tests/tsconfig.json` | Modificado | Permitir importacion JSON del contrato |

Leyenda: «Nuevo» significa ausente del snapshot inicial, no necesariamente staged; «Modificado» significa contenido distinto del snapshot. El manifiesto original también incluye hashes por archivo. Los nuevos callbacks/helpers que conservan consumidores históricos no implican eliminación de datos.

### C.3 Cambios locales anteriores que se preservaron

El snapshot inicial ya registraba modificaciones de `.gitignore`, manifiestos y lockfile, configuración Expo/TypeScript y Next/ESLint, páginas de acceso/layout/inicio, proxy y exportaciones de dominio. También contenía panel, Android, scripts, docs 11–13, SQL demo, migraciones 0009–0014 y pruebas aún sin seguimiento. No corresponde atribuir todo ese contenido a la etapa de corrección.

En particular, el cambio de dependencias React y la mayor parte del diff de `package-lock.json` ya existían. Durante la etapa no se instalaron dependencias. El diff completo contra HEAD contiene el lockfile: sus cambios no acreditan instalación limpia reproducida en otro equipo.

**Eliminado observado:** `apps/mobile/expo-env.d.ts`, eliminación previa a la etapa. No se eliminó código preexistente como parte de esta etapa. Durante el diagnóstico histórico se creó y descartó un lanzador de pruebas sin consumidores; no forma parte del estado final.

El inventario completo de archivos actualmente sin seguimiento figura en L, incluidos los binarios y recursos Android que no aparecen en `git diff`.

## D. Arquitectura afectada

Stack declarado: monorepo npm con `apps/web` (Next 16.4.6, React 19.1.0), `apps/mobile` (Expo ~54.0.31, RN 0.81.5) y `packages/domain` (TypeScript). Persistencia declarada: Supabase/PostgreSQL; simulación local/Preview: PGlite. Dependencias críticas: Supabase JS ^2.119.0, SSR ^0.12.7, PGlite ^0.5.16 y Playwright Core ^1.65.0.

Flujo documental nuevo declarado:

```text
UI importador / panel operador
  -> acción de servidor Next con sesión
  -> Edge Function document-upload: JWT + bytes + destino
  -> Storage privado: ruta UUID + hash/metadatos de servidor
  -> register_document_upload (solo rol de servicio)
  -> documents + document_objects
  -> lectura autorizada + URL firmada temporal
```

La demo reemplaza Edge/Storage real por filesystem y un adaptador confiable PGlite. Por eso probar su descarga no demuestra la integración HTTP con Supabase Storage.

Estados: `operation-contract.json` -> importación directa TypeScript -> SQL generado mediante `prepare-operation-contract.mjs` -> RPC `transition_operation`. Web y mobile muestran `phase`. Se conserva `operations.status`/`cargo_status` como proyección de compatibilidad y seguimiento; algunas métricas/progresos todavía los consultan.

Adjudicación: RPC transaccional sobre carga, oferta, aprobación, operación, garantía y evento. Finanzas: `numeric` persistido, ledger simulado con `event_key` único. Los cálculos/formatos de presentación aún usan `number` de JavaScript.

No existe paquete común de UI entre web y mobile. El panel sigue concentrado en `features/operator/panel.tsx`. La lógica de autorización por rol y garantía no está completamente expresada en el JSON de estados: SQL agrega reglas adicionales.

## E. Estado funcional actual

«FUNCIONAL» significa respaldado por pruebas locales del componente; **no certifica producción**. «PARCIAL» indica implementación con recorridos pendientes, límites o integración no probada. «SOLO DEMO/MOCK» identifica una simulación deliberada; no significa que todo el producto use mocks.

| Componente | Clasificación | Qué se comprobó y qué falta |
|---|---|---|
| Autenticación | PARCIAL | Código Supabase `getUser`, login y proxy presentes; E2E comprueba protección sin sesión. Login real, renovación y recuperación con Supabase remoto: no verificados. |
| Roles | FUNCIONAL local | importer/operator/admin y restricciones SQL probadas; no hay prueba de autenticación real para cada rol. |
| Verificación administrativa | PARCIAL | UI aprueba/rechaza; SQL protege campos y soporta suspensión. UI administrativa no ofrece ciclo completo de suspensión ni prueba E2E administrativa. |
| Perfiles de operadores | PARCIAL | Edición privada, identidad legal protegida y documentos. Perfiles comerciales públicos previos a contratar siguen ausentes/restringidos por RLS. |
| Licitación | PARCIAL | Cargas, cierre, ofertas y adjudicación persistentes en SQL. Publicación completa por importador con sesión real no fue probada de extremo a extremo. |
| Ofertas privadas | FUNCIONAL local | Lectura restringida a dueño/importador/admin y aislamiento frente a competidores probado; ofertas selladas y duplicados activos controlados. |
| Adjudicación | FUNCIONAL local | Creación transaccional, expiración/suspensión, doble adjudicación y reintentos probados. Concurrencia multi-conexión pendiente. |
| Operaciones | PARCIAL | Seguimiento, hitos, chat, garantía, avance y cierre. Estados excepcionales y resolución administrativa incompletos. |
| Máquina de estados | PARCIAL | Nueve estados canónicos, equivalencia SQL/JSON y permisos principales probados; subsisten proyecciones antiguas y no se agotaron todas las combinaciones estado/rol/garantía. |
| Documentos y Storage | PARCIAL | Registro/vínculo/RLS y bytes probados localmente; panel demo sube/reemplaza/descarga. Edge/Storage real no ejecutados: activación integrada pendiente. |
| Mensajería | FUNCIONAL local | Persistencia, privacidad, remitente y mensaje vacío probados; Realtime real y reconexión remota no verificados. |
| Reputación | PARCIAL | RPC por rol, operaciones completed, cantidad y null sin historial probados. Cachés de perfil y todo el recorrido de calificación en clientes reales requieren revisión. |
| Billetera/pagos | FUNCIONAL local, simulación | Ledger persistente simulado, comisión, retiro/reintegro e idempotencia de liberación probados. No hay dinero real ni custodia. No hay pagos por tramos. |
| Mobile importador | PARCIAL | Compila, typecheck y export Android pasan; selección de rol y confirmación por RPC presentes. No hay E2E en dispositivo/emulador. |
| Operador desde mobile | BLOQUEADO deliberadamente | Layout bloquea cuenta no importadora; helpers antiguos de cotización/avance rechazan. Se conservan datos históricos y consumidores del código anterior. |
| Panel web operador | FUNCIONAL local/demo | 17 recorridos headless: ofertas, operación, documentos, chat, wallet, soporte, perfil, responsive y cuentas restringidas. No cubren toda integración remota. |
| Panel administrativo | PARCIAL | Métricas y revisión de operadores; RPC de soporte/retiros existen y tienen pruebas SQL. Falta UI integral de esos procesos y de controversias. |
| Demo local | SOLO DEMO/MOCK | Aplicación de SQL real en PGlite con identidades/fixtures simulados y archivos locales. Recorridos completos ejecutados. |
| Preview | SOLO DEMO/MOCK | Se prueba política de activación y runtime simulando entorno Preview; despliegue Vercel real no visitado. Datos en almacenamiento temporal. |
| Capacity | AUSENTE | No hay modelo de límites/reservas/liberaciones; solo un punto de extensión comentado. |
| Contratación directa y recontratación | AUSENTE | No implementadas. |
| Pagos por tramos y resolución administrativa de controversias | AUSENTE | No implementados; fase disputed y soporte no sustituyen esos módulos. |

## F. Seguridad y cambios específicos de esta etapa

### F.1 Matriz de las 13 intervenciones solicitadas

| Punto | Problema anterior | Solución implementada y evidencia | Migración | Prueba ejecutada / límite restante |
|---|---|---|---|---|
| 1. Restauración | Trabajo versionado y nuevo mezclado en repo superior | ZIP exclusivo del proyecto, 171 archivos + SHA-256 + estado Git; sección B | No aplica | Hash de cada entrada verificado otra vez. No incluye bases/secretos/dependencias ignoradas. |
| 2. Acceso horizontal documental | Cliente podía asociar un `storage_path` conocido a metadatos propios | `document_objects`, revocación de INSERT y `register_document_upload`; `0015`:4,19,56 | 0015 nueva | `stage1`:107 y `database`:264; rechazan ruta conocida, objeto ajeno y RPC no autorizada. Solo modelo local de Storage. |
| 3. Storage | Política anterior confiaba en la existencia de `documents` visible | `can_read_document_object` y `bound document object reads`; `0015`:27,40 | 0015 nueva | SELECT del objeto por dueño/competidor y subida directa denegada. Storage real y permisos preexistentes remotos no verificados. |
| 4. Archivos | Validación desigual, ruta/metadatos controlables por cliente | `document-upload/index.ts`:13–38 y `validateDocumentBytes`:1; límite 10 MB, MIME, extensión, firma PDF/PNG/JPEG, UUID y SHA-256 | 0015 nueva; gateway nuevo | `stage1`:125 y E2E documental. Firma básica no valida estructura completa, malware ni contenido activo. Runtime Deno pendiente. |
| 5. Ofertas vencidas | `award_offer` no revalidaba vigencia al contratar | Relee oferta, estado, pertenencia, `valid_until` y deadline bajo bloqueo; `0016`:49–75 | 0016 nueva | `stage1`:19. Fixture de expiración se prepara como administrador en PGlite; no prueba un reloj remoto. |
| 6. Suspendidos | Oferta podía seguir siendo adjudicable tras suspender al operador | Revalida rol y aprobación; bloqueo `FOR SHARE` de perfil; `0016`:66 | 0016 nueva; aprobación/RLS en 0011 | `stage1`:19; `database`:69,371. Historial de operador suspendido queda restringido; política de acceso residual debe decidirse. |
| 7. Idempotencia | Reintento de adjudicación podía fallar sin recuperar resultado | Devuelve operación existente para la misma oferta, previa autorización; `0016`:59–63 | 0016 nueva | `stage1`:33 y43. No hay clave de idempotencia general para mensajes, tickets o hitos. |
| 8. Doble adjudicación | Riesgo de dos operaciones/ofertas ganadoras | Bloqueo común por carga, rechazo de otra oferta y unicidad de carga/oferta en `operations` | 0016; constraints de 0001 preservados | `stage1`:33,43; una operación y un ganador. PGlite serializa. |
| 9. Deadlock | Bloquear primero distintas ofertas podía formar un ciclo al actualizar hermanas | Orden carga -> oferta -> aprobación en adjudicación; `0016`:57,64,66; inserción de oferta bloquea carga en `guard_offer` | 0016 nueva; trigger en 0011 | Solapamiento simulado en `stage1`:43. Reduce el ciclo previsible; no demuestra ausencia de deadlocks globales. |
| 10. Estados | SQL/panel/mobile tenían transiciones diferentes y fases logísticas globales | JSON canónico, SQL generado, `transition_operation`; revoca escritura directa en operaciones y bloquea RPC antigua | 0016 nueva | `stage1`:55,121; `operator.test`. Persisten CargoStatus/progresos, roles en SQL y estados excepcionales incompletos. |
| 11. Mobile | Operador intentaba awarded -> in_transit con contrato incompatible | Layout importador, helpers deshabilitados, `confirmDelivery` y `phaseLabels`; `app/_layout.tsx`:6; `lib/dashboard.ts`:328 | 0016 rechaza `advance_operation`, línea133 | Export Android, typecheck, prueba `stage1`:69. La prueba mobile específica combina rechazo SQL y lectura estática del screen; no es E2E de app. |
| 12. Monedas | USD/ARS ambiguo y ledger/garantía supuestos USD | USD/ARS rechazado, USD y ARS separados, moneda en contrato/garantía/liberación, guard de importes; selector y comparador ajustados | 0016:18–47,166 | `stage1`:76 verifica ARS/25 de comisión/975 netos y FOB independiente. `_usd` conservado como deuda; historial ambiguo requiere reconciliación. |
| 13. Reputación | completed contaba rol equivocado y UI mostraba cero como puntuación | `public_reputation(uuid,text)`, fase completed, count, promedio null, caché por trigger y UI «Sin historial» | 0016:137–164 | `stage1`:90; `operator.test`; usuarios sin historia y ambos roles. Datos históricos/cachés no se certifican globalmente. |

### F.2 Controles y límites por superficie

- **RLS:** se habilita en tablas funcionales y nuevas vinculaciones. `asUser` usa rol authenticated y un claim simulado; es verificación SQL de autorización, no validación de JWT real. No se ejecutó SQL en remoto.
- **Privilegios:** `protect_account_fields`, guardas de alta y las políticas impiden autocambiar rol, aprobación, reputación o saldo en las pruebas. Las funciones antiguas renombradas/base se revocan al cliente para evitar saltarse los wrappers nuevos. Evidencia: migraciones 0004, 0011, 0013, 0014, 0015 y 0016.
- **Acciones de servidor:** `operatorSession` comprueba sesión/rol; demo exige entorno permitido y cookie de identidad simulada. `uploadAuthorizedDocument` verifica usuario y llama al gateway. Destino y bytes se vuelven a comprobar en el límite confiable. El booleano demo recibido desde UI no habilita producción por sí mismo.
- **RPC sensibles:** `award_offer`, `transition_operation`, `simulate_guarantee`, `operator_command`, `review_simulated_withdrawal`, `admin_support_reply`, `document_upload_target` y `register_document_upload`. No todas usan el mismo patrón de validación; las últimas dos quedan restringidas a servicio. El service role se lee en Edge, no se introduce en bundles web/mobile.
- **Estados directos:** se revocan INSERT/UPDATE/DELETE de `operations` a authenticated, incluido admin mediante ese rol. Las RPC SECURITY DEFINER siguen actuando como interfaz autorizada. Se restringe edición de cargas del importador a draft/open. El propietario de base y el rol de servicio continúan siendo límites privilegiados, no adversarios neutralizados por RLS.
- **Importes:** `guard_guarantee_contract` contrasta garantía, moneda y comisión con oferta/operación; `guard_contract_currency` rechaza monedas inválidas e importes no finitos. Constraints conservan positividad y precisión persistida. No se mueve dinero real.
- **Documentos ajenos:** propietario/ruta/objeto/destino quedan unidos en tabla privada. La aplicación no recibe autorización por copiar una ruta en `documents`. Las URLs firmadas duran 60 segundos; son enlaces de posesión hasta expirar y no se prueba revocación inmediata de uno ya emitido.
- **Ofertas competidoras:** las políticas restringen SELECT y las pruebas lo comprueban. No se detectó lectura horizontal de ofertas en los casos ejecutados; no es una auditoría exhaustiva de todo endpoint remoto.
- **Información del operador:** `related_profile` limita perfiles a propio/admin/relaciones por operación. Protege contactos previos pero también impide el perfil comercial público exigido por 3.0. No se resolvió separando columnas públicas/privadas. Las pantallas usan valores genéricos cuando esos perfiles no son legibles.
- **Subidas:** la firma solo verifica bytes iniciales. La función revisa Content-Length si existe, pero primero parsea el multipart para comprobar el tamaño real; el consumo con peticiones grandes/chunked depende de límites de plataforma, no comprobados aquí. La compensación Storage->SQL no es una transacción distribuida; no hay evidencia de recuperación ante caída entre pasos o fallo de compensación.
- **Secretos:** no se revelan valores ni se modificaron `.env`. No hay certificación del historial completo Git o archivos ignorados. Android contiene un debug.keystore; su inclusión en un APK final y firma productiva no se verificaron.

## G. Migraciones y datos

Todas las migraciones encontradas, en orden:

| Orden / archivo | Finalidad | Situacion antes de etapa | Modificada en etapa | Estado Git actual |
|---|---|---|---|---|
| `supabase/migrations/0001_initial_schema.sql` | Esquema inicial, enums, RLS y grants | Existia | No (hash igual al ZIP) | Versionada, sin cambios |
| `supabase/migrations/0002_cargo_role_policy.sql` | Rol importador en cargas | Existia | No (hash igual al ZIP) | Versionada, sin cambios |
| `supabase/migrations/0003_documents_and_offers.sql` | Documentos, bucket y ofertas | Existia | No (hash igual al ZIP) | Versionada, sin cambios |
| `supabase/migrations/0004_profile_role_security.sql` | Proteccion de rol y verificacion | Existia | No (hash igual al ZIP) | Versionada, sin cambios |
| `supabase/migrations/0005_award_offer_workflow.sql` | Adjudicacion transaccional original | Existia | No (hash igual al ZIP) | Versionada, sin cambios |
| `supabase/migrations/0006_operation_tracking.sql` | Tracking y garantia simulada | Existia | No (hash igual al ZIP) | Versionada, sin cambios |
| `supabase/migrations/0007_message_security.sql` | Seguridad de mensajes | Existia | No (hash igual al ZIP) | Versionada, sin cambios |
| `supabase/migrations/0008_documents_and_ratings.sql` | Destino documental y calificaciones | Existia | No (hash igual al ZIP) | Versionada, sin cambios |
| `supabase/migrations/0009_operator_verification_status.sql` | Estado de verificacion adicional | Existia | No (hash igual al ZIP) | Sin seguimiento (`??`) |
| `supabase/migrations/0010_operator_panel_model.sql` | Modelo ampliado de panel, wallet, soporte y auditoria | Existia | No (hash igual al ZIP) | Sin seguimiento (`??`) |
| `supabase/migrations/0011_operator_security.sql` | RLS/guardas y snapshot de operador | Existia | No (hash igual al ZIP) | Sin seguimiento (`??`) |
| `supabase/migrations/0012_operator_commands.sql` | Comandos del panel y finanzas simuladas | Existia | No (hash igual al ZIP) | Sin seguimiento (`??`) |
| `supabase/migrations/0013_operator_hardening.sql` | Endurecimiento de altas/ofertas/soporte | Existia | No (hash igual al ZIP) | Sin seguimiento (`??`) |
| `supabase/migrations/0014_operator_polish.sql` | Pulido, codigos, auditoria, adjuntos y retiros | Existia | No (hash igual al ZIP) | Sin seguimiento (`??`) |
| `supabase/migrations/0015_document_gateway.sql` | Gateway y vinculo privado de objetos documentales | No existia: creada | Nueva | Sin seguimiento (`??`) |
| `supabase/migrations/0016_operation_contract.sql` | Contrato operativo, adjudicacion, monedas y reputacion | No existia: creada | Nueva | Sin seguimiento (`??`) |

**Comprobación de origen:** los hashes de 0001–0014 son iguales a los del ZIP anterior a la etapa. Ninguna fue modificada. 0009–0014 ya existían localmente sin seguimiento; 0015/0016 se crearon en esta etapa y tampoco están versionadas.

**Ejecución:** las pruebas de dominio no migran bases. `test:database`, `test:preview` y el panel demo crean/actualizan bases locales PGlite y aplican SQL; la prueba de upgrade carga además un esquema histórico poblado. No se ejecutaron migraciones remotas ni seeds sobre Supabase. Que un SQL haya pasado en PGlite no implica que esté aplicado remotamente.

**Paquete demo:** `apps/web/src/features/operator/demo-sql.json` contiene las 16 migraciones y las semillas/bootstrap. `test:preview` compara textos y nombres contra los archivos y pasó en esta revisión. `check:contract` también pasó. No se regeneró ningún paquete como corrección durante este informe.

**Compatibilidad de migración:** 0015/0016 son migraciones de aplicación única; no se afirma idempotencia de ejecutar manualmente sus archivos dos veces. La prueba «migraciones aditivas idempotentes» verifica replay de 0009–0014 antes de aplicar las nuevas. El runtime demo evita reinstalar funciones antiguas al refrescar: aplica archivos que aún no tienen entrada en `local_demo_versions`.

**Divergencia:** el runtime calcula/almacena checksums pero no rechaza ni reaplica automáticamente un archivo ya registrado cuyo contenido fue cambiado. Una base demo persistente puede quedar desactualizada si se editan migraciones aplicadas. La suite fresca no demuestra equivalencia de toda base demo ya existente.

**Datos y adopción pendientes:**

- 0015 solo vincula documentos históricos si existe objeto y coinciden ruta, `owner_id` y cargador. Los demás pueden quedar con metadatos visibles y archivo inaccesible. No se inventaría ni se volvería a subir ese contenido automáticamente.
- 0016 migra fases y mantiene estado grueso; para completed sin fecha asigna `completed_at = awarded_at` como fallback. Esa fecha no prueba cuándo terminó una operación histórica y requiere revisión antes de migrar datos reales.
- Las operaciones históricas adjudicadas no USD provocan una excepción de reconciliación. La constraint monetaria `NOT VALID` conserva ofertas ambiguas existentes, pero no permite escribirlas. Incluso rechazar una oferta hermana ambigua al adjudicar otra puede requerir esa reconciliación previa.
- Conservar `_usd` evita renombrar el contrato de datos anterior, pero para nuevos contratos ARS esos campos representan la moneda asociada. No hay conversión automática.
- Aplicar 0015 sin gateway operativo rompe las subidas de clientes anteriores; actualizar web/mobile sin esquema/RPC compatibles también puede fallar. Se necesita una promoción y reversión coordinadas, aún no ejecutadas.

## H. Pruebas ejecutadas en esta revisión

Entorno observado: Windows/PowerShell, Node `v26.13.1`, npm `11.20.0`. Se usó `npm.cmd` sin alterar la política de ejecución de PowerShell. Todos los comandos se ejecutaron desde la raíz de `4pack-v3`, secuencialmente, sin instalaciones ni autofix.

Los resultados originales están en `.4pack-demo/post-implementation/results.json`; cada log completo está indicado en la tabla. Las duraciones son tiempos de pared medidos por el runner, incluyen arranque del comando y no son benchmarks.

| Comando exacto | Resultado | Casos | Duracion aprox. | Error/advertencia | Artefactos locales | Log |
|---|---|---|---|---|---|---|
| `npm.cmd run test:domain` | exit 0 | 10/10 | 1.68 s | Ninguno en el log | .test-dist; log | `.4pack-demo/post-implementation/01.log` |
| `npm.cmd run typecheck` | exit 0 | No aplica: 3 workspaces | 6.17 s | Ninguno en el log | .tsbuildinfo; log | `.4pack-demo/post-implementation/02.log` |
| `npm.cmd run lint` | exit 0 | No aplica | 2.96 s | Ninguno en el log | Log, sin autofix | `.4pack-demo/post-implementation/03.log` |
| `npm.cmd run test:database` | exit 0 | 33/33 (23 previas + 10 etapa) | 3.75 s | Ninguno en el log | PGlite en memoria; log | `.4pack-demo/post-implementation/04.log` |
| `npm.cmd run test:preview` | exit 0 | 4/4 | 3.79 s | Ninguno en el log | Fixture PGlite/directorio temporal en .4pack-demo; log | `.4pack-demo/post-implementation/05.log` |
| `npm.cmd run test:web` | exit 0 | 17/17 recorridos | 48.05 s | Ninguno en el log | .next-e2e, base/archivos aislados, capturas y log de servidor | `.4pack-demo/post-implementation/06.log` |
| `npm.cmd run build:web` | exit 0 | No aplica: compilacion | 7.53 s | serverActions experimental; sin error | .next, tipos/manifest/caches de build; log | `.4pack-demo/post-implementation/07.log` |
| `npm.cmd run build:mobile` | exit 0 | No aplica: export Hermes | 12 s | Ninguno en el log | dist/android: bundle Hermes (3,27 MB), 25 assets y metadata; cache Metro/Expo; log | `.4pack-demo/post-implementation/08.log` |
| `node --test tests/stage1.test.mjs` | exit 0 | 10/10, repeticion | 2.4 s | Ninguno en el log | PGlite en memoria; log | `.4pack-demo/post-implementation/09.log` |
| `npm.cmd run check:contract` | exit 0 | No aplica: equivalencia | 0.47 s | Ninguno en el log | Log; no regenera SQL con --check | `.4pack-demo/post-implementation/10.log` |
| `git diff --check -- .` | exit 0 | No aplica: whitespace | 0.12 s | Avisos LF/CRLF; sin error | Log; ningun fuente | `.4pack-demo/post-implementation/11.log` |

Resumen: **ningún comando de verificación falló en esta revisión**. Se aprobaron 47 pruebas de las suites principales, 17 recorridos de navegador y 10 repeticiones específicas. Builds, lint/typecheck y checks no se cuentan como casos de prueba.

Cobertura concreta relevante:

- Dominio: HAZMAT, comisión, roles/aprobación, validación de oferta/documento, transiciones y reputación.
- SQL/RLS: ofertas competidoras, contactos previos, cuenta pendiente/suspendida, campos protegidos, oferta sellada, adjudicación, saltos de estado, pertenencia, mensajes, documentos, movimientos, retiros, soporte, auditoría y reemplazos.
- Etapa 1: expiración, suspensión, reintento, doble adjudicación, solicitudes solapadas iguales y competidoras, transición por rol, rechazo de RPC mobile antigua, moneda ARS, reputación por rol, ruta documental manipulada y firma/MIME/tamaño.
- Navegador: protección sin sesión; acceso demo; navegación/filtros; oferta persistente; adjudicación; hitos/chat; transición; documentos y reemplazo; historial/wallet; soporte y adjuntos; perfil; menú/responsive a 390px; secciones sin overflow y nombres accesibles; restricciones por verificación. El runner también exige ausencia de excepciones JavaScript registradas.
- Preview: política de habilitación, paquete SQL sincronizado, inicialización local simulando Preview y prohibición de demo en producción.

**Límites de prueba:** `document-gateway-helper.mjs` es un doble del servicio confiable; inserta registros de Storage local y metadatos. No valida la subida HTTP real ni JWT. La prueba de firma ejecuta el validador compartido con bytes reales, y la E2E de documentos usa la acción demo. PGlite serializa transacciones y no reproduce conexiones PostgreSQL paralelas. La comprobación mobile específica es SQL + inspección estática; el export Hermes no sustituye interacción en dispositivo. No se ejecutó axe en esta revisión ni se acredita WCAG completa.

No se ejecutaron en esta revisión: `npm test` como agregado (sí todos sus subcomandos), APK/EAS, Expo Go en dispositivo, emulador, pruebas iOS, instalación limpia, Deno/Edge, Storage real, staging Supabase o inspección de despliegues. Deno y CLI Supabase no están disponibles mediante `Get-Command` en este entorno. No se instalaron para esta tarea.

## I. Errores y advertencias

### I.1 Resultados actuales

- Fallos de pruebas actuales: **0**. Fallos actuales de typecheck/lint/builds/checks: **0**.
- `git diff --check` emite avisos LF -> CRLF en 17 rutas, pero termina con exit 0. No se normalizaron archivos.
- Next identifica `serverActions` como opción experimental. El build pasa; no es una prueba de compatibilidad de futuros upgrades.
- En esta ejecución del export Android no aparecieron advertencias NO_COLOR/FORCE_COLOR; se registraron en una ejecución histórica de la etapa, no se atribuyen al log actual.
- La verificación genera `.test-dist`, `.tsbuildinfo`, `.next`, `.next-e2e`, cachés/bundle Expo, `apps/mobile/dist/android`, bases/archivos/capturas demo y logs. No son cambios funcionales ni fueron incorporados al índice.
- El runner preservó en memoria `next-env.d.ts`, `tsconfig.json` y `AGENTS.md` por si Next los regeneraba. `generated-files-restored.json` es `[]`: no hizo falta restaurarlos al final. La comparación global de fuentes preexistentes confirmó igualdad de hashes.

### I.2 Fallos históricos de la implementación, conservados y diferenciados

No son fallos de esta revisión. Constan en `.4pack-demo/restore-stage1/` y en el informe 14:

| Fallo histórico | Diagnóstico / estado al terminar la etapa |
|---|---|
| `npm` bloqueado por política de ejecución de `npm.ps1` | Se usó `npm.cmd`, sin cambiar política del equipo. |
| Logs con `:` en nombre de archivo | Error de instrumentación Windows; comandos correspondientes se repitieron con nombres válidos. No se contaron como aprobados. |
| `test:web`: ECONNREFUSED en Chrome CDP 9222 | Runner original necesitaba navegador externo; se cambió a Chrome headless. Hoy pasa. |
| Export Android: no resuelve `./operator.js` | Metro no traducía el import NodeNext a TypeScript; `metro.config.cjs` agrega resolución específica. Hoy pasa. |
| Pruebas SQL durante integración: delimitador SQL de bloque mal emitido y rol service_role duplicado | Se corrigieron bootstrap/runtime antes del cierre de la etapa; no aparecen en la ejecución actual. |
| Reinstalación de RPC antiguas por replay demo | Se corrigió la aplicación de migraciones; se ajustó el test histórico para replay previo a nuevas migraciones, sin reabrir permisos en la base final. |
| Assertions de fases antiguas y cierre unilateral del operador | Se cambiaron a confirmed/awaiting_delivery_confirmation y cierre por importador, con tests negativos de rol. No se ocultaron los errores iniciales. |
| Reemplazos documentales: destino de operador sin id y mensajes distintos | Se ajustó el registro del destino propio y las validaciones; suites actuales pasan. |
| E2E con puerto ocupado, limpieza que quedaba esperando y lanzador directo Next sin manifest | El runner final comprueba puerto libre, usa CLI Next y termina solo su servidor. El lanzador de diagnóstico sin consumidores se descartó. Hoy la E2E completa termina con exit 0. |

No se corrigieron ni se alteraron pruebas para este informe. Los resultados históricos favorables no se usaron como sustituto de ejecutar el estado actual.

## J. Riesgos abiertos P0 / P1 / P2

### P0 — impide continuar

**No se identificó un P0 confirmado en la revisión local.** Esto no garantiza ausencia de vulnerabilidades remotas: no se inspeccionaron su estado efectivo ni datos. La siguiente actividad puede ser una revisión/validación; no debe interpretarse como autorización de promoción.

### P1 — resolver o cerrar con evidencia antes del MVP/promoción

| ID | Riesgo abierto | Evidencia y alcance | Próxima comprobación recomendada, no realizada |
|---|---|---|---|
| P1-01 | Integración documental no probada en Edge/Storage real | Gateway nuevo, RPC de servicio y dependencia de `storage.objects.metadata/user_metadata`; no runtime Deno ni remoto. | Validar JWT, permisos, metadata, firmas, destinos y URL firmada contra un entorno Supabase autorizado. |
| P1-02 | Despliegue incompatible entre clientes y esquema | 0015 revoca inserción; web requiere Edge; mobile nuevo requiere phase/contract_currency y RPC. Versiones remotas desconocidas. | Plan de adopción/reversión, inventario de clientes y migraciones efectivas; no activar piezas aisladas. |
| P1-03 | Correcciones sin versionar y restauración solo local | Migraciones 0009–0016, panel y otras piezas siguen sin seguimiento. HEAD no reproduce el producto probado. | Revisar inventario y preparar una referencia local reproducible explícitamente aprobada. No se creó commit aquí. |
| P1-04 | Concurrencia PostgreSQL no demostrada | PGlite serializa. El orden de bloqueos mejora award_offer, pero existen otras RPC y triggers. | Pruebas multi-conexión: dos ofertas, reintentos, suspensión simultánea, reserva futura y retiros/liberaciones concurrentes. |
| P1-05 | Identidad comercial pública todavía incompatible con 3.0 | `related_profile`, 0011:9–18; comparador consulta perfiles que RLS puede ocultar antes de adjudicar. | Decidir campos comerciales públicos vs contactos/credenciales privados y validar aislamiento. No abrir toda la tabla. |
| P1-06 | Ciclo excepcional incompleto | JSON deja disputed terminal sin resolución; transición cancelled/failed no resuelve automáticamente la garantía. Clientes antiguos aún derivan métricas de cargo_status. | Definir cierre administrativo, simulación económica y estados/proyecciones; revisar terminales sin liberar/devolver dos veces. No implementar Protect adicional sin revisión. |
| P1-07 | Migración de historial requiere reconciliación | 0015 puede dejar archivos antiguos sin vínculo; 0016 detiene operaciones no USD, conserva constraint NOT VALID y usa awarded_at como fallback de completed_at. | Inventariar datos reales y objetos huérfanos, decidir monedas/fechas y probar upgrade con copia saneada. |
| P1-08 | Recorridos reales importador/admin/mobile incompletamente validados | E2E centrada en operador demo; auth real, UI de suspensión, recepción mobile y revisión administrativa no cubiertas de extremo a extremo. | Validar con cuentas reales de prueba y dispositivo/emulador; completar matriz de permisos/transiciones de nueve estados. |

Capacity, contratación directa/recontratación, pagos por tramos y resolución administrativa siguen ausentes. Son **brechas P1 de alcance del MVP 3.0 completo**, pero estuvieron excluidas por instrucción de esta etapa. Se informan, no se implementan ni se priorizan por delante de cerrar las validaciones anteriores.

### P2 — planificables después, sin ocultar deuda

- `_usd` como nombre histórico para contratos ARS; `number` en cálculos de presentación; tipado de moneda/decimal más estricto pendiente. No hay mezcla de monedas en las sumas USD corregidas, pero el dashboard resume solo ocho garantías recientes, no un ledger global.
- Contrato compartido describe aristas/etiquetas, no todos los roles, precondiciones y efectos; CargoStatus y máquinas/etiquetas antiguas aún existen como compatibilidad. Progresos visuales son porcentajes fijos, no medición real de logística.
- Cachés `operator_profiles.rating/completed_operations`, promedios y todas las pantallas históricas requieren reconciliación global; el cambio de trigger no recertifica cada dato anterior.
- Registro demo no detecta activamente checksum divergente de una migración ya aplicada; fixtures y datos temporales no constituyen un entorno productivo ni una base permanente.
- SQL de Storage mockeado, firma básica sin antimalware, límites multipart de plataforma y compensación de archivos huérfanos sin prueba de caída. No se realizó prueba de denegación de servicio.
- URLs firmadas ya emitidas permanecen utilizables hasta expirar; no se acreditó revocación inmediata al suspender.
- Snapshot de operador agrega varias colecciones sin paginación y limita otras a 500; panel monolítico, adaptadores duplicados y consultas que silencian errores como vacío.
- Sin clave de idempotencia de petición general para mensajes/tickets/hitos o solicitudes de retiro; el ledger usa claves por evento para evitar duplicar liberaciones/reintegros.
- El bloqueo de operador en mobile es UX/rol del cliente; la RPC comprueba rol y pertenencia, no demuestra que el cliente físico sea web. Tokens válidos pueden invocar la API desde otro cliente autorizado.
- Accesibilidad parcial por código/E2E; falta axe/WCAG completa. Firma APK, emulador, iOS, instalación limpia y actualización de dependencias no verificados.

## K. Deuda técnica y decisiones adoptadas

1. **Preservar compatibilidad de columnas:** no se renombró dinero ni se eliminaron datos. Se agregaron monedas y fase canónica; toca completar una migración de contrato futura.
2. **Conservar código con consumidores:** helpers mobile permanecen pero rechazan acciones de operador; pantallas históricas no implican autorización de ejecutarlas.
3. **Límite confiable para documentos:** servicio de Edge con credencial disponible solo en runtime. Cambia requisitos de operación/despliegue; el formulario por sí solo ya no puede registrar objetos.
4. **Idempotencia por resultado en adjudicación:** misma oferta recupera misma operación; distinta oferta no se considera el mismo intento. Se mantienen restricciones de unicidad.
5. **Garantía/comisión como simulación:** no escrow real, pagos reales ni integración bancaria. La comisión se calcula sobre oferta del servicio. `simulatedNet` TypeScript es auxiliar; SQL persiste el resultado financiero.
6. **Fecha histórica:** fallback de completed_at evita null pero no representa evidencia de entrega; requiere decisión de auditoría de datos antes de promoción.
7. **Reputación por rol:** usuario sin evaluaciones devuelve average null; un usuario con operaciones completadas pero sin evaluaciones puede tener history verificado y promedio null. «Sin historial» en UI es una representación resumida, no una puntuación cero.
8. **Demostración separada:** PGlite usa esquema/SQL compartidos pero auth y objetos locales simulados. Preview usa `/tmp`, no persistencia garantizada entre instancias ni colaboración de sesiones productivas.
9. **No se cerró todo 3.0:** perfiles públicos, capacidad, canales directos y Protect completo requieren alcance y revisión propios.

## L. Estado Git final y control de no modificación

Raíz Git: `C:/Users/Asus Tuf/Documents/4PACK`. Todos los comandos y listados siguientes están limitados a `4pack-v3`; no se incluyen proyectos hermanos.

Rama: `codex/4pack-qa-readiness`.

HEAD: `f808655a1272e6dcdf70aabdb648ff2fda432644` — `fix(mobile): allow local Expo Go development`.

`git diff --cached --stat -- .`: vacío; no se agregó contenido al índice.

### L.1 `git status --short -- .`

```text
 M .gitignore
 M apps/mobile/app/(tabs)/index.tsx
 M apps/mobile/app/(tabs)/operations.tsx
 M apps/mobile/app/_layout.tsx
 M apps/mobile/app/operation/[operationId].tsx
 D apps/mobile/expo-env.d.ts
 M apps/mobile/lib/dashboard.ts
 M apps/mobile/package.json
 M apps/mobile/tsconfig.json
 M apps/web/eslint.config.mjs
 M apps/web/next.config.ts
 M apps/web/package.json
 M apps/web/src/app/acceso/page.tsx
 M apps/web/src/app/admin/page.tsx
 M apps/web/src/app/layout.tsx
 M apps/web/src/app/ofertas/[cargoId]/page.tsx
 M apps/web/src/app/ofertas/page.tsx
 M apps/web/src/app/operaciones/[operationId]/page.tsx
 M apps/web/src/app/operaciones/page.tsx
 M apps/web/src/app/page.tsx
 M apps/web/src/components/document-repository.tsx
 M apps/web/src/components/operation-controls.tsx
 M apps/web/src/lib/dashboard-data.ts
 M apps/web/src/proxy.ts
 M apps/web/tsconfig.json
 M package-lock.json
 M package.json
 M packages/domain/src/index.ts
 M packages/domain/tsconfig.json
 M tests/tsconfig.json
?? INFORME_POST_IMPLEMENTACION_ETAPA_1.md
?? apps/mobile/android/
?? apps/mobile/metro.config.cjs
?? apps/web/.env.example
?? apps/web/.vercelignore
?? apps/web/AGENTS.md
?? apps/web/src/app/demo/
?? apps/web/src/app/documentos/actions.ts
?? apps/web/src/app/operador/
?? apps/web/src/app/operator.css
?? apps/web/src/features/
?? apps/web/src/lib/document-upload.ts
?? docs/11-auditoria-web-y-plan-migracion.md
?? docs/12-panel-operador-entrega.md
?? docs/13-cierre-panel-operador.md
?? docs/14-etapa-1-seguridad-y-baseline.md
?? packages/domain/src/operation-contract.json
?? packages/domain/src/operator.ts
?? scripts/
?? supabase/demo/
?? supabase/functions/
?? supabase/migrations/0009_operator_verification_status.sql
?? supabase/migrations/0010_operator_panel_model.sql
?? supabase/migrations/0011_operator_security.sql
?? supabase/migrations/0012_operator_commands.sql
?? supabase/migrations/0013_operator_hardening.sql
?? supabase/migrations/0014_operator_polish.sql
?? supabase/migrations/0015_document_gateway.sql
?? supabase/migrations/0016_operation_contract.sql
?? tests/database.test.mjs
?? tests/demo-preview.test.mjs
?? tests/document-gateway-helper.mjs
?? tests/operator-browser.test.mjs
?? tests/operator.test.mjs
?? tests/stage1.test.mjs
```

### L.2 `git diff --stat -- .`

```text
 4pack-v3/.gitignore                                |   3 +
 4pack-v3/apps/mobile/app/(tabs)/index.tsx          |  13 +-
 4pack-v3/apps/mobile/app/(tabs)/operations.tsx     |   3 +-
 4pack-v3/apps/mobile/app/_layout.tsx               |  22 +
 .../apps/mobile/app/operation/[operationId].tsx    |  23 +-
 4pack-v3/apps/mobile/expo-env.d.ts                 |   1 -
 4pack-v3/apps/mobile/lib/dashboard.ts              |  46 +-
 4pack-v3/apps/mobile/package.json                  |  11 +-
 4pack-v3/apps/mobile/tsconfig.json                 |  11 +-
 4pack-v3/apps/web/eslint.config.mjs                |   2 +-
 4pack-v3/apps/web/next.config.ts                   |   9 +-
 4pack-v3/apps/web/package.json                     |   6 +-
 4pack-v3/apps/web/src/app/acceso/page.tsx          |   1 +
 4pack-v3/apps/web/src/app/admin/page.tsx           |   4 +-
 4pack-v3/apps/web/src/app/layout.tsx               |  11 +-
 .../apps/web/src/app/ofertas/[cargoId]/page.tsx    |   6 +-
 4pack-v3/apps/web/src/app/ofertas/page.tsx         |   2 +-
 .../web/src/app/operaciones/[operationId]/page.tsx |   7 +-
 4pack-v3/apps/web/src/app/operaciones/page.tsx     |   3 +-
 4pack-v3/apps/web/src/app/page.tsx                 |   4 +
 .../web/src/components/document-repository.tsx     |  55 +-
 .../apps/web/src/components/operation-controls.tsx |  67 +-
 4pack-v3/apps/web/src/lib/dashboard-data.ts        |  46 +-
 4pack-v3/apps/web/src/proxy.ts                     |  66 +-
 4pack-v3/apps/web/tsconfig.json                    |   4 +-
 4pack-v3/package-lock.json                         | 703 +++++++++++----------
 4pack-v3/package.json                              |  19 +-
 4pack-v3/packages/domain/src/index.ts              |   2 +
 4pack-v3/packages/domain/tsconfig.json             |   7 +-
 4pack-v3/tests/tsconfig.json                       |   3 +-
 30 files changed, 653 insertions(+), 507 deletions(-)
```

Este stat solo incluye diferencias de archivos versionados: **no dimensiona panel, migraciones o pruebas sin seguimiento**. No es el inventario de archivos exclusivos de esta etapa.

### L.3 Archivos sin seguimiento, enumerados individualmente

Total: 102 archivos.

```text
INFORME_POST_IMPLEMENTACION_ETAPA_1.md
apps/mobile/android/.gitignore
apps/mobile/android/app/build.gradle
apps/mobile/android/app/debug.keystore
apps/mobile/android/app/proguard-rules.pro
apps/mobile/android/app/src/debug/AndroidManifest.xml
apps/mobile/android/app/src/debugOptimized/AndroidManifest.xml
apps/mobile/android/app/src/main/AndroidManifest.xml
apps/mobile/android/app/src/main/java/com/yoshuachavez/fourpack/MainActivity.kt
apps/mobile/android/app/src/main/java/com/yoshuachavez/fourpack/MainApplication.kt
apps/mobile/android/app/src/main/res/drawable-hdpi/splashscreen_logo.png
apps/mobile/android/app/src/main/res/drawable-mdpi/splashscreen_logo.png
apps/mobile/android/app/src/main/res/drawable-xhdpi/splashscreen_logo.png
apps/mobile/android/app/src/main/res/drawable-xxhdpi/splashscreen_logo.png
apps/mobile/android/app/src/main/res/drawable-xxxhdpi/splashscreen_logo.png
apps/mobile/android/app/src/main/res/drawable/ic_launcher_background.xml
apps/mobile/android/app/src/main/res/drawable/rn_edit_text_material.xml
apps/mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher.webp
apps/mobile/android/app/src/main/res/mipmap-hdpi/ic_launcher_round.webp
apps/mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher.webp
apps/mobile/android/app/src/main/res/mipmap-mdpi/ic_launcher_round.webp
apps/mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher.webp
apps/mobile/android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.webp
apps/mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.webp
apps/mobile/android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.webp
apps/mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp
apps/mobile/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp
apps/mobile/android/app/src/main/res/values-night/colors.xml
apps/mobile/android/app/src/main/res/values/colors.xml
apps/mobile/android/app/src/main/res/values/strings.xml
apps/mobile/android/app/src/main/res/values/styles.xml
apps/mobile/android/build.gradle
apps/mobile/android/gradle.properties
apps/mobile/android/gradle/wrapper/gradle-wrapper.jar
apps/mobile/android/gradle/wrapper/gradle-wrapper.properties
apps/mobile/android/gradlew
apps/mobile/android/gradlew.bat
apps/mobile/android/settings.gradle
apps/mobile/metro.config.cjs
apps/web/.env.example
apps/web/.vercelignore
apps/web/AGENTS.md
apps/web/src/app/demo/acceso/page.tsx
apps/web/src/app/demo/documentos/[id]/route.ts
apps/web/src/app/demo/operador/[section]/[[...id]]/page.tsx
apps/web/src/app/demo/operador/error.tsx
apps/web/src/app/demo/operador/loading.tsx
apps/web/src/app/documentos/actions.ts
apps/web/src/app/operador/[section]/[[...id]]/page.tsx
apps/web/src/app/operador/error.tsx
apps/web/src/app/operador/loading.tsx
apps/web/src/app/operador/page.tsx
apps/web/src/app/operator.css
apps/web/src/features/operator/actions.ts
apps/web/src/features/operator/data.ts
apps/web/src/features/operator/demo-environment.d.mts
apps/web/src/features/operator/demo-environment.mjs
apps/web/src/features/operator/demo-runtime.d.mts
apps/web/src/features/operator/demo-runtime.mjs
apps/web/src/features/operator/demo-sql.json
apps/web/src/features/operator/forms.tsx
apps/web/src/features/operator/panel.tsx
apps/web/src/features/operator/shell.tsx
apps/web/src/features/operator/types.ts
apps/web/src/features/operator/ui.tsx
apps/web/src/lib/document-upload.ts
docs/11-auditoria-web-y-plan-migracion.md
docs/12-panel-operador-entrega.md
docs/13-cierre-panel-operador.md
docs/14-etapa-1-seguridad-y-baseline.md
packages/domain/src/operation-contract.json
packages/domain/src/operator.ts
scripts/check-operator-browser.mjs
scripts/compare-operator-visuals.mjs
scripts/local-database.d.mts
scripts/local-database.mjs
scripts/prepare-demo-assets.mjs
scripts/prepare-install-check.mjs
scripts/prepare-operation-contract.mjs
scripts/prepare-vercel-preview.mjs
scripts/verify-operator-accessibility.mjs
scripts/verify-preview-routes.mjs
supabase/demo/bootstrap.sql
supabase/demo/operator-scenarios.sql
supabase/demo/operator-seed.sql
supabase/functions/_shared/document-validation.d.mts
supabase/functions/_shared/document-validation.mjs
supabase/functions/document-upload/index.ts
supabase/migrations/0009_operator_verification_status.sql
supabase/migrations/0010_operator_panel_model.sql
supabase/migrations/0011_operator_security.sql
supabase/migrations/0012_operator_commands.sql
supabase/migrations/0013_operator_hardening.sql
supabase/migrations/0014_operator_polish.sql
supabase/migrations/0015_document_gateway.sql
supabase/migrations/0016_operation_contract.sql
tests/database.test.mjs
tests/demo-preview.test.mjs
tests/document-gateway-helper.mjs
tests/operator-browser.test.mjs
tests/operator.test.mjs
tests/stage1.test.mjs
```

### L.4 Evidencia de preservación durante este informe

- 184 archivos preexistentes comparados por SHA-256 antes y despues de las verificaciones: **0 diferencias**.
- Los 43 archivos del manifiesto de etapa coinciden con sus hashes originales de entrega.
- El ZIP inicial conserva los 171 contenidos verificados; no se modifico.
- `generated-files-restored.json`: `[]`; no se restituyeron fuentes durante esta revision.
- Cambios deliberados respecto del inicio de esta tarea: solo este informe.
- Registros: `.4pack-demo/post-implementation/pre-source-inventory.json`, `results.json` y logs 01-11.
- El listado Git de esta seccion ya incluye el informe como archivo nuevo sin seguimiento.

Las pruebas escribieron únicamente artefactos de verificación de los comandos autorizados; no se cambiaron configuraciones secretas ni fuentes como corrección. No se hicieron instalaciones, commit, push, merge, checkout, reset, despliegue ni migraciones remotas. No se restauró el ZIP sobre el proyecto. La única creación documental de esta tarea es `INFORME_POST_IMPLEMENTACION_ETAPA_1.md`.

## M. Recomendación de siguiente etapa

**Siguiente paso recomendado: auditar esta entrega y cerrar la validación de integración, antes de incorporar funciones.** No se ejecuta ninguna de las acciones siguientes en esta tarea.

1. Revisar los 43 archivos y las migraciones, especialmente privilegios de servicio, backfill documental y reconciliación monetaria/fechas. Confirmar que se quiere conservar este contrato y preparar una referencia reproducible del árbol completo.
2. Definir un entorno Supabase de prueba autorizado y un plan coordinado de esquema + Edge + clientes. Confirmar datos/migraciones existentes antes de aplicar cualquier SQL.
3. Probar allí la subida y acceso horizontal documental, JWT real, permisos de servicio, metadatos Storage, archivos históricos y fallo entre subida/registro.
4. Ejecutar concurrencia real con varias conexiones PostgreSQL y completar la matriz estado/rol/garantía, incluyendo suspensión, cancelación, incidencia, disputa, fallo y reintento.
5. Validar importador/admin completos y mobile en dispositivo; resolver identidad pública/privada y decisiones de historial/simulación económica.
6. Someter el resultado a revisión. Solo después decidir Capacity, contratación directa/recontratación y Protect 3.0 en una etapa explícitamente autorizada.

No se propone mover dinero real ni presentar la simulación como custodia real.

## N. Evidencia navegable y límites de las conclusiones

| Evidencia | Ruta y línea/símbolo |
|---|---|
| Reglas del repositorio | [apps/web/AGENTS.md](apps/web/AGENTS.md), bloque de instrucciones Next |
| Manifiesto, scripts y workspaces | [package.json](package.json), `scripts`, `workspaces`, `engines` |
| Restricción de perfiles y aprobación | [0011_operator_security.sql](supabase/migrations/0011_operator_security.sql), `operator_approved`:1, `related_profile`:9, `protect_account_fields`:39, `operator_snapshot`:94 |
| Vínculo y autorización documental | [0015_document_gateway.sql](supabase/migrations/0015_document_gateway.sql), `document_objects`:4, `can_read_document_object`:27, `document_upload_target`:43, `register_document_upload`:56 |
| Gateway y bytes | [document-upload/index.ts](supabase/functions/document-upload/index.ts), `Deno.serve`, getUser:13, subida:32; [document-validation.mjs](supabase/functions/_shared/document-validation.mjs):1 |
| Sesión y registro demo | [operator/data.ts](apps/web/src/features/operator/data.ts), `operatorSession`:70, `loadSnapshot`:88, `executeCommand`:112, `registerDemoDocument`:169 |
| Acciones, URLs y archivos | [operator/actions.ts](apps/web/src/features/operator/actions.ts), `operatorAction`:47, `documentUrl`:181, `readDemoFile`:215; [lib/document-upload.ts](apps/web/src/lib/document-upload.ts), `uploadAuthorizedDocument`:4 |
| Estados, adjudicación y monedas | [0016_operation_contract.sql](supabase/migrations/0016_operation_contract.sql), `operation_contract`:5, backfill:9, monedas:18, `award_offer`:49, `transition_operation`:81, bloqueo legacy:133, `guard_guarantee_contract`:166 |
| Fuente canónica y generador | [operation-contract.json](packages/domain/src/operation-contract.json), [operator.ts](packages/domain/src/operator.ts), [prepare-operation-contract.mjs](scripts/prepare-operation-contract.mjs) |
| Reputación SQL | [0016_operation_contract.sql](supabase/migrations/0016_operation_contract.sql), policy ratings:137, `public_reputation`:141, `refresh_operator_rating`:159 |
| Finanzas previas preservadas | [0012_operator_commands.sql](supabase/migrations/0012_operator_commands.sql), `operator_command`, withdraw; [0014_operator_polish.sql](supabase/migrations/0014_operator_polish.sql), `review_simulated_withdrawal` |
| UI/adaptadores | [dashboard-data.ts](apps/web/src/lib/dashboard-data.ts), `getAdminDashboard`:235, `getCargoOfferComparison`; [panel.tsx](apps/web/src/features/operator/panel.tsx), fases:650, reputación:1150; [forms.tsx](apps/web/src/features/operator/forms.tsx), `OfferForm` |
| Mobile | [app/_layout.tsx](apps/mobile/app/_layout.tsx):6, [lib/dashboard.ts](apps/mobile/lib/dashboard.ts), `submitOffer`, `advanceOperation`, `confirmDelivery`; [metro.config.cjs](apps/mobile/metro.config.cjs) |
| Verificación admin | [operator-review-list.tsx](apps/web/src/components/operator-review-list.tsx), `updateStatus`:15; [admin/operadores/page.tsx](apps/web/src/app/admin/operadores/page.tsx), guard:7 |
| Pruebas específicas | [tests/stage1.test.mjs](tests/stage1.test.mjs), tests:19,33,43,55,69,76,90,107,121,125 |
| Pruebas de base y modelo de servicio | [database.test.mjs](tests/database.test.mjs), upgrade:27; [document-gateway-helper.mjs](tests/document-gateway-helper.mjs), `gatewayDocument` |
| E2E y Preview | [operator-browser.test.mjs](tests/operator-browser.test.mjs), [demo-preview.test.mjs](tests/demo-preview.test.mjs) |
| Historial de entrega anterior | [docs/14-etapa-1-seguridad-y-baseline.md](docs/14-etapa-1-seguridad-y-baseline.md) |
| Logs de esta revisión | [.4pack-demo/post-implementation/results.json](.4pack-demo/post-implementation/results.json), logs 01–11 y manifest previo |

**Conclusión de alcance:** lo comprobado es este árbol local y las pruebas indicadas. Producción, datos remotos, efectividad de RLS/Storage desplegados, dispositivos y concurrencia PostgreSQL real son no verificados. Tras crear el informe se detiene el trabajo de implementación.
