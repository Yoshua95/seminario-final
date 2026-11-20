export default async function PaymentReturn({
  searchParams,
}: {
  searchParams: Promise<{ operation?: string }>;
}) {
  const { operation } = await searchParams;
  const scheme=process.env.FOURPACK_MOBILE_SCHEME === "fourpack-candidate" ? "fourpack-candidate" : "fourpack";
  const valid =
    typeof operation === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      operation,
    );
  return (
    <main>
      <h1>Volver a tu operación</h1>
      <p>
        El checkout terminó. El pago se confirma consultando a Mercado Pago
        desde 4PACK. Esta página no acredita un pago.
      </p>
      {valid && (
        <a href={`${scheme}://operation/${operation}`}>
          Abrir 4PACK y verificar el pago de prueba
        </a>
      )}
    </main>
  );
}
