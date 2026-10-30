import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  admin,
  db,
  body,
  check,
  AppError,
  failure,
  sameOrigin,
} from "@/lib/server";
import {
  offerSchema,
  filtersSchema,
  publicUrl,
  statuses,
  type Offer,
} from "@/lib/domain";
import { importSchema, suppliedData } from "@/lib/connectors";
import { analysisSchema, GeminiProvider } from "@/lib/ai";
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const loginAttempts = new Map<string, { count: number; until: number }>();
function loginLimit(req: Request) {
  const key = createHash("sha256")
    .update(req.headers.get("x-forwarded-for") || "local")
    .digest("hex");
  const now = Date.now();
  for (const [k, v] of loginAttempts)
    if (v.until < now) loginAttempts.delete(k);
  const v = loginAttempts.get(key) || { count: 0, until: now + 60000 };
  if (++v.count > 5 || loginAttempts.size > 10000)
    throw new AppError(429, "Muitas tentativas. Aguarde um minuto.");
  loginAttempts.set(key, v);
}
async function handle(req: Request, ctx: Context) {
  try {
    const path = (await ctx.params).path.join("/");
    const write = req.method === "POST";
    if (write) sameOrigin(req);
    if (path === "login" && write) {
      loginLimit(req);
      const input = z
        .object({
          email: z.email().max(254),
          password: z.string().min(8).max(200),
        })
        .parse(await body(req, 10000));
      const client = await db();
      const { data, error } = await client.auth.signInWithPassword(input);
      if (error || data.user?.id !== process.env.ADMIN_USER_ID) {
        await client.auth.signOut();
        throw new AppError(401, "Credenciais inválidas ou usuário sem acesso.");
      }
      const allowed = await client.rpc("is_admin");
      check(allowed.error);
      if (!allowed.data) {
        await client.auth.signOut();
        throw new AppError(403, "Administrador não provisionado no banco.");
      }
      return NextResponse.json({ ok: true });
    }
    const { client, user } = await admin();
    if (path === "logout" && write) {
      check((await client.auth.signOut()).error);
      return NextResponse.json({ ok: true });
    }
    if (write) {
      const rate = await client.rpc("consume_request", {
        p_scope: path === "analyze" ? "analysis" : "write",
      });
      check(rate.error);
      if (!rate.data)
        throw new AppError(
          429,
          "Limite de requisições atingido. Aguarde um minuto.",
        );
    }
    async function products() {
      const { data, error } = await client
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      check(error);
      if ((data?.length ?? 0) >= 1000)
        throw new AppError(
          409,
          "Limite desta versão: menos de 1.000 ofertas. Exporte e organize o catálogo antes de continuar.",
        );
      return (data ?? []).map((r) => ({
        ...r.payload,
        id: r.id,
        created_at: r.created_at,
        provenance: r.provenance,
        verified_at: r.verified_at,
      })) as Offer[];
    }
    if (path === "state" && !write) {
      const [offers, favorites, searches, analyses, settings] =
        await Promise.all([
          products(),
          client
            .from("favorites")
            .select("*")
            .order("created_at", { ascending: false }),
          client
            .from("mining_searches")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100),
          client
            .from("ai_analyses")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100),
          client.from("application_settings").select("app_name").maybeSingle(),
        ]);
      for (const r of [favorites, searches, analyses, settings]) check(r.error);
      return NextResponse.json({
        offers,
        favorites: favorites.data,
        searches: searches.data,
        analyses: analyses.data,
        appName: settings.data?.app_name ?? "Low Ticket Intelligence",
        aiConfigured: !!process.env.GEMINI_API_KEY,
      });
    }
    if (path === "offers" && write) {
      const input = z
        .object({ source: z.enum(["manual", "import"]), offers: importSchema })
        .parse(await body(req, 2_000_000));
      const rows = input.offers.map((payload) => ({
        owner_id: user.id,
        payload,
        provenance: input.source,
        fingerprint: createHash("sha256")
          .update(
            JSON.stringify([
              payload.adUrl || payload.salesUrl || "",
              payload.name.toLowerCase(),
              payload.advertiser.toLowerCase(),
            ]),
          )
          .digest("hex"),
      }));
      const unique = [...new Map(rows.map((r) => [r.fingerprint, r])).values()];
      check(
        (
          await client
            .from("products")
            .upsert(unique, { onConflict: "owner_id,fingerprint" })
        ).error,
      );
      return NextResponse.json({ count: unique.length });
    }
    if (path === "mine" && write) {
      const filters = filtersSchema.parse(await body(req, 20000));
      try {
        const results = suppliedData.search(await products(), filters);
        const saved = await client.rpc("save_search", {
          p_filters: filters,
          p_results: results,
        });
        check(saved.error);
        return NextResponse.json({
          results,
          searchId: saved.data,
          source: suppliedData.description,
        });
      } catch (error) {
        // Best effort: the database itself may be the unavailable prerequisite.
        const logged = await client
          .from("mining_searches")
          .insert({
            owner_id: user.id,
            filters,
            result_count: 0,
            source: suppliedData.id,
            error:
              error instanceof AppError ? error.message : "Falha na pesquisa.",
          });
        if (logged.error)
          console.error(JSON.stringify({ type: "MiningHistoryUnavailable" }));
        throw error;
      }
    }
    if (path.startsWith("search/") && !write) {
      const id = z.uuid().parse(path.slice(7));
      const { data, error } = await client
        .from("mining_results")
        .select("snapshot")
        .eq("search_id", id);
      check(error);
      return NextResponse.json({ results: data?.map((r) => r.snapshot) ?? [] });
    }
    if (path === "favorite" && write) {
      const input = z
        .object({
          productId: z.uuid(),
          remove: z.boolean().default(false),
          notes: z.string().max(5000).optional(),
          status: z.enum(statuses).optional(),
        })
        .parse(await body(req, 20000));
      if (input.remove) {
        check(
          (
            await client
              .from("favorites")
              .delete()
              .eq("product_id", input.productId)
          ).error,
        );
      } else {
        const found = await client
          .from("products")
          .select("id")
          .eq("id", input.productId)
          .single();
        if (found.error) throw new AppError(404, "Produto não encontrado.");
        check(
          (
            await client.from("favorites").upsert(
              {
                owner_id: user.id,
                product_id: input.productId,
                ...(input.notes !== undefined ? { notes: input.notes } : {}),
                ...(input.status ? { status: input.status } : {}),
              },
              { onConflict: "owner_id,product_id" },
            )
          ).error,
        );
      }
      return NextResponse.json({ ok: true });
    }
    if (path === "settings" && write) {
      const input = z
        .object({ appName: z.string().trim().min(2).max(80) })
        .parse(await body(req, 10000));
      check(
        (
          await client
            .from("application_settings")
            .upsert({ owner_id: user.id, app_name: input.appName })
        ).error,
      );
      return NextResponse.json({ ok: true });
    }
    if (path === "analyze" && write) {
      const input = analysisSchema.parse(await body(req));
      if (input.url) publicUrl.parse(input.url);
      let offer = null;
      if (input.productId) {
        const row = await client
          .from("products")
          .select("payload")
          .eq("id", input.productId)
          .single();
        if (row.error) throw new AppError(404, "Produto não encontrado.");
        offer = offerSchema.parse(row.data.payload);
      }
      const safeInput = {
        text: input.text,
        url: input.url,
        offer,
        hasImage: !!input.image,
      };
      const record = {
        owner_id: user.id,
        product_id: input.productId ?? null,
        input: safeInput,
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      };
      try {
        const report = await new GeminiProvider().analyze(
          JSON.stringify(safeInput),
          input.image,
        );
        const saved = await client
          .from("ai_analyses")
          .insert({ ...record, report })
          .select("id")
          .single();
        check(saved.error);
        return NextResponse.json({ report, id: saved.data?.id });
      } catch (error) {
        const saved = await client.from("ai_analyses").insert({
          ...record,
          error:
            error instanceof AppError
              ? error.message
              : "Falha no processamento.",
        });
        check(saved.error);
        throw error;
      }
    }
    throw new AppError(404, "Operação não encontrada.");
  } catch (error) {
    return failure(error);
  }
}
export const GET = handle;
export const POST = handle;
