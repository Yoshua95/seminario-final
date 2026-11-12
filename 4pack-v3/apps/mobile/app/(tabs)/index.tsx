import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { loadOperations, type MobileOperation } from "../../lib/dashboard";

const milestones = ["Carga publicada", "Oferta adjudicada", "Pago verificado", "En tránsito", "Aduana", "Entregada"];

const activeMilestone = {
  draft: 0,
  open: 0,
  awarded: 1,
  in_transit: 3,
  customs: 4,
  delivered: 5,
  cancelled: 0
};

const statusLabel = {
  draft: "BORRADOR",
  open: "PUBLICADA",
  awarded: "ADJUDICADA",
  in_transit: "EN TRÁNSITO",
  customs: "ADUANA",
  delivered: "ENTREGADA",
  cancelled: "CANCELADA"
};

export default function HomeScreen() {
  const [operation, setOperation] = useState<MobileOperation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOperations()
      .then((operations) => setOperation(operations[0] ?? null))
      .catch(() => setError("No pudimos cargar la operación activa."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topbar}><Text style={styles.logo}>4PACK<Text style={styles.dot}>●</Text></Text><View style={styles.avatar}><Text style={styles.avatarText}>YC</Text></View></View>
        <Text style={styles.kicker}>OPERACIÓN ACTIVA</Text>
        <Text style={styles.title}>{operation ? "Tu carga está en camino" : "Seguimiento logístico"}</Text>
        <Text style={styles.subtitle}>{operation?.route ?? "Toda la operación en un solo lugar"}</Text>
        {loading && <ActivityIndicator color="#FF6B2C" style={styles.loader} />}
        {error ? <Text style={styles.message}>{error}</Text> : null}
        {operation ? <View style={styles.card}>
          <View style={styles.row}><Text style={styles.code}>{operation.id.slice(0, 8).toUpperCase()}</Text><Text style={styles.badge}>{statusLabel[operation.status]}</Text></View>
          <Text style={styles.cardTitle}>{operation.title}</Text>
          <Text style={styles.operator}>Operación adjudicada · seguimiento activo</Text>
          <View style={styles.timeline}>{milestones.map((item, index) => { const isCurrent = index === activeMilestone[operation.status]; const isComplete = index <= activeMilestone[operation.status]; return <View style={styles.milestone} key={item}><View style={[styles.circle, isComplete && styles.complete, isCurrent && styles.current]} /><Text style={[styles.milestoneText, isCurrent && styles.currentText]}>{item}</Text></View>; })}</View>
          <TouchableOpacity style={styles.primary}><Text style={styles.primaryText}>Ver operación</Text></TouchableOpacity>
        </View> : null}
        {!loading && !error && !operation ? <Text style={styles.message}>Todavía no hay una operación activa.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6F8" }, container: { padding: 22, paddingBottom: 48 },
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 48 },
  logo: { color: "#111318", fontSize: 25, fontWeight: "900", letterSpacing: -1 }, dot: { color: "#FF6B2C", fontSize: 12 },
  avatar: { backgroundColor: "#111318", width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }, avatarText: { color: "white", fontWeight: "800", fontSize: 11 },
  kicker: { color: "#FF6B2C", fontWeight: "800", fontSize: 10, letterSpacing: 1.5 }, title: { fontSize: 32, lineHeight: 37, fontWeight: "900", color: "#111318", letterSpacing: -1.2, marginTop: 9 }, subtitle: { color: "#6F7480", marginTop: 7, marginBottom: 26 }, loader: { marginVertical: 34 }, message: { color: "#707580", backgroundColor: "white", borderColor: "#E7E8EB", borderWidth: 1, borderRadius: 14, padding: 20, textAlign: "center" },
  card: { backgroundColor: "white", borderRadius: 18, padding: 20, borderWidth: 1, borderColor: "#E7E8EB" }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, code: { color: "#7B808A", fontWeight: "800", fontSize: 10, letterSpacing: 1 }, badge: { color: "#1C7540", backgroundColor: "#E9F8EF", fontSize: 9, fontWeight: "900", paddingVertical: 6, paddingHorizontal: 9, borderRadius: 20 },
  cardTitle: { color: "#111318", fontSize: 18, fontWeight: "800", marginTop: 22 }, operator: { color: "#6F7480", fontSize: 12, marginTop: 7 }, timeline: { marginVertical: 24, gap: 14 }, milestone: { flexDirection: "row", alignItems: "center", gap: 11 }, circle: { width: 11, height: 11, borderRadius: 6, backgroundColor: "#D9DBE0" }, complete: { backgroundColor: "#111318" }, current: { backgroundColor: "#FF6B2C" }, milestoneText: { color: "#5E636D", fontSize: 12 }, currentText: { color: "#111318", fontWeight: "800" },
  primary: { backgroundColor: "#111318", padding: 14, borderRadius: 10, alignItems: "center" }, primaryText: { color: "white", fontWeight: "800", fontSize: 12 }
});
