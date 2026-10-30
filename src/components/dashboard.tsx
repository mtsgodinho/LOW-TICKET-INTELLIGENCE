"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Radar,
  Pickaxe,
  Heart,
  Sparkles,
  History,
  Settings,
  ChevronRight,
  ArrowUpRight,
  SlidersHorizontal,
  Plus,
  Upload,
  Search,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Database,
  Target,
  Layers,
  Activity,
  Bookmark,
  Check,
  LoaderCircle,
  Info,
} from "lucide-react";
import {
  niches,
  productTypes,
  statuses,
  filtersSchema,
  rank,
  radar,
  type Offer,
  type Filters,
} from "@/lib/domain";
import type { reportSchema } from "@/lib/ai";
const sections = [
  "identificacao",
  "publico",
  "estrategia",
  "criativos",
  "pagina",
  "diferenciacao",
  "conclusao",
] as const;
import type { z } from "zod";
type Report = z.infer<typeof reportSchema>;
type Favorite = {
  id: string;
  product_id: string;
  notes: string;
  status: (typeof statuses)[number];
};
type HistoryRow = {
  id: string;
  created_at: string;
  filters: Filters;
  result_count: number;
  source: string;
  error?: string;
};
type Analysis = {
  id: string;
  created_at: string;
  report: Report | null;
  error: string | null;
  input: { text?: string; url?: string; hasImage?: boolean };
  model: string;
};
type State = {
  offers: Offer[];
  favorites: Favorite[];
  searches: HistoryRow[];
  analyses: Analysis[];
  appName: string;
  aiConfigured: boolean;
};
const empty: State = {
  offers: [],
  favorites: [],
  searches: [],
  analyses: [],
  appName: "Low Ticket Intelligence",
  aiConfigured: false,
};
const nav = [
  { id: "mineracao", name: "Mineração", icon: Pickaxe },
  { id: "radar", name: "Radar de Nichos", icon: Radar },
  { id: "favoritos", name: "Produtos Favoritos", icon: Heart },
  { id: "analise", name: "Análise de Ofertas com IA", icon: Sparkles },
  { id: "historico", name: "Histórico", icon: History },
  { id: "configuracoes", name: "Configurações", icon: Settings },
];
const money = (v: number | null) =>
  v === null
    ? "Preço não identificado"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(v);
