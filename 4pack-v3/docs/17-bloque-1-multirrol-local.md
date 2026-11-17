# Bloque 1: ensayo multirrol local del MVP

Fecha: 2026-11-17. Base: `codex/4pack-qa-readiness`, HEAD
`15f966226679ee6e72b18631e7193786f514065d`. Cambios de este bloque sin commit.

## Diagnóstico y alcance

Las rutas reales `/cargas/nueva` y `/admin` redirigen a
`/acceso?configuracion=pendiente` porque falta la configuración Supabase:
`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
No se encontró un entorno Supabase local preparado: no hay Docker ni Supabase
CLI disponibles, ni `supabase/config.toml`. No se configuró ni consultó un
Supabase remoto para este bloque.

El usuario autorizó ampliar la demo PGlite existente. El ensayo requiere
opt-in, directorio propio y Next en desarrollo local; queda deshabilitado en
producción y Vercel Preview. Usa tres identidades ficticias y cookies firmadas
separadas. Es un selector de identidades de ensayo, **no autenticación Supabase**.
Las consultas usan `asUser` con el rol PostgreSQL autenticado y las políticas y
RPC existentes. La aprobación y Capacity se guardan desde la sesión administrativa.

No se agregaron migraciones. La nueva semilla ficticia es
`supabase/demo/multirole-seed.sql`; su inclusión en `demo-sql.json` se verifica
contra el SQL fuente. El operador comienza pendiente y sin límites de Capacity.
La semilla no vuelve a ponerlo pendiente al reiniciar.

## Ejecución repetible

Desde la raíz de `4pack-v3`, en PowerShell, con dependencias ya disponibles:

```powershell
$env:FOURPACK_MULTIROLE_DEMO = "1"
$env:FOURPACK_DEMO_DIRECTORY = Join-Path (Get-Location) ".4pack-demo/multirole-recording-20261117"
$env:FOURPACK_DIST_DIR = ".next/multirole"
npm.cmd run dev --workspace=@4pack/web -- --hostname 127.0.0.1 --port 3002
```

Abrir `http://localhost:3002/demo/acceso`. Mantener esa terminal abierta;
`Ctrl+C` detiene ese servidor. Repetir el comando con el mismo directorio
conserva los datos. Para un ensayo nuevo, elegir otro directorio vacío sin borrar
el anterior. El puerto 3000 y sus datos previos se conservan.

Usar tres perfiles de navegador independientes: las ventanas normales de un
mismo perfil comparten cookies; las ventanas de incógnito pueden compartirlas
entre sí. Cuentas ficticias:

| Rol | Cuenta | Entrada |
| --- | --- | --- |
| Importador | `importador@4pack.demo` | `/demo/importador` |
| Operador | `operador.multirrol@4pack.demo` | `/demo/operador/oportunidades` |
| Admin | `admin@4pack.demo` | `/demo/admin` |

La clave aleatoria de firma queda únicamente en el directorio local ignorado,
no en el código ni en la documentación. Las sesiones duran 24 horas.

## Resultado por rol y paso

Todos los pasos siguientes se ensayaron en Chrome headless, con tres contextos
separados, servidor Next real y PGlite persistente en disco.

| Paso | Rol / pantalla | Acción y resultado |
| --- | --- | --- |
| Acceso | Tres roles, `/demo/acceso` | Sesiones separadas; anónimo y cookie manipulada rechazados; desvíos entre roles verificados. |
| Verificación | Admin, `/demo/admin` | Operador pendiente aprobado; antes de aprobar, oportunidades bloqueadas. |
| Capacity | Admin, `/demo/admin/capacidad` | Límites explícitos guardados: 1 operación, 100 kg, 10 m³, USD 2.000 por operación/exposición y USD 500 de capital aprobado. |
| Publicación | Importador, `/demo/importador/cargas/nueva` | Carga estándar ficticia: 10 kg, 1 m³, FOB USD 2.000; abierta a ofertas. El alias `/cargas/nueva` dirige aquí únicamente en este entorno. |
| Cotización | Operador, oportunidad de esa carga | Oferta privada normalizada: servicio USD 1.000, capital requerido USD 200. |
| Comparación / adjudicación | Importador, detalle de carga | Términos visibles y `award_offer`; operación creada y reserva activa. POST repetido conserva la misma operación. Solo se presentó una oferta en este ensayo; comparación competitiva múltiple no ensayada aquí. |
| Garantía | Importador, detalle de operación | Confirmación explícita con `simulate_guarantee`; estado `held_simulated`. Reintento sin duplicados. |
| Evidencia / hito | Operador, Documentos y detalle de operación | PDF cargado por la pantalla, registro mediante gateway local autorizado y hito con adjunto; importador descarga exactamente los mismos bytes. |
| Ejecución | Operador, detalle de operación | `transition_operation`: en curso y lista para entrega, mediante las confirmaciones existentes. |
| Confirmación / cierre | Importador, detalle de operación | `transition_operation('completed')`; garantía `released_simulated`, operación completada. Reintento no duplica efectos. |
| Liberación / billetera | Operador, Capacity; inspección SQL tras parar el servidor | Reserva liberada, uso 0/1, un evento de liberación y un movimiento USD 975 (servicio menos comisión existente). |
| Evaluación | Importador y operador, operación completada | Dos evaluaciones persistentes, una por autor; reintento del operador sin duplicación. |

## Cambios y cortes corregidos

- Nuevo adaptador local en `apps/web/src/features/multirole/`: guardia de
  entorno, sesiones firmadas, formularios, acciones y pantallas de importador y
  administrador. Rutas en `apps/web/src/app/demo/{importador,admin,multirole}`.
