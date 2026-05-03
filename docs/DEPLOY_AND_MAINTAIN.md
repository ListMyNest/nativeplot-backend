# Deploy on your domain & maintain with GitHub

This guide assumes the **ListMyNest monorepo** layout:

- API: `listmynest-backend/listmynest-backend` (Spring Boot)
- Web: `listmynest-frontend/listmynest-frontend` (Next.js 14)

Also read: **`PRODUCTION_DEPLOYMENT.md`** (DB, Nginx, systemd, monitoring) and **`.github/workflows/ci.yml`**.

---

## 1) Production checklist (do first)

| Item | Action |
|------|--------|
| **Secrets** | Set real `JWT_SECRET` (long random), DB password, `SPRING_DATA_REDIS_URL`, `SUPABASE_SERVICE_KEY`, `MSG91_AUTH_KEY` (SMS OTP), `CORS_ALLOWED_ORIGINS` (your HTTPS site origins, comma-separated). If you **do not** use phone OTP in prod, set `LISTMYNEST_AUTH_ALLOW_SMS_DISABLED=true` and use password/Firebase flows only. **Never commit** secrets. |
| **Default admin** | After first deploy, sign in and **change the password** for the seeded admin (`V16` seed / README). |
| **API profile** | Run the JAR with **`prod`**: `SPRING_PROFILES_ACTIVE=prod` (or `--spring.profiles.active=prod`). This locks down **Swagger/OpenAPI** and most **actuator** endpoints; only **health** stays public. In `prod`, `ProdProfileStartupChecks` **fails fast** on placeholder `JWT_SECRET`, blank DB password, placeholder Redis URL, or missing `MSG91_AUTH_KEY` (unless `LISTMYNEST_AUTH_ALLOW_SMS_DISABLED=true`). IP rate limits **fail closed** if Redis is down (`application-prod.yml`). |
| **CORS** | `CORS_ALLOWED_ORIGINS` must list your real frontend, e.g. `https://www.example.com,https://example.com`. |
| **TLS** | Terminate HTTPS at **Nginx/Caddy** or your PaaS; do not serve production API over plain HTTP. |
| **Redis** | Use a **managed Redis** in production (rate limits, caches). |
| **DB** | Prefer **managed PostgreSQL**; pool size must stay under DB `max_connections` (see `PRODUCTION_DEPLOYMENT.md`). |
| **Actuator** | In `prod`, only `/actuator/health` is anonymously accessible; other actuator paths are denied (see `SecurityConfig`). |
| **Frontend** | Set **`NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/v1`** (or your public API URL) in the **hosting** environment for `next build`. |

---

## 2) One-time: Git + GitHub

1. Create an **empty** repository on GitHub (no auto-generated README if you want a clean first push).
2. From the **ListMyNest** folder (repo root):

   ```bash
   git init
   git add .
   git status
   git commit -m "ListMyNest"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```

3. **Branch protection (recommended):** GitHub → **Settings → Branches** → add rule for `main`: require pull request, require **CI** to pass (see `.github/workflows/ci.yml`).

4. **Secrets for CI (optional):** If you add deploy jobs later, add **Repository secrets** (e.g. `SSH_HOST`, `SSH_KEY`, `VERCEL_TOKEN`) under **Settings → Secrets and variables → Actions**.

---

## 3) Connect a custom domain (typical setup)

**Pattern A — split hostnames (common)**  

- `www.yourdomain.com` → **Next.js** (Vercel, Netlify, or Node on a VM)  
- `api.yourdomain.com` → **Spring Boot** (VM + Nginx, or a Java PaaS)

**Steps (DNS):**

1. At your **registrar** (or Cloudflare), add:
   - **A** or **CNAME** for `www` → your frontend host.
   - **A** or **CNAME** for `api` → your API host (public IP or load balancer).
2. **TLS:** Let’s Encrypt (Caddy/Nginx) or the platform (Vercel) issues certificates.
3. **Env:** Set `NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/v1` in the **frontend** build.
4. **CORS** on API: `CORS_ALLOWED_ORIGINS=https://www.yourdomain.com,https://yourdomain.com`

**Pattern B — same VM (from `PRODUCTION_DEPLOYMENT.md`)**  

- Nginx/Caddy in front: routes `/` to Next (or static export) and `/v1` to the JVM, or use two server names on one box.

---

## 4) Build & run the API in production

1. Build: `cd listmynest-backend/listmynest-backend && ./gradlew bootJar`  
2. Copy the JAR and a **env file** (e.g. `/etc/listmynest/api.env`) with `SPRING_PROFILES_ACTIVE=prod`, `SPRING_DATASOURCE_*`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `SPRING_DATA_REDIS_URL`, etc.  
3. **systemd** example is in **`PRODUCTION_DEPLOYMENT.md`**.  
4. Smoke test: `GET https://api.yourdomain.com/v1/config/site` and `GET https://api.yourdomain.com/actuator/health` (returns 200; other actuator paths should **not** be public in `prod`).

---

## 5) Build & run the frontend in production

1. In the host (Vercel/Netlify/Node), set environment variables from **`.env.production.example`**, especially `NEXT_PUBLIC_API_BASE_URL`.  
2. `npm ci && npm run build && npm run start` (or the platform’s build command).  
3. Open the site over **HTTPS**; verify property pages and login call the **same-origin or correct API** URL in DevTools → Network.

---

## 5a) Docker images (optional)

Dockerfiles live at:

- **API:** `listmynest-backend/listmynest-backend/Dockerfile` (multi-stage: Gradle `bootJar` inside the image).
- **Web:** `listmynest-frontend/listmynest-frontend/Dockerfile` (`npm run build` + `npm run start`; compatible with `outputFileTracing: false` in `next.config.js`).

Example **Compose** wiring (build args + env file):

```bash
# Repo root: `.env` must include real JWT, DB, Redis, CORS, and NEXT_PUBLIC_* for the web build.
docker compose -f deploy/docker-compose.example.yml --env-file .env up --build
```

`NEXT_PUBLIC_*` values are baked into the frontend at **build** time; rebuild the web image when those URLs change.

---

## 6) Day-to-day maintenance with GitHub

| Task | How |
|------|-----|
| **Safe changes** | Create a branch `git checkout -b fix/thing`, commit, open **Pull Request** to `main`, wait for **CI** green, merge. |
| **Releases** | Tag versions `git tag v1.0.0 && git push origin v1.0.0`. Attach **release notes** (what changed, deploy steps). |
| **Deploy** | Manual: SSH to server, `git pull`, rebuild JAR / run `npm run build`, restart **systemd** (API) and frontend process. Or add a **GitHub Action** to deploy on tag (optional, repo-specific). |
| **Backups** | Managed DB: use provider backups; self-hosted: scheduled `pg_dump` to object storage (see `PRODUCTION_DEPLOYMENT.md`). **Test a restore** yearly. |
| **Monitoring** | CPU, disk, 5xx rate, DB connections, Redis; alert on disk & error spikes. |
| **Dependencies** | Dependabot (GitHub **Settings → Code security**); review PRs, run tests. |

---

## 7) What is *not* automated in this repo

- **No** built-in “one click” deploy to a specific cloud — you choose VM vs Vercel + API host.  
- **10k concurrent users** needs sizing, load tests (`loadtest/`), and usually **managed DB + CDN** — see **`PRODUCTION_DEPLOYMENT.md`**.

For questions about your stack (e.g. Vercel + Supabase + one VM), adapt sections 3–5 to that provider’s DNS and env UI.
