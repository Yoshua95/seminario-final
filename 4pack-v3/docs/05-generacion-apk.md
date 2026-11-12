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
