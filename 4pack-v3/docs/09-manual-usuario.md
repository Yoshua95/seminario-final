# Manual de usuario — 4PACK

## Acceso y roles

4PACK posee tres roles. Cada usuario inicia sesión desde `/acceso` y visualiza únicamente las funciones autorizadas por su perfil.

- **Importador:** publica cargas, recibe ofertas, adjudica y sigue operaciones.
- **Operador:** cotiza oportunidades aprobadas y registra avances logísticos.
- **Administrador:** valida operadores y audita el estado general.

## Importador

### Publicar una carga

1. Seleccionar **Nueva carga**.
2. Completar descripción, origen, destino, categoría, peso, volumen, valor FOB, modalidad y fecha límite.
3. Si el contenido menciona baterías, litio, líquidos, imanes, aerosoles o químicos, el sistema solicita revisión HAZMAT.
4. Adjuntar la ficha MSDS en PDF cuando corresponda.
5. Publicar. La solicitud queda abierta para operadores aprobados.

### Comparar y adjudicar

1. Abrir **Mis ofertas**.
2. Entrar al comparador de la carga propia.
3. Revisar costo total, modalidad, plazo, gestión aduanera y reputación.
4. Seleccionar **Adjudicar**.
5. El sistema crea la operación y cierra las demás propuestas.

### Garantía simulada

En el detalle de la operación, seleccionar **Simular garantía de pago**. Esta acción habilita el avance logístico, pero no transfiere ni custodia dinero real.

## Operador

### Validación

Completar el perfil comercial. El administrador debe aprobarlo antes de que pueda presentar ofertas.

### Crear una oferta

1. Abrir **Oportunidades** o **Nueva oferta**.
2. Elegir una carga abierta.
3. Informar modalidad, flete, aduana, otros costos, plazo, vigencia y condiciones.
4. Enviar la propuesta.

El operador no puede ofertar si está pendiente/rechazado, si la carga cerró o si ya presentó la misma combinación no permitida.

### Actualizar la operación

Después de confirmarse la garantía simulada:

1. Abrir **Operaciones**.
2. Registrar ubicación y avanzar en orden: adjudicada → tránsito → aduana → entregada.
3. Cada cambio agrega un hito al historial.

No es posible saltar estados ni modificar operaciones ajenas.

## Documentos y mensajería

Los participantes pueden:

- enviar mensajes dentro del detalle de una operación;
- subir PDF de hasta 10 MB vinculados a una carga u operación autorizada;
- descargar documentos mediante enlaces temporales.

Los archivos no son públicos y los permisos se verifican en la base de datos y en Storage.

## Calificación bilateral

Cuando la operación llega a **Entregada**, cada participante puede calificar una sola vez a la contraparte con 1 a 5 estrellas y un comentario opcional. Las calificaciones recibidas actualizan la reputación del operador.

## Administrador

### Validar operadores

1. Abrir **Administración → Revisar operadores**.
2. Revisar empresa, responsable, identificación fiscal y descripción.
3. Aprobar o rechazar.

### Panel de control

El panel resume operadores pendientes, operaciones, documentos, volumen garantizado simulado y comisiones proyectadas. Estos valores tienen finalidad académica y operativa; no representan fondos reales.

## Aplicación Android

El APK permite iniciar sesión, consultar oportunidades, publicar/cotizar según el rol, revisar operaciones, enviar mensajes y actualizar hitos habilitados. La comparación y adjudicación del importador se completa desde el panel Web.

## Cerrar sesión

Ingresar a **Mi perfil** y seleccionar **Cerrar sesión**. En equipos compartidos, cerrar también las ventanas privadas utilizadas para otros roles.

## Límites del MVP

- No procesa pagos reales ni ofrece escrow regulado.
- No realiza liquidaciones aduaneras oficiales.
- El tracking se construye con hitos ingresados por usuarios autorizados.
- La detección HAZMAT es preventiva y no reemplaza una evaluación profesional.
