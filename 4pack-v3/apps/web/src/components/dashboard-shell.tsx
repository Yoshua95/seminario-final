import Link from "next/link";
import type { ReactNode } from "react";
import { SessionProfile } from "@/components/session-profile";

const navigation = [
  { key: "opportunities", href: "/", label: "Oportunidades" },
  { key: "offers", href: "/ofertas", label: "Mis ofertas" },
  { key: "operations", href: "/operaciones", label: "Operaciones" },
  { key: "documents", href: "/documentos", label: "Documentos" },
  { key: "profile", href: "/perfil", label: "Mi perfil" }
] as const;

export type DashboardSection = (typeof navigation)[number]["key"];

export function DashboardShell({
  active,
  children
}: {
  active: DashboardSection;
  children: ReactNode;
}) {
  return (
    <main className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/">4PACK<span>●</span></Link>
        <nav aria-label="Navegación principal">
          {navigation.map((item) => (
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
