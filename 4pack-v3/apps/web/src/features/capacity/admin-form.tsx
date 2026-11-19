"use client";
import { useActionState } from "react";
import { capacityAction } from "./admin-actions";
import type { CapacitySnapshot } from "./types";
export function CapacityAdminForm({
  demo,
  operatorId,
  data,
}: {
  demo: boolean;
  operatorId: string;
  data: CapacitySnapshot;
}) {
  const [state, action, pending] = useActionState(
    capacityAction.bind(null, demo),
    { ok: false, message: "" },
  );
  const currency = "ARS";
  const m = data.currencies.find((c) => c.currency === currency),
    l = data.limits;
  return (
    <>
      <form action={action} className="op-form">
        <h2>Aprobar limites</h2>
        <input type="hidden" name="command" value="configure" />
        <input type="hidden" name="operator_id" value={operatorId} />
        <label>
          Moneda
          <input name="currency" value={currency} readOnly />
        </label>
        <fieldset key={currency}>
          <legend>
            La cantidad, el peso y el volumen son globales para todas las
            monedas.
          </legend>
          <label>
            Maximo de operaciones
            <input
              required
              type="number"
              min="0"
              step="1"
              name="max_operations"
              defaultValue={l?.max_operations}
            />
          </label>
          <label>
            Peso maximo kg (vacio: sin limite)
            <input
              type="number"
              min="0"
              step="0.01"
              name="max_weight_kg"
              defaultValue={l?.max_weight_kg ?? ""}
            />
          </label>
          <label>
            Volumen maximo m3 (vacio: sin limite)
            <input
              type="number"
              min="0"
              step="0.001"
              name="max_volume_m3"
              defaultValue={l?.max_volume_m3 ?? ""}
            />
          </label>
          {(
            [
              ["max_per_operation", "Precio maximo por operacion"],
              ["max_exposure", "Exposicion contractual maxima"],
              ["declared_working_capital", "Capital declarado"],
              ["approved_working_capital", "Capital aprobado"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label} ({currency})
              <input
                name={key}
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={m?.[key]}
              />
            </label>
          ))}
          <label>
            Estado operativo global
            <select
              name="operational_status"
              defaultValue={l?.status ?? "inactive"}
            >
              <option value="inactive">Inactiva</option>
              <option value="active">Activa</option>
            </select>
          </label>
          <label>
            Vigencia operativa desde (ISO)
            <input
              name="operational_valid_from"
              required
              defaultValue={l?.valid_from ?? new Date().toISOString()}
            />
          </label>
          <label>
            Vigencia operativa hasta (ISO; vacio: sin vencimiento)
            <input
              name="operational_valid_until"
              defaultValue={l?.valid_until ?? ""}
            />
          </label>
          <label>
            Estado de esta moneda
            <select name="status" defaultValue={m?.status ?? "inactive"}>
              <option value="inactive">Inactiva</option>
              <option value="active">Activa</option>
            </select>
          </label>
          <label>
            Desde (fecha ISO con zona horaria)
            <input
              name="valid_from"
              required
              defaultValue={m?.valid_from ?? new Date().toISOString()}
            />
          </label>
          <label>
            Hasta (fecha ISO; vacio: sin vencimiento)
            <input name="valid_until" defaultValue={m?.valid_until ?? ""} />
          </label>
        </fieldset>
        <label>
          Motivo obligatorio
          <textarea name="reason" required minLength={5} maxLength={2000} />
        </label>
        <button disabled={pending}>Guardar aprobacion</button>
      </form>
      {data.reservations
        .filter((r) => r.state === "requires_review")
        .map((r) => (
          <form className="op-form" action={action} key={r.operation_id}>
            <h3>Revisar historico {r.operation_id}</h3>
            <input type="hidden" name="command" value="review" />
            <input type="hidden" name="operation_id" value={r.operation_id} />
            <label>
              Capital declarado ({r.currency})
              <input
                name="capital_amount"
                required
                min="0"
                max={r.contract_exposure}
                step="0.01"
                type="number"
              />
            </label>
            <label>
              Motivo
              <textarea name="reason" required minLength={5} />
            </label>
            <button disabled={pending}>Registrar revision</button>
          </form>
        ))}
      <details>
        <summary>Cierre contractual autorizado</summary>
        <p>
          No implementa disputas ni reembolsos. La cancelacion solo admite
          created/confirmed y el fallo solo incident. Debe registrarse la
          consecuencia contractual y financiera antes de liberar capacidad.
        </p>
        <form action={action} className="op-form">
          <input type="hidden" name="command" value="terminal" />
          <label>
            Operacion
            <input name="operation_id" required />
          </label>
          <label>
            Destino
            <select name="next_phase">
              <option value="cancelled">Cancelada</option>
              <option value="failed">Fallida</option>
            </select>
          </label>
          <label>
            Motivo
            <textarea name="reason" minLength={5} required />
          </label>
          <label>
            Consecuencias contractuales y financieras
            <textarea name="consequences" required minLength={10} />
          </label>
          <button disabled={pending}>Registrar consecuencias y cerrar</button>
        </form>
      </details>
      {state.message && (
        <p role={state.ok ? "status" : "alert"}>{state.message}</p>
      )}
    </>
  );
}
