# Bloque 16 — Administración y Perfil empresarial

Fecha: 19/11/2026 (Argentina). Rama: `codex/capital-admin-isolated`.

**Resultado: implementado y probado en el entorno local aislado. No publicado ni aplicado a Supabase remoto.** El bloque 14 y su APK permanecen disponibles para la defensa. Este informe actualiza el estado de desarrollo posterior al informe parcial del bloque 15, sin sobrescribirlo.

## Checkpoints y aislamiento

- Base pública: `e3ed41606e20df02c96230a202a06ebfd9898918`.
- Primer checkpoint del núcleo del bloque 15: `cfc9f53dfc84b880f74195b666ef7bd90cebb8c3`.
- Checkpoint funcional completo de este ensayo: **`128471e8f15c2db73fa6db7dcac9bcc19b56285e`**, local. Incluye los cambios del bloque 15 que seguían sin commit y el rediseño de este bloque.
- Worktree, relativo al proyecto habitual: `.4pack-demo/block15/worktree/4pack-v3/`.
- No hubo push, merge, despliegue ni migración remota. No se modificaron los límites, cuentas, pagos ni reservas de `4pack-seminario-final / umiracgmhjglqoftoljn`.
- Se preservaron los datos y archivos de las corridas anteriores. Las pruebas nuevas usaron un directorio propio, `.4pack-demo/block16-final`, dentro de este worktree.

## Abrir la revisión

Servidor dejado en ejecución: **http://127.0.0.1:3015/demo/acceso**.

Seleccionar la cuenta ficticia del ensayo. Usar perfiles separados del navegador para cada rol; dos pestañas del mismo perfil comparten sesión.

| Vista | Ruta local, después de seleccionar el rol |
|---|---|
| Inicio admin | `/demo/admin` |
| Operadores | `/demo/admin/operadores` |
| Capacidad administrativa | `/demo/admin/capacidad` |
| Operaciones | `/demo/admin/operaciones` |
| Reclamos | `/demo/admin/reclamos` |
| Importadores | `/demo/admin/importadores` |
| Mi perfil admin | `/demo/admin/perfil` |
| Perfil empresarial operador | `/demo/operador/perfil` |
| Capital del operador | `/demo/operador/perfil#capital-operativo` |

El entorno usa PGlite persistente, cuentas y documentos ficticios, sesiones locales firmadas y permisos SQL por rol. **No certifica Supabase Auth/Storage reales ni Android conectado al nuevo esquema.** La web de defensa sigue en https://seminario-final-five.vercel.app y no depende de este servidor.

## Resultado por vista

| Vista | Resultado | Qué se comprobó |
|---|---|---|
| Inicio admin | **PASS** | Contadores y filtros coincidentes: postulaciones 1→1, ampliaciones 0→0, reclamos 1→1 en el momento de medir. El reclamo se resolvió después, por lo que su contador puede pasar a cero. |
| Operadores | **PASS** | Registrados separados de postulaciones. Suspendidos permanecen en Registrados con estado rojo. Alta por pantalla con checklist, motivo y capital inicial. El backend impide reactivar a un suspendido mediante el RPC de admisión. |
| Capacidad administrativa | **PASS** | Aprobado, comprometido y disponible; desglose ofertas/operaciones; comparación del total vigente, solicitado y aprobado. Aprobación parcial con responsable, fecha, motivo y monto anterior/nuevo. |
| Perfil empresarial | **PASS** | Tres secciones: Datos de la empresa, Documentación y Capital operativo. Estado y tareas pendientes arriba; formularios separados, precargados y desplegables; información opcional dentro del editor. |
| Navegación operador | **PASS** | Sin Capacidad en el lateral. Ruta antigua redirige a Perfil empresarial → Capital operativo; enlaces internos actualizados. |
| Operaciones admin | **PASS local** | Filtro por empresa y ficha con partes, documentos, hitos y reclamos. La etapa física depende del hito acreditado; no se inventa Aduana. Tarea y responsable derivados de fase, garantía, documentos contractuales y reclamos. |
| Reclamos | **PASS** | Asignación/revisión por interfaz y cierre posterior con resolución registrada, preservando mensajes e historial. |
| Importadores | **PASS local** | Estado, operaciones, reclamos y calificaciones; Sin calificaciones cuando corresponde. Activación por pantalla de una identidad ficticia existente. No se creó ni invitó un usuario Auth remoto. |
| Mi perfil admin | **PASS de lectura** | Identidad, rol y acceso a acciones existentes de cuenta; cierre de sesión local disponible. |
| Roles y adjuntos | **PASS local** | Importador/operador rechazados en Administración. PDF de empresa HTTP 200 para admin y HTTP 404 para importador ajeno; contenido PDF comprobado. |

