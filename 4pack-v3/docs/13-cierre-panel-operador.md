# Cierre y pulido del panel web del operador

Fecha: 13/11/2026. Trabajo local sobre la implementación existente. Sin commit, push, merge ni nuevo deployment. Se preservaron los cambios previos y no se modificó el código móvil en esta etapa.

## Resultado

Se conservan la identidad 4PACK, la sidebar de escritorio, las tarjetas oscuras, las fuentes Geist, los colores de marca, la estructura, el espaciado y las rutas existentes. Se aumentó el tono de texto secundario de `#a1a1aa` a `#b1b1ba`, se corrigieron colores de bajo contraste y el texto informativo o interactivo ahora tiene un mínimo de 13 px. La marca decorativa mantiene su tamaño. No se encontró un archivo identificable como logotipo definitivo en los recursos fuente; se conservó la marca aprobada.

- Se quitaron mensajes técnicos de la interfaz, incluidos los errores generales y la entrada demo. La acción de adjudicación dice «Función disponible únicamente en la demostración».
- Suspensión diferenciada de revisión pendiente, con motivo, fecha, restricciones, documentación o acción necesaria y acceso a soporte. Las nuevas suspensiones registran su fecha automáticamente. Los datos históricos sin fecha o motivo se explican sin inventarlos.
- Códigos persistentes y únicos de base de datos: `LC-`, `OP-`, `DOC-`, `TKT-`. Las referencias ya existentes se conservan y las secuencias avanzan por encima de ellas. No se usan fragmentos de UUID como texto visible.
- Fechas con `Intl.DateTimeFormat("es-AR")`, hora de 24 horas y zona `America/Argentina/Buenos_Aires`; números y monedas localizados. Los hitos y filtros de fecha usan el horario argentino también cuando el servidor está en otra zona.
- Operaciones con resumen y filtro por estado, acción explícita «Marcar como lista para entrega», contacto autorizado después de la adjudicación o explicación y alternativa por mensajería. Se mantienen timeline, hitos, mensajes y documentos.
- Documentos con código, tipo, fecha, responsable, referencia relacionada, estado y motivo; reemplazo con historial visible y descarga de versiones previas. Se conserva el tipo documental y se impiden nuevos reemplazos de una versión ya reemplazada o aprobada. PDF/JPG/PNG hasta 10 MB, validación de extensión, MIME y firma básica en el servidor.
- Billetera exclusivamente académica. Se rechazan cero, negativos, valores no finitos, importes vacíos, decimales inválidos y retiros superiores al saldo. Los estados solicitado/aprobado/rechazado se conservan; la revisión administrativa de un rechazo devuelve la reserva una sola vez y queda auditada. No hay bancos ni dinero real.
- Soporte con códigos humanos, filtros de estado, prioridad, mensajes, operación relacionada y adjuntos opcionales privados en el ticket. Pendientes y suspendidos pueden presentar documentación y contactar soporte sin habilitar acceso operativo.
- Perfil aprobado con CUIT y razón social de solo lectura, protegidos además en base de datos. El cambio se solicita por soporte. Checklist documental con estado y motivo y confirmación visible al guardar los demás datos.
- Etiquetas, foco visible, enlace para saltar al contenido, cierre con Escape y foco del menú móvil, diálogo identificado, mensajes `aria-live` y tablas desplazables accesibles por teclado. Una cabecera demo y una aclaración discreta en el pie; la billetera mantiene su aviso académico específico.

## Seguridad, persistencia y alcance real

El adaptador real existente conserva Supabase Auth, cookies SSR, roles importer/operator/admin, RPC y RLS. Las pruebas incluyen ofertas ajenas, mutaciones no autorizadas, cuenta pendiente o suspendida, datos jurídicos y adjuntos de otras cuentas. Las actualizaciones de hitos, documentos, operaciones y estado de verificación quedan auditadas. La adjudicación de demostración verifica también que la oferta pertenezca al operador aprobado.

La migración nueva es **0014_operator_polish.sql**, aditiva. No se ejecutó contra una base remota. Debe revisarse y aplicarse mediante el proceso habitual antes de habilitar el recorrido real; no ejecutar los archivos de `supabase/demo` contra Supabase.

Se revisaron los archivos de entorno locales sin imprimir sus valores: no hay un par público utilizable configurado. Siguen pendientes las variables documentadas en `apps/web/.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=URL_DEL_PROYECTO
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=CLAVE_PUBLICA_DEL_PROYECTO
```

Se configuran localmente en `apps/web/.env.local`, ignorado por Git. No se necesitan claves privadas en el navegador. No se probó una sesión real ni Storage/Realtime contra un proyecto remoto; las pruebas SQL/RLS se ejecutaron en PostgreSQL embebido con el esquema de demostración. No presentar esto como una validación remota ya completada.

`/demo` continúa aislado de Supabase, habilitado únicamente en desarrollo local o Vercel Preview y bloqueado en producción. En local conserva su base de prueba; en Preview usa almacenamiento temporal de instancia, que puede reiniciarse y no garantiza continuidad entre instancias. Ningún fallo del proveedor real activa automáticamente la demo.

## Archivos de esta etapa

