import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { ProfileForm } from "@/components/profile-form";
import { getAccountProfile } from "@/lib/dashboard-data";

export default async function ProfilePage() {
  const profile = await getAccountProfile();
  if (!profile) redirect("/acceso");

  return (
    <DashboardShell active="profile">
      <header><div><p className="eyebrow">CUENTA 4PACK</p><h1>Mi perfil</h1><p>Datos personales y comerciales visibles dentro de la plataforma.</p></div></header>
      <ProfileForm profile={profile} />
    </DashboardShell>
  );
}
