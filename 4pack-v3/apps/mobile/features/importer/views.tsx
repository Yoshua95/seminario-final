import { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { phaseLabels, type TransportMode } from "@4pack/domain";
import type {
  MobileOperation,
  MobileOperationDetail,
  MobileCargoDetail,
} from "../../lib/dashboard";
import {
  compareImporterOffers,
  type ImporterOffer,
} from "../../lib/importer-flow";
import {
  Page,
  Card,
  Copy,
  Action,
  Field,
  Tag,
  LinkAction,
  colors,
  s,
} from "./ui";
export function HomeView({
  operation,
  loading,
  error,
  onNew,
  onTrack,
}: {
  operation: MobileOperation | null;
  loading?: boolean;
  error?: string;
  onNew: () => void;
  onTrack: () => void;
}) {
  return (
    <Page
      title="Tu próxima carga empieza acá."
      subtitle="Publicá, compará y seguí tu operación."
      error={error}
      loading={loading}
    >
      <Action label="Nueva carga" icon="add" onPress={onNew} />
      {operation ? (
        <>
          <Copy style={s.section}>En curso</Copy>
          <Card>
            <Tag>{phaseLabels[operation.phase]}</Tag>
            <Copy style={s.section}>{operation.title}</Copy>
            <Copy muted>{operation.route}</Copy>
            <View style={s.divider} />
            <LinkAction label="Ir al seguimiento" onPress={onTrack} />
          </Card>
        </>
      ) : (
        !loading && (
          <Card>
            <Ionicons name="cube-outline" color={colors.brand} size={28} />
            <Copy style={s.section}>Todo listo para empezar</Copy>
            <Copy muted>
              Cuando contrates un servicio, vas a ver su avance acá.
            </Copy>
          </Card>
        )
      )}
      <Card>
        <Copy style={s.section}>Vos elegís cómo seguir</Copy>
        <Copy muted>
          Recibí propuestas privadas y revisá precio, plazo y alcance antes de
          decidir.
        </Copy>
      </Card>
    </Page>
  );
}
export type CargoFields = {
  title: string;
  description: string;
  origin: string;
  destination: string;
  category: string;
  weight: string;
  volume: string;
  fob: string;
};
export function CargoFormView({
  fields,
  onChange,
  mode,
  onMode,
  requiresMsds,
  fileName,
  onPick,
  onPublish,
  loading,
  error,
  onBack,
}: {
  fields: CargoFields;
  onChange: (key: keyof CargoFields, value: string) => void;
  mode: TransportMode;
  onMode: (mode: TransportMode) => void;
  requiresMsds: boolean;
  fileName?: string;
  onPick: () => void;
  onPublish: () => void;
  loading: boolean;
  error: string;
  onBack: () => void;
}) {
  const [step, setStep] = useState(0),
    [localError, setLocalError] = useState("");
  const input = (key: keyof CargoFields, label: string, number = false) => (
    <Field
      key={key}
      label={label}
      value={fields[key]}
      onChange={(value) => onChange(key, value)}
      number={number}
      multiline={key === "description"}
    />
  );
  function next() {
    const valid =
      step === 0
        ? [fields.title, fields.origin, fields.destination].every(
            (v) => v.trim().length >= 2,
          )
        : [fields.description, fields.category].every(
            (v) => v.trim().length >= 2,
          ) &&
          Number(fields.weight.replace(",", ".")) > 0 &&
          Number(fields.volume.replace(",", ".")) > 0 &&
          fields.fob.trim() !== "" &&
          Number(fields.fob.replace(",", ".")) >= 0;
    if (!valid) {
      setLocalError("Completá los datos de este paso con valores válidos.");
      return;
    }
    setLocalError("");
    setStep(step + 1);
  }
  return (
    <Page
      key={step}
      title="Nueva carga"
      kicker={`PUBLICAR · PASO ${step + 1} DE 3`}
      subtitle={
        [
          "Primero, contanos qué querés traer.",
          "Dimensiones y condiciones de tu mercadería.",
          "Revisá tu carga antes de publicarla.",
        ][step]
      }
      error={localError || error}
      back={() => (step > 0 ? setStep(step - 1) : onBack())}
    >
      <View style={[s.row, { gap: 6 }]}>
        {[0, 1, 2].map((n) => (
          <View
            key={n}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: n <= step ? colors.brand : colors.line,
            }}
          />
        ))}
      </View>
      <Card>
        {step === 0 ? (
          <>
            {input("title", "¿Qué vas a importar?")}
            {input("origin", "Origen")}
            {input("destination", "Destino")}
          </>
        ) : step === 1 ? (
          <>
            {input("description", "Descripción")}
            {input("category", "Categoría")}
            {input("weight", "Peso (kg)", true)}
            {input("volume", "Volumen (m³)", true)}
            {input("fob", "Valor FOB (USD)", true)}
            <Copy muted>Modalidad preferida</Copy>
            <View
              style={[
                s.row,
                { flexWrap: "wrap", justifyContent: "flex-start" },
              ]}
            >
              {(
                [
                  ["air", "Aéreo"],
                  ["sea", "Marítimo"],
                  ["consolidated", "Consolidado"],
                ] as const
              ).map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: value === mode }}
                  onPress={() => onMode(value)}
                  style={{
                    minHeight: 44,
                    padding: 12,
                    borderRadius: 9,
                    borderWidth: 1,
                    borderColor: value === mode ? colors.brand : colors.line,
                    backgroundColor:
                      value === mode ? "#ff762e15" : colors.secondary,
                  }}
                >
                  <Copy
                    style={{
                      color: value === mode ? colors.brand : colors.text,
                    }}
                  >
                    {label}
                  </Copy>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <Tag tone={requiresMsds ? "yellow" : "green"}>
              {requiresMsds ? "Requiere MSDS" : "Carga general"}
            </Tag>
            <Copy style={s.section}>{fields.title}</Copy>
            <Copy muted>
              {fields.origin} → {fields.destination}
            </Copy>
            <Copy>
              {fields.weight} kg · {fields.volume} m³ · FOB USD {fields.fob}
            </Copy>
            <View style={s.divider} />
            {requiresMsds ? (
              <>
                <Copy style={s.section}>Ficha MSDS</Copy>
                <Copy muted>
                  Adjuntá el PDF de esta mercadería. Hasta 10 MB; obligatorio
                  antes de publicar.
                </Copy>
                <Action
                  label={fileName ?? "Seleccionar PDF MSDS"}
                  secondary
                  icon="document-attach-outline"
                  onPress={onPick}
                />
              </>
            ) : (
              <Copy muted>
                No detectamos requisitos HAZMAT. No necesitás adjuntar MSDS para
                esta carga.
              </Copy>
            )}
            <Copy muted>
              Los operadores aprobados podrán cotizar durante siete días.
            </Copy>
          </>
        )}
      </Card>
      <Action
        label={
          loading ? "Publicando…" : step === 2 ? "Publicar carga" : "Continuar"
        }
        onPress={step === 2 ? onPublish : next}
        disabled={loading || (step === 2 && requiresMsds && !fileName)}
      />
    </Page>
  );
}
export function OffersView({
  cargo,
  onRefresh,
  title,
  route,
  offers,
  operationId,
  loading,
  busy,
  error,
  onAward,
  onTrack,
  onBack,
}: {
  cargo?: MobileCargoDetail | null;
  onRefresh?: () => void;
  title: string;
  route: string;
  offers: ImporterOffer[];
  operationId?: string;
  loading?: boolean;
  busy: boolean;
  error: string;
  onAward: (id: string) => void;
  onTrack: () => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [details, setDetails] = useState<string | null>(null);
  return (
    <Page
      title="Elegí tu propuesta"
      onRefresh={onRefresh}
      kicker="OFERTAS PRIVADAS"
      subtitle={`${title} · ${route}`}
      loading={loading}
      error={error}
      back={onBack}
    >
      {compareImporterOffers(offers) && (
        <Card>
          <Tag tone="yellow">Compará el alcance</Tag>
          <Copy>
            Estas ofertas tienen monedas o condiciones diferentes. Los precios
            no son equivalentes.
          </Copy>
        </Card>
      )}
      {!offers.length && !loading && (
        <Card>
          <Copy>
            Todavía no recibiste ofertas. Volvé a actualizar en unos minutos.
          </Copy>
        </Card>
      )}
      {offers.map((o, i) => {
        const eligible =
          o.status === "submitted" && Date.parse(o.validUntil) > Date.now();
        return (
          <View
            key={o.id}
            style={{
              borderWidth: 1,
              borderRadius: 15,
              borderColor: selected === o.id ? colors.brand : "transparent",
            }}
          >
            <Card>
              <View style={s.row}>
                <Copy muted>PROPUESTA {String(i + 1).padStart(2, "0")}</Copy>
                <Tag tone={eligible ? "green" : "yellow"}>
                  {eligible ? "Disponible" : "No disponible"}
                </Tag>
              </View>
              <Copy style={s.price}>
                {o.currency} {o.amount.toLocaleString("es-AR")}
              </Copy>
              <Copy>{o.days} días estimados</Copy>
              <Copy muted>
                {o.quote?.scope ?? "Consultá los términos de esta propuesta."}
              </Copy>
              <LinkAction
                label={
                  details === o.id
                    ? "Ocultar condiciones"
                    : "Ver inclusiones y condiciones"
                }
                onPress={() => setDetails(details === o.id ? null : o.id)}
              />
              {details === o.id && (
                <>
                  <View style={s.divider} />
                  <Copy>Incluye: {o.quote?.included.join(", ")}</Copy>
                  <Copy>Excluye: {o.quote?.excluded.join(", ")}</Copy>
                  <Copy>Seguro: {o.quote?.insurance}</Copy>
                  <Copy>Pago: {o.quote?.payment_terms}</Copy>
                  <Copy>
                    Documentación: {o.quote?.required_documents.join(", ")}
                  </Copy>
                  <Copy>Responsabilidades: {o.quote?.responsibilities}</Copy>
                  <Copy>Observaciones: {o.quote?.observations}</Copy>
                  <Copy muted>
                    Vigencia: {new Date(o.validUntil).toLocaleString("es-AR")}
                  </Copy>
                </>
              )}
              {!operationId && (
                <Action
                  label={
                    selected === o.id
                      ? "Propuesta seleccionada"
                      : "Seleccionar propuesta"
                  }
                  secondary
                  disabled={!eligible || busy}
                  icon={
                    selected === o.id ? "checkmark-circle" : "ellipse-outline"
                  }
                  onPress={() => setSelected(o.id)}
                />
              )}
            </Card>
          </View>
        );
      })}
      {cargo && <><LinkAction label="Ver datos de mi carga" onPress={()=>setDetails(details==="cargo"?null:"cargo")}/>{details==="cargo"&&<Card><Copy>{cargo.description}</Copy><Copy>{cargo.category} · {cargo.weightKg} kg · {cargo.volumeM3} m³</Copy><Copy>FOB USD {cargo.fobUsd.toLocaleString("es-AR")}</Copy>{cargo.msdsRequired&&<Tag tone="yellow">MSDS requerido</Tag>}</Card>}</>}
      {operationId ? (
        <Action label="Ir al seguimiento" onPress={onTrack} />
      ) : (
        <Action
          label={busy ? "Confirmando…" : "Elegir esta oferta"}
          disabled={!selected || busy}
          onPress={() => selected && onAward(selected)}
        />
      )}
      <Copy muted>
        La decisión es tuya. Confirmar crea una operación; la garantía se
        confirma en el siguiente paso.
      </Copy>
    </Page>
  );
}
export function TrackingView({
  operation,
  rating,
  score,
  comment,
  onScore,
  onComment,
  busy,
  error,
  onGuarantee,
  onComplete,
  onRate,
  onEvidence,
  message,
  onMessage,
  onSend,
  onRefresh,
  onBack,
}: {
  operation: MobileOperationDetail | null;
  rating: { id: string } | null;
  score: number;
  comment: string;
  onScore: (n: number) => void;
  onComment: (s: string) => void;
  busy: boolean;
  error: string;
  onGuarantee: () => void;
  onComplete: () => void;
  onRate: () => void;
  onEvidence: (id: string) => void;
  message: string;
  onMessage: (s: string) => void;
  onSend: () => void;
  onRefresh: () => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState("Hitos");
  const o = operation;
  const next = !o
    ? "Cargando operación"
    : o.guaranteeStatus === "pending"
      ? "Confirmá la garantía simulada para iniciar el servicio."
      : o.phase === "awaiting_delivery_confirmation"
        ? "Tu carga está lista. Confirmá que la recibiste."
        : o.phase === "completed"
          ? rating
            ? "Tu operación está cerrada y evaluada."
            : "La entrega está confirmada. Contanos cómo fue el servicio."
          : o.phase === "disputed"
            ? "Hay una controversia en revisión. Consultá los mensajes de la operación."
            : "El operador registra el avance. Acá vas a encontrar cada actualización.";
  return (
    <Page
      title="Seguimiento"
      onRefresh={onRefresh}
      subtitle={o?.title}
      kicker="MI OPERACIÓN"
      error={error}
      back={onBack}
    >
      {!o ? (
        <Copy muted>Cargando seguimiento…</Copy>
      ) : (
        <>
          <Card>
            <Tag tone={o.phase === "disputed" ? "yellow" : "green"}>
              {phaseLabels[o.phase]}
            </Tag>
            <Copy style={s.section}>Tu próximo paso</Copy>
            <Copy>{next}</Copy>
            <Copy muted>{o.route}</Copy>
            {o.guaranteeStatus === "pending" && o.role === "importer" ? (
              <>
                <Tag tone="yellow">Garantía pendiente</Tag>
                <Copy muted>
                  {o.currency} {o.guaranteeAmountUsd.toLocaleString("es-AR")} ·
                  Simulación académica, sin fondos reales.
                </Copy>
                <Action
                  label="Confirmar garantía simulada"
                  disabled={busy}
                  onPress={onGuarantee}
                />
              </>
            ) : o.phase === "awaiting_delivery_confirmation" &&
              o.role === "importer" ? (
              <Action
                label="Confirmar entrega"
                disabled={busy || o.guaranteeStatus !== "held_simulated"}
                onPress={onComplete}
              />
            ) : (
              o.phase !== "completed" && (
                <LinkAction
                  label="Actualizar seguimiento"
                  onPress={onRefresh}
                />
              )
            )}
          </Card>
          {o.phase === "completed" && !rating && (
            <Card>
              <Copy style={s.section}>Evaluar al operador</Copy>
              <View style={s.row}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    accessibilityRole="radio"
                    accessibilityLabel={`${n} estrellas`}
                    accessibilityState={{ selected: score === n }}
                    onPress={() => onScore(n)}
                    style={{ padding: 10 }}
                  >
                    <Ionicons
                      name={n <= score ? "star" : "star-outline"}
                      size={26}
                      color={colors.brand}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Field
                label="Comentario (opcional, hasta 500 caracteres)"
                value={comment}
                onChange={(text) => onComment(text.slice(0, 500))}
                multiline
              />
              <Action
                label="Enviar evaluación"
                disabled={busy}
                onPress={onRate}
              />
            </Card>
          )}
          <View style={s.row}>
            {["Hitos", "Evidencia", "Mensajes"].map((t) => (
              <TouchableOpacity
                key={t}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
                onPress={() => setTab(t)}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderBottomWidth: 2,
                  borderBottomColor: tab === t ? colors.brand : colors.line,
                }}
              >
                <Copy
                  style={{
                    textAlign: "center",
                    color: tab === t ? colors.brand : colors.muted,
                  }}
                >
                  {t}
                </Copy>
              </TouchableOpacity>
            ))}
          </View>
          {tab === "Hitos" ? (
            <Card>
              {o.events.length === 0 && (
                <Copy muted>El operador todavía no registró hitos.</Copy>
              )}
              {o.events.map((e) => (
                <View
                  key={e.id}
                  style={{
                    gap: 7,
                    borderLeftWidth: 2,
                    borderLeftColor: colors.brand,
                    paddingLeft: 15,
                    paddingBottom: 16,
                  }}
                >
                  <Copy style={{ fontWeight: "600" }}>{e.title}</Copy>
                  <Copy muted>{e.description}</Copy>
                  <Copy muted style={{ fontSize: 11 }}>
                    {e.location} ·{" "}
                    {new Date(e.createdAt).toLocaleString("es-AR")}
                  </Copy>
                  {e.attachmentId && (
                    <LinkAction
                      label="Abrir evidencia"
                      onPress={() => onEvidence(e.attachmentId!)}
                    />
                  )}
                </View>
              ))}
            </Card>
          ) : tab === "Evidencia" ? (
            <Card>
              <Copy style={s.section}>Documentos del seguimiento</Copy>
              {o.events.filter((e) => e.attachmentId).length === 0 && (
                <Copy muted>No hay adjuntos en los hitos.</Copy>
              )}
              {o.events
                .filter((e) => e.attachmentId)
                .map((e) => (
                  <LinkAction
                    key={e.id}
                    label={e.title + " · Ver adjunto"}
                    onPress={() => onEvidence(e.attachmentId!)}
                  />
                ))}
            </Card>
          ) : (
            <Card>
              {o.messages.map((m) => (
                <View key={m.id} style={{ gap: 5, paddingBottom: 12 }}>
                  <Copy style={{ fontWeight: "600" }}>{m.senderName}</Copy>
                  <Copy>{m.body}</Copy>
                </View>
              ))}
              <Field
                label="Mensaje de la operación"
                value={message}
                onChange={text=>onMessage(text.slice(0,2000))}
                multiline
              />
              <Action
                label="Enviar mensaje"
                secondary
                disabled={busy || !message.trim()}
                onPress={onSend}
              />
            </Card>
          )}
          <Card>
            <Copy muted>Total contratado</Copy>
            <Copy style={s.section}>
              {o.currency} {o.totalUsd.toLocaleString("es-AR")}
            </Copy>
            <Copy muted>
              Garantía:{" "}
              {o.guaranteeStatus === "released_simulated"
                ? "liberada · simulación"
                : o.guaranteeStatus === "held_simulated"
                  ? "confirmada · simulación"
                  : ({pending:"pendiente",proof_uploaded:"comprobante cargado",verified:"verificada",rejected:"rechazada"}[o.guaranteeStatus])}
            </Copy>
            <Copy muted>
              Comisión: {o.currency} {o.commissionUsd.toLocaleString("es-AR")}
            </Copy>
          </Card>
        </>
      )}
    </Page>
  );
}
