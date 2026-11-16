# 01. Requisitos de la aplicación web de 4PACK

Seminario Final — Chavez Yoshua Facundo — Analista de Sistemas. Profesor: Francisco Montero. Corte técnico: 15/11/2026; cierre planificado: 23/11/2026. Estado del documento: **completo para revisión académica**.

## Alcance y criterio de trazabilidad

4PACK vincula importadores con operadores logísticos mediante publicaciones y propuestas privadas. El alcance documentado corresponde al checkpoint Capacity 2B `de5e3eeb562d44f848c0e18addcbaef6e9bbcde2`. «Implementado» indica presencia de código y controles locales, no certificación productiva. «Parcial» señala una restricción concreta. Los estados del producto se definen en el [índice](README.md).

Cada requisito se vincula con un caso de uso del [catálogo](03-casos-de-uso.md), una fuente técnica y evidencia disponible. Las pruebas citadas son las del cierre 2B; no fueron repetidas integralmente para redactar estos documentos.

## Roles

| Actor | Responsabilidad y límite |
| --- | --- |
| Importador | Publicar sus cargas, consultar propuestas recibidas, adjudicar, confirmar garantía simulada y entrega, intercambiar documentación y mensajes, evaluar a su contraparte. No conoce la capacidad privada de los operadores. |
| Operador | Mantener sus perfiles, cotizar si está aprobado, administrar sus operaciones desde web y consultar su capacidad. No ve propuestas competidoras ni modifica límites económicos. |
| Administrador | Verificar operadores, moderar perfiles y configurar capacidad con motivo y auditoría. No reemplaza a un despachante, asegurador ni proveedor de pagos. |

## Requisitos funcionales

