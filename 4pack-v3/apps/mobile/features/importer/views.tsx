import { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { phaseLabels, type TransportMode } from "@4pack/domain";
import type {
  MobileOperation,
  MobileOperationDetail,
  MobileCargoDetail,
  MobileCargo,
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
import { JourneyMap } from "./journey-map";
import { homeAction, categories } from "../../lib/journey";
export function HomeView({
  operation,
  loading,
  error,
  onNew,
  onTrack,
  cargo = null,
  onOffers,
  lastMilestone,
}: {
  operation: MobileOperation | null;
  loading?: boolean;
  error?: string;
  onNew: () => void;
  onTrack: () => void;
  cargo?: MobileCargo | null;
  onOffers?: () => void;
  lastMilestone?: { title: string; location: string } | null;
}) {
  const action = homeAction(operation, cargo);
  const current = action.kind === "offers" ? cargo : operation;
  return (
    <Page
      title="Tu carga, en movimiento."
      subtitle="Una vista clara de lo que sigue."
      error={error}
      loading={loading}
    >
      <JourneyMap
        route={current?.route}
        lastMilestone={action.kind === "tracking" ? lastMilestone : null}
      />
      <Card>
        <Copy muted style={{ fontSize: 10, letterSpacing: 1.4 }}>
          TU PRÓXIMO PASO
        </Copy>
        {current ? (
          <>
            <Copy style={s.section}>{current.title}</Copy>
            <Copy muted>{current.route}</Copy>
          </>
        ) : (
          <>
            <Copy style={s.section}>Todo listo para empezar</Copy>
            <Copy muted>
              Publicá qué querés importar. Vas a poder comparar propuestas antes
              de elegir.
            </Copy>
          </>
        )}
        {action.kind === "tracking" && operation && (
          <Tag>{phaseLabels[operation.phase]}</Tag>
        )}
        {action.kind === "offers" && cargo && (
          <Copy muted>
            {cargo.offerCount ?? 0} propuestas ·{" "}
            {cargo.volumeM3 === null
              ? "Volumen por confirmar"
              : "Listo para comparar"}
          </Copy>
        )}
        <Action
          label={action.label}
          icon={action.kind === "publish" ? "add" : "arrow-forward"}
          onPress={
            action.kind === "publish"
              ? onNew
              : action.kind === "offers"
                ? (onOffers ?? onNew)
                : onTrack
          }
        />
      </Card>
      {current && <LinkAction label="Publicar otra carga" onPress={onNew} />}
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
  volumeUnknown = false,
  onVolumeUnknown,
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
  volumeUnknown?: boolean;
  onVolumeUnknown?: (value: boolean) => void;
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
          (volumeUnknown || Number(fields.volume.replace(",", ".")) > 0) &&
          (fields.category !== "Otro" ||
            fields.description.trim().length >= 10) &&
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
      centered
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
            <Copy muted>Tipo de mercadería</Copy>
            <CategorySelector
              value={fields.category}
              onChange={(value) => onChange("category", value)}
            />
            {input(
              "description",
              fields.category === "Otro"
                ? "Descripción de la mercadería"
                : "Descripción",
            )}
            {fields.category === "Otro" && (
              <Copy muted style={{ fontSize: 12 }}>
                Contanos qué es, de qué material está hecho y cuántas unidades
                querés traer.
              </Copy>
            )}
            {input("weight", "Peso (kg)", true)}
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityLabel="No sé el volumen"
              accessibilityState={{ checked: volumeUnknown }}
              onPress={() => onVolumeUnknown?.(!volumeUnknown)}
              style={[s.row, { justifyContent: "flex-start", minHeight: 48 }]}
            >
              <Ionicons
                name={volumeUnknown ? "checkbox" : "square-outline"}
                color={colors.text}
                size={24}
              />
              <Copy>No sé el volumen</Copy>
            </TouchableOpacity>
            {!volumeUnknown ? (
              input("volume", "Volumen (m³)", true)
            ) : (
              <Copy muted>
                Se guarda como desconocido. El operador propone el volumen y vos
                lo confirmás antes de contratar.
              </Copy>
            )}
            <Field
              label="Valor FOB"
              suffix="USD"
              number
              value={fields.fob}
              onChange={(value) => onChange("fob", value)}
            />
            <Copy muted>Modalidad preferida</Copy>
            <View
              style={[
                s.row,
                { flexWrap: "wrap", justifyContent: "flex-start" },
              ]}
            >
              {(
                [
                  [
                    "air",
                    "Aéreo",
                    "Para priorizar rapidez. Ejemplo orientativo: 7 días, sujeto a ruta y operador.",
                  ],
                  [
                    "sea",
                    "Marítimo",
                    "Para mayor volumen y menor urgencia. Ejemplo orientativo: 30 días, sujeto a ruta y operador.",
                  ],
                  [
                    "consolidated",
                    "Consolidado",
                    "Para cargas pequeñas que comparten espacio. Salidas según disponibilidad.",
                  ],
                ] as const
              ).map(([value, label, detail]) => (
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
                      value === mode ? "#F2F2EF10" : colors.secondary,
                    width: "100%",
                  }}
                >
                  <Copy
                    style={{
                      color: value === mode ? colors.brand : colors.text,
                    }}
                  >
                    {label}
                  </Copy>
                  <Copy muted style={{ fontSize: 12, marginTop: 4 }}>
                    {detail}
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
              {fields.weight} kg ·{" "}
              {volumeUnknown ? "Volumen desconocido" : `${fields.volume} m³`} ·
              FOB USD {fields.fob}
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
function CategorySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Action
        secondary
        label={value || "Elegí una categoría"}
        icon={open ? "chevron-up" : "chevron-down"}
        onPress={() => setOpen(!open)}
      />
      {open &&
        categories.map((category) => (
          <TouchableOpacity
            key={category}
            accessibilityRole="radio"
            accessibilityLabel={category}
            accessibilityState={{ selected: value === category }}
            onPress={() => {
              onChange(category);
              setOpen(false);
            }}
            style={{
              minHeight: 48,
              padding: 13,
              borderRadius: 10,
              backgroundColor:
                value === category ? colors.secondary : colors.bg,
            }}
          >
            <Copy>{category}</Copy>
          </TouchableOpacity>
        ))}
    </View>
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
  onConfirmVolume,
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
  onConfirmVolume?: (proposalId: string, volume: number) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [details, setDetails] = useState<string | null>(null);
  const [selectedVolume, setSelectedVolume] = useState<{
    id: string;
    volumeM3: number;
  } | null>(null);
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
      {cargo?.volumeM3 === null && (
        <Card>
          <Tag tone="yellow">Volumen por confirmar</Tag>
          <Copy>
            El operador propone el volumen. Confirmalo antes de elegir una
            oferta; todavía no se reserva Capacity.
          </Copy>
          {cargo.volumeProposals
            ?.filter((p) => p.status === "proposed")
            .map((p, i) => (
              <LinkAction
                key={p.id}
                label={`${selectedVolume?.id === p.id ? "Seleccionado" : "Elegir propuesta de volumen"} · ${p.volumeM3.toLocaleString("es-AR")} m³ · propuesta ${i + 1}`}
                onPress={() => setSelectedVolume(p)}
              />
            ))}
          {!cargo.volumeProposals?.some((p) => p.status === "proposed") && (
            <Copy muted>Esperando una propuesta de volumen del operador.</Copy>
          )}
        </Card>
      )}
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
          o.capitalBacked === true &&
          o.status === "submitted" &&
          o.currency === "ARS" &&
          Date.parse(o.validUntil) > Date.now();
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
                  {eligible ? "Capital reservado" : "No disponible"}
                </Tag>
              </View>
              {!eligible && (
                <Copy muted>{o.backingReason ?? "Respaldo no verificado"}</Copy>
              )}
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
      {cargo && (
        <>
          <LinkAction
            label="Ver datos de mi carga"
            onPress={() => setDetails(details === "cargo" ? null : "cargo")}
          />
          {details === "cargo" && (
            <Card>
              <Copy>{cargo.description}</Copy>
              <Copy>
                {cargo.category} · {cargo.weightKg} kg ·{" "}
                {cargo.volumeM3 === null
                  ? "Volumen desconocido"
                  : `${cargo.volumeM3} m³`}
              </Copy>
              <Copy>FOB USD {cargo.fobUsd.toLocaleString("es-AR")}</Copy>
              {cargo.msdsRequired && <Tag tone="yellow">MSDS requerido</Tag>}
            </Card>
          )}
        </>
      )}
      {operationId ? (
        <Action label="Ir al seguimiento" onPress={onTrack} />
      ) : cargo?.volumeM3 === null ? (
        <Action
          label={
            busy ? "Confirmando volumen…" : "Confirmar volumen seleccionado"
          }
          disabled={busy || !selectedVolume}
          onPress={() =>
            selectedVolume &&
            onConfirmVolume?.(selectedVolume.id, selectedVolume.volumeM3)
          }
        />
      ) : (
        <Action
          label={busy ? "Confirmando…" : "Elegir esta oferta"}
          disabled={
            !selected ||
            busy ||
            offers.find((o) => o.id === selected)?.currency !== "ARS"
          }
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
  onPaymentSync,
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
  onPaymentSync?: () => void;
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
      ? o.paymentMode === "mercado_pago_test"
        ? "Completá el checkout de prueba y verificá el resultado con Mercado Pago."
        : "Confirmá la garantía simulada para iniciar el servicio."
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
            {o.paymentMode === "mercado_pago_test" && (
              <>
                <Tag tone={o.paymentStatus === "approved" ? "green" : "yellow"}>
                  Mercado Pago · PRUEBA ·{" "}
                  {o.paymentStatus === "approved"
                    ? "Aprobado"
                    : o.paymentStatus === "rejected"
                      ? "Rechazado"
                      : (o.paymentStatus ?? "Pendiente")}
                </Tag>
                <Copy muted>
                  Sin dinero real. El retorno del checkout no confirma el pago.
                  La liberación por entrega continúa siendo una simulación
                  académica.
                </Copy>
                <LinkAction
                  label="Verificar pago con Mercado Pago"
                  onPress={onPaymentSync ?? onRefresh}
                />
              </>
            )}
            {o.guaranteeStatus === "pending" && o.role === "importer" ? (
              <>
                <Tag tone="yellow">Garantía pendiente</Tag>
                <Copy muted>
                  {o.currency} {o.guaranteeAmountUsd.toLocaleString("es-AR")} ·
                  Simulación académica, sin fondos reales.
                </Copy>
                <Action
                  label={
                    o.paymentMode === "mercado_pago_test"
                      ? "Pagar con Mercado Pago · prueba"
                      : "Confirmar garantía simulada"
                  }
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
                <Action
                  secondary={tab !== "Hitos"}
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
                onChange={(text) => onMessage(text.slice(0, 2000))}
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
                  : {
                      pending: "pendiente",
                      proof_uploaded: "comprobante cargado",
                      verified: "verificada",
                      rejected: "rechazada",
                    }[o.guaranteeStatus]}
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
