import { TrackingView } from "../../features/importer/views";
import { phaseLabels } from "@4pack/domain";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  loadOwnRating,
  rateCompletedOperator,
  operationEvidenceUrl,
  confirmDelivery,
  loadOperationDetail,
  sendOperationMessage,
  simulateGuarantee,
  type MobileOperationDetail,
} from "../../lib/dashboard";

const guaranteeLabels = {
  pending: "Pendiente de confirmación",
  proof_uploaded: "Comprobante cargado",
  verified: "Verificada",
  held_simulated: "Confirmada · simulación académica",
  released_simulated: "Liberada · simulación académica",
  rejected: "Rechazada",
};

export default function OperationDetailScreen() {
  const params = useLocalSearchParams<{ operationId: string }>();
  const operationId = Array.isArray(params.operationId)
    ? params.operationId[0]
    : params.operationId;
  const [operation, setOperation] = useState<MobileOperationDetail | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState<{ id: string } | null>(null);
  const [score, setScore] = useState(5),
    [comment, setComment] = useState("");
  const [showMessages, setShowMessages] = useState(false);
  async function openEvidence(id: string) {
    try {
      await Linking.openURL(await operationEvidenceUrl(id));
    } catch {
      setError("No se pudo abrir la evidencia autorizada.");
    }
  }
  async function sendRating() {
    setActionLoading(true);
    try {
      await rateCompletedOperator(operationId, score, comment);
      await refresh(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo evaluar.");
    } finally {
      setActionLoading(false);
    }
  }
  const [message, setMessage] = useState("");

  const refresh = useCallback(
    async (silent = false) => {
      if (!operationId) return;
      if (!silent) setLoading(true);
      setError("");
      try {
        setOperation(await loadOperationDetail(operationId));
        setRating(await loadOwnRating(operationId));
      } catch {
        setError("No pudimos cargar la operación.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [operationId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runGuarantee() {
    if (!operationId) return;
    setActionLoading(true);
    setError("");
    try {
      await simulateGuarantee(operationId);
      await refresh(true);
    } catch {
      setError("No pudimos confirmar la garantía. Revisá el estado actual.");
    } finally {
      setActionLoading(false);
    }
  }

  async function runNextStep() {
    if (!operationId || !operation) return;
    if (
      operation.role !== "importer" ||
      operation.phase !== "awaiting_delivery_confirmation"
    )
      return;
    setActionLoading(true);
    setError("");
    try {
      await confirmDelivery(operationId);
      await refresh(true);
    } catch {
      setError(
        "No pudimos registrar el hito. La garantía debe estar confirmada y el estado debe ser válido.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function sendMessage() {
    if (!operationId || !message.trim()) {
      setError("Escribí un mensaje antes de enviarlo.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await sendOperationMessage(operationId, message.trim());
      setMessage("");
      await refresh(true);
    } catch {
      setError("No pudimos enviar el mensaje.");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <TrackingView
        operation={operation}
        rating={rating}
        score={score}
        comment={comment}
        onScore={setScore}
        onComment={setComment}
        busy={actionLoading}
        error={error}
        onGuarantee={() => void runGuarantee()}
        onComplete={() =>
          Alert.alert(
            "Confirmar entrega",
            "Finaliza la operacion y libera la garantia simulada.",
            [
              { text: "Volver", style: "cancel" },
              {
                text: "Confirmar recepcion",
                onPress: () => void runNextStep(),
              },
            ],
          )
        }
        onRate={() => void sendRating()}
        onEvidence={(id) => void openEvidence(id)}
        message={message}
        onMessage={setMessage}
        onSend={() => void sendMessage()}
        onRefresh={() => void refresh(true)}
        onBack={() => router.back()}
      />
    </>
  );
}
