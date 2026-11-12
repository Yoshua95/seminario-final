import { Tabs } from "expo-router";

export default function TabsLayout() {
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
    </Tabs>
  );
}
