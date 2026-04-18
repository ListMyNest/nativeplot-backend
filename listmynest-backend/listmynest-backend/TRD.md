**⚙ ListMyNest**

**Technical Requirements Document (TRD)**

*Phase 1 MVP · Web-First · Java Spring Boot + Next.js*

  ------------------ ----------------------------------------------------
  **Document Title** ListMyNest --- Technical Requirements Document (TRD)

  **Product**        ListMyNest --- Real Estate Discovery Platform

  **Phase**          Phase 1 MVP

  **Stack**          Java 17 + Spring Boot 3.x \| Next.js 14 \|
                     PostgreSQL \| Redis

  **Version**        v1.1

  **Status**         Updated --- For Engineering Review

  **Audience**       Backend Engineers, Frontend Engineers, DevOps, Tech
                     Lead

  **Last Updated**   March 2026
  ------------------ ----------------------------------------------------

# **01 System Architecture Overview**

ListMyNest Phase 1 is a three-tier web application: a Next.js PWA
frontend, a Spring Boot REST API backend, and a PostgreSQL database
hosted on Supabase. All layers are stateless and independently
deployable.

+-----------------------------------------------------------------------+
| Architecture: CLIENT → HTTPS/REST → API LAYER → PostgreSQL            |
| (Supabase) + Redis (Upstash) + Supabase Storage                       |
|                                                                       |
| Third-Party Services: Wati.io (WhatsApp inbound + outbound) · MSG91   |
| (OTP) · Google Maps API · Firebase FCM (Push) · PostHog (Analytics)   |
+-----------------------------------------------------------------------+

## **Key Architecture Decisions**

  --------------- ------------------------- ---------------------------------
  **Decision**    **Choice**                **Rationale**

  **API Style**   REST over HTTPS           Simple, well-understood, easy to
                                            test. GraphQL is overkill for
                                            Phase 1.

  **Auth          JWT (stateless) for       Buyers need no auth for browsing.
  Strategy**      seller/agent              Soft OTP for save/notify-me flows
                                            only.

  **DB Access**   Spring Data JPA +         Standard ORM. Repository pattern
                  Hibernate                 keeps controllers thin.

  **File Upload** Signed URL direct upload  Frontend uploads directly to
                                            Supabase. Backend never handles
                                            file bytes.

  **Camera        accept=\'image/\*\' +     HTML5 media capture attribute
  Enforcement**   capture=\'environment\'   forces device camera on
                                            mobile.Seller or agent can upload
                                            Images from gallery

  **Caching**     Redis (Upstash)           City listing cache + OTP
                                            storage + rate limiting + view
                                            count. No in-memory state.

  **Frontend      SSR + SSG via Next.js     SSR for property detail (SEO).
  Rendering**                               SSG for homepage/category pages.

  **PWA**         next-pwa with Workbox     Service worker caches listing
                                            pages. Works on 2G with cached
                                            data.

  **Tracking**    PostHog JS snippet        Zero backend work. Anonymous
                                            events. DPDP Act compliant.

  **Wati          Webhook inbound +         Inbound webhook captures buyer WA
  Integration**   template outbound         number. Template outbound for
                                            post-visit feedback.
  --------------- ------------------------- ---------------------------------

# **02 Database Schema**

PostgreSQL hosted on Supabase. All tables use UUID primary keys.
Timestamps in UTC. Enums enforced at DB level.

## **Table: properties**

