# Auditoría web y plan de migración de 4PACK

Fecha: 13 de noviembre de 2026. Estado: propuesta pendiente de aprobación; implementación no iniciada.

Referencia oficial: https://web-logistica-panel-de-mesa-de-lici.vercel.app/

## 1. Resultado y recomendación

Convertir `apps/web` en el producto principal conservando Next.js, Supabase, las migraciones y el dominio compartido existentes. Reconstruir la interfaz del panel con fidelidad al prototipo y adaptar las capacidades actuales detrás de ella. La app móvil sigue como cliente complementario del mismo dominio y backend.

No encontré el código fuente original del panel de licitación en las ubicaciones revisadas. Sí existe otro prototipo LogiChina en la carpeta superior: `../app/page.tsx` monta `../components/postular-carga-screen.tsx`, un formulario de Nueva Postulación. Puede aportar catálogos, cálculo de volumen e interacciones, pero no contiene la mesa, historial, billetera ni soporte del panel oficial. No corresponde reemplazar `apps/web` por ese proyecto.

La búsqueda incluyó el repositorio, su carpeta superior, Documents, Desktop y Downloads, con los textos «Mesa de Licitación Ciega» y «Marítima Rivera», excluyendo dependencias y salidas generadas. Los enlaces heredados de Windows Mi música/Mis imágenes/Mis vídeos devolvieron acceso denegado. Esto no demuestra que no exista una copia en otra ubicación, archivo comprimido o repositorio remoto.

Inspeccioné también el JavaScript público compilado del prototipo para verificar sus interacciones. No equivale al código fuente original mantenible ni se incorporará como dependencia de producción.

## 2. Preservación y estado local

El estado inicial de esta auditoría ya contenía:

- Eliminación de `apps/mobile/expo-env.d.ts`.
- Modificaciones de `apps/mobile/package.json`, `apps/mobile/tsconfig.json`, `apps/web/package.json`, `package.json` y `package-lock.json`.
- Carpeta `apps/mobile/android/` sin seguimiento.

Se conservaron estos cambios. No hubo commits, publicación, merge, reemplazo de aplicaciones ni migraciones ejecutadas contra Supabase.

Se inició el servidor de `apps/web` como proceso independiente en http://localhost:3000, con recarga de desarrollo. Respondió HTTP 200 y se verificó en Chrome. Metro móvil continúa separado en el puerto 8082.

Al iniciar Next.js se generó `apps/web/AGENTS.md` y se actualizaron automáticamente las referencias de `apps/web/next-env.d.ts` hacia `.next/dev/types`. Son efectos del servidor de desarrollo, no una reconstrucción. Los scripts, capturas y registros auxiliares de auditoría se guardaron en `.expo`, ya ignorado por Git.

## 3. Recorrido del prototipo

Se visitaron las cinco secciones, las cuatro cargas disponibles, el selector marítimo/aéreo y el botón Retirar. Se inspeccionaron los manejadores del formulario de oferta y del compositor de soporte en el bundle público. Se comprobó el diseño a 1440 px y a 390 px.

| Sección | Componentes y contenido observados | Comportamiento comprobado |
| --- | --- | --- |
| Cargas Disponibles | Sidebar con empresa y rango; cuatro cargas; ficha de manifiesto; reputación del importador; HAZMAT/MSDS; cotizador lateral fijo al desplazarse | La selección cambia la ficha. Dos cargas muestran alerta HAZMAT. Modalidad e inputs usan estado local. Enviar oferta ejecuta únicamente `preventDefault`; no persiste una propuesta. |
| Mis Ofertas | Dos propuestas de ejemplo; estado; destino; peso, volumen y bultos; carga peligrosa; moneda/modalidad de cobro; precio; plazo y documentación exigida | Presentación estática. No está conectada al formulario de la mesa. |
| Historial | Tabla de viajes entregados; ruta; datos físicos; modalidad de pago; puntuación; resumen de reputación Platinum | Datos estáticos; el umbral 4.8 se presenta como texto, sin regla conectada. |
| Mi Billetera | Saldos USD/ARS; Retirar; garantías retenidas; operaciones pendientes de validación; bloques informativos de plazos 30/90 días | Retirar no produjo cambio y no tiene manejador en el componente inspeccionado. No hay movimientos de fondos implementados en esa UI. |
| Soporte | Conversación de muestra con mesa de control; indicador de conexión; input y botón de envío | Sin manejador de envío en el componente inspeccionado. No es un chat conectado. |

