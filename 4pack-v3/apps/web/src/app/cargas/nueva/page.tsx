import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { NewCargoForm } from "@/components/new-cargo-form";
import { getCurrentRole } from "@/lib/dashboard-data";

export default async function NewCargoPage() {
  const role = await getCurrentRole();
  if (role !== "importer") redirect("/");

  return (
    <DashboardShell active="opportunities">
      <header><div><p className="eyebrow">NUEVA SOLICITUD</p><h1>Publicar una carga</h1><p>Ingresá los datos necesarios para recibir ofertas comparables.</p></div></header>
      <NewCargoForm />
    </DashboardShell>
  );
}
