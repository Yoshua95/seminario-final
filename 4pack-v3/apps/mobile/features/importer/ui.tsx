import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import type { ReactNode } from "react";
import { useState } from "react";
export const colors = {
  bg: "#07070a",
  card: "#171718",
  secondary: "#202021",
  line: "#303033",
  text: "#f4f4f5",
  muted: "#b1b1ba",
  brand: "#ff762e",
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#fb7185",
};
export function Copy({
  children,
  muted = false,
  style,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: object;
}) {
  return (
    <Text style={[s.copy, muted && { color: colors.muted }, style]}>
      {children}
    </Text>
  );
}
export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={s.title}>
      {children}
    </Text>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
export function Tag({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "yellow" | "brand";
}) {
  return (
    <View
      style={[
        s.tag,
        {
          borderColor: colors[tone] + "55",
          backgroundColor: colors[tone] + "15",
        },
      ]}
    >
      <Text style={[s.tagText, { color: colors[tone] }]}>{children}</Text>
    </View>
  );
}
export function Action({
  label,
  onPress,
  secondary = false,
  disabled = false,
  icon = "arrow-forward",
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.action,
        secondary && s.actionSecondary,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[s.actionText, secondary && { color: colors.text }]}>
        {label}
      </Text>
      <Ionicons
        name={icon}
        size={19}
        color={secondary ? colors.text : colors.bg}
      />
    </TouchableOpacity>
  );
}
export function LinkAction({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={s.link}
    >
      <Copy style={{ color: colors.brand }}>{label}</Copy>
      <Ionicons name="chevron-forward" size={16} color={colors.brand} />
    </TouchableOpacity>
  );
}
export function Field({
  label,
  value,
  onChange,
  number = false,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  number?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Copy muted style={s.label}>
        {label}
      </Copy>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={number ? "decimal-pad" : "default"}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor="#73737f"
        selectionColor={colors.brand}
        style={[
          s.input,
          focused && { borderColor: colors.brand },
          multiline && { minHeight: 88, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
export function Page({
  children,
  title,
  kicker = "IMPORTADOR",
  subtitle,
  error,
  loading,
  back,
  onRefresh,
}: {
  children: ReactNode;
  title: string;
  kicker?: string;
  subtitle?: string;
  error?: string;
  loading?: boolean;
  back?: () => void;
  onRefresh?: () => void;
}) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.page}
        refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(loading)} onRefresh={onRefresh} tintColor={colors.brand}/> : undefined}
      >
        <View style={s.header}>
          <View style={s.brand}>
            <View style={s.brandIcon}>
              <Ionicons name="cube-outline" color={colors.brand} size={20} />
            </View>
            <Text style={s.wordmark}>
              4PACK<Text style={{ color: colors.brand }}>●</Text>
            </Text>
          </View>
          {back && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={back}
              style={s.back}
            >
              <Ionicons name="arrow-back" color={colors.text} size={20} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={s.kicker}>{kicker}</Text>
        <Heading>{title}</Heading>
        {subtitle && <Copy muted>{subtitle}</Copy>}
        {error && (
          <View accessibilityRole="alert" style={s.error}>
            <Copy style={{ color: colors.red }}>{error}</Copy>
          </View>
        )}
        {loading && <ActivityIndicator color={colors.brand} />}
        <View style={{ height: 4 }} />
        {children}
        <Copy muted style={s.footer}>
          4PACK · Tu logística, en un solo lugar
        </Copy>
      </ScrollView>
    </SafeAreaView>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 22, paddingBottom: 32, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandIcon: {
    borderWidth: 1,
    borderColor: "#ff762e40",
    backgroundColor: "#ff762e12",
    padding: 9,
    borderRadius: 10,
  },
  wordmark: {
    fontFamily: "Geist",
    fontWeight: "900",
    fontSize: 24,
    letterSpacing: -1,
    color: colors.text,
  },
  kicker: {
    fontFamily: "Geist",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: colors.brand,
  },
  title: {
    fontFamily: "Geist",
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -1,
    color: colors.text,
  },
  copy: {
    fontFamily: "Geist",
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  card: {
    padding: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    gap: 13,
  },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: 20,
  },
  tagText: { fontFamily: "Geist", fontSize: 11, fontWeight: "600" },
  action: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  actionSecondary: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.line,
  },
  actionText: {
    fontFamily: "Geist",
    fontSize: 14,
    fontWeight: "700",
    color: colors.bg,
    flexShrink: 1,
  },
  link: {
    minHeight: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  input: {
    fontFamily: "Geist",
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 9,
    backgroundColor: colors.secondary,
    color: colors.text,
    padding: 14,
    fontSize: 14,
    minHeight: 50,
  },
  label: { fontSize: 12, fontWeight: "600" },
  back: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
  },
  error: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#fb718515",
    borderWidth: 1,
    borderColor: "#fb718540",
  },
  footer: { fontSize: 11, textAlign: "center", marginTop: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  price: {
    fontFamily: "Geist",
    fontSize: 27,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.8,
  },
  section: {
    fontFamily: "Geist",
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  divider: { height: 1, backgroundColor: colors.line },
});
