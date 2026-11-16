# 02. Requisitos de la aplicación mobile de 4PACK

Seminario Final — Chavez Yoshua Facundo. Corte: 15/11/2026. Estado del documento: **completo para revisión académica**. Convenciones y datos académicos: [índice](README.md).

## Alcance real

La aplicación está desarrollada con React Native, Expo y TypeScript. El alcance vigente prioriza al importador: acceso, publicación/consulta de cargas propias según RLS, consulta de operaciones, garantía simulada, confirmación de entrega y mensajería. El operador gestiona propuestas y avance operativo desde web. La presencia de pantallas antiguas o tipos de otros roles no acredita un flujo mobile completo para ellos.

El control de tabs verifica sesión, no constituye por sí mismo una barrera de rol. Las funciones y políticas de base resuelven los permisos de cada acción. No hay un backend mobile independiente ni un modo offline operativo.

## Requisitos funcionales trazables

| ID | Requisito | Estado | Caso de uso / evidencia |
| --- | --- | --- | --- |
| RM-01 | Ingresar con correo/contraseña y cerrar sesión mediante Supabase Auth. | Implementado | CU-01. [Login](../../apps/mobile/app/login.tsx), [perfil](../../apps/mobile/app/(tabs)/profile.tsx), [tabs](../../apps/mobile/app/(tabs)/_layout.tsx). No se documenta alta de usuario mobile como existente. |
| RM-02 | Consultar nombre, correo y rol de la cuenta. | Implementado | CU-01. `ProfileScreen`, `loadCurrentProfile`. La etiqueta de rol no certifica aprobación administrativa del operador. |
| RM-03 | Listar cargas abiertas visibles por RLS y consultar su detalle. | Implementado | CU-02. [Cargas](../../apps/mobile/app/(tabs)/opportunities.tsx), `loadOpenCargos`, `loadCargoDetail` en [dashboard](../../apps/mobile/lib/dashboard.ts). El importador no obtiene un catálogo privado de cargas de terceros por omitir un filtro cliente. |
| RM-04 | Publicar una carga como importador con peso, volumen, FOB, ruta y modalidad; generar plazo de siete días y señal heurística de revisión. | Implementado para datos; parcial para expediente HAZMAT | CU-02. [Publicación](../../apps/mobile/app/cargo/new.tsx), `createCargo`. Señala `msds_required`, pero no incorpora la subida del MSDS. No se presenta la heurística como clasificación profesional ni como documentación completa. |
| RM-05 | Consultar operaciones propias con fase y moneda contractual. | Implementado | CU-05. [Listado](../../apps/mobile/app/(tabs)/operations.tsx), `loadOperations`; protección por RLS. |
| RM-06 | Ver detalle, precio del servicio, garantía simulada, comisión y eventos de una operación. | Implementado | CU-05/CU-07. [Detalle](../../apps/mobile/app/operation/[operationId].tsx), `loadOperationDetail`. No incluye todos los términos normalizados/snapshot del panel web. |
| RM-07 | Permitir al importador participante confirmar una garantía simulada pendiente. | Implementado como simulación | CU-07. `simulateGuarantee` llama `simulate_guarantee`. Sin transferencia ni comprobación bancaria. |
| RM-08 | Confirmar recepción como importador desde `awaiting_delivery_confirmation`, conforme a la máquina de estados. | Implementado | CU-05. `confirmDelivery` llama `transition_operation` con destino completed. Tests etapa 1 verifican el contrato de rol/estados; recorrido nativo pendiente. |
| RM-09 | Leer y enviar mensajes de una operación autorizada. | Implementado | CU-08. `sendOperationMessage` y consultas a `messages`; límites y reglas SQL. |
| RM-10 | Refrescar el detalle para obtener cambios y comunicar errores de conexión. | Implementado para actualización manual | CU-05/CU-08. RefreshControl y estados de pantalla. Sin cola offline ni sincronización garantizada en segundo plano. |
| RM-11 | Presentar/retirar/reemplazar propuestas de operador desde mobile. | Fuera del MVP mobile actual | `submitOffer` arroja «Operator offers are managed on web». Hay formulario heredado en detalle de carga; su presencia no vuelve funcional esa acción. CU-03 se realiza en web. |
| RM-12 | Adjudicar propuestas con Capacity desde una comparación mobile. | Parcial a nivel multicanal: acción disponible en web, ausente en mobile | No existe llamada mobile a `award_offer` en el código inspeccionado. No se da por implementada por compartir PostgreSQL. CU-04 requiere web. |
| RM-13 | Subir/descargar documentos y registrar evaluaciones desde mobile. | Parcial a nivel plataforma: usar web | No se identificó flujo mobile específico para esos casos. CU-06/CU-11 son web/DB; no atribuir sus componentes web al cliente nativo. |
| RM-14 | Aprobar operadores y configurar capacidad desde mobile. | Fuera del MVP mobile | Administración y consulta privada de Capacity están en web. El importador no debe recibir límites económicos privados. |

## Requisitos no funcionales y restricciones

| ID | Criterio | Estado |
| --- | --- | --- |
| RNM-01 | Reutilizar dominio, moneda y contrato de estados; no mantener transiciones alternativas en el dispositivo. | Implementado. `@4pack/domain`, `operation-contract.json` y RPC canónicas. |
| RNM-02 | Aplicar autorización en servidor/base incluso ante una llamada manipulada desde el dispositivo. | Implementado localmente en SQL; validación de sesión/RLS/RPC reales pendiente en entorno autorizado. |
| RNM-03 | Mantener secretos privilegiados fuera de la aplicación distribuible. | Diseño con cliente público Supabase; la revisión del artefacto firmado y su distribución queda pendiente. |
| RNM-04 | Producir un bundle Android reproducible y superar typecheck. | Export Android/Hermes y typecheck aprobados en cierre 2B. No equivalen a instalación ni a una prueba nativa. |
| RNM-05 | Verificar navegación, red, sesión persistente y permisos en dispositivo real. | Planificado hasta el 23/11/2026, sujeto a dispositivo y entorno disponibles. Sin evidencia de aprobación actual. |
| RNM-06 | Garantizar accesibilidad y rendimiento nativos con objetivos medidos. | Parcial: controles y estilos presentes; sin auditoría nativa ni métricas de rendimiento certificadas. |

El comando `npm.cmd run build:mobile` ejecuta `expo export --platform android --output-dir dist/android`. Su resultado es un conjunto de bundles y assets. **No se dispone de evidencia de APK/AAB firmado, publicación en tienda ni certificación productiva.** La existencia de perfiles EAS en configuración tampoco acredita que hayan sido ejecutados.

## Evolución y aceptación del cierre

**Planificado hasta el 23/11/2026:** ensayar en dispositivo el flujo importador existente, verificar los mensajes de error y la coherencia con web, registrar limitaciones y preparar un recorrido académico. Estas actividades no agregan nuevas funcionalidades y dependen de acceso autorizado al backend.

**Fuera del MVP de cierre:** gestión completa del operador en mobile, adjudicación nativa nueva, documentos/evaluaciones nativos nuevos, notificaciones push, offline, iOS certificado, pagos por tramos y contratación directa. Una ampliación exige otro alcance; no se promete para los ocho días restantes.

La aceptación académica debe mostrar la división real de tareas: publicación/seguimiento desde mobile y cotización/adjudicación/administración desde web. Véanse [casos de uso](03-casos-de-uso.md), [arquitectura](06-arquitectura.md) e [informe 2B](../16-etapa-2b-capacity.md).
