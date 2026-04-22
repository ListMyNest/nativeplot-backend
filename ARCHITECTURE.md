# ListMyNest — Architecture Diagrams (Mermaid)

> Render in GitHub, VS Code Mermaid preview, or any Mermaid-compatible viewer.

---

## System context

```mermaid
flowchart TB
  subgraph users["People"]
    B[Buyer]
    S[Seller]
    A[Agent]
    AD[Admin]
  end

  subgraph fe["Next.js"]
    PWA[PWA / App Router]
    RQ[React Query cache]
    ZU[Zustand auth]
  end

  subgraph be["Spring Boot API"]
    C[Controllers]
    SV[Services]
    RP[JPA Repositories]
    SCH[Schedulers]
  end

  subgraph data["Data plane"]
    PG[(PostgreSQL)]
    RD[(Redis)]
    ST[(Supabase Storage)]
  end

  subgraph ext["External"]
    WA[Wati WhatsApp]
    MS[MSG91 SMS]
    FB[Firebase]
    OSM[Nominatim]
  end

  B --> PWA
  S --> PWA
  A --> PWA
  AD --> PWA
  PWA --> RQ
  PWA --> ZU
  PWA -->|HTTPS JSON| C
  C --> SV
  SV --> RP
  SV --> RD
  SV --> ST
  RP --> PG
  SCH --> PG
  SCH --> RD
  SV --> WA
  SV --> MS
  SV --> FB
  SV --> OSM
```

---

## Buyer journey (happy path — simplified)

```mermaid
sequenceDiagram
  participant U as Buyer
  participant FE as Next.js
  participant API as Spring API
  participant DB as Postgres
  participant RD as Redis
  participant AG as Agent phone

  U->>FE: Open homepage
  FE->>API: GET /v1/properties/featured
  API->>DB: Query ACTIVE+verified
  DB-->>API: rows
  API-->>FE: JSON

  U->>FE: Open property detail
  FE->>API: GET /v1/properties/{id}
  API->>DB: Load property + photos
  API-->>FE: DTO with signed image URLs

  FE->>API: POST /v1/properties/{id}/view
  API->>RD: Dedupe + buffer (or DB fallback)

  U->>FE: Tap WhatsApp
  FE->>API: GET /v1/whatsapp/link/{id}
  API->>DB: Resolve agent WA
  API-->>FE: wa.me URL

  FE->>API: POST /v1/leads (WHATSAPP)
  API->>RD: Rate limit keys
  API->>DB: Insert lead + bump activity
  API-->>FE: 200

  Note over API,AG: Optional FCM push if agent token present

  U->>FE: Schedule visit
  FE->>API: POST /v1/visits
  API->>DB: Insert visit SCHEDULED
  API-->>FE: Visit DTO

  Note over U,AG: Post-visit WA template may fire via Wati integration paths (see VisitReminder / WhatsApp services)
```

---

## Domain modules (backend)

```mermaid
flowchart LR
  subgraph authn["Auth"]
    AC[AuthController]
    BAC[BuyerAuthController]
    AS[AuthService]
  end

  subgraph listings["Listings"]
    PC[PropertyController]
    SPC[SellerPropertyController]
    PHC[PhotoUploadController]
    PS[PropertyService]
    SPS[SellerPropertyService]
  end

  subgraph crm["CRM"]
    LC[LeadController]
    WC[WhatsAppController]
    VC[VisitController]
    LS[LeadService]
    VS[VisitService]
  end

  subgraph portals["Portals"]
    SC[SellerController]
    AgC[AgentController]
    AdC[AdminController]
  end

  AC --> AS
  BAC --> AS
  PC --> PS
  SPC --> SPS
  LC --> LS
  WC --> LS
  VC --> VS
```

---

*For narrative detail see `SYSTEM_DESIGN.md`. For risks see `PRODUCTION_READINESS.md`.*
