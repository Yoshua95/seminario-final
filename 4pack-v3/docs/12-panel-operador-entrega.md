# Panel web del operador — implementación local

Fecha: 13 de noviembre de 2026. Sin commit, push, PR ni despliegue.

## Acceso y alcance comprobado

- Servidor principal: http://localhost:3000.
- Demostración persistente: http://localhost:3000/demo/acceso.
- Panel tras ingresar a la demo: http://localhost:3000/demo/operador/oportunidades.
- Acceso real, separado: http://localhost:3000/acceso.
- Rutas reales de producción bajo `/operador`; las mismas pantallas de demostración bajo `/demo/operador`.

El panel incluye oportunidades con filtros y selección por URL, manifiesto, HAZMAT y documentos, presentación confirmada de ofertas selladas, ofertas propias, operaciones adjudicadas, máquina de estados, hitos con comprobante, documentos versionados, conversación por operación, historial, reputación, billetera/escrow académico, retiros simulados, tickets de soporte y perfil empresarial.

La web usa el diseño oscuro de la referencia oficial, marca 4PACK, Geist Sans/Mono locales, sidebar fija de 256 px en escritorio, manifiesto y cotizador lateral. La navegación móvil se pliega; las tablas y paneles se adaptan. Se agregaron estados de carga, error/reintento, vacío, permiso, pendiente/suspendido, confirmación, notificaciones y éxito. No se incorporó un panel nativo nuevo para operadores ni se modificaron archivos fuente de la app móvil.

## Persistencia e integración

Producción usa Supabase Auth, clientes SSR con cookies y RPC con autorización de base de datos. No utiliza fixtures ni el proveedor local como fallback si Supabase falla.

Se buscaron las variables públicas de Supabase del móvil y los archivos de entorno indicados. No se encontraron valores utilizables. No se imprimieron valores ni se copiaron placeholders a `.env.local`.

