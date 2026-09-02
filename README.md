# Sistema de Estoque

Sistema web responsivo para controle de estoque, preparado para GitHub e Vercel.

## Requisitos
- Login e usuários responsáveis
- Dashboard
- Cadastro, edição e pesquisa de produtos
- Entrada e saída de estoque
- Atualização automática do saldo
- Histórico de movimentações
- Alertas de estoque baixo
- Estoque mínimo configurável
- API REST
- Integração com Google Sheets
- Deploy preparado para Vercel

## Stack
Next.js + TypeScript + Prisma + PostgreSQL.

## Estrutura
- `app/` interface e rotas API
- `app/api/products` API de produtos
- `app/api/movements` API de movimentações
- `prisma/schema.prisma` banco de dados
- `.env.example` variáveis de ambiente
- `vercel.json` configuração de deploy

## Executar
```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

> A base inicial está pronta. O próximo passo é ligar autenticação, persistência das movimentações, Google Sheets e os formulários CRUD à base PostgreSQL.
