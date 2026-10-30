import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
// Refresh cookies before Server Components run; mutations remain in authenticated APIs.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_ANON_KEY ||
    !process.env.ADMIN_USER_ID
  )
    return response;
  const client = createServerClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (entries) => {
          entries.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          entries.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            }),
          );
        },
      },
    },
  );
  const { data, error } = await client.auth.getUser();
  if (error || data.user?.id !== process.env.ADMIN_USER_ID) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}
export const config = {
  matcher: [
    "/mineracao/:path*",
    "/radar/:path*",
    "/favoritos/:path*",
    "/analise/:path*",
    "/historico/:path*",
    "/configuracoes/:path*",
  ],
};