## Resultado por recorrido y cifras observadas

Operador ficticio: `a0000000-0000-0000-0000-000000000007`.

Carga: **`42657ad2-fee9-4aac-95b8-e68e32dd2972`**.

Operación: **`d8516408-49d2-4d09-86b8-e7804329845d`**. Mismos registros en ambos roles web del ensayo.

1. **PASS — Alta:** Administración aprueba la postulación con ARS 1.000 de capital inicial, evidencia ficticia y checklist.
2. **PASS — Publicación:** importador publica una carga estándar con FOB USD 1.100.
3. **PASS — Oferta válida:** precio contractual ARS 250.000, capital requerido ARS 600. Perfil muestra Ofertas vigentes 600, Operaciones activas 0 y Disponible 400.
4. **PASS — Adjudicación y garantía:** se transfiere la misma reserva; Ofertas vigentes 0, Operaciones activas 600 y Disponible 400. El valor contractual ARS 250.000 se muestra por separado. La garantía es simulada, sin Mercado Pago.
5. **PASS — Insuficiencia por interfaz:** en otra carga, oferta que necesita ARS 500 con ARS 400 disponibles. Backend rechaza con faltante ARS 100; la pantalla muestra el error. Se comprueba que la reserva anterior sigue en 600 y el disponible en 400.
6. **PASS — Ampliación parcial:** solicita total ARS 2.000 con documentación empresarial existente; admin aprueba ARS 1.500. Operador ve Aprobado 1.500, Comprometido 600 y Disponible 900.
7. **PASS — Cierre:** operador avanza a servicio en curso y entrega por confirmar; importador confirma y evalúa. Se libera la reserva: Comprometido 0 y Disponible 1.500.
8. **PASS — Reclamo:** se revisa y posteriormente se resuelve el reclamo ficticio existente `e0000000-0000-0000-0000-000000000001`, vinculado a su operación de semilla. No se presenta como reclamo de la operación nueva. No se tocaron pagos ni reservas para resolverlo.

La prueba visual terminó con **11 pasos PASS**. La revisión adicional abrió siete vistas y comprobó los tres contadores. Los registros son del ensayo local; no son OP-1026 ni evidencia de una operación nueva en Supabase real.

## Una sola regla de capital

La fuente es `capital_commitment`, consumida por `operator_capacity_snapshot` y `admin_workbench`. Perfil y cotización no calculan disponibilidad sumando cobros ni usando el valor contractual.

- Disponible = aprobado − comprometido.
- Comprometido = reservas de ofertas vigentes + capital requerido de operaciones activas.
- Desconocidos históricos: **Pendiente de revisión**. No se convierten a cero para autorizar una oferta.
- Si el comprometido supera el aprobado, se devuelve `inconsistent`, el disponible negativo y un motivo de revisión. El backend bloquea nuevos compromisos, incluso si el nuevo requisito declarado es cero.
- Un contrato grande con capital requerido menor no genera por sí solo una inconsistencia: la prueba distingue un contrato de ARS 250.000 de un compromiso de ARS 60 con capital aprobado ARS 100.
- Ajustar el aprobado no puede dejarlo por debajo de los compromisos vigentes.
- La adjudicación transfiere la reserva; no descuenta dos veces.
- El perfil tiene actualización explícita. El runner recarga la página al cambiar de rol/vista para evitar confundir una navegación de ancla con una consulta nueva al backend.

