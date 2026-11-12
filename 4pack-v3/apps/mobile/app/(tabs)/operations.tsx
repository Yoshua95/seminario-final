import type { CargoStatus } from "@4pack/domain";
import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { loadOperations, type MobileOperation } from "../../lib/dashboard";

const statusDetails: Record<CargoStatus, { label: string; progress: number }> = {
  draft: { label: "Borrador", progress: 0 },
  open: { label: "Publicada", progress: 10 },
  awarded: { label: "Adjudicada", progress: 25 },
  in_transit: { label: "En tránsito", progress: 65 },
  customs: { label: "Aduana", progress: 85 },
  delivered: { label: "Entregada", progress: 100 },
  cancelled: { label: "Cancelada", progress: 0 }
};

export default function OperationsScreen() {
  const [operations, setOperations] = useState<MobileOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOperations()
      .then(setOperations)
      .catch(() => setError("No pudimos cargar las operaciones."))
      .finally(() => setLoading(false));
  }, []);

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}><Text style={styles.kicker}>SEGUIMIENTO</Text><Text style={styles.title}>Operaciones</Text><Text style={styles.subtitle}>Hitos y documentación en un solo lugar.</Text>{loading && <ActivityIndicator color="#FF6B2C" style={styles.loader} />}{error ? <Text style={styles.message}>{error}</Text> : null}{operations.map((item) => { const detail = statusDetails[item.status]; return <View style={styles.card} key={item.id}><View style={styles.row}><Text style={styles.code}>{item.id.slice(0, 8).toUpperCase()}</Text><Text style={styles.status}>{detail.label}</Text></View><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.route}>{item.route}</Text><View style={styles.progress}><View style={[styles.progressValue, { width: `${detail.progress}%` }]} /></View><Text style={styles.caption}>{detail.progress}% del circuito registrado</Text></View>; })}{!loading && !error && operations.length === 0 ? <Text style={styles.message}>Todavía no hay operaciones adjudicadas.</Text> : null}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6F8" }, container: { padding: 22, paddingBottom: 40 }, kicker: { color: "#FF6B2C", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginTop: 18 }, title: { color: "#111318", fontSize: 30, fontWeight: "900", marginTop: 8 }, subtitle: { color: "#707580", marginTop: 6, marginBottom: 24 }, loader: { marginVertical: 30 }, message: { color: "#707580", backgroundColor: "white", borderColor: "#E7E8EB", borderWidth: 1, borderRadius: 14, padding: 20, textAlign: "center" }, card: { backgroundColor: "white", borderWidth: 1, borderColor: "#E7E8EB", borderRadius: 16, padding: 19, marginBottom: 14 }, row: { flexDirection: "row", justifyContent: "space-between" }, code: { color: "#747984", fontSize: 10, fontWeight: "900" }, status: { color: "#1C7540", fontSize: 10, fontWeight: "900" }, cardTitle: { color: "#111318", fontSize: 18, fontWeight: "800", marginTop: 18 }, route: { color: "#6F7480", fontSize: 12, marginTop: 7 }, progress: { height: 7, backgroundColor: "#E7E8EB", borderRadius: 10, marginTop: 18, overflow: "hidden" }, progressValue: { height: 7, backgroundColor: "#FF6B2C", borderRadius: 10 }, caption: { color: "#777C86", fontSize: 11, marginTop: 10 }
});
