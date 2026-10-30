# Limitações e validação

## O que está implementado

A Fase 1 contém interface responsiva com fundo tático animado, formulários de cadastro/importação, filtros, pontuação explicável, radar por nicho/subnicho, favoritos com status e notas, consultas históricas com snapshots, relatório de IA em sete seções e nome da plataforma configurável. Login administrativo, APIs e persistência foram implementados para Supabase com RLS.

Interface implementada não significa operação remota homologada. Não há dados comerciais preenchidos ou simulações disfarçadas.

## Bloqueios externos

- Supabase: URL recebida e salva no rascunho. Ainda faltam `SUPABASE_ANON_KEY`, `ADMIN_USER_ID`, conta administrativa e aplicação da migration. Não houve conexão autenticada, login real nem gravação no projeto informado.
- Gemini: chave ausente. Contrato e tratamento de falhas foram testados com mocks, mas geração real, quota e disponibilidade do modelo não foram verificadas.
- Meta: documentação oficial bloqueada pelo proxy (403). APIs, permissões e cobertura atual de comerciais brasileiros não confirmadas. Não existe integração Meta ativa. Domínios necessários foram incluídos no rascunho; salvar o rascunho não modifica a rede atual.
- Pesquisa real: não foi fornecido um levantamento autorizado de ofertas reais para importar e conferir. O aplicativo permanece vazio. A mineração implementada pesquisa o acervo do proprietário; não busca a internet.

Nenhum segredo deve ser enviado no chat. Preencha os valores nas configurações seguras do ambiente, revise e salve; publique o ambiente quando desejar disponibilizar o snapshot. Uma publicação ou uma nova tarefa não foi validada nesta sessão.

## Restrições desta versão

Menos de 1.000 ofertas no acervo; ao atingir o limite a API informa explicitamente a necessidade de organizar o catálogo. Histórico lista as últimas 100 pesquisas e 100 análises; registros antigos permanecem no banco, mas esta interface ainda não oferece paginação. Importações aceitam até 100 ofertas/2 MB.

Um criativo é guardado como link de referência; não há download, thumbnail, armazenamento ou player embutido de mídia de terceiros. Capturas de tela podem ser enviadas manualmente para análise. Uma oferta possui um link de anúncio; múltiplos anúncios podem ser cadastrados separadamente, e o radar soma contagens declaradas que podem se sobrepor. Não há verificação independente de preço, duração ou anúncios. O campo `verified_at` é obrigatoriamente nulo neste conector.

Não há coleta de páginas externas; isso impede SSRF por URLs de usuário, mas exige colar o conteúdo da página para a IA. Relatório não prova potencial comercial. A IA pode errar ou interpretar uma alegação como observação: revise sempre.

A aplicação não exporta relatórios nesta fase (exportação era visão futura). Não foram implementados CRM, financeiro, pagamento, Meta Ads operacional, monitoramento ou mineração recorrente.

Login usa limitação local de 5 tentativas por minuto e os controles do Supabase. Em Vercel, configure rate limiting de borda para login; o limite em memória não é global. Escritas e IA usam contador atômico do PostgreSQL. Logs armazenam identificador/tipo/status sem credenciais. Falhas de pesquisa tentam salvar histórico; indisponibilidade do próprio banco pode impedir esse registro.

## Evidências locais

- 39 testes Vitest passaram: filtros, ranking, fontes vazias, dados desconhecidos, datas, URLs, limites de corpo e imagem, proteção de API sem configuração e contrato Gemini com mocks.
- A migration foi executada em PostgreSQL PGlite isolado com funções de autenticação simuladas. Testes verificaram isolamento por RLS, anônimo bloqueado, singleton administrativo, integridade/deduplicação, persistência de favoritos, histórico transacional e limite de requisições. Isso não substitui testar Supabase Auth e PostgREST reais.
- TypeScript e lint passaram.
- Build de produção passou usando `next build --webpack`. Turbopack falhou ao tentar abrir uma porta interna proibida neste ambiente; Webpack é a alternativa suportada salva em package.json.
- `npm audit --omit=dev` não encontrou vulnerabilidades conhecidas na data da execução (não é garantia de ausência de falhas).
- 5 testes Chromium passaram; verificam interface vazia, filtros, cadastro, páginas, mobile 390px, movimento reduzido e recusa de API sem configuração, sem simular serviços reais.
- Screenshot real da implementação em `public/mineracao-preview.png`. A animação foi inspecionada por CSS e o modo de movimento reduzido foi exercitado no navegador; a imagem é estática.

## Etapas entregues para avaliação

1. Arquitetura documentada e ambiente instalado.
2. Estrutura Next.js e interface principal criadas; captura disponível.
3. Auth, modelagem e migration implementadas/testadas localmente; homologação Supabase pendente.
4. Conector de dados fornecidos implementado; integração oficial Meta não presumida.
5. Filtros e ranking testados.
6. Radar baseado apenas no acervo.
7. Favoritos e histórico persistentes implementados; validação remota pendente.
8. Adaptador Gemini e relatório implementados; geração real pendente de chave.
9. Testes locais executados, com limites descritos acima.
10. Instruções de configuração e roteiro de avaliação no README. A Fase 1 ainda depende de homologação externa; não foi declarada concluída. Nenhuma fase seguinte autorizada ou iniciada.

## Configuração reutilizável

Foram salvos no rascunho `install_script`, `start_skill`, a URL Supabase, requisitos das variáveis e chave Gemini, e os domínios do projeto Supabase, Gemini e documentação Meta. O rascunho não executa comandos, não cria segredos, não aplica a migration e não publica o ambiente. Revise e salve as configurações do ambiente e publique pelo produto quando os pré-requisitos estiverem preenchidos. A instalação `npm ci --no-audit --no-fund` foi repetida com sucesso.