Todos los enlaces del menú son botones que cambian estado; la URL permanece `/`. No hay áreas accesibles de importador y administrador en este prototipo. Su diseño deberá extenderse a esos roles usando los casos de uso existentes de 4PACK.

### Lenguaje visual a conservar

- Fondo casi negro, sidebar grafito de aproximadamente 256 px y superficies elevadas oscuras.
- Bordes finos, radios contenidos, sombras discretas y espaciado amplio alrededor de datos compactos.
- Tipografía sans serif con datos e identificadores monoespaciados.
- Jerarquía clara entre encabezado, lista, ficha detallada y cotización lateral.
- Acciones principales claras/neutras en la referencia; ámbar para HAZMAT. No convertir todo el producto en botones naranjas por defecto.
- Iconografía lineal consistente, badges de estado, reputación y tablas de operaciones.
- Sustituir LogiChina por 4PACK en marca, títulos, metadata y textos. Mantener empresas de muestra sólo como datos de demostración identificados.

El prototipo no resuelve bien la pantalla estrecha: a 390 px conserva la sidebar de escritorio y comprime/recorta el contenido. La migración preservará la composición de escritorio y añadirá menú móvil, paneles apilados y tablas adaptables.

## 4. Arquitectura actual de apps/web

| Capa | Estado observado | Decisión propuesta |
| --- | --- | --- |
| Framework | Next.js 16.4.6, App Router, TypeScript; `transpilePackages` para `@4pack/domain` | Conservar. No cambiar framework ni actualizar dependencias por motivos visuales. |
| Navegación | Rutas reales; shell compartido; mismo menú para importador y operador, con administración condicionada al rol | Separar layouts y navegación por rol; mantener compatibilidad de enlaces previos mediante redirecciones. |
| Estilos | CSS global, panel claro, tarjetas blancas, acento naranja; acceso oscuro | Introducir tokens y componentes oscuros coherentes con la referencia. Evitar una capa de overrides indiscriminados. |
| Sesión | `src/proxy.ts` renueva cookies y redirige según sesión cuando hay configuración; clientes SSR/browser | Conservar y reforzar validación del rol en cada área. No depender sólo de ocultar enlaces. |
| Lecturas | `src/lib/dashboard-data.ts` reúne consultas y adaptación de entidades | Separar por módulo y distinguir ausencia de configuración, error y lista vacía. |
| Escrituras | Varios componentes invocan directamente Supabase, Storage y RPC | Extraer servicios/casos de uso y repositorios tipados; los componentes gestionarán presentación y estado del formulario. |
| Dominio | `packages/domain`: roles, estados, cargas, ofertas, comisión y detección HAZMAT | Reutilizar y ampliar con reglas puras comprobables, sin dependencias de React ni Supabase. |
| Persistencia | Ocho migraciones; Auth, tablas, RLS, Storage y RPC de adjudicación/seguimiento/garantía simulada | Reutilizar; comprobar políticas y transacciones con sesiones de los tres roles antes de declarar integración completa. |
| Datos demo | `src/data/demo.ts` existe, pero no encontré importaciones desde la aplicación | Crear proveedor demo explícito y aislado para revisar todos los roles sin confundir fixtures con datos reales. |
| Tiempo real | No encontré suscripciones `channel(...).subscribe(...)` de Supabase en la web; se usa `router.refresh()` tras escrituras | Implementar suscripciones sólo donde aporten valor: ofertas propias, hitos y conversaciones, con permisos correctos. |
| Pruebas | Cuatro pruebas del dominio, sin cobertura actual del flujo web completo | Agregar pruebas de reglas, autorización y recorridos relevantes durante la implementación. |

La web actual renderizó en Chrome con listas vacías y sin un perfil autenticado. No se verificaron escrituras reales, usuarios de prueba, aplicación de migraciones ni RLS sobre una base conectada durante esta auditoría.

### Rutas existentes

`/`, `/acceso`, `/cargas/nueva`, `/ofertas`, `/ofertas/nueva`, `/ofertas/[cargoId]`, `/operaciones`, `/operaciones/[operationId]`, `/documentos`, `/perfil`, `/admin`, `/admin/operadores`.

Ya hay implementación de publicación de cargas y MSDS, presentación de ofertas, comparación/adjudicación, documentos privados con URLs firmadas, seguimiento, mensajería de operación, calificación bilateral, edición de perfil y revisión de operadores. Su existencia en código no equivale a validación integral del backend desplegado.

### Brechas funcionales relevantes

