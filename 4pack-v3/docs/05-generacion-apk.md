# Generación del APK Android

## Objetivo académico

El perfil `preview` produce un archivo APK instalable para la demostración de Seminario Final. El perfil `production` queda reservado para una futura distribución mediante Google Play y genera un Android App Bundle.

## Configuración requerida

La compilación necesita estas variables de entorno:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Las variables deben cargarse como secretos del proyecto en Expo. No deben incorporarse al repositorio.

## Generación

Desde la raíz del monorepo:

```bash
npm run build:apk --workspace=@4pack/mobile
```

La primera ejecución solicita autenticar la cuenta de Expo y vincular el proyecto. EAS administra el certificado Android y entrega una URL de descarga cuando finaliza la compilación.

## Validación mínima del instalable

1. Instalar el APK en un dispositivo Android.
2. Iniciar sesión como importador y como operador.
3. Publicar una carga desde la cuenta importadora.
4. Presentar una oferta desde la cuenta operadora.
5. Adjudicar la oferta desde Web.
6. Confirmar la garantía simulada desde Mobile.
7. Registrar los hitos hasta la entrega.
8. Enviar y recibir mensajes dentro de la operación.
9. Cerrar sesión y volver a ingresar para comprobar la persistencia segura.

## Evidencia para la entrega

Conservar el APK, la URL de la compilación, capturas del flujo completo, fecha de generación, versión y dispositivo utilizado para la prueba.

### Build preview verificado — 12/11/2026

- Estado EAS: `Succeeded`.
- Plataforma y distribución: Android, distribución interna.
- Artefacto: APK.
- Proyecto Expo: `@yoshua95/4pack`.
- Perfil y entorno: `preview`.
- SDK Expo: `54.0.0`.
- Versión: `3.0.0` (`versionCode 1`).
- Rama: `codex/4pack-mobile-core`.
- Commit compilado: `8a4711eba301a235ab5c0e30f5d7b556cc9ed847`.
- Build EAS: https://expo.dev/accounts/yoshua95/projects/4pack/builds/65c52a0d-b0b7-425a-a2e0-832ea91fec7f
- Inicio informado por Expo: 12/11/2026 10:24 (Argentina).
- Tiempo total informado: 20 min 49 s.
- Tamaño descargado: 65.738.270 bytes (aprox. 63 MiB).
- SHA-256: `7d2d74fa47c4398c04ca50a329fd0908674126517a4c65ab701926a737b4fa69`.
- Integridad estática: archivo identificado como paquete Android APK; estructura ZIP comprobada sin errores.
- CI del mismo commit: workflow `4PACK v3 CI` run #41 exitoso.
- Despliegue de vista previa Vercel: exitoso.

Esta evidencia confirma la generación y la integridad estática del instalable. La prueba funcional en un dispositivo físico debe registrarse por separado siguiendo la lista anterior.
