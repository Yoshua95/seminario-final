# 09. Análisis FODA de 4PACK

Seminario Final — Chavez Yoshua Facundo. Corte: 15/11/2026. Estado del documento: **en revisión**. Existen dos entrevistas reales con importadores; todavía no existen entrevistas con operadores logísticos externos. El análisis se apoya en el prototipo y en inferencias de diseño; no atribuye resultados no aportados ni valida demanda comercial.

## Contexto

4PACK propone organizar la contratación logística B2B alrededor de una carga, propuestas privadas comparables y una operación trazable. Su ventaja académica es mostrar el recorrido y sus controles. Su viabilidad comercial depende de reunir oferta y demanda confiables, sostener la operación y explicar qué responsabilidades asume la plataforma.

## Matriz

| Fortalezas internas | Debilidades internas |
| --- | --- |
| F1. Propuestas normalizadas y versionadas: permiten discutir alcance, moneda y responsabilidades, además del precio. | D1. No hay evidencia de demanda, operadores activos reales, conversión o retención. Un escenario ficticio no demuestra liquidez del marketplace. |
| F2. Reglas de adjudicación y Capacity en una transacción, con auditoría y privacidad de límites. | D2. Concurrencia PostgreSQL, infraestructura remota y dispositivo nativo aún no certificados. La buena cobertura local no sustituye esos ensayos. |
| F3. Separación de aprobación documental, perfil comercial y capacidad económica; no se mezclan reputación y solvencia. | D3. Aprobaciones y revisión de históricos requieren trabajo humano. El proyecto no dispone de validación documental o económica automática. |
| F4. Dominio compartido, monorepo y demo PGlite reproducible: facilitan mantenimiento y exposición académica. | D4. Experiencia desigual entre canales: mobile no adjudica ni cotiza; reputación bilateral integral y suspensión administrativa tienen límites de interfaz. |
| F5. Controles de rol, RLS, documentos privados y snapshot contractual reducen fallos previsibles del flujo. | D5. Garantía, wallet y retiros son simulados; controversias y continuidad comercial no resueltas. Persiste además una integración HAZMAT heredada incompatible con el gateway, detectada por inspección. |

| Oportunidades externas — hipótesis a validar | Amenazas externas |
| --- | --- |
| O1. Importadores con procesos dispersos podrían valorar comparar condiciones y conservar evidencia en una sola operación. | A1. Competidores con redes de transportistas y recursos establecidos pueden resolver más etapas y atraer a los mismos usuarios. |
| O2. Operadores pequeños podrían ganar visibilidad con un perfil comercial verificable y propuestas claras. | A2. Desintermediación: una vez conocidas las partes, pueden continuar por fuera para evitar costo o fricción. Un filtro de contactos no elimina ese incentivo. |
| O3. Una prueba acotada con usuarios y datos ficticios permite validar comprensión antes de asumir riesgo financiero. | A3. Falsedad documental, incumplimientos, fraude o manipulación de reputación pueden afectar confianza y generar conflictos. |
| O4. El trabajo académico puede producir un caso defendible de trazabilidad, seguridad e integridad transaccional. | A4. Responsabilidades contractuales, datos personales, transporte, comercio exterior y eventual intermediación de pagos requieren evaluación profesional. |
| O5. Con autorización y necesidades comprobadas, integraciones futuras podrían reducir carga manual. | A5. Dependencia de proveedores de identidad, base, almacenamiento y hosting; incidentes o costos variables pueden afectar la continuidad. |

## Estrategias derivadas

| Cruce | Acción propuesta | Evidencia/medida para decidir |
| --- | --- | --- |
| F1 + O1 | Probar una comparación de dos ofertas de distinto alcance y moneda con un importador, sin contratar un envío real. | Registrar si identifica exclusiones, moneda y capital declarado; no medir éxito solo por completar clics. |
| F3 + O2 | Separar en la demostración aprobación documental y económica, explicando por qué un aprobado puede no tener cupo. | Verificar que operador/importador comprenden el rechazo genérico y no interpretan Capacity como garantía de solvencia. |
| F4 + O4 | Mantener una demo reproducible y un registro de limitaciones alineado con la defensa académica. | Un tercero puede iniciar el entorno con instrucciones y reproducir el flujo sin secretos. |
| D2 + A3 | Priorizar ensayos de roles/concurrencia antes de un piloto conectado y bloquear exposición comercial prematura. | Resultado de pruebas multiconexión y RLS reales; defectos priorizados P0/P1/P2. |
| D3 + A4 | Documentar quién revisa, con qué evidencia, qué decide y cómo se registra el motivo. | Procedimiento y responsable definidos; por ahora no se presume capacidad de atención ni habilitación profesional. |
| D4 + O3 | Delimitar el cambio de canal mobile → web en lugar de prometer paridad. | Recorrido de usuario comprensible, con limitaciones expresas en los requisitos y la demo. |
| F1/F5 + A2 | Proponer valor continuo en historial, términos y seguimiento dentro de plataforma. | Entrevistas sobre el valor posterior al contacto inicial. Los filtros solos no justifican permanencia. |
| D5 + A4/A5 | Mantener el cierre académico con garantía simulada y sin fondos; evaluar proveedores y contratos solo en una etapa comercial separada. | No mostrar saldos simulados como fondos disponibles ni asumir que un proveedor resuelve todas las obligaciones. |

## Lectura crítica

La principal fortaleza no es haber reemplazado una operación logística completa, sino haber delimitado y protegido una parte del proceso contractual. Capacity reduce sobreasignación según límites declarados/aprobados; no acredita patrimonio, liquidez efectiva ni cumplimiento futuro. La reputación existente resume experiencias registradas, con escaso valor predictivo cuando no hay historial.

Para el cierre del 23/11/2026 conviene sostener el alcance verificable y obtener observaciones de uso. Fuera del MVP quedan la operación financiera real, la resolución integral de conflictos y la adquisición comercial a escala. Sin validación de adopción, procedimientos y costos, no es defendible afirmar que el producto ya sea un negocio viable.

Fuentes internas: [requisitos](01-requisitos-web.md), [arquitectura](06-arquitectura.md), [riesgos técnicos](../16-etapa-2b-capacity.md). Referentes externos y sus límites: [benchmarking](10-benchmarking.md). Las afirmaciones de oportunidad son hipótesis, no resultados de investigación de mercado.
