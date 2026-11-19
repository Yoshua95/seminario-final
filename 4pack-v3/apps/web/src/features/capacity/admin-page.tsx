import Link from "next/link";
import { loadCapacityAdmin } from "./admin-data";
import { CapacityAdminForm } from "./admin-form";
import { CapacityView } from "./view";
export async function CapacityAdminPage({
  demo = false,
  searchParams,
}: {
  demo?: boolean;
  searchParams: Promise<{ q?: string; operator?: string }>;
}) {
  const params = await searchParams;
  const { operators, selected, capacity } = await loadCapacityAdmin(
    demo,
    params.q ?? "",
    params.operator,
  );
  const base = demo ? "/demo/admin/capacidad" : "/admin/capacidad";
  return (
    <main className="op-content">
      <h1>Administracion de capacidad</h1>
      {demo && (
        <p>DEMO LOCAL: identidad administrativa simulada. Datos ficticios.</p>
      )}
      <Link href={demo ? "/demo/operador/capacidad" : "/admin"}>
        Volver al panel
      </Link>
      <form>
        <label>
          Buscar empresa
          <input name="q" defaultValue={params.q} />
        </label>
        <button>Buscar</button>
      </form>
      <nav aria-label="Operadores">
        {operators.map((o) => (
          <p key={o.user_id}>
            <Link
              href={`${base}?q=${encodeURIComponent(params.q ?? "")}&operator=${o.user_id}`}
            >
              {o.company_name} · {o.verification_status}
            </Link>
          </p>
        ))}
      </nav>
      {selected && capacity ? (
        <section key={selected.user_id}>
          <h2>
            {selected.company_name} · {selected.verification_status}
          </h2>
          <CapacityAdminForm
            demo={demo}
            operatorId={selected.user_id}
            data={capacity}
          />
          <CapacityView
            data={capacity}
            operationBase={demo ? "/demo/operador/operaciones" : "/operaciones"}
          />
        </section>
      ) : (
        <p>Sin operadores para esta busqueda.</p>
      )}
    </main>
  );
}