Para activar el proveedor real se requieren:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=URL_DEL_PROYECTO_EXISTENTE
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=CLAVE_PUBLICA_DEL_MISMO_PROYECTO
```

Archivo previsto: `apps/web/.env.local`, ignorado por Git. Plantilla sin secretos: `apps/web/.env.example`. No se requiere ni se expone `service_role` en la web.

Antes de utilizar el backend real deben revisarse y aplicarse las nuevas migraciones, y disponer de una cuenta Auth con `profiles.role = operator` y un `operator_profiles` asociado. La aprobación es una decisión interna. No se aplicó ninguna migración remota: queda pendiente de confirmación del usuario. Tampoco se validó Realtime contra un proyecto remoto ni el recorrido con credenciales Supabase reales.

La demostración usa PostgreSQL embebido (PGlite) con las mismas migraciones, funciones y RLS. `supabase/demo/bootstrap.sql` emula exclusivamente los esquemas que Supabase provee en una instalación real. No debe ejecutarse en un proyecto Supabase. El adaptador simula la identidad del usuario de demostración; no constituye un inicio de sesión real de Supabase.

Base local y archivos: `.4pack-demo/database` y `.4pack-demo/files`. Se conservan al recargar y reiniciar el servidor. No están versionados. Las rutas y funciones demo se deshabilitan con `NODE_ENV=production`; su contenido local no se incluye mediante tracing en el build de producción.

La demo ofrece escenarios aprobado, pendiente y suspendido. Incluye Marítima Rivera S.A., cuatro oportunidades, dos HAZMAT, ofertas en varios estados, operaciones activas y finalizadas, hitos, mensajes, PDF de muestra, reputación derivada de calificaciones y movimientos académicos. El PDF está identificado como demostración sin validez técnica.

## Migraciones creadas

| Archivo | Cambio |
| --- | --- |
| `0009_operator_verification_status.sql` | Agrega `suspended` en una transacción separada para compatibilidad con PostgreSQL. |
| `0010_operator_panel_model.sql` | Extiende las tablas actuales; agrega movimientos, retiros, soporte, lecturas y auditoría; prepara publicaciones Realtime. |
| `0011_operator_security.sql` | Protege perfil, aprobación y reputación; sella ofertas; restringe contactos/documentos y genera un snapshot sujeto a RLS. |
| `0012_operator_commands.sql` | Comandos transaccionales autorizados; estados, hitos, mensajes, documentos, perfil, tickets y retiros; liberación académica única y backfill de garantías ya liberadas. Evita recursión entre políticas de cargas y ofertas. |
| `0013_operator_hardening.sql` | Conserva tipos documentales previos, protege el alta de operador y estado inicial de oferta, agrega respuesta administrativa de soporte y publicaciones Realtime. |

Las migraciones nuevas se probaron también al reaplicarlas. No eliminan datos. La restricción previa de una oferta por modalidad se sustituye por un trigger que bloquea la carga durante el alta y comprueba una sola oferta activa entre modalidades. Los movimientos financieros no admiten escrituras directas del operador y se identifican por evento único para no duplicar liberaciones.

Se reutilizan `operator_profiles`, `cargo_requests`, `tracking_events` y `payment_guarantees`, en lugar de crear tablas equivalentes duplicadas. El ID único de la operación identifica su conversación. La nueva columna `operations.phase` conserva los estados operativos detallados sin cambiar el enum de estados que consume el móvil. Las etiquetas de ofertas traducen `accepted` a adjudicada y `withdrawn` a cancelada; la revisión y expiración se derivan de sus campos persistidos.

## Flujos y permisos

- Perfil, documentación empresarial y soporte quedan disponibles para cuentas pendientes/rechazadas/suspendidas. Cotización y operaciones requieren aprobación tanto en la web como en SQL.
- Un operador no puede leer ofertas ajenas, modificar su rol/aprobación/reputación, editar ofertas selladas ni alterar saldos.
- Antes de adjudicar, el manifiesto entrega reputación agregada sin contacto del importador. Los contactos relacionados se habilitan mediante las relaciones de operación y sus permisos.
- Las ofertas rechazan licitaciones cerradas, duplicados activos, importes inválidos y plazos fuera de rango. El bloqueo y la transacción protegen contra carreras entre solicitudes.
- La entrega y finalización requieren la secuencia de estados y garantía correspondiente. La finalización libera una sola vez el neto de la comisión académica.
- Los hitos son inmutables para el operador, validan fecha/tipo y permiten adjuntar un documento de la misma operación. La hora del formulario se interpreta en Argentina; admite la precisión de la entrada sin rechazar el minuto de adjudicación.
- Los documentos se guardan como archivos, nunca como base64 en tablas. Se validan MIME, extensión, firma básica y límite de 10 MB. El reemplazo genera una versión con trazabilidad; los aprobados no pueden reemplazarse desde ese flujo. Supabase genera URLs firmadas por 60 segundos; la demo verifica la sesión y RLS antes de servir el archivo local.
- Los mensajes y tickets son persistentes. En Supabase se prepararon suscripciones para mensajes, hitos, soporte, ofertas y estado del operador. La demo refresca datos cada cinco segundos; no simula un servidor Supabase Realtime.
- Los tickets pueden ser respondidos y resueltos por un administrador mediante `admin_support_reply`; el panel administrativo completo sigue fuera de este alcance.

## Qué permanece simulado

1. Dinero, garantías/escrow y retiros: simulación académica, incluso cuando se conecte Supabase. No hay bancos ni procesadores de pago.
2. Identidades, empresas, cargas, documentos y conversaciones iniciales del seed: datos de demostración aislados.
3. El botón «Simular adjudicación del importador» existe sólo en la demo. Ejecuta la adjudicación real de la base local con la identidad de prueba del importador y confirma su garantía académica. El operador de producción no tiene ese permiso.
4. Las respuestas de soporte precargadas son demostrativas. No hay un chatbot ni respuestas automáticas presentadas como atención humana.
5. El tracking registra hitos cargados por usuarios, no telemetría de transportistas. Las cláusulas de abandono y apropiación del prototipo se sustituyeron por contenido académico.

## Verificaciones ejecutadas

| Verificación | Resultado |
| --- | --- |
| Instalación limpia `npm ci --no-audit --no-fund --prefer-offline` | Aprobada en `.4pack-demo/install-check`, con scripts normales de dependencias. Se preservó `node_modules` del servidor activo. |
| `npm run typecheck` | Aprobado en mobile, web y domain. |
| `npm run lint --workspace=@4pack/web` | Aprobado. Sólo se excluyen salidas generadas de Next y sus tipos de entorno. |
| `npm test` | 10 pruebas del dominio + 17 de PostgreSQL/RLS aprobadas. Incluye las cuatro pruebas originales. |
| `npm run test:web` | 12 recorridos de navegador aprobados con Chrome, a 1440 × 1000 y 390 × 844. |
| `npm run build:web` | Build de producción aprobado, sin advertencias de tracing de archivos locales. |
| Revisión de consola | Sin excepciones de página ni errores de consola en los módulos recorridos. |
| Comparación visual | Referencia y localhost capturados a 1440 px; revisión responsive a 390 px sin desbordamiento horizontal. |

El recorrido de navegador prueba acceso protegido, entrada demo, selección por URL y recarga, oferta confirmada y sellada, adjudicación, hito, mensaje, subida/descarga privada de documento, historial, retiro simulado, ticket, edición de perfil, menú responsive y bloqueo de pendiente/suspendido. Usa una base y servidor separados del seed principal; las pruebas no alteran los datos de revisión del puerto 3000.

Para repetir navegador se necesita Chrome con CDP disponible en `http://localhost:9222`; el script inicia y cierra su propia instancia Next en 3001. Las pruebas SQL no requieren Docker, Supabase remoto ni credenciales. Los comandos se ejecutaron desde esta sesión; el usuario no necesita ejecutarlos para revisar el resultado.

