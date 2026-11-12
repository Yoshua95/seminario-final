# Arquitectura inicial

## Componentes

- **Web:** Next.js + TypeScript.
- **Mobile:** Expo + React Native + TypeScript.
- **Backend:** Supabase Auth, PostgreSQL, Storage y Realtime.
- **Dominio compartido:** tipos, estados y reglas reutilizables.

## Principios

- Una única fuente de datos para Web y Mobile.
- Autorización por rol y Row Level Security.
- Operaciones auditables mediante historial de estados.
- Módulos externos encapsulados para permitir reemplazar simulaciones por integraciones reales.
- Trazabilidad entre requisito, caso de uso, implementación y prueba.

## Flujo principal

1. El importador publica una carga.
2. Operadores aprobados presentan ofertas ciegas.
3. El importador compara y adjudica.
4. El sistema crea una operación y una orden de garantía simulada.
5. Las partes intercambian documentos y actualizan hitos.
6. Al cierre se calcula la comisión y ambas partes califican la experiencia.

