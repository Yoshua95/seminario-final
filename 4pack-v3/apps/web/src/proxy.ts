import {isMultiroleDemo} from "./features/multirole/environment.mjs";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isDemoEnabled,
  isVercelPreview,
} from "./features/operator/demo-environment.mjs";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Public return only: this page never changes or confirms payment state.
  if (request.nextUrl.pathname === "/pagos/retorno") return response;
  if(isMultiroleDemo()) {
    const alias:Record<string,string>={"/acceso":"/demo/acceso","/cargas/nueva":"/demo/importador/cargas/nueva","/admin":"/demo/admin","/admin/operadores":"/demo/admin/operadores","/admin/capacidad":"/demo/admin/capacidad"};
    const destination=alias[request.nextUrl.pathname];
    if(destination) { const url=request.nextUrl.clone();url.pathname=destination;return NextResponse.redirect(url); }
  }
  if (isVercelPreview() && !request.nextUrl.pathname.startsWith("/demo/"))
    return NextResponse.redirect(new URL("/demo/acceso", request.url));
  if (request.nextUrl.pathname.startsWith("/demo/") && isDemoEnabled())
    return response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    if (request.nextUrl.pathname === "/acceso") return response;
    return NextResponse.redirect(
      new URL("/acceso?configuracion=pendiente", request.url),
    );
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const isAccessPage = request.nextUrl.pathname === "/acceso";

  if (!data.user && !isAccessPage) {
    const accessUrl = request.nextUrl.clone();
    accessUrl.pathname = "/acceso";
    return NextResponse.redirect(accessUrl);
  }

  if (data.user && isAccessPage) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  if (
    data.user &&
    !request.nextUrl.pathname.startsWith("/operador") &&
    !isAccessPage
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();
    if (profile?.role === "operator") {
      const current = request.nextUrl.pathname;
      const aliases: Record<string, string> = {
        "/": "/oportunidades",
        "/ofertas": "/mis-ofertas",
        "/ofertas/nueva": "/oportunidades",
        "/operaciones": "/operaciones",
        "/documentos": "/documentos",
        "/perfil": "/perfil",
        "/cargas/nueva": "/oportunidades",
      };
      const destination =
        aliases[current] ??
        (current.startsWith("/operaciones/")
          ? current
          : current.startsWith("/ofertas/")
            ? current.replace("/ofertas/", "/oportunidades/")
            : null);
      if (destination)
        return NextResponse.redirect(
          new URL("/operador" + destination, request.url),
        );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
