# 📦 Sistema de Estoque

Sistema web de controle de estoque com login, cadastro, edição, pesquisa, entradas, saídas, atualização automática, histórico, responsável, estoque mínimo, alertas, API, Google Sheets e estrutura para Vercel.

## Rodar no VS Code
```bash
npm install
```
Crie `.env` a partir de `.env.example` e configure `DATABASE_URL` e `AUTH_SECRET`.

Depois:
```bash
npx prisma db push
npm run db:seed
npm run dev
```
Abra `http://localhost:3000`.

### Login inicial
Antes de executar o seed, configure `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`.
A senha deve possuir no mínimo 12 caracteres. O projeto não contém credenciais padrão.

## PostgreSQL
Use Neon, Supabase ou outro PostgreSQL compatível e coloque a URL em `DATABASE_URL`.

## Google Sheets
Crie uma aba chamada `Movimentações`, compartilhe a planilha com a Service Account e configure:
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

Sem essas variáveis o estoque funciona normalmente, mas não sincroniza com Sheets.

## API
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/register`
- `GET/POST /api/products`
- `PATCH/DELETE /api/products/:id`
- `GET/POST /api/movements`
- `GET /api/dashboard`

As rotas protegidas exigem login.

## Vercel
Importe o repositório na Vercel, configure `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`, e use um PostgreSQL externo. O build já executa `prisma generate && next build`.

Repositório: https://github.com/S4muel789/sistema-estoque
