export default async function PaymentReturn({
  searchParams,
}: {
  searchParams: Promise<{ operation?: string }>;
}) {
  const { operation } = await searchParams;
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
        <a href={`fourpack://operation/${operation}`}>
          Abrir 4PACK y verificar el pago de prueba
        </a>
      )}
    </main>
  );
}
