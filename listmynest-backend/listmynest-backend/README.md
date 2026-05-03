# ListMyNest Backend (Spring Boot)

REST API for ListMyNest — properties, sellers, agents, admins, visits, and Supabase-backed storage.

## Prerequisites

- **JDK 17+**
- **PostgreSQL** reachable from your machine (Supabase hosted Postgres is supported)
- **PostgreSQL**: with profile `local`, embedded Postgres is **off** by default so data persists (Docker Postgres on `5432`, or Supabase via `SPRING_DATASOURCE_*`). Set `LISTMYNEST_EMBEDDED_POSTGRES=true` only for a throwaway in-memory DB.
- **Redis** (optional; rate limits and buffered view counts degrade gracefully if Redis is unavailable — see `application-local.yml`)

## Quick start (team clone)

1. **Clone** this repository (or the monorepo root that contains `listmynest-backend/`).

2. **Configure environment** (recommended: do not commit secrets):

   - Copy `src/main/resources/application.yml.example` to `src/main/resources/application.yml` **or**
   - Create **`ListMyNest/.env`** at the monorepo root (Gradle `bootRun` loads `../../.env` — see `build.gradle`).

   Set at minimum:

   - `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` — Supabase **Session pooler** JDBC from Dashboard → Connect (use the exact host/username for your region).
   - `SPRING_DATA_REDIS_URL` — e.g. Upstash Redis URL, or `redis://127.0.0.1:6379` if you run Redis locally.
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — for listing photo uploads (service role / `sb_secret_…`, not publishable-only for signed uploads).
   - `JWT_SECRET` — long random string for production.

3. **Run the API**

   ```bash
   cd listmynest-backend/listmynest-backend
   ./gradlew bootRun
   ```

   Default port: **8080** (override with `SERVER_PORT`).

4. **Flyway** runs migrations on startup (including seed data **V16**: demo agent/seller/properties and default admin when missing).

## Default admin (after V16 seed)

If no row exists in `admins`, migration **V16** inserts:

| Field   | Value                 |
|--------|------------------------|
| Email  | `admin@listmynest.in`  |
| Password | `Admin@123` (BCrypt in migration) |

Change this password in production after first login.

## Demo seed (V16)

- **Agent:** Suresh Patil — `+919876543210` — password **`Agent@123`**
- **Seller:** Ramesh Kulkarni — `+917760123456` — password **`Seller@123`**
- **5** sample **ACTIVE** properties in **Bidar** (idempotent `ON CONFLICT` / `WHERE NOT EXISTS`).

Agents/sellers created via the **admin panel** are stored in the same database and persist across restarts.

## API base URL

The Next.js app should call:

`http://localhost:8080/v1` (set `NEXT_PUBLIC_API_BASE_URL` in the frontend).

## Security files

- **Never commit** `.env` with production credentials.
- Prefer **`application.yml`** only on your machine, or rely entirely on environment variables as in the committed `application.yml` defaults.

## Production database & VM ops

**Recommendation:** run **PostgreSQL on a managed provider** (Supabase/Neon/RDS, etc.), not on the same 4 vCPU VM as the API, for reliability and connection headroom. If the DB must share the VM, cap connections, automate backups, and expect a lower concurrency ceiling—see the monorepo **`docs/PRODUCTION_DEPLOYMENT.md`**.

Tuning for concurrency (HikariCP, Tomcat threads, HTTP client timeouts, optional Redis-backed listing + geocode cache, IP rate limits) is described in **`src/main/resources/application.yml.example`**.

## Build JAR

```bash
./gradlew bootJar
```

## Tests

```bash
./gradlew test
```