- Falta la composición mesa + ficha de carga + cotización contextual de la referencia. Los enlaces actuales a cotizar no transportan el identificador de la carga seleccionada.
- El botón Filtrar de la portada no tiene lógica y «Detalle disponible» en ofertas de operador no es un enlace.
- Los errores de varias consultas se transforman en listas vacías o datos nulos; esto dificulta distinguir fallos de conexión de ausencia real de datos.
- La oferta ciega tiene RLS que restringe lectura al operador propietario/importador dueño y políticas administrativas. Debe probarse que un operador no pueda obtener ofertas ajenas ni información sensible mediante consultas alternativas.
- «Sellada hasta el cierre» requiere una definición de negocio: las políticas existentes permiten actualizar ofertas propias presentadas. Debe definirse si se permite retirar, modificar o reenviar y hasta qué fecha.
- Los perfiles son legibles por usuarios autenticados en la política inicial. Hay que revisar las columnas públicas para que la promesa de proteger contactos antes de adjudicar sea efectiva.
- Faltan bultos/unidades y códigos públicos de carga, términos documentales estructurados, preferencias de cobro USD/ARS, reputación completa del importador y regla de rango Platinum.
- Hay garantías simuladas, pero no existe un libro de movimientos ni una billetera multimoneda. El soporte general tampoco tiene entidad propia; los mensajes actuales pertenecen a operaciones.
- El agregado administrativo de garantías toma las ocho más recientes y calcula totales sobre esa muestra: no representa un total global de toda la plataforma.
- No tratar los candados y los textos «encriptada/verificado» del prototipo como evidencia de cifrado de aplicación o validación documental real.

## 5. Inventario propuesto

### Rutas y áreas

Las carpetas entre paréntesis de Next.js podrán organizar código; los prefijos siguientes serán parte real de las URLs.

| Área | Rutas propuestas | Funcionalidad |
| --- | --- | --- |
| Acceso | `/acceso`, `/` | Autenticación; redirección al área del rol autenticado. |
| Operador | `/operador/cargas`, `/operador/cargas/[cargoId]` | Mesa, manifiesto, HAZMAT/MSDS, reputación y oferta contextual. |
| Operador | `/operador/ofertas`, `/operador/ofertas/[offerId]` | Propuestas propias, detalle y estado; reglas de vigencia y sellado. |
| Operador | `/operador/operaciones`, `/operador/operaciones/[operationId]`, `/operador/historial` | Operaciones activas, hitos, chat, cierre e historial/reputación. |
| Operador | `/operador/billetera`, `/operador/soporte`, `/operador/perfil`, `/operador/documentos` | Garantías y movimientos simulados; soporte, cuenta y documentación. |
| Importador | `/importador`, `/importador/cargas`, `/importador/cargas/nueva`, `/importador/cargas/[cargoId]` | Resumen y gestión de cargas propias, publicación y seguimiento de licitación. |
| Importador | `/importador/cargas/[cargoId]/ofertas` | Comparar ofertas, condiciones y reputación; adjudicar. |
| Importador | `/importador/operaciones`, `/importador/operaciones/[operationId]`, `/importador/documentos`, `/importador/garantias`, `/importador/soporte`, `/importador/perfil` | Operación, documentos, garantía simulada, soporte y cuenta. |
| Administrador | `/admin`, `/admin/operadores`, `/admin/cargas`, `/admin/operaciones`, `/admin/garantias`, `/admin/soporte` | Métricas reales, validación de operadores, supervisión y auditoría. |

Redirigir URLs anteriores hacia su equivalente según el rol preservando identificadores. Mantener URLs estables al seleccionar una carga; resolver el detalle dentro del mismo layout para conservar la mesa de escritorio.

### Componentes

| Grupo | Inventario |
| --- | --- |
| Estructura | `AppShell`, `RoleNavigation`, `MobileNavigation`, `Brand`, `AccountSummary`, `PageHeader`. |
| Primitivas | Botón, campo, selector de modalidad, badge, tarjeta, tabla, diálogo de confirmación, estados de carga/vacío/error/permiso. |
| Licitación | `CargoList`, `CargoListItem`, `CargoManifest`, `HazmatNotice`, `ReputationSummary`, `BlindOfferForm`, confirmación y recibo de oferta. |
| Ofertas/importador | `OfferCard`, `OfferDetail`, `OfferComparison`, filtros reales y confirmación de adjudicación. |
| Operaciones | `OperationTimeline`, `OperationSummary`, `OperationActions`, `OperationChat`, `DocumentRepository`, `RatingForm`. |
| Historial y garantías | `HistoryTable`, `ReputationCard`, `BalanceCard`, `GuaranteeList`, `MovementTable`, detalle de garantía simulada. |
| Soporte/admin | `SupportInbox`, `SupportThread`, `MessageComposer`, `OperatorReview`, `AdminMetrics`, registro de auditoría. |