- `proxy.ts` agrega alias de acceso/publicación/admin exclusivamente con el
  opt-in local. La ausencia de Supabase sigue siendo explícita fuera del ensayo.
- `operator/data.ts`, `actions.ts`, `types.ts` y `capacity/admin-data.ts`
  vinculan el acceso demo a la sesión correspondiente. El operador no puede usar
  el antiguo atajo que adjudicaba como importador en la demo de un solo rol.
- Se agregó evaluación del importador al panel del operador al completar una
  operación: antes faltaba esa acción en pantalla. El destinatario se deriva de
  la operación propia en servidor. La ruta Supabase de esta acción está
  implementada, pero no fue ejecutada contra Supabase real.
- Se corrigió el enlace de continuación tras adjudicar en la nueva pantalla:
  la operación creada debe quedar accesible aunque desaparezca el formulario.
- Runtime, semilla empaquetada y `prepare-demo-assets.mjs` incorporan al operador
  ficticio sin reiniciar su aprobación. `package.json` agrega pruebas del bloque.
- Next genera declaraciones de rutas y ajustes de `tsconfig.json` al ejecutar
  los servidores. No son cambios de reglas de negocio.

## Pruebas y evidencia

| Comando ejecutado | Resultado | Alcance / artefactos locales |
| --- | --- | --- |
| `npm.cmd test` | 92 pruebas aprobadas | Dominio, base/RLS, etapas 1/2A/2B, Preview y 3 pruebas multirrol; log `.4pack-demo/multirole-regression.log`. |
| `npm.cmd run test:web` | 21 verificaciones aprobadas | Regresión del panel del operador y vista de 390 px; log `.4pack-demo/multirole-legacy-browser.log`. |
| `npm.cmd run test:multirole:web` | 9 verificaciones del circuito | Chrome, tres contextos, dos reinicios reales, datos en `.4pack-demo/multirole-browser-*/`; reporte `browser-report.json`. |
| `npm.cmd run typecheck` | Aprobado | Workspaces web/mobile; log `.4pack-demo/multirole-typecheck.log`. |
| `npm.cmd run lint` | Aprobado, sin autofix | Log `.4pack-demo/multirole-lint.log`. |
| `npm.cmd run build:web` | Aprobado | Build local `.next`; log `.4pack-demo/multirole-build.log`. |
| `git diff --check` | Aprobado | Sin artefactos; Git advierte conversión LF/CRLF en Windows. |

`tests/multirole-persistence.test.mjs` y su worker abren la misma base en tres
procesos Node independientes. La evidencia documental de ese test SQL usa un
doble del gateway; el test de navegador adicional sí carga y descarga bytes
mediante las pantallas y rutas HTTP locales. `tests/multirole-environment.test.mjs`
comprueba que el modo no se habilite en producción o Preview.

El navegador detiene su propio servidor antes de inspeccionar PGlite y lo
reinicia dos veces con el mismo directorio. Comprueba reserva y garantía antes
del cierre; después, exactamente una operación, una garantía, una reserva,
una liberación, un movimiento y dos evaluaciones. Verifica además hash y bytes
del documento conservado. No se abre la base desde dos procesos simultáneos.

Última ejecución completa: `.4pack-demo/multirole-browser-uOv7Cx/browser-report.json`:
`passed: true`, 9 verificaciones, `errors: []`, 3 arranques (inicial más dos
reinicios). El servidor para grabación queda separado de ese ensayo, en el
directorio `multirole-recording-20261117`, puerto 3002; el acceso respondió HTTP
200 y mostró las tres cuentas. El servidor de pruebas se detuvo al terminar sus
verificaciones; el servidor de grabación permanece ejecutándose.

Durante el desarrollo hubo ejecuciones fallidas del harness por navegación
antes de completar la URL, espera sobre formularios que desaparecen y reutilizar
una página durante Fast Refresh al reiniciar. Se corrigieron esas esperas y se
abrieron páginas nuevas conservando los contextos y cookies. Se detectó y
corrigió además el enlace de continuación de la pantalla nueva. El resultado
final debe consultarse en el reporte de la última ejecución, no en capturas de
intentos anteriores conservadas en carpetas locales.

## Límites y siguiente bloqueo

El circuito estándar queda demostrable **en el ensayo PGlite local**. No acredita
Supabase Auth, PostgREST, Storage remoto, concurrencia PostgreSQL real, despliegue,
APK ni dispositivo físico. No hay una certificación productiva implícita.

El primer bloqueo para repetirlo con la aplicación conectada a Supabase sigue
siendo un entorno local/de pruebas preparado: URL, clave pública, servicios Auth,
base y Storage con el esquema vigente, bucket/políticas y cuentas ficticias
separadas. Las credenciales deben configurarse por un canal local seguro, nunca
pegarse en este informe. La prueba posterior exacta es repetir este recorrido
desde las rutas reales con esas tres sesiones, descarga cruzada autorizada y
rechazo de usuarios ajenos, verificando los mismos conteos tras reiniciar.

HAZMAT/MSDS queda como siguiente bloque. No se ensayaron contratación directa,
rehire, vencimiento ni resolución integral de controversias. La nueva publicación
de ensayo rechaza cargas detectadas como HAZMAT; no sustituye ese desarrollo.

Se preservaron los cambios locales previos y el ZIP académico. No se hicieron
commits, push, merge, despliegues, instalaciones de dependencias ni migraciones
remotas. Las migraciones existentes se cargaron únicamente en bases PGlite
aisladas como parte del arranque y las pruebas.
