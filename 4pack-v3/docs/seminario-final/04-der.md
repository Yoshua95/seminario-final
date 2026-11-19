# 04. Diagrama de entidad-relación de 4PACK

Seminario Final — Chavez Yoshua Facundo. Corte: 15/11/2026. Estado del documento: **completo para revisión académica**.

## Criterio de representación

El modelo corresponde al resultado acumulado de las migraciones **0001–0022**, no solamente a 0001. Se seleccionan las claves y atributos necesarios para explicar el dominio. Los nombres son los reales de PostgreSQL; no se crean tablas conceptuales como `importadores`, `cotizaciones_items` o `payments` que el proyecto no posee.

En Mermaid, `o|` expresa cero o uno, `||` exactamente uno y `o{` cero o muchos. Una relación con un perfil no garantiza por sí misma el rol comercial: los roles se comprueban con RLS/RPC. La opcionalidad desde una entidad padre permite registros sin actividad o históricos pendientes de vincular.

## Núcleo comercial y operativo

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : origina
    PROFILES ||--o| OPERATOR_PROFILES : extension_operador
    OPERATOR_PROFILES ||--o| OPERATOR_COMMERCIAL_PROFILES : publica
    PROFILES ||--o{ CARGO_REQUESTS : importa
    CARGO_REQUESTS ||--o{ OFFERS : recibe
    PROFILES ||--o{ OFFERS : presenta
    OPERATOR_PROFILES ||--o{ QUOTE_DRAFTS : redacta
    CARGO_REQUESTS ||--o{ QUOTE_DRAFTS : corresponde
    OFFERS o|--o{ OFFERS : reemplaza
    OFFERS o|--o| QUOTE_DRAFTS : resultado_presentado
    CARGO_REQUESTS ||--o| OPERATIONS : adjudicacion_unica
    OFFERS ||--o| OPERATIONS : propuesta_aceptada
    PROFILES ||--o{ OPERATIONS : participa
    OPERATIONS ||--o| OPERATION_CONTRACT_SNAPSHOTS : conserva
    OFFERS ||--o| OPERATION_CONTRACT_SNAPSHOTS : fuente
    OPERATIONS ||--o| PAYMENT_GUARANTEES : garantia_simulada
    OPERATIONS ||--o{ TRACKING_EVENTS : registra
    OPERATIONS ||--o{ MESSAGES : conversa
    OPERATIONS ||--o{ RATINGS : evalua
    PROFILES ||--o{ RATINGS : autor_o_destinatario

    PROFILES {
        uuid id PK,FK
        user_role role
        text full_name
    }
    OPERATOR_PROFILES {
        uuid user_id PK,FK
        text company_name
        verification_status verification_status
    }
    OPERATOR_COMMERCIAL_PROFILES {
        uuid operator_id PK,FK
        uuid public_id UK
        text trade_name
        boolean published
        boolean admin_hidden
    }
    CARGO_REQUESTS {
        uuid id PK
        uuid importer_id FK
        numeric weight_kg
        numeric volume_m3
        numeric fob_usd
        cargo_status status
    }
    OFFERS {
        uuid id PK
        uuid cargo_id FK
        uuid operator_id FK
        uuid replaces_offer_id FK
        uuid quote_group_id
        int revision
        jsonb normalized_quote
        text payment_currency
    }
    QUOTE_DRAFTS {
        uuid id PK
        uuid operator_id FK
        uuid cargo_id FK
        uuid submitted_offer_id FK,UK
        jsonb content
    }
    OPERATIONS {
        uuid id PK
        uuid cargo_id FK,UK
        uuid accepted_offer_id FK,UK
        uuid importer_id FK
        uuid operator_id FK
        text phase
        text contract_currency
    }
    OPERATION_CONTRACT_SNAPSHOTS {
        uuid operation_id PK,FK
        uuid offer_id FK,UK
        text state
        jsonb content
    }
    PAYMENT_GUARANTEES {
        uuid id PK
        uuid operation_id FK,UK
        numeric amount_usd
        text currency
        guarantee_status status
    }
    TRACKING_EVENTS {
        uuid id PK
        uuid operation_id FK
        text event_type
        timestamptz occurred_at
    }
    MESSAGES {
        uuid id PK
        uuid operation_id FK
        uuid sender_id FK
        text body
    }
    RATINGS {
        uuid id PK
        uuid operation_id FK
        uuid author_id FK
        uuid recipient_id FK
        int score
    }
```

Las entidades en mayúsculas corresponden a `auth.users` y a las tablas homónimas de `public` en minúsculas. El esquema Auth es administrado por Supabase; el trigger crea `profiles`. Importador y administrador se representan mediante `profiles.role`, sin tablas propias. `operations` tiene dos FK de participante hacia perfiles; se agrupan en una línea para no duplicar el gráfico. `ratings` tiene dos FK a perfiles, autor y destinatario.

La autorreferencia de ofertas indica que una versión puede reemplazar una anterior; el índice único parcial de `replaces_offer_id` limita a un reemplazo inmediato. `quote_drafts.submitted_offer_id` es opcional y único; `replaces_offer_id` del borrador, omitido del dibujo, referencia la propuesta a reemplazar. La cotización normalizada y el snapshot se guardan como JSONB: sus campos no son tablas adicionales.

## Submodelo Capacity incorporado en 0020–0022

```mermaid
erDiagram
    OPERATOR_PROFILES ||--o| OPERATOR_CAPACITY_LIMITS : limite_global
    OPERATOR_CAPACITY_LIMITS ||--o{ OPERATOR_CAPACITY_CURRENCY_LIMITS : por_moneda
    OPERATOR_PROFILES ||--o| OPERATOR_CAPACITY_MUTEX : serializa
    OPERATOR_PROFILES ||--o{ OPERATION_CAPACITY_RESERVATIONS : consume
    OPERATIONS ||--o| OPERATION_CAPACITY_RESERVATIONS : reserva_unica
    OPERATOR_PROFILES ||--o{ CAPACITY_EVENTS : audita
    OPERATIONS o|--o{ CAPACITY_EVENTS : referencia_opcional
    OPERATIONS ||--o| CAPACITY_TERMINAL_DECISIONS : cierre_documentado
    OPERATOR_PROFILES ||--o{ CAPACITY_TERMINAL_DECISIONS : corresponde
    PROFILES ||--o{ OPERATOR_CAPACITY_LIMITS : aprueba
    PROFILES ||--o{ OPERATOR_CAPACITY_CURRENCY_LIMITS : aprueba
    PROFILES o|--o{ CAPACITY_EVENTS : actor_opcional
    PROFILES ||--o{ CAPACITY_TERMINAL_DECISIONS : registra

    OPERATOR_CAPACITY_LIMITS {
        uuid operator_id PK,FK
        int max_operations
        numeric max_weight_kg
        numeric max_volume_m3
        text status
        uuid approved_by FK
        text reason
    }
    OPERATOR_CAPACITY_CURRENCY_LIMITS {
        uuid operator_id PK,FK
        text currency PK
        numeric max_per_operation
        numeric max_exposure
        numeric declared_working_capital
        numeric approved_working_capital
        text status
    }
    OPERATOR_CAPACITY_MUTEX {
        uuid operator_id PK,FK
        bigint revision
    }
    OPERATION_CAPACITY_RESERVATIONS {
        uuid operation_id PK,FK
        uuid operator_id FK
        text contracting_source
        text currency
        numeric contract_exposure
        numeric working_capital_required
        numeric weight_kg
        numeric volume_m3
        text state
        text idempotency_key UK
        timestamptz released_at
    }
    CAPACITY_EVENTS {
        uuid id PK
        uuid operator_id FK
        uuid operation_id FK
        uuid actor_id FK
        text action
        text reason
        text event_key UK
    }
    CAPACITY_TERMINAL_DECISIONS {
        uuid operation_id PK,FK
        uuid operator_id FK
        text terminal_phase
        jsonb consequences
        uuid recorded_by FK
    }
```

La capacidad económica no es un atributo público del perfil comercial. La separación por moneda evita sumar USD y ARS. La configuración global comparte cantidad/peso/volumen entre monedas; ambas configuraciones poseen su propia vigencia/estado. El mutex es infraestructura de concurrencia, no una dimensión económica.

La reserva referencia al operador directamente, no mediante FK a sus límites: eso permite registrar consumo histórico pendiente de revisión cuando aún no existen límites aprobados. No se agregó una FK compuesta reserva-moneda/límite que impediría ese backfill. `capacity_events.operation_id` y `actor_id` pueden ser nulos; por ejemplo, una configuración no pertenece a una operación. Las fechas de reserva/activación/liberación y motivos, omitidos parcialmente del diagrama, constan en el SQL.

## Documentación, comunicación auxiliar y simulación financiera

```mermaid
erDiagram
    CARGO_REQUESTS o|--o{ DOCUMENTS : destino_carga
    OPERATIONS o|--o{ DOCUMENTS : destino_operacion
    OPERATOR_PROFILES o|--o{ DOCUMENTS : destino_operador
    PROFILES ||--o{ DOCUMENTS : carga
    DOCUMENTS o|--o{ DOCUMENTS : reemplazo
    DOCUMENTS ||--o| DOCUMENT_OBJECTS : vincula_bytes
    STORAGE_OBJECTS ||--o| DOCUMENT_OBJECTS : objeto_autorizado
    OPERATIONS ||--o{ CONVERSATION_READS : lectura
    PROFILES ||--o{ CONVERSATION_READS : lector
    PROFILES ||--o{ WALLET_MOVEMENTS : titular
    OPERATIONS o|--o{ WALLET_MOVEMENTS : origen_opcional
    PROFILES ||--o{ WITHDRAWAL_REQUESTS : solicita
    PROFILES ||--o{ SUPPORT_TICKETS : abre
    OPERATIONS o|--o{ SUPPORT_TICKETS : vinculo_opcional
    SUPPORT_TICKETS ||--o{ SUPPORT_MESSAGES : contiene
    PROFILES ||--o{ SUPPORT_MESSAGES : envia
    PROFILES o|--o{ AUDIT_LOGS : actor
```

`STORAGE_OBJECTS` representa `storage.objects`; las restantes tablas están en `public`. `documents` posee un CHECK que exige **exactamente un destino** entre cargo_id, operation_id y operator_id. La opcionalidad dibujada para cada destino no permite que falten los tres. Su `replaces_id` conserva el historial. `document_objects` tiene object_id PK, document_id único y FK diferida, storage_path único y hash SHA-256 cuando está disponible. Un documento histórico sin vínculo confiable no se supone descargable.

`conversation_reads` tiene PK compuesta operación/usuario; no existe una tabla adicional de chats. `audit_logs.entity_id` es un identificador genérico sin FK polimórfica a cada entidad: por eso no se dibujan relaciones SQL inexistentes. Se omiten del gráfico columnas y referencias auxiliares de adjuntos, no su existencia en las migraciones.

## Restricciones que afectan el análisis

1. Una carga tiene como máximo una operación y una propuesta aceptada no puede respaldar dos operaciones: claves únicas en `operations`.
2. Solo una oferta submitted/accepted por carga y operador; revisión única por quote_group_id/revision; términos presentados sellados.
3. Snapshot `complete` requiere content no nulo; `requires_review` conserva content nulo. La migración no inventa contratos históricos.
4. Reserva única por operación y clave idempotente; evento de liberación único. Reservas desconocidas conservan capital nulo y estado requiere revisión.
5. Capital aprobado ≤ declarado; importes no negativos y finitos. Peso/volumen opcionales de los límites usan null como ausencia de tope, no como cero.
6. `ratings` permite un autor por operación, puntaje de 1 a 5 y contraparte válida al completar, mediante restricciones y RLS.
7. `phase` de operación es la máquina canónica; `status` de carga/operación es una proyección histórica de menor detalle. No son dos flujos independientes.
8. Los nombres heredados `total_usd`/`amount_usd` no autorizan convertir ni sumar monedas; payment_currency/contract_currency/currency conservan la unidad contractual.

## Fuentes y alcance de verificación

Fuentes: [0001](../../supabase/migrations/0001_initial_schema.sql), [0010](../../supabase/migrations/0010_operator_panel_model.sql), [0015](../../supabase/migrations/0015_document_gateway.sql), [0016](../../supabase/migrations/0016_operation_contract.sql), [0017](../../supabase/migrations/0017_commercial_profiles.sql), [0018](../../supabase/migrations/0018_normalized_quotes.sql), [0019](../../supabase/migrations/0019_marketplace_snapshot.sql), [0020](../../supabase/migrations/0020_capacity_model.sql), [0021](../../supabase/migrations/0021_capacity_quote_contract.sql) y [0022](../../supabase/migrations/0022_capacity_workflows.sql). Las migraciones intermedias de seguridad también integran el resultado acumulado.

La estructura está implementada localmente. No se afirma que Supabase remoto tenga ya aplicadas 0020–0022. La cardinalidad física puede permitir ausencia de una fila que la RPC exige al crear una operación nueva; el diagrama no reemplaza esos invariantes transaccionales.
