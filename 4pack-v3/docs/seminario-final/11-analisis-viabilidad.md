# 11. Análisis de viabilidad de 4PACK

Alumno: Chavez Yoshua Facundo — Analista de Sistemas — Seminario Final. Profesor: Francisco Montero. Corte: **15/11/2026**. Cierre planificado: **23/11/2026**. Estado del documento: **en revisión**; no constituye dictamen jurídico, financiero ni aprobación de producción.

## Alcance de la evaluación

Se evalúan dos objetivos distintos: un MVP académico que permita demostrar un flujo protegido con datos ficticios y un eventual servicio comercial que intermedie relaciones logísticas reales. La evidencia del primero no alcanza para aprobar el segundo. La base técnica es el checkpoint 2B `de5e3eeb562d44f848c0e18addcbaef6e9bbcde2`; los controles actuales y sus limitaciones constan en el [informe técnico](../16-etapa-2b-capacity.md).

## Viabilidad técnica

**Para el MVP académico: favorable con condiciones.** La arquitectura integra web, mobile y dominio compartido; existen reglas SQL, RLS, versiones contractuales, documentos privados y Capacity transaccional. El cierre 2B registró 89 pruebas automatizadas, 21 recorridos web, typecheck, lint y compilaciones/exportaciones exitosas. Se dispone de una demo PGlite reproducible, sin depender de una migración remota para la exposición local.

Las condiciones son mantener el alcance real, preparar una base demo válida y no extrapolar los resultados a una infraestructura no probada. PGlite no certifica concurrencia multiconexión. El export Android no demuestra instalación ni APK firmado. Falta ensayo del gateway/Storage conectado y de roles reales. La experiencia mobile no cubre adjudicación, documentos ni evaluaciones nativas; esos tramos se realizan por web.

**Para un producto comercial: insuficiente evidencia.** Antes de tráfico real deben medirse contención/retries de transacciones, aislamiento de usuarios, carga, recuperación, retención de archivos, monitoreo y respuesta a incidentes. No hay SLA, prueba de recuperación remota ni certificación de seguridad productiva. Las restricciones únicas y locks son necesarias, pero no equivalen a una evaluación de toda la plataforma.

## Viabilidad operativa

El flujo requiere personas que revisen la identidad/documentación del operador y aprueben límites económicos con evidencia y motivo. La suspensión no borra reservas existentes, por lo que debe existir un responsable de las operaciones activas. Los históricos con capital desconocido exigen revisión, no una asignación automática a cero.

Para una demostración, el alumno puede representar los roles con identidades ficticias y explicar ese procedimiento. Para un piloto comercial faltan definición de responsables, tiempos de atención, control de calidad documental, canales de escalamiento y tratamiento de incumplimientos. El sistema registra tareas y decisiones, pero no provee personal ni certificación profesional.

La adopción presenta un problema de dos lados: sin operadores confiables el importador no recibe alternativas; sin cargas los operadores no mantienen propuestas actualizadas. El código no demuestra que exista volumen suficiente. También debe comprobarse si el valor del historial, seguimiento y condiciones justifica permanecer en la plataforma después del contacto inicial.

## Viabilidad económica

No se dispone de presupuesto aprobado, cotizaciones comerciales vigentes, costo de adquisición, demanda ni ingresos comprobados. Por eso no se calcula una rentabilidad ficticia ni un período de recupero.

| Categoría de costo | MVP académico | Servicio comercial |
| --- | --- | --- |
| Desarrollo y pruebas | Tiempo del alumno y equipo disponible; no se presume costo cero del trabajo. | Mantenimiento, seguridad, soporte técnico, cambios y guardias según alcance. |
| Infraestructura | Ejecución local y eventual entorno de prueba sujeto a límites del proveedor. | Hosting, DB, Auth, almacenamiento, egreso, backups, monitoreo y capacidad ante picos. |
| Operación | Preparación de datos ficticios y ensayo de roles. | Revisión documental/económica, soporte, gestión de incumplimientos y atención de usuarios. |
| Distribución | Export Android local; dispositivo y firma si se autorizan en otra etapa. | Canales de distribución, mantenimiento de clientes y políticas de las tiendas. |
| Contratos y regulación | Revisión del alcance y uso de datos ficticios. | Asesoramiento, contratos, privacidad, seguros y eventual integración con proveedor de pagos. |

El modelo actual usa una comisión simulada por operación; la tasa por defecto del esquema es 0,025. Es una regla del prototipo, **no una tarifa comercial validada ni ingreso realizado**. Un modelo posterior debería estimar ingresos netos por servicios efectivamente conciliados menos infraestructura, adquisición, atención, revisión, integraciones y tratamiento de conflictos. Debe mantener cada moneda separada o declarar una conversión externa verificable para un análisis económico; el sistema no la realiza automáticamente.

La adopción y el costo operativo son más inciertos que la posibilidad de compilar el software. Un plan comercial requiere hipótesis medibles de volumen, frecuencia de uso, abandono, costo por operación y costo de soporte, con escenarios conservador/base/exigente. No se asignan valores sin evidencia.

## Viabilidad legal y regulatoria