| ID | Requisito verificable | Estado | Caso / fuente / evidencia |
| --- | --- | --- | --- |
| RW-01 | Autenticar una cuenta y resolver la navegación por rol; impedir acceso operativo sin sesión válida. | Implementado | CU-01. [Acceso](../../apps/web/src/app/acceso/page.tsx), [proxy](../../apps/web/src/proxy.ts), [sesión del operador](../../apps/web/src/features/operator/data.ts). Navegador: ruta protegida sin sesión. |
| RW-02 | Separar perfil de cuenta, identidad legal del operador y perfil comercial publicado. El usuario no puede autoasignarse privilegios administrativos. | Implementado | CU-01/CU-09. [0004](../../supabase/migrations/0004_profile_role_security.sql), [0017](../../supabase/migrations/0017_commercial_profiles.sql). `stage2a.test.mjs`: campos no editables y privacidad. |
| RW-03 | Permitir al importador publicar una carga con ruta, descripción, categoría, peso, volumen, FOB, modalidad y plazo. | Parcial: datos básicos implementados; flujo HAZMAT con MSDS pendiente de integración | CU-02. [Página](../../apps/web/src/app/cargas/nueva/page.tsx), [formulario](../../apps/web/src/components/new-cargo-form.tsx), [dominio](../../packages/domain/src/index.ts). El formulario conserva subida directa del MSDS incompatible con el gateway exigido por 0015; no se afirma éxito integral de ese camino. |
| RW-04 | Señalar posible carga peligrosa a partir de la descripción y requerir revisión/documentación según el registro. No sustituir clasificación técnica. | Parcial: detección heurística | CU-02/CU-06. `requiresHazmatReview` en dominio, campos `hazmat_review_required` y `msds_required`. Pruebas de dominio. |
| RW-05 | Ofrecer al operador aprobado una mesa de cargas disponibles con filtros de búsqueda, modalidad y peso. | Implementado | CU-03. [Panel](../../apps/web/src/features/operator/panel.tsx), sección oportunidades. Navegador: filtros y navegación por carga. |
| RW-06 | Consultar directorio/perfil comercial de operadores aprobados con filtros y reputación existente, sin publicar datos legales ni contactos privados. | Implementado | CU-03/CU-09. [Marketplace](../../apps/web/src/features/marketplace/), RPC `commercial_directory` en 0017. Tests 2A de privacidad y moderación. |
| RW-07 | Guardar un borrador propio de cotización con alcance, servicios, incluidos/excluidos, seguro, precio, moneda, plazo, vigencia, responsabilidades y capital estimado. | Implementado | CU-03. [Editor](../../apps/web/src/features/operator/quote-editor.tsx), `quote_command` en [0021](../../supabase/migrations/0021_capacity_quote_contract.sql). Tests 2A/2B. |
| RW-08 | Presentar propuestas privadas completas; impedir edición de una versión presentada y permitir retiro/reemplazo conforme al estado y vigencia. | Implementado | CU-03. [0018](../../supabase/migrations/0018_normalized_quotes.sql). Índices de revisión/oferta activa y pruebas de reemplazo, vencimiento y acceso competidor. |
| RW-09 | Mostrar al importador propuestas de su carga con alcance y moneda; advertir que precios con distinto alcance o moneda no son directamente equivalentes. | Implementado | CU-04. [Comparación](../../apps/web/src/app/ofertas/[cargoId]/page.tsx), `sameQuoteScope`. Pruebas de dominio y 2A. |
| RW-10 | Adjudicar únicamente una propuesta vigente a un operador habilitado; crear una sola operación por carga y conservar el snapshot contractual. | Implementado | CU-04. `award_offer`, 0016/0018/[0022](../../supabase/migrations/0022_capacity_workflows.sql). Tests de idempotencia, doble adjudicación y snapshot. |
| RW-11 | Validar y reservar capacidad en la misma transacción de adjudicación, sin dejar operación ni garantía parcial al rechazar. | Implementado localmente | CU-04. `reserve_operation_capacity`, `capacity_reserve`. Tests 2B de rollback y dimensiones independientes; concurrencia multiconexión pendiente. |
| RW-12 | Gestionar Operations con fases canónicas, permisos y requisito de garantía simulada; registrar hitos y confirmar entrega por importador. | Implementado para flujo principal; excepciones parciales | CU-05/CU-07. [Contrato](../../packages/domain/src/operation-contract.json), `transition_operation`. Tests etapa 1 y navegador. Las controversias completas quedan fuera. |
| RW-13 | Vincular archivos a una carga, operación u operador autorizado, validar formato/tamaño/firma y autorizar su descarga. | Implementado localmente | CU-06. [Gateway](../../supabase/functions/document-upload/index.ts), [0015](../../supabase/migrations/0015_document_gateway.sql). Tests de acceso horizontal, firma y rutas; Storage remoto pendiente. |
| RW-14 | Conservar historial documental mediante reemplazos y estado de validación, sin otorgar acceso por conocer una ruta. | Implementado | CU-06/CU-09. `documents`, `document_objects`, `replaces_id`; navegador: reemplazo y descarga autorizada. |
| RW-15 | Intercambiar mensajes dentro de una operación autorizada y mantener su historial. | Implementado | CU-08. `messages`, [0007](../../supabase/migrations/0007_message_security.sql), comandos del operador y componentes de operación. Tests base/navegador. |
| RW-16 | Aplicar las restricciones existentes de contacto en mensajes/perfil comercial. | Parcial: controles de contenido, sin garantía contra desintermediación | CU-08/CU-09. Validaciones SQL y de perfil comercial; no se afirma detección exhaustiva de contactos. |
| RW-17 | Crear y confirmar una garantía o pago simulado y reflejar comisión/movimientos simulados en la moneda contractual. | Implementado como simulación | CU-07. `simulate_guarantee`, `sync_simulated_finance`, 0016. Tests de moneda y wallet. No representa custodia de fondos. |
| RW-18 | Consultar billetera y solicitar retiros simulados desde el panel del operador. | Parcial: registro académico sin liquidación bancaria | CU-07. `wallet_movements`, `withdrawal_requests`, panel billetera. Navegador: saldo y solicitud. |
| RW-19 | Verificar/rechazar al operador y moderar su perfil comercial; respetar su suspensión en las reglas. | Parcial: aprobación/rechazo en UI, suspensión soportada en datos/reglas | CU-09. [Administración](../../apps/web/src/app/admin/operadores/page.tsx), [acciones de revisión](../../apps/web/src/components/operator-review-list.tsx), [moderación](../../apps/web/src/app/admin/operadores/comercial/page.tsx). La revisión actual actualiza el perfil bajo políticas administrativas; no se atribuye una RPC de verificación ni un botón de suspensión inexistentes. Tests 2A y de suspensión en DB. |
| RW-20 | Registrar una evaluación por participante sobre su contraparte luego de completar una operación; separar reputación de importador y operador y conservar «sin historial». | Parcial en experiencia integral de roles | CU-11. [0016](../../supabase/migrations/0016_operation_contract.sql), `public_reputation`, [OperationRating](../../apps/web/src/components/operation-rating.tsx). Reglas bilaterales implementadas y probadas en DB; panel operador muestra evaluaciones, sin afirmar un editor bilateral completo en ese panel. |
| RW-21 | Permitir solamente a administración aprobar límites de Capacity, por moneda y dimensión operativa, con motivo/vigencia y sin reducirlos bajo consumo activo. | Implementado | CU-10. [Admin Capacity](../../apps/web/src/features/capacity/admin-page.tsx), `configure_operator_capacity` en [0020](../../supabase/migrations/0020_capacity_model.sql). Tests 2B y navegador. |
| RW-22 | Mostrar al operador sus límites, uso, disponible y reservas, sin editar límites; denegar esos datos al importador y competidores. | Implementado | CU-10. `operator_capacity_snapshot`, [CapacityView](../../apps/web/src/features/capacity/view.tsx). Tests RLS/RPC y consulta desde cuenta suspendida. |
| RW-23 | Mantener ocupación durante incidencia/disputa; liberar al completar o tras cierre autorizado y documentado, una sola vez. | Implementado para reglas actuales | CU-05/CU-10. `release_operation_capacity`, `admin_capacity_terminal_transition`. Tests completed/disputed/cancelled/failed e idempotencia. No resuelve financieramente controversias. |
| RW-24 | Registrar tickets del operador y mensajes/adjuntos privados de soporte. | Implementado para el panel existente | CU-08. `support_tickets`, `support_messages`, panel soporte. Navegador: ticket y adjunto. No implica atención operativa 24/7. |
| RW-25 | Ofrecer una demo local/Preview con identidades y límites ficticios, separada de producción. | Implementado localmente | CU-12. [Entorno](../../apps/web/src/features/operator/demo-environment.mjs), [runtime](../../apps/web/src/features/operator/demo-runtime.mjs). `demo-preview.test.mjs`. Publicación futura sujeta a autorización. |

