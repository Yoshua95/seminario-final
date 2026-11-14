import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View, Button } from "react-native";
import { supabase } from "../lib/supabase";

export default function Layout() {
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let alive = true;
    async function check() {
      try {
        const { data } = await supabase!.auth.getUser();
        const profile = data.user ? await supabase!.from("profiles").select("role").eq("id",data.user.id).single() : null;
        if (alive) setBlocked(Boolean(data.user && (profile?.error || profile?.data?.role !== "importer")));
      } catch { if (alive) setBlocked(true); }
      finally { if (alive) setChecking(false); }
    }
    if (!supabase) { setChecking(false); return; }
    void check();
    const { data } = supabase.auth.onAuthStateChange(() => { setChecking(true); setTimeout(() => void check(), 0); });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  if (checking) return <View><Text>Verificando cuenta…</Text></View>;
  if (blocked) return <View style={{padding:32}}><Text>La aplicación móvil está destinada al importador. Gestioná tu cuenta de operador o administración desde la web.</Text><Button title="Cerrar sesión" onPress={() => void supabase?.auth.signOut()} /></View>;
  return <Stack screenOptions={{ headerShown: false }} />;
}
