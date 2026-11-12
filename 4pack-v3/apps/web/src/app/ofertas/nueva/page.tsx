import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { NewOfferForm } from "@/components/new-offer-form";
import { getCurrentRole, getOpenCargoRequests } from "@/lib/dashboard-data";

export default async function NewOfferPage() {
  const [role, cargoOptions] = await Promise.all([getCurrentRole(), getOpenCargoRequests()]);
  if (role !== "operator") redirect("/");

  return (
    <DashboardShell active="offers">
      <header><div><p className="eyebrow">NUEVA PROPUESTA</p><h1>Cotizar una carga</h1><p>Presentá costos y plazos comparables para una solicitud abierta.</p></div></header>
      <NewOfferForm cargoOptions={cargoOptions} />
    </DashboardShell>
  );
}
