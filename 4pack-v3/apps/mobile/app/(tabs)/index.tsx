import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  loadOperations,
  loadOpenCargos,
  loadLastMilestone,
  type MobileOperation,
  type MobileCargo,
} from "../../lib/dashboard";
import { HomeView } from "../../features/importer/views";
import { homeAction } from "../../lib/journey";
export default function HomeScreen() {
  const [operation, setOperation] = useState<MobileOperation | null>(null),
    [cargo, setCargo] = useState<MobileCargo | null>(null),
    [last, setLast] = useState<{ title: string; location: string } | null>(
      null,
    ),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      setError("");
      void Promise.all([loadOperations(), loadOpenCargos()])
        .then(async ([ops, cargos]) => {
          const active =
              ops.find(
                (o) => !["completed", "cancelled", "failed"].includes(o.phase),
              ) ?? null,
            open = cargos[0] ?? null;
          if (!alive) return;
          setOperation(active);
          setCargo(open);
          if (active) {
            const event = await loadLastMilestone(active.id);
            if (alive) setLast(event);
          } else setLast(null);
        })
        .catch(() => {
          if (alive)
            setError(
              "No pudimos actualizar tu recorrido. Volvé a abrir Inicio para reintentar.",
            );
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
      return () => {
        alive = false;
      };
    }, []),
  );
  const action = homeAction(operation, cargo);
  return (
    <HomeView
      operation={operation}
      cargo={cargo}
      lastMilestone={last}
      loading={loading}
      error={error}
      onNew={() => router.push("/cargo/new")}
      onOffers={() => action.id && router.push(`/cargo/${action.id}`)}
      onTrack={() => operation && router.push(`/operation/${operation.id}`)}
    />
  );
}
