"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Profile = {
  full_name: string;
  role: "importer" | "operator" | "admin";
};

const roleLabels: Record<Profile["role"], string> = {
  importer: "Importador",
  operator: "Operador logístico",
  admin: "Administrador"
};

export function SessionProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;

      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", data.user.id)
        .single<Profile>();

      setProfile(currentProfile);
    });
  }, []);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.replace("/acceso");
    router.refresh();
  }

  const name = profile?.full_name ?? "Cuenta 4PACK";
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="profile">
      <div className="avatar">{initials}</div>
      <div className="profile-copy">
        <Link href="/perfil"><strong>{name}</strong></Link>
        <small>{profile ? roleLabels[profile.role] : "Sesión segura"}</small>
        <button onClick={signOut} type="button">Cerrar sesión</button>
      </div>
    </div>
  );
}
