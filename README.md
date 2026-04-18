# ListMyNest (monorepo)

Two apps in one folder:

| Path | Stack | Run |
|------|--------|-----|
| `listmynest-backend/listmynest-backend` | Spring Boot 3, Java 17 | `./gradlew bootRun` |
| `listmynest-frontend/listmynest-frontend` | Next.js 14 | `npm install` → `npm run dev` |

## First-time setup (for you and teammates)

1. **Clone** this repository.

2. **Backend env** — copy **`ListMyNest/.env.example`** → **`ListMyNest/.env`** and fill in at least:
   - `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` (Supabase or local Postgres)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (photos)
   - `JWT_SECRET` (any long random string for dev)
   - Optional: `SPRING_DATA_REDIS_URL` (e.g. `redis://127.0.0.1:6379` or Upstash) — app runs without Redis but logs Redis warnings

   Gradle **`bootRun`** loads **`ListMyNest/.env`** then **`listmynest-backend/listmynest-backend/.env`** (see `build.gradle`).

3. **Frontend env** — in `listmynest-frontend/listmynest-frontend/` copy **`.env.example`** → **`.env.local`** and set `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080/v1`).

4. **Start backend** (from `listmynest-backend/listmynest-backend`):

   ```bash
   ./gradlew bootRun
   ```

5. **Start frontend** (from `listmynest-frontend/listmynest-frontend`):

   ```bash
   npm install
   npm run dev
   ```

6. **Default admin** (after Flyway seed): `admin@listmynest.in` / `Admin@123` — change in production.

More detail: **`listmynest-backend/listmynest-backend/README.md`** and **`listmynest-frontend/listmynest-frontend/README.md`**.

## Pushing to GitHub

From **`ListMyNest`** (this folder):

```bash
git init
git add .
git status
git commit -m "Initial commit: ListMyNest monorepo"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

Create an **empty** repository on GitHub first (no README/license if you want a clean first push), then use the URL GitHub shows.

**Never commit** `.env`, `.env.local`, or `listmynest-backend/.../src/main/resources/application.yml` with real passwords — they are listed in `.gitignore`.
