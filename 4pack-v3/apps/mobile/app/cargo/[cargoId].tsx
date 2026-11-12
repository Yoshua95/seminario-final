import type { TransportMode } from "@4pack/domain";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { loadCargoDetail, loadCurrentProfile, submitOffer, type MobileCargoDetail, type MobileProfile } from "../../lib/dashboard";

const modeLabels: Record<TransportMode, string> = {
  air: "Aéreo",
  sea: "Marítimo",
  consolidated: "Consolidado"
};

function numberFrom(value: string) {
  return Number(value.replace(",", "."));
}

export default function CargoDetailScreen() {
  const params = useLocalSearchParams<{ cargoId: string }>();
  const cargoId = Array.isArray(params.cargoId) ? params.cargoId[0] : params.cargoId;
  const [cargo, setCargo] = useState<MobileCargoDetail | null>(null);
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState<TransportMode>("sea");
  const [freight, setFreight] = useState("");
  const [customs, setCustoms] = useState("0");
  const [otherCosts, setOtherCosts] = useState("0");
  const [days, setDays] = useState("");
  const [terms, setTerms] = useState("");
  const [includesCustoms, setIncludesCustoms] = useState(false);

  const refresh = useCallback(async () => {
    if (!cargoId) return;
    setLoading(true);
    setError("");
    try {
      const [cargoData, profileData] = await Promise.all([loadCargoDetail(cargoId), loadCurrentProfile()]);
      setCargo(cargoData);
      setProfile(profileData);
      if (cargoData?.preferredMode) setMode(cargoData.preferredMode);
    } catch {
      setError("No pudimos cargar esta licitación.");
    } finally {
      setLoading(false);
    }
  }, [cargoId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function sendOffer() {
    if (!cargoId) return;
    const freightUsd = numberFrom(freight);
    const customsUsd = numberFrom(customs);
    const otherCostsUsd = numberFrom(otherCosts);
    const estimatedDays = Number(days);
    if (![freightUsd, customsUsd, otherCostsUsd, estimatedDays].every(Number.isFinite) || freightUsd < 0 || customsUsd < 0 || otherCostsUsd < 0 || estimatedDays <= 0 || !terms.trim()) {
      setError("Completá costos, plazo y condiciones con valores válidos.");
      return;
    }

    setSending(true);
    setError("");
    setSuccess("");
    try {
      await submitOffer(cargoId, { mode, freightUsd, customsUsd, otherCostsUsd, estimatedDays, includesCustoms, terms: terms.trim() });
      setSuccess("Oferta enviada. El importador ya puede compararla.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error && cause.message.includes("aprobado") ? cause.message : "No pudimos enviar la oferta. Revisá los datos y el estado de la licitación.");
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: true, title: "Detalle de carga", headerStyle: { backgroundColor: "#F5F6F8" }, headerShadowVisible: false }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {loading ? <ActivityIndicator color="#FF6B2C" style={styles.loader} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
        {cargo ? <>
          <Text style={styles.kicker}>LICITACIÓN ABIERTA</Text>
          <Text style={styles.title}>{cargo.title}</Text>
          <Text style={styles.route}>{cargo.route}</Text>
          <View style={styles.card}>
            <Text style={styles.description}>{cargo.description}</Text>
            <View style={styles.metrics}>
              <View style={styles.metric}><Text style={styles.metricLabel}>PESO</Text><Text style={styles.metricValue}>{cargo.weightKg.toLocaleString("es-AR")} kg</Text></View>
              <View style={styles.metric}><Text style={styles.metricLabel}>VOLUMEN</Text><Text style={styles.metricValue}>{cargo.volumeM3.toLocaleString("es-AR")} m³</Text></View>
              <View style={styles.metric}><Text style={styles.metricLabel}>FOB</Text><Text style={styles.metricValue}>USD {cargo.fobUsd.toLocaleString("es-AR")}</Text></View>
            </View>
            <Text style={styles.meta}>Categoría: {cargo.category}</Text>
            {cargo.msdsRequired ? <Text style={styles.warning}>Requiere revisión HAZMAT y documentación MSDS.</Text> : null}
          </View>

          {profile?.role === "operator" && cargo.ownOffer ? <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Oferta presentada</Text>
            <Text style={styles.noticeText}>USD {cargo.ownOffer.totalUsd.toLocaleString("es-AR")} · {cargo.ownOffer.estimatedDays} días · {cargo.ownOffer.status}</Text>
          </View> : null}

          {profile?.role === "operator" && !cargo.ownOffer ? <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Cotizar esta carga</Text>
            <Text style={styles.label}>Modalidad</Text>
            <View style={styles.modeRow}>{(Object.keys(modeLabels) as TransportMode[]).map((item) => <TouchableOpacity key={item} onPress={() => setMode(item)} style={[styles.mode, mode === item && styles.modeActive]}><Text style={[styles.modeText, mode === item && styles.modeTextActive]}>{modeLabels[item]}</Text></TouchableOpacity>)}</View>
            <Text style={styles.label}>Flete USD</Text><TextInput keyboardType="decimal-pad" onChangeText={setFreight} placeholder="1300" placeholderTextColor="#8B8F98" style={styles.input} value={freight} />
            <Text style={styles.label}>Aduana USD</Text><TextInput keyboardType="decimal-pad" onChangeText={setCustoms} placeholder="0" placeholderTextColor="#8B8F98" style={styles.input} value={customs} />
            <Text style={styles.label}>Otros costos USD</Text><TextInput keyboardType="decimal-pad" onChangeText={setOtherCosts} placeholder="0" placeholderTextColor="#8B8F98" style={styles.input} value={otherCosts} />
            <Text style={styles.label}>Plazo estimado (días)</Text><TextInput keyboardType="number-pad" onChangeText={setDays} placeholder="25" placeholderTextColor="#8B8F98" style={styles.input} value={days} />
            <View style={styles.switchRow}><Text style={styles.switchText}>Incluye gestión aduanera</Text><Switch onValueChange={setIncludesCustoms} trackColor={{ false: "#D7D9DE", true: "#FFB28F" }} thumbColor={includesCustoms ? "#FF6B2C" : "#F4F4F5"} value={includesCustoms} /></View>
            <Text style={styles.label}>Condiciones</Text><TextInput multiline onChangeText={setTerms} placeholder="Alcance y condiciones de la propuesta" placeholderTextColor="#8B8F98" style={[styles.input, styles.textarea]} value={terms} />
            <TouchableOpacity disabled={sending} onPress={sendOffer} style={[styles.primary, sending && styles.disabled]}><Text style={styles.primaryText}>{sending ? "Enviando…" : "Presentar oferta"}</Text></TouchableOpacity>
          </View> : null}
          {profile?.role === "importer" ? <Text style={styles.readOnly}>Esta es tu vista móvil de la carga. La comparación y adjudicación de ofertas se realiza desde el panel web.</Text> : null}
        </> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6F8" }, container: { padding: 22, paddingBottom: 48 }, loader: { marginTop: 80 }, kicker: { color: "#FF6B2C", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginTop: 12 }, title: { color: "#111318", fontSize: 30, lineHeight: 35, fontWeight: "900", marginTop: 8 }, route: { color: "#666B75", marginTop: 8, marginBottom: 22 }, card: { backgroundColor: "white", borderColor: "#E3E5E9", borderWidth: 1, borderRadius: 18, padding: 19 }, description: { color: "#343841", lineHeight: 21 }, metrics: { flexDirection: "row", gap: 8, marginTop: 20 }, metric: { flex: 1, backgroundColor: "#F5F6F8", borderRadius: 12, padding: 10 }, metricLabel: { color: "#81858F", fontSize: 8, fontWeight: "900" }, metricValue: { color: "#16181D", fontSize: 11, fontWeight: "800", marginTop: 5 }, meta: { color: "#686D76", fontSize: 12, marginTop: 16 }, warning: { color: "#8B4B00", backgroundColor: "#FFF1DC", borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 17, marginTop: 14 }, notice: { backgroundColor: "#EAF8EF", borderRadius: 14, padding: 16, marginTop: 16 }, noticeTitle: { color: "#166534", fontWeight: "900" }, noticeText: { color: "#39704C", fontSize: 12, marginTop: 5 }, formCard: { backgroundColor: "white", borderColor: "#E3E5E9", borderWidth: 1, borderRadius: 18, padding: 19, marginTop: 16 }, sectionTitle: { color: "#111318", fontSize: 20, fontWeight: "900", marginBottom: 16 }, label: { color: "#515660", fontSize: 11, fontWeight: "800", marginBottom: 7, marginTop: 10 }, input: { backgroundColor: "#F7F7F8", borderColor: "#E1E2E6", borderWidth: 1, borderRadius: 10, color: "#111318", paddingHorizontal: 13, paddingVertical: 12 }, textarea: { minHeight: 90, textAlignVertical: "top" }, modeRow: { flexDirection: "row", gap: 7 }, mode: { flex: 1, borderColor: "#DADCE1", borderWidth: 1, borderRadius: 9, paddingVertical: 10, alignItems: "center" }, modeActive: { backgroundColor: "#111318", borderColor: "#111318" }, modeText: { color: "#5C616B", fontSize: 10, fontWeight: "800" }, modeTextActive: { color: "white" }, switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }, switchText: { color: "#40444C", fontSize: 12, fontWeight: "700" }, primary: { backgroundColor: "#FF6B2C", borderRadius: 11, alignItems: "center", padding: 15, marginTop: 18 }, primaryText: { color: "#2A1208", fontWeight: "900", fontSize: 12 }, disabled: { opacity: 0.55 }, error: { color: "#991B1B", backgroundColor: "#FEECEC", padding: 13, borderRadius: 10, marginBottom: 12 }, success: { color: "#166534", backgroundColor: "#EAF8EF", padding: 13, borderRadius: 10, marginBottom: 12 }, readOnly: { color: "#666B75", fontSize: 12, lineHeight: 18, textAlign: "center", padding: 18 }
});
