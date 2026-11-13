import Ionicons from "@expo/vector-icons/Ionicons";
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
      <Tabs.Screen name="index" options={{
        title: "Inicio",
        tabBarIcon: ({ color, focused, size }) => <Ionicons color={color} name={focused ? "home" : "home-outline"} size={size} />
      }} />
      <Tabs.Screen name="opportunities" options={{
        title: "Cargas",
        tabBarIcon: ({ color, focused, size }) => <Ionicons color={color} name={focused ? "cube" : "cube-outline"} size={size} />
      }} />
      <Tabs.Screen name="operations" options={{
        title: "Operaciones",
        tabBarIcon: ({ color, focused, size }) => <Ionicons color={color} name={focused ? "navigate-circle" : "navigate-circle-outline"} size={size} />
      }} />
      <Tabs.Screen name="profile" options={{
        title: "Perfil",
        tabBarIcon: ({ color, focused, size }) => <Ionicons color={color} name={focused ? "person-circle" : "person-circle-outline"} size={size} />
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#07070A" }
});
