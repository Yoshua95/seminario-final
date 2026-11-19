"use client";
import { useActionState } from "react";
import { operatorAction } from "./actions";

export { QuoteComposer as QuoteEditor } from "./quote-composer";
export function WithdrawQuote({ demo, id }: { demo: boolean; id: string }) {
  const [state, action, pending] = useActionState(
    operatorAction.bind(null, demo, "quote"),
    { ok: false, message: "" },
  );
  return (
    <form action={action}>
      <input name="offer_id" type="hidden" value={id} />
      <button
        className="op-button secondary"
        name="intent"
        value="withdraw"
        disabled={pending}
      >
        Retirar oferta
      </button>
      {state.message && (
        <p role={state.ok ? "status" : "alert"}>{state.message}</p>
      )}
    </form>
  );
}
