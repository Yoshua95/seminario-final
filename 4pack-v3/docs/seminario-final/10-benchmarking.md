# 10. Benchmarking conceptual de 4PACK

Seminario Final — Chavez Yoshua Facundo. Fuentes consultadas: 15/11/2026. Estado del documento: **en revisión**, sin validación de mercado ni pruebas de las plataformas competidoras.

## Método y límites

Se comparan enfoques de producto mediante páginas oficiales, documentación y centros de ayuda. Las descripciones de cada proveedor son declaraciones públicas del proveedor, no auditorías de calidad o cumplimiento. La comparación no incluye tarifas, resultados financieros, participación de mercado, contratación de servicios ni acceso a cuentas privadas.

Los criterios son: descubrimiento de prestadores, normalización de propuestas, seguimiento operativo y construcción de confianza. No todas las referencias compiten en el mismo segmento o país; algunas sirven como analogía de diseño. Las inferencias para 4PACK se identifican como decisiones propuestas, sin atribuir implementaciones ajenas al código local.

## Comparación y conceptos adoptables

| Referente y enfoque publicado | Concepto útil para 4PACK — inferencia de diseño | Qué no se adopta ni se afirma equivalente | Estado en 4PACK |
| --- | --- | --- | --- |
| **Freightos / WebCargo.** Freightos presenta comparación/reserva de fletes y una plataforma para forwarders; la página de [Freightos for Forwarders](https://www.freightos.com/forwarders/) identifica la denominación anterior WebCargo. [Sitio oficial](https://www.freightos.com/). | Separar búsqueda, condiciones y confirmación; evitar comparar importes sin alcance/modalidad/moneda. | No se incorporan reservas instantáneas reales con aerolíneas/navieras, tarifas conectadas ni inventario de capacidad de transportistas. Capacity 4PACK mide compromisos de su operador según aprobación administrativa. | Implementado: directorio, propuestas normalizadas, comparación y adjudicación local. Ausente: reserva efectiva de transporte e integraciones de tarifas. |
| **uShip.** Su [centro de ayuda](https://help.uship.com/hc/en-us/articles/360049972393-How-Can-I-Get-A-Quote) describe publicar un envío y recibir cotizaciones de proveedores con feedback. | Publicación de necesidad logística y competencia entre propuestas; reputación ligada a experiencias registradas. | No se asume igual cobertura geográfica, tipos de envío, modelo de comisiones, garantías o condiciones de contratación. Tampoco se atribuye a uShip el mecanismo exacto de oferta ciega de 4PACK. | Implementado: licitación/ofertas privadas y reglas de evaluación por operación completada. Parcial: experiencia bilateral de UI y adopción real. |
| **Alibaba Trade Assurance.** La [política oficial de protección](https://tradeassurance.alibaba.com/ta/MoneyBackPolicy.htm) describe reclamos/reembolsos por incumplimientos de pedidos bajo sus condiciones. | Registrar términos y evidencia antes del conflicto; distinguir aceptación de condiciones de resolución posterior. | No se replica el programa, su cobertura, pagos ni mediación. 4PACK no ofrece un respaldo contractual equivalente ni una protección comercial por usar el nombre Protect. | Implementado: snapshot, documentos y garantía simulada. Parcial: registro de consecuencias de cierre. Fuera del MVP: controversias completas y pago por tramos. |
| **Mercado Libre / Mercado Pago.** [Compra Protegida](https://www.mercadolibre.com.ar/compra-protegida/) presenta una cobertura sujeta a condiciones. La [documentación de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/getting-started) distingue soluciones de pago e integraciones. | Diferenciar reputación, soporte de una operación y proceso de pago; comunicar condiciones y estado del proceso al usuario. | Un marketplace y un proveedor de pagos son responsabilidades distintas. No se integra Mercado Pago, no se copia su cobertura ni se infiere que integrar un checkout habilitaría custodia propia de fondos. | Garantía, comisión, wallet y retiros son simulados. No existe integración financiera real ni acreditación de fondos. |
| **Flexport.** Su [plataforma oficial](https://www.flexport.com/) reúne visibilidad de envíos, órdenes e inventario y presenta servicios logísticos. | Una vista de operación con hitos, documentos y novedades evita que el contrato se reduzca a un precio inicial. | No se atribuyen a 4PACK red operativa propia, despacho automatizado, inventario integrado ni exactitud/tiempos promocionados por ese proveedor. | Implementado: operación e hitos registrados por usuarios. Parcial: información de seguimiento manual; sin telemetría de transportista. |
| **sennder.** Se presenta como [forwarder digital de transporte terrestre](https://www.sennder.com/en), con plataforma para el ciclo del envío. | Distinguir disponibilidad operativa de una cotización y coordinar compromisos del prestador durante el ciclo de la operación. | 4PACK no dispone de flota conectada, asignación algorítmica de camiones, red europea ni optimización automática de rutas/capacidad física. | Implementado: máximos administrativos y reservas transaccionales. No implementado: disponibilidad física conectada ni despacho logístico automático. |

## Síntesis por criterio

| Criterio | Decisión de 4PACK | Límite explícito |
| --- | --- | --- |
| Descubrimiento | Perfil comercial separado del legal y directorio de operadores habilitados. | No valida automáticamente matrícula, solvencia ni disponibilidad de flota. |
| Comparación | Alcance versionado, incluidos/excluidos, modalidad, moneda y capital estimado. | No existe una tarifa universal ni conversión automática USD/ARS. |
| Contratación | Adjudicación por licitación con snapshot y comprobación transaccional de Capacity. | Direct/rehire no son recorridos implementados. |
| Confianza | Revisión administrativa, evidencia documental y evaluación posterior a completed. | No equivale a garantía de cumplimiento ni cobertura financiera de un tercero. |
| Protección | Garantía o pago simulado y registro de consecuencias contractuales al cerrar. | Sin dinero real, pagos por tramos ni controversias completas. |
| Visibilidad | Fases e hitos de operación con mensajería y documentos. | Seguimiento declarado por las partes, no ubicación real certificada. |

## Calidad de las fuentes y pendientes

Las fuentes son primarias y se consultaron sin extraer cifras comerciales. La apertura directa de algunas páginas de Compra Protegida respondió HTTP 403; la descripción acotada se contrastó con el resultado indexado de la página oficial. Por ese límite no se reproducen condiciones detalladas, plazos o cobertura territorial. El acceso inicial al enlace general de uShip falló; se utilizó su centro de ayuda oficial accesible. Las denominaciones comerciales pueden cambiar; se conserva la fecha de consulta.

No se realizó una evaluación de usabilidad con cuentas reales ni una comparación contractual entre jurisdicciones. Existen dos entrevistas reales con importadores; todavía no existen entrevistas con operadores logísticos externos. Antes de formular una propuesta comercial faltan estas últimas entrevistas, delimitación del segmento inicial y contraste de costos operativos. El benchmarking permite justificar elecciones de diseño; no demuestra superioridad ni retorno económico de 4PACK ni atribuye resultados a las entrevistas.

Para la entrega del 23/11/2026 se propone usar esta comparación para explicar el recorte académico. Fuera del MVP quedan las integraciones y responsabilidades de los servicios citados. Véanse [FODA](09-foda.md), [viabilidad](11-analisis-viabilidad.md) y [requisitos web](01-requisitos-web.md).