| Archivos | Cambio |
| --- | --- |
| `.gitignore` | Ignorar el directorio generado del build aislado de verificación. |
| `apps/web/eslint.config.mjs` | Excluir el build aislado de la revisión de código fuente. |
| `apps/web/.env.example` | Documentar límites del modo demo y variables públicas necesarias. |
| `apps/web/src/app/operator.css` | Legibilidad, contraste, tamaños, variantes de botones, foco y detalles responsive. |
| `apps/web/src/app/demo/acceso/page.tsx` | Copia sin detalles técnicos internos. |
| `apps/web/src/app/operador/error.tsx` | Error orientado al usuario. |
| `apps/web/src/features/operator/panel.tsx` | Operaciones, documentos, tickets, perfil y estado suspendido. |
| `apps/web/src/features/operator/forms.tsx` | Confirmaciones localizadas, variantes de botón y anuncios accesibles. |
| `apps/web/src/features/operator/shell.tsx` | Cabecera/pie demo, menú de teclado y enlace al contenido. |
| `apps/web/src/features/operator/types.ts` | Referencias humanas y formato argentino. |
| `apps/web/src/features/operator/ui.tsx` | Etiqueta de ticket «En proceso». |
| `apps/web/src/features/operator/actions.ts` | Mensajes sin detalles de errores internos de base de datos. |
| `apps/web/src/features/operator/data.ts` | Autorización de adjudicación demo, errores controlados y actualización local del esquema durante HMR. |
| `apps/web/src/features/operator/demo-runtime.mjs`, `demo-runtime.d.mts` | Actualización del esquema de prueba sin reiniciar el servidor ni borrar datos. |
| `apps/web/src/features/operator/demo-sql.json` | Paquete SQL generado exclusivamente desde archivos versionados. |
| `supabase/migrations/0014_operator_polish.sql` | Códigos, suspensión, adjuntos, protección jurídica y auditoría/revisión de retiros. |
| `supabase/demo/operator-scenarios.sql` | Motivo/fecha/acción de suspensión y teléfono ficticio autorizado. |
| `tests/database.test.mjs` | RLS y casos nuevos de seguridad, versiones, códigos y retiros. |
| `tests/demo-preview.test.mjs` | Crear carpeta de prueba también en una instalación limpia. |
| `tests/operator-browser.test.mjs` | Recorrido ampliado de filtros, versiones, adjuntos, transición y responsive. |
| `scripts/verify-operator-accessibility.mjs` | Auditoría WCAG AA con axe-core en escritorio y móvil. |
| `docs/13-cierre-panel-operador.md` | Esta entrega e instrucciones. |

## Verificaciones

- `npm.cmd test`: **37 pruebas aprobadas**: 10 dominio, 23 SQL/RLS y 4 aislamiento Preview/producción.
- `npm.cmd run test:web`: **17 recorridos aprobados** en navegador real, con servidor/base aislados en 3001. Incluyen oferta validada/sellada, adjudicación, transición, hito, mensajes, documentos y reemplazo, ticket y adjunto, perfil, billetera y bloqueo por URL directa. Todas las secciones sin overflow horizontal a 320, 390, 768 y 1440 px.
- `node scripts/verify-operator-accessibility.mjs`: **18 análisis sin infracciones WCAG A/AA detectadas**, nueve páginas a 1440 y 390 px. Informe en `.4pack-demo/reports/accessibility.json`. La automatización se complementó con revisión visual y comprobación de teclado; no equivale a una certificación integral con lectores de pantalla.
- `npm.cmd run lint`, `npm.cmd run typecheck`: aprobados.
- Build Next.js de producción aprobado, usando `FOURPACK_DIST_DIR=.next-polish-build` para no interferir con el servidor de desarrollo.
- Capturas en `.4pack-demo/screenshots`; `git diff --check` sin errores.

## Ejecución local exacta (PowerShell)

El servidor principal queda disponible en **http://localhost:3000/demo/acceso** con actualización en tiempo real. Si ya está ejecutándose, abrir esa URL sin iniciar una segunda instancia.

Para iniciar desde una terminal nueva cuando el servidor esté detenido:

```powershell
Set-Location 'C:\Users\Asus Tuf\Documents\4PACK\4pack-v3'
npm.cmd ci
node scripts/prepare-demo-assets.mjs
npm.cmd run dev --workspace=@4pack/web -- --port 3000
```

Para verificar código y generar un build independiente:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
$env:FOURPACK_DIST_DIR = '.next-polish-build'
npm.cmd run build:web
Remove-Item Env:FOURPACK_DIST_DIR
```

Las pruebas de navegador usan Chrome con CDP en `http://localhost:9222`. Con ese navegador disponible, ejecutar `npm.cmd run test:web`; el proceso inicia y finaliza únicamente su servidor aislado en 3001. En Windows la terminal necesita permiso para cerrar ese árbol de procesos. Para repetir accesibilidad, instalar la herramienta fuera de las dependencias del producto y ejecutar:

```powershell
npm.cmd install --prefix .4pack-demo/a11y --no-save --package-lock=false --ignore-scripts --no-audit --no-fund axe-core
node scripts/verify-operator-accessibility.mjs
```

Pendientes reales: configurar variables públicas, revisar/aplicar migraciones y validar Auth/Storage/Realtime con cuentas reales autorizadas; recibir el logotipo definitivo si existe fuera del repositorio. No se inició mobile importador ni se reconstruyó el panel administrativo. El Preview anterior no se actualizó en esta etapa.