## Cambios relevantes

| Archivos / símbolos | Cambio |
|---|---|
| `features/operator/company-profile.tsx` | Nuevo perfil por secciones; reutiliza `ActionForm`, editor comercial y gateway documental existentes. |
| `features/operator/shell.tsx`, `panel.tsx` | Retira Capacidad del menú y conserva redirección compatible; integra el perfil. |
| `features/capacity/view.tsx`, `request-action.ts`, `types.ts` | Capital dentro del perfil, cifras ARS, valor contractual diferenciado, alerta de inconsistencia y ampliación contextual. |
| `features/operator/quote-composer.tsx`, `journey.ts` | Disponible del backend, requerido y faltante; preserva reserva transaccional y validaciones. |
| `features/admin/workspace.tsx`, `types.ts`, `operation-task.ts` | Navegación, suspendidos, contadores/filtros, decisiones con contexto y tareas de operación. |
| `features/operator/refresh-profile.tsx` | Actualización explícita sin cambiar datos ni permisos. |
| `features/operator/company-fixture.mjs`, `demo-runtime.mjs` | PDF ficticio legible y vínculo Storage local para comprobar permisos de lectura. No es un documento legal ni una subida remota. |
| `app/admin-workspace.css` | Jerarquía de escritorio, fondos carbón/grafito, cifras alineadas, estados con texto/color, sección de perfil y controles legibles. |
| `tests/capital-profile.test.mjs` | Separación capital/contrato, inconsistencia, protección de reservas y suspensión. |
| `tests/capital-admin-browser.mjs`, `admin-design-review.mjs` | E2E por interfaces, capturas, contadores y resolución de reclamo. |

Las rutas abreviadas parten de `apps/web/src/`. Los cambios funcionales previos del bloque 15 también quedaron incluidos en el checkpoint, sin descartarlos.

## Migraciones

En este worktree se ensaya la cadena del bloque 15 más:

**`20261119221524_capital_profile_consistency.sql`**: consistencia de capital, separación de valor contractual, protección de suspendidos en admisión y contexto contractual/garantía para Administración. Las funciones internas quedan sin EXECUTE para clientes; los RPC expuestos conservan el control administrativo del servidor.

Orden de las nuevas migraciones locales: `20261119180708` → `20261119181203` → `20261119221524`, sobre el esquema previo compatible. El paquete de ensayo agrega además el guard ARS y una semilla ficticia únicamente local. **La semilla `capital-admin-isolated-seed.sql` nunca debe aplicarse a un proyecto alojado.**

No se ejecutó ninguna de estas migraciones en `umiracgmhjglqoftoljn`. Cualquier promoción requiere un Supabase de pruebas separado y las verificaciones correspondientes antes de tocar la defensa.

## Comandos y verificaciones

| Comando | Resultado |
|---|---|
| `node --test tests/capital-profile.test.mjs tests/capital-admin.test.mjs tests/offer-capital.test.mjs tests/operator-delivery.test.mjs tests/operator-journey.test.mjs` | **32/32 PASS**, unos 4,4 s. |
| `node tests/capital-admin-browser.mjs` | **11 pasos PASS**, sesiones separadas locales, escritorio 1440×1000. |
| `node tests/admin-design-review.mjs` | **PASS:** siete vistas, tres contadores coincidentes y un reclamo resuelto por interfaz. |
| `npm.cmd run typecheck` | **PASS**, mobile/web/domain. |
| `npm.cmd run lint` | **PASS**, sin autofix. |
| `npm.cmd run build:web` con `FOURPACK_DIST_DIR=.next-design-build` | **PASS**, build separado del dev server; sin despliegue. |
| Consola en sesión nueva de Perfil empresarial | Sin errores `pageerror`/`console.error` observados al recargar. Una captura del dev server conserva el indicador de incidencias de desarrollo; no se presenta como una prueba de producción. |

