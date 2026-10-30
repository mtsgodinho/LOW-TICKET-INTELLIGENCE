# Arquitetura — Fase 1

Next.js App Router + TypeScript, Tailwind CSS e estilos próprios; Lucide, layout responsivo e CSS com preferência `prefers-reduced-motion`. Sem fontes remotas. O fundo tático é decorativo, não representa atividade de mineração.

## Limites de responsabilidade

- `src/lib/domain.ts`: schemas Zod, filtros, ranking e agregação do radar, independentes do banco.
- `src/lib/connectors.ts`: contrato `MiningConnector` e fonte de dados fornecidos; importação JSON validada. Fontes futuras precisam declarar sua proveniência e só marcar dados verificados mediante evidência real.
- `src/lib/server.ts`: cliente Supabase SSR, autorização administrativa, limites de corpo, CSRF por origem e erros centralizados sem log de credenciais ou conteúdo de ofertas.
- `src/proxy.ts`: atualização de cookies de sessão antes das telas protegidas. Cookies HttpOnly e SameSite Lax; Secure em produção. APIs validam novamente a identidade.
- `src/app/api/[...path]/route.ts`: operações autenticadas de acervo, mineração, favoritos, configurações, histórico e IA; login reservado e logout.
- `src/lib/ai.ts`: contrato `AIProvider`, adaptador Gemini e schema de relatório. Conteúdo de terceiros é tratado como dado não confiável e não como instrução. Não existe ferramenta de navegação para a IA.
- `src/components/dashboard.tsx`: experiência das seis áreas da Fase 1, com formulários, cards e estados de erro/vazio. Não mantém um banco paralelo em localStorage.

## Persistência

`profiles`, `products`, `mining_searches`, `mining_results`, `favorites`, `ai_analyses`, `application_settings`, `request_buckets` e `private.administrators`.

O payload validado em `products` reúne produto, anunciante e anúncio observado. Esta versão não tem cadastro independente de anunciantes, múltiplos anúncios por produto, nem entidades artificiais sem uso. O link do anúncio é preservado por oferta; uma futura normalização precisará de migration própria. Nichos são enumeração versionada em código e fontes são conectores em código. Assim não é criada uma estrutura multiempresa para um único proprietário.

A impressão digital SHA-256 usa URL de anúncio (ou página), nome e anunciante normalizados em minúsculas. Reimportações atualizam a oferta com a mesma identidade. Mudanças no nome/URL podem criar um novo registro; não alegamos deduplicação semântica. A última observação substitui os dados atuais; snapshots de pesquisas antigas preservam o conteúdo anterior. Datas `updated_at` têm triggers.

As pesquisas e seus snapshots são inseridos em uma transação RPC. Favoritos usam chave única por usuário/produto. Todas as relações têm FK. O administrador é singleton no schema privado; RLS exige `auth.uid()` e `is_admin()` e não aceita owner_id de outro usuário. O aplicativo não usa service_role. As funções SECURITY DEFINER usam search_path vazio, execução restrita, e limites fixos. Análise admite cinco solicitações por minuto; outras escritas, trinta, em contador atômico no PostgreSQL.

## Ranking explicável

Pesos base: anúncios ativos 25, persistência 20, criativos 10, repetição 10, clareza 10, problema específico 5, diferenciação 10, qualidade de evidência 10. Ausências valem zero. Qualidade de evidência recebe apenas 5/10 enquanto a fonte for declarada pelo usuário. Todos os pontos atuais recebem fator 0,6 por ausência de verificação independente; o teto é **57/100**. Cobertura indica quantos campos de critério têm informação, não a probabilidade de sucesso. Confiança permanece baixa.

Faixas planejadas são 0–39 baixa, 40–59 moderada, 60–79 interessante, 80–100 alta prioridade de investigação. As duas últimas não são atingíveis com os conectores atuais. Não há cálculo de vendas, lucro ou faturamento. O ranking é uma heurística de triagem, não um modelo calibrado de retorno financeiro. Clareza e diferenciação são avaliações manuais explícitas.

Filtros numéricos preservam valores desconhecidos. País/idioma/nicho/tipo devem corresponder quando selecionados. Data da pesquisa no histórico é o momento de execução; “cadastrado a partir de” filtra a data de entrada no acervo.

## Segurança e dados externos

URLs somente HTTPS, sem credenciais, fragmentos, portas, localhost ou IP literal. **Nenhuma URL de usuário é requisitada pelo servidor**, inclusive mídia; portanto não há caminho de SSRF ou redirecionamento remoto a partir dela. Criativos são abertos pelo proprietário em outra aba com noopener/noreferrer; imagens externas não são carregadas automaticamente. Para extração futura de páginas, implementar um coletor separado com allowlist, validação DNS/IP a cada conexão e redirecionamento, limites e revisão das permissões — não remover esta fronteira por conveniência.

Upload de uma imagem de até 2 MB, MIME restrito e assinatura binária verificada. SVG e arquivos genéricos são recusados. A imagem é enviada inline ao Gemini e não armazenada; apenas o fato de ter sido enviada é salvo. Validação de assinatura não é antivírus e o usuário deve enviar capturas próprias confiáveis. JSON tem limite de bytes efetivamente lidos e até 100 ofertas por importação. React escapa textos; relatórios não são renderizados como HTML.

O relatório distingue observações sobre material fornecido, hipóteses e recomendações. Uma alegação numa página continua sendo alegação; o modelo pode errar, e a revisão humana é obrigatória. Prompts solicitam identificação, público, estratégia, criativos, página, diferenciação e conclusão com lacunas explícitas.
