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
npm run typecheck
npm run build:web
```

