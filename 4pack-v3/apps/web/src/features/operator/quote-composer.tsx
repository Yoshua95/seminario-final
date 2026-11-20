"use client";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { initialQuoteSelection, quoteAuthorizationError, type QuoteAuthorization } from "./quote-authorization.mjs";
import {
  serviceTaxonomy,
  validateQuote,
  type NormalizedQuote,
} from "@4pack/domain";
import type { CapacitySnapshot } from "../capacity/types";
import { QuoteTerms } from "../marketplace/quote-terms";
import { operatorAction } from "./actions";
import { localDateTime, money } from "./types";
import {useRouter} from "next/navigation";

export function QuoteComposer({
  demo,
  cargoId,
  draftId,
  replacesOfferId,
  initial = {},
  deadline,
  requestedMode,
  requestedServices,
  authorization,
  chinaPlan,
  warehouses=[],
  argentinaDepots=[],
  initialDestination,
}: {
  demo: boolean;
  cargoId: string;
  draftId?: string;
  replacesOfferId?: string;
  initial?: Partial<NormalizedQuote>;
  deadline?: string | null;
  capacity?: CapacitySnapshot;
  weight?: number;
  volume?: number | null;
  requestedMode?: string | null;
  requestedServices?: string[];
  authorization?: QuoteAuthorization | null;
  chinaPlan?: import("@4pack/domain").ChinaPlan;
  warehouses?: import("@4pack/domain").ChinaWarehouse[];
  argentinaDepots?:import("@4pack/domain").ArgentinaDepot[];
  initialDestination?:import("@4pack/domain").DestinationSummary;
}) {
  const router=useRouter();
  const newDelivery=chinaPlan?.version===2;
  const [argentinaDepotId,setArgentinaDepotId]=useState(argentinaDepots.find(d=>d.active&&d.is_default)?.id??argentinaDepots.find(d=>d.active)?.id??"");
  const [destinationMode,setDestinationMode]=useState<"pickup"|"home">(initialDestination?.agreed_mode??"pickup");
  const [deliveryFee,setDeliveryFee]=useState(String(initialDestination?.delivery_fee??""));
  const canHome=chinaPlan?.destination.delivery_mode==="home"&&authorization?.services.includes("domestic_delivery")&&argentinaDepots.find(d=>d.id===argentinaDepotId)?.delivery_provinces.includes(chinaPlan?.destination.province);
  const home=newDelivery&&destinationMode==="home"&&canHome;
  const [state, action, pending] = useActionState(
    operatorAction.bind(null, demo, "quote"),
    { ok: false, message: "", id: undefined as string | undefined },
  );
  const allowed = authorization ?? (demo ? {modes:["air","sea","consolidated"],services:Object.keys(serviceTaxonomy)} : null);
  const selection = initialQuoteSelection(initial,{mode:requestedMode,services:requestedServices},allowed);
  const [services, setServices] = useState<NormalizedQuote["services"]>(
      selection.services.filter(s=>s!=="origin_pickup") as NormalizedQuote["services"],
    ),
    [search, setSearch] = useState("");
  const [scope, setScope] = useState(initial.scope ?? selection.services.map(s=>serviceTaxonomy[s as keyof typeof serviceTaxonomy] ?? s).join(". ")),
    [scopeEdited, setScopeEdited] = useState(!!initial.scope);
  const [price, setPrice] = useState(
    initialDestination?String(initialDestination.import_fee):initial.currency === "ARS" ? (initial.amount ?? "") : "",
  );
  const [expiry, setExpiry] = useState(
    initial.valid_until
      ? localDateTime(new Date(initial.valid_until)).slice(0, 16)
      : "",
  );
  const [insurance, setInsurance] = useState(
      initial.insurance ?? "Sin seguro incluido",
    ),
    [docs, setDocs] = useState(
      initial.required_documents?.join("\n") ??
        "Packing list\nFactura comercial",
    );
  const [preview, setPreview] = useState<NormalizedQuote | null>(null),
    [error, setError] = useState("");
  const form = useRef<HTMLFormElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    send = useRef<HTMLButtonElement>(null),
    confirmed = useRef(false);
  const submissionInput = useRef<HTMLInputElement>(null);
  const [submissionKey,setSubmissionKey]=useState("");
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(()=>{if(state.ok&&state.message==="Oferta presentada y sellada.")router.replace((demo?"/demo/operador":"/operador")+"/mis-ofertas");},[state,demo,router]);
  useEffect(() => {
    if (!error && (!state.message || state.ok)) return;
    const outer = form.current?.closest<HTMLDialogElement>("dialog.op-drawer");
    if (outer && !outer.open) outer.showModal();
    feedback.current?.focus();
    feedback.current?.scrollIntoView({block:"center"});
  }, [error,state.message,state.ok]);
  const selectedLabels = services.map((s) => serviceTaxonomy[s]);
  function selectService(key: NormalizedQuote["services"][number]) {
    const next = services.includes(key)
      ? services.filter((s) => s !== key)
      : [...services, key];
    setServices(next);
    if (!scopeEdited) setScope(next.map((s) => serviceTaxonomy[s]).join(". "));
  }
  function review(event: FormEvent<HTMLFormElement>) {
    if (submissionInput.current && !submissionInput.current.value){
      const key=crypto.randomUUID();
      submissionInput.current.value=key;
      setSubmissionKey(key);
    }
    const included = event.currentTarget.elements.namedItem(
      "included",
    ) as HTMLTextAreaElement;
    if (!included.value.trim()) included.value = selectedLabels.join("\n");
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    if (submitter?.value === "save" || confirmed.current) {
      confirmed.current = false;
      return;
    }
    event.preventDefault();
    const f = new FormData(event.currentTarget),
      value = (k: string) => String(f.get(k) ?? "").trim(),
      lines = (k: string) =>
        value(k)
          .split(/\n/)
          .map((s) => s.trim())
          .filter(Boolean);
    const q = {
      mode: value("mode"),
      services: f.getAll("services"),
      scope: value("scope"),
      amount: value("amount"),
      currency: "ARS",
      estimated_days: value("estimated_days"),
      valid_until: value("valid_until") + ":00-03:00",
      insurance: value("insurance"),
      included: lines("included"),
      excluded: lines("excluded"),
      required_documents: lines("required_documents"),
      payment_terms: value("payment_terms"),
      responsibilities: value("responsibilities"),
      observations: value("observations"),
    } as NormalizedQuote;
    const invalid = quoteAuthorizationError(q,allowed,serviceTaxonomy) ?? validateQuote(q);
    setError(invalid ?? "");
    if (invalid) return;
    setPreview(q);
    dialog.current?.showModal();
  }
  return (
    <form
      ref={form}
      action={action}
      onSubmit={review}
      className="op-form op-quote-editor"
    >
      <input type="hidden" name="cargo_id" value={cargoId} />
      {chinaPlan&&<fieldset className="op-wide"><legend>Recepción en China</legend>
        <input type="hidden" name="china_origin" value="1"/>
        <p>{chinaPlan.version===2?chinaPlan.sender_name:chinaPlan.kind==="agent"?"Desde agente o depósito":"Envío directo del proveedor"} · {chinaPlan.origin.city||chinaPlan.origin.province} · {chinaPlan.version===2?chinaPlan.measurements.weight_kg+" kg / "+chinaPlan.measurements.volume_m3+" m³ declarados":chinaPlan.measurements.estimated?"Medidas históricas estimadas":"Medidas históricas confirmadas"}</p>
        <label>Depósito receptor<select name="warehouse_id" required defaultValue={warehouses.find(w=>w.active&&w.is_default)?.id??warehouses.find(w=>w.active)?.id??""}><option value="">Elegí un depósito activo</option>{warehouses.filter(w=>w.active).map(w=><option key={w.id} value={w.id}>{w.alias} · {w.city}</option>)}</select></label>
        {!warehouses.some(w=>w.active)&&<p role="alert">Agregá un depósito activo en Perfil empresarial antes de enviar.</p>}
        <label>Condiciones de recepción<textarea name="receiving_conditions" required minLength={5} maxLength={2000} placeholder="Horario, rotulado y requisitos para recibir el paquete"/></label>
        {chinaPlan.handoff==="pickup"&&<p role="alert">Solicitud histórica de retiro en origen. No se admiten nuevas ofertas de retiro en China.</p>}
        <p>El importador verá el resumen y las condiciones. La dirección completa se habilita al adjudicar.</p>
      </fieldset>}
      <input
        type="hidden"
        name="submission_key"
        value={submissionKey}
        ref={submissionInput}
      />
      <input
        type="hidden"
        name="draft_id"
        value={
          state.ok && state.message === "Borrador guardado."
            ? (state.id ?? draftId ?? "")
            : (draftId ?? "")
        }
      />
      <input
        type="hidden"
        name="replaces_offer_id"
        value={replacesOfferId ?? ""}
      />
      <div className="op-form-grid">
        <label>
          Modalidad
          <select
            name="mode"
            defaultValue={selection.mode}
          >
            <option value="" disabled>Elegí una modalidad habilitada</option>
            <option value="sea" disabled={!allowed?.modes.includes("sea")}>Marítimo</option>
            <option value="air" disabled={!allowed?.modes.includes("air")}>Aéreo</option>
            <option value="consolidated" disabled={!allowed?.modes.includes("consolidated")}>Consolidado</option>
          </select>
        </label>
        <label>
          Plazo estimado (días)
          <input
            name="estimated_days"
            type="number"
            min="1"
            max="365"
            step="1"
            defaultValue={initial.estimated_days}
          />
        </label>
      </div>
      <fieldset className="op-service-picker">
        <legend>Servicios incluidos</legend>
        <p className="op-small">Se precargan los servicios solicitados para los que tu empresa está habilitada. Las otras opciones requieren habilitación en Perfil empresarial.</p>
        <label>
          Buscar servicios
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Transporte, seguro, entrega…"
          />
        </label>
        <div className="op-checkboxes">
          {Object.entries(serviceTaxonomy).filter(([k])=>k!=="origin_pickup").map(([k, label]) => (
            <label
              key={k}
              hidden={
                !label
                  .toLocaleLowerCase("es")
                  .includes(search.toLocaleLowerCase("es"))
              }
            >
              <input
                type="checkbox"
                disabled={!allowed?.services.includes(k) && !services.includes(k as keyof typeof serviceTaxonomy)}
                checked={services.includes(k as keyof typeof serviceTaxonomy)}
                onChange={() =>
                  selectService(k as keyof typeof serviceTaxonomy)
                }
              />
              {label}{!allowed?.services.includes(k) && " · Sin habilitación"}
            </label>
          ))}
        </div>
        {services.map((s) => (
          <input key={s} type="hidden" name="services" value={s} />
        ))}
        <p className="op-small">
          {services.length} seleccionados
          {selectedLabels.length ? `: ${selectedLabels.join(" · ")}` : ""}
        </p>
      </fieldset>
      {newDelivery&&<fieldset className="op-wide"><legend>Entrega en Argentina</legend>
       <p>Solicitada: {chinaPlan.destination.delivery_mode==="home"?"Envío a domicilio":"Retiro en el depósito del operador"} · {chinaPlan.destination.province}, {chinaPlan.destination.city}</p>
       {chinaPlan.destination.delivery_mode==="home"&&<p>Dirección de entrega: {chinaPlan.destination.address}</p>}
       <label>Depósito de retiro en Argentina<select name="argentina_depot_id" required value={argentinaDepotId} onChange={e=>{setArgentinaDepotId(e.target.value);setDestinationMode("pickup");setServices(current=>current.filter(s=>s!=="domestic_delivery"));}}><option value="">Elegí un depósito activo</option>{argentinaDepots.filter(d=>d.active).map(d=><option value={d.id} key={d.id}>{d.alias} · {d.city}, {d.province}</option>)}</select></label>
       {!argentinaDepots.some(d=>d.active)&&<p role="alert">Agregá un depósito de Argentina en Perfil empresarial.</p>}
       <label>Modalidad que ofrecés<select name="destination_mode" value={home?"home":"pickup"} onChange={e=>{const mode=e.target.value as "home"|"pickup";setDestinationMode(mode);setServices(current=>mode==="home"?[...new Set([...current,"domestic_delivery" as NormalizedQuote["services"][number]])]:current.filter(s=>s!=="domestic_delivery"));}}><option value="pickup">Solo retiro en el depósito del operador</option>{canHome&&<option value="home">Envío a domicilio</option>}</select></label>
       {home?<label><input type="checkbox" name="home_address_confirmed" required/> Confirmo que presto entrega para esta dirección y cobertura</label>:chinaPlan.destination.delivery_mode==="home"&&<p>Solo retiro en el depósito del operador. No realiza envíos dentro de Argentina. El importador deberá aceptarlo expresamente.</p>}
       <input type="hidden" name="origin_version" value="2"/>
      </fieldset>}
      <div className="op-form-grid">
        <label>
          {newDelivery?"Tarifa de importación (ARS)":"Precio total (ARS)"}
          <input
            name={newDelivery?"import_fee":"amount"}
            type="number"
            min="0.01"
            max="999999999"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        {newDelivery&&<>{home?<label>Envío a domicilio en Argentina (ARS)<input name="delivery_fee" type="number" min="0.01" step="0.01" required value={deliveryFee} onChange={e=>setDeliveryFee(e.target.value)}/></label>:<input name="delivery_fee" type="hidden" value="0"/>}<label>Total de la oferta (ARS)<input name="amount" readOnly value={(Number(price||0)+(home?Number(deliveryFee||0):0)).toFixed(2)}/></label></>}
        <label>
          Moneda contractual
          <input name="currency" value="ARS" readOnly />
        </label>
      </div>
      <label>
        Alcance del servicio
        <textarea
          name="scope"
          value={scope}
          onChange={(e) => {
            setScope(e.target.value);
            setScopeEdited(true);
          }}
          maxLength={2000}
        />
        <small>
          Partimos de tus servicios. Ajustá el alcance a esta carga.
        </small>
      </label>
      <label>
        Vigencia
        <input
          type="datetime-local"
          name="valid_until"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
          max={
            deadline
              ? localDateTime(new Date(deadline)).slice(0, 16)
              : undefined
          }
        />
      </label>
      <div className="op-quick-options" aria-label="Vigencias rápidas">
        {[1, 3, 7].map((days) => (
          <button
            type="button"
            className="op-button secondary small"
            key={days}
            onClick={() =>
              setExpiry(
                localDateTime(
                  new Date(
                    Math.min(
                      Date.now() + days * 86400000,
                      deadline ? Date.parse(deadline) : Infinity,
                    ),
                  ),
                ).slice(0, 16),
              )
            }
          >
            {days === 1 ? "24 horas" : `${days} días`}
          </button>
        ))}
      </div>
      <label>
        Seguro / cobertura
        <select
          value={
            insurance === "Sin seguro incluido" ||
            insurance === "Seguro incluido: detallar cobertura en alcance"
              ? insurance
              : "Otra cobertura"
          }
          onChange={(e) =>
            setInsurance(
              e.target.value === "Otra cobertura" ? "" : e.target.value,
            )
          }
        >
          <option>Sin seguro incluido</option>
          <option>Seguro incluido: detallar cobertura en alcance</option>
          <option>Otra cobertura</option>
        </select>
        <input
          name="insurance"
          value={insurance}
          onChange={(e) => setInsurance(e.target.value)}
          maxLength={2000}
          aria-label="Detalle del seguro"
        />
      </label>
      <label>
        Documentación requerida
        <textarea
          name="required_documents"
          value={docs}
          onChange={(e) => setDocs(e.target.value)}
          maxLength={5000}
        />
      </label>
      <div className="op-quick-options">
        {["Packing list", "Factura comercial", "MSDS"].map((d) => (
          <button
            type="button"
            className="op-button secondary small"
            key={d}
            onClick={() =>
              setDocs(
                [...new Set([...docs.split("\n").filter(Boolean), d])].join(
                  "\n",
                ),
              )
            }
          >
            + {d}
          </button>
        ))}
      </div>
      <details className="op-panel">
        <summary>Exclusiones y condiciones</summary>
        <label>
          Incluye
          <textarea
            name="included"
            defaultValue={initial.included?.join("\n")}
            placeholder="Los servicios seleccionados se incluyen si dejás este campo vacío"
          />
        </label>
        <label>
          No incluye
          <textarea
            name="excluded"
            defaultValue={
              initial.excluded?.join("\n") ?? "Servicios no seleccionados"
            }
            maxLength={5000}
          />
        </label>
        <label>
          Condiciones de pago
          <textarea
            name="payment_terms"
            defaultValue={
              initial.payment_terms ??
              "Pago de prueba o garantía según la operación; sin liberación por hitos."
            }
            maxLength={2000}
          />
        </label>
        <label>
          Responsabilidades
          <textarea
            name="responsibilities"
            defaultValue={
              initial.responsibilities ??
              "Operador: servicios cotizados. Importador: datos y documentación de la carga."
            }
            maxLength={2000}
          />
        </label>
      </details>
      <label>
        Excepciones y observaciones
        <textarea
          name="observations"
          placeholder="Aclaraciones específicas para esta carga"
          defaultValue={initial.observations ?? "Sin excepciones adicionales."}
          maxLength={2000}
        />
      </label>
      <p className="op-small">
        La oferta queda sellada al enviar. La coordinación aduanera no equivale
        a actuar como despachante habilitado.
      </p>
      {(error || state.message) && (
        <p ref={feedback} tabIndex={-1} role={error || !state.ok ? "alert" : "status"}>
          {error || state.message}
        </p>
      )}
      <div className="op-modal-actions">
        <button
          className="op-button secondary"
          name="intent"
          value="save"
          disabled={pending}
        >
          Guardar borrador
        </button>
        <button
          ref={send}
          className="op-button"
          name="intent"
          value="submit"
          disabled={pending}
        >
          Revisar oferta
        </button>
      </div>
      <dialog
        ref={dialog}
        className="op-review-dialog"
        aria-label="Oferta que recibirá el importador"
      >
        <h2>Esto recibirá el importador</h2>
        <p>
          Precio final {money(Number(preview?.amount ?? 0), "ARS")}. Revisá
          alcance y condiciones antes de enviar.
        </p>
        {preview && <QuoteTerms quote={preview} />}
        {newDelivery&&<section><h3>Entrega acordada en Argentina</h3><p>Importación: {money(Number(price),"ARS")}</p>{home&&<p>Envío a domicilio: {money(Number(deliveryFee),"ARS")}</p>}<p>{home?"Envío a domicilio":"Solo retiro en el depósito del operador"}</p>{!home&&chinaPlan.destination.delivery_mode==="home"&&<p>No realiza envíos dentro de Argentina. Requiere aceptación expresa del importador.</p>}</section>}
        {chinaPlan&&<section><h3>Recepción en China</h3><p>{warehouses.find(w=>w.id===(form.current?.elements.namedItem("warehouse_id") as HTMLSelectElement|null)?.value)?.alias} · {warehouses.find(w=>w.id===(form.current?.elements.namedItem("warehouse_id") as HTMLSelectElement|null)?.value)?.city}</p><p>{(form.current?.elements.namedItem("receiving_conditions") as HTMLTextAreaElement|null)?.value}</p>{chinaPlan.handoff==="pickup"&&<p>Retiro incluido · {(form.current?.elements.namedItem("pickup_conditions") as HTMLTextAreaElement|null)?.value}</p>}</section>}
        <div className="op-modal-actions">
          <button
            type="button"
            className="op-button secondary"
            onClick={() => dialog.current?.close()}
          >
            Volver a editar
          </button>
          <button
            type="button"
            className="op-button"
            disabled={pending}
            onClick={() => {
              confirmed.current = true;
              dialog.current?.close();
              form.current?.requestSubmit(send.current!);
            }}
          >
            Enviar oferta
          </button>
        </div>
      </dialog>
    </form>
  );
}
