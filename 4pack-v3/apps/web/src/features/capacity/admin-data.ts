import { isMultiroleDemo } from "../multirole/environment.mjs";
import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertDemo, localDatabase } from "../operator/data";
import { asUser, demoUsers } from "../operator/demo-runtime.mjs";
import type { CapacitySnapshot } from "./types";
export async function capacityAdmin(demo: boolean) {
  if (demo) {
    assertDemo();
    if(isMultiroleDemo()) await (await import("../multirole/session")).rehearsalSession("admin");
    return null;
  }
  const client = await createSupabaseServerClient();
  if (!client) redirect("/acceso");
  const { data } = await client.auth.getUser();
  if (!data.user) redirect("/acceso");
  const profile = await client
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (profile.error || profile.data?.role !== "admin") redirect("/");
  return client;
}
export async function capacityAdminRpc(
  demo: boolean,
  name: string,
  args: Record<string, unknown>,
) {
  const client = await capacityAdmin(demo);
  if (client) {
    const { data, error } = await client.rpc(name, args);
    if (error)
      throw new Error(
        error.code === "P0001"
          ? error.message
          : "No se pudo guardar la capacidad.",
      );
    return data;
  }
  const statements: Record<string, string> = {
    configure_operator_capacity:
      "select public.configure_operator_capacity($1,$2::jsonb)",
    review_historical_capacity:
      "select public.review_historical_capacity($1,$2::numeric,$3)",
    admin_capacity_terminal_transition:
      "select public.admin_capacity_terminal_transition($1,$2,$3,$4)",
  };
  if (!statements[name]) throw new Error("Accion no disponible");
  await asUser(
    await localDatabase(),
    demoUsers.admin,
    statements[name],
    Object.values(args).map((v) =>
      typeof v === "object" ? JSON.stringify(v) : v,
    ),
  );
}
export async function loadCapacityAdmin(
  demo: boolean,
  query: string,
  target?: string,
) {
  const client = await capacityAdmin(demo);
  let operators: {
    user_id: string;
    company_name: string;
    verification_status: string;
  }[];
  let capacity: CapacitySnapshot | null = null;
  if (client) {
    const result = await client
      .from("operator_profiles")
      .select("user_id,company_name,verification_status,profiles!inner(role)")
      .eq("profiles.role", "operator")
      .order("company_name");
    if (result.error) throw new Error("No se pudieron cargar operadores");
    operators = result.data;
  } else
    operators = (
      await asUser<{
        user_id: string;
        company_name: string;
        verification_status: string;
      }>(
        await localDatabase(),
        demoUsers.admin,
        "select o.user_id,o.company_name,o.verification_status from public.operator_profiles o join public.profiles p on p.id=o.user_id where p.role='operator' order by o.company_name",
      )
    ).rows;
  operators = operators.filter((o) =>
    o.company_name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const selected = operators.find((o) => o.user_id === target) ?? operators[0];
  if (selected) {
    if (client) {
      const result = await client.rpc("operator_capacity_snapshot", {
        target_operator: selected.user_id,
      });
      if (result.error) throw new Error("No se pudo cargar capacidad");
      capacity = result.data;
    } else
      capacity = (
        await asUser<{ data: CapacitySnapshot }>(
          await localDatabase(),
          demoUsers.admin,
          "select public.operator_capacity_snapshot($1) data",
          [selected.user_id],
        )
      ).rows[0].data;
  }
  return { operators, selected, capacity };
}
