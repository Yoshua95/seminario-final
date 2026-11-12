import { router } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../lib/supabase";

type Profile = {
  full_name: string;
  role: "importer" | "operator" | "admin";
};

const roleLabels: Record<Profile["role"], string> = {
  importer: "Importador",
  operator: "Operador verificado",
  admin: "Administrador"
};

export default function ProfileScreen() {
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    client.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email ?? "");

      const { data: currentProfile } = await client
        .from("profiles")
        .select("full_name, role")
        .eq("id", data.user.id)
        .single<Profile>();

      setProfile(currentProfile);
    });
  }, []);

  async function signOut() {
    await supabase?.auth.signOut();
    router.replace("/login");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.kicker}>CUENTA 4PACK</Text>
        <Text style={styles.title}>{profile?.full_name ?? "Perfil"}</Text>
        <View style={styles.card}>
          <Text style={styles.label}>ROL</Text>
          <Text style={styles.value}>{profile ? roleLabels[profile.role] : "Cargando…"}</Text>
          <Text style={styles.label}>CORREO</Text>
          <Text style={styles.value}>{email}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.button}><Text style={styles.buttonText}>Cerrar sesión</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#07070A" },
  container: { flex: 1, padding: 24, paddingTop: 48 },
  kicker: { color: "#F59E0B", fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  title: { color: "white", fontSize: 32, fontWeight: "900", marginTop: 10, marginBottom: 28 },
  card: { backgroundColor: "#0C0D12", borderColor: "#1F2029", borderWidth: 1, borderRadius: 18, padding: 20 },
  label: { color: "#777A84", fontSize: 9, fontWeight: "900", letterSpacing: 1.3, marginBottom: 7, marginTop: 8 },
  value: { color: "#F2F2F4", fontSize: 15, fontWeight: "700", marginBottom: 18 },
  button: { borderColor: "#343641", borderWidth: 1, borderRadius: 12, alignItems: "center", padding: 15, marginTop: 18 },
  buttonText: { color: "#F59E0B", fontSize: 13, fontWeight: "900" }
});
