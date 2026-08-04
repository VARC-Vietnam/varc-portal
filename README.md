# VARC Portal

Cổng thông tin của Hiệp hội Vô tuyến Nghiệp dư Việt Nam / Vietnam Amateur Radio Club CMS.

## Stack

- Next.js App Router (TypeScript, Tailwind v4)
- MongoDB + Mongoose
- Auth.js (email/password + optional Google)
- next-intl (`vi` default, `en` under `/en`)

## Quick start (local)

1. Copy env and start Mongo:

```bash
cp .env.example .env
docker compose up -d mongo
```

Mongo is published on host port **27027** (avoids clashing with other local Mongo instances).

2. Install and seed admin:

```bash
pnpm install
pnpm seed
pnpm dev
```

3. Open:

- Portal: http://localhost:3099
- English: http://localhost:3099/en
- Admin: http://localhost:3099/admin/login

Default seed credentials come from `.env` (`INITIAL_ADMIN_*`).

## Google login

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. New Google users get role `user`. A `system_admin` grants `administrator` under **Admin → Users**. Role changes apply on the next sign-in.

## Docker Compose (app + Mongo)

```bash
cp .env.example .env
# set NEXTAUTH_SECRET / INITIAL_ADMIN_*
docker compose up -d mongo
pnpm seed
docker compose up --build web
```

## Kubernetes

Manifests live in `deploy/k8s/`. Point `MONGODB_URI` at Atlas or your managed Mongo. Do not commit real secrets; copy `secret.example.yaml`.

```bash
kubectl apply -f deploy/k8s/configmap.yaml
kubectl apply -f deploy/k8s/secret.example.yaml   # rename/edit first
kubectl apply -f deploy/k8s/deployment.yaml
kubectl apply -f deploy/k8s/service.yaml
kubectl apply -f deploy/k8s/ingress.yaml
```

## Content model

Articles and pages store bilingual fields. Body content is **HTML** from the TipTap rich text editor. Public views sanitize HTML before render. Publishing requires Vietnamese title and content; English is optional.

Article, category, and page slugs are generated automatically from the title/name.

## Routes

| Path | Description |
|------|-------------|
| `/` | Latest news (VI) |
| `/en` | Latest news (EN) |
| `/tin-tuc/[slug]` | Article (VI) |
| `/en/news/[slug]` | Article (EN) |
| `/trang/[slug]` | CMS page (VI) |
| `/en/pages/[slug]` | CMS page (EN) |
| `/admin` | CMS dashboard |
| `/admin/articles` | Manage articles |
| `/admin/categories` | Manage categories |
| `/admin/pages` | Manage pages |
| `/admin/users` | Manage users / roles |
| `/api/health` | Health check |

Article, category, and page slugs are generated automatically from the title/name.
