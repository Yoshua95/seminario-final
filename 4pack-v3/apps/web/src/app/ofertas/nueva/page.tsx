import { redirect } from "next/navigation";
import { getCurrentRole } from "@/lib/dashboard-data";

export default async function NewOfferPage() {
  const role = await getCurrentRole();
  if (role !== "operator") redirect("/");

  redirect("/operador/oportunidades");
}
