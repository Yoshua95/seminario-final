import type { SupabaseClient } from "@supabase/supabase-js";

export type AccessState =
  | { status: "checking" } | { status: "signedOut" } | { status: "allowed" }
  | { status: "blocked" } | { status: "error"; stage: string };

export async function withDeadline<T>(work: PromiseLike<T>, stage: string, milliseconds = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([Promise.resolve(work), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(stage)), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

// Failed storage is not an empty session. Do not fall back to volatile memory.
export function boundedAuthStorage(storage: {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}, milliseconds = 8000) {
  return {
    getItem: (key: string) => withDeadline(storage.getItem(key), "storage", milliseconds),
    setItem: (key: string, value: string) => withDeadline(storage.setItem(key, value), "storage", milliseconds),
    removeItem: (key: string) => withDeadline(storage.removeItem(key), "storage", milliseconds),
  };
}

export async function resolveImporterAccess(client: SupabaseClient, milliseconds = 12000): Promise<AccessState> {
  let stage = "session";
  try {
    const session = await withDeadline(client.auth.getSession(), stage, milliseconds);
    if (session.error) return { status: "error", stage };
    if (!session.data.session) return { status: "signedOut" };
    stage = "user";
    const user = await withDeadline(client.auth.getUser(), stage, milliseconds);
    if (user.error) return user.error.status === 401 ? { status: "signedOut" } : { status: "error", stage };
    if (!user.data.user || user.data.user.id !== session.data.session.user.id) return { status: "error", stage };
    stage = "profile";
    const profile = await withDeadline(client.from("profiles").select("role").eq("id", user.data.user.id).single(), stage, milliseconds);
    if (profile.error || !profile.data) return { status: "error", stage };
    return { status: profile.data.role === "importer" ? "allowed" : "blocked" };
  } catch { return { status: "error", stage }; }
}

export function createImporterAccessGuard(client: SupabaseClient, update: (state: AccessState) => void, milliseconds = 12000) {
  let generation = 0;
  let stopped = false;
  let deferred: ReturnType<typeof setTimeout> | undefined;
  async function retry() {
    const current = ++generation;
    update({ status: "checking" });
    const result = await resolveImporterAccess(client, milliseconds);
    if (!stopped && current === generation) update(result);
  }
  const { data } = client.auth.onAuthStateChange((event) => {
    // Do not call Auth/Storage/REST inside an Auth notification callback.
    ++generation;
    clearTimeout(deferred);
    // INITIAL_SESSION with null may also follow a storage error: read the
    // session result before deciding it is genuinely absent.
    if (event === "SIGNED_OUT") { update({ status: "signedOut" }); }
    else {
      update({ status: "checking" });
      deferred = setTimeout(() => { if (!stopped) void retry(); }, 0);
    }
  });
  void retry();
  return {
    retry,
    async signOut() {
      ++generation;
      clearTimeout(deferred);
      update({ status: "checking" });
      try {
        const result = await withDeadline(client.auth.signOut({ scope: "local" }), "signOut", milliseconds);
        if (result.error) throw result.error;
        if (!stopped) update({ status: "signedOut" });
      } catch { if (!stopped) update({ status: "error", stage: "signOut" }); }
    },
    stop() { stopped = true; ++generation; clearTimeout(deferred); data.subscription.unsubscribe(); },
  };
}
