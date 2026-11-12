import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function Index() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthenticated(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => setAuthenticated(Boolean(data.session)));
  }, []);

  if (authenticated === null) {
    return <View style={styles.loading}><ActivityIndicator color="#F59E0B" /></View>;
  }

  return <Redirect href={authenticated ? "/(tabs)" : "/login"} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#07070A" }
});