+-----------------------------------------------------------------------+
| CREATE TABLE properties (                                             |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| title VARCHAR(200) NOT NULL,                                          |
|                                                                       |
| description TEXT,                                                     |
|                                                                       |
| type VARCHAR(30) NOT NULL, \-- RESIDENTIAL \| PLOT \| COMMERCIAL \|   |
| AGRICULTURAL                                                          |
|                                                                       |
| city VARCHAR(100) NOT NULL,                                           |
|                                                                       |
| locality VARCHAR(200),                                                |
|                                                                       |
| area_sqft NUMERIC(10,2),                                              |
|                                                                       |
| price_min NUMERIC(15,2) NOT NULL,                                     |
|                                                                       |
| price_max NUMERIC(15,2) NOT NULL,                                     |
|                                                                       |
| configuration VARCHAR(20), \-- 1BHK \| 2BHK \| 3BHK \| OPEN           |
|                                                                       |
| bathrooms INT,                                                        |
|                                                                       |
| possession VARCHAR(30), \-- READY \| UNDER_CONSTRUCTION \| BARE_SHELL |
|                                                                       |
| lat DECIMAL(10,8),                                                    |
|                                                                       |
| lng DECIMAL(11,8),                                                    |
|                                                                       |
| status VARCHAR(30) NOT NULL DEFAULT \'NEW\',                          |
|                                                                       |
| \-- NEW \| PENDING_REVIEW \| ACTIVE \| PAUSED \| SOLD \| INACTIVE     |
|                                                                       |
| verified BOOLEAN DEFAULT FALSE,                                       |
|                                                                       |
| agent_id UUID REFERENCES agents(id),                                  |
|                                                                       |
| seller_id UUID REFERENCES sellers(id),                                |
|                                                                       |
| impersonated_by_admin_id UUID REFERENCES admins(id), \-- set when     |
| admin creates on behalf of seller                                     |
|                                                                       |
| view_count INT DEFAULT 0,                                             |
|                                                                       |
| last_activity_at TIMESTAMPTZ DEFAULT NOW(), \-- updated on any        |
| enquiry/visit                                                         |
|                                                                       |
| sold_at TIMESTAMPTZ,                                                  |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW(),                                 |
|                                                                       |
| updated_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX idx_properties_city ON properties(city);                 |
|                                                                       |
| CREATE INDEX idx_properties_status ON properties(status);             |
|                                                                       |
| CREATE INDEX idx_properties_type ON properties(type);                 |
|                                                                       |
| CREATE INDEX idx_properties_activity ON properties(last_activity_at); |
+-----------------------------------------------------------------------+

## **Table: property_photos**

+-----------------------------------------------------------------------+
| CREATE TABLE property_photos (                                        |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| property_id UUID NOT NULL REFERENCES properties(id) ON DELETE         |
| CASCADE,                                                              |
|                                                                       |
| storage_url TEXT NOT NULL,                                            |
|                                                                       |
| gps_lat DECIMAL(19,2),                                                |
|                                                                       |
| gps_lng DECIMAL(19,2),                                                |
|                                                                       |
| gps_flagged BOOLEAN DEFAULT FALSE, \-- TRUE if GPS \> 500m from       |
| property address                                                      |
|                                                                       |
| is_primary BOOLEAN DEFAULT FALSE,                                     |
|                                                                       |
| sort_order INT DEFAULT 0,                                             |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX idx_photos_property ON property_photos(property_id);     |
+-----------------------------------------------------------------------+

## **Table: agents**

+-----------------------------------------------------------------------+
| CREATE TABLE agents (                                                 |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| name VARCHAR(100) NOT NULL,                                           |
|                                                                       |
| phone VARCHAR(15) NOT NULL UNIQUE,                                    |
|                                                                       |
| whatsapp_number VARCHAR(15) NOT NULL,                                 |
|                                                                       |
| assigned_cities TEXT\[\], \-- e.g. ARRAY\[\'Bidar\',\'Humnabad\'\]    |
|                                                                       |
| fcm_token TEXT,                                                       |
|                                                                       |
| active BOOLEAN DEFAULT TRUE,                                          |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

## **Table: sellers**

+-----------------------------------------------------------------------+
| CREATE TABLE sellers (                                                |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| name VARCHAR(100),                                                    |
|                                                                       |
| phone VARCHAR(15) NOT NULL UNIQUE,                                    |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

## **Table: admins**

+-----------------------------------------------------------------------+
| CREATE TABLE admins (                                                 |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| name VARCHAR(100) NOT NULL,                                           |
|                                                                       |
| phone VARCHAR(15),                                                    |
|                                                                       |
| email VARCHAR(150) UNIQUE,                                            |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

## **Table: admin_audit_log**

+-----------------------------------------------------------------------+
| CREATE TABLE admin_audit_log (                                        |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| admin_id UUID NOT NULL REFERENCES admins(id),                         |
|                                                                       |
| action VARCHAR(100) NOT NULL, \-- e.g. LISTING_CREATED \|             |
| AGENT_DEACTIVATED \| IMPERSONATION_START                              |
|                                                                       |
| entity_type VARCHAR(50), \-- PROPERTY \| SELLER \| AGENT \| BUYER \|  |
| LEAD                                                                  |
|                                                                       |
| entity_id UUID,                                                       |
|                                                                       |
| notes TEXT,                                                           |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX idx_audit_admin ON admin_audit_log(admin_id);            |
+-----------------------------------------------------------------------+

## **Table: buyers**

New table added to support saved listings and Notify Me persistence
after OTP verification.

+-----------------------------------------------------------------------+
| CREATE TABLE buyers (                                                 |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| phone VARCHAR(15) NOT NULL UNIQUE,                                    |
|                                                                       |
| verified_at TIMESTAMPTZ DEFAULT NOW(),                                |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

## **Table: saved_listings**

+-----------------------------------------------------------------------+
| CREATE TABLE saved_listings (                                         |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,       |
|                                                                       |
| property_id UUID NOT NULL REFERENCES properties(id) ON DELETE         |
| CASCADE,                                                              |
|                                                                       |
| saved_at TIMESTAMPTZ DEFAULT NOW(),                                   |
|                                                                       |
| UNIQUE (buyer_id, property_id)                                        |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX idx_saved_buyer ON saved_listings(buyer_id);             |
|                                                                       |
| CREATE INDEX idx_saved_property ON saved_listings(property_id);       |
+-----------------------------------------------------------------------+

## **Table: leads (Updated)**

+-----------------------------------------------------------------------+
| CREATE TABLE leads (                                                  |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| property_id UUID NOT NULL REFERENCES properties(id),                  |
|                                                                       |
| agent_id UUID REFERENCES agents(id),                                  |
|                                                                       |
| buyer_id UUID REFERENCES buyers(id), \-- populated after OTP          |
| verification                                                          |
|                                                                       |
| action_type VARCHAR(30) NOT NULL,                                     |
|                                                                       |
| \-- CALL \| WHATSAPP \| VISIT_REQUEST \| NOTIFY_ME \|                 |
| WHATSAPP_INBOUND \| SAVE                                              |
|                                                                       |
| buyer_phone VARCHAR(15), \-- captured from Wati webhook or Notify Me  |
| form                                                                  |
|                                                                       |
| wa_intent VARCHAR(10), \-- HOT \| WARM \| COLD (from post-visit Wati  |
| reply)                                                                |
|                                                                       |
| source VARCHAR(20), \-- WEB \| PWA                                    |
|                                                                       |
| session_hash VARCHAR(64),                                             |
|                                                                       |
| city VARCHAR(100),                                                    |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX idx_leads_property ON leads(property_id);                |
|                                                                       |
| CREATE INDEX idx_leads_agent ON leads(agent_id);                      |
|                                                                       |
| CREATE INDEX idx_leads_created ON leads(created_at);                  |
|                                                                       |
| CREATE INDEX idx_leads_phone ON leads(buyer_phone);                   |
+-----------------------------------------------------------------------+

## **Table: visits (Updated)**

+-----------------------------------------------------------------------+
| CREATE TABLE visits (                                                 |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| property_id UUID NOT NULL REFERENCES properties(id),                  |
|                                                                       |
| agent_id UUID REFERENCES agents(id),                                  |
|                                                                       |
| buyer_phone VARCHAR(15) NOT NULL, \-- REQUIRED (not nullable)         |
|                                                                       |
| visit_date DATE NOT NULL,                                             |
|                                                                       |
| visit_time TIME NOT NULL,                                             |
|                                                                       |
| status VARCHAR(30) DEFAULT \'SCHEDULED\',                             |
|                                                                       |
| \-- SCHEDULED \| CONFIRMED \| VISITED \| NOT_VISITED \| RESCHEDULED   |
| \| CANCELLED                                                          |
|                                                                       |
| post_visit_wa_sent BOOLEAN DEFAULT FALSE, \-- Wati template trigger   |
| flag                                                                  |
|                                                                       |
| notes TEXT,                                                           |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW(),                                 |
|                                                                       |
| updated_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX idx_visits_agent ON visits(agent_id);                    |
|                                                                       |
| CREATE INDEX idx_visits_date ON visits(visit_date);                   |
+-----------------------------------------------------------------------+

## **Redis Keys (Updated)**

+-----------------------------------------------------------------------+
| \-- OTP for sellers/agents (unchanged)                                |
|                                                                       |
| Key: otp:{phone}                                                      |
|                                                                       |
| Value: { hash: SHA256(otp), attempts: 0, created_at: epoch }          |
|                                                                       |
| TTL: 300 seconds                                                      |
|                                                                       |
| \-- Buyer soft OTP (save/notify-me)                                   |
|                                                                       |
| Key: buyer_otp:{phone}                                                |
|                                                                       |
| Value: { hash: SHA256(otp), attempts: 0 }                             |
|                                                                       |
| TTL: 300 seconds                                                      |
|                                                                       |
| \-- Property listing lifecycle scheduler                              |
|                                                                       |
| Key: prop_inactive_warn:{property_id}                                 |
|                                                                       |
| Value: { seller_phone, property_title, notified_at }                  |
|                                                                       |
| TTL: 1296000 seconds (15 days \-- checked at day 30, auto-inactive at |
| day 45)                                                               |
|                                                                       |
| \-- View count buffer (batch-flush to DB)                             |
|                                                                       |
| Key: view_count:{property_id}                                         |
|                                                                       |
| Value: integer                                                        |
|                                                                       |
| TTL: 60 seconds (flushed every minute by scheduler)                   |
+-----------------------------------------------------------------------+

# **03 Backend API Specification**

Base URL: https://api.ListMyNest.in/v1 \| All responses: application/json
\| Auth: Bearer JWT (seller/agent only)

+-----------------------------------------------------------------------+
| Auth Strategy:                                                        |
|                                                                       |
| Buyers: No auth required on any GET endpoint for browsing.            |
|                                                                       |
| Buyer Soft OTP: POST /buyers/otp/send and /buyers/otp/verify for save |
| and notify-me flows. Returns a buyer_token (24h).                     |
|                                                                       |
| Sellers & Agents: OTP login returns a signed JWT (24h expiry). All    |
| write endpoints require Authorization: Bearer \<token\>.              |
+-----------------------------------------------------------------------+

## **Auth Endpoints**

  ------------ --------------------- ------------------------------------------
  **Method**   **Endpoint**          **Description**

  **POST**     /auth/otp/send        Send OTP to phone (seller/agent). Body: {
                                     phone }

  **POST**     /auth/otp/verify      Verify OTP. Returns JWT + role + user_id.
                                     Body: { phone, otp }

  **POST**     /auth/token/refresh   Refresh JWT before expiry. Header: Bearer
                                     token

  **POST**     /buyers/otp/send      Send OTP to buyer phone for soft
                                     verification (save/notify-me). Body: {
                                     phone }

  **POST**     /buyers/otp/verify    Verify buyer OTP. Returns buyer_token +
                                     buyer_id. Creates buyer record if new.
                                     Body: { phone, otp }
  ------------ --------------------- ------------------------------------------

## **Property Endpoints**

  ------------ ------------------------- ------------------------------------------
  **Method**   **Endpoint**              **Description**

  **GET**      /properties               List properties. Query: city, type,
                                         price_min, price_max, page, size. Excludes
                                         SOLD/INACTIVE.

  **GET**      /properties/{id}          Get full property detail by ID. Active
                                         only (SOLD shows badge for 48h, then
                                         excluded).

  **GET**      /properties/featured      Get featured listings (Active + Verified,
                                         sorted by views).

  **GET**      /properties/search        Search by keyword. Query: q, city

  **POST**     /properties               Create new listing. Auth: Seller JWT.
                                         Enters PENDING_REVIEW.

  **PUT**      /properties/{id}          Update listing details. Auth: Seller JWT
                                         (own listing only).

  **PATCH**    /properties/{id}/status   Update listing status. Auth: Agent or
                                         Seller JWT. Body: { status }

  **DELETE**   /properties/{id}          Soft-delete. Auth: Seller JWT. Sets status
                                         = PAUSED.

  **POST**     /properties/{id}/view     Record anonymous property view. Body: {
                                         session_hash, city }

  **PATCH**    /properties/{id}/sold     Mark as sold. Auth: Seller JWT. Triggers
                                         sold lifecycle. Body: {}
  ------------ ------------------------- ------------------------------------------

## **Photo Endpoints (Updated --- Camera Only)**

  ------------ ------------------------------------------- ----------------------------------
  **Method**   **Endpoint**                                **Description**

  **POST**     /properties/{id}/photos/upload-url          Generate signed Supabase upload
                                                           URL. Auth: Seller JWT. Returns: {
                                                           upload_url, storage_path }

  **POST**     /properties/{id}/photos                     Register uploaded photo metadata.
                                                           Body: { storage_url, gps_lat,
                                                           gps_lng, is_primary }. Backend
                                                           validates GPS proximity; sets
                                                           gps_flagged=true if \> 500m.

  **DELETE**   /properties/{id}/photos/{photoId}           Delete a photo. Auth: Seller JWT.

  **PATCH**    /properties/{id}/photos/{photoId}/primary   Set as primary photo. Auth: Seller
                                                           JWT.
  ------------ ------------------------------------------- ----------------------------------

## **Lead Endpoints (Updated)**

  ------------ ------------------------- ------------------------------------------
  **Method**   **Endpoint**              **Description**

  **POST**     /leads                    Log contact action. Body: { property_id,
                                         action_type, session_hash, city,
                                         buyer_phone? }. Public. action_type: CALL
                                         \| WHATSAPP \| VISIT_REQUEST \| NOTIFY_ME

  **POST**     /leads/whatsapp-inbound   Wati webhook handler. Captures buyer WA
                                         number from inbound message. Body: Wati
                                         webhook payload.

  **GET**      /leads                    Get all leads for agent. Auth: Agent JWT.
                                         Query: property_id, action_type, date_from

  **GET**      /leads/seller             Get enquiry summary for seller\'s
                                         listings. Auth: Seller JWT.
  ------------ ------------------------- ------------------------------------------

## **Visit Endpoints (Updated)**

  ------------ ------------------------- ------------------------------------------
  **Method**   **Endpoint**              **Description**

  **POST**     /visits                   Schedule a site visit. Public. Body: {
                                         property_id, visit_date, visit_time,
                                         buyer_phone } --- buyer_phone is REQUIRED.

  **GET**      /visits                   Get visits for agent. Auth: Agent JWT.
                                         Query: date, status

  **PATCH**    /visits/{id}/status       Update visit status. Auth: Agent JWT.
                                         Body: { status, notes? }. If
                                         status=VISITED and
                                         post_visit_wa_sent=false, triggers Wati
                                         template automatically.

  **PATCH**    /visits/{id}/reschedule   Reschedule visit. Auth: Agent JWT. Body: {
                                         visit_date, visit_time }
  ------------ ------------------------- ------------------------------------------

## **Saved Listings Endpoints (New)**

  ------------ --------------------- ------------------------------------------
  **Method**   **Endpoint**          **Description**

  **POST**     /saved                Save a property. Auth: Buyer token. Body:
                                     { property_id }

  **DELETE**   /saved/{propertyId}   Remove saved property. Auth: Buyer token.

  **GET**      /saved                Get all saved properties for buyer. Auth:
                                     Buyer token.
  ------------ --------------------- ------------------------------------------

## **Notify Me Endpoint**

  ------------ -------------------- ------------------------------------------
  **Method**   **Endpoint**         **Description**

  **POST**     /notify-me           Register buyer for property notifications.
                                    Body: { phone, city }. Adds to Wati
                                    broadcast segment. Public.
  ------------ -------------------- ------------------------------------------

## **Agent & Seller Endpoints**

  ------------ ----------------------- ------------------------------------------
  **Method**   **Endpoint**            **Description**

  **GET**      /agents/me              Get authenticated agent profile + stats.
                                       Auth: Agent JWT.

  **PATCH**    /agents/me/status       Toggle active/inactive. Auth: Agent JWT.
                                       Body: { active: boolean }

  **PATCH**    /agents/me/fcm-token    Update FCM push token. Auth: Agent JWT.
                                       Body: { fcm_token }

  **GET**      /agents/me/dashboard    Aggregated dashboard data: new leads,
                                       today visits, total visits. Auth: Agent
                                       JWT.

  **GET**      /sellers/me             Get seller profile + listing count. Auth:
                                       Seller JWT.

  **GET**      /sellers/me/dashboard   Aggregated stats: listings, enquiries,
                                       visits. Auth: Seller JWT.

  **GET**      /sellers/me/listings    Get seller\'s own listings with status.
                                       Auth: Seller JWT.
  ------------ ----------------------- ------------------------------------------

## **Admin Endpoints (New)**

  ------------ -------------------------------------- --------------------------------
  **Method**   **Endpoint**                           **Description**

  **POST**     /admin/auth/login                      Admin login (email + password or
                                                      OTP). Returns Admin JWT (8h).
                                                      Body: { email, password } or {
                                                      phone, otp }

  **GET**      /admin/properties                      All properties, all statuses.
                                                      Auth: Admin JWT. Query: status,
                                                      city, agent_id

  **PATCH**    /admin/properties/{id}/status          Force-set any listing status
                                                      (e.g. activate, reject). Auth:
                                                      Admin JWT. Body: { status }

  **GET**      /admin/agents                          List all agents with lead/visit
                                                      stats. Auth: Admin JWT.

  **POST**     /admin/agents                          Create new agent. Auth: Admin
                                                      JWT. Body: { name, phone,
                                                      whatsapp_number, assigned_cities
                                                      }

  **PATCH**    /admin/agents/{id}                     Edit agent details
                                                      (assigned_cities, active
                                                      status). Auth: Admin JWT.

  **GET**      /admin/sellers                         List all sellers with listing
                                                      count. Auth: Admin JWT.

  **POST**     /admin/sellers                         Create seller record. Auth:
                                                      Admin JWT. Body: { name, phone }

  **POST**     /admin/impersonate/seller/{sellerId}   Issue a scoped seller JWT for
                                                      the given seller_id. Admin JWT
                                                      required. Logs
                                                      IMPERSONATION_START to audit
                                                      log. Used to create listings on
                                                      behalf of seller.

  **GET**      /admin/buyers                          List verified buyers with saved
                                                      listing count. Auth: Admin JWT.

  **GET**      /admin/audit-log                       View admin action history. Auth:
                                                      Admin JWT. Query: admin_id,
                                                      entity_type, date_from
  ------------ -------------------------------------- --------------------------------

# **04 Request & Response Schemas**

## **POST /visits --- Request Body (buyer_phone now REQUIRED)**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"property_id\": \"uuid-of-property\",                                |
|                                                                       |
| \"visit_date\": \"2026-03-25\",                                       |
|                                                                       |
| \"visit_time\": \"11:00:00\",                                         |
|                                                                       |
| \"buyer_phone\": \"+919876543210\" // REQUIRED --- validation error   |
| if missing                                                            |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

## **POST /leads/whatsapp-inbound --- Wati Webhook Body**

+-----------------------------------------------------------------------+
| // Wati sends this when buyer replies to agent WhatsApp               |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"waId\": \"919876543210\", // buyer WA number without +              |
|                                                                       |
| \"text\": \"1\", // buyer reply content (for intent classification)   |
|                                                                       |
| \"timestamp\": \"2026-03-25T10:00:00Z\",                              |
|                                                                       |
| \"conversationId\": \"abc123\",                                       |
|                                                                       |
| \"contact\": { \"name\": \"Raju\", \"waId\": \"919876543210\" }       |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Backend handler:                                                   |
|                                                                       |
| // 1. Extract waId → format as +919876543210                          |
|                                                                       |
| // 2. Look up most recent unresolved lead for this agent\'s WA number |
|                                                                       |
| // 3. Update leads.buyer_phone = waId                                 |
|                                                                       |
| // 4. If text = \'1\'/\'2\'/\'3\': update leads.wa_intent =           |
| HOT/WARM/COLD                                                         |
|                                                                       |
| // 5. Notify agent dashboard via FCM with intent signal               |
+-----------------------------------------------------------------------+

## **POST /saved --- Request & Response**

+-----------------------------------------------------------------------+
| // Request (requires buyer token in header)                           |
|                                                                       |
| POST /saved                                                           |
|                                                                       |
| Authorization: Bearer \<buyer_token\>                                 |
|                                                                       |
| { \"property_id\": \"uuid-of-property\" }                             |
|                                                                       |
| // Response 201                                                       |
|                                                                       |
| { \"id\": \"saved-uuid\", \"property_id\": \"\...\", \"saved_at\":    |
| \"2026-03-25T10:00:00Z\" }                                            |
|                                                                       |
| // Error if already saved:                                            |
|                                                                       |
| { \"error\": \"ALREADY_SAVED\", \"status\": 409 }                     |
+-----------------------------------------------------------------------+

## **GET /properties (Response --- no seller phone ever returned)**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"data\": \[                                                          |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"id\": \"rs-bdr-00142\",                                             |
|                                                                       |
| \"title\": \"2 BHK House near Udgir Road\",                           |
|                                                                       |
| \"type\": \"RESIDENTIAL\",                                            |
|                                                                       |
| \"city\": \"Bidar\",                                                  |
|                                                                       |
| \"locality\": \"Udgir Road\",                                         |
|                                                                       |
| \"price_min\": 1800000,                                               |
|                                                                       |
| \"price_max\": 2200000,                                               |
|                                                                       |
| \"area_sqft\": 950,                                                   |
|                                                                       |
| \"configuration\": \"2BHK\",                                          |
|                                                                       |
| \"verified\": true,                                                   |
|                                                                       |
| \"status\": \"ACTIVE\",                                               |
|                                                                       |
| \"primary_photo\": \"https://cdn.supabase.co/\...\",                  |
|                                                                       |
| \"photo_count\": 6,                                                   |
|                                                                       |
| \"view_count\": 47,                                                   |
|                                                                       |
| \"created_at\": \"2026-03-20T10:00:00Z\"                              |
|                                                                       |
| // seller_phone: NEVER returned                                       |
|                                                                       |
| // agent_phone: NEVER returned (only via /whatsapp/link)              |
|                                                                       |
| }                                                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| \"pagination\": { \"page\": 1, \"size\": 20, \"total\": 84,           |
| \"total_pages\": 5 }                                                  |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

# **05 Spring Boot Implementation Details**

## **Package Structure (Updated)**

+-----------------------------------------------------------------------+
| com.ListMyNest/                                                        |
|                                                                       |
| ├── controller/                                                       |
|                                                                       |
| │ ├── PropertyController.java                                         |
|                                                                       |
| │ ├── LeadController.java                                             |
|                                                                       |
| │ ├── VisitController.java                                            |
|                                                                       |
| │ ├── AuthController.java // seller/agent OTP                         |
|                                                                       |
| │ ├── BuyerAuthController.java // buyer soft OTP (save/notify-me)     |
|                                                                       |
| │ ├── SavedListingController.java                                     |
|                                                                       |
| │ ├── NotifyMeController.java                                         |
|                                                                       |
| │ ├── AgentController.java                                            |
|                                                                       |
| │ └── SellerController.java                                           |
|                                                                       |
| │ ├── AdminController.java                                            |
|                                                                       |
| │ └── AdminImpersonationController.java                               |
|                                                                       |
| ├── service/                                                          |
|                                                                       |
| │ ├── PropertyService.java                                            |
|                                                                       |
| │ ├── LeadService.java                                                |
|                                                                       |
| │ ├── VisitService.java                                               |
|                                                                       |
| │ ├── AuthService.java // seller/agent OTP + JWT                      |
|                                                                       |
| │ ├── BuyerAuthService.java // buyer OTP + buyer token                |
|                                                                       |
| │ ├── SavedListingService.java                                        |
|                                                                       |
| │ ├── NotifyMeService.java                                            |
|                                                                       |
| │ ├── WhatsAppService.java // Wati REST client + webhook handler      |
|                                                                       |
| │ ├── StorageService.java                                             |
|                                                                       |
| │ ├── NotificationService.java // FCM                                 |
|                                                                       |
| │ ├── GpsValidationService.java // Photo GPS proximity check          |
|                                                                       |
| │ └── AgentRoutingService.java                                        |
|                                                                       |
| │ ├── AdminService.java // admin CRUD + impersonation token issue     |
|                                                                       |
| │ └── AdminAuditService.java // write to admin_audit_log on every     |
| action                                                                |
|                                                                       |
| ├── repository/                                                       |
|                                                                       |
| │ ├── PropertyRepository.java                                         |
|                                                                       |
| │ ├── LeadRepository.java                                             |
|                                                                       |
| │ ├── VisitRepository.java                                            |
|                                                                       |
| │ ├── AgentRepository.java                                            |
|                                                                       |
| │ ├── SellerRepository.java                                           |
|                                                                       |
| │ ├── BuyerRepository.java                                            |
|                                                                       |
| │ └── SavedListingRepository.java                                     |
|                                                                       |
| │ ├── AdminRepository.java                                            |
|                                                                       |
| │ └── AdminAuditLogRepository.java                                    |
|                                                                       |
| ├── model/ // JPA \@Entity classes                                    |
|                                                                       |
| ├── dto/ // Request/Response DTOs (records)                           |
|                                                                       |
| ├── config/                                                           |
|                                                                       |
| │ ├── SecurityConfig.java                                             |
|                                                                       |
| │ ├── CorsConfig.java                                                 |
|                                                                       |
| │ ├── RedisConfig.java                                                |
|                                                                       |
| │ └── OpenApiConfig.java                                              |
|                                                                       |
| ├── exception/                                                        |
|                                                                       |
| │ ├── GlobalExceptionHandler.java                                     |
|                                                                       |
| │ └── AppException.java                                               |
|                                                                       |
| └── scheduler/                                                        |
|                                                                       |
| ├── VisitReminderScheduler.java                                       |
|                                                                       |
| ├── PropertyLifecycleScheduler.java // 30-day warn, 45-day            |
| auto-inactive                                                         |
|                                                                       |
| └── ViewCountFlushScheduler.java // Batch view count flush to DB      |
+-----------------------------------------------------------------------+

## **Wati Webhook Handler --- WhatsAppService**

+-----------------------------------------------------------------------+
| // POST /leads/whatsapp-inbound (public endpoint, Wati webhook)       |
|                                                                       |
| public void handleInboundWhatsApp(WatiWebhookPayload payload) {       |
|                                                                       |
| String buyerPhone = \'+\' + payload.getWaId(); // format E.164        |
|                                                                       |
| String messageText = payload.getText().trim();                        |
|                                                                       |
| // 1. Find or create buyer record                                     |
|                                                                       |
| Buyer buyer = buyerRepo.findByPhone(buyerPhone)                       |
|                                                                       |
| .orElseGet(() -\> buyerRepo.save(new Buyer(buyerPhone)));             |
|                                                                       |
| // 2. Find most recent unresolved WA lead for this agent              |
|                                                                       |
| Lead lead = leadRepo.findLatestUnresolvedByAgentWaNumber(             |
|                                                                       |
| payload.getToNumber(), LeadActionType.WHATSAPP);                      |
|                                                                       |
| // 3. Capture phone against lead                                      |
|                                                                       |
| if (lead != null) {                                                   |
|                                                                       |
| lead.setBuyerPhone(buyerPhone);                                       |
|                                                                       |
| lead.setBuyerId(buyer.getId());                                       |
|                                                                       |
| // 4. Classify intent from post-visit reply (1/2/3)                   |
|                                                                       |
| if (lead.getProperty().getStatus() == PropertyStatus.VISIT_COMPLETED) |
| {                                                                     |
|                                                                       |
| WaIntent intent = switch (messageText) {                              |
|                                                                       |
| case \'1\' -\> WaIntent.HOT;                                          |
|                                                                       |
| case \'2\' -\> WaIntent.WARM;                                         |
|                                                                       |
| case \'3\' -\> WaIntent.COLD;                                         |
|                                                                       |
| default -\> null;                                                     |
|                                                                       |
| };                                                                    |
|                                                                       |
| if (intent != null) lead.setWaIntent(intent);                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| leadRepo.save(lead);                                                  |
|                                                                       |
| // 5. Push intent update to agent dashboard                           |
|                                                                       |
| if (lead.getWaIntent() != null) {                                     |
|                                                                       |
| fcmService.sendLeadIntentUpdate(lead);                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

## **Post-Visit Wati Template Trigger --- VisitService**

+-----------------------------------------------------------------------+
| // Called when agent marks visit as VISITED                           |
|                                                                       |
| \@Transactional                                                       |
|                                                                       |
| public void updateVisitStatus(UUID visitId, VisitStatus status,       |
| String notes) {                                                       |
|                                                                       |
| Visit visit = visitRepo.findById(visitId).orElseThrow();              |
|                                                                       |
| visit.setStatus(status);                                              |
|                                                                       |
| visit.setNotes(notes);                                                |
|                                                                       |
| if (status == VisitStatus.VISITED && !visit.isPostVisitWaSent()) {    |
|                                                                       |
| // Trigger Wati post-visit template                                   |
|                                                                       |
| Property prop = visit.getProperty();                                  |
|                                                                       |
| whatsAppService.sendPostVisitTemplate(                                |
|                                                                       |
| visit.getBuyerPhone(),                                                |
|                                                                       |
| prop.getTitle(),                                                      |
|                                                                       |
| prop.getCity()                                                        |
|                                                                       |
| );                                                                    |
|                                                                       |
| visit.setPostVisitWaSent(true);                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| visitRepo.save(visit);                                                |
|                                                                       |
| // Update property last_activity_at                                   |
|                                                                       |
| prop.setLastActivityAt(Instant.now());                                |
|                                                                       |
| propertyRepo.save(prop);                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // WhatsAppService.sendPostVisitTemplate()                            |
|                                                                       |
| // POST https://live-server.wati.io/api/v1/sendTemplateMessage        |
|                                                                       |
| // Body: {                                                            |
|                                                                       |
| // whatsappNumber: buyerPhone,                                        |
|                                                                       |
| // template_name: \'post_visit_feedback\',                            |
|                                                                       |
| // broadcast_name: \'post_visit\_\' + visitId,                        |
|                                                                       |
| // parameters: \[{ name: \'property_name\', value: propTitle },       |
|                                                                       |
| // { name: \'city\', value: city }\]                                  |
|                                                                       |
| // }                                                                  |
+-----------------------------------------------------------------------+

## **Property Lifecycle Scheduler**

+-----------------------------------------------------------------------+
| // PropertyLifecycleScheduler.java                                    |
|                                                                       |
| \@Scheduled(cron = \'0 0 8 \* \* \*\') // Run daily at 8 AM           |
|                                                                       |
| public void runLifecycleChecks() {                                    |
|                                                                       |
| Instant now = Instant.now();                                          |
|                                                                       |
| // === 30-DAY INACTIVITY WARN ===                                     |
|                                                                       |
| Instant thirtyDaysAgo = now.minus(30, ChronoUnit.DAYS);               |
|                                                                       |
| List\<Property\> toWarn = propertyRepo                                |
|                                                                       |
| .findByStatusAndLastActivityAtBefore(PropertyStatus.ACTIVE,           |
| thirtyDaysAgo);                                                       |
|                                                                       |
| for (Property p : toWarn) {                                           |
|                                                                       |
| if (!redisService.exists(\'prop_inactive_warn:\' + p.getId())) {      |
|                                                                       |
| // Send WhatsApp/SMS to seller                                        |
|                                                                       |
| msg91Service.sendSms(p.getSeller().getPhone(),                        |
|                                                                       |
| \'Your listing \' + p.getTitle() + \' has had no activity for 30      |
| days. \' +                                                            |
|                                                                       |
| \'Login to ListMyNest to keep it active or mark as Sold.\');           |
|                                                                       |
| // Store warn timestamp in Redis (TTL 15 days for day-45 check)       |
|                                                                       |
| redisService.setex(\'prop_inactive_warn:\' + p.getId(), 1296000,      |
|                                                                       |
| \'{\"notified_at\":\"\' + now + \'\"}\');                             |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // === 45-DAY AUTO-INACTIVE ===                                       |
|                                                                       |
| Instant fortyFiveDaysAgo = now.minus(45, ChronoUnit.DAYS);            |
|                                                                       |
| List\<Property\> toDeactivate = propertyRepo                          |
|                                                                       |
| .findByStatusAndLastActivityAtBefore(PropertyStatus.ACTIVE,           |
| fortyFiveDaysAgo);                                                    |
|                                                                       |
| for (Property p : toDeactivate) {                                     |
|                                                                       |
| p.setStatus(PropertyStatus.INACTIVE);                                 |
|                                                                       |
| p.setUpdatedAt(now);                                                  |
|                                                                       |
| propertyRepo.save(p);                                                 |
|                                                                       |
| // Notify seller                                                      |
|                                                                       |
| msg91Service.sendSms(p.getSeller().getPhone(),                        |
|                                                                       |
| \'Your listing \' + p.getTitle() + \' has been marked inactive after  |
| 45 days. \' +                                                         |
|                                                                       |
| \'Login to reactivate it.\');                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| // === SOLD BADGE EXPIRY (48h) ===                                    |
|                                                                       |
| Instant fortyEightHoursAgo = now.minus(48, ChronoUnit.HOURS);         |
|                                                                       |
| List\<Property\> soldBadgeExpiry = propertyRepo                       |
|                                                                       |
| .findByStatusAndSoldAtBefore(PropertyStatus.SOLD,                     |
| fortyEightHoursAgo);                                                  |
|                                                                       |
| for (Property p : soldBadgeExpiry) {                                  |
|                                                                       |
| p.setStatus(PropertyStatus.ARCHIVED);                                 |
|                                                                       |
| propertyRepo.save(p);                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

## **GPS Photo Validation --- GpsValidationService**

+-----------------------------------------------------------------------+
| // Called after photo metadata registered: POST                       |
| /properties/{id}/photos                                               |
|                                                                       |
| public void validatePhotoGps(UUID propertyId, Double gpsLat, Double   |
| gpsLng,                                                               |
|                                                                       |
| UUID photoId) {                                                       |
|                                                                       |
| if (gpsLat == null \|\| gpsLng == null) {                             |
|                                                                       |
| // GPS not available --- flag for agent review                        |
|                                                                       |
| photoRepo.setGpsFlagged(photoId, true);                               |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| Property prop = propertyRepo.findById(propertyId).orElseThrow();      |
|                                                                       |
| double distanceMeters = haversineDistance(                            |
|                                                                       |
| gpsLat, gpsLng, prop.getLat(), prop.getLng());                        |
|                                                                       |
| if (distanceMeters \> 500.0) {                                        |
|                                                                       |
| // Soft flag --- photo still accepted, agent reviews                  |
|                                                                       |
| photoRepo.setGpsFlagged(photoId, true);                               |
|                                                                       |
| // Flag appears in agent review queue but does NOT block listing      |
| creation                                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Note: Hard rejection removed. GPS mismatch is a review flag only.  |
|                                                                       |
| // Agent sees \[GPS MISMATCH\] badge in review queue and makes final  |
| call.                                                                 |
+-----------------------------------------------------------------------+

## **Buyer Soft OTP --- BuyerAuthService**

+-----------------------------------------------------------------------+
| // Called when buyer tries to save a listing or submit Notify Me      |
|                                                                       |
| public void sendBuyerOtp(String phone) {                              |
|                                                                       |
| String otp = generateSecure6DigitOTP();                               |
|                                                                       |
| String hash = SHA256(otp);                                            |
|                                                                       |
| redis.setex(\'buyer_otp:\' + phone, 300, \'{hash:\' + hash +          |
| \',attempts:0}\');                                                    |
|                                                                       |
| msg91Client.sendSms(phone,                                            |
|                                                                       |
| \'Your ListMyNest verification code: \' + otp + \'. Tap to save        |
| listings.\');                                                         |
|                                                                       |
| }                                                                     |
|                                                                       |
| public BuyerAuthResponse verifyBuyerOtp(String phone, String otp) {   |
|                                                                       |
| String stored = redis.get(\'buyer_otp:\' + phone);                    |
|                                                                       |
| if (SHA256(otp) != stored.hash) {                                     |
|                                                                       |
| incrementAttempts();                                                  |
|                                                                       |
| throw new InvalidOtpException();                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| redis.del(\'buyer_otp:\' + phone);                                    |
|                                                                       |
| Buyer buyer = buyerRepo.findByPhone(phone)                            |
|                                                                       |
| .orElseGet(() -\> buyerRepo.save(new Buyer(phone)));                  |
|                                                                       |
| String buyerToken = jwtService.issueBuyerToken(buyer);                |
|                                                                       |
| return new BuyerAuthResponse(buyerToken, buyer.getId());              |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Buyer token: JWT with role=BUYER, shorter claims set               |
|                                                                       |
| // Used only for: GET/POST /saved, GET /saved                         |
+-----------------------------------------------------------------------+

# **06 Frontend Technical Specification**

## **Next.js App Router Structure (Updated)**

+-----------------------------------------------------------------------+
| app/                                                                  |
|                                                                       |
| ├── layout.tsx \# Root layout: fonts, PWA meta, nav                   |
|                                                                       |
| ├── page.tsx \# Homepage (SSG, revalidate: 300s)                      |
|                                                                       |
| ├── listings/                                                         |
|                                                                       |
| │ └── page.tsx \# Listing page (SSR, city/type filter)                |
|                                                                       |
| ├── property/                                                         |
|                                                                       |
| │ └── \[id\]/                                                         |
|                                                                       |
| │ └── page.tsx \# Property detail (SSR for SEO)                       |
|                                                                       |
| ├── saved/                                                            |
|                                                                       |
| │ └── page.tsx \# Saved listings (CSR, buyer token required)          |
|                                                                       |
| ├── seller/                                                           |
|                                                                       |
| │ ├── login/page.tsx                                                  |
|                                                                       |
| │ ├── dashboard/page.tsx                                              |
|                                                                       |
| │ └── add-listing/page.tsx                                            |
|                                                                       |
| ├── agent/                                                            |
|                                                                       |
| │ ├── login/page.tsx                                                  |
|                                                                       |
| │ └── dashboard/page.tsx                                              |
|                                                                       |
| ├── admin/                                                            |
|                                                                       |
| │ ├── login/page.tsx                                                  |
|                                                                       |
| │ ├── dashboard/page.tsx                                              |
|                                                                       |
| │ ├── listings/page.tsx                                               |
|                                                                       |
| │ ├── agents/page.tsx                                                 |
|                                                                       |
| │ ├── sellers/page.tsx                                                |
|                                                                       |
| │ └── buyers/page.tsx                                                 |
|                                                                       |
| ├── schedule-visit/                                                   |
|                                                                       |
| │ └── \[propertyId\]/page.tsx \# Visit scheduler (buyer_phone         |
| REQUIRED)                                                             |
|                                                                       |
| └── api/                                                              |
|                                                                       |
| ├── revalidate/route.ts                                               |
|                                                                       |
| └── wati-webhook/route.ts \# Wati inbound webhook proxy (optional     |
| edge fn)                                                              |
+-----------------------------------------------------------------------+

## **Camera-Only Photo Upload (Frontend)**

+-----------------------------------------------------------------------+
| // components/PhotoUploader.tsx                                       |
|                                                                       |
| // Force camera capture --- no gallery on mobile devices              |
|                                                                       |
| // Using HTML media capture attribute:                                |
|                                                                       |
| \<input                                                               |
|                                                                       |
| type=\'file\'                                                         |
|                                                                       |
| accept=\'image/\*\'                                                   |
|                                                                       |
| capture=\'environment\' // rear camera by default                     |
|                                                                       |
| multiple                                                              |
|                                                                       |
| onChange={handlePhotoCapture}                                         |
|                                                                       |
| ref={cameraInputRef}                                                  |
|                                                                       |
| /\>                                                                   |
|                                                                       |
| // Note: capture=\'environment\' is a hint for mobile browsers.       |
|                                                                       |
| // On desktop (where agents may test), gallery still opens --- this   |
| is acceptable.                                                        |
|                                                                       |
| // GPS EXIF is read client-side before upload for display, but        |
| backend always                                                        |
|                                                                       |
| // re-validates from the stored metadata after upload.                |
|                                                                       |
| // EXIF extraction (client-side, for UX preview only):                |
|                                                                       |
| // Using exifr library: npm install exifr                             |
|                                                                       |
| import exifr from \'exifr\';                                          |
|                                                                       |
| const extractGps = async (file: File) =\> {                           |
|                                                                       |
| const gps = await exifr.gps(file);                                    |
|                                                                       |
| return gps ? { lat: gps.latitude, lng: gps.longitude } : null;        |
|                                                                       |
| };                                                                    |
+-----------------------------------------------------------------------+

## **Saved Listings --- State & Auth Flow**

+-----------------------------------------------------------------------+
| // store/useBuyerStore.ts                                             |
|                                                                       |
| interface BuyerStore {                                                |
|                                                                       |
| buyerToken: string \| null;                                           |
|                                                                       |
| buyerId: string \| null;                                              |
|                                                                       |
| setBuyer: (token: string, id: string) =\> void;                       |
|                                                                       |
| logout: () =\> void;                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| // buyerToken stored in sessionStorage (not localStorage --- privacy  |
| safe)                                                                 |
|                                                                       |
| // components/SaveButton.tsx                                          |
|                                                                       |
| const handleSave = async (propertyId: string) =\> {                   |
|                                                                       |
| const { buyerToken } = useBuyerStore.getState();                      |
|                                                                       |
| if (!buyerToken) {                                                    |
|                                                                       |
| // Show OTP verification bottom sheet                                 |
|                                                                       |
| setShowOtpSheet(true);                                                |
|                                                                       |
| setPendingPropertyId(propertyId);                                     |
|                                                                       |
| return;                                                               |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Token exists --- save immediately                                  |
|                                                                       |
| await fetch(\'/api/v1/saved\', {                                      |
|                                                                       |
| method: \'POST\',                                                     |
|                                                                       |
| headers: { Authorization: \'Bearer \' + buyerToken,                   |
|                                                                       |
| \'Content-Type\': \'application/json\' },                             |
|                                                                       |
| body: JSON.stringify({ property_id: propertyId })                     |
|                                                                       |
| });                                                                   |
|                                                                       |
| setSaved(true);                                                       |
|                                                                       |
| };                                                                    |
|                                                                       |
| // On OTP verify success → store buyerToken → auto-complete the save  |
| action                                                                |
+-----------------------------------------------------------------------+

## **Notify Me Bottom Sheet --- Trigger Logic**

+-----------------------------------------------------------------------+
| // hooks/useNotifyMeTrigger.ts                                        |
|                                                                       |
| const useNotifyMeTrigger = () =\> {                                   |
|                                                                       |
| const viewCount = useSessionViewCount(); // increments on each        |
| /property/\[id\] load                                                 |
|                                                                       |
| const hasContactAction = useHasContactAction(); // any lead action in |
| session                                                               |
|                                                                       |
| const \[shown, setShown\] = useState(false);                          |
|                                                                       |
| useEffect(() =\> {                                                    |
|                                                                       |
| if (viewCount \>= 3 && !hasContactAction && !shown) {                 |
|                                                                       |
| setShowNotifyMeSheet(true);                                           |
|                                                                       |
| setShown(true); // never show again this session                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| }, \[viewCount\]);                                                    |
|                                                                       |
| };                                                                    |
|                                                                       |
| // Session view count is stored in sessionStorage (not Redux ---      |
| resets per tab)                                                       |
|                                                                       |
| // hasContactAction = any PostHog event: call_click \| wa_click \|    |
| visit_request \| save                                                 |
|                                                                       |
| // NotifyMeSheet.tsx                                                  |
|                                                                       |
| // Bottom sheet (slides up from bottom, not a modal overlay)          |
|                                                                       |
| // Prominent dismiss X --- no second prompt                           |
|                                                                       |
| // On submit: POST /notify-me +                                       |
| posthog.capture(\'notify_me_submitted\', { city })                    |
+-----------------------------------------------------------------------+

## **WhatsApp Click Handler (Updated --- Wati Integration)**

+-----------------------------------------------------------------------+
| // components/PropertyCTA.tsx                                         |
|                                                                       |
| const handleWhatsApp = async (propertyId: string) =\> {               |
|                                                                       |
| const sessionHash = await generateSessionHash();                      |
|                                                                       |
| // Log lead action                                                    |
|                                                                       |
| fetch(\'/api/v1/leads\', {                                            |
|                                                                       |
| method: \'POST\',                                                     |
|                                                                       |
| body: JSON.stringify({                                                |
|                                                                       |
| property_id: propertyId,                                              |
|                                                                       |
| action_type: \'WHATSAPP\',                                            |
|                                                                       |
| session_hash: sessionHash                                             |
|                                                                       |
| })                                                                    |
|                                                                       |
| });                                                                   |
|                                                                       |
| // Get agent WA link                                                  |
|                                                                       |
| const res = await fetch(\'/api/v1/whatsapp/link/\' + propertyId);     |
|                                                                       |
| const data = await res.json();                                        |
|                                                                       |
| // Open WhatsApp                                                      |
|                                                                       |
| window.open(data.wa_url, \'\_blank\');                                |
|                                                                       |
| // Wati webhook fires when buyer replies → captures buyer WA number   |
| automatically                                                         |
|                                                                       |
| };                                                                    |
+-----------------------------------------------------------------------+

# **07 Third-Party Integration Specs**

## **Wati.io --- WhatsApp Integration (Updated for Phase 1)**

+-----------------------------------------------------------------------+
| // === OUTBOUND (from backend) ===                                    |
|                                                                       |
| // 1. Click-to-chat wa.me link (existing, unchanged)                  |
|                                                                       |
| // https://wa.me/{AGENT_NUMBER}?text={URL_ENCODED_MESSAGE}            |
|                                                                       |
| // 2. Post-visit feedback template (NEW in Phase 1)                   |
|                                                                       |
| POST https://live-server.wati.io/api/v1/sendTemplateMessage           |
|                                                                       |
| Headers: Authorization: Bearer {WATI_API_TOKEN}                       |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"whatsappNumber\": \"919876543210\",                                 |
|                                                                       |
| \"template_name\": \"post_visit_feedback\",                           |
|                                                                       |
| \"broadcast_name\": \"post_visit_abc123\",                            |
|                                                                       |
| \"parameters\": \[                                                    |
|                                                                       |
| { \"name\": \"property_name\", \"value\": \"2 BHK House near Udgir    |
| Road\" },                                                             |
|                                                                       |
| { \"name\": \"city\", \"value\": \"Bidar\" }                          |
|                                                                       |
| \]                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| // === INBOUND (from buyer) ===                                       |
|                                                                       |
| // Wati webhooks configured to POST to:                               |
| https://api.ListMyNest.in/v1/leads/whatsapp-inbound                    |
|                                                                       |
| // Events subscribed: message:received                                |
|                                                                       |
| // Backend extracts: waId (buyer phone), text (reply content for      |
| intent classification)                                                |
|                                                                       |
| // === BROADCAST (Notify Me segment) ===                              |
|                                                                       |
| // Buyers who submit Notify Me are added to Wati contact group:       |
| notify\_{city}                                                        |
|                                                                       |
| // Weekly broadcast template: \'new_listings_weekly\'                 |
|                                                                       |
| // Phase 1: Manually curated. Phase 2: API-driven.                    |
+-----------------------------------------------------------------------+

## **MSG91 --- OTP Integration**

+-----------------------------------------------------------------------+
| POST https://api.msg91.com/api/v5/otp                                 |
|                                                                       |
| Headers: authkey: {MSG91_AUTH_KEY}                                    |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"mobile\": \"919876543210\",                                         |
|                                                                       |
| \"message\": \"Your ListMyNest OTP is ##OTP##. Valid for 5 mins.\",    |
|                                                                       |
| \"otp_length\": 6,                                                    |
|                                                                       |
| \"otp_expiry\": 5,                                                    |
|                                                                       |
| \"sender\": \"RDSOIL\"                                                |
|                                                                       |
| }                                                                     |
|                                                                       |
| // Same flow for both seller/agent OTP and buyer soft OTP             |
|                                                                       |
| // Retry logic: max 3 send attempts per phone per hour (enforce in    |
| Redis)                                                                |
|                                                                       |
| // Key: otp_send_count:{phone} TTL: 3600s                             |
+-----------------------------------------------------------------------+

## **Google Maps --- Integration Points (Unchanged)**

Address Autocomplete on listing form (frontend). Geocoding on property
creation (backend). Static map embed on detail page showing area-level
pin only --- exact address not revealed.

## **Firebase FCM --- Push Notifications**

FCM push used for: new lead to agent, visit reminder 1hr before, visit
intent update (after Wati reply). Spring Boot Firebase Admin SDK v9.2.0.
Fallback: agent dashboard polling every 30 seconds.

## **PostHog --- Analytics (Updated Events)**

+-----------------------------------------------------------------------+
| posthog.init(\'YOUR_POSTHOG_KEY\', {                                  |
|                                                                       |
| api_host: \'https://app.posthog.com\',                                |
|                                                                       |
| autocapture: false,                                                   |
|                                                                       |
| capture_pageview: false,                                              |
|                                                                       |
| persistence: \'memory\' // No localStorage --- DPDP compliant         |
|                                                                       |
| })                                                                    |
|                                                                       |
| // Events                                                             |
|                                                                       |
| posthog.capture(\'property_view\', { property_id, city, type })       |
|                                                                       |
| posthog.capture(\'call_click\', { property_id, city })                |
|                                                                       |
| posthog.capture(\'wa_click\', { property_id, city })                  |
|                                                                       |
| posthog.capture(\'visit_request\', { property_id, city, visit_date }) |
|                                                                       |
| posthog.capture(\'save_attempt\', { property_id, had_token: bool })   |
|                                                                       |
| posthog.capture(\'otp_sheet_shown\', { trigger: \'save\' \|           |
| \'notify_me\' })                                                      |
|                                                                       |
| posthog.capture(\'otp_verified\', { trigger: \'save\' \|              |
| \'notify_me\' })                                                      |
|                                                                       |
| posthog.capture(\'notify_me_shown\', { city, view_count: 3 })         |
|                                                                       |
| posthog.capture(\'notify_me_submitted\', { city })                    |
|                                                                       |
| posthog.capture(\'notify_me_dismissed\', { city })                    |
|                                                                       |
| posthog.capture(\'city_filter\', { city })                            |
+-----------------------------------------------------------------------+

# **08 Security Specification**

## **Authentication & Authorization (Updated)**

  --------------- ----------------- ---------------------------------------
  **Actor**       **Auth Method**   **Scope**

  **Buyer         None              Read-only: GET /properties/\*\*, POST
  (anonymous)**                     /leads, POST /visits, GET
                                    /whatsapp/\*\*

  **Buyer         Soft OTP →        POST /saved, GET /saved, DELETE /saved,
  (verified)**    buyer_token (24h) POST /notify-me (optional)

  **Seller**      OTP via MSG91 →   Own listings CRUD, own dashboard, photo
                  JWT (24h)         upload

  **Agent**       OTP via MSG91 →   Assigned leads/visits read, status
                  JWT (24h)         updates, dashboard

  **Wati          Webhook secret    POST /leads/whatsapp-inbound only
  Webhook**       header validation 

  **Admin**       Email + password  All /v1/admin/\*\* endpoints. Seller
                  or OTP → Admin    impersonation (scoped token). Full
                  JWT (8h)          read/write on listings, agents,
                                    sellers, buyers. Audit log on every
                                    action.
  --------------- ----------------- ---------------------------------------

## **Spring Security Rules (Updated)**

+-----------------------------------------------------------------------+
| http.authorizeHttpRequests(auth -\> auth                              |
|                                                                       |
| // Public buyer endpoints                                             |
|                                                                       |
| .requestMatchers(HttpMethod.GET, \'/v1/properties/\*\*\').permitAll() |
|                                                                       |
| .requestMatchers(HttpMethod.POST, \'/v1/leads\').permitAll()          |
|                                                                       |
| .requestMatchers(HttpMethod.POST,                                     |
| \'/v1/leads/whatsapp-inbound\').permitAll()                           |
|                                                                       |
| .requestMatchers(HttpMethod.POST, \'/v1/visits\').permitAll()         |
|                                                                       |
| .requestMatchers(HttpMethod.GET, \'/v1/whatsapp/\*\*\').permitAll()   |
|                                                                       |
| .requestMatchers(HttpMethod.POST,                                     |
| \'/v1/properties/{id}/view\').permitAll()                             |
|                                                                       |
| .requestMatchers( \'/v1/auth/\*\*\').permitAll()                      |
|                                                                       |
| .requestMatchers( \'/v1/buyers/otp/\*\*\').permitAll()                |
|                                                                       |
| .requestMatchers(HttpMethod.POST, \'/v1/notify-me\').permitAll()      |
|                                                                       |
| // Buyer token endpoints                                              |
|                                                                       |
| .requestMatchers(\'/v1/saved/\*\*\').hasRole(\'BUYER\')               |
|                                                                       |
| // Seller-only endpoints                                              |
|                                                                       |
| .requestMatchers(\'/v1/sellers/\*\*\').hasRole(\'SELLER\')            |
|                                                                       |
| .requestMatchers(HttpMethod.POST,                                     |
| \'/v1/properties\').hasRole(\'SELLER\')                               |
|                                                                       |
| .requestMatchers(HttpMethod.PUT,                                      |
| \'/v1/properties/\*\*\').hasRole(\'SELLER\')                          |
|                                                                       |
| .req                                                                  |
| uestMatchers(\'/v1/properties/\*\*/photos/\*\*\').hasRole(\'SELLER\') |
|                                                                       |
| // Agent-only endpoints                                               |
|                                                                       |
| .requestMatchers(\'/v1/agents/\*\*\').hasRole(\'AGENT\')              |
|                                                                       |
| .requestMatchers(\'/v1/visits/\*\*/status\').hasRole(\'AGENT\')       |
|                                                                       |
| .requestMatchers(HttpMethod.GET, \'/v1/leads\').hasRole(\'AGENT\')    |
|                                                                       |
| // Admin-only endpoints                                               |
|                                                                       |
| .requestMatchers(\'/v1/admin/\*\*\').hasRole(\'ADMIN\')               |
|                                                                       |
| .anyRequest().authenticated()                                         |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

## **Rate Limiting (Updated)**

  ------------------ ---------------- ----------------------------- ----------------
  **Action**         **Limit**        **Key Pattern**               **TTL**

  **OTP Send         3 per phone per  otp_send:{phone}              
  (seller/agent)**   hour                                           

  **OTP Send (buyer  3 per phone per  buyer_otp_send:{phone}        
  soft)**            hour                                           

  **OTP Verify       3 per session    otp:{phone} attempts          
  Attempts**                                                        

  **WhatsApp Click** 5 per session    wa_rl:{session}:{prop_id}     
                     per property/hr                                

  **Call Click**     5 per session    call_rl:{session}:{prop_id}   
                     per property/hr                                

  **Visit Request**  3 per session    visit_rl:{session}            
                     per day                                        

  **Notify Me        1 per phone per  notify_me:{phone}             
  Submit**           day                                            

  **Listing Create** 3 active         listings_count:{seller_id}    
                     listings per                                   
                     seller                                         
  ------------------ ---------------- ----------------------------- ----------------

## **Anti-Bypass Enforcement**

-   Seller phone number is NEVER returned in any API response

-   GET /properties and GET /properties/{id} return agent_id but NOT
    agent phone or seller phone

-   Only GET /whatsapp/link/{propertyId} returns agent WA number --- and
    only after logging the lead

-   Wati webhook endpoint validates Wati webhook secret header before
    processing

-   GPS validation on photo upload: if GPS is \> 500m from property
    address, photo is flagged (soft) for agent review, NOT auto-rejected

# **09 Caching Strategy**

  ------------- ----------- -------------------------- --------- --------------------
  **Data**      **Cache**   **Key Pattern**            **TTL**   **Invalidation**

  **Featured    Redis       listings:featured:{city}             
  listings**                                                     

  **Property    Redis       property:{id}                        
  detail**                                                       

  **City list** Redis       cities:active                        

  **Agent for   Redis       agent:{property_id}                  
  property**                                                     

  **Saved       Redis       saved:{buyer_id}                     
  listings**                                                     

  **Listing     Vercel Edge ISR revalidate: 300s                 
  pages                                                          
  (Next.js)**                                                    

  **Property    Supabase    Auto-CDN by URL                      
  images**      CDN                                              

  **Static      Vercel Edge SSG revalidate: 300s                 
  pages                                                          
  (home)**                                                       

  **OTP hash**  Redis       otp:{phone}                          

  **View count  Redis       view_count:{property_id}             
  buffer**                                                       
  ------------- ----------- -------------------------- --------- --------------------

# **10 Infrastructure & Deployment**

## **Environment Variables (Updated)**

+-----------------------------------------------------------------------+
| \# Spring Boot (Railway / Render env)                                 |
|                                                                       |
| DATAB                                                                 |
| ASE_URL=postgresql://postgres:{password}@db.supabase.co:5432/postgres |
|                                                                       |
| REDIS_URL=rediss://:{password}@upstash-redis-host:6380                |
|                                                                       |
| JWT_SECRET=your-256-bit-secret-key                                    |
|                                                                       |
| MSG91_AUTH_KEY=your-msg91-key                                         |
|                                                                       |
| MSG91_SENDER_ID=RDSOIL                                                |
|                                                                       |
| SUPABASE_URL=https://your-project.supabase.co                         |
|                                                                       |
| SUPABASE_SERVICE_KEY=your-service-role-key                            |
|                                                                       |
| GOOGLE_MAPS_API_KEY=your-google-maps-key                              |
|                                                                       |
| FIREBASE_SERVICE_ACCOUNT_JSON={\...json\...}                          |
|                                                                       |
| WATI_API_TOKEN=your-wati-token                                        |
|                                                                       |
| WATI_BASE_URL=https://live-server.wati.io                             |
|                                                                       |
| WATI_WEBHOOK_SECRET=your-wati-webhook-secret                          |
|                                                                       |
| \# Next.js (Vercel env)                                               |
|                                                                       |
| NEXT_PUBLIC_API_BASE_URL=https://api.ListMyNest.in/v1                  |
|                                                                       |
| NEXT_PUBLIC_GOOGLE_MAPS_KEY=your-google-maps-key                      |
|                                                                       |
| NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key                              |
|                                                                       |
| NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co             |
|                                                                       |
| NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key                           |
+-----------------------------------------------------------------------+

## **Database Migrations (Flyway --- Updated)**

+-----------------------------------------------------------------------+
| src/main/resources/db/migration/                                      |
|                                                                       |
| ├── V1\_\_create_agents_sellers.sql                                   |
|                                                                       |
| ├── V2\_\_create_properties.sql \-- adds last_activity_at, sold_at    |
| columns                                                               |
|                                                                       |
| ├── V3\_\_create_property_photos.sql \-- adds gps_flagged column      |
|                                                                       |
| ├── V4\_\_create_leads.sql \-- adds buyer_phone, wa_intent, buyer_id  |
|                                                                       |
| ├── V5\_\_create_visits.sql \-- buyer_phone NOT NULL,                 |
| post_visit_wa_sent                                                    |
|                                                                       |
| ├── V6\_\_add_indexes.sql                                             |
|                                                                       |
| ├── V7\_\_create_buyers.sql \-- new table                             |
|                                                                       |
| └── V8\_\_create_saved_listings.sql \-- new table                     |
|                                                                       |
| ├── V9\_\_create_admins.sql \-- new table                             |
|                                                                       |
| ├── V10\_\_create_admin_audit_log.sql \-- new table                   |
|                                                                       |
| └── V11\_\_add_impersonation_to_properties.sql \-- adds               |
| impersonated_by_admin_id column                                       |
+-----------------------------------------------------------------------+

# **11 Performance Targets & Testing**

## **API Performance Targets**

  --------------------------- ------------------------ ------------------------
  **Endpoint**                **P50 Target**           **P95 Target**

  **GET /properties           \< 80ms                  \< 200ms
  (cached)**                                           

  **GET /properties/{id}      \< 80ms                  \< 200ms
  (cached)**                                           

  **GET /properties (cold)**  \< 300ms                 \< 600ms

  **POST /leads**             \< 150ms                 \< 400ms

  **POST /visits**            \< 200ms                 \< 500ms

  **POST                      \< 100ms                 \< 250ms
  /leads/whatsapp-inbound**                            

  **POST /saved**             \< 150ms                 \< 350ms

  **GET /saved**              \< 100ms                 \< 250ms

  **POST /buyers/otp/verify** \< 200ms                 \< 400ms

  **POST /properties          \< 400ms                 \< 800ms
  (create)**                                           
  --------------------------- ------------------------ ------------------------

## **Testing Requirements**

  ---------------- ------------- -------------------------------------------
  **Test Type**    **Tool**      **Scope**

  **Unit Tests**   JUnit 5 +     80%+ on service layer. New:
                   Mockito       GpsValidationService,
                                 PropertyLifecycleScheduler,
                                 WatiWebhookHandler.

  **Integration    Spring Boot   All API endpoints including new: /saved,
  Tests**          Test          /buyers/otp, /notify-me,
                                 /leads/whatsapp-inbound

  **API Contract** Postman /     All endpoints. Wati webhook payload
                   Newman        simulation.

  **Frontend E2E** Playwright    5 critical flows: browse → wa click, browse
                                 → schedule visit, save (with OTP), notify
                                 me sheet, saved tab display

  **Load Test**    k6            1000 concurrent users on /properties
                                 endpoint

  **Lifecycle      Scheduled job 30-day warn, 45-day inactive, sold badge
  Test**           unit test     48h expiry

  **Lighthouse**   Chrome / CI   Performance \> 80 on every deploy
  ---------------- ------------- -------------------------------------------

# **12 Dependencies & Version Matrix**

## **Backend --- build.gradle (Updated)**

+-----------------------------------------------------------------------+
| plugins {                                                             |
|                                                                       |
| id \'org.springframework.boot\' version \'3.2.3\'                     |
|                                                                       |
| id \'io.spring.dependency-management\' version \'1.1.4\'              |
|                                                                       |
| id \'java\'                                                           |
|                                                                       |
| }                                                                     |
|                                                                       |
| java { sourceCompatibility = JavaVersion.VERSION_17 }                 |
|                                                                       |
| dependencies {                                                        |
|                                                                       |
| // Core Spring                                                        |
|                                                                       |
| implementation \'org.springframework.boot:spring-boot-starter-web\'   |
|                                                                       |
| implementation                                                        |
| \'org.springframework.boot:spring-boot-starter-data-jpa\'             |
|                                                                       |
| implementation                                                        |
| \'org.springframework.boot:spring-boot-starter-security\'             |
|                                                                       |
| implementation                                                        |
| \'org.springframework.boot:spring-boot-starter-validation\'           |
|                                                                       |
| implementation                                                        |
| \'org.springframework.boot:spring-boot-starter-actuator\'             |
|                                                                       |
| implementation                                                        |
| \'org.springframework.boot:spring-boot-starter-data-redis\'           |
|                                                                       |
| implementation                                                        |
| \'org.springframework.boot:spring-boot-starter-scheduling\'           |
|                                                                       |
| // Database                                                           |
|                                                                       |
| runtimeOnly \'org.postgresql:postgresql\'                             |
|                                                                       |
| implementation \'org.flywaydb:flyway-core\'                           |
|                                                                       |
| // JWT                                                                |
|                                                                       |
| implementation \'io.jsonwebtoken:jjwt-api:0.12.3\'                    |
|                                                                       |
| runtimeOnly \'io.jsonwebtoken:jjwt-impl:0.12.3\'                      |
|                                                                       |
| runtimeOnly \'io.jsonwebtoken:jjwt-jackson:0.12.3\'                   |
|                                                                       |
| // API Docs                                                           |
|                                                                       |
| implementation                                                        |
| \'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.3.0\'           |
|                                                                       |
| // Firebase Admin SDK (FCM)                                           |
|                                                                       |
| implementation \'com.google.firebase:firebase-admin:9.2.0\'           |
|                                                                       |
| // Utilities                                                          |
|                                                                       |
| compileOnly \'org.projectlombok:lombok\'                              |
|                                                                       |
| annotationProcessor \'org.projectlombok:lombok\'                      |
|                                                                       |
| testImplementation                                                    |
| \'org.springframework.boot:spring-boot-starter-test\'                 |
|                                                                       |
| testImplementation                                                    |
| \'org.springframework.security:spring-security-test\'                 |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

## **Frontend --- package.json (Updated)**

+-----------------------------------------------------------------------+
| {                                                                     |
|                                                                       |
| \"dependencies\": {                                                   |
|                                                                       |
| \"next\": \"14.2.3\",                                                 |
|                                                                       |
| \"react\": \"\^18.3.1\",                                              |
|                                                                       |
| \"react-dom\": \"\^18.3.1\",                                          |
|                                                                       |
| \"tailwindcss\": \"\^3.4.3\",                                         |
|                                                                       |
| \"@tanstack/react-query\": \"\^5.32.0\",                              |
|                                                                       |
| \"zustand\": \"\^4.5.2\",                                             |
|                                                                       |
| \"next-pwa\": \"\^5.6.0\",                                            |
|                                                                       |
| \"posthog-js\": \"\^1.121.0\",                                        |
|                                                                       |
| \"@supabase/supabase-js\": \"\^2.42.4\",                              |
|                                                                       |
| \"lucide-react\": \"\^0.383.0\",                                      |
|                                                                       |
| \"exifr\": \"\^7.1.3\" // GPS EXIF extraction from photos             |
|                                                                       |
| },                                                                    |
|                                                                       |
| \"devDependencies\": {                                                |
|                                                                       |
| \"typescript\": \"\^5.4.5\",                                          |
|                                                                       |
| \"@playwright/test\": \"\^1.44.0\",                                   |
|                                                                       |
| \"eslint\": \"\^8.57.0\",                                             |
|                                                                       |
| \"eslint-config-next\": \"14.2.3\"                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

# **13 Technical Constraints & Risk Register**

  --------------- ---------------- ------------ -------------------------------------
  **Risk**        **Likelihood**   **Impact**   **Mitigation**

  **Supabase free Medium           High         
  tier limits                                   
  hit**                                         

  **WhatsApp      Low              High         
  number gets                                   
  flagged**                                     

  **Wati webhook  Low              Medium       
  delivery                                      
  failure**                                     

  **Google Maps   Low              Medium       
  API cost                                      
  overrun**                                     

  **FCM push      Low              Medium       
  delivery                                      
  failure**                                     

  **Slow 3G       High             High         
  performance**                                 

  **Camera        Medium           Low          
  capture bypass                                
  on desktop**                                  

  **Sold          Low              Medium       
  lifecycle                                     
  missed**                                      

  **Buyer token   Low              High         
  theft**                                       

  **SQL injection Very Low         Critical     
  via JPA**                                     
  --------------- ---------------- ------------ -------------------------------------

# **14 Technical Glossary**

  -------------------------------- -------------------------------------------------
  **Term**                         **Definition**

  **JWT**                          JSON Web Token --- signed token for stateless
                                   authentication. Contains user_id and role claims.

  **Buyer Token**                  Lightweight JWT issued after buyer soft OTP
                                   verification. Scope: saved listings only. 24h
                                   expiry.

  **OTP**                          One Time Password --- 6-digit code sent via MSG91
                                   SMS. Expires in 5 minutes.

  **SSR**                          Server-Side Rendering --- Next.js renders HTML on
                                   the server per request. Used for SEO-critical
                                   pages.

  **SSG**                          Static Site Generation --- HTML pre-built at
                                   deploy time. Used for homepage. Fastest possible
                                   load.

  **ISR**                          Incremental Static Regeneration --- Next.js
                                   rebuilds static pages in the background every N
                                   seconds.

  **PWA**                          Progressive Web App --- web app with service
                                   worker, offline support, and Add to Home Screen
                                   capability.

  **FCM**                          Firebase Cloud Messaging --- push notification
                                   service. Used for agent lead/visit/intent alerts.

  **Session Hash**                 SHA-256 hash of user-agent + date + screen size.
                                   Identifies a session without storing PII.

  **Wati Webhook**                 Automated HTTP POST from Wati when a buyer sends
                                   a WhatsApp message to agent. Captures buyer
                                   phone.

  **WA Intent**                    Lead classification derived from buyer\'s reply
                                   to post-visit Wati template: HOT (1) / WARM (2) /
                                   COLD (3).

  **GPS Soft Flag**                Photo flagged for agent review when GPS EXIF is
                                   missing or \> 500m from listed property. Not
                                   auto-rejected.

  **Notify Me Moment**             4th lead capture trigger --- bottom sheet shown
                                   after 3+ views with no contact action in session.

  **Sold Badge (48h)**             Brief Sold indicator shown on listing for 48
                                   hours after seller marks as sold, then archived.

  **PropertyLifecycleScheduler**   Scheduled Spring Boot job running daily at 8AM:
                                   sends 30-day inactivity warn, auto-inactives at
                                   45 days.

  **DPDP Act**                     Digital Personal Data Protection Act --- India\'s
                                   data privacy law. No PII collected for anonymous
                                   buyers.

  **CORS**                         Cross-Origin Resource Sharing --- HTTP header
                                   mechanism that allows the Next.js frontend to
                                   call the Spring Boot API.
  -------------------------------- -------------------------------------------------

+-----------------------------------------------------------------------+
| Document End                                                          |
|                                                                       |
| This TRD covers the full technical specification for ListMyNest Phase  |
| 1 MVP.                                                                |
|                                                                       |
| Refer to the PRD for product requirements and the Tech Stack document |
| for vendor/hosting choices.                                           |
|                                                                       |
| Changes from v1.0: Added buyers + saved_listings tables ·             |
| visits.buyer_phone made NOT NULL · leads.buyer_phone + wa_intent      |
| added · Wati webhook handler (WhatsAppService) · Post-visit Wati      |
| template trigger in VisitService · PropertyLifecycleScheduler         |
| (30d/45d/sold) · BuyerAuthService (soft OTP) ·                        |
| SavedListingController + service · NotifyMe trigger logic in frontend |
| · camera-only upload (capture=environment) with GPS soft-flag         |
| validation · GPS hard-rejection removed                               |
+-----------------------------------------------------------------------+
