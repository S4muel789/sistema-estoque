# Manual do Sistema de Estoque

Este documento explica como usar, verificar e recuperar o sistema caso aconteça algum problema. Guarde o endereço deste repositório e nunca publique senhas ou chaves no GitHub.

## 1. Serviços usados

| Serviço | Função | Plano utilizado |
|---|---|---|
| GitHub | Guarda o código e serve como portfólio | Gratuito |
| Vercel | Hospeda a página web | Hobby gratuito |
| Neon | Guarda produtos, usuários e movimentações | Free gratuito |

Os planos gratuitos possuem limites. Não faça upgrade nem ative faturamento se quiser manter o projeto sem custos.

## 2. Endereços importantes

- Código: https://github.com/S4muel789/sistema-estoque
- Vercel: https://vercel.com/dashboard
- Neon: https://console.neon.tech

O endereço público definitivo do sistema deve ser copiado na tela **Domains** do projeto na Vercel.

## 3. Uso diário

1. Entre no sistema com seu e-mail e senha.
2. Cadastre cada equipamento em **Produtos**.
3. Use um SKU único, como `NOTE-DELL-001` ou `MON-LG-001`.
4. Registre toda chegada como **Entrada**.
5. Registre toda entrega, empréstimo ou retirada como **Saída**.
6. Consulte o histórico antes de corrigir uma diferença no saldo.
7. Não compartilhe a senha do administrador.

### Informações recomendadas para cada equipamento

- Nome do equipamento
- SKU ou código patrimonial
- Categoria
- Quantidade
- Estoque mínimo
- Responsável pela movimentação
- Observação, quando necessário

## 4. Verificação rápida quando o sistema parar

Faça os testes nesta ordem:

1. Confirme se a internet do computador está funcionando.
2. Abra o painel da Vercel e verifique se o último deployment está com estado **Ready**.
3. Abra o Neon e confirme se o projeto está ativo.
4. Na Vercel, confira se `DATABASE_URL` e `AUTH_SECRET` existem em **Settings > Environment Variables**.
5. Veja os erros em **Vercel > Projeto > Logs**.
6. Depois de corrigir, abra **Deployments**, escolha o último deployment e clique em **Redeploy**.

## 5. Problemas comuns

### A página não abre

- Verifique se o deployment está **Ready**.
- Se aparecer **404**, confirme o domínio correto em **Settings > Domains**.
- Se aparecer uma tela pedindo conta Vercel, revise **Settings > Deployment Protection**. O endereço de produção usado no estágio precisa estar público.
- Se houver falha no build, abra **Build Logs** e procure a primeira mensagem vermelha.

### Erro de banco de dados ou erro 500

- Confira se o projeto do Neon está ativo.
- Confirme a variável `DATABASE_URL` na Vercel.
- A URL deve apontar para o banco PostgreSQL do Neon e deve ser configurada nos ambientes usados pelo projeto.
- Nunca cole essa URL em arquivo público, print, mensagem ou GitHub.
- Após alterar uma variável, faça um novo deployment.

### Login não funciona

- Confirme o e-mail sem espaços e respeite letras da senha.
- Veja os Runtime Logs da rota `/api/auth/login` na Vercel.
- Não crie outro usuário diretamente sem antes verificar se o usuário já existe.
- Se a senha for perdida, redefina-a com ajuda técnica; o valor salvo no banco é um hash e não pode ser lido como texto.

### Produto não aparece ou saldo está errado

- Atualize a página e faça a pesquisa sem filtros.
- Consulte o histórico de movimentações.
- Não altere o saldo diretamente no banco. Faça uma entrada ou saída de ajuste para preservar o histórico.
- O sistema deve bloquear saídas maiores que o saldo disponível.

### Alerta de estoque baixo não aparece

- Verifique se o estoque mínimo do produto foi configurado.
- O alerta aparece quando o saldo fica igual ou abaixo do mínimo.

### Google Sheets não sincroniza

O estoque funciona mesmo sem o Google Sheets. Para sincronizar, confira na Vercel:

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

A planilha precisa possuir uma aba chamada `Movimentações` e estar compartilhada com o e-mail da Service Account.

## 6. Variáveis necessárias na Vercel

| Variável | Obrigatória | Pode aparecer no GitHub? |
|---|---:|---:|
| `DATABASE_URL` | Sim | Não |
| `AUTH_SECRET` | Sim | Não |
| `ADMIN_NAME` | Apenas para executar o seed | Evite |
| `ADMIN_EMAIL` | Apenas para executar o seed | Evite |
| `ADMIN_PASSWORD` | Apenas para executar o seed | Nunca |
| Variáveis do Google Sheets | Somente para sincronização | Nunca publicar chaves |

O arquivo `.env.example` contém apenas exemplos. O arquivo `.env` real nunca deve ser enviado ao GitHub.

## 7. Rodar no computador pelo VS Code

No PowerShell, dentro da pasta do projeto, use `npm.cmd` caso o Windows bloqueie o arquivo `npm.ps1`:

```powershell
npm.cmd install
copy .env.example .env
npx.cmd prisma generate
npx.cmd prisma db push
npm.cmd run dev
```

Depois acesse http://localhost:3000.

Antes de rodar, preencha no `.env` uma `DATABASE_URL` válida e um `AUTH_SECRET` forte com pelo menos 32 caracteres.

## 8. Atualizar o sistema

1. Faça a alteração no código.
2. Teste no computador com `npm.cmd run dev`.
3. Execute `npm.cmd run build`.
4. Envie a alteração para a branch `main` do GitHub.
5. Se o projeto estiver conectado ao GitHub, a Vercel iniciará um novo deployment.
6. Confirme que o novo deployment ficou **Ready** antes de usá-lo no estágio.

## 9. Backup

O banco é a parte mais importante. Faça um backup periódico antes de mudanças grandes. No Neon, obtenha a conexão com segurança e use uma ferramenta PostgreSQL como `pg_dump`. Nunca publique o arquivo de backup se ele contiver dados internos do estágio.

Exemplo executado somente em um computador autorizado:

```powershell
pg_dump "URL_PRIVADA_DO_BANCO" -Fc -f estoque.backup
```

Para restaurar, peça autorização ao responsável e faça uma cópia do banco atual antes. Uma restauração pode substituir dados e não deve ser feita como primeiro teste.

## 10. Segurança

- Nunca publique `.env`, `DATABASE_URL`, `AUTH_SECRET` ou senhas.
- Cada responsável deve ter sua própria conta quando essa função for implementada.
- Troque a senha se ela aparecer em print ou mensagem pública.
- Antes de alterar ou excluir registros diretamente no Neon, faça backup.
- Use o histórico do sistema para investigar divergências.

## 11. Informações para pedir ajuda

Quando precisar de ajuda, envie estas informações, sem incluir senhas:

- O que você tentou fazer
- Horário aproximado do erro
- Página ou rota onde ocorreu
- Mensagem completa do erro
- Print sem credenciais
- Estado do deployment na Vercel
- Se o Neon aparece ativo
- Última alteração feita no código

Com essas informações será muito mais fácil localizar e corrigir o problema.
