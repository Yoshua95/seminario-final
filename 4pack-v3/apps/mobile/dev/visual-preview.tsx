// Development-only fixture. Must be absent from production export (tested).
import { useState } from "react";
import { View, TouchableOpacity, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { requiresHazmatReview } from "@4pack/domain";
import type { MobileOperationDetail } from "../lib/dashboard";
import type { ImporterOffer } from "../lib/importer-flow";
import {
  HomeView,
  CargoFormView,
  OffersView,
  TrackingView,
  type CargoFields,
} from "../features/importer/views";
import { Copy, colors } from "../features/importer/ui";
const marker = "FOURPACK_VISUAL_FIXTURE_BLOCK04_ONLY";
const baseQuote = {
  mode: "sea" as const,
  services: ["international_transport"],
  scope: "Transporte marítimo consolidado",
  amount: "1250",
  currency: "USD" as const,
  included: ["Flete internacional", "Seguimiento"],
  excluded: ["Tributos de importación"],
  insurance: "Opcional, no incluido",
  estimated_days: "28",
  valid_until: "2026-12-15T12:00:00Z",
  payment_terms: "Garantía simulada al confirmar",
  required_documents: ["Factura comercial", "Packing list"],
  responsibilities: "El importador entrega la documentación comercial.",
  observations: "Propuesta ficticia para revisión visual.",
};
const offers: ImporterOffer[] = [
  {
    id: "visual-offer-1",
    operatorId: "visual-operator",
    amount: 1250,
    currency: "USD",
    days: 28,
    status: "submitted",
    validUntil: baseQuote.valid_until,
    quote: baseQuote as ImporterOffer["quote"],
  },
  {
    id: "visual-offer-2",
    operatorId: "visual-operator-2",
    amount: 1490,
    currency: "USD",
    days: 22,
    status: "submitted",
    validUntil: baseQuote.valid_until,
    quote: {
      ...baseQuote,
      amount: "1490",
      scope: "Servicio puerta a puerta",
      included: ["Flete internacional", "Entrega en domicilio"],
    } as ImporterOffer["quote"],
  },
];
const operation: MobileOperationDetail = {
  id: "visual-operation-04",
  title: "Repuestos para mi taller",
  route: "Shenzhen → Buenos Aires",
  phase: "in_progress",
  currency: "USD",
  status: "in_transit",
  role: "importer",
  mode: "sea",
  totalUsd: 1250,
  guaranteeAmountUsd: 1250,
  commissionUsd: 31.25,
  guaranteeStatus: "held_simulated",
  events: [
    {
      id: "visual-event-2",
      attachmentId: "visual-evidence",
      status: "in_transit",
      title: "Mercadería embarcada",
      description: "El operador confirmó la salida desde origen.",
      location: "Puerto de Shenzhen",
      createdAt: "2026-11-17T12:00:00Z",
    },
    {
      id: "visual-event-1",
      attachmentId: null,
      status: "awarded",
      title: "Servicio confirmado",
      description: "Garantía simulada confirmada. Comienza el seguimiento.",
      location: "Buenos Aires",
      createdAt: "2026-11-16T12:00:00Z",
    },
  ],
  messages: [
    {
      id: "visual-message",
      senderId: "visual-operator",
      senderName: "Operador ficticio",
      body: "La carga ya está en tránsito. Dejamos la constancia en el último hito.",
      createdAt: "2026-11-17T12:00:00Z",
    },
  ],
};
const initialFields: CargoFields = {
  title: operation.title,
  origin: "Shenzhen, China",
  destination: "Buenos Aires, Argentina",
  description: "Cajas de repuestos mecánicos para taller.",
  category: "Repuestos",
  weight: "96",
  volume: "2,18",
  fob: "8500",
};
export default function VisualPreview() {
  const [screen, setScreen] = useState("Inicio"),
    [fields, setFields] = useState<CargoFields>(initialFields);
  const [mode, setMode] = useState<"sea" | "air" | "consolidated">("sea"),
    [file, setFile] = useState<string>(),
    [phase, setPhase] = useState<MobileOperationDetail["phase"]>("in_progress");
  const [score, setScore] = useState(5),
    [comment, setComment] = useState(""),
    [message, setMessage] = useState(""),
    [rating, setRating] = useState<{ id: string } | null>(null);
  const notice = () =>
    Alert.alert(
      "Vista visual aislada",
      "Datos ficticios. No se envía información, no se autentica una cuenta ni se modifica el backend.",
    );
  const o = {
    ...operation,
    phase,
    guaranteeStatus:
      phase === "created"
        ? ("pending" as const)
        : phase === "completed"
          ? ("released_simulated" as const)
          : ("held_simulated" as const),
  };
  return (
    <View
      testID={marker}
      style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 28 }}
    >
      <View
        style={{
          backgroundColor: "#ff762e15",
          paddingHorizontal: 12,
          paddingVertical: 6,
        }}
      >
        <Copy
          style={{ fontSize: 10, textAlign: "center", color: colors.brand }}
        >
          REVISIÓN VISUAL · DATOS FICTICIOS · SIN BACKEND
        </Copy>
      </View>
      <View style={{ flex: 1 }}>
        {screen === "Inicio" ? (
          <HomeView
            operation={o}
            onNew={() => setScreen("Publicar")}
            onTrack={() => setScreen("Seguimiento")}
          />
        ) : screen === "Publicar" ? (
          <CargoFormView
            fields={fields}
            onChange={(key, value) => setFields({ ...fields, [key]: value })}
            mode={mode}
            onMode={setMode}
            requiresMsds={requiresHazmatReview(
              `${fields.title} ${fields.description} ${fields.category}`,
            )}
            fileName={file}
            onPick={() => {
              setFile("MSDS-ficticia.pdf");
              notice();
            }}
            onPublish={notice}
            loading={false}
            error=""
            onBack={() => setScreen("Inicio")}
          />
        ) : screen === "Ofertas" ? (
          <OffersView
            title={operation.title}
            route={operation.route}
            offers={offers}
            busy={false}
            error=""
            onAward={notice}
            onTrack={() => setScreen("Seguimiento")}
            onBack={() => setScreen("Inicio")}
          />
        ) : (
          <TrackingView
            operation={o}
            rating={rating}
            score={score}
            comment={comment}
            onScore={setScore}
            onComment={setComment}
            busy={false}
            error=""
            onGuarantee={notice}
            onComplete={notice}
            onRate={() => {
              setRating({ id: "visual-rating" });
              notice();
            }}
            onEvidence={notice}
            message={message}
            onMessage={setMessage}
            onSend={notice}
            onRefresh={notice}
            onBack={() => setScreen("Inicio")}
          />
        )}
      </View>
      {screen === "Seguimiento" && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            padding: 5,
          }}
        >
          {(
            [
              "created",
              "in_progress",
              "awaiting_delivery_confirmation",
              "completed",
            ] as const
          ).map((p, i) => (
            <TouchableOpacity
              key={p}
              accessibilityRole="button"
              accessibilityLabel={`Escenario ${i + 1}`}
              onPress={() => setPhase(p)}
              style={{ padding: 8 }}
            >
              <Copy
                style={{
                  fontSize: 10,
                  color: phase === p ? colors.brand : colors.muted,
                }}
              >
                Escenario {i + 1}
              </Copy>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingBottom: 26,
          paddingTop: 10,
        }}
      >
        {(
          [
            ["Inicio", "home-outline"],
            ["Publicar", "add-circle-outline"],
            ["Ofertas", "documents-outline"],
            ["Seguimiento", "navigate-outline"],
          ] as const
        ).map(([name, icon]) => (
          <TouchableOpacity
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: screen === name }}
            onPress={() => {
              if (name === "Inicio") {
                setPhase("in_progress");
                setFields(initialFields);
                setFile(undefined);
                setRating(null);
              }
              setScreen(name);
            }}
            style={{ flex: 1, alignItems: "center", gap: 4 }}
          >
            <Ionicons
              name={icon}
              size={22}
              color={screen === name ? colors.brand : colors.muted}
            />
            <Copy
              style={{
                fontSize: 10,
                color: screen === name ? colors.brand : colors.muted,
              }}
            >
              {name}
            </Copy>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
