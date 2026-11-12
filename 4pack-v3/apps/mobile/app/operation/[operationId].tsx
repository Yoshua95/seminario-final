import type { CargoStatus } from "@4pack/domain";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { advanceOperation, loadOperationDetail, sendOperationMessage, simulateGuarantee, type MobileOperationDetail } from "../../lib/dashboard";

const nextStep: Partial<Record<CargoStatus, { status: CargoStatus; label: string; title: string }>> = {
  awarded: { status: "in_transit", label: "Iniciar tránsito", title: "Carga en tránsito" },
  in_transit: { status: "customs", label: "Registrar aduana", title: "Carga en aduana" },
  customs: { status: "delivered", label: "Confirmar entrega", title: "Carga entregada" }
};

const statusLabels: Record<CargoStatus, string> = {
  draft: "Borrador", open: "Publicada", awarded: "Adjudicada", in_transit: "En tránsito", customs: "Aduana", delivered: "Entregada", cancelled: "Cancelada"
};

const guaranteeLabels = {
  pending: "Pendiente de confirmación",
  proof_uploaded: "Comprobante cargado",
  verified: "Verificada",
  held_simulated: "Confirmada · simulación académica",
  released_simulated: "Liberada · simulación académica",
  rejected: "Rechazada"
};

export default function OperationDetailScreen() {
  const params = useLocalSearchParams<{ operationId: string }>();
  const operationId = Array.isArray(params.operationId) ? params.operationId[0] : params.operationId;
  const [operation, setOperation] = useState<MobileOperationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async (silent = false) => {
    if (!operationId) return;
    if (!silent) setLoading(true);
    setError("");
    try { setOperation(await loadOperationDetail(operationId)); }
    catch { setError("No pudimos cargar la operación."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [operationId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function runGuarantee() {
    if (!operationId) return;
    setActionLoading(true); setError("");
    try { await simulateGuarantee(operationId); await refresh(true); }
    catch { setError("No pudimos confirmar la garantía. Revisá el estado actual."); }
    finally { setActionLoading(false); }
  }

  async function runNextStep() {
    if (!operationId || !operation) return;
    const step = nextStep[operation.status];
    if (!step) return;
    setActionLoading(true); setError("");
    try { await advanceOperation(operationId, step.status, step.title, location.trim()); setLocation(""); await refresh(true); }
    catch { setError("No pudimos registrar el hito. La garantía debe estar confirmada y el estado debe ser válido."); }
    finally { setActionLoading(false); }
  }

  async function sendMessage() {
    if (!operationId || !message.trim()) { setError("Escribí un mensaje antes de enviarlo."); return; }
    setActionLoading(true); setError("");
    try { await sendOperationMessage(operationId, message.trim()); setMessage(""); await refresh(true); }
    catch { setError("No pudimos enviar el mensaje."); }
    finally { setActionLoading(false); }
  }

  const step = operation ? nextStep[operation.status] : undefined;
  return <SafeAreaView style={styles.safe}><Stack.Screen options={{ headerShown: true, title: "Operación", headerStyle: { backgroundColor: "#F5F6F8" }, headerShadowVisible: false }} /><ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void refresh(true); }} tintColor="#FF6B2C" />}>{loading ? <ActivityIndicator color="#FF6B2C" style={styles.loader} /> : null}{error ? <Text style={styles.error}>{error}</Text> : null}{operation ? <><View style={styles.headingRow}><View style={styles.headingCopy}><Text style={styles.kicker}>OPERACIÓN {operation.id.slice(0, 8).toUpperCase()}</Text><Text style={styles.title}>{operation.title}</Text><Text style={styles.route}>{operation.route}</Text></View><Text style={styles.status}>{statusLabels[operation.status]}</Text></View><View style={styles.summary}><View style={styles.summaryItem}><Text style={styles.summaryLabel}>TOTAL</Text><Text style={styles.summaryValue}>USD {operation.totalUsd.toLocaleString("es-AR")}</Text></View><View style={styles.summaryItem}><Text style={styles.summaryLabel}>MODALIDAD</Text><Text style={styles.summaryValue}>{operation.mode}</Text></View></View><View style={styles.card}><Text style={styles.sectionTitle}>Garantía de pago</Text><Text style={styles.guaranteeStatus}>{guaranteeLabels[operation.guaranteeStatus]}</Text><Text style={styles.muted}>Monto: USD {operation.guaranteeAmountUsd.toLocaleString("es-AR")} · Comisión: USD {operation.commissionUsd.toLocaleString("es-AR")}</Text>{operation.role === "importer" && operation.guaranteeStatus === "pending" ? <><Text style={styles.academic}>Esta acción es una simulación académica y no mueve fondos reales.</Text><TouchableOpacity disabled={actionLoading} onPress={runGuarantee} style={styles.primary}><Text style={styles.primaryText}>{actionLoading ? "Confirmando…" : "Simular garantía de pago"}</Text></TouchableOpacity></> : null}</View>{operation.role === "operator" && step ? <View style={styles.card}><Text style={styles.sectionTitle}>Registrar próximo hito</Text><TextInput onChangeText={setLocation} placeholder="Ubicación del hito" placeholderTextColor="#8B8F98" style={styles.input} value={location} /><TouchableOpacity disabled={actionLoading || operation.guaranteeStatus !== "held_simulated"} onPress={runNextStep} style={[styles.primary, operation.guaranteeStatus !== "held_simulated" && styles.disabled]}><Text style={styles.primaryText}>{actionLoading ? "Actualizando…" : step.label}</Text></TouchableOpacity>{operation.guaranteeStatus !== "held_simulated" ? <Text style={styles.muted}>El importador debe confirmar primero la garantía simulada.</Text> : null}</View> : null}<View style={styles.card}><Text style={styles.sectionTitle}>Seguimiento</Text>{operation.events.map((event) => <View key={event.id} style={styles.event}><View style={styles.eventDot} /><View style={styles.eventBody}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.eventMeta}>{event.location} · {new Date(event.createdAt).toLocaleString("es-AR")}</Text><Text style={styles.eventDescription}>{event.description}</Text></View></View>)}</View><View style={styles.card}><Text style={styles.sectionTitle}>Mensajería</Text>{operation.messages.length === 0 ? <Text style={styles.muted}>Todavía no hay mensajes.</Text> : operation.messages.map((item) => <View key={item.id} style={styles.message}><View style={styles.messageHead}><Text style={styles.messageSender}>{item.senderName}</Text><Text style={styles.messageTime}>{new Date(item.createdAt).toLocaleString("es-AR")}</Text></View><Text style={styles.messageBody}>{item.body}</Text></View>)}<TextInput maxLength={2000} multiline onChangeText={setMessage} placeholder="Escribí un mensaje sobre la operación" placeholderTextColor="#8B8F98" style={[styles.input, styles.messageInput]} value={message} /><TouchableOpacity disabled={actionLoading} onPress={sendMessage} style={styles.secondary}><Text style={styles.secondaryText}>{actionLoading ? "Enviando…" : "Enviar mensaje"}</Text></TouchableOpacity></View></> : null}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#F5F6F8" }, container: { padding: 22, paddingBottom: 48 }, loader: { marginTop: 80 }, error: { color: "#991B1B", backgroundColor: "#FEECEC", padding: 13, borderRadius: 10, marginBottom: 14 }, headingRow: { flexDirection: "row", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }, headingCopy: { flex: 1 }, kicker: { color: "#FF6B2C", fontSize: 9, fontWeight: "900", letterSpacing: 1.3 }, title: { color: "#111318", fontSize: 28, lineHeight: 33, fontWeight: "900", marginTop: 8 }, route: { color: "#666B75", marginTop: 7 }, status: { color: "#166534", backgroundColor: "#EAF8EF", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, fontSize: 9, fontWeight: "900" }, summary: { flexDirection: "row", gap: 10, marginVertical: 20 }, summaryItem: { flex: 1, backgroundColor: "#111318", borderRadius: 14, padding: 15 }, summaryLabel: { color: "#8E929B", fontSize: 8, fontWeight: "900", letterSpacing: 1 }, summaryValue: { color: "white", fontSize: 13, fontWeight: "800", marginTop: 6, textTransform: "capitalize" }, card: { backgroundColor: "white", borderColor: "#E2E4E8", borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 14 }, sectionTitle: { color: "#111318", fontSize: 18, fontWeight: "900", marginBottom: 13 }, guaranteeStatus: { color: "#166534", fontSize: 13, fontWeight: "900" }, muted: { color: "#747984", fontSize: 11, lineHeight: 17, marginTop: 7 }, academic: { color: "#8B4B00", backgroundColor: "#FFF1DC", padding: 11, borderRadius: 9, fontSize: 11, lineHeight: 16, marginTop: 14 }, input: { backgroundColor: "#F7F7F8", borderColor: "#E1E2E6", borderWidth: 1, borderRadius: 10, color: "#111318", paddingHorizontal: 13, paddingVertical: 12 }, primary: { backgroundColor: "#FF6B2C", borderRadius: 10, alignItems: "center", padding: 14, marginTop: 14 }, primaryText: { color: "#2A1208", fontWeight: "900", fontSize: 12 }, disabled: { opacity: 0.45 }, event: { flexDirection: "row", gap: 11, paddingBottom: 18 }, eventDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF6B2C", marginTop: 4 }, eventBody: { flex: 1 }, eventTitle: { color: "#22252B", fontWeight: "900", fontSize: 13 }, eventMeta: { color: "#858993", fontSize: 9, marginTop: 4 }, eventDescription: { color: "#646973", fontSize: 11, lineHeight: 16, marginTop: 5 }, message: { backgroundColor: "#F6F7F8", borderRadius: 11, padding: 12, marginBottom: 9 }, messageHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, messageSender: { color: "#24272D", fontSize: 11, fontWeight: "900" }, messageTime: { color: "#8B8F98", fontSize: 8 }, messageBody: { color: "#555A64", fontSize: 12, lineHeight: 17, marginTop: 6 }, messageInput: { minHeight: 84, textAlignVertical: "top", marginTop: 12 }, secondary: { backgroundColor: "#111318", borderRadius: 10, alignItems: "center", padding: 14, marginTop: 10 }, secondaryText: { color: "white", fontWeight: "900", fontSize: 12 } });
