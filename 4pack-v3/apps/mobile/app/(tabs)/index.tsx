import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { loadOperations, type MobileOperation } from "../../lib/dashboard";
import { HomeView } from "../../features/importer/views";
export default function HomeScreen() {
  const [operation, setOperation] = useState<MobileOperation | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLoading(true);
      setError("");
      loadOperations()
        .then((rows) => {
          if (alive)
            setOperation(
              rows.find(
                (o) => !["completed", "cancelled", "failed"].includes(o.phase),
              ) ?? null,
            );
        })
        .catch(() => {
          if (alive) setError("No se pudo cargar la operacion activa.");
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
      return () => {
        alive = false;
      };
    }, []),
  );
  return (
    <HomeView
      operation={operation}
      loading={loading}
      error={error}
      onNew={() => router.push("/cargo/new")}
      onTrack={() =>
        operation &&
        router.push({
          pathname: "/operation/[operationId]",
          params: { operationId: operation.id },
        })
      }
    />
  );
}
