import { describe, it, expect } from "vitest";
import {
  offerSchema,
  filtersSchema,
  matches,
  rank,
  publicUrl,
  radar,
  type Offer,
} from "../src/lib/domain";
import { suppliedData, importSchema } from "../src/lib/connectors";
const input = {
  name: "Oferta de teste unitário",
  advertiser: "Anunciante de teste",
  niche: "Culinária",
  type: "E-book",
  evidence: "Fixture sintética exclusiva para testes automatizados.",
  observedAt: "2026-01-01T12:00:00.000Z",
};
const make = (extra: object = {}): Offer => ({
  ...offerSchema.parse({ ...input, ...extra }),
  id: crypto.randomUUID(),
  created_at: "2026-01-01T12:00:00.000Z",
  provenance: "manual",
  verified_at: null,
});
describe("dados e ranking", () => {
  it.each([
    {},
    { adUrl: "", salesUrl: "", mediaUrl: "" },
    { adUrl: null, salesUrl: null, mediaUrl: null },
    { adUrl: "https://www.facebook.com/ads/library/?id=123", salesUrl: null },
  ])("revalida oferta persistida com links opcionais: %j", (links) => {
    const saved = offerSchema.parse({ ...input, ...links });
    const loaded = offerSchema.parse(JSON.parse(JSON.stringify(saved)));
    expect(loaded).toEqual(saved);
    for (const field of ["adUrl", "salesUrl", "mediaUrl"] as const)
      expect(loaded[field] === null || typeof loaded[field] === "string").toBe(
        true,
      );
  });

  it("preserva desconhecidos e não inventa preço ou anúncios", () => {
    const o = make();
    expect(o.price).toBeNull();
    expect(o.activeAds).toBeNull();
    expect(rank(o).score).toBe(3);
    expect(rank(o).confidence).toContain("Baixa");
  });
  it("não recompensa ausência de evidências e limita os sinais não verificados", () => {
    const sparse = make();
    const full = make({
      activeAds: 100,
      startedAt: "2025-01-01",
      creatives: 10,
      repeatedOffer: true,
      clarity: 5,
      problem: "Problema de teste",
      differentiation: 5,
    });
    expect(rank(full).score).toBe(57);
    expect(rank(full).score).toBeGreaterThan(rank(sparse).score);
    expect(rank(full).criteria.reduce((s, c) => s + c.points, 0)).toBe(57);
  });
  it("aceita zero real e rejeita preços negativos, datas impossíveis e futuras", () => {
    expect(make({ price: 0, activeAds: 0 }).price).toBe(0);
    for (const extra of [
      { price: -1 },
      { startedAt: "2026-02-30" },
      { startedAt: "2999-01-01" },
      { observedAt: "2999-01-01T00:00:00Z" },
    ])
      expect(() => make(extra)).toThrow();
  });
});
describe("URLs sem coleta remota", () => {
  it.each([
    "http://example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://2130706433",
    "https://[::1]",
    "https://0x7f000001",
    "https://metadata.google.internal",
    "https://a:b@example.com",
    "https://example.com:444",
    "javascript:alert(1)",
    "https://example.com/#x",
  ])("recusa %s", (value) => {
    expect(publicUrl.safeParse(value).success).toBe(false);
  });
  it("aceita referência HTTPS pública", () =>
    expect(
      publicUrl.parse("https://www.facebook.com/ads/library/?id=123"),
    ).toBeTruthy());
});
describe("filtros e conectores", () => {
  it("mantém oportunidades com métricas desconhecidas", () =>
    expect(matches(make(), filtersSchema.parse({}))).toBe(true));
  it("aplica preço, anúncios, termo sem diferenciar maiúsculas e filtros combinados", () => {
    const o = make({
      price: 19.9,
      activeAds: 20,
      startedAt: "2025-01-01",
      subniche: "Marmitas",
    });
    expect(
      matches(
        o,
        filtersSchema.parse({
          keyword: "MARMITAS",
          niche: "Culinária",
          minDays: 30,
          minPrice: 9.9,
          maxPrice: 67,
        }),
      ),
    ).toBe(true);
    for (const f of [
      { keyword: "finanças" },
      { minAds: 21 },
      { maxPrice: 10 },
      { country: "US" },
      { language: "en" },
      { type: "Planilha" },
      { subniche: "Bolos" },
      { advertiser: "Outro" },
      { since: "2026-02-01" },
    ])
      expect(matches(o, filtersSchema.parse(f))).toBe(false);
  });
  it("ordena, limita e retorna vazio sem inventar produtos", () => {
    const a = make(),
      b = make({ activeAds: 20 });
    expect(
      suppliedData.search([a, b], filtersSchema.parse({ limit: 1 })),
    ).toEqual([b]);
    expect(suppliedData.search([], filtersSchema.parse({}))).toEqual([]);
  });
  it("rejeita faixa invertida e importação inválida", () => {
    expect(
      filtersSchema.safeParse({ minPrice: 100, maxPrice: 50 }).success,
    ).toBe(false);
    expect(importSchema.safeParse([]).success).toBe(false);
    expect(importSchema.safeParse([{ name: "Incompleto" }]).success).toBe(
      false,
    );
  });
  it("radar soma apenas números conhecidos e não inventa demanda", () => {
    const r = radar([make(), make({ activeAds: 12 })]).find(
      (r) => r.niche === "Culinária",
    )!;
    expect(r.activeAds).toBe(12);
    expect(r.products).toHaveLength(2);
    expect(radar([])[0].activeAds).toBeNull();
  });
});