Incidencias del ensayo corregidas: el test inicial de inconsistencia intentaba cotizar dos veces la misma carga y recibía correctamente «Ya existe una oferta activa»; se ensayó con una segunda carga. El runner de ampliación navegaba solo al ancla del mismo perfil y leía datos anteriores; ahora hace recarga real y espera el render. La aprobación parcial del backend ya había persistido; no se alteró el cálculo para satisfacer el test.

No se repitió en este bloque el ensayo de dos conexiones PostgreSQL del bloque 15; su resultado previo sigue documentado allí. No se afirma que los 32 tests sean una prueba de Supabase Auth ni de un dispositivo Android.

## Evidencia y capturas

- [Inicio](evidencia/inicio.png), [Operadores registrados](evidencia/operadores.png), [Capacidad administrativa](evidencia/capacidad.png).
- [Perfil empresarial completo](evidencia/perfil-empresarial.png), [Capital operativo al cierre](evidencia/capital-operativo.png).
- [Reserva en oferta](evidencia/oferta-reservada.png), [reserva transferida](evidencia/reserva-transferida.png), [rechazo por insuficiencia](evidencia/rechazo-capital.png), [ampliación aprobada](evidencia/ampliacion-aprobada.png).
- [Operaciones](evidencia/operaciones.png), [Reclamos](evidencia/reclamos.png), [resolución](evidencia/reclamo-resuelto.png), [Importadores](evidencia/importadores.png), [Mi perfil](evidencia/mi-perfil.png).
- [E2E](evidencia/e2e.json), [revisión por vista](evidencia/vistas.json), [IDs](evidencia/ids.json), [pruebas](evidencia/pruebas.txt).

Las capturas son de escritorio. Las de recorrido muestran momentos distintos del ensayo: reserva, transferencia, ampliación y liberación; por eso sus cifras cambian de manera trazable.

## Pendientes y límites de acreditación

- Aplicación en un **Supabase separado**, Auth real, Storage real y advisors: **NO PROBADOS** en este bloque.
- Android con el esquema nuevo: **NO PROBADO**. No se recompiló ni reemplazó el APK de defensa.
- Invitaciones reales de Auth: no se configuraron; se mantuvo la activación individual de identidades existentes.
- Los históricos USD de la defensa permanecieron intactos porque no hubo escrituras remotas. No se presenta esto como una nueva lectura por ambos clientes reales.
- La liberación material de filas de ofertas vencidas sigue realizándose en la siguiente mutación/reconciliación, aunque el cálculo deja de comprometerlas al vencer. No se añadió cron remoto.
- El mutex global del bloque 15 conserva el compromiso de integridad frente a concurrencia, con el costo de serializar escrituras del mercado.
- Los archivos generados `next-env.d.ts`/`tsconfig.json`, datos locales y `supabase/.temp` quedan fuera del checkpoint funcional. No se descartaron.

## Evidencia para la planilla

| Entregable | Evidencia disponible | URL pública verificada |
|---|---|---|
| Rediseño Administración y Perfil | Código local `128471e`, capturas y E2E | Pendiente de publicación |
| Capital y permisos | 32 tests, recorrido local y lectura autorizada/ajena | Pendiente de publicación |
| Defensa bloque 14 | Versión conservada, no modificada en este bloque | https://seminario-final-five.vercel.app |
| APK nuevo para este modelo | No generado | Pendiente de validación en entorno compartido |

Para reproducir, desde este worktree ejecutar `scripts/start-capital-local.ps1 -Name <nombre-nuevo> -Port 3015`, sin cerrar un servidor ajeno. Para repetir el E2E completo usar un directorio ficticio nuevo; conservar los ensayos anteriores. Mantener la defensa publicada hasta completar la validación del entorno compartido.
