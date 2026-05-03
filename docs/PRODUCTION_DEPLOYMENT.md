# Production deployment & scaling (India / single VM)

**Step-by-step domain, GitHub, and maintenance:** see **`DEPLOY_AND_MAINTAIN.md`**.

This document captures **database placement**, **single-VM operations**, and how this relates to high concurrent load (see also `docs/BENCHMARK_REPORT.md` and `loadtest/`).

## 1) Database placement (decision)

### Recommended (production): **managed PostgreSQL**

Use a **managed Postgres** provider (Supabase, Neon, AWS RDS, Google Cloud SQL, etc.) separate from the app VM.

| Concern | Managed DB | Postgres on same VM as API |
|--------|------------|----------------------------|
| CPU at peak | Dedicated / scalable tier | Shares 4 vCPU with JVM + OS + Nginx |
| Connections | Pooler + configurable `max_connections` | Easy to exhaust; JVM pool + ad-hoc clients compete |
| Backups / PITR | Built-in | You must script + test restores yourself |
| Failure domain | API VM can restart without data loss | Disk corruption / OOM can affect DB + app |
| 10k concurrent aspiration | Feasible **with** CDN, caching, tuned pool, and DB tier sized for load | **Not** a realistic steady target for dynamic traffic on one 4 vCPU / 8 GB box |

**Decision for ListMyNest:** **Prefer managed PostgreSQL** for any production deployment. Treat “DB on the same VM” only for **cost-constrained staging** or **very low traffic** pilots, with strict limits (below).

### If Postgres must run on the same VM (constraints)

- Set **PostgreSQL `max_connections`** conservatively (e.g. 40–80) and align **Hikari `maximum-pool-size`** so total app instances × pool size stays **below** `max_connections` minus admin/maintenance headroom.
- Enable **daily automated backups** (e.g. `pg_dump` + off-VM storage) and run a **restore drill** quarterly.
- Expect **lower peak concurrency** before DB CPU or connection wait dominates.
- Use **Nginx** (or Caddy) in front with **timeouts** and **request size limits** so broken clients cannot hold thousands of connections open.

Environment variables for the app remain the standard Spring ones: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` (see `listmynest-backend/.../application.yml.example`).

## 2) Reverse proxy (Nginx / Caddy)

Put TLS termination and HTTP hardening on the edge VM:

- **gzip** / **brotli** for compressible responses
- **HTTP/2** where supported
- **`client_max_body_size`** (or Caddy equivalent) aligned with photo upload limits
- **Proxy timeouts** (`proxy_connect_timeout`, `proxy_read_timeout`, `proxy_send_timeout`) slightly above the JVM’s upstream expectations
- **`proxy_set_header X-Forwarded-For`** so IP-based rate limits work behind the proxy; in Spring set `server.forward-headers-strategy: framework` when the proxy is trusted (see `application.yml.example`)

## 3) Process supervision (systemd)

Run the API as a **systemd service** with:

- `Restart=on-failure` and a sensible `RestartSec`
- `LimitNOFILE=` high enough for many connections (e.g. 65535)
- Optional `MemoryMax=` / `CPUQuota=` to avoid killing Postgres on the same host

Example unit sketch (adjust paths and user):

```ini
[Unit]
Description=ListMyNest API
After=network.target

[Service]
User=listmynest
WorkingDirectory=/opt/listmynest
ExecStart=/usr/bin/java -jar /opt/listmynest/listmynest-backend.jar --spring.profiles.active=prod
Restart=on-failure
RestartSec=5
EnvironmentFile=/etc/listmynest/api.env

[Install]
WantedBy=multi-user.target
```

## 4) Monitoring & alerts

Minimum signals:

- **Host:** CPU, RAM, disk I/O, free disk, load average
- **JVM:** heap used, GC pause (if APM available), thread count
- **Postgres:** connections in use, slow queries, CPU
- **App:** HTTP 5xx rate, p95 latency (Nginx access log or APM)
- **Redis:** memory, evictions (if caching enabled)

Spring **Actuator** is exposed in dev; in production **restrict** `/actuator/**` to localhost or admin VPN and expose only health/metrics endpoints you need.

## 5) Backups & alerts

- **Managed DB:** enable automated backups + point-in-time recovery if offered.
- **Self-hosted DB:** scheduled logical dumps + **off-site** object storage; test restore to a scratch instance.
- **Alerts:** disk >80%, API error rate spike, DB connection saturation, Redis down (rate limits and listing cache degrade gracefully but should be visible).

## 6) Redis

Use **managed Redis** (e.g. Upstash/ElastiCache) or a small dedicated Redis VM. The app uses Redis for OTP counters, lead/visit rate limits, optional **public listing cache**, and **geocode cache**. If Redis is unavailable, OTP/lead limits may degrade—**run Redis in production**.

## 7) Load testing

See **`loadtest/README.md`** for k6 scenarios. Ramp **500 → 1k → 2k** virtual users before attempting higher; watch DB connections and p95 latency.

## 8) Related configuration

Backend tuning knobs (Hikari, Tomcat, HTTP client timeouts, cache TTLs, rate limits) are documented in **`application.yml.example`**.
