# Bloque 23 · Coordinación en China — EN CURSO

Fecha: 20/11/2026 (Argentina). Rama: codex/mvp-defense-close.
Partida: 40355a6b6d96a60d6ed9f2598bbb9b49162ed6a9; regresión funcional: 379737882fe49d59de55e283c8f04222b53a5029.

## Alcance y aislamiento

Cambios locales en el worktree candidato .4pack-demo/block15/worktree/4pack-v3. Defensa seminario-final-five.vercel.app / umiracgmhjglqoftoljn fuera del bloque. Destino candidato: khtfjogqvtjuxhmzkmue / 4pack-candidata-mvp.vercel.app. No se copiaron credenciales ni datos privados a este documento.

## Implementación

- packages/domain/src/china-origin: países fijos, 23 provincias y CABA, validación de plan agente/proveedor, cálculo de m³ por bultos y dimensiones, dirección de envío.
- supabase/migrations/20261120202217_china_origin_coordination.sql: publicación CN→AR, elegibilidad por países/modalidad/servicios sin comparar ciudades; retiro específico origin_pickup; depósitos privados y dirección congelada por oferta/operación; despacho/recepción con permisos e idempotencia; revisiones con aceptación expresa e historial.
- apps/mobile/features/importer/china-cargo-form.tsx y app/cargo/new.tsx: publicación progresiva para agente o proveedor, medidas estimadas/confirmadas y FOB USD. Conserva publicación y gateway MSDS existentes.
- apps/mobile/lib/dashboard.ts, importer-flow.ts y features/importer/views.tsx: resumen de recepción en ofertas y coordinación en seguimiento. china-operation.tsx agrega copiar dirección, registrar despacho y decidir revisión.
- apps/web/src/features/operator/china-actions.ts y china-panels.tsx: depósitos propios, retiro, recepción medida y revisión de condiciones. Integración en perfil y operación; quote-composer/actions/forms/offers-list enlazan depósito y condiciones al envío existente.
- packages/domain/src/operation-work: próxima acción por responsable a partir de coordinación persistida.
- expo-clipboard 8.0.8, compatible con Expo SDK 54: copia nativa de dirección; requiere APK nuevo.

## Verificaciones locales

| Comando | Resultado | Alcance |
|---|---|---|
| npm.cmd run typecheck | PASS | Mobile, web y dominio |
| npm.cmd run lint | PASS | ESLint web, sin autofix |
| npm.cmd run test:domain | PASS, 12 | Taxonomía incluye retiro en China |
| npm.cmd run test:mvp | PASS, 45 | Regresión de ofertas, tareas, administración y pagos |
| npm.cmd run test:payments | PASS, 43 | No crea pagos remotos |
| npm.cmd run test:hazmat | PASS, 13 | Publicación y gateway, automatizado |
| node --test tests/china-origin.test.mjs | PASS, 7 | PGlite, ambos casos hasta recepción, privacidad, reintentos, revisión |

Total posterior: 126 pruebas (120 más 4 de importador y 2 de aislamiento visual). PGlite simula habilitación de checkout únicamente en su fixture local para probar la adjudicación; no acredita Mercado Pago, Android ni Supabase real.

Fallos corregidos durante preparación: referencia de nombre de función al renombrar prepare_cargo_publication; claves privadas rechazadas por quote_command original; conservar OID de operator_compatible para sus políticas RLS; formulario incompleto no debe lanzar al calcular volumen; tipo de payload documental ampliado a JSON; prueba de taxonomía actualizada de 9 a 10 servicios. Build web inicial bloqueado por dependencias locales después de sustituir la junction compartida; instalación local del monorepo en preparación. No se aplicó audit fix; npm informó vulnerabilidades existentes.

## Supabase real: observado, sin extrapolar

Preflight de lectura: candidata con 0 operaciones, LC-10004 conserva 1 oferta, mp_test_settings.enabled=false. Última versión remota observada: 20261120192152. advance_operation sigue rechazando clientes anteriores. La consulta de nombres de secretos no devolvió MP_TEST_*: no se acredita configuración de Mercado Pago en esta candidata.

LC-10004: carga 43d2e5b7-4667-4f6f-a1a6-99f3d0c14200; oferta 8b77607c-affe-41ce-bb94-891e8635bacf, ARS 135.000 y 9 días, regresión publicada previa 3797378. No reenviar esa oferta.

