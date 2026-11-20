# Bloque 24 · Origen, entrega y bandeja — EN CURSO

Fecha: 20/11/2026, Argentina. Rama codex/mvp-defense-close. Partida 4e305ffce5abcc9d0863c2d141de3e8c6c538f8d.
Destino exclusivo: candidata khtfjogqvtjuxhmzkmue. Defensa fuera del alcance.

Implementación local: remitentes agente/proveedor particular/tienda/otro; solo recepción en China; peso y volumen declarados positivos; entrega acordada en Argentina, desglose ARS y aceptación de solo retiro; depósitos de Argentina; bandeja por operador sin ofertas previas. Históricos sin reescritura.

La migración 20261120220613_origin_receiving_argentina_delivery.sql pasó nueve pruebas PGlite. Los ocho tests del bloque 23 quedan fijados al esquema histórico de ese bloque; el nuevo test crea registros B23 antes de migrar y comprueba su lectura después de la migración actual. No se usa ese pin para acreditar el flujo nuevo.

Pruebas de regresión ejecutadas: MVP 45, pagos 43, MSDS 13, dominio 12, importador 4 y visor 2; typecheck y lint sin autofix. Resultados finales y evidencias se completarán tras el ensayo publicado.

La cuenta adicional autorizada operador.entregas.candidata@4pack.demo se creó conservando las cuentas anteriores. UUID c6df0c84-bfab-40e5-aaca-f458e3ec8d9a. Aprobación realizada desde la pantalla administrativa de la candidata para transporte internacional y entrega nacional; empresa ficticia, sin acreditación comercial real. Contraseña fuera del chat/Git.

Build web local PASS. Bundle Android PASS. Primer build ARM64 falló en expo-modules-core y react-native-screens: ninja: manifest 'build.ninja' still dirty after 100 tries. Se ensaya carpeta generada corta para evitar rutas prefab demasiado largas, sin borrar fuentes ni caches. No afirmar instalación ni soporte ARM hasta verificar el APK.

Mercado Pago permanece apagado. El bloque se considerará PARCIAL si impide adjudicar; no se simulará un pago remoto ni se inventarán operaciones.
