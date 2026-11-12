import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { OperatorReviewList } from "@/components/operator-review-list";
import { getCurrentRole, getOperatorReviews } from "@/lib/dashboard-data";

export default async function OperatorAdminPage() {
  const role = await getCurrentRole();
  if (role !== "admin") redirect("/");
  const operators = await getOperatorReviews();

  return (
    <DashboardShell active="profile">
      <header><div><p className="eyebrow">CONTROL ADMINISTRATIVO</p><h1>Validación de operadores</h1><p>Revisá la identidad comercial antes de habilitar cotizaciones.</p></div></header>
      <OperatorReviewList operators={operators} />
    </DashboardShell>
  );
}
