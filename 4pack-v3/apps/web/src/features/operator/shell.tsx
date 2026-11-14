"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { Company, Profile } from "./types";
import { Icon, Badge } from "./ui";
import { signOutOperator } from "./actions";
const navigation = [
  ["oportunidades", "Cargas Disponibles", "cargo"],
  ["mis-ofertas", "Mis Ofertas", "offers"],
  ["operaciones", "Operaciones", "operations"],
  ["historial", "Historial", "history"],
  ["billetera", "Mi Billetera", "wallet"],
  ["documentos", "Documentos", "offers"],
  ["soporte", "Soporte", "support"],
  ["perfil", "Perfil Empresarial", "profile"],
];
export function OperatorShell({
  company,
  profile,
  demo,
  unread,
  previewDemo = false,
  children,
}: {
  company: Company;
  profile: Profile;
  demo: boolean;
  unread: number;
  previewDemo?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const panel = sidebar.current;
    const focusable = () => [
      ...(panel?.querySelectorAll<HTMLElement>(
        "a[href],button:not([disabled])",
      ) ?? []),
    ];
    focusable()[0]?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menu.current?.focus();
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [open]);
  const [toast, setToast] = useState<{ ok: boolean } | null>(null);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handler = (event: Event) => {
      setToast((event as CustomEvent<{ ok: boolean }>).detail);
      clearTimeout(timeout);
      timeout = setTimeout(() => setToast(null), 5000);
    };
    window.addEventListener("fourpack:notice", handler);
    return () => {
      window.removeEventListener("fourpack:notice", handler);
      clearTimeout(timeout);
    };
  }, []);
  const base = demo ? "/demo/operador" : "/operador";
  const initials = company.company_name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <div className="op-app">
      <a className="op-skip-link" href="#operator-content">
        Saltar al contenido
      </a>
      {open && (
        <button
          aria-label="Cerrar navegación"
          className="op-scrim"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sidebar}
        id="operator-navigation"
        className={`op-sidebar ${open ? "is-open" : ""}`}
      >
        {open && (
          <button
            className="op-mobile-close op-icon-button"
            aria-label="Cerrar menú"
            onClick={() => {
              setOpen(false);
              menu.current?.focus();
            }}
          >
            <Icon name="close" />
          </button>
        )}
        <Link href={`${base}/oportunidades`} className="op-brand">
          <span className="op-brand-icon">
            <Icon name="anchor" />
          </span>
          <span>
            <strong>
              4PACK<span className="op-brand-dot">●</span>
            </strong>
            <small>Operador Logístico</small>
          </span>
        </Link>
        <nav aria-label="Panel del operador">
          <p className="op-nav-caption">PANEL</p>
          {navigation.map(([key, label, icon]) => {
            const enabled =
              company.verification_status === "approved" ||
              ["perfil", "documentos", "soporte"].includes(key);
            return enabled ? (
              <Link
                onClick={() => setOpen(false)}
                key={key}
                href={`${base}/${key}`}
                aria-current={pathname.includes(`/${key}`) ? "page" : undefined}
              >
                <Icon name={icon} />
                <span>{label}</span>
                {key === "operaciones" && unread > 0 && (
                  <span className="op-unread">{unread}</span>
                )}
              </Link>
            ) : (
              <span className="op-nav-disabled" key={key}>
                <Icon name={icon} />
                <span>{label}</span>
                <Icon name="lock" />
              </span>
            );
          })}
        </nav>
        <div className="op-sidebar-footer">
          <Link href={`${base}/perfil`} className="op-company">
            <span className="op-avatar">{initials}</span>
            <span>
              <strong>{company.company_name}</strong>
              <small>
                {company.verification_status === "approved" ? (
                  `Rank: ${Number(company.rating) >= 4.8 ? "Platinum" : Number(company.rating) >= 4.5 ? "Gold" : Number(company.rating) > 0 ? "Silver" : "Sin calificaciones"}`
                ) : (
                  <Badge status={company.verification_status} />
                )}
              </small>
            </span>
          </Link>
          <form action={signOutOperator.bind(null, demo)}>
            <button
              title="Cerrar sesión"
              aria-label={`Cerrar sesión de ${profile.full_name}`}
              className="op-logout"
            >
              <Icon name="logout" />
            </button>
          </form>
        </div>
      </aside>
      <div className="op-main">
        {toast && (
          <div
            className={`op-toast ${toast.ok ? "success" : "danger"}`}
            role="status"
          >
            <Icon name={toast.ok ? "check" : "alert"} />
            <span>
              {toast.ok
                ? "Acción completada"
                : "No pudimos guardar los cambios"}
            </span>
            <button
              className="op-icon-button"
              aria-label="Cerrar notificación"
              onClick={() => setToast(null)}
            >
              <Icon name="close" />
            </button>
          </div>
        )}
        <div className="op-mobile-top">
          <button
            ref={menu}
            aria-label="Abrir navegación"
            aria-expanded={open}
            aria-controls="operator-navigation"
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <strong>
            4PACK<span className="op-brand-dot">●</span>
          </strong>
          <Badge status={company.verification_status} />
        </div>
        {demo && (
          <div className="op-demo-strip">
            <Icon name="shield" />
            <span>
              {previewDemo
                ? "DEMOSTRACIÓN · Datos simulados temporales"
                : "DEMOSTRACIÓN · Datos de prueba locales"}
            </span>
            <Link href="/demo/acceso">Cambiar escenario</Link>
          </div>
        )}
        <main className="op-content" id="operator-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="op-footer">
          <span>4PACK · Mesa de operaciones logísticas</span>
          <span>
            <i />{" "}
            {demo
              ? "Sin cuentas, documentos ni dinero reales"
              : "Entorno seguro"}
          </span>
        </footer>
      </div>
    </div>
  );
}
