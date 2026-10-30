import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function configured() {
  return !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_ANON_KEY &&
    process.env.ADMIN_USER_ID
  );
}
export async function db() {
  if (!configured())
    throw new AppError(
      503,
      "Configure Supabase e o administrador conforme o README.",
    );
  const store = await cookies();
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (entries) => {
          try {
            entries.forEach(({ name, value, options }) =>
              store.set(name, value, {
                ...options,
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
              }),
            );
          } catch {
            /* Server Components cannot write. Route handlers refresh before DB operations. */
          }
        },
      },
    },
  );
}
export async function admin() {
  const client = await db();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user)
    throw new AppError(401, "Faça login para continuar.");
  if (data.user.id !== process.env.ADMIN_USER_ID)
    throw new AppError(403, "Acesso reservado ao administrador.");
  return { client, user: data.user };
}
export function check(error: { message: string } | null) {
  if (error)
    throw new AppError(
      500,
      "Não foi possível concluir a operação no banco. Verifique as migrations e o acesso administrativo.",
    );
}
export function failure(error: unknown) {
  const id = crypto.randomUUID();
  const status =
    error instanceof AppError
      ? error.status
      : error instanceof ZodError
        ? 400
        : 500;
  console.error(
    JSON.stringify({
      id,
      status,
      type: error instanceof Error ? error.name : "UnknownError",
    }),
  );
  return NextResponse.json(
    {
      error:
        error instanceof AppError
          ? error.message
          : error instanceof ZodError
            ? error.issues
                .map((i) => `${i.path.join(".")}: ${i.message}`)
                .join("; ")
            : "Erro interno. Consulte o identificador no log.",
      requestId: id,
    },
    { status },
  );
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin)
    throw new AppError(403, "Origem da requisição inválida.");
}
export async function body(req: Request, max = 3_000_000) {
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    throw new AppError(415, "Envie JSON.");
  const reader = req.body?.getReader();
  if (!reader) throw new AppError(400, "Corpo vazio.");
  let size = 0;
  const parts: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new AppError(413, "Conteúdo excede o limite permitido.");
    }
    parts.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  } catch {
    throw new AppError(400, "JSON inválido.");
  }
}
