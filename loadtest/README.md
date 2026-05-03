# k6 load tests (ListMyNest API)

Scripts exercise **public read paths** used by the home experience: featured feed, filtered list, search, and optional property detail.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed locally or in CI.
- API running and reachable (e.g. `./gradlew bootRun` or production URL).
- Optional: `PROPERTY_IDS` — comma-separated UUIDs from your DB (e.g. Bidar listings after seed **V16**) so the **detail** scenario can hit `/v1/properties/{id}`.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:8080/v1` | API prefix including `/v1` |
| `CITY` | `Bidar` | City query param |
| `PROPERTY_IDS` | _(empty)_ | UUIDs for detail requests |

## Staged concurrency ramps

Start conservative, then increase. Watch **API p95**, **Postgres CPU**, **active connections**, and **error rate** while ramping.

### Stage A — warm-up + 500 VUs (example)

```bash
k6 run --vus 500 --duration 3m loadtest/browse-detail-search.js
```

### Stage B — ramp to 1k (built-in `stages` in the script)

The default `options.stages` in `browse-detail-search.js` ramps **0 → 500 → 1000 → 2000** virtual users over several minutes. Override by passing your own script or editing stages for your environment.

```bash
k6 run loadtest/browse-detail-search.js
```

### Stage C — higher concurrency

Only after p95 and DB metrics look healthy:

```bash
k6 run --stage 2m:3000 --stage 2m:5000 loadtest/browse-detail-search.js
```

(`k6` also supports full custom options via env / JSON; see k6 docs.)

## Schedule visit (low rate)

Abuse-sensitive writes are **not** included in the main mix. To probe `POST /v1/visits` at a **low** fixed rate (requires valid payload / property id):

```bash
k6 run loadtest/visits-low-rate.js
```

Set `PROPERTY_ID` to a real **ACTIVE** listing UUID and adjust `BASE_URL` / `CITY` / phone in the script or extend with env vars before running against shared environments.

## Suggested SLOs (tune to product)

- **http_req_failed** &lt; 1–5% during ramp (exclude client aborts if needed).
- **http_req_duration p(95)** &lt; 1–2s for list/search on a warm cache; stricter if CDN edge caches JSON (often not for personalized APIs).

Record outcomes in **`docs/BENCHMARK_REPORT.md`**.
