# Sistema de Estoque — versão 2

Sistema responsivo para controle de equipamentos com cadastro, pesquisa, estoque mínimo, entradas, saídas, histórico, responsável e bloqueio de saldo negativo.

## Primeiro uso

1. Copie `.env.example` para `.env`.
2. Preencha `DATABASE_URL`, `AUTH_SECRET` e `RECOVERY_CODE`.
3. Execute:

```powershell
npm.cmd install
npx.cmd prisma generate
npx.cmd prisma db push
npm.cmd run dev
```

4. Abra `http://localhost:3000`.
5. A tela **Primeiro acesso** permitirá criar o administrador. Não existe senha padrão.

## Variáveis obrigatórias

```env
DATABASE_URL="conexao-postgresql"
AUTH_SECRET="chave-aleatoria-com-32-ou-mais-caracteres"
RECOVERY_CODE="codigo-de-recuperacao-com-16-ou-mais-caracteres"
```

O `RECOVERY_CODE` é usado no botão **Esqueci minha senha**. Guarde-o fora do GitHub.

## Funcionalidades

- Login e logout
- Primeiro administrador criado pela interface
- Recuperação de senha por código administrativo
- Cadastro e pesquisa por nome, SKU ou categoria
- Entrada, saída e atualização automática do saldo
- Bloqueio de saída acima do saldo disponível
- Estoque mínimo e alertas
- Histórico com usuário responsável
- API REST protegida
- PostgreSQL + Prisma
- Integração opcional com Google Sheets
- Interface responsiva para computador e celular

## Google Sheets (opcional)

O estoque funciona normalmente sem o Sheets. Para sincronizar movimentações, crie a aba `Movimentações` e configure:

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## Vercel

Importe o repositório, configure as mesmas variáveis obrigatórias e publique. O build executa `prisma generate && next build`.

## Segurança

Nunca envie `.env`, conexão do banco, código de recuperação ou senhas ao GitHub. A versão 2 inclui `.gitignore` para bloquear esses arquivos.
