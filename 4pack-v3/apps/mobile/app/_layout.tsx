import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text, View, Button } from "react-native";
import { supabase } from "../lib/supabase";
import { useFonts } from "expo-font";
import { isImporterVisualPreview } from "../lib/visual-environment.mjs";
import { AccessState, createImporterAccessGuard } from "../lib/auth-access";

export default function Layout() {
  const [fontsLoaded, fontError] = useFonts({ Geist: require("../assets/fonts/Geist.ttf") });
  const [access, setAccess] = useState<AccessState>({ status: "checking" });
  const guard = useRef<ReturnType<typeof createImporterAccessGuard> | null>(null);
  const visual = __DEV__ && isImporterVisualPreview(__DEV__, process.env.EXPO_PUBLIC_IMPORTER_VISUAL_PREVIEW);
  useEffect(() => {
    if (access.status === "error") console.warn("4PACK_AUTH_ACCESS", access.stage);
  }, [access]);
  useEffect(() => {
    if (visual || !supabase) { setAccess({ status: "signedOut" }); return; }
    const current = createImporterAccessGuard(supabase, setAccess);
    guard.current = current;
    return () => { current.stop(); guard.current = null; };
  }, [visual]);
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: "#07070a" }} />;
  if (visual) {
    const VisualPreview = require("../dev/visual-preview").default;
    return <VisualPreview />;
  }
  if (access.status === "checking") return <View style={{ flex: 1, justifyContent: "center", padding: 32 }}><Text>Verificando cuenta…</Text></View>;
  if (access.status === "error") return (
    <View style={{ flex: 1, justifyContent: "center", padding: 32 }}>
      <Text accessibilityRole="alert">No pudimos verificar tu cuenta. Revisá la conexión y volvé a intentar.</Text>
      <Button title="Reintentar" onPress={() => void guard.current?.retry()} />
      <Button title="Cerrar sesión en este dispositivo" onPress={() => void guard.current?.signOut()} />
    </View>
  );
  if (access.status === "blocked") return (
    <View style={{ flex: 1, justifyContent: "center", padding: 32 }}>
      <Text>La aplicación móvil está destinada al importador. Gestioná tu cuenta de operador o administración desde la web.</Text>
      <Button title="Cerrar sesión" onPress={() => void guard.current?.signOut()} />
    </View>
  );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={access.status === "signedOut"}><Stack.Screen name="login" /></Stack.Protected>
      <Stack.Protected guard={access.status === "allowed"}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="cargo/new" />
        <Stack.Screen name="cargo/[cargoId]" />
        <Stack.Screen name="operation/[operationId]" />
      </Stack.Protected>
    </Stack>
  );
}
