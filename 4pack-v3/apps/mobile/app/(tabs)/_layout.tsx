import { Redirect, Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { supabase } from "../../lib/supabase";

export default function TabsLayout() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthenticated(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => setAuthenticated(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session)));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (authenticated === null) {
    return <View style={styles.loading}><ActivityIndicator color="#F59E0B" /></View>;
  }

  if (!authenticated) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF6B2C",
        tabBarInactiveTintColor: "#737782",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarStyle: { height: 66, paddingTop: 8, paddingBottom: 8 }
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="opportunities" options={{ title: "Cargas" }} />
      <Tabs.Screen name="operations" options={{ title: "Operaciones" }} />
      <Tabs.Screen name="profile" options={{ title: "Perfil" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#07070A" }
});