## Criterios pendientes

Ambos casos en candidata publicada y APK nuevo: NO PROBADO todavía. La migración se aplicó en la candidata: el conector registró 20261120205426; conciliación de versión a 20261120202217 pendiente de autorización específica. No declarar cierre hasta observar mismos UUID y estado received_in_china en ambos clientes. Deben probarse también copia nativa, sesión recuperada sin Metro, incompatibilidad, histórico, reintentos y dirección congelada en Supabase real.

Mercado Pago permanece apagado. Work debe completar configuración privada del vendedor/retorno/webhook de la candidata antes de autorizar ensayo de adjudicación y pago. No usar secretos ni backend de defensa como sustituto.

Un ajuste económico aceptado se guarda como anexo, sin alterar oferta, snapshot contractual ni pago original. El avance económico queda bloqueado si el último importe aceptado difiere del original hasta disponer de conciliación adicional. Este bloque no implementa cobro automático de diferencias.

## Evidencia para la planilla

| Entregable | Evidencia disponible | URL pública verificada |
|---|---|---|
| Regresión LC-10004 | Informe bloque 22, commit funcional y oferta persistida | https://github.com/Yoshua95/seminario-final/commit/379737882fe49d59de55e283c8f04222b53a5029 |
| Coordinación CN→AR | Código, migración y siete pruebas locales PGlite | pendiente de publicación |
| Web nueva y APK nuevo | Pendiente de compilación/ensayo de esta versión | pendiente de publicación |

## Siguiente paso

Completar build, revisión de migración candidata, despliegue exclusivo de candidata y APK. Ensayar publicación y cotización con sesiones reales; registrar por separado el bloqueo de Mercado Pago si impide adjudicar. No modificar defensa ni inventar una operación o un pago aprobado.

## Actualización de ejecución

La migración autorizada, SHA-256 3c5fec2c3788367364b76e3967b8ba80cbd2eab841f3db5a9374d6def6cc857f, se aplicó con éxito exclusivamente en la candidata. El conector asignó versión 20261120205426; el intento de reconciliarla a 20261120202217 fue rechazado por revisión automática por falta de autorización específica. Se solicitó esa autorización y no se intentó eludirla ni repetir DDL. Mantener esta diferencia visible hasta resolverla.

Conservación antes/después: 2 cargas, 2 ofertas, 0 operaciones, 0 documentos, 3 cuentas Auth; dos cargas históricas siguen legacy y LC-10004 mantiene una oferta. Checkout permanece false.

Regresión desde interfaces reales: web publicada y APK 3.0.5 instalado muestran LC-10004, ARS 135.000, 9 días, con Metro apagado; capturas en evidencia/. No se reenvió una oferta ni se adjudicó esa carga.

Build web: PASS tras completar dependencias locales del monorepo. Exportación Android: PASS; check:mobile:release PASS (un bundle, sin fixtures del visor). El primer check falló ENOENT porque aún no existía la exportación: se ejecutó build:mobile y se repitió.

Primer assembleRelease: BUILD SUCCESSFUL, 4m34s. El proceso PowerShell devolvió 1 debido a mensajes de compiladores en stderr, aunque Gradle completó assembleRelease y generó el artefacto. Se recompila el bundle y APK final para incorporar los últimos controles de compatibilidad; no distribuir el artefacto intermedio.

Advisories previos del backend: tablas internas con RLS sin políticas (bloqueo intencional); cuatro funciones históricas con search_path mutable; aviso de funciones SECURITY DEFINER autenticadas y protección de contraseñas filtradas deshabilitada. No se modificaron esos componentes ajenos durante este bloque. Ver documentación de lints: https://supabase.com/docs/guides/database/database-linter . Las nuevas RPC realizan control de rol/dueño/participación y revocan EXECUTE público de helpers.
Decisión posterior del usuario: dejar el historial sin cambios. Se conserva 20261120205426 en remoto y se renombra únicamente el archivo local a supabase/migrations/20261120205426_china_origin_coordination.sql. El cuerpo SQL y su SHA-256 son los mismos aprobados como 20261120202217. No se repitió DDL ni se modificó el historial. La diferencia de nombres queda resuelta en el repositorio; el rechazo de revisión automática no se eludió.