# 4PACK

Plataforma Web + Android de intermediación y licitación logística para pequeños importadores de la ruta China–Argentina.

## Alcance de diciembre 2026

- Web para importadores, operadores y administración.
- APK Android para los circuitos operativos.
- Backend compartido sobre Supabase/PostgreSQL.
- Licitación inversa ciega, comparación de ofertas, adjudicación, seguimiento por hitos, documentos, mensajería y reputación.
- Garantía de pago simulada de forma transparente; no se custodia dinero real.

## Estructura

- `apps/web`: aplicación Next.js.
- `apps/mobile`: aplicación Expo/React Native.
- `packages/domain`: modelos y reglas compartidas.
- `docs`: alcance, arquitectura, backlog y evidencias académicas.

## Comandos

```bash
npm install
npm run dev:web
npm run dev:mobile
npm test
npm run typecheck
npm run lint
npm run build:web
npm run build:mobile
```

## Validación y demostración

- [Plan de pruebas integral](docs/06-plan-pruebas.md)
- [Guion de demostración](docs/07-guion-demo.md)
- [Manual de instalación](docs/08-manual-instalacion.md)
- [Manual de usuario](docs/09-manual-usuario.md)