Las dependencias heredadas de Expo emiten avisos de deprecación durante `npm ci`; la instalación finaliza correctamente. React y React DOM siguen unificados en 19.1.0 y React Native Web en 0.21.0.

## Inventario de archivos de esta implementación

Archivos existentes modificados:

```text
.gitignore
package.json
package-lock.json
packages/domain/src/index.ts
apps/web/package.json
apps/web/next.config.ts
apps/web/eslint.config.mjs
apps/web/src/proxy.ts
apps/web/src/app/layout.tsx
apps/web/src/app/page.tsx
apps/web/src/app/acceso/page.tsx
```

Archivos agregados:

```text
apps/web/.env.example
apps/web/src/app/operator.css
apps/web/src/app/operador/page.tsx
apps/web/src/app/operador/loading.tsx
apps/web/src/app/operador/error.tsx
apps/web/src/app/operador/[section]/[[...id]]/page.tsx
apps/web/src/app/demo/acceso/page.tsx
apps/web/src/app/demo/operador/loading.tsx
apps/web/src/app/demo/operador/error.tsx
apps/web/src/app/demo/operador/[section]/[[...id]]/page.tsx
apps/web/src/app/demo/documentos/[id]/route.ts
apps/web/src/features/operator/types.ts
apps/web/src/features/operator/data.ts
apps/web/src/features/operator/actions.ts
apps/web/src/features/operator/ui.tsx
apps/web/src/features/operator/forms.tsx
apps/web/src/features/operator/shell.tsx
apps/web/src/features/operator/panel.tsx
packages/domain/src/operator.ts
scripts/local-database.mjs
scripts/local-database.d.mts
scripts/prepare-install-check.mjs
scripts/check-operator-browser.mjs
scripts/compare-operator-visuals.mjs
supabase/demo/bootstrap.sql
supabase/demo/operator-seed.sql
supabase/demo/operator-scenarios.sql
supabase/migrations/0009_operator_verification_status.sql
supabase/migrations/0010_operator_panel_model.sql
supabase/migrations/0011_operator_security.sql
supabase/migrations/0012_operator_commands.sql
supabase/migrations/0013_operator_hardening.sql
tests/operator.test.mjs
tests/database.test.mjs
tests/operator-browser.test.mjs
docs/12-panel-operador-entrega.md
```

Efectos generados por Next: referencias de `apps/web/next-env.d.ts` y rangos de tipos de desarrollo/pruebas en `apps/web/tsconfig.json`. `apps/web/AGENTS.md` ya estaba generado al iniciar este pedido. Las capturas, registros, bases de prueba y comprobación de instalación están ignorados bajo `.4pack-demo`.

Los cambios previos en `apps/mobile/package.json`, `apps/mobile/tsconfig.json`, la eliminación de `apps/mobile/expo-env.d.ts` y la carpeta Android sin seguimiento permanecen preservados. `docs/11-auditoria-web-y-plan-migracion.md` corresponde a la auditoría anterior y queda como antecedente; la distribución de producto vigente es importador móvil, operador web y administración web posterior.
