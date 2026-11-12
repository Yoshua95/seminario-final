import { StatusBar } from "expo-status-bar";
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const milestones = ["Carga publicada", "Oferta adjudicada", "Pago verificado", "En tránsito"];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.topbar}><Text style={styles.logo}>4PACK<Text style={styles.dot}>●</Text></Text><View style={styles.avatar}><Text style={styles.avatarText}>YC</Text></View></View>
        <Text style={styles.kicker}>OPERACIÓN ACTIVA</Text>
        <Text style={styles.title}>Tu carga está en camino</Text>
        <Text style={styles.subtitle}>Guangzhou → Buenos Aires</Text>
        <View style={styles.card}>
          <View style={styles.row}><Text style={styles.code}>OP-0108</Text><Text style={styles.badge}>EN TRÁNSITO</Text></View>
          <Text style={styles.cardTitle}>Marroquinería · 18,4 kg</Text>
          <Text style={styles.operator}>Arbox Logistics · Aéreo consolidado</Text>
          <View style={styles.timeline}>{milestones.map((item, index) => <View style={styles.milestone} key={item}><View style={[styles.circle, index === milestones.length - 1 && styles.current]} /><Text style={[styles.milestoneText, index === milestones.length - 1 && styles.currentText]}>{item}</Text></View>)}</View>
          <TouchableOpacity style={styles.primary}><Text style={styles.primaryText}>Ver operación</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6F8" }, container: { padding: 22, paddingBottom: 48 },
  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 48 },
  logo: { color: "#111318", fontSize: 25, fontWeight: "900", letterSpacing: -1 }, dot: { color: "#FF6B2C", fontSize: 12 },
  avatar: { backgroundColor: "#111318", width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }, avatarText: { color: "white", fontWeight: "800", fontSize: 11 },
  kicker: { color: "#FF6B2C", fontWeight: "800", fontSize: 10, letterSpacing: 1.5 }, title: { fontSize: 32, lineHeight: 37, fontWeight: "900", color: "#111318", letterSpacing: -1.2, marginTop: 9 }, subtitle: { color: "#6F7480", marginTop: 7, marginBottom: 26 },
  card: { backgroundColor: "white", borderRadius: 18, padding: 20, borderWidth: 1, borderColor: "#E7E8EB" }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, code: { color: "#7B808A", fontWeight: "800", fontSize: 10, letterSpacing: 1 }, badge: { color: "#1C7540", backgroundColor: "#E9F8EF", fontSize: 9, fontWeight: "900", paddingVertical: 6, paddingHorizontal: 9, borderRadius: 20 },
  cardTitle: { color: "#111318", fontSize: 18, fontWeight: "800", marginTop: 22 }, operator: { color: "#6F7480", fontSize: 12, marginTop: 7 }, timeline: { marginVertical: 24, gap: 14 }, milestone: { flexDirection: "row", alignItems: "center", gap: 11 }, circle: { width: 11, height: 11, borderRadius: 6, backgroundColor: "#111318" }, current: { backgroundColor: "#FF6B2C" }, milestoneText: { color: "#5E636D", fontSize: 12 }, currentText: { color: "#111318", fontWeight: "800" },
  primary: { backgroundColor: "#111318", padding: 14, borderRadius: 10, alignItems: "center" }, primaryText: { color: "white", fontWeight: "800", fontSize: 12 }
});
