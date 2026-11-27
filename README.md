# J&T Express · Custo Operacional (RM Orlean)

Dashboard React/Vite com consulta mensal a dados reais da JT API. O fechamento contábil por S/C e a estimativa tarifária parcial por base são apresentados separadamente para evitar dupla contagem.

## API esperada

GET /api/custo/competencias -> competencias: ["2026-10"]

GET /api/custo/indicadores?competencia=2026-10 -> competencia, total, gestores, bases.

Campos monetários são strings decimais em reais (não centavos); ausências devem vir como null, nunca como zero. Em total, custo_total é o custo informado por S/C. Em bases, custo_parcial_estimado considera SOMENTE Secundária + Mini Transferência + Last Mile.

## Auditoria 2026-10

8 lançamentos por S/C, 144 bases e 2.137.737 pacotes. Custo total fechado: R$ 11.579.958,66. Estimativa parcial das três rubricas por base: R$ 10.295.279,87. Não somar essas duas medidas. Lançamento diretamente atribuído a Orlean permanece regional, sem rateio para bases.

## Execução

Node.js 22+, comandos: npm ci, npm run dev, npm run build.

A URL padrão é /api/custo no MESMO domínio. Um gateway autenticado em domínio externo pode ser configurado no build por meio de VITE_CUSTO_API_URL=https://SEU-GATEWAY-SEGURO/api/custo. Não usar variáveis Vite para senhas, tokens ou chaves privadas: são embutidas no JS público.

## Publicação

O Render atual é um Static Site; ele não acessa automaticamente a VM. Para exibir dados reais é necessário gateway HTTPS autenticado com cookie de sessão e CORS adequadamente configurado, ou servir o painel no mesmo domínio da API autenticada. Se a API estiver ausente, o painel informa erro de consulta e não mostra dados de demonstração.

NÃO fazer merge/deploy desta branch até executar migração, importar dados no PostgreSQL jt_indicadores, montar o router na JT API, ajustar a autenticação e validar as respostas.

## Visões

Ranking contábil por S/C; ranking parcial estimado por base; composição das rubricas; filtros de competência, S/C e base. Tarifas históricas só devem retornar quando fonte real de outros meses estiver integrada; o conjunto demonstrativo anterior não serve como histórico real.

Feito por Erison Neto – Analista de Dados Pleno.
