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

## Media uploads

Admin image uploads (article cover/OG, TipTap body images, site logo/favicon) go through `POST /api/media`.

### Local disk (default)

```bash
STORAGE_DRIVER=local
UPLOAD_DIR=./uploads
```

Files are stored under `uploads/` and served at `/media/...` (rewritten to `/api/media/...`).

### MinIO / S3

```bash
STORAGE_DRIVER=s3
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=varc-portal-media
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=http://localhost:9000/varc-portal-media
```

Quick MinIO:

```bash
docker run -d --name varc-minio -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

Create a public-read bucket named `varc-portal-media` in the console at http://localhost:9001.

Production should use `STORAGE_DRIVER=s3` (see `deploy/k8s/configmap.yaml` + S3 keys in the secret). Prefer MinIO over a PVC so portal pods stay ephemeral.

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

## Kubernetes / Argo CD

Manifests for Argo CD live in `deploy/k8s/` (Deployment, Service, Ingress, ConfigMap). App secrets are **not** synced by Argo — create them once in the cluster.

### One-time bootstrap

```bash
kubectl create namespace varc

# Edit values first, then apply (or create the secret manually)
cp deploy/docs/secret.example.yaml /tmp/varc-portal-secrets.yaml
# edit /tmp/varc-portal-secrets.yaml
kubectl apply -f /tmp/varc-portal-secrets.yaml

# If the GHCR package is private (required for pull):
kubectl create secret docker-registry ghcr-pull \
  --namespace varc \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USER \
  --docker-password=YOUR_GITHUB_PAT \
  --docker-email=YOUR_EMAIL

kubectl apply -f deploy/argocd/application.yaml
```

Argo CD watches `deploy/k8s` on this repo and syncs into namespace `varc`.

### Release (build only — does not deploy)

Bump version, commit, then push a `v*` tag. The [Release](.github/workflows/release.yml) workflow:

- Lints and builds the app
- Publishes a GitHub Release (notes + standalone tarball)
- Pushes container images to GHCR:
  - `ghcr.io/<owner>/varc-portal:vX.Y.Z`
  - `ghcr.io/<owner>/varc-portal:X.Y.Z`

```bash
VERSION=1.0.26
./scripts/bump-version.sh $VERSION
git push origin HEAD
git tag v$VERSION
git push origin v$VERSION
```

The tagged commit must contain matching `VERSION` / `package.json` values.

### On-demand deploy

Deploy is **not** triggered by tags. After a release exists:

1. GitHub → **Actions** → **Deploy** → **Run workflow**
2. Enter the version (e.g. `1.0.26` or `v1.0.26`)
3. The workflow verifies the GitHub Release + GHCR image, updates `deploy/k8s/deployment.yaml` image tag, and pushes a `chore: deploy v…` commit
4. Argo CD syncs the new image from Git

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
| `/api/media` | Admin image upload (`POST`) |
| `/media/...` | Local uploaded media (`GET`) |

## Releases

See [Kubernetes / Argo CD](#kubernetes--argo-cd) for the full release and on-demand deploy flow.

Quick release:

```bash
VERSION=1.0.26
./scripts/bump-version.sh $VERSION
git push origin HEAD
git tag v$VERSION
git push origin v$VERSION
```
