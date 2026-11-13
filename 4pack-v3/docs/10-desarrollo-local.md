# Desarrollo local en tiempo real

Este flujo evita generar un APK por cada ajuste visual o funcional. El APK de desarrollo se instala una sola vez y se conecta al servidor local de Expo para recibir cambios mediante Fast Refresh.

## Requisitos

- Git.
- Node.js 20 o superior.
- Android Studio con un emulador iniciado.
- Visual Studio Code con Codex, o Codex CLI, trabajando sobre este mismo repositorio local.

## Preparación inicial

```bash
git clone https://github.com/Yoshua95/seminario-final.git
cd seminario-final/4pack-v3
npm install
```

Crear `apps/mobile/.env` con las variables públicas de Supabase indicadas en `.env.example`. Estas variables permiten conectar el cliente móvil, pero no incluyen claves administrativas.

## Development build

La primera vez se genera e instala un cliente de desarrollo:

```bash
cd apps/mobile
npm run build:development
```

Con el APK de desarrollo instalado y el emulador abierto:

```bash
npm run start:dev-client
```

Presionar `a` en la terminal para abrir 4PACK en Android. Los cambios en TypeScript, React Native y estilos se reflejan mediante Fast Refresh.

## Versiones de revisión

El perfil `preview` genera el APK estable que se utiliza para una demostración o un hito cerrado. También queda vinculado al canal `preview`, por lo que puede recibir actualizaciones compatibles sin reinstalarse.

```bash
npm run build:apk
npm run update:preview -- --message "Descripción del hito"
```

Se necesita un nuevo APK cuando cambia el código nativo, la versión de Expo, un plugin nativo, los permisos o la versión de ejecución. Los cambios ordinarios de pantallas, estilos, datos y lógica se prueban primero con Fast Refresh y se publican por etapas.

## Regla de cierre

1. Desarrollar y revisar con el cliente de desarrollo.
2. Publicar una actualización `preview` al cerrar cada rol.
3. Generar el APK definitivo solamente después de aprobar Importador, Operador, Administrador y la prueba integral.
