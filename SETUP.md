# HangarSJP — Guia de Setup (Fase 1)

## Pré-requisitos

- [Node.js 20+](https://nodejs.org/) (LTS)
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta na [Vercel](https://vercel.com) (gratuita)

---

## 1. Supabase — criar projeto

1. Acesse https://supabase.com/dashboard → "New project"
2. Nome: `hangarsjp` | Região: South America (São Paulo)
3. Aguarde o provisionamento (~2 min)
4. Vá em **SQL Editor** e cole + execute o conteúdo de `supabase/schema.sql`
5. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Variáveis de ambiente locais

```bash
cp .env.local.example .env.local
```

Preencha `.env.local` com as credenciais copiadas acima.

Para gerar a chave de criptografia do CPF:
```bash
# No terminal com OpenSSL (Linux/Mac) ou Git Bash (Windows):
openssl rand -hex 32
```

---

## 3. Instalar dependências e rodar localmente

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

---

## 4. Seed CNAE (executar uma vez)

```bash
npx tsx supabase/seed-cnae.ts
```

Sincroniza ~1300 subclasses CNAE 2.3 do IBGE Concla na tabela `cnae_ref`.

---

## 5. Deploy na Vercel

```bash
npm i -g vercel
vercel
```

Ou conecte o repositório diretamente no dashboard da Vercel.

Adicione as variáveis de ambiente no painel da Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CPF_ENCRYPTION_KEY`

---

## Rotas disponíveis

| Rota | Descrição |
|---|---|
| `/` | Página inicial |
| `/cadastro` | Formulário Cartão de Bordo (público) |
| `/guardian/membros` | Painel do Guardião |
| `POST /api/members` | Cadastrar membro |
| `GET /api/members` | Listar membros (via `member_report`) |

---

## Custo estimado

| Serviço | Plano | Custo |
|---|---|---|
| Supabase | Free tier | R$ 0 |
| Vercel | Hobby | R$ 0 |
| ViaCEP | Público | R$ 0 |
| IBGE Concla | Público | R$ 0 |
| **Total** | | **R$ 0/mês** |

Limite do Supabase free: 500 MB banco + 50.000 MAU auth + 2 GB storage.
Para o MVP do HangarSJP, estes limites são mais que suficientes.
