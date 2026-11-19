import { OffersView } from "../../features/importer/views";
import {
  acceptOfferAndPay,
  CheckoutAfterAwardError,
} from "../../lib/accept-and-pay";
import { testPayment } from "../../lib/test-payments";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import {
  loadCargoDetail,
  loadImporterOffers,
  loadCargoOperation,
  awardImporterOffer,
  confirmCargoVolume,
  type MobileCargoDetail,
} from "../../lib/dashboard";
import {
  compareImporterOffers,
  type ImporterOffer,
} from "../../lib/importer-flow";
export default function CargoDetailScreen() {
  const { cargoId } = useLocalSearchParams<{ cargoId: string }>();
  const [cargo, setCargo] = useState<MobileCargoDetail | null>(null),
    [offers, setOffers] = useState<ImporterOffer[]>([]);
  const [operation, setOperation] = useState<string | undefined>(),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [details, setDetails] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, o, op] = await Promise.all([
        loadCargoDetail(cargoId),
        loadImporterOffers(cargoId),
        loadCargoOperation(cargoId),
      ]);
      setCargo(c);
      setOffers(o);
      setOperation(op);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo cargar la licitacion.",
      );
    } finally {
      setLoading(false);
    }
  }, [cargoId]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function award(id: string) {
    setBusy(true);
    setError("");
    try {
      const payment = await acceptOfferAndPay(id, {
        award: (id) => awardImporterOffer(id, "checkout-test"),
        checkout: (id) => testPayment(id, "checkout"),
      });
      const op = payment.operationId;
      setOperation(op);
      if (payment.checkoutUrl) {
        const { openBrowserAsync } = await import("expo-web-browser");
        await openBrowserAsync(payment.checkoutUrl);
      }
      router.push({
        pathname: "/operation/[operationId]",
        params: { operationId: op },
      });
    } catch (e) {
      if (e instanceof CheckoutAfterAwardError) {
        setOperation(e.operationId);
        setError(
          "La oferta fue aceptada. " +
            e.message +
            " Abrí el seguimiento para reintentar el pago en la misma operación.",
        );
        return;
      }
      setError(e instanceof Error ? e.message : "No se pudo adjudicar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <OffersView
        cargo={cargo}
        onRefresh={() => void refresh()}
        title={cargo?.title ?? "Mi carga"}
        route={cargo?.route ?? ""}
        offers={offers}
        operationId={operation}
        loading={loading}
        busy={busy}
        error={error}
        onBack={() => router.back()}
        onConfirmVolume={(id, volume) => {
          setBusy(true);
          setError("");
          void confirmCargoVolume(id, volume)
            .then(() => refresh())
            .catch((e) =>
              setError(e.message ?? "No pudimos confirmar el volumen."),
            )
            .finally(() => setBusy(false));
        }}
        onTrack={() =>
          operation &&
          router.push({
            pathname: "/operation/[operationId]",
            params: { operationId: operation },
          })
        }
        onAward={(id) =>
          Alert.alert(
            "Aceptar oferta y pagar",
            "Se creará una operación en ARS y se abrirá Mercado Pago en modo de prueba. El backend debe verificar el pago; volver del checkout no lo aprueba.",
            [
              { text: "Volver", style: "cancel" },
              { text: "Aceptar oferta y pagar", onPress: () => void award(id) },
            ],
          )
        }
      />
    </>
  );
}
