# Load benchmark report — ListMyNest API

**Environment:** _fill in (region, VM size, DB tier, Redis)_  
**Date:** _fill in_  
**Commit / version:** _fill in_

## How this was measured

1. Start API + Postgres + Redis as in production (or staging mirror).
2. Run k6 from **`loadtest/README.md`**:
   - `k6 run loadtest/browse-detail-search.js` with `BASE_URL` pointing at the API.
   - Optional: `PROPERTY_IDS` for stable detail sampling.
3. During each ramp, capture:
   - k6: **http_req_failed**, **http_req_duration** p50/p95/p99, **iterations/s**
   - Host: CPU %, RAM, load average
   - Postgres: active connections, CPU, slow queries (if logged)
   - JVM: heap used, GC (if APM available)

> **Note (dev machine):** k6 was **not** installed in the CI/dev snapshot where this repo was prepared, so numeric results below are **placeholders** — replace after you run the scripts.

## Staged ramps (recommended sequence)

| Stage | Target VUs | Duration (example) | http_req_failed | p95 latency (ms) | Notes |
|-------|------------|----------------------|-----------------|------------------|-------|
| A | 500 | 3m | _TBD_ | _TBD_ | |
| B | 1 000 | 3–5m | _TBD_ | _TBD_ | |
| C | 2 000 | 5m | _TBD_ | _TBD_ | |
| D | _optional_ | | _TBD_ | _TBD_ | Only if C is healthy |

## Max stable concurrency (observed)

- **Highest stage with:** error rate within threshold (e.g. &lt;5%) **and** acceptable p95 for product: **\_\_\_ VUs**
- **First bottleneck observed:** _(e.g. Postgres CPU, connection pool wait, Tomcat threads, Redis latency, external HTTP)_

## Configuration snapshot

Record what mattered for the run:

- `HIKARI_MAXIMUM_POOL_SIZE` / DB `max_connections`
- `TOMCAT_MAX_THREADS`
- `LISTMYNEST_CACHE_PUBLIC_LISTINGS_TTL` (seconds)
- Managed vs co-located Postgres
- Whether Nginx/Caddy was in front (`forward-headers-strategy`)

## Next steps

1. If DB CPU saturates first: increase cache TTL slightly, add read replica, or upgrade DB tier.
2. If pool wait / connection errors: reduce Tomcat max threads **or** increase pool only if Postgres headroom allows.
3. If JVM GC pauses: tune heap, reduce per-request allocation (profiling).

See **`docs/PRODUCTION_DEPLOYMENT.md`** for architecture guidance (managed Postgres strongly recommended vs single VM for everything).