El MVP no mueve fondos y utiliza «garantía o pago simulado». Esto delimita la demostración, pero no permite concluir que un futuro servicio comercial carezca de obligaciones. Deben precisarse el rol contractual de la plataforma, el de cada operador y la responsabilidad por información/documentos, incumplimiento y uso de datos.

La AAIP publica criterios para responsables de bases de datos y obligaciones de información/protección. Antes de datos de usuarios reales corresponde evaluar finalidad, consentimiento/base aplicable, acceso, conservación, transferencias y contratos con proveedores. El diseño con RLS no reemplaza ese análisis. Fuentes: [protección de datos personales](https://www.argentina.gob.ar/aaip/datospersonales) y [obligaciones de responsables](https://www.argentina.gob.ar/aaip/datospersonales/responsables/obligaciones), consultadas el 15/11/2026.

Si se agregaran pagos, cuentas, custodia o liquidación, debe evaluarse con asesoramiento especializado el encuadre de la actividad y del proveedor. El BCRA mantiene un [registro de proveedores de servicios de pago](https://www.bcra.gob.ar/registro-de-proveedores-de-servicios-de-pago/) y un [procedimiento de inscripción](https://www.bcra.gob.ar/inscripcion-registro-proveedores-servicios-de-pago/). Su existencia no permite afirmar aquí que 4PACK deba o no inscribirse: depende del modelo concreto. Integrar un checkout tampoco implica estar habilitado para custodiar fondos.

En logística/comercio exterior quedan por revisar habilitaciones, documentación de cargas, mercancías con riesgo, seguros y límites de responsabilidad de cada prestador. La detección heurística de baterías u otros términos no es una clasificación técnica; el perfil aprobado por administración no sustituye una matrícula o registro profesional. No hay revisión jurídica integral acreditada. Direct/rehire, pagos por tramos y controversias completas permanecen fuera del MVP, sin contratos comerciales inferidos a partir del código.

## Viabilidad académica

El proyecto permite evidenciar relevamiento, requisitos, roles, modelado, arquitectura, integridad transaccional y pruebas. Su defensa debe explicar por qué se separa el perfil público de la información legal/económica y por qué la reserva se decide en PostgreSQL, no en un total de pantalla. Reconocer flujos parciales es parte de la evaluación, no un defecto que deba ocultarse.

La fecha del 23/11/2026 es alcanzable para **consolidar y presentar lo existente** si se respeta el [cronograma](08-gantt.md). No hay base para prometer, en ese intervalo, fondos reales, controversias completas, paridad mobile, producción certificada ni módulos nuevos. Existen dos entrevistas reales con importadores; todavía no existen entrevistas con operadores logísticos externos. La aceptación del profesor y la conformidad con la consigna institucional están pendientes; no se inventan resultados de entrevistas, validaciones docentes ni aprobaciones de usuarios.

## Riesgos y mitigaciones

| Riesgo | Prioridad de cierre | Mitigación/condición |
| --- | --- | --- |
| Extrapolar PGlite a concurrencia PostgreSQL real | P1 | Ensayo multiconexión autorizado antes de demo conectada; si no es posible, limitar y declarar la evidencia local. |
| Exponer datos por configuración remota distinta | P1 | Verificar migraciones/roles/RLS y gateway en entorno separado; no aplicar SQL remoto por iniciativa de esta documentación. |
| Publicación HAZMAT con subida MSDS heredada y compensación DELETE incompatible con políticas vigentes | P1, detectado por inspección estática | Reproducir y corregir solo en un trabajo funcional autorizado; hasta entonces no demostrar ese camino como completo. Puede persistir la carga ante error de archivo. El gateway de documentos existente no corrige automáticamente al consumidor heredado. |
| Aprobar capacidad sin análisis humano o con históricos desconocidos | P1 | Motivo, evidencia y revisión explícita; fixtures ficticios solo en demo. |
| Confundir garantía simulada con cobertura financiera | P1 | Explicación visible, casos de uso acotados, sin recepción de fondos ni promesa de reembolso. |
| Incumplimiento y desintermediación | Comercial alto, no medido | Definir propuesta de valor posterior al contacto, soporte y contratos antes de un piloto. El filtro de mensajes no basta. |
| Falta de dispositivo o acceso al entorno | P2 para exposición local; bloqueante para certificar ese canal | Confirmar recursos temprano y usar demo local como contingencia, sin afirmar pruebas nativas no ejecutadas. |
| Aumento del alcance antes del cierre | P1 académico | Congelar módulos nuevos, priorizar regresión, guion y documentación. Cualquier corrección funcional posterior requiere otro trabajo. |
| Costos y demanda desconocidos | Comercial alto, no medido | Entrevistas, cotizaciones y prueba acotada sin fondos; no presentar la comisión simulada como negocio probado. |

## Conclusión

4PACK es viable como MVP académico acotado y demostrable: existe implementación suficiente para argumentar decisiones de análisis y verificar un recorrido local. Su mayor riesgo inmediato es presentar como terminado lo que solo está modelado, simulado o compilado.

La viabilidad comercial queda **sin demostrar**. Requiere adopción, procedimientos humanos, evaluación económica/jurídica y pruebas de infraestructura reales. El cierre responsable al 23/11 consiste en entregar evidencia reproducible y límites claros; no en incorporar nuevas promesas de contratación, protección o pagos que el sistema actual no sostiene.
