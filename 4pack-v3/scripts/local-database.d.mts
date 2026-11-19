import type { PGlite, Results } from "@electric-sql/pglite";
export const demoUsers: Record<
  "operator" | "importer" | "admin" | "competitor" | "pending" | "suspended",
  string
>;
export function createLocalDatabase(directory?: string): Promise<PGlite>;
export function asUser<T>(
  db: PGlite,
  userId: string,
  query: string,
  params?: unknown[],
): Promise<Results<T>>;
