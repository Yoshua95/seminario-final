import { CargoFormView } from "../../features/importer/views";
import * as DocumentPicker from "expo-document-picker";
import { randomUUID } from "expo-crypto";
import type { NativeMsds } from "../../lib/cargo-publication";
import { requiresHazmatReview, type TransportMode } from "@4pack/domain";
import { router, Stack } from "expo-router";
import { useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { createCargo } from "../../lib/dashboard";

type Fields = {
  title: string;
  description: string;
  origin: string;
  destination: string;
  category: string;
  weight: string;
  volume: string;
  fob: string;
};
const initialFields: Fields = {
  title: "",
  description: "",
  origin: "",
  destination: "",
  category: "",
  weight: "",
  volume: "",
  fob: "",
};
const modes: Array<{ value: TransportMode; label: string }> = [
  { value: "air", label: "Aéreo" },
  { value: "sea", label: "Marítimo" },
  { value: "consolidated", label: "Consolidado" },
];

export default function NewCargoScreen() {
  const [fields, setFields] = useState(initialFields);
  const [msds, setMsds] = useState<NativeMsds | null>(null);
  const [volumeUnknown, setVolumeUnknown] = useState(false);
  const attempt = useRef({ requestId: randomUUID(), uploadId: randomUUID() });
  const requiresMsds = requiresHazmatReview(
    `${fields.title} ${fields.description} ${fields.category}`,
  );
  async function pickMsds() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setMsds({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? "application/pdf",
        size: asset.size ?? 0,
      });
      attempt.current.uploadId = randomUUID();
    } catch {
      setError("No se pudo abrir el selector de archivos.");
    }
  }
  const [mode, setMode] = useState<TransportMode>("sea");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof Fields) => (value: string) => {
    attempt.current = { requestId: randomUUID(), uploadId: randomUUID() };
    setFields((current) => ({ ...current, [key]: value }));
  };

  async function publish() {
    const weightKg = Number(fields.weight.replace(",", "."));
    const volumeM3 = volumeUnknown
      ? null
      : Number(fields.volume.replace(",", "."));
    const fobUsd = Number(fields.fob.replace(",", "."));
    if (
      Object.entries(fields).some(
        ([key, value]) => !(volumeUnknown && key === "volume") && !value.trim(),
      ) ||
      !Number.isFinite(weightKg) ||
      weightKg <= 0 ||
      (!volumeUnknown && (!Number.isFinite(volumeM3) || volumeM3! <= 0)) ||
      !Number.isFinite(fobUsd) ||
      fobUsd < 0
    ) {
      setError("Completá todos los campos con valores válidos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const id = await createCargo(
        {
          title: fields.title.trim(),
          description: fields.description.trim(),
          origin: fields.origin.trim(),
          destination: fields.destination.trim(),
          category: fields.category.trim(),
          weightKg,
          volumeM3,
          fobUsd,
          preferredMode: mode,
        },
        attempt.current,
        msds,
      );
      router.replace(`/cargo/${id}`);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No pudimos publicar la carga. Verificá tu rol y la conexión.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CargoFormView
        fields={fields}
        volumeUnknown={volumeUnknown}
        onVolumeUnknown={(value) => {
          attempt.current = { requestId: randomUUID(), uploadId: randomUUID() };
          setVolumeUnknown(value);
        }}
        onChange={(key, value) => update(key)(value)}
        mode={mode}
        onMode={(value) => {
          attempt.current = { requestId: randomUUID(), uploadId: randomUUID() };
          setMode(value);
        }}
        requiresMsds={requiresMsds}
        fileName={msds?.name}
        onPick={() => void pickMsds()}
        onPublish={() => void publish()}
        loading={loading}
        error={error}
        onBack={() => router.back()}
      />
    </>
  );
}
