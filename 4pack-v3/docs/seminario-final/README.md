# 4PACK — Documentación de Seminario Final

| Dato | Identificación |
| --- | --- |
| Proyecto | 4PACK |
| Alumno | Chavez Yoshua Facundo |
| Carrera | Analista de Sistemas |
| Materia | Seminario Final |
| Profesor | Francisco Montero |
| Última actualización | **16/11/2026** |
| Cierre técnico planificado | **23/11/2026** |
| Rama | `codex/4pack-qa-readiness` |
| Checkpoint 2B | `de5e3eeb562d44f848c0e18addcbaef6e9bbcde2` |

## Propósito y estado

Este conjunto describe el sistema real al cierre local de Capacity 2B. Los doce documentos están **publicados en la rama `codex/4pack-qa-readiness` mediante el commit `cc00b58`**, sin merge a `main`. La implementación de Capacity 2B permanece preservada en `de5e3ee`. La publicación y esta actualización documental no modifican funcionalidades ni comienzan otra etapa.

El commit `feat(4pack): complete stage 2b capacity` contiene 35 archivos, incluidas migraciones 0020–0022, fixture ficticio, interfaz, pruebas e informe 2B. Se revisaron candidatos y exclusiones de secretos/artefactos. Antes del commit se quitó solamente una línea vacía final detectada al incorporar 0021 al índice y se regeneró el paquete SQL de demo; no cambió su lógica. `diff --cached --check` y las cuatro pruebas de demo/Preview pasaron. El árbol quedó limpio antes de redactar estos documentos.

El [informe 2B](../16-etapa-2b-capacity.md) se conserva como evidencia histórica: su sección Git describe la entrega **anterior al checkpoint**, cuando 2B aún no estaba versionada. No debe interpretarse como el estado Git actual. También existen documentos iniciales de alcance con otros horizontes; para esta entrega rige el corte al 15/11 y el cierre planificado al 23/11, sin reescribir esa historia.

## Índice de entregables

«Completo» significa contenido solicitado redactado y contrastado técnicamente, listo para revisión; no aceptación docente. «En revisión» indica una propuesta analítica con datos externos o supuestos pendientes. «Pendiente» se reserva para una actividad aún no ejecutada, no para un archivo omitido.

| Archivo | Entregable | Estado documental | Evidencia o pendiente principal |
| --- | --- | --- | --- |
| [01-requisitos-web.md](01-requisitos-web.md) | Requisitos funcionales/no funcionales y roles | Completo | RW/RNW → CU → rutas, SQL y pruebas del cierre 2B. |
| [02-requisitos-mobile.md](02-requisitos-mobile.md) | Alcance importador y restricciones | Completo | Dashboard/pantallas reales; export Android separado de distribución firmada. |
| [03-casos-de-uso.md](03-casos-de-uso.md) | Actores, diagrama y doce especificaciones | Completo | Precondiciones, flujos, errores, postcondiciones y parciales. |
| [04-der.md](04-der.md) | Modelo de datos acumulado 0001–0022 | Completo | Tres diagramas legibles, claves/cardinalidades y restricciones. |
| [05-diagrama-clases.md](05-diagrama-clases.md) | Modelo conceptual de dominio | Completo | Responsabilidades y correspondencia con tipos/funciones/SQL; no clases ejecutables ficticias. |
| [06-arquitectura.md](06-arquitectura.md) | Arquitectura actual, estados y límites | Completo | Capas, RLS/RPC, gateway, demo y despliegue previsto. |
| [07-diagrama-componentes.md](07-diagrama-componentes.md) | Componentes y dependencias | Completo | Web/mobile/dominio/Auth/DB/Storage/Realtime y ruta alternativa PGlite. |
| [08-gantt.md](08-gantt.md) | Cronograma al 23/11/2026 | En revisión | Disponibilidad personal, acceso autorizado y dispositivo aún por confirmar. |
| [09-foda.md](09-foda.md) | FODA y estrategias específicas | En revisión | Existen dos entrevistas reales con importadores; todavía no existen entrevistas con operadores logísticos externos. No se atribuyen resultados no aportados. |
| [10-benchmarking.md](10-benchmarking.md) | Seis grupos de referentes y recorte de 4PACK | En revisión | Fuentes primarias consultadas; sin cuentas privadas ni medición de mercado. |
| [11-analisis-viabilidad.md](11-analisis-viabilidad.md) | Viabilidad técnica/operativa/económica/legal/académica | En revisión | Presupuesto, adopción y revisión profesional no acreditados. |
| [README.md](README.md) | Índice, convenciones y evidencia de validación | Completo | Inventario y estado de los entregables de esta carpeta. |

## Estados del producto usados en los documentos

| Estado | Interpretación |
| --- | --- |
| Implementado | Código, esquema o flujo identificados en el checkpoint y evidencia local relacionada. No implica habilitación comercial ni certificación remota. |
| Parcial | Existe una parte del flujo, pero faltan canal, interfaz, integración o validación expresamente señalados. |
| Planificado hasta el 23/11/2026 | Propuesta de cierre/ensayo/documentación, no ejecutada por crear estos documentos ni garantizada sin recursos/autorización. |
| Fuera del MVP | No se promete como parte del cierre. Puede evaluarse luego con alcance y autorización nuevos. |

La aprobación económica de Capacity es **administrativa**. La comprobación y reserva al adjudicar son transaccionales. No deben confundirse con una evaluación de solvencia automatizada o disponibilidad física conectada. La garantía o pago, wallet y retiros actuales son simulados; no hay custodia ni transferencia de fondos. Direct/rehire, Protect 3.0 completo, pagos por tramos, controversias completas y Reputation adicional no se presentan como implementados.