const date = (v: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(v));
async function api(path: string, data?: unknown) {
  const r = await fetch(
    `/api/${path}`,
    data === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  const result = await r.json();
  if (!r.ok) throw new Error(result.error || "Falha na operação.");
  return result;
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}
function Out({
  href,
  children,
}: {
  href?: string | null;
  children: React.ReactNode;
}) {
  return href ? (
    <a
      className="text-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={14} />
    </a>
  ) : (
    <span className="unavailable">Link não informado</span>
  );
}
export default function Dashboard({
  section,
  configured,
  initialProductId = "",
}: {
  section: string;
  configured: boolean;
  initialProductId?: string;
}) {
  const router = useRouter();
  const [favoriteNiche, setFavoriteNiche] = useState("");
  const [state, setState] = useState<State>(empty),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(configured),
    [menu, setMenu] = useState(false),
    [modal, setModal] = useState(false),
    [detail, setDetail] = useState<Offer | null>(null),
    [results, setResults] = useState<Offer[] | null>(null),
    [filters, setFilters] = useState<Filters>(filtersSchema.parse({})),
    [advanced, setAdvanced] = useState(false),
    [report, setReport] = useState<Report | null>(null),
    [selected, setSelected] = useState(initialProductId);
  const reload = useCallback(async () => {
    if (configured) setState(await api("state"));
  }, [configured]);
  useEffect(() => {
    let active = true;
    if (configured)
      api("state")
        .then((s) => {
          if (active) setState(s);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    return () => {
      active = false;
    };
  }, [configured]);
  async function run(fn: () => Promise<void>) {
    if (!configured) {
      setError(
        "Configure o Supabase e o administrador para habilitar esta operação.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }
  const setFilter = (key: keyof Filters, value: string | number) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const favorite = async (o: Offer, remove = false) =>
    run(async () => {
      await api("favorite", { productId: o.id, remove });
      await reload();
      setNotice(remove ? "Favorito removido." : "Produto salvo nos favoritos.");
    });
  const analyze = (o: Offer) => {
    setSelected(o.id);
    router.push(`/analise?produto=${o.id}`);
  };
  const offers = results ?? [];
  const favoriteOffers = state.offers.filter(
    (o) =>
      state.favorites.some((f) => f.product_id === o.id) &&
      (!favoriteNiche || o.niche === favoriteNiche),
  );
  return (
    <div className="app-shell">
      <div className="tactical-background" aria-hidden="true">
        <div className="tactical-grid" />
        <div className="radar-sweep" />
        <div className="ambient-orb orb-one" />
        <div className="ambient-orb orb-two" />
        <div className="scan-line" />
      </div>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Link href="/mineracao" className="brand">
          <span className="brand-icon">
            <Radar size={27} />
          </span>
          <span>
            {state.appName === "Low Ticket Intelligence" ? (
              <>
                LOW TICKET<strong>INTELLIGENCE</strong>
              </>
            ) : (
              state.appName
            )}
          </span>
        </Link>
        <div className="workspace-label">
          <span className="online-dot" /> Operação privada{" "}
          <span className="tiny-badge">FASE 01</span>
        </div>
        <p className="nav-caption">INTELIGÊNCIA DE MERCADO</p>
        <nav>
          {nav.map((n) => (
            <Link
              key={n.id}
              className={section === n.id ? "active" : ""}
              href={`/${n.id}`}
              onClick={() => setMenu(false)}
            >
              <n.icon size={19} />
              <span>{n.name}</span>
              {n.id === "favoritos" && <small>{state.favorites.length}</small>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="source-card">
            <ShieldCheck size={20} />
            <b>Inteligência com evidências</b>
            <p>
              Dados transparentes.
              <br />
              Decisões mais conscientes.
            </p>
          </div>
          <div className="profile">
            <div className="avatar">AD</div>
            <div>
              <b>Administrador</b>
              <small>Operação própria</small>
            </div>
            <button
              aria-label="Sair"
              onClick={() =>
                run(async () => {
                  await api("logout", {});
                  router.push("/login");
                  router.refresh();
                })
              }
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div>
            <button
              className="mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
            <span className="muted">Workspace</span>
            <ChevronRight size={14} />
            <span>{nav.find((n) => n.id === section)?.name}</span>
          </div>
          <span className="top-status">
            <span className="online-dot" />
            {configured ? "Acesso configurado" : "Configuração pendente"}
          </span>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                SUA PRÓXIMA OPORTUNIDADE COMEÇA COM UM SINAL
              </p>
              <h1>{nav.find((n) => n.id === section)?.name}</h1>
              <p className="muted">
                {section === "mineracao"
                  ? "Explore ofertas digitais. Identifique sinais. Encontre espaço para fazer diferente."
                  : section === "radar"
                    ? "Uma visão dos nichos presentes nas suas fontes de pesquisa."
                    : section === "analise"
                      ? "Transforme evidências em hipóteses e próximos passos."
                      : section === "favoritos"
                        ? "Seu acervo de oportunidades para investigar com mais profundidade."
                        : section === "historico"
                          ? "Retome suas pesquisas e acompanhe suas análises."
                          : "Controle sua central de inteligência e conheça suas fontes."}
              </p>
            </div>
            {section === "mineracao" && (
              <button className="secondary" onClick={() => setModal(true)}>
                <Plus size={16} />
                Adicionar oferta
              </button>
            )}
          </div>
          {!configured && (
            <div className="banner">
              <Info size={19} />
              <div>
                <b>Ambiente aguardando configuração</b>
                <p>
                  Supabase e acesso administrativo ainda não configurados. Esta
                  tela está vazia; nenhuma oferta foi simulada. Consulte
                  Configurações e o README para habilitar as operações.
                </p>
              </div>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
              <button aria-label="Fechar erro" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="success" role="status">
              <Check size={16} />
              {notice}
            </div>
          )}
          {loading ? (
            <div className="empty">
              <LoaderCircle className="spin" />
              Carregando dados persistidos…
            </div>
          ) : (
            <>
              {section === "mineracao" && (
                <>
                  <div className="mission-strip">
                    <span className="mission-label">
                      <span className="online-dot" /> CENTRAL DE RECONHECIMENTO
                    </span>
                    <span>
                      FONTES DECLARADAS <b> / </b> SINAIS OBSERVÁVEIS <b> / </b>{" "}
                      DECISÕES HUMANAS
                    </span>
                    <span className="mission-id">LTI — 01</span>
                  </div>
                  <div className="stats">
                    <Stat
                      icon={Layers}
                      label="Ofertas no acervo"
                      value={state.offers.length}
                      hint="Cadastradas ou importadas"
                    />
                    <Stat
                      icon={Target}
                      label="Resultados da pesquisa"
                      value={results?.length ?? "—"}
                      hint="Após aplicar seus filtros"
                    />
                    <Stat
                      icon={Bookmark}
                      label="Oportunidades salvas"
                      value={state.favorites.length}
                      hint="Sua seleção para estudo"
                    />
                    <Stat
                      icon={Activity}
                      label="Pesquisas realizadas"
                      value={state.searches.length}
                      hint="Últimas 100 pesquisas"
                    />
                  </div>
                  <section className="panel mining-panel">
                    <div className="panel-title">
                      <div className="icon-tile">
                        <SlidersHorizontal size={19} />
                      </div>
                      <div>
                        <h2>Encontre o que vale investigar</h2>
                        <p>
                          Defina sua busca e explore o acervo de fontes
                          fornecidas.
                        </p>
                      </div>
                      <span className="tiny-badge">PESQUISA MANUAL</span>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(async () => {
                          const r = await api("mine", filters);
                          setResults(r.results);
                          await reload();
                          setNotice(
                            `${r.results.length} resultado(s). Pesquisa salva no histórico.`,
                          );
                        });
                      }}
                    >
                      <div className="filter-grid">
                        <Field label="Palavra-chave">
                          <div className="input-icon">
                            <Search size={17} />
                            <input
                              value={filters.keyword}
                              onChange={(e) =>
                                setFilter("keyword", e.target.value)
                              }
                              placeholder="Ex.: marmitas, organização financeira…"
                            />
                          </div>
                        </Field>
                        <Field label="Nicho">
                          <select
                            value={filters.niche}
                            onChange={(e) => setFilter("niche", e.target.value)}
                          >
                            <option value="">Todos os nichos</option>
                            {niches.map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="País">
                          <input
                            maxLength={2}
                            value={filters.country}
                            onChange={(e) =>
                              setFilter("country", e.target.value)
                            }
                            placeholder="BR"
                          />
                        </Field>
                      </div>
                      <div className="filter-grid four">
                        <Field label="Mínimo de anúncios ativos">
                          <input
                            type="number"
                            min={0}
                            max={100000}
                            value={filters.minAds}
                            onChange={(e) =>
                              setFilter("minAds", +e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Preço mínimo (R$)">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={filters.minPrice}
                            onChange={(e) =>
                              setFilter("minPrice", +e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Preço máximo (R$)">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={filters.maxPrice}
                            onChange={(e) =>
                              setFilter("maxPrice", +e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Quantidade de oportunidades">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={filters.limit}
                            onChange={(e) =>
                              setFilter("limit", +e.target.value)
                            }
                          />
                        </Field>
                      </div>
                      {advanced && (
                        <div className="filter-grid four">
                          <Field label="Subnicho">
                            <input
                              value={filters.subniche}
                              onChange={(e) =>
                                setFilter("subniche", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Anunciante">
                            <input
                              value={filters.advertiser}
                              onChange={(e) =>
                                setFilter("advertiser", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Veiculação mínima (dias)">
                            <input
                              type="number"
                              min={0}
                              max={10000}
                              value={filters.minDays}
                              onChange={(e) =>
                                setFilter("minDays", +e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Tipo de produto">
                            <select
                              value={filters.type}
                              onChange={(e) =>
                                setFilter("type", e.target.value)
                              }
                            >
                              <option value="">Todos</option>
                              {productTypes.map((t) => (
                                <option key={t}>{t}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Idioma">
                            <input
                              value={filters.language}
                              onChange={(e) =>
                                setFilter("language", e.target.value)
                              }
                            />
                          </Field>
                          <Field label="Cadastrado a partir de">
                            <input
                              type="date"
                              value={filters.since}
                              onChange={(e) =>
                                setFilter("since", e.target.value)
                              }
                            />
                          </Field>
                        </div>
                      )}
                      <div className="filter-footer">
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => setAdvanced(!advanced)}
                        >
                          <SlidersHorizontal size={15} />
                          {advanced ? "Ocultar filtros" : "Mais filtros"}
                        </button>
                        <small>
                          Dados desconhecidos permanecem nos resultados.
                        </small>
                        <button className="primary" disabled={busy}>
                          <Pickaxe size={17} />
                          {busy ? "Consultando…" : "MINERAR PRODUTOS"}
                        </button>
                      </div>
                    </form>
                  </section>
                  <div className="results-heading">
                    <div>
                      <h2>
                        Oportunidades encontradas{" "}
                        <span className="count">{offers.length}</span>
                      </h2>
                      <p className="muted">
                        Ordenadas por sinais observáveis, com critérios
                        transparentes.
                      </p>
                    </div>
                    <span className="muted small">
                      <SlidersHorizontal size={14} /> Maior pontuação primeiro
                    </span>
                  </div>
                  {results === null ? (
                    <Empty
                      icon={Radar}
                      title="Sua próxima pesquisa começa aqui"
                      text="Adicione ofertas reais ou importe seu levantamento. Depois, aplique os filtros para organizar as oportunidades."
                      action={
                        <button
                          className="secondary"
                          onClick={() => setModal(true)}
                        >
                          <Plus size={16} />
                          Adicionar primeira oferta
                        </button>
                      }
                    />
                  ) : offers.length === 0 ? (
                    <Empty
                      icon={Search}
                      title="Nenhuma oferta atende à pesquisa"
                      text="Revise os filtros ou adicione novas fontes ao acervo. A pesquisa vazia também foi salva."
                    />
                  ) : (
                    <div className="offer-grid">
                      {offers.map((o) => (
                        <OfferCard
                          key={o.id}
                          offer={o}
                          saved={state.favorites.some(
                            (f) => f.product_id === o.id,
                          )}
                          onFavorite={() =>
                            favorite(
                              o,
                              state.favorites.some(
                                (f) => f.product_id === o.id,
                              ),
                            )
                          }
                          onDetail={() => setDetail(o)}
                          onAnalyze={() => analyze(o)}
                          busy={busy}
                        />
                      ))}
                    </div>
                  )}
                  <div className="footnote">
                    <ShieldCheck size={16} />
                    <span>
                      A pontuação indica prioridade de investigação. Não
                      comprova vendas, faturamento ou lucratividade.
                    </span>
                  </div>
                </>
              )}
              {section === "radar" && (
                <>
                  <div className="banner">
                    <Info size={19} />
                    <p>
                      O radar reflete apenas seu acervo. Contagens são
                      declaradas pelo usuário, podem se sobrepor e não medem o
                      mercado inteiro. Concorrência e demanda não são
                      verificadas.
                    </p>
                  </div>
                  <div className="radar-grid">
                    {radar(state.offers).map((r, i) => (
                      <section className="panel radar-card" key={r.niche}>
                        <div className="radar-top">
                          <span className="icon-tile">
                            <Radar size={22} />
                          </span>
                          <span className="muted">0{i + 1}</span>
                        </div>
                        <h2>{r.niche}</h2>
                        <div className="radar-line">
                          <span>Produtos identificados</span>
                          <b>{r.products.length}</b>
                        </div>
                        <div className="radar-line">
                          <span>Anúncios declarados</span>
                          <b>{r.activeAds ?? "Não informado"}</b>
                        </div>
                        <div className="radar-line">
                          <span>Anunciantes distintos</span>
                          <b>{r.advertisers}</b>
                        </div>
                        <p className="muted small">
                          Concorrência: evidência insuficiente
                        </p>
                        {r.products.slice(0, 5).map((o) => (
                          <button
                            className="radar-product"
                            key={o.id}
                            onClick={() => setDetail(o)}
                          >
                            <span>
                              <b>{o.subniche || o.name}</b>
                              <small>
                                {o.problem || "Problema não informado"} ·{" "}
                                {o.audience || "Público não informado"}
                              </small>
                            </span>
                            <ChevronRight size={16} />
                          </button>
                        ))}
                        {!r.products.length && (
                          <p className="muted small">
                            Nenhuma oferta cadastrada neste nicho.
                          </p>
                        )}
                      </section>
                    ))}
                  </div>
                </>
              )}
              {section === "favoritos" && (
                <Field label="Filtrar por nicho">
                  <select
                    value={favoriteNiche}
                    onChange={(e) => setFavoriteNiche(e.target.value)}
                  >
                    <option value="">Todos os nichos</option>
                    {niches.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </Field>
              )}
              {section === "favoritos" &&
                (favoriteOffers.length ? (
                  <div className="offer-grid">
                    {favoriteOffers.map((o) => {
                      const f = state.favorites.find(
                        (f) => f.product_id === o.id,
                      )!;
                      return (
                        <div key={o.id}>
                          <OfferCard
                            offer={o}
                            saved
                            onFavorite={() => favorite(o, true)}
                            onDetail={() => setDetail(o)}
                            onAnalyze={() => analyze(o)}
                            busy={busy}
                          />
                          <form
                            className="panel favorite-notes"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const fields = new FormData(e.currentTarget);
                              run(async () => {
                                await api("favorite", {
                                  productId: o.id,
                                  status: fields.get("status"),
                                  notes: fields.get("notes"),
                                });
                                await reload();
                                setNotice("Observações atualizadas.");
                              });
                            }}
                          >
                            <Field label="Status">
                              <select name="status" defaultValue={f.status}>
                                {statuses.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </Field>
                            <Field label="Suas observações">
                              <textarea
                                name="notes"
                                maxLength={5000}
                                defaultValue={f.notes}
                                rows={3}
                              />
                            </Field>
                            <button className="secondary" disabled={busy}>
                              Salvar observações
                            </button>
                          </form>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty
                    icon={Heart}
                    title="Seu espaço de boas oportunidades"
                    text="Salve ofertas na mineração para acompanhá-las aqui. Seus favoritos e observações ficarão no banco de dados."
                  />
                ))}
              {section === "analise" && (
                <div className="analysis-layout">
                  <section className="panel">
                    <div className="panel-title">
                      <Sparkles className="cyan" />
                      <div>
                        <h2>Análise sob demanda</h2>
                        <p>A IA só é acionada quando você solicitar.</p>
                      </div>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const file = f.get("image") as File;
                        const productId = String(f.get("productId") || "");
                        run(async () => {
                          let image;
                          if (file?.size) {
                            if (file.size > 2000000)
                              throw new Error("Limite de 2 MB por imagem.");
                            image = {
                              mime: file.type,
                              data: await new Promise<string>(
                                (resolve, reject) => {
                                  const reader = new FileReader();
                                  reader.onload = () =>
                                    resolve(
                                      String(reader.result).split(",")[1],
                                    );
                                  reader.onerror = reject;
                                  reader.readAsDataURL(file);
                                },
                              ),
                            };
                          }
                          try {
                            const result = await api("analyze", {
                              ...(productId ? { productId } : {}),
                              text: f.get("text"),
                              url: f.get("url"),
                              ...(image ? { image } : {}),
                            });
                            setReport(result.report);
                          } finally {
                            await reload();
                          }
                        });
                      }}
                    >
                      <Field label="Oferta do acervo">
                        <select
                          name="productId"
                          value={selected}
                          onChange={(e) => setSelected(e.target.value)}
                        >
                          <option value="">Análise manual</option>
                          {state.offers.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Link de referência (anúncio ou página)">
                        <input name="url" type="url" placeholder="https://…" />
                      </Field>
                      <p className="muted small">
                        O link fica registrado como referência. Cole abaixo o
                        conteúdo da página; o servidor não acessa URLs externas.
                      </p>
                      <Field label="Conteúdo da oferta e texto publicitário">
                        <textarea
                          name="text"
                          maxLength={30000}
                          rows={9}
                          placeholder="Nome, preço observado, promessa, público, texto do anúncio, conteúdo da página e suas evidências…"
                        />
                      </Field>
                      <Field label="Imagem ou captura de tela">
                        <input
                          name="image"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                        />
                      </Field>
                      <p className="muted small">
                        PNG, JPEG ou WebP · até 2 MB · enviada apenas ao
                        provedor durante a análise; não é armazenada.
                      </p>
                      <button className="primary" disabled={busy}>
                        <Sparkles size={17} />
                        {busy ? "Analisando…" : "ANALISAR OFERTA"}
                      </button>
                      {!state.aiConfigured && (
                        <p className="muted small">
                          Chave Gemini ainda não configurada no servidor.
                        </p>
                      )}
                    </form>
                  </section>
                  <section>
                    {report ? (
                      <ReportView report={report} />
                    ) : (
                      <Empty
                        icon={Sparkles}
                        title="Inteligência com contexto"
                        text="Forneça evidências para receber um relatório com identificação, público, estratégia, criativos, página, diferenciação e conclusão. Fatos, hipóteses e recomendações aparecem separados."
                      />
                    )}
                  </section>
                </div>
              )}
              {section === "historico" && (
                <>
                  <section className="panel">
                    <h2>Minerações realizadas</h2>
                    <p className="muted small">
                      Últimas 100 pesquisas. Horários de Brasília. Os resultados
                      preservam os dados do momento da pesquisa.
                    </p>
                    {!state.searches.length ? (
                      <p className="muted">Nenhuma pesquisa realizada.</p>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Pesquisa e filtros</th>
                              <th>Resultados</th>
                              <th>Fonte</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {state.searches.map((s) => (
                              <tr key={s.id}>
                                <td>{date(s.created_at)}</td>
                                <td>
                                  <b>
                                    {s.filters.keyword ||
                                      s.filters.niche ||
                                      "Todas as ofertas"}
                                  </b>
                                  <details>
                                    <summary>Ver filtros</summary>
                                    <pre>
                                      {JSON.stringify(s.filters, null, 2)}
                                    </pre>
                                  </details>
                                </td>
                                <td>
                                  {s.error ? (
                                    <span className="error">{s.error}</span>
                                  ) : (
                                    s.result_count
                                  )}
                                </td>
                                <td>Dados fornecidos</td>
                                <td>
                                  <button
                                    className="text-link"
                                    onClick={() =>
                                      run(async () => {
                                        const r = await api(`search/${s.id}`);
                                        setResults(r.results);
                                        setNotice(
                                          `Pesquisa de ${date(s.created_at)} carregada abaixo.`,
                                        );
                                      })
                                    }
                                  >
                                    Consultar <ChevronRight size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                  {results && (
                    <section>
                      <h2 className="section-title">Resultados históricos</h2>
                      <div className="offer-grid">
                        {results.map((o) => (
                          <OfferCard
                            key={o.id}
                            offer={o}
                            saved={state.favorites.some(
                              (f) => f.product_id === o.id,
                            )}
                            onFavorite={() =>
                              favorite(
                                o,
                                state.favorites.some(
                                  (f) => f.product_id === o.id,
                                ),
                              )
                            }
                            onDetail={() => setDetail(o)}
                            onAnalyze={() => analyze(o)}
                            busy={busy}
                          />
                        ))}
                      </div>
                      {!results.length && (
                        <p className="muted">Pesquisa sem resultados.</p>
                      )}
                    </section>
                  )}
                  <section className="panel history-analyses">
                    <h2>Análises realizadas</h2>
                    <p className="muted small">
                      Últimas 100 solicitações, incluindo erros.
                    </p>
                    {!state.analyses.length && (
                      <p className="muted">Nenhuma análise solicitada.</p>
                    )}
                    {state.analyses.map((a) => (
                      <details className="analysis-history" key={a.id}>
                        <summary>
                          {date(a.created_at)} ·{" "}
                          {a.error ? "Falhou" : "Concluída"} · {a.model}
                        </summary>
                        {a.error ? (
                          <p className="error">{a.error}</p>
                        ) : (
                          a.report && <ReportView report={a.report} />
                        )}
                        <p className="muted small">
                          Imagem fornecida:{" "}
                          {a.input.hasImage ? "sim (não armazenada)" : "não"}
                        </p>
                      </details>
                    ))}
                  </section>
                </>
              )}
              {section === "configuracoes" && (
                <div className="settings-grid">
                  <section className="panel">
                    <h2>Identidade da operação</h2>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        run(async () => {
                          await api("settings", { appName: f.get("appName") });
                          await reload();
                          setNotice("Nome atualizado.");
                        });
                      }}
                    >
                      <Field label="Nome da plataforma">
                        <input
                          key={state.appName}
                          name="appName"
                          defaultValue={state.appName}
                          minLength={2}
                          maxLength={80}
                          required
                        />
                      </Field>
                      <button className="primary" disabled={busy}>
                        Salvar configuração
                      </button>
                    </form>
                  </section>
                  <section className="panel">
                    <h2>Serviços e acesso</h2>
                    <div className="radar-line">
                      <span>Supabase + administrador</span>
                      <b>{configured ? "Configurados" : "Pendentes"}</b>
                    </div>
                    <div className="radar-line">
                      <span>Gemini</span>
                      <b>
                        {state.aiConfigured
                          ? "Chave presente (não verificada)"
                          : "Chave pendente"}
                      </b>
                    </div>
                    <p className="muted">
                      Configure SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_USER_ID e
                      GEMINI_API_KEY no servidor. Aplique a migration e
                      provisione o único administrador. Nunca coloque chaves em
                      variáveis NEXT_PUBLIC.
                    </p>
                  </section>
                  <section className="panel">
                    <h2>Fontes de mineração</h2>
                    <p>
                      <span className="tiny-badge">DISPONÍVEL</span> Dados
                      fornecidos pelo proprietário
                    </p>
                    <p className="muted">
                      Cadastro assistido e importação JSON. Filtros consultam o
                      acervo persistido, sem coletar anúncios da Meta.
                    </p>
                    <p>
                      <span className="tiny-badge">NÃO INTEGRADA</span>{" "}
                      Biblioteca de Anúncios da Meta
                    </p>
                    <p className="muted">
                      Acesso comercial brasileiro por API não foi confirmado.
                      Pesquisa pública pode ser feita manualmente conforme as
                      regras da Meta.
                    </p>
                    <Out href="https://www.facebook.com/ads/library/">
                      Abrir Biblioteca de Anúncios
                    </Out>
                  </section>
                  <section className="panel">
                    <h2>Importar ofertas reais</h2>
                    <p className="muted">
                      Envie um array JSON no formato descrito em docs/fontes.md.
                      Máximo: 100 ofertas, 2 MB. Importações repetidas atualizam
                      a mesma oferta quando nome, anunciante e URL de origem
                      coincidem.
                    </p>
                    <label className="upload-box">
                      <Upload size={22} />
                      Selecionar arquivo JSON
                      <input
                        type="file"
                        accept="application/json,.json"
                        disabled={busy}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            run(async () => {
                              if (file.size > 2_000_000)
                                throw new Error("Arquivo acima de 2 MB.");
                              const offers = JSON.parse(await file.text());
                              const r = await api("offers", {
                                source: "import",
                                offers,
                              });
                              await reload();
                              setNotice(`${r.count} oferta(s) importada(s).`);
                            });
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </section>
                </div>
              )}
            </>
          )}
        </main>
        <footer>
          LOW TICKET INTELLIGENCE{" "}
          <span>Uso exclusivo da operação · Fase 1</span>
        </footer>
      </div>
      {modal && (
        <div className="modal-backdrop">
          <section
            className="panel modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="offer-title"
          >
            <button
              className="close"
              aria-label="Fechar"
              onClick={() => setModal(false)}
            >
              <X />
            </button>
            <h2 id="offer-title">Adicionar oferta real</h2>
            <p className="muted">
              Registre somente o que você observou. Campos desconhecidos podem
              ficar em branco.
            </p>
            <OfferForm
              busy={busy}
              submit={(input) =>
                run(async () => {
                  await api("offers", { source: "manual", offers: [input] });
                  await reload();
                  setModal(false);
                  setNotice(
                    "Oferta cadastrada. Você já pode minerar o acervo.",
                  );
                })
              }
            />
          </section>
        </div>
      )}
      {detail && (
        <div className="modal-backdrop">
          <section
            className="panel modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
          >
            <button
              className="close"
              aria-label="Fechar"
              onClick={() => setDetail(null)}
            >
              <X />
            </button>
            <p className="eyebrow">EVIDÊNCIAS E PONTUAÇÃO</p>
            <h2 id="detail-title">{detail.name}</h2>
            <p className="muted">
              {detail.advertiser} · {detail.niche} ·{" "}
              {detail.subniche || "Subnicho não informado"}
            </p>
            <p>
              {money(detail.price)} · {detail.type}
            </p>
            <p className="banner">
              Origem:{" "}
              {detail.provenance === "manual"
                ? "cadastro manual"
                : "importação"}
              . Sem verificação independente. Observação declarada:{" "}
              {date(detail.observedAt)}.
            </p>
            <p>Última verificação independente: não realizada.</p>
            <h3>Evidências fornecidas</h3>
            <p className="preserve">{detail.evidence}</p>
            <p className="preserve">
              {detail.adText || "Texto publicitário não informado."}
            </p>
            <h3>Critérios · {rank(detail).score}/100</h3>
            {rank(detail).criteria.map((c) => (
              <div className="radar-line" key={c.name}>
                <span>
                  {c.name} {!c.known && "(não informado)"}
                </span>
                <b>
                  {c.points}/{c.max}
                </b>
              </div>
            ))}
            <p className="muted">
              {rank(detail).confidence}. Cobertura: {rank(detail).coverage}%.
              Dados declarados recebem fator 0,6; pontuação máxima atual de 57.
              Não comprova vendas ou lucro.
            </p>
            <div className="card-links">
              <Out href={detail.adUrl}>Ver anúncio</Out>
              <Out href={detail.salesUrl}>Ver página de vendas</Out>
              <Out href={detail.mediaUrl}>Ver criativo externo</Out>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Layers;
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="panel stat">
      <div>
        <p>{label}</p>
        <b>{value}</b>
        <small>{hint}</small>
      </div>
      <span className="stat-icon">
        <Icon size={21} />
      </span>
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: typeof Radar;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-orbit">
        <Icon size={32} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
function OfferCard({
  offer: o,
  saved,
  onFavorite,
  onDetail,
  onAnalyze,
  busy,
}: {
  offer: Offer;
  saved: boolean;
  onFavorite: () => void;
  onDetail: () => void;
  onAnalyze: () => void;
  busy: boolean;
}) {
  const r = rank(o);
  return (
    <article className="panel offer-card">
      <div className="offer-visual">
        <div className="creative-placeholder">
          <Layers size={32} />
          <span>Prévia não armazenada</span>
          {o.mediaUrl && <Out href={o.mediaUrl}>Abrir criativo original</Out>}
        </div>
        <span className="source-tag">
          {o.provenance === "manual" ? "Cadastro manual" : "Importado"}
        </span>
        <button
          aria-label={saved ? "Remover favorito" : "Salvar favorito"}
          className={`heart ${saved ? "saved" : ""}`}
          disabled={busy}
          onClick={onFavorite}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="offer-body">
        <div className="offer-category">
          {o.niche}
          <span>{o.type}</span>
        </div>
        <h3>{o.name}</h3>
        <p className="muted small">
          {o.advertiser} · {o.subniche || "Subnicho não informado"}
        </p>
        <div className="offer-metrics">
          <div>
            <small>Anúncios declarados</small>
            <b>{o.activeAds ?? "Não informado"}</b>
          </div>
          <div>
            <small>Veiculação declarada</small>
            <b>{r.days === null ? "Não informada" : `~${r.days} dias`}</b>
          </div>
        </div>
        <div className="offer-price">{money(o.price)}</div>
        <div className="score-row">
          <div>
            <b>
              {r.score}
              <small>/100</small>
            </b>
            <span>{r.label}</span>
          </div>
          <div className="score-bar">
            <i style={{ width: `${r.score}%` }} />
          </div>
          <small>Confiança baixa · dados declarados</small>
        </div>
        <div className="card-links">
          <Out href={o.adUrl}>Ver anúncio</Out>
          <Out href={o.salesUrl}>Ver página</Out>
        </div>
        <div className="card-actions">
          <button className="secondary" onClick={onDetail}>
            Ver detalhes
          </button>
          <button className="ai-button" onClick={onAnalyze}>
            <Sparkles size={15} />
            Analisar com IA
          </button>
        </div>
        <small className="verification">
          Verificação independente: não realizada
        </small>
      </div>
    </article>
  );
}
function ReportView({ report }: { report: Report }) {
  const labels: Record<(typeof sections)[number], string> = {
    identificacao: "A. Identificação",
    publico: "B. Público-alvo",
    estrategia: "C. Estratégia comercial",
    criativos: "D. Análise dos criativos",
    pagina: "E. Página de vendas",
    diferenciacao: "F. Oportunidades de diferenciação",
    conclusao: "G. Conclusão da IA",
  };
  return (
    <div className="report">
      <div className="banner">
        <Sparkles size={18} />
        <p>
          Relatório gerado por IA. Revise as alegações e confirme as evidências
          antes de decidir.
        </p>
      </div>
      {sections.map((s) => (
        <section className="panel" key={s}>
          <h2>{labels[s]}</h2>
          {(["fatos", "hipoteses", "recomendacoes"] as const).map((k) => (
            <div key={k}>
              <h3>
                {k === "fatos"
                  ? "Observações sobre o material fornecido"
                  : k === "hipoteses"
                    ? "Hipóteses"
                    : "Recomendações"}
              </h3>
              {report[s][k].length ? (
                <ul>
                  {report[s][k].map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Sem informações suficientes.</p>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
function OfferForm({
  busy,
  submit,
}: {
  busy: boolean;
  submit: (data: unknown) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const data: Record<string, unknown> = Object.fromEntries(f);
        for (const k of [
          "price",
          "activeAds",
          "creatives",
          "clarity",
          "differentiation",
        ])
          data[k] = f.get(k) === "" ? null : Number(f.get(k));
        data.startedAt = f.get("startedAt") || null;
        data.repeatedOffer =
          f.get("repeatedOffer") === ""
            ? null
            : f.get("repeatedOffer") === "true";
        data.observedAt = new Date(String(f.get("observedAt"))).toISOString();
        submit(data);
      }}
    >
      <div className="form-two">
        <Field label="Nome do produto *">
          <input name="name" required minLength={2} maxLength={160} />
        </Field>
        <Field label="Anunciante *">
          <input name="advertiser" required minLength={2} maxLength={160} />
        </Field>
        <Field label="Nicho *">
          <select name="niche">
            {niches.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Field>
        <Field label="Subnicho">
          <input name="subniche" maxLength={120} />
        </Field>
        <Field label="Tipo de produto">
          <select name="type">
            {productTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Preço observado (R$)">
          <input name="price" type="number" min={0} max={100000} step="0.01" />
        </Field>
        <Field label="Anúncios ativos observados">
          <input name="activeAds" type="number" min={0} max={100000} />
        </Field>
        <Field label="Início da veiculação">
          <input name="startedAt" type="date" />
        </Field>
        <Field label="Quantidade de criativos">
          <input name="creatives" type="number" min={0} max={100000} />
        </Field>
        <Field label="Oferta repetida pelo anunciante?">
          <select name="repeatedOffer">
            <option value="">Não informado</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </Field>
        <Field label="Clareza da proposta (avaliação 0–5)">
          <input name="clarity" type="number" min={0} max={5} />
        </Field>
        <Field label="Diferenciação possível (avaliação 0–5)">
          <input name="differentiation" type="number" min={0} max={5} />
        </Field>
        <Field label="País">
          <input name="country" defaultValue="BR" minLength={2} maxLength={2} />
        </Field>
        <Field label="Idioma">
          <input name="language" defaultValue="pt" maxLength={10} />
        </Field>
        <Field label="Problema resolvido">
          <input name="problem" maxLength={500} />
        </Field>
        <Field label="Público observado">
          <input name="audience" maxLength={500} />
        </Field>
        <Field label="Link do anúncio">
          <input type="url" name="adUrl" />
        </Field>
        <Field label="Página de vendas">
          <input type="url" name="salesUrl" />
        </Field>
        <Field label="Link do criativo (opcional)">
          <input type="url" name="mediaUrl" />
        </Field>
        <Field label="Data e hora da sua observação *">
          <input type="datetime-local" name="observedAt" required />
        </Field>
      </div>
      <Field label="Texto publicitário">
        <textarea name="adText" maxLength={20000} rows={3} />
      </Field>
      <Field label="Evidências e limitações da coleta *">
        <textarea
          name="evidence"
          minLength={10}
          maxLength={5000}
          required
          placeholder="Descreva a origem, como contou os anúncios e quais dados não confirmou."
          rows={3}
        />
      </Field>
      <button className="primary" disabled={busy}>
        <Database size={16} />
        {busy ? "Salvando…" : "Salvar oferta"}
      </button>
    </form>
  );
}
