import Link from "next/link";
import type { ReactNode } from "react";
import { SessionProfile } from "@/components/session-profile";
import { getCurrentRole } from "@/lib/dashboard-data";

const navigation = [
  { key: "opportunities", href: "/", label: "Oportunidades" },
  { key: "offers", href: "/ofertas", label: "Mis ofertas" },
  { key: "operations", href: "/operaciones", label: "Operaciones" },
  { key: "documents", href: "/documentos", label: "Documentos" },
  { key: "profile", href: "/perfil", label: "Mi perfil" },
  { key: "admin", href: "/admin", label: "Administración", adminOnly: true }
] as const;

export type DashboardSection = (typeof navigation)[number]["key"];

export async function DashboardShell({
  active,
  children
}: {
  active: DashboardSection;
  children: ReactNode;
}) {
  const role = await getCurrentRole();
  return (
    <main className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/">4PACK<span>●</span></Link>
        <nav aria-label="Navegación principal">
          {navigation.filter((item) => !("adminOnly" in item) || role === "admin").map((item) => (
            <Link className={item.key === active ? "active" : undefined} href={item.href} key={item.key}>
              {item.label}
            </Link>
          ))}
        </nav>
        <SessionProfile />
      </aside>
      <section className="content">{children}</section>
    </main>
  );
}
