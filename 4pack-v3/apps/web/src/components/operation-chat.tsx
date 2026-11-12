"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
};

export function OperationChat({ operationId, messages }: { operationId: string; messages: Message[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = String(form.get("message")).trim();
    const supabase = createSupabaseBrowserClient();
    if (!supabase || !body) {
      setLoading(false);
      setError("Escribí un mensaje antes de enviarlo.");
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setLoading(false);
      setError("La sesión no está disponible.");
      return;
    }
    const { error: insertError } = await supabase.from("messages").insert({ operation_id: operationId, sender_id: authData.user.id, body });
    setLoading(false);
    if (insertError) {
      setError("No pudimos enviar el mensaje.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return <section className="operation-panel"><h2>Mensajería de la operación</h2><div className="message-list">{messages.map((message) => <article className="message" key={message.id}><header><strong>{message.senderName}</strong><time>{new Date(message.createdAt).toLocaleString("es-AR")}</time></header><p>{message.body}</p></article>)}{messages.length === 0 && <div className="empty-state"><h3>Sin mensajes</h3><p>La conversación queda asociada a esta operación.</p></div>}</div><form className="message-form" onSubmit={sendMessage}><textarea maxLength={2000} name="message" placeholder="Escribí un mensaje sobre la operación" required /> <button disabled={loading} type="submit">{loading ? "Enviando…" : "Enviar"}</button>{error && <div className="form-error" role="alert">{error}</div>}</form></section>;
}
