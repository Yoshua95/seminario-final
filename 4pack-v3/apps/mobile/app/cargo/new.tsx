import type { TransportMode } from "@4pack/domain";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { createCargo } from "../../lib/dashboard";

type Fields = { title: string; description: string; origin: string; destination: string; category: string; weight: string; volume: string; fob: string };
const initialFields: Fields = { title: "", description: "", origin: "", destination: "", category: "", weight: "", volume: "", fob: "" };
const modes: Array<{ value: TransportMode; label: string }> = [{ value: "air", label: "Aéreo" }, { value: "sea", label: "Marítimo" }, { value: "consolidated", label: "Consolidado" }];

export default function NewCargoScreen() {
  const [fields, setFields] = useState(initialFields);
  const [mode, setMode] = useState<TransportMode>("sea");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof Fields) => (value: string) => setFields((current) => ({ ...current, [key]: value }));

  async function publish() {
    const weightKg = Number(fields.weight.replace(",", "."));
    const volumeM3 = Number(fields.volume.replace(",", "."));
    const fobUsd = Number(fields.fob.replace(",", "."));
    if (Object.values(fields).some((value) => !value.trim()) || !Number.isFinite(weightKg) || weightKg <= 0 || !Number.isFinite(volumeM3) || volumeM3 <= 0 || !Number.isFinite(fobUsd) || fobUsd < 0) {
      setError("Completá todos los campos con valores válidos.");
      return;
    }
    setLoading(true); setError("");
    try {
      const id = await createCargo({ title: fields.title.trim(), description: fields.description.trim(), origin: fields.origin.trim(), destination: fields.destination.trim(), category: fields.category.trim(), weightKg, volumeM3, fobUsd, preferredMode: mode });
      router.replace(`/cargo/${id}`);
    } catch {
      setError("No pudimos publicar la carga. Verificá tu rol y la conexión.");
    } finally { setLoading(false); }
  }

  return <SafeAreaView style={styles.safe}><Stack.Screen options={{ headerShown: true, title: "Nueva carga", headerStyle: { backgroundColor: "#F5F6F8" }, headerShadowVisible: false }} /><ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled"><Text style={styles.kicker}>NUEVA LICITACIÓN</Text><Text style={styles.title}>Publicar carga</Text><Text style={styles.subtitle}>Los operadores aprobados podrán cotizar durante siete días.</Text>{error ? <Text style={styles.error}>{error}</Text> : null}<Text style={styles.label}>Título</Text><TextInput onChangeText={update("title")} placeholder="Importación de componentes" placeholderTextColor="#8B8F98" style={styles.input} value={fields.title} /><Text style={styles.label}>Descripción</Text><TextInput multiline onChangeText={update("description")} placeholder="Detalle de la mercadería y condiciones" placeholderTextColor="#8B8F98" style={[styles.input, styles.textarea]} value={fields.description} /><Text style={styles.label}>Origen</Text><TextInput onChangeText={update("origin")} placeholder="Shenzhen, China" placeholderTextColor="#8B8F98" style={styles.input} value={fields.origin} /><Text style={styles.label}>Destino</Text><TextInput onChangeText={update("destination")} placeholder="Buenos Aires, Argentina" placeholderTextColor="#8B8F98" style={styles.input} value={fields.destination} /><Text style={styles.label}>Categoría</Text><TextInput onChangeText={update("category")} placeholder="Electrónica" placeholderTextColor="#8B8F98" style={styles.input} value={fields.category} /><Text style={styles.label}>Modalidad preferida</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll}>{modes.map((item) => <TouchableOpacity key={item.value} onPress={() => setMode(item.value)} style={[styles.mode, mode === item.value && styles.modeActive]}><Text style={[styles.modeText, mode === item.value && styles.modeTextActive]}>{item.label}</Text></TouchableOpacity>)}</ScrollView><Text style={styles.label}>Peso (kg)</Text><TextInput keyboardType="decimal-pad" onChangeText={update("weight")} placeholder="120" placeholderTextColor="#8B8F98" style={styles.input} value={fields.weight} /><Text style={styles.label}>Volumen (m³)</Text><TextInput keyboardType="decimal-pad" onChangeText={update("volume")} placeholder="1,8" placeholderTextColor="#8B8F98" style={styles.input} value={fields.volume} /><Text style={styles.label}>Valor FOB (USD)</Text><TextInput keyboardType="decimal-pad" onChangeText={update("fob")} placeholder="8500" placeholderTextColor="#8B8F98" style={styles.input} value={fields.fob} /><TouchableOpacity disabled={loading} onPress={publish} style={[styles.primary, loading && styles.disabled]}><Text style={styles.primaryText}>{loading ? "Publicando…" : "Publicar licitación"}</Text></TouchableOpacity><Text style={styles.note}>Si la descripción contiene baterías, litio, líquidos, aerosoles, imanes o químicos, 4PACK solicitará revisión HAZMAT y MSDS.</Text></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#F5F6F8" }, container: { padding: 22, paddingBottom: 48 }, kicker: { color: "#FF6B2C", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 }, title: { color: "#111318", fontSize: 30, fontWeight: "900", marginTop: 8 }, subtitle: { color: "#6F7480", lineHeight: 19, marginTop: 7, marginBottom: 20 }, label: { color: "#515660", fontSize: 11, fontWeight: "800", marginBottom: 7, marginTop: 12 }, input: { backgroundColor: "white", borderColor: "#DFE1E5", borderWidth: 1, borderRadius: 11, color: "#111318", paddingHorizontal: 14, paddingVertical: 13 }, textarea: { minHeight: 100, textAlignVertical: "top" }, modeScroll: { flexGrow: 0 }, mode: { borderColor: "#DADCE1", borderWidth: 1, borderRadius: 9, paddingHorizontal: 18, paddingVertical: 10, marginRight: 8 }, modeActive: { backgroundColor: "#111318", borderColor: "#111318" }, modeText: { color: "#5C616B", fontSize: 11, fontWeight: "800" }, modeTextActive: { color: "white" }, primary: { backgroundColor: "#FF6B2C", borderRadius: 11, alignItems: "center", padding: 16, marginTop: 24 }, primaryText: { color: "#2A1208", fontWeight: "900", fontSize: 13 }, disabled: { opacity: 0.55 }, error: { color: "#991B1B", backgroundColor: "#FEECEC", padding: 13, borderRadius: 10, marginBottom: 8 }, note: { color: "#737782", fontSize: 11, lineHeight: 17, textAlign: "center", marginTop: 16 } });
