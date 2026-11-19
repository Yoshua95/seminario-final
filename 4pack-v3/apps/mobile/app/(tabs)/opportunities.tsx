import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { loadOpenCargos, type MobileCargo } from "../../lib/dashboard";
import { Page, Card, Copy, Action, Tag, s } from "../../features/importer/ui";
export default function OpportunitiesScreen() {
  const [cargos, setCargos] = useState<MobileCargo[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const refresh = useCallback(() => {
    setLoading(true);
    setError("");
    void loadOpenCargos()
      .then(setCargos)
      .catch(() =>
        setError(
          "No pudimos cargar tus solicitudes. Deslizá hacia abajo para reintentar.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  return (
    <Page
      title="Cargas abiertas"
      kicker="TUS SOLICITUDES"
      subtitle="Todo lo que publicaste y todavía podés comparar."
      loading={loading}
      error={error}
      onRefresh={refresh}
    >
      <Action
        label="Publicar carga"
        icon="add"
        onPress={() => router.push("/cargo/new")}
      />
      {cargos.map((c) => (
        <Card key={c.id}>
          <Tag tone={c.hazmatReviewRequired ? "yellow" : "brand"}>
            {c.hazmatReviewRequired
              ? "HAZMAT · MSDS vinculado"
              : "Licitación abierta"}
          </Tag>
          <Copy style={s.section}>{c.title}</Copy>
          <Copy muted>{c.route}</Copy>
          <Copy muted style={{ fontSize: 12 }}>
            {c.weightKg} kg ·{" "}
            {c.volumeM3 === null ? "Volumen desconocido" : `${c.volumeM3} m³`} ·{" "}
            {c.offerCount ?? 0} ofertas
          </Copy>
          <Action
            secondary
            label="Ver ofertas"
            onPress={() => router.push(`/cargo/${c.id}`)}
          />
        </Card>
      ))}
      {!loading && !cargos.length && (
        <Card>
          <Copy style={s.section}>Tu primera carga empieza acá</Copy>
          <Copy muted>
            Publicá una solicitud para recibir propuestas privadas de
            operadores.
          </Copy>
        </Card>
      )}
    </Page>
  );
}
