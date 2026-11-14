import { phaseLabels } from "@4pack/domain";
import type { ReactNode } from "react";
export function Icon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const paths: Record<string, ReactNode> = {
    cargo: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
      </>
    ),
    offers: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    wallet: (
      <>
        <path d="M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v11H5a3 3 0 0 1-3-3V6" />
        <path d="M20 12h-5v5h5M17 14.5h.01" />
      </>
    ),
    support: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="m5.6 5.6 3.6 3.6m5.6 5.6 3.6 3.6m0-12.8-3.6 3.6m-5.6 5.6-3.6 3.6" />
      </>
    ),
    anchor: (
      <>
        <circle cx="12" cy="4" r="2" />
        <path d="M12 6v15M5 11H2a10 10 0 0 0 20 0h-3M8 12h8" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V6a4 4 0 0 1 8 0v4" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    eye: (
      <>
        <path d="m3 3 18 18M10 5c7-1 12 7 12 7a17 17 0 0 1-4 4M6 6a18 18 0 0 0-4 6s4 7 10 7a13 13 0 0 0 5-1" />
        <path d="M9 9a4 4 0 0 0 6 6" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    weight: (
      <>
        <path d="M5 8h14l3 13H2L5 8Z" />
        <circle cx="12" cy="5" r="3" />
      </>
    ),
    volume: (
      <>
        <path d="M3 8V3h5m8 0h5v5m0 8v5h-5M8 21H3v-5M8 8h8v8H8Z" />
      </>
    ),
    ship: (
      <>
        <path d="M5 13V6h14v7M12 2v4m0 4v5M2 14l10-4 10 4-3 6H5Z" />
        <path d="M2 22q3-4 6 0 4-4 8 0 3-4 6 0" />
      </>
    ),
    air: (
      <>
        <path d="m22 2-7 20-4-9-9-4 20-7ZM11 13l5-5" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    alert: (
      <>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v5m0 3v.1" />
      </>
    ),
    star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" />,
    profile: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M4 22v-3a8 8 0 0 1 16 0v3" />
      </>
    ),
    menu: <path d="M3 6h18M3 12h18M3 18h18" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
    logout: (
      <>
        <path d="M9 4H3v16h6m5-13 5 5-5 5M7 12h12" />
      </>
    ),
    operations: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V3h8v4M3 12h18M10 12v3h4v-3" />
      </>
    ),
  };
  return (
    <svg
      className={`op-icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.cargo}
    </svg>
  );
}
const labels: Record<string, string> = {
  submitted: "Presentada",
  under_review: "Bajo revisión",
  awarded: "Adjudicada",
  accepted: "Adjudicada",
  rejected: "Rechazada",
  expired: "Vencida",
  withdrawn: "Cancelada",
  pending: "Pendiente",
  approved: "Aprobado",
  suspended: "Suspendido",
  open: "Abierta",
  waiting_user: "Espera tu respuesta",
  resolved: "Resuelto",
  closed: "Cerrado",
  held_simulated: "Retenida · simulación",
  released_simulated: "Liberada · simulación",
  requested: "Solicitado",
  delivered: "Entregada",
  payment_pending: "Pago pendiente",
  payment_secured: "Garantía confirmada",
  received_at_origin: "Recibida en origen",
  in_transit: "En tránsito",
  customs: "En aduana",
  ready_for_delivery: "Lista para entrega",
  ...phaseLabels,
};
export function Badge({
  status,
  children,
}: {
  status?: string;
  children?: ReactNode;
}) {
  const color =
    status &&
    [
      "approved",
      "awarded",
      "accepted",
      "completed",
      "delivered",
      "released_simulated",
      "resolved",
      "payment_secured",
      "received_at_origin",
      "in_transit",
      "customs",
      "ready_for_delivery",
      "in_progress",
    ].includes(status)
      ? "green"
      : status &&
          ["rejected", "suspended", "disputed", "cancelled"].includes(status)
        ? "red"
        : status &&
            [
              "pending",
              "under_review",
              "held_simulated",
              "payment_pending",
              "waiting_user",
            ].includes(status)
          ? "amber"
          : "";
  return (
    <span className={`op-badge ${color}`}>
      {children ?? labels[status ?? ""] ?? status}
    </span>
  );
}
export function Hazmat() {
  return (
    <span className="op-badge amber mono">
      <Icon name="alert" /> HAZMAT
    </span>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="op-empty">
      <span className="op-icon-box">
        <Icon name="cargo" />
      </span>
      <h3>{title}</h3>
      <p>{children ?? "Los nuevos registros aparecerán en esta sección."}</p>
    </div>
  );
}
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="op-page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Fact({
  label,
  children,
  icon,
}: {
  label: string;
  children: ReactNode;
  icon?: string;
}) {
  return (
    <div className="op-fact">
      <span>
        {icon && <Icon name={icon} />} {label}
      </span>
      <strong>{children}</strong>
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="op-loading" role="status" aria-label="Cargando panel">
      <div className="op-skeleton op-skeleton-title" />
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="op-skeleton" />
      ))}
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
