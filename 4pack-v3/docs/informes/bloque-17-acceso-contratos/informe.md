# Bloque 17 — Acceso web y contratos nulos

Fecha: 19/11/2026. Rama: `codex/capital-admin-isolated`, worktree aislado del bloque 15. Partida: `022d7ec2be498685c2a17e9b9f531dbe6c8fcd64`. Checkpoint funcional local: **`55cd167f9c9f90ab1b32460cc5938a7c48cd056f`**.

**Resultado: PASS en la demo local y en la recuperación de sesión del APK existente.** Sin push, merge, despliegue, migraciones ni alteración de registros. La versión pública de defensa permanece intacta.

## Acceso web

`/demo/acceso` muestra únicamente **Operador** y **Administrador**, con Operador inicial. Se indica que el importador usa Android.

`enterRehearsal` también rechaza `importer` en el servidor: no alcanza con ocultar la opción. La prueba manipuló el formulario para enviar ese valor y verificó que no se creó una sesión.

Los runners que necesitan importador usan `scripts/internal-importer-session.mjs`. Solo desde el proceso de pruebas, con acceso al archivo local ignorado que contiene la clave de la demo, se crea la cookie firmada. No se añadió endpoint, parámetro de URL ni selector oculto. El helper rechaza destinos distintos de HTTP loopback y requiere un directorio absoluto explícito. Los runners existentes se adaptaron; el de capital recibe `FOURPACK_INTERNAL_TEST_DIRECTORY` con el directorio de su ensayo.

## Error reproducido y causa

Antes de corregir, entrar como admin y abrir `/demo/admin/operaciones` produjo **HTTP 500** y:

```text
Cannot read properties of null (reading 'quote')
```

El acceso problemático era `contract?.content.quote`: la cadena protegía la ausencia de la fila, pero no `content = NULL`.

Con los datos actuales:

| Operación | UUID | Estado | Snapshot |
|---|---|---|---|
| OP-1001 | `d0000000-0000-0000-0000-000000006291` | `in_progress` | Fila de contrato existente; `content` es SQL NULL. Era la que alcanzaba la línea que fallaba. |
| OP-1002 | `d0000000-0000-0000-0000-000000005521` | `completed` | También SQL NULL, pero retorna la tarea de cierre antes de consultar términos. |
| OP-1003 | `d0000000-0000-0000-0000-000000004912` | `completed` | También SQL NULL, mismo caso. |
| OP-1005 | `d8516408-49d2-4d09-86b8-e7804329845d` | `completed` | `content` y `quote` son objetos completos. |

No se rellenaron ni modificaron estos contratos para evitar el fallo.

## Corrección

`operationTask` y el tipo `Workbench` contemplan ausencia de contrato, snapshot nulo, `quote` nulo y lista documental ausente/inválida. Una lista ausente no se interpreta como cero requisitos.

- Cuando falta información para derivar la tarea documental: **Contrato pendiente de revisión — Administración**.
- Cierre e historial, reclamos, confirmación de recepción y una garantía pendiente explícita conservan sus tareas conocidas.
- Con contrato completo, se conserva la lógica de documento faltante, responsable y validación pendiente.

Archivos: `apps/web/src/features/admin/operation-task.ts`, `types.ts`, `features/multirole/pages.tsx`, `actions.ts`; helper interno y runners de pruebas.

## Validación

| Comprobación | Resultado |
|---|---|
| Selector web | **PASS**: opciones `[operator, admin]`, inicial `operator`. |
| Formulario manipulado a importador | **PASS**: rechazado por servidor, sin cookie de sesión. |
| Importador por mecanismo interno del runner | **PASS**: abre Mis cargas; sin acceso público adicional. |
| Entrar como administrador y abrir Operaciones | **PASS**: HTTP 200, los mismos cuatro registros, sin errores de página observados. |
| OP-1001 | **PASS**: muestra Contrato pendiente de revisión. |
| OP-1005, contrato completo | **PASS**: mantiene Consultar cierre e historial. La tarea documental de un contrato completo activo se verifica además en la prueba unitaria. |
| Android, APK existente | **PASS**: se cerró el proceso y se reabrió; recuperó vista autenticada del importador. Login no visible; sin espera indefinida; cero listeners Metro en 8081/8085. |

Android se comprobó con su sesión existente. No se volvió a introducir una contraseña, no se creó/restableció una cuenta y no se compiló otro APK. Las pruebas del guard cubren también ausencia de sesión, red/perfil y recuperación; no se presenta la recuperación observada como un nuevo ensayo de ingreso de credenciales.

Comandos ejecutados:

```text
node --test tests/admin-contract-task.test.mjs tests/mobile-auth-access.test.mjs
node tests/admin-null-access-browser.mjs
npm.cmd run typecheck
npm.cmd run lint
```

**25/25 pruebas PASS**: seis de contratos y diecinueve de Auth. Typecheck y lint PASS. El navegador usó un Chrome de pruebas independiente; el puerto CDP anterior estaba cerrado. El runner específico verificó el arreglo con la base existente, sin recrearla ni sustituir registros.

## Evidencia

- [Reproducción previa: HTTP 500](evidencia/reproduccion.json).
- [Resultado web](evidencia/web.json), [acceso](evidencia/acceso.png), [Operaciones corregida](evidencia/operaciones.png).
- [Android](evidencia/android.json), [captura autenticada](evidencia/android.png).
- [Pruebas automatizadas](evidencia/pruebas.txt).

Para revisar: **http://127.0.0.1:3015/demo/acceso**. Seleccionar Administrador y abrir Operaciones. Se conserva la base `.4pack-demo/block16-final` del worktree.

## Estado final y planilla

La corrección está guardada solo en la rama aislada. Los cambios generados de `next-env.d.ts`, `tsconfig.json` y `supabase/.temp` se preservaron y excluyeron del checkpoint. No hubo cambios en la autenticación de Android ni en Supabase remoto.

| Entregable | Evidencia disponible | URL pública verificada |
|---|---|---|
| Acceso y corrección de contrato nulo | Checkpoint local `55cd167`, regresión y capturas | Pendiente de publicación |
| Android | Sesión recuperada del APK existente, Metro apagado | Sin APK nuevo |

No es necesario aplicar una migración para esta corrección. La siguiente promoción sigue sujeta a la validación del bloque aislado; no reemplazar la versión de defensa como parte de este arreglo.
