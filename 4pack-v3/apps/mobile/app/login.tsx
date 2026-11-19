import { useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { withDeadline } from "../lib/auth-access";

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
    try {
      const { error: signInError } = await withDeadline(supabase.auth.signInWithPassword({ email: email.trim(), password }), "signIn");
      if (signInError) setError("No pudimos validar esos datos. Revisá la conexión y volvé a intentar.");
      // The root guard validates server user and role before opening private routes.
    } catch {
      setError("No pudimos conectar. Revisá la conexión y volvé a intentar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <View><Text style={styles.logo}>4PACK<Text style={styles.dot}>●</Text></Text><Text style={styles.kicker}>ACCESO SEGURO</Text><Text style={styles.title}>Tu operación empieza acá.</Text><Text style={styles.subtitle}>Acceso exclusivo para importadores. Operador y administracion usan la web.</Text></View>
        <View style={styles.card}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="nombre@empresa.com" placeholderTextColor="#656873" style={styles.input} value={email} />
          <Text style={styles.label}>Contraseña</Text>
          <TextInput autoComplete="password" onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#656873" secureTextEntry style={styles.input} value={password} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity disabled={loading} onPress={signIn} style={styles.primary}><Text style={styles.primaryText}>{loading ? "Validando…" : "Ingresar"}</Text></TouchableOpacity>
          {!isSupabaseConfigured ? <Text style={styles.configMessage}>Falta configurar la conexión del entorno móvil.</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0C0C0E" }, container: { flex: 1, justifyContent: "space-between", padding: 24, paddingVertical: 44 }, logo: { color: "#F2F2EF", fontSize: 27, fontWeight: "900", letterSpacing: -1.2 }, dot: { color: "#F2F2EF", fontSize: 12 }, kicker: { color: "#F2F2EF", fontSize: 10, fontWeight: "900", letterSpacing: 1.8, marginTop: 54 }, title: { color: "#F2F2EF", fontSize: 34, lineHeight: 39, fontWeight: "900", letterSpacing: -1.2, marginTop: 10 }, subtitle: { color: "#A9ABB2", fontSize: 14, lineHeight: 20, marginTop: 10 }, card: { backgroundColor: "#17181B", borderColor: "#1F2029", borderWidth: 1, borderRadius: 22, padding: 20 }, label: { color: "#C9CAD0", fontSize: 11, fontWeight: "700", marginBottom: 8, marginTop: 6 }, input: { backgroundColor: "#111219", borderColor: "#1F2029", borderWidth: 1, borderRadius: 11, color: "#F2F2EF", paddingHorizontal: 14, paddingVertical: 14, marginBottom: 14 }, error: { color: "#FCA5A5", fontSize: 12, lineHeight: 17, marginBottom: 12 }, primary: { backgroundColor: "#F2F2EF", borderRadius: 11, alignItems: "center", padding: 15, marginTop: 5 }, primaryText: { color: "#181006", fontWeight: "900", fontSize: 13 }, configMessage: { color: "#FCA5A5", fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 14 }
});
