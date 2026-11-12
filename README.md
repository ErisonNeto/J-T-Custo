# J&T Express · Custo operacional

Dashboard da regional Orlean em React e Vite.

## Rodar localmente

Use Node.js 22.12 ou superior.

```bash
npm ci
npm run dev
```

Para gerar a versão de produção, execute `npm run build`.

## Render

Configure um Static Site com a branch `main`, Build Command `npm ci && npm run build` e Publish Directory `dist`. Deixe o Root Directory em branco.
O serviço já existente pode continuar copiando os quatro arquivos estáticos da raiz. Ao alterar o código, rode `npm run build` e copie `dist/index.html`, `dist/style.css`, `dist/dados.js` e `dist/painel.js` para a raiz antes do commit.

## Dados

`src/dados.js` contém dados fictícios para a demonstração pública. Os valores monetários estão em centavos e `null` representa dado indisponível.

O fixo identificado reúne funcionários e aluguel. A fonte agrupa despesas administrativas sem discriminar internet, energia e água. O R$/pacote consolidado divide o custo registrado pelo volume das bases com custo informado. O histórico acompanha tarifas por faixa de peso.
