import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import {
  loadCargoDetail,
  loadImporterOffers,
  loadCargoOperation,
  awardImporterOffer,
  type MobileCargoDetail,
} from "../../lib/dashboard";
import {
  compareImporterOffers,
  type ImporterOffer,
} from "../../lib/importer-flow";
export default function CargoDetailScreen() {
  const { cargoId } = useLocalSearchParams<{ cargoId: string }>();
  const [cargo, setCargo] = useState<MobileCargoDetail | null>(null),
    [offers, setOffers] = useState<ImporterOffer[]>([]);
  const [operation, setOperation] = useState<string | undefined>(),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [details, setDetails] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, o, op] = await Promise.all([
        loadCargoDetail(cargoId),
        loadImporterOffers(cargoId),
        loadCargoOperation(cargoId),
      ]);
      setCargo(c);
      setOffers(o);
      setOperation(op);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar la licitacion.",
      );
    } finally {
      setLoading(false);
    }
  }, [cargoId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function award(id: string) {
    setBusy(true);
    setError("");
    try {
      const op = await awardImporterOffer(id);
      router.push({
        pathname: "/operation/[operationId]",
        params: { operationId: op },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo adjudicar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: true, title: "Mi carga" }} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void refresh()}
          />
        }
      >
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {loading ? <ActivityIndicator /> : null}
        {cargo && (
          <>
            <Text style={styles.title}>{cargo.title}</Text>
            <Text style={styles.route}>{cargo.route}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setDetails(details === "cargo" ? null : "cargo")}
            >
              <Text style={styles.meta}>Ver detalles de mi carga</Text>
            </TouchableOpacity>
            {details === "cargo" && (
              <View style={styles.card}>
                <Text>{cargo.description}</Text>
                <Text>
                  {cargo.weightKg} kg / {cargo.volumeM3} m3
                </Text>
                <Text>FOB USD {cargo.fobUsd}</Text>
                {cargo.msdsRequired && (
                  <Text style={styles.warning}>MSDS requerido</Text>
                )}
              </View>
            )}
            {operation ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.primary}
                onPress={() =>
                  router.push({
                    pathname: "/operation/[operationId]",
                    params: { operationId: operation },
                  })
                }
              >
                <Text style={styles.primaryText}>Ver operacion</Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Comparar ofertas</Text>
                {compareImporterOffers(offers) && (
                  <Text style={styles.warning}>
                    Monedas o alcances diferentes. Revisa los detalles antes de
                    elegir; los importes no son equivalentes.
                  </Text>
                )}
                {offers.length === 0 && (
                  <Text style={styles.readOnly}>
                    Todavia no recibiste ofertas. Desliza para actualizar.
                  </Text>
                )}
                {offers.map((o, i) => (
                  <View key={o.id} style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Propuesta {i + 1}</Text>
                    <Text>
                      {o.currency} {o.amount.toLocaleString("es-AR")} / {o.days}{" "}
                      dias
                    </Text>
                    <Text>{o.quote?.scope}</Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => setDetails(details === o.id ? null : o.id)}
                    >
                      <Text style={styles.meta}>Ver alcance y condiciones</Text>
                    </TouchableOpacity>
                    {details === o.id && (
                      <View>
                        <Text>Incluye: {o.quote?.included.join(", ")}</Text>
                        <Text>Excluye: {o.quote?.excluded.join(", ")}</Text>
                        <Text>Seguro: {o.quote?.insurance}</Text>
                        <Text>Pago: {o.quote?.payment_terms}</Text>
                        <Text>
                          Documentos: {o.quote?.required_documents.join(", ")}
                        </Text>
                        <Text>
                          Responsabilidades: {o.quote?.responsibilities}
                        </Text>
                        <Text>Observaciones: {o.quote?.observations}</Text>
                        <Text>
                          Vigencia:{" "}
                          {new Date(o.validUntil).toLocaleString("es-AR")}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={
                        busy ||
                        o.status !== "submitted" ||
                        Date.parse(o.validUntil) <= Date.now()
                      }
                      style={[
                        styles.primary,
                        (busy ||
                          o.status !== "submitted" ||
                          Date.parse(o.validUntil) <= Date.now()) &&
                          styles.disabled,
                      ]}
                      onPress={() =>
                        Alert.alert(
                          "Confirmar eleccion",
                          o.currency +
                            " " +
                            o.amount +
                            ". Se creara la operacion; luego confirma la garantia simulada.",
                          [
                            { text: "Volver", style: "cancel" },
                            {
                              text: "Elegir esta oferta",
                              onPress: () => void award(o.id),
                            },
                          ],
                        )
                      }
                    >
                      <Text style={styles.primaryText}>Elegir esta oferta</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6F8" },
  container: { padding: 22, paddingBottom: 48 },
  loader: { marginTop: 80 },
  kicker: {
    color: "#FF6B2C",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 12,
  },
  title: {
    color: "#111318",
    fontSize: 30,
    lineHeight: 35,
    fontWeight: "900",
    marginTop: 8,
  },
  route: { color: "#666B75", marginTop: 8, marginBottom: 22 },
  card: {
    backgroundColor: "white",
    borderColor: "#E3E5E9",
    borderWidth: 1,
    borderRadius: 18,
    padding: 19,
  },
  description: { color: "#343841", lineHeight: 21 },
  metrics: { flexDirection: "row", gap: 8, marginTop: 20 },
  metric: {
    flex: 1,
    backgroundColor: "#F5F6F8",
    borderRadius: 12,
    padding: 10,
  },
  metricLabel: { color: "#81858F", fontSize: 8, fontWeight: "900" },
  metricValue: {
    color: "#16181D",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 5,
  },
  meta: { color: "#686D76", fontSize: 12, marginTop: 16 },
  warning: {
    color: "#8B4B00",
    backgroundColor: "#FFF1DC",
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 14,
  },
  notice: {
    backgroundColor: "#EAF8EF",
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  noticeTitle: { color: "#166534", fontWeight: "900" },
  noticeText: { color: "#39704C", fontSize: 12, marginTop: 5 },
  formCard: {
    backgroundColor: "white",
    borderColor: "#E3E5E9",
    borderWidth: 1,
    borderRadius: 18,
    padding: 19,
    marginTop: 16,
  },
  sectionTitle: {
    color: "#111318",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 16,
  },
  label: {
    color: "#515660",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 7,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#F7F7F8",
    borderColor: "#E1E2E6",
    borderWidth: 1,
    borderRadius: 10,
    color: "#111318",
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  modeRow: { flexDirection: "row", gap: 7 },
  mode: {
    flex: 1,
    borderColor: "#DADCE1",
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: "center",
  },
  modeActive: { backgroundColor: "#111318", borderColor: "#111318" },
  modeText: { color: "#5C616B", fontSize: 10, fontWeight: "800" },
  modeTextActive: { color: "white" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  switchText: { color: "#40444C", fontSize: 12, fontWeight: "700" },
  primary: {
    backgroundColor: "#FF6B2C",
    borderRadius: 11,
    alignItems: "center",
    padding: 15,
    marginTop: 18,
  },
  primaryText: { color: "#2A1208", fontWeight: "900", fontSize: 12 },
  disabled: { opacity: 0.55 },
  error: {
    color: "#991B1B",
    backgroundColor: "#FEECEC",
    padding: 13,
    borderRadius: 10,
    marginBottom: 12,
  },
  success: {
    color: "#166534",
    backgroundColor: "#EAF8EF",
    padding: 13,
    borderRadius: 10,
    marginBottom: 12,
  },
  readOnly: {
    color: "#666B75",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    padding: 18,
  },
});
