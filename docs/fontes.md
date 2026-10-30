# Fontes, importação e limites da Meta

## Investigação em 30/10/2026

Referências oficiais a consultar antes de habilitar qualquer integração:

- https://developers.facebook.com/docs/marketing-api/reference/ads_archive/
- https://www.facebook.com/ads/library/api/
- https://www.facebook.com/ads/library/

A tentativa de acesso à primeira referência retornou HTTP 403 do proxy de rede deste ambiente. Foi salva a necessidade de liberar os domínios oficiais no rascunho, mas isso não comprova aplicação da política em execução. Não foi possível confirmar nesta tarefa a documentação atual, categorias cobertas, países, permissões, verificação de identidade, token e elegibilidade. Esses itens continuam pendentes de pesquisa oficial antes de qualquer implementação de API.

O acesso público no navegador não estabelece acesso equivalente por API. Não presumimos cobertura de todos os anúncios comerciais brasileiros. Não existe conector oficial ativo neste projeto e não são necessárias credenciais Meta na Fase 1 atual. Não há login automatizado, scraping da biblioteca, quebra de bloqueios ou uso de serviços não autorizados.

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