## Evidencia técnica y reproducibilidad

- [Informe Capacity 2B](../16-etapa-2b-capacity.md): 89 pruebas automatizadas, 21 recorridos de navegador y builds/checks del cierre previo, con limitaciones explícitas. **No se repitió esa suite integral en esta fase documental.**
- [Informe Marketplace/Quotes 2A](../15-etapa-2a-marketplace-y-quotes.md) e [informe etapa 1](../../INFORME_POST_IMPLEMENTACION_ETAPA_1.md): antecedentes históricos; las descripciones actuales se contrastaron con el checkpoint, no solo con los planes iniciales.
- [Migraciones](../../supabase/migrations/), [dominio](../../packages/domain/src/), [web](../../apps/web/src/), [mobile](../../apps/mobile/): fuentes para requisitos, DER, clases, arquitectura y componentes.
- [Pruebas 2B](../../tests/stage2b.test.mjs), [regresión 2A](../../tests/stage2a.test.mjs), [etapa 1](../../tests/stage1.test.mjs), [navegador](../../tests/operator-browser.test.mjs) y [Preview](../../tests/demo-preview.test.mjs): evidencia técnica enlazada, sin inventar pruebas nuevas.

## Validación de esta documentación

Verificación y actualización documental: **16/11/2026**. Se conserva el corte académico **15/11/2026**, solicitado para la entrega, y el horizonte **23/11/2026**. Las tareas futuras del Gantt no se convierten en ejecutadas por transcurrir su fecha de inicio.

| Verificación ejecutada | Resultado |
| --- | --- |
| Inventario de archivos y lectura Markdown | 12/12 archivos esperados, sin fences abiertos ni caracteres de reemplazo. |
| Parser y render real de Mermaid **11.17.2** en Chromium local | 9/9 diagramas aprobados; SVG generados localmente. Incluye casos de uso, tres DER, clases, arquitectura, estados, componentes y Gantt. |
| Enlaces relativos mediante parser Markdown | 128/128 destinos existentes; 140 enlaces totales, de los cuales 12 son externos. No se confunde existencia local con disponibilidad de sitios externos. |
| Contraste DER con catálogo PGlite migrado hasta 0022 | 28 tablas y 98 atributos dibujados encontrados en el esquema, sin nombres de tablas/columnas inventados. No es una certificación de todas las cardinalidades; estas se revisaron contra FK/índices del SQL. |
| Grafo de Operations comparado con el contrato JSON | 13/13 transiciones internas coincidentes; ninguna transición adicional. El final gráfico de disputed no libera capacidad. |
| Referencias de requisitos a casos de uso | 12 casos definidos; ninguna referencia CU sin definición. |
| Escaneo de afirmaciones de alcance | 10 menciones sensibles revisadas: todas son negaciones, exclusiones o condiciones futuras. Ninguna se acepta como afirmación de fondos, distribución firmada o producción/concurrencia certificadas. |
| Integridad y publicación después del checkpoint | Los doce documentos están versionados y publicados en QA mediante `cc00b58`; la carpeta ya no está sin seguimiento. La implementación 2B permanece en `de5e3ee`. No se modificaron funcionalidades durante la elaboración, publicación ni esta corrección documental. |

Las utilidades locales se ejecutaron con `node .4pack-demo/seminario-validation/validate.mjs` y `node .4pack-demo/seminario-validation/semantic.mjs`. Los resultados se conservan en `validation.json`, `semantic.json`, `contradictions.json` y sus logs dentro de ese directorio. La comprobación local de Mermaid utiliza familias soportadas por GitHub sin plugins/sintaxis experimental. Los archivos están publicados en GitHub; **la validación local no equivale a comprobar su render en GitHub**.

Las herramientas temporales, sus dependencias, SVG y logs permanecen bajo `.4pack-demo/`, ignorados por Git. No se modifican los manifiestos ni el lockfile del proyecto para validar documentación. La primera descarga de la herramienta fue bloqueada por las restricciones de red; el reintento autorizado usó directorio y cache temporales locales.

## Datos y validaciones todavía pendientes

1. Aceptación docente y eventual formato institucional de entrega.
2. Disponibilidad horaria real del alumno, dispositivo y entorno PostgreSQL autorizado para el Gantt.
3. Ensayo multiconexión y de roles/RLS/gateway/Storage reales; PGlite no certifica concurrencia PostgreSQL.
4. Prueba mobile en dispositivo; exportar Android no acredita APK firmado ni distribución.
5. Presupuesto, demanda y costos operativos; existen dos entrevistas reales con importadores y todavía no existen entrevistas con operadores logísticos externos. No hay rentabilidad demostrada.
6. Revisión jurídica/contractual si se evoluciona hacia usuarios, envíos o pagos reales.
7. Despliegue académico de la aplicación en un entorno conectado sujeto a autorización y checks; la documentación ya está publicada en GitHub y no se certifica producción.
8. Integración HAZMAT: el formulario web conserva subida directa MSDS incompatible con 0015 y puede no compensar el alta de carga bajo RLS de 0016. Hallazgo por inspección estática, sin reproducción remota ni corrección. Mobile marca MSDS requerido pero no lo adjunta desde publicación.

La documentación fue publicada mediante push normal a `origin/codex/4pack-qa-readiness`, con `cc00b58` como commit de publicación de los doce documentos. No hubo merge a `main`, despliegue ni migración remota. La implementación 2B permanece en `de5e3ee`; no se modificaron funcionalidades. Esta corrección se limita al estado documental de publicación, sin iniciar funcionalidades nuevas.
