import { Stack, Redirect, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View, Button } from "react-native";
import { supabase } from "../lib/supabase";
import { useFonts } from "expo-font";
import { isImporterVisualPreview } from "../lib/visual-environment.mjs";

export default function Layout() {
  const [fontsLoaded] = useFonts({
    Geist: require("../assets/fonts/Geist.ttf"),
  });
  const segments = useSegments();
  const [authenticated, setAuthenticated] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    if (
      __DEV__ &&
      isImporterVisualPreview(
        __DEV__,
        process.env.EXPO_PUBLIC_IMPORTER_VISUAL_PREVIEW,
      )
    ) {
      setChecking(false);
      return;
    }
    let alive = true;
    async function check() {
      try {
        const { data } = await supabase!.auth.getUser();
        if (alive) setAuthenticated(Boolean(data.user));
        const profile = data.user
          ? await supabase!
              .from("profiles")
              .select("role")
              .eq("id", data.user.id)
              .single()
          : null;
        if (alive)
          setBlocked(
            Boolean(
              data.user &&
              (profile?.error || profile?.data?.role !== "importer"),
            ),
          );
      } catch {
        if (alive) setBlocked(true);
      } finally {
        if (alive) setChecking(false);
      }
    }
    if (!supabase) {
      setChecking(false);
      return;
    }
    void check();
    const { data } = supabase.auth.onAuthStateChange(() => {
      setChecking(true);
      setTimeout(() => void check(), 0);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  if (!fontsLoaded)
    return <View style={{ flex: 1, backgroundColor: "#07070a" }} />;
  if (
    __DEV__ &&
    isImporterVisualPreview(
      __DEV__,
      process.env.EXPO_PUBLIC_IMPORTER_VISUAL_PREVIEW,
    )
  ) {
    const VisualPreview = require("../dev/visual-preview").default;
    return <VisualPreview />;
  }
  if (checking)
    return (
      <View>
        <Text>Verificando cuenta…</Text>
      </View>
    );
  if (blocked)
    return (
      <View style={{ padding: 32 }}>
        <Text>
          La aplicación móvil está destinada al importador. Gestioná tu cuenta
          de operador o administración desde la web.
        </Text>
        <Button
          title="Cerrar sesión"
          onPress={() => void supabase?.auth.signOut()}
        />
      </View>
    );
  if (!authenticated && segments[0] !== "login")
    return <Redirect href="/login" />;
  if (authenticated && segments[0] === "login")
    return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
