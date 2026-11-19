# Manual de instalación — 4PACK

## Requisitos

- Node.js 20 o superior y npm.
- Proyecto Supabase con Auth, PostgreSQL y Storage habilitados.
- Variables públicas de Supabase para Web y Mobile.
- Para Android local: Android Studio, un dispositivo virtual y un APK generado por EAS.

## Instalación del repositorio

```bash
git clone https://github.com/Yoshua95/seminario-final.git
cd seminario-final/4pack-v3
npm install
```

## Variables de entorno

Crear `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
```

Crear `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
```

No guardar claves privadas, contraseñas ni archivos `.env` en Git.

## Base de datos

Aplicar en orden los archivos de `supabase/migrations`, desde `0001` hasta la última migración. Crear previamente en Supabase Auth las tres cuentas demo y luego ejecutar `supabase/seed.sql`.

El seed espera estas cuentas:

- `importador@4pack.demo`
- `operador@4pack.demo`
- `admin@4pack.demo`

Las contraseñas se administran fuera del repositorio.

## Ejecución local

Web:

```bash
npm run dev:web
```

Mobile con Expo:

```bash
npm run dev:mobile
```

## Verificación previa

```bash
npm test
npm run typecheck
npm run lint
npm run build:web
npm run build:mobile
```

Todos los comandos deben finalizar con código de salida 0.

## Instalación del APK en Android Studio

1. Abrir Android Studio y ejecutar un dispositivo virtual desde Device Manager.
2. Esperar a que Android termine de iniciar.
3. Descargar el APK de distribución interna desde la compilación de Expo.
4. Si existe una versión anterior que se cerraba al iniciar, desinstalarla del emulador para limpiar sus datos.
5. Arrastrar el APK sobre la pantalla del emulador y esperar el mensaje de instalación correcta.
6. Abrir 4PACK y verificar que muestre la pantalla de acceso.
7. Si se cierra, abrir `View → Tool Windows → Logcat`, filtrar por `com.yoshuachavez.fourpack` y conservar el bloque `FATAL EXCEPTION`.

## Despliegue

- Web: el proyecto se despliega en Vercel desde la rama principal.
- Base de datos: las migraciones se aplican en Supabase antes de usar funciones nuevas.
- Android: EAS genera un APK con perfil `preview` e incremento del código de versión.

## Solución de problemas

| Problema | Revisión recomendada |
| --- | --- |
| Web dirige siempre a acceso | Confirmar variables y sesión de Supabase |
| No se puede ofertar | Verificar que el operador esté aprobado y la carga abierta |
| La carga HAZMAT no se publica | Adjuntar un PDF MSDS válido |
| No se puede descargar un documento | Confirmar participación y políticas de Storage |
| El APK se cierra al iniciar | Confirmar versión actual, reinstalar y revisar Logcat |
| Cambios no visibles | Verificar commit desplegado y limpiar sesión/caché de prueba |
