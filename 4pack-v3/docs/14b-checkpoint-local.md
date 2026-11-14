# Checkpoint local anterior a la etapa 2A

El checkpoint conserva solo `4pack-v3`, dentro del repositorio superior `4PACK`. Incluye fuentes web/mobile/dominio, Android nativo, migraciones 0001–0016, Supabase Functions, scripts, pruebas y documentación. El hash definitivo figura en la entrega de la etapa 2A y puede consultarse con `git log --oneline -- 4pack-v3` desde la raíz Git.

Se excluyen `.env` y variantes (se conservan ejemplos sin valores secretos), dependencias, caches, `.next*`, `.test-dist`, `dist`, bases/capturas/logs en `.4pack-demo`, builds Android, APK/AAB y material de firma. No se incorporan proyectos hermanos.

`apps/mobile/android/app/debug.keystore` se conserva únicamente en el equipo actual, ignorado por Git. Es una clave de desarrollo, no una credencial de producción. No es necesaria para typecheck ni export Hermes. Una nueva copia que necesite compilar Android de desarrollo puede generarla desde `apps/mobile/android/app` con el JDK instalado:

```text
keytool -genkeypair -v -storetype JKS -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

Las contraseñas anteriores son los valores públicos convencionales para firma de depuración. No usar esta clave para producción. La configuración nativa preexistente también referencia la firma debug en release: la firma de distribución continúa pendiente y no se certifica mediante este checkpoint.

Para recuperar el checkpoint, preservar primero el trabajo actual y extraer su árbol `4pack-v3` en otro directorio con `git archive <hash> 4pack-v3`. No hacer reset, clean o checkout destructivo sobre cambios existentes. El checkpoint no contiene secretos ni datos locales: deben proveerse por separado. El ZIP anterior a la etapa 1 permanece disponible en `.4pack-demo/restore-stage1`, fuera de Git.
