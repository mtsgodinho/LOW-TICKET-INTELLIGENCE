# Fontes, importação e limites da Meta

## Investigação em 30/10/2026

Referências oficiais a consultar antes de habilitar qualquer integração:

- https://developers.facebook.com/docs/marketing-api/reference/ads_archive/
- https://www.facebook.com/ads/library/api/
- https://www.facebook.com/ads/library/

Na investigação inicial, a documentação estava bloqueada pela rede. Na verificação posterior desta sessão, o endpoint oficial de referência `ads_archive` respondeu HTTP 200 e foi consultado. Na descrição de `ad_reached_countries`, a Meta informa: **“Ads that did not reach any location in the EU will only return if they are about social issues, elections or politics.”**

Consequência: anúncios comerciais comuns que atingiram apenas o Brasil não são cobertos por essa consulta. A presença de BR na enumeração de países e de ALL em ad_type não remove a restrição de cobertura. Não é tecnicamente correto oferecer mineração geral de low ticket brasileiro via essa API.

A referência documenta busca por termos, país alcançado, status e datas. A consulta exige access_token; a página específica de onboarding da API ainda retornou HTTP 403, portanto requisitos completos atuais de elegibilidade e permissões não foram confirmados. Não solicitamos token Meta para uma integração que não atende ao objetivo. Acesso à API de campanhas do próprio anunciante também não fornece acesso geral aos concorrentes.

O acesso público no navegador não estabelece acesso equivalente por API. Não existe conector oficial ativo neste projeto. Não há login automatizado, scraping da biblioteca, quebra de bloqueios ou uso de serviços não autorizados. Para a Fase 1 no Brasil, permanece disponível a alternativa de levantamento manual/importação de fontes permitidas.

## Fluxo funcional de alternativa permitida

O proprietário pesquisa manualmente as fontes às quais tem acesso permitido; fornece links, textos, métricas observadas, imagens próprias e evidências. O sistema persiste, filtra, classifica e analisa esses dados. Não completa automaticamente os campos ausentes. A responsabilidade pela permissão de uso da fonte permanece explícita.

A API `/api/offers` aceita `{source: "manual" | "import", offers: [...]}` autenticado. Na interface Configurações, o arquivo contém somente o array. Campos mínimos por item:

```json
[
  {
    "name": "SUBSTITUA PELO NOME REAL OBSERVADO",
    "advertiser": "SUBSTITUA PELO ANUNCIANTE REAL",
    "niche": "Culinária",
    "type": "E-book",
    "country": "BR",
    "language": "pt",
    "evidence": "SUBSTITUA: origem e método da observação, limitações e o que foi confirmado.",
    "observedAt": "2026-10-30T12:00:00.000Z"
  }
]
```

Este é apenas um **molde de formato**, nunca um resultado minerado. Substitua todos os marcadores e a data antes de importar. Os testes usam fixtures sintéticas isoladas e nunca as inserem na aplicação.

Campos opcionais: `subniche`, `problem`, `audience`, `adText` (strings); `price` (número em reais ou null); `activeAds`, `creatives` (inteiros ou null); `startedAt` (YYYY-MM-DD ou null); `repeatedOffer` (boolean ou null); `clarity`, `differentiation` (inteiros 0–5 ou null); `adUrl`, `salesUrl`, `mediaUrl` (HTTPS público ou vazio). Datas de observação e início não podem ser futuras. Campos não fornecidos são desconhecidos, nunca zero implícito.

Tipos: E-book, Apostila, Guia prático, Planilha, Material educativo, Receitas digitais, Kit digital, Curso digital. Nichos: Saúde e bem-estar, Culinária, Finanças pessoais, Relacionamentos, Educação, Desenvolvimento pessoal, Organização e produtividade, Habilidades práticas.

A contagem observada de anúncios não é auditoria independente e não identifica investimento ou vendas. O radar não mede lucratividade nem concorrência de mercado; mostra produtos, subnichos, problemas, públicos e atividade declarada no próprio acervo. Não faça inferências de todo o mercado a partir dele.

## Adicionar um conector futuramente

Implemente `MiningConnector` em módulo separado. Verifique documentação, permissões, países, categoria, limites e evidência atual antes de habilitar. Preserve fonte, horário, erros e incerteza; implemente testes com a fonte real autorizada. Não marque dados fornecidos pelo usuário como verificados. Mudanças de confiança exigem modelagem, migration e revisão do ranking.
