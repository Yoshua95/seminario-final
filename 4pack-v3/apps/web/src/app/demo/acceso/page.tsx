import Link from "next/link";
import { notFound } from "next/navigation";
import { startDemo } from "@/features/operator/actions";
import { Icon } from "@/features/operator/ui";
import {
  isDemoEnabled,
  isVercelPreview,
} from "@/features/operator/demo-environment.mjs";
export const dynamic = "force-dynamic";
export default function Page() {
  if (!isDemoEnabled()) notFound();
  const preview = isVercelPreview();
  return (
    <main className="op-demo-access">
      <section className="op-panel">
        <div className="op-brand">
          <span className="op-brand-icon">
            <Icon name="anchor" />
          </span>
          <span>
            <strong>
              4PACK<span className="op-brand-dot">●</span>
            </strong>
            <small>Panel del Operador</small>
          </span>
        </div>
        <h1>
          Tu mesa de operaciones.
          <br />
          Lista para trabajar.
        </h1>
        <p>
          {preview
            ? "Demostración Preview con datos exclusivamente simulados. Los cambios son temporales y pueden reiniciarse al comenzar una nueva instancia."
            : "Explorá el panel con datos de demostración. Las ofertas, hitos, documentos y mensajes se conservan al recargar en este entorno local."}
        </p>
        <div className="op-notice info op-section-gap">
          <Icon name="shield" />
          <span>
            Entorno de prueba independiente. No utiliza cuentas reales ni mueve
            dinero.
          </span>
        </div>
        <form className="op-form" action={startDemo}>
          <label>
            Escenario de revisión
            <select name="scenario">
              <option value="operator">
                Marítima Rivera S.A. · Operador aprobado
              </option>
              <option value="pending">Empresa pendiente de aprobación</option>
              <option value="suspended">Empresa suspendida</option>
            </select>
          </label>
          <button className="op-button primary">
            Entrar a la demostración <Icon name="arrow" />
          </button>
        </form>
        {!preview && (
          <Link href="/acceso" className="op-text-link">
            Acceder con una cuenta real →
          </Link>
        )}
      </section>
    </main>
  );
}
