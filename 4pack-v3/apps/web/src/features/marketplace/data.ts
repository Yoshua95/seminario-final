import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertDemo, localDatabase } from "@/features/operator/data";
import { asUser, demoUsers } from "@/features/operator/demo-runtime.mjs";

export type PublicOperator = {
  id: string; trade_name: string; logo_url: string | null; description: string;
  city: string | null; province: string | null; country: string | null;
  modes: string[]; specialties: string[]; coverage: string[]; categories: string[];
  experience_years: number | null; verification_status: string; available: boolean;
  reputation: {average: number | null; count: number; completed: number; history: string};
};
export async function directory(demo: boolean, filters: Record<string,string> = {}, id?: string): Promise<PublicOperator[]> {
  const params = {search_name:filters.q ?? "",mode_filter:filters.mode ?? "",specialty_filter:filters.specialty ?? "",coverage_filter:filters.coverage ?? "",target_public_id:id ?? null};
  if (demo) {
    assertDemo();
    const db = await localDatabase();
    const result = await asUser<{profile:PublicOperator}>(db,demoUsers.importer,"select public.commercial_directory($1,$2,$3,$4,$5) as profile",Object.values(params));
    return result.rows.map(r=>r.profile);
  }
  const client = await createSupabaseServerClient();
  if (!client || !(await client.auth.getUser()).data.user) redirect("/acceso");
  const {data,error} = await client.rpc("commercial_directory",params);
  if (error) throw new Error("No pudimos consultar los perfiles comerciales.");
  return data as PublicOperator[];
}
