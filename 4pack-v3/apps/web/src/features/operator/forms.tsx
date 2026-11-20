"use client";
import type { CapacitySnapshot } from "../capacity/types";
import { QuoteEditor } from "./quote-editor";
import { proposeVolume } from "./actions";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useId,
  useTransition,
} from "react";
import type { ReactNode, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { operatorAction, documentUrl } from "./actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ActionResult, Cargo, DocumentRecord } from "./types";
import { money, modeLabel } from "./types";
import { phaseLabels } from "@4pack/domain";
import { Icon } from "./ui";
import { Drawer } from "./drawer";
const initial: ActionResult = { ok: false, message: "" };
export function ActionForm({
  demo,
  command,
  children,
  label = "Guardar cambios",
  confirm = false,
  reset = false,
  className = "",
  summary,
  variant = "primary",
}: {
  demo: boolean;
  command: string;
  children: ReactNode;
  label?: string;
  confirm?: boolean;
  reset?: boolean;
  className?: string;
  summary?: ReactNode;
  variant?: "primary" | "secondary" | "destructive";
}) {
  const [state, action, pending] = useActionState(
    operatorAction.bind(null, demo, command),
    initial,
  );
  const form = useRef<HTMLFormElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const confirmed = useRef(false);
  const id = useId();
  const [review, setReview] = useState<[string, string][]>([]);
  useEffect(() => {
    if (state.ok && reset) form.current?.reset();
    if (state.message)
      window.dispatchEvent(
        new CustomEvent("fourpack:notice", { detail: { ok: state.ok } }),
      );
  }, [state, reset]);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirm && !confirmed.current) {
      event.preventDefault();
      const values = [...new FormData(event.currentTarget).entries()]
        .filter(
          ([k, v]) =>
            !["id", "target_type", "replaces_id"].includes(k) &&
            !k.startsWith("$") &&
            typeof v === "string" &&
            v.length > 0,
        )
        .map(
          ([k, v]) =>
            [
              (
                {
                  amount: "Tarifa / importe",
                  days: "Días de entrega",
                  mode: "Modalidad",
                  terms: "Observaciones",
                  documentation: "Documentación",
                  currency: "Moneda",
                  phase: "Nuevo estado",
                } as Record<string, string>
              )[k] ?? k,
              k === "phase"
                ? (phaseLabels[String(v) as keyof typeof phaseLabels] ??
                  "Estado actualizado")
                : k === "mode"
                  ? modeLabel(String(v))
                  : k === "amount"
                    ? money(
                        Number(v),
                        String(
                          new FormData(event.currentTarget).get("currency") ??
                            "USD",
                        ),
                      )
                    : String(v),
            ] as [string, string],
        );
      setReview(values);
      dialog.current?.showModal();
    } else confirmed.current = false;
  }
  return (
    <>
      <form
        id={id}
        ref={form}
        action={action}
        onSubmit={onSubmit}
        className={`op-form ${className}`}
        aria-busy={pending}
      >
        {children}
        {state.message && (
          <div
            key={state.message}
            className={`op-notice ${state.ok ? "success" : "danger"}`}
            role={state.ok ? "status" : "alert"}
            aria-live={state.ok ? "polite" : "assertive"}
          >
            <Icon name={state.ok ? "check" : "alert"} />
            <span>{state.message}</span>
          </div>
        )}
        <button
          className={`op-button ${variant}`}
          disabled={pending}
          type="submit"
        >
          <Icon
            name={
              command === "offer"
                ? "eye"
                : command === "message" || command === "support_message"
                  ? "air"
                  : "check"
            }
          />
          {pending ? "Guardando…" : label}
        </button>
      </form>
      {confirm && (
        <dialog
          ref={dialog}
          className="op-modal"
          aria-labelledby={`${id}-title`}
        >
          <div className="op-modal-head">
            <h2 id={`${id}-title`}>Confirmá los datos</h2>
            <button
              aria-label="Cerrar confirmación"
              className="op-icon-button"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="close" />
            </button>
          </div>
          {summary ?? (
            <p>
              Revisá la información antes de continuar. La acción quedará
              registrada.
            </p>
          )}
          <dl>
            {review.map(([key, value], i) => (
              <div className="op-fact" key={`${key}-${i}`}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="op-modal-actions">
            <button
              className="op-button secondary"
              onClick={() => dialog.current?.close()}
            >
              Volver
            </button>
            <button
              className={`op-button ${variant}`}
              onClick={() => {
                confirmed.current = true;
                dialog.current?.close();
                form.current?.requestSubmit();
              }}
            >
              Confirmar y continuar
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
export function OfferForm({
  demo,
  cargo,
  alreadyOffered,
  capacity,
}: {
  capacity: CapacitySnapshot;
  demo: boolean;
  cargo: Cargo;
  alreadyOffered: boolean;
}) {
  return (
    <aside className="op-quote"><p className="op-caption">TU PRÓXIMO PASO</p><h2>{alreadyOffered ? "Oferta presentada" : "Prepará tu cotización"}</h2>
<Drawer primary={!alreadyOffered} title="Cotizar esta carga" label={alreadyOffered?"Ver cotización presentada":"Cotizar"}>
<p>{cargo.origin} → {cargo.destination} · {cargo.weight_kg} kg · {cargo.volume_m3===null?"Volumen por confirmar":`${cargo.volume_m3} m³`}</p>
      {cargo.volume_m3 === null && (
        <VolumeProposalForm demo={demo} cargoId={cargo.id} />
      )}
      {alreadyOffered ? (
        <p className="op-notice success">
          Tu oferta está presentada y sellada. Podés retirarla o reemplazarla
          desde Mis Ofertas antes del cierre.
        </p>
      ) : (
        <QuoteEditor
          capacity={capacity}
          weight={cargo.weight_kg}
          volume={cargo.volume_m3}
          demo={demo}
          cargoId={cargo.id}
          requestedMode={cargo.preferred_mode}
          deadline={cargo.bidding_deadline}
        />
      )}
    </Drawer></aside>
  );
}
function VolumeProposalForm({
  demo,
  cargoId,
}: {
  demo: boolean;
  cargoId: string;
}) {
  const [state, action, pending] = useActionState(
    proposeVolume.bind(null, demo),
    { ok: false, message: "" },
  );
  return (
    <form action={action} className="op-form">
      <h3>Volumen por confirmar</h3>
      <p>
        El importador todavía no conoce el volumen. Proponé una medición
        estimada para que pueda confirmarla antes de aceptar la oferta.
      </p>
      <input type="hidden" name="cargo_id" value={cargoId} />
      <label>
        Volumen propuesto (m³)
        <input
          name="volume_m3"
          type="number"
          min="0.001"
          max="999999"
          step="0.001"
          required
        />
      </label>
      <button className="op-button secondary" disabled={pending}>
        {pending ? "Enviando…" : "Proponer volumen"}
      </button>
      {state.message && <p role="status">{state.message}</p>}
    </form>
  );
}
export function DocumentButton({
  demo,
  document,
}: {
  demo: boolean;
  document: DocumentRecord;
}) {
  const [result, setResult] = useState<ActionResult>(initial);
  const [pending, start] = useTransition();
  return (
    <div>
      <button
        type="button"
        className="op-button secondary small"
        disabled={pending}
        onClick={() =>
          start(async () => setResult(await documentUrl(demo, document.id)))
        }
      >
        <Icon name="download" />
        {pending ? "Preparando…" : "Abrir documento"}
      </button>
      {result.url && (
        <a
          className="op-download-link"
          href={result.url}
          target="_blank"
          rel="noreferrer"
        >
          Ver {document.original_name} ↗
        </a>
      )}
      {result.message && !result.ok && (
        <p role="alert" className="op-error-text">
          {result.message}
        </p>
      )}
    </div>
  );
}
export function LiveUpdates({
  demo,
  operationId,
}: {
  demo: boolean;
  operationId?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(
    demo ? "Actualización automática activa" : "Conectando…",
  );
  useEffect(() => {
    if (demo) {
      const timer = setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, 5000);
      return () => clearInterval(timer);
    }
    const client = createSupabaseBrowserClient();
    if (!client) return;
    const channel = client.channel(`operator-${operationId ?? "panel"}`);
    for (const table of [
      "messages",
      "tracking_events",
      "support_messages",
      "offers",
      "operator_profiles",
    ])
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(operationId && ["messages", "tracking_events"].includes(table)
            ? { filter: `operation_id=eq.${operationId}` }
            : {}),
        },
        () => router.refresh(),
      );
    channel.subscribe((state) =>
      setStatus(
        state === "SUBSCRIBED"
          ? "Actualización en tiempo real"
          : state === "CHANNEL_ERROR"
            ? "Conexión interrumpida · reintentando"
            : "Conectando…",
      ),
    );
    return () => {
      void client.removeChannel(channel);
    };
  }, [demo, operationId, router]);
  return (
    <span className="op-live" role="status" aria-live="polite">
      <i />
      {status}
    </span>
  );
}
export function MarkRead({ demo, id }: { demo: boolean; id: string }) {
  useEffect(() => {
    const form = new FormData();
    form.set("id", id);
    void operatorAction(demo, "read", initial, form);
  }, [demo, id]);
  return null;
}
export function MessageList({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({
      top: ref.current.scrollHeight,
      behavior: "smooth",
    });
  }, [children]);
  return (
    <div
      className="op-messages"
      ref={ref}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {children}
    </div>
  );
}
export function MoneySummary({ amount }: { amount: number }) {
  return <strong className="mono">{money(amount)}</strong>;
}
