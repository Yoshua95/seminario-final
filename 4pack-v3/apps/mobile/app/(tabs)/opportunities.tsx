import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const opportunities = [
  { id: "CG-0241", title: "Marroquinería", route: "Guangzhou → CABA", detail: "18,4 kg · 0,31 m³", tag: "Carga general" },
  { id: "CG-0242", title: "Accesorios electrónicos", route: "Shenzhen → Rosario", detail: "12,8 kg · 0,18 m³", tag: "Revisión HAZMAT" }
];

export default function OpportunitiesScreen() {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}><Text style={styles.kicker}>LICITACIONES</Text><Text style={styles.title}>Cargas abiertas</Text><Text style={styles.subtitle}>Cotizá oportunidades verificadas.</Text>{opportunities.map((item) => <View style={styles.card} key={item.id}><View style={styles.row}><Text style={styles.code}>{item.id}</Text><Text style={styles.tag}>{item.tag}</Text></View><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.route}>{item.route}</Text><Text style={styles.detail}>{item.detail}</Text><TouchableOpacity style={styles.button}><Text style={styles.buttonText}>Ver y cotizar</Text></TouchableOpacity></View>)}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6F8" }, container: { padding: 22, paddingBottom: 40 }, kicker: { color: "#FF6B2C", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginTop: 18 }, title: { color: "#111318", fontSize: 30, fontWeight: "900", marginTop: 8 }, subtitle: { color: "#707580", marginTop: 6, marginBottom: 24 }, card: { backgroundColor: "white", borderWidth: 1, borderColor: "#E7E8EB", borderRadius: 16, padding: 19, marginBottom: 14 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, code: { color: "#747984", fontSize: 10, fontWeight: "900" }, tag: { color: "#9A5A00", backgroundColor: "#FFF1DC", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, fontSize: 9, fontWeight: "800" }, cardTitle: { color: "#111318", fontSize: 18, fontWeight: "800", marginTop: 18 }, route: { color: "#5E636D", marginTop: 6 }, detail: { color: "#777C86", fontSize: 12, marginTop: 12 }, button: { backgroundColor: "#111318", borderRadius: 9, alignItems: "center", padding: 13, marginTop: 20 }, buttonText: { color: "white", fontWeight: "800", fontSize: 12 }
});
