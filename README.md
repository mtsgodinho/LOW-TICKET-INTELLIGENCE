# Low Ticket Intelligence — Fase 1

Central privada para estudar ofertas digitais low ticket. Interface escura com radar animado, cadastro e importação de evidências, mineração do acervo, ranking explicável, radar de nichos, favoritos, histórico e análise Gemini sob demanda. Sem assinaturas, CRM, financeiro ou integração operacional Meta Ads.

**Estado:** implementação disponível para configuração e avaliação; não homologada com serviços externos. Não existem ofertas simuladas no aplicativo. Sem credenciais, somente a interface vazia é acessível e as APIs falham com 503. Após configurar o ambiente, as telas exigem login administrativo.

## Instalação e execução

Node.js 24 LTS e npm 11 (usados na validação). No checkout existente:

```bash
cd /workspace/LOW-TICKET-INTELLIGENCE
npm ci
cp .env.example .env.local
# Preencha as variáveis localmente. Não versionar .env.local.
npm run dev
```

Abra a aplicação local na porta 3000. Não crie worktrees: cada tarefa de nuvem já é isolada. No ambiente gerenciado, use as configurações seguras para injetar variáveis; não é necessário criar `.env.local` se já estiverem presentes.

```bash
npm run test
npm run typecheck
npm run lint
npm run build
npm run start
```

`npm ci` usa package-lock.json e não modifica dependências. A instalação não inicia serviços nem aplica migrations remotamente. O processo Next precisa ser iniciado novamente em uma nova tarefa.

## Supabase

Projeto informado: `https://sbhvvvflitfndysecrai.supabase.co`.

1. No Supabase, desative novos cadastros públicos em Authentication → Providers → Email. Crie manualmente uma conta com e-mail confirmado e senha forte em Authentication → Users. A aplicação não tem cadastro nem recuperação de senha; a administração da conta ocorre no painel Supabase.
2. Em um projeto novo, aplique integralmente `supabase/migrations/202610300001_phase1.sql` pelo SQL Editor ou pelo fluxo versionado `supabase db push` de um projeto vinculado. Não execute novamente uma migration já aplicada. Não precisamos de service_role no aplicativo.
3. Copie o UUID dessa conta. No SQL Editor, substitua o marcador e execute:

```sql
insert into private.administrators (user_id) values ('UUID-REAL-DO-USUARIO');
insert into public.profiles (id, display_name) values ('UUID-REAL-DO-USUARIO', 'Proprietário');
```

4. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY` (chave pública anon/legacy JWT do projeto) e `ADMIN_USER_ID` (mesmo UUID). Chaves públicas não são senhas, mas devem ser inseridas na configuração apropriada. Não use uma service_role: ela contornaria RLS. A URL e a chave são utilizadas somente pelo servidor nesta arquitetura.
5. Acesse Login e entre com a conta criada. Tanto a variável UUID quanto a tabela privada precisam apontar para o mesmo usuário. O banco impõe um único administrador e não permite escrita em dados de outro proprietário.

A migration não cria contas, não contém credenciais e não foi aplicada ao projeto remoto nesta tarefa. As tabelas são protegidas por RLS, com testes locais de isolamento. Configure backups no Supabase conforme sua necessidade.

## Gemini

Defina `GEMINI_API_KEY` somente no servidor e, opcionalmente, `GEMINI_MODEL` (padrão `gemini-2.5-flash`). É necessário que o modelo esteja disponível para sua conta. Planos gratuitos, quotas e disponibilidade variam; nenhuma gratuidade permanente é presumida.

A chave usa `x-goog-api-key` em chamadas HTTPS para `generativelanguage.googleapis.com`. Não há chamadas automáticas: cada clique em Analisar Oferta solicita uma geração. O provedor recebe os textos, dados selecionados e imagem opcional. Não envie informações confidenciais desnecessárias. Imagens não são persistidas; o texto de entrada e o relatório são guardados no Supabase. Respostas são validadas antes de salvar.

## Fontes e mineração

A fonte ativa é o levantamento fornecido pelo proprietário: cadastro manual ou JSON. **Minerar Produtos filtra o acervo salvo; não descobre anúncios pela internet.** Faça a pesquisa permitida na Biblioteca pública, registre os dados observados e suas evidências, importe, depois filtre. Links são referências, não são coletados automaticamente. Consulte [fontes](docs/fontes.md) e [ranking](docs/arquitetura.md).

Nenhuma API Meta comercial foi declarada funcional. Não há scraping, bypass de CAPTCHA, navegador automatizado de coleta nem conexão com contas de anúncios. A consulta à documentação oficial ficou bloqueada pela rede nesta tarefa; a elegibilidade atual para anúncios comerciais brasileiros permanece sem confirmação.

## Teste do proprietário após configurar

1. Entre no Login; confirme que sair bloqueia as telas e operações. Teste também uma conta não cadastrada como administradora.
2. Adicione uma oferta que você realmente pesquisou, com evidência e data de observação. Deixe o preço vazio se desconhecido; confirme “Preço não identificado”.
3. Use os filtros padrão (BR, pt, 15 anúncios, R$ 9,90–67, 20 resultados). Valores desconhecidos devem ser preservados. Altere termo, nicho e preço, incluindo uma pesquisa sem resultados.
4. Confira origem e critérios em Ver detalhes; abra os links da oferta. Dados declarados não equivalem a verificação independente.
5. Salve um favorito, modifique status e observações, recarregue e confira persistência. Remova o favorito.
6. Confira Radar de Nichos e Histórico; abra uma pesquisa antiga e seus snapshots.
7. Em Análise, selecione a oferta ou forneça texto e uma imagem. Solicite o relatório e confirme as sete seções. Uma URL isolada não é conteúdo suficiente: cole o material que deseja analisar. Compare as observações com a fonte original.
8. Confira histórico de análises, erros de URL/arquivo inválido, tamanho de upload e comportamento em celular.

Nenhuma fase futura será iniciada sem avaliação e aprovação explícitas do proprietário.

## Deploy na Vercel

Importe o repositório com preset Next.js, Node 24, instalação `npm ci`, build `npm run build`. Configure as mesmas variáveis em Production/Preview conforme necessário. Aplique a migration e provisione o administrador antes de testar. Não há filesystem persistente nem cron. O handler de IA tem `maxDuration=60`; confirme os limites de duração e corpo de requisição do plano contratado. Mantenha HTTPS e as políticas de segurança. Configure proteção de abuso/rate limiting na borda também para `/api/login`: o limite local de login é apenas adicional e não é global entre instâncias.

O deploy e a publicação do ambiente não foram feitos automaticamente. Leia [arquitetura](docs/arquitetura.md), [fontes](docs/fontes.md) e [limitações e validação](docs/limitacoes.md).
