import { z } from "zod";
export const niches = [
  "Saúde e bem-estar",
  "Culinária",
  "Finanças pessoais",
  "Relacionamentos",
  "Educação",
  "Desenvolvimento pessoal",
  "Organização e produtividade",
  "Habilidades práticas",
] as const;
export const productTypes = [
  "E-book",
  "Apostila",
  "Guia prático",
  "Planilha",
  "Material educativo",
  "Receitas digitais",
  "Kit digital",
  "Curso digital",
] as const;
export const statuses = [
  "Encontrado",
  "Em análise",
  "Interessante",
  "Selecionado para estudo",
  "Descartado",
] as const;
// Links are references only. No server-side retrieval of user URLs.
export const publicUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        !u.port &&
        !u.hash &&
        /^[a-z0-9.-]+$/i.test(u.hostname) &&
        !/^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.test|\d+(\.\d+)*|0x[\da-f]+)$/i.test(
          u.hostname,
        ) &&
        u.hostname.includes(".")
      );
    } catch {
      return false;
    }
  }, "Use uma URL HTTPS pública, sem credenciais, porta ou fragmento.");
const link = z
  .union([publicUrl, z.literal("")])
  .optional()
  .transform((v) => v || null);
export const offerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  advertiser: z.string().trim().min(2).max(160),
  niche: z.enum(niches),
  subniche: z.string().trim().max(120).default(""),
  problem: z.string().trim().max(500).default(""),
  audience: z.string().trim().max(500).default(""),
  type: z.enum(productTypes),
  country: z.string().trim().length(2).default("BR"),
  language: z.string().trim().min(2).max(10).default("pt"),
  price: z.number().min(0).max(100000).nullable().default(null),
  activeAds: z.number().int().min(0).max(100000).nullable().default(null),
  startedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (v) =>
        !isNaN(Date.parse(v)) &&
        new Date(v).toISOString().startsWith(v) &&
        Date.parse(v) <= Date.now(),
      "Data inválida ou futura",
    )
    .nullable()
    .default(null),
  creatives: z.number().int().min(0).max(100000).nullable().default(null),
  repeatedOffer: z.boolean().nullable().default(null),
  clarity: z.number().int().min(0).max(5).nullable().default(null),
  differentiation: z.number().int().min(0).max(5).nullable().default(null),
  adUrl: link,
  salesUrl: link,
  mediaUrl: link,
  adText: z.string().trim().max(20000).default(""),
  evidence: z.string().trim().min(10).max(5000),
  observedAt: z.iso
    .datetime()
    .refine((v) => Date.parse(v) <= Date.now(), "Observação futura"),
});
export type OfferInput = z.infer<typeof offerSchema>;
export type Offer = OfferInput & {
  id: string;
  created_at: string;
  provenance: "manual" | "import";
  verified_at: null;
};
export const filtersSchema = z
  .object({
    keyword: z.string().max(160).default(""),
    niche: z.string().max(120).default(""),
    subniche: z.string().max(120).default(""),
    country: z.string().max(2).default("BR"),
    language: z.string().max(10).default("pt"),
    type: z.string().max(80).default(""),
    advertiser: z.string().max(160).default(""),
    minAds: z.number().int().min(0).max(100000).default(15),
    minDays: z.number().int().min(0).max(10000).default(0),
    minPrice: z.number().min(0).default(9.9),
    maxPrice: z.number().min(0).default(67),
    limit: z.number().int().min(1).max(100).default(20),
    since: z.union([z.iso.date(), z.literal("")]).default(""),
  })
  .refine((v) => v.minPrice <= v.maxPrice, "Preço mínimo maior que máximo");
export type Filters = z.infer<typeof filtersSchema>;
export function rank(o: OfferInput, now = Date.now()) {
  const days = o.startedAt
    ? Math.max(0, Math.floor((now - Date.parse(o.startedAt)) / 86400000))
    : null;
  const criteria = [
    {
      name: "Anúncios ativos",
      max: 25,
      points: o.activeAds === null ? 0 : Math.min(25, (o.activeAds / 15) * 25),
      known: o.activeAds !== null,
    },
    {
      name: "Persistência",
      max: 20,
      points: days === null ? 0 : Math.min(20, (days / 60) * 20),
      known: days !== null,
    },
    {
      name: "Variedade de criativos",
      max: 10,
      points: o.creatives === null ? 0 : Math.min(10, o.creatives * 2),
      known: o.creatives !== null,
    },
    {
      name: "Repetição de ofertas",
      max: 10,
      points: o.repeatedOffer ? 10 : 0,
      known: o.repeatedOffer !== null,
    },
    {
      name: "Clareza da proposta",
      max: 10,
      points: (o.clarity ?? 0) * 2,
      known: o.clarity !== null,
    },
    {
      name: "Problema específico",
      max: 5,
      points: o.problem ? 5 : 0,
      known: !!o.problem,
    },
    {
      name: "Diferenciação (avaliação manual)",
      max: 10,
      points: (o.differentiation ?? 0) * 2,
      known: o.differentiation !== null,
    },
    {
      name: "Evidência declarada",
      max: 10,
      points: o.evidence ? 5 : 0,
      known: !!o.evidence,
    },
  ];
  // User-supplied signals are discounted. No automated source is independently verified yet.
  const score = Math.round(criteria.reduce((s, c) => s + c.points, 0) * 0.6);
  const coverage = Math.round(
    (criteria.filter((c) => c.known).length / criteria.length) * 100,
  );
  return {
    score,
    days,
    coverage,
    confidence: "Baixa — dados declarados, sem verificação independente",
    criteria: criteria.map((c) => ({
      ...c,
      points: Math.round(c.points * 0.6 * 10) / 10,
      max: c.max * 0.6,
    })),
    label:
      score < 40
        ? "Baixa prioridade"
        : score < 60
          ? "Oportunidade moderada"
          : score < 80
            ? "Oportunidade interessante"
            : "Alta prioridade de investigação",
  };
}
export function matches(o: Offer, f: Filters, now = Date.now()) {
  const contains = (a: string, b: string) =>
    a.toLocaleLowerCase("pt-BR").includes(b.toLocaleLowerCase("pt-BR"));
  return (
    contains([o.name, o.adText, o.problem, o.subniche].join(" "), f.keyword) &&
    (!f.niche || o.niche === f.niche) &&
    contains(o.subniche, f.subniche) &&
    (!f.country || o.country.toUpperCase() === f.country.toUpperCase()) &&
    (!f.language || o.language === f.language) &&
    (!f.type || o.type === f.type) &&
    contains(o.advertiser, f.advertiser) &&
    (o.activeAds === null || o.activeAds >= f.minAds) &&
    (o.price === null || (o.price >= f.minPrice && o.price <= f.maxPrice)) &&
    (!o.startedAt || rank(o, now).days! >= f.minDays) &&
    (!f.since || o.created_at >= f.since)
  );
}
export function radar(offers: Offer[]) {
  return niches.map((niche) => {
    const products = offers.filter((o) => o.niche === niche);
    const counts = products
      .map((o) => o.activeAds)
      .filter((v): v is number => v !== null);
    return {
      niche,
      products,
      activeAds: counts.length ? counts.reduce((a, b) => a + b, 0) : null,
      advertisers: new Set(products.map((o) => o.advertiser)).size,
    };
  });
}
