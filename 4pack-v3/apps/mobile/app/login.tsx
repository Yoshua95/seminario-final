import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setError("");
    if (!supabase) {
      setError("La conexión segura todavía no fue configurada.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError("No pudimos validar esos datos.");
      return;
    }

    router.replace("/(tabs)");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View><Text style={styles.logo}>4PACK<Text style={styles.dot}>●</Text></Text><Text style={styles.kicker}>ACCESO SEGURO</Text><Text style={styles.title}>Tu operación empieza acá.</Text><Text style={styles.subtitle}>Ingresá según tu rol dentro de la plataforma.</Text></View>
        <View style={styles.card}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="nombre@empresa.com" placeholderTextColor="#656873" style={styles.input} value={email} />
          <Text style={styles.label}>Contraseña</Text>
          <TextInput autoComplete="password" onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#656873" secureTextEntry style={styles.input} value={password} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity disabled={loading} onPress={signIn} style={styles.primary}><Text style={styles.primaryText}>{loading ? "Validando…" : "Ingresar"}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/(tabs)")} style={styles.demo}><Text style={styles.demoText}>{isSupabaseConfigured ? "Ver demostración" : "Continuar en modo demostración"}</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#07070A" }, container: { flex: 1, justifyContent: "space-between", padding: 24, paddingVertical: 44 }, logo: { color: "white", fontSize: 27, fontWeight: "900", letterSpacing: -1.2 }, dot: { color: "#F59E0B", fontSize: 12 }, kicker: { color: "#F59E0B", fontSize: 10, fontWeight: "900", letterSpacing: 1.8, marginTop: 54 }, title: { color: "white", fontSize: 34, lineHeight: 39, fontWeight: "900", letterSpacing: -1.2, marginTop: 10 }, subtitle: { color: "#8A8B94", fontSize: 14, lineHeight: 20, marginTop: 10 }, card: { backgroundColor: "#0C0D12", borderColor: "#1F2029", borderWidth: 1, borderRadius: 22, padding: 20 }, label: { color: "#C9CAD0", fontSize: 11, fontWeight: "700", marginBottom: 8, marginTop: 6 }, input: { backgroundColor: "#111219", borderColor: "#1F2029", borderWidth: 1, borderRadius: 11, color: "white", paddingHorizontal: 14, paddingVertical: 14, marginBottom: 14 }, error: { color: "#FCA5A5", fontSize: 12, lineHeight: 17, marginBottom: 12 }, primary: { backgroundColor: "#F59E0B", borderRadius: 11, alignItems: "center", padding: 15, marginTop: 5 }, primaryText: { color: "#181006", fontWeight: "900", fontSize: 13 }, demo: { alignItems: "center", padding: 14, marginTop: 4 }, demoText: { color: "#A8AAB3", fontWeight: "700", fontSize: 12 }
});
