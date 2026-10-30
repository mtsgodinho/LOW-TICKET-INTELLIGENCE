import { describe, it, expect, vi, afterEach } from "vitest";
import { body, sameOrigin, configured, AppError } from "../src/lib/server";
import {
  GeminiProvider,
  validateImage,
  reportSchema,
  sections,
} from "../src/lib/ai";
import { POST, GET } from "../src/app/api/[...path]/route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("limites de entrada", () => {
  it("recusa origem diferente ou ausente", () => {
    expect(() =>
      sameOrigin(
        new Request("https://app.example/api/mine", {
          headers: { origin: "https://evil.example" },
        }),
      ),
    ).toThrow();
    expect(() =>
      sameOrigin(new Request("https://app.example/api/mine")),
    ).toThrow();
    expect(() =>
      sameOrigin(
        new Request("https://app.example/api/mine", {
          headers: { origin: "https://app.example" },
        }),
      ),
    ).not.toThrow();
  });
  it("limita bytes efetivos e valida JSON", async () => {
    await expect(
      body(
        new Request("https://app.example", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: '{"long":"abcdef"}',
        }),
        5,
      ),
    ).rejects.toMatchObject({ status: 413 });
    await expect(
      body(
        new Request("https://app.example", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("recusa arquivo disfarçado e maior que o limite", () => {
    expect(() =>
      validateImage({
        mime: "image/png",
        data: Buffer.from("<script>").toString("base64"),
      }),
    ).toThrow();
    expect(() =>
      validateImage({
        mime: "image/jpeg",
        data: Buffer.alloc(2000001).toString("base64"),
      }),
    ).toThrow();
  });
  it("aceita assinatura PNG", () =>
    expect(() =>
      validateImage({
        mime: "image/png",
        data: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64"),
      }),
    ).not.toThrow());
});
describe("proteção das APIs", () => {
  it.each(["state", "search/00000000-0000-4000-8000-000000000000"])(
    "GET %s falha fechado sem configuração",
    async (path) => {
      vi.stubEnv("SUPABASE_URL", "");
      const r = await GET(new Request(`https://app.example/api/${path}`), {
        params: Promise.resolve({ path: path.split("/") }),
      });
      expect(r.status).toBe(503);
    },
  );
  it("POST não pode contornar proteção de origem", async () => {
    const r = await POST(
      new Request("https://app.example/api/offers", {
        method: "POST",
        headers: { origin: "https://evil.example" },
      }),
      { params: Promise.resolve({ path: ["offers"] }) },
    );
    expect(r.status).toBe(403);
  });
  it("não considera URL isolada como ambiente autenticado configurado", () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("ADMIN_USER_ID", "");
    expect(configured()).toBe(false);
  });
});
describe("Gemini (contrato testado com mocks, sem chamada real)", () => {
  it("falha explicitamente sem chave", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(new GeminiProvider().analyze("teste")).rejects.toMatchObject({
      status: 503,
    });
  });
  it("valida relatório completo e usa apenas endpoint fixo", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-only-not-a-secret");
    const report = Object.fromEntries(
      sections.map((s) => [
        s,
        { fatos: [], hipoteses: ["Hipótese de teste"], recomendacoes: [] },
      ]),
    );
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: JSON.stringify(report) }] },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetch);
    expect(
      await new GeminiProvider().analyze(
        "https://localhost instrução não confiável",
      ),
    ).toEqual(report);
    expect(fetch.mock.calls[0][0]).toMatch(
      /^https:\/\/generativelanguage.googleapis.com\//,
    );
    expect(reportSchema.safeParse({}).success).toBe(false);
  });
  it("não aceita relatório truncado nem quota excedida", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-only");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
      });
    vi.stubGlobal("fetch", fetch);
    await expect(new GeminiProvider().analyze("teste")).rejects.toMatchObject({
      status: 429,
    });
    await expect(new GeminiProvider().analyze("teste")).rejects.toBeInstanceOf(
      AppError,
    );
  });
});