### Entidades

Reutilizar `profiles`, `operator_profiles`, `cargo_requests`, `offers`, `operations`, `payment_guarantees`, `tracking_events`, `messages`, `documents`, `ratings`.

Proponer migraciones aditivas para:

- Código público de carga/operación, cantidad de bultos y datos declarados de unidades.
- Preferencia de cobro y condiciones documentales de oferta; importes/moneda con tipos explícitos.
- Tickets de soporte y mensajes de soporte separados del chat de operación.
- Movimientos de garantía/billetera de demostración sólo si se aprueba la interacción simulada de saldos y retiros.
- Auditoría administrativa; reputación del importador y rangos derivados de reglas explícitas.

No duplicar en nuevas tablas entidades que ya pueden representarse mediante las existentes. Definir contratos y backfills antes de cada migración para mantener compatible el cliente móvil.

## 6. Separación de responsabilidades

Estructura orientativa dentro de `apps/web/src`:

```text
app/                         rutas, layouts y validación del área
components/ui/               primitivas y tokens compartidos
components/layout/           estructura y navegación
features/<modulo>/components interfaz del módulo
features/<modulo>/services/  casos de uso y coordinación
features/<modulo>/data/      repositorios, consultas y mapeos
lib/supabase/                clientes SSR/browser y tipos de base
data/demo/                   fixtures y proveedor de demostración
```

`packages/domain` contendrá reglas y contratos compartidos. Las transacciones de adjudicación, cambio de estado y garantía seguirán siendo atómicas en base de datos mediante RPC autorizadas. La UI no recibirá claves privilegiadas. Las rutas y RLS deberán validar los permisos independientemente del menú.

## 7. Plan por entregas revisables

| Etapa | Resultado | Condición para avanzar |
| --- | --- | --- |
| 1. Base visual y navegación | Tokens del prototipo, marca 4PACK, shell oscuro, áreas y rutas reales; proveedor demo explícito | Revisar escritorio y móvil; navegación atrás/adelante/recarga; ningún cambio funcional móvil. |
| 2. Mesa del operador | Cuatro escenarios demo, ficha contextual y cotizador; ofertas propias e historial | Comparación visual con la referencia y estados de carga/vacío/error; reglas de oferta y HAZMAT comprobadas. |
| 3. Flujo del importador | Publicación, comparación, adjudicación y detalle de operación con el mismo sistema visual | Recorrido publicar → cotizar → adjudicar → operar; mantener reutilización del dominio. |
| 4. Integración y seguridad | Repositorios tipados, Supabase, migraciones aditivas, sesiones/RLS de tres roles y notificaciones de cambios relevantes | Comprobar aislamiento entre cuentas, cierre de licitación, concurrencia de adjudicación y URLs firmadas. |
| 5. Garantías, soporte y administración | Billetera/garantías simuladas, soporte conectado, validaciones y métricas completas | Cada acción tiene resultado persistente o está expresamente identificada como simulación; sin botones decorativos presentados como funcionales. |
| 6. Validación integral | Typecheck, pruebas relevantes, build web y recorridos en navegador; servidor de desarrollo disponible | Aprobación visual y funcional por rol; sin regresiones de contratos compartidos con móvil. |

Cada etapa se revisará localmente antes de extender la migración. No habrá publicación ni commits hasta recibir instrucciones.

## 8. Decisiones incluidas en el plan a aprobar

1. `apps/web` es la plataforma principal y `apps/mobile` permanece complementaria.
2. La interfaz del panel se reconstruye; el backend/dominio existente se reutiliza y endurece.
3. Las cinco secciones del operador conservan la identidad del prototipo; importador y administrador adoptan ese lenguaje visual.
4. Mantener garantías y retiros como simulación explícita, conforme al alcance actual de `docs/00-alcance-diciembre.md`; no introducir pagos reales.
5. Los textos de plazos 30/90 días son contenido del prototipo y no se convertirán automáticamente en reglas de liberación/abandono. Su eventual implementación requerirá una definición de producto separada.
6. Antes de conectar el envío definitivo, definir sellado, vigencia y retirada de ofertas; por defecto el plan propone oferta inmutable después de presentarse, con retirada explícita antes del cierre y trazabilidad.

La siguiente acción, una vez aprobado el plan, será implementar únicamente la etapa 1 para revisar la base visual y las rutas antes de continuar.
