import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { loadCurrentProfile, loadOpenCargos, type MobileCargo, type MobileProfile } from "../../lib/dashboard";

function formatNumber(value: number) {
  return value.toLocaleString("es-AR", { maximumFractionDigits: 3 });
}

export default function OpportunitiesScreen() {
  const [opportunities, setOpportunities] = useState<MobileCargo[]>([]);
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useFocusEffect(useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([loadOpenCargos(), loadCurrentProfile()])
      .then(([cargos, currentProfile]) => { setOpportunities(cargos); setProfile(currentProfile); })
      .catch(() => setError("No pudimos cargar las oportunidades."))
      .finally(() => setLoading(false));
  }, []));

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}><Text style={styles.kicker}>LICITACIONES</Text><Text style={styles.title}>Cargas abiertas</Text><Text style={styles.subtitle}>{profile?.role === "importer" ? "Publicá y consultá tus solicitudes logísticas." : "Cotizá oportunidades verificadas."}</Text>{profile?.role === "importer" ? <TouchableOpacity onPress={() => router.push("/cargo/new")} style={styles.createButton}><Text style={styles.createButtonText}>+ Publicar nueva carga</Text></TouchableOpacity> : null}{loading && <ActivityIndicator color="#FF6B2C" style={styles.loader} />}{error ? <Text style={styles.message}>{error}</Text> : null}{opportunities.map((item) => <View style={styles.card} key={item.id}><View style={styles.row}><Text style={styles.code}>{item.id.slice(0, 8).toUpperCase()}</Text><Text style={styles.tag}>{item.hazmatReviewRequired ? "Revisión HAZMAT" : "Carga general"}</Text></View><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.route}>{item.route}</Text><Text style={styles.detail}>{formatNumber(item.weightKg)} kg · {formatNumber(item.volumeM3)} m³</Text><TouchableOpacity onPress={() => router.push(`/cargo/${item.id}`)} style={styles.button}><Text style={styles.buttonText}>{profile?.role === "operator" ? "Ver y cotizar" : "Ver detalle"}</Text></TouchableOpacity></View>)}{!loading && !error && opportunities.length === 0 ? <Text style={styles.message}>No hay cargas abiertas en este momento.</Text> : null}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6F8" }, container: { padding: 22, paddingBottom: 40 }, kicker: { color: "#FF6B2C", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginTop: 18 }, title: { color: "#111318", fontSize: 30, fontWeight: "900", marginTop: 8 }, subtitle: { color: "#707580", marginTop: 6, marginBottom: 18 }, createButton: { backgroundColor: "#FF6B2C", borderRadius: 10, alignItems: "center", padding: 14, marginBottom: 20 }, createButtonText: { color: "#2A1208", fontWeight: "900", fontSize: 12 }, loader: { marginVertical: 30 }, message: { color: "#707580", backgroundColor: "white", borderColor: "#E7E8EB", borderWidth: 1, borderRadius: 14, padding: 20, textAlign: "center" }, card: { backgroundColor: "white", borderWidth: 1, borderColor: "#E7E8EB", borderRadius: 16, padding: 19, marginBottom: 14 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, code: { color: "#747984", fontSize: 10, fontWeight: "900" }, tag: { color: "#9A5A00", backgroundColor: "#FFF1DC", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, fontSize: 9, fontWeight: "800" }, cardTitle: { color: "#111318", fontSize: 18, fontWeight: "800", marginTop: 18 }, route: { color: "#5E636D", marginTop: 6 }, detail: { color: "#777C86", fontSize: 12, marginTop: 12 }, button: { backgroundColor: "#111318", borderRadius: 9, alignItems: "center", padding: 13, marginTop: 20 }, buttonText: { color: "white", fontWeight: "800", fontSize: 12 }
});
