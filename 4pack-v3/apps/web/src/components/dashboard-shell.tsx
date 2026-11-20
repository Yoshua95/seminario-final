import { BrandMark } from "./brand-mark";
import Link from "next/link";
import type { ReactNode } from "react";
import { SessionProfile } from "@/components/session-profile";
import { getCurrentRole } from "@/lib/dashboard-data";

const navigation = [
  {
    key: "capacity",
    href: "/admin/capacidad",
    label: "Capacidad",
    adminOnly: true,
  },
  { key: "operators", href: "/operadores", label: "Operadores" },
  { key: "opportunities", href: "/", label: "Oportunidades" },
  { key: "offers", href: "/ofertas", label: "Mis ofertas" },
  { key: "operations", href: "/operaciones", label: "Operaciones" },
  { key: "documents", href: "/documentos", label: "Documentos" },
  { key: "profile", href: "/perfil", label: "Mi perfil" },
  { key: "admin", href: "/admin", label: "Administración", adminOnly: true },
] as const;
const adminNavigation = [
  { key: "admin", href: "/admin", label: "Inicio" },
  { key: "operators", href: "/admin/operadores", label: "Operadores" },
  { key: "operations", href: "/admin/operaciones", label: "Operaciones" },
  { key: "claims", href: "/admin/reclamos", label: "Reclamos" },
  { key: "importers", href: "/admin/importadores", label: "Importadores" },
  { key: "profile", href: "/admin/perfil", label: "Mi perfil" },
];

export type DashboardSection = (typeof navigation)[number]["key"];

export async function DashboardShell({
  active,
  children,
}: {
  active: DashboardSection;
  children: ReactNode;
}) {
  const role = await getCurrentRole();
  return (
    <main className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <BrandMark />
        </Link>
        <nav aria-label="Navegación principal">
          {(role === "admin"
            ? adminNavigation
            : navigation.filter((item) => !("adminOnly" in item))
          ).map((item) => (
            <Link
              className={item.key === active ? "active" : undefined}
              href={item.href}
              key={item.key}
            >
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
