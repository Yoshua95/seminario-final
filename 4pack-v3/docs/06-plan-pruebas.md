# Plan de pruebas integral — 4PACK

## Objetivo y criterio de salida

Validar que el MVP sea demostrable de punta a punta en Web y Android, que cada rol vea únicamente los datos permitidos y que las acciones críticas respeten las reglas del negocio.

La versión queda lista para la entrega cuando:

- las verificaciones automáticas finalizan sin errores;
- los casos críticos P0 pasan en producción con las tres cuentas de demostración;
- el APK abre, autentica y permite completar sus recorridos operativos;
- no existe acceso cruzado entre importador, operador y administrador;
- las limitaciones académicas de la garantía simulada son visibles.

## Entorno y datos de demostración

| Rol | Cuenta | Uso principal |
| --- | --- | --- |
| Importador | `importador@4pack.demo` | Publicar carga, comparar, adjudicar y confirmar garantía simulada |
| Operador | `operador@4pack.demo` | Cotizar, actualizar hitos y completar la operación |
| Administrador | `admin@4pack.demo` | Validar operadores y auditar garantías |

Las contraseñas no se guardan en el repositorio. Antes del simulacro deben verificarse y mantenerse en un gestor seguro.

## Verificaciones automáticas

Ejecutar desde la carpeta `4pack-v3`:

```bash
npm test
npm run typecheck
npm run lint
npm run build:web
npm run build:mobile
```

## Casos críticos P0

| ID | Rol | Prueba | Resultado esperado |
| --- | --- | --- | --- |
| P0-01 | Todos | Iniciar sesión con cada cuenta demo | Acceso correcto y navegación correspondiente al rol |
| P0-02 | Anónimo | Abrir una ruta privada | No obtiene datos operativos y es dirigido al acceso |
| P0-03 | Importador | Publicar una carga general | La carga queda abierta y visible para operadores aprobados |
| P0-04 | Importador | Publicar una carga con batería sin PDF MSDS | El sistema bloquea la publicación e informa el requisito |
| P0-05 | Importador | Publicar carga HAZMAT con PDF MSDS | La carga y el documento privado quedan vinculados |
| P0-06 | Operador aprobado | Enviar una oferta vigente | La oferta queda en evaluación y el total coincide con sus conceptos |
| P0-07 | Operador no aprobado | Intentar ofertar | RLS rechaza la operación |
| P0-08 | Importador propietario | Comparar y adjudicar una oferta | Se crea una operación, se aceptan/rechazan ofertas y nace la garantía pendiente |
| P0-09 | Otro importador | Intentar adjudicar una carga ajena | La función segura rechaza la acción |
| P0-10 | Importador participante | Confirmar la garantía simulada | Cambia a `held_simulated` sin procesar dinero real |
| P0-11 | Operador participante | Avanzar adjudicada → tránsito → aduana → entregada | Cambian operación y carga; se registran los hitos en orden |
| P0-12 | Operador | Avanzar sin garantía o saltar un estado | La función segura rechaza la transición |
| P0-13 | Participantes | Intercambiar mensajes | Ambos ven la conversación; terceros no acceden |
| P0-14 | Participantes | Subir y descargar un PDF privado | El archivo queda vinculado y la descarga usa una URL temporal |
| P0-15 | Ambos participantes | Calificar al finalizar | Cada parte califica una vez y se actualiza la reputación del operador |
| P0-16 | Administrador | Aprobar o rechazar un operador | Cambia su estado y se registra quién verificó |
| P0-17 | Administrador | Revisar panel de control | Métricas y garantías coinciden con los registros visibles |
| P0-18 | Android | Abrir el APK desde cero | La aplicación no se cierra y muestra acceso o sesión vigente |
| P0-19 | Android | Autenticar y navegar las cuatro pestañas | Inicio, oportunidades, operaciones y perfil funcionan sin cierres |
| P0-20 | Android | Completar el recorrido propio del rol | Las acciones producen los mismos estados que en Web |

## Casos complementarios P1

- Formularios: campos obligatorios, números negativos, fechas vencidas y mensajes de error.
- Oferta duplicada para la misma carga y modalidad.
- PDF con formato incorrecto o tamaño mayor a 10 MB.
- Sesión vencida durante una acción.
- Listados vacíos y estados de carga.
- Diseño responsive en 390 px, 768 px y escritorio.
- Reintento después de una falla de red.
- Persistencia de la sesión tras cerrar y volver a abrir el APK.

## Evidencia mínima por ejecución

Registrar para cada caso: fecha, ambiente, responsable, estado, observación y evidencia. Para los casos P0 conservar una captura del resultado y, cuando corresponda, el identificador de la carga u operación creada.

| ID | Estado | Evidencia/observación |
| --- | --- | --- |
| P0-01 a P0-20 | Pendiente | Completar durante la prueba integral |

## Riesgos detectados en la auditoría

1. Las cuentas demo existen como requisito del `seed.sql`, pero sus contraseñas no pueden validarse desde el repositorio.
2. El recorrido Android debe probarse con el APK corregido; una exportación de JavaScript exitosa no prueba el arranque nativo.
3. No debe fusionarse la corrección móvil hasta confirmar que el nuevo APK abre correctamente.
4. La evidencia académica sigue incompleta aunque el circuito funcional esté implementado.
