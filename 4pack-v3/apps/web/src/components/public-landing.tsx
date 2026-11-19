import Link from "next/link";
import { BrandMark } from "./brand-mark";
export function PublicLanding() {
  return (
    <main className="public-landing">
      <header>
        <BrandMark />
      </header>
      <section>
        <p className="eyebrow">4PACK · OPERACIONES LOGÍSTICAS</p>
        <h1>
          Tu próximo servicio,
          <br />
          con todo a la vista.
        </h1>
        <p>
          Cotizá cargas, conocé tu capacidad y acompañá cada operación desde un
          mismo lugar.
        </p>
        <Link href="/acceso" className="access-submit">
          Ingresar como operador →
        </Link>
        <small>
          ¿Sos importador? Tu recorrido está en la app Android de 4PACK.
        </small>
      </section>
      <footer>China → Argentina · Cargas, ofertas y seguimiento</footer>
    </main>
  );
}