## Requisitos no funcionales

| ID | Criterio | Estado y evidencia |
| --- | --- | --- |
| RNW-01 | Autorización por rol, RLS y RPC sensibles con comprobación de actor; el navegador no decide permisos. | Implementado localmente. Tests de escalamiento, acceso horizontal y funciones internas revocadas; falta ensayo remoto con roles reales. |
| RNW-02 | Atomicidad e idempotencia de award/reserva/liberación; restricciones únicas en persistencia. | Implementado y probado estructuralmente en PGlite. Concurrencia PostgreSQL multiconexión no certificada. |
| RNW-03 | Importes contractuales coherentes en USD o ARS, sin conversiones ni suma entre monedas. | Implementado. Nombres históricos `*_usd` no garantizan moneda; se usa el campo contractual. |
| RNW-04 | Interfaz adaptable y controles identificables mediante etiquetas. | Evidencia local: 21 recorridos de navegador; secciones del operador a 320/390/768/1440 px. No se declara conformidad completa con una norma de accesibilidad. |
| RNW-05 | Dominio y contrato de estados compartidos entre clientes y SQL. | Implementado mediante paquete TypeScript y JSON generado/verificado con `check:contract`. |
| RNW-06 | Trazabilidad de versiones, eventos y cambios administrativos con motivo. | Implementado. Falta definir retención y explotación operativa de auditoría para un servicio comercial. |
| RNW-07 | Demostración reproducible desde fuentes y SQL sincronizados, sin datos privados en fixtures. | Implementado localmente. Instalación demo/upgrade y controles de entorno probados. |
| RNW-08 | Disponibilidad, recuperación, rendimiento y seguridad de infraestructura bajo carga acordada. | Parcial: sin SLA, medición de carga ni recuperación remota certificada. Revisar antes de uso comercial. |
| RNW-09 | Usar comunicaciones seguras y gestión de secretos del entorno al publicar. | Parcial: separación de clientes/configuración presente; publicación y revisión de infraestructura pendientes. No hay certificación de producción. |

## Priorización restante

**Planificado hasta el 23/11/2026:** auditoría del checkpoint, regresión de Operations/garantía simulada/reputación existente, integración entre clientes, revisión documental, ensayo de roles y concurrencia en entorno autorizado, demo y eventual publicación académica condicionada. No constituye autorización para ejecutarlos en esta tarea.

**Fuera del MVP de cierre:** contratación directa, recontratación, Protect 3.0 completo, Reputation adicional, pagos por tramos, controversias completas, custodia/transferencia de fondos, reservas reales con transportistas e integraciones aduaneras. No se agregan como requisitos ya satisfechos.

**Inconsistencia encontrada por inspección documental, sin corrección:** `NewCargoForm` inserta primero la carga y luego intenta subir MSDS directamente a Storage e insertar `documents`. La migración 0015 revoca ese camino a authenticated. Ante error, intenta borrar la carga, pero 0016 no conserva una política DELETE de importador. Por ello puede persistir una carga aunque el formulario informe que no se publicó. Es un riesgo P1 de integración; no fue reproducido contra una sesión remota ni está cubierto por el simple éxito de la demo del operador. El repositorio documental de `/documentos` sí invoca el gateway; no se deben confundir ambos recorridos.

Evidencia transversal: [informe Capacity](../16-etapa-2b-capacity.md), [pruebas 2B](../../tests/stage2b.test.mjs), [pruebas de navegador](../../tests/operator-browser.test.mjs).
