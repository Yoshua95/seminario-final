import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const operations = [
  { id: "OP-0108", title: "Marroquinería", status: "En tránsito", progress: "72%" },
  { id: "OP-0102", title: "Textiles", status: "Aduana", progress: "88%" },
  { id: "OP-0096", title: "Repuestos", status: "Entregada", progress: "100%" }
];

export default function OperationsScreen() {
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}><Text style={styles.kicker}>SEGUIMIENTO</Text><Text style={styles.title}>Operaciones</Text><Text style={styles.subtitle}>Hitos y documentación en un solo lugar.</Text>{operations.map((item) => <View style={styles.card} key={item.id}><View style={styles.row}><Text style={styles.code}>{item.id}</Text><Text style={styles.status}>{item.status}</Text></View><Text style={styles.cardTitle}>{item.title}</Text><View style={styles.progress}><View style={[styles.progressValue, { width: item.progress as `${number}%` }]} /></View><Text style={styles.caption}>{item.progress} del circuito registrado</Text></View>)}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6F8" }, container: { padding: 22, paddingBottom: 40 }, kicker: { color: "#FF6B2C", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginTop: 18 }, title: { color: "#111318", fontSize: 30, fontWeight: "900", marginTop: 8 }, subtitle: { color: "#707580", marginTop: 6, marginBottom: 24 }, card: { backgroundColor: "white", borderWidth: 1, borderColor: "#E7E8EB", borderRadius: 16, padding: 19, marginBottom: 14 }, row: { flexDirection: "row", justifyContent: "space-between" }, code: { color: "#747984", fontSize: 10, fontWeight: "900" }, status: { color: "#1C7540", fontSize: 10, fontWeight: "900" }, cardTitle: { color: "#111318", fontSize: 18, fontWeight: "800", marginTop: 18 }, progress: { height: 7, backgroundColor: "#E7E8EB", borderRadius: 10, marginTop: 18, overflow: "hidden" }, progressValue: { height: 7, backgroundColor: "#FF6B2C", borderRadius: 10 }, caption: { color: "#777C86", fontSize: 11, marginTop: 10 }
});
