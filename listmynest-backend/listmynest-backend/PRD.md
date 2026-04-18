**ListMyNest**

**Product Requirements Document**

*Phase 1 MVP · Web-First · Tier-3 Indian Real Estate Market*

  --------------------- -------------------------------------------------
  **Document Title**    ListMyNest --- Product Requirements Document (PRD)

  **Product**           ListMyNest --- Real Estate Discovery Platform

  **Phase**             Phase 1 MVP

  **Target Market**     Tier-3 Cities, Karnataka (Bidar, Humnabad,
                        Basavakalyan, Bhalki, Aurad)

  **Version**           v1.1

  **Document Status**   Draft --- For Review

  **Prepared By**       Product Team

  **Last Updated**      March 2026
  --------------------- -------------------------------------------------

  ----------- -----------------------------------------------------------
  **01**      **Executive Summary**

  ----------- -----------------------------------------------------------

ListMyNest is a mobile-first, web-based real estate discovery and
connection platform built for Tier-3 Indian markets --- starting with
Bidar, Karnataka. The platform connects property buyers directly with
verified listings and routes all enquiries through trained local agents.

Phase 1 MVP is a zero-friction, contact-first product. There is no buyer
KYC, no payment integration, and no login barrier for buyers browsing
listings. The platform's job in Phase 1 is discovery, connection, and
coordination.

  -----------------------------------------------------------------------
  ***Core Value Proposition: Buyers find verified local properties and
  connect with an agent in under 60 seconds --- via call, WhatsApp, or a
  scheduled site visit --- without creating an account or downloading an
  app.***

  -----------------------------------------------------------------------

## **Problem Statement**

-   Buyers rely on word-of-mouth or unverified classifieds with no photo
    proof

-   No reliable way to view or compare multiple properties in one place

-   Sellers have no digital channel to reach buyers beyond their
    immediate network

-   Agents operate informally with no lead management or visit
    coordination tools

-   High digital literacy barrier --- complex apps cause drop-off

## **Solution**

-   A clean, verified property listing platform accessible via web link
    (no install)

-   City-based browsing with simple filters for type, price, and area

-   Trust signals: verified badges, agent-confirmed photos,
    location-validated listings

-   One-tap contact actions: Call, WhatsApp (agent-routed), and Schedule
    Visit

-   A 4-moment contact capture strategy that requires zero friction from
    buyers

-   A seller dashboard to list properties and track enquiries

-   An agent dashboard to manage leads, visits, and status updates

  -------- ---------------------------------------------------------------
  **02**   **Product Goals & Success Metrics**

  -------- ---------------------------------------------------------------

## **Phase 1 Goals**

  --------------- ------------------------------ -------------------------
  **Goal**        **Description**                **Success Metric**

  Growth          Acquire buyers organically via 500+ unique property
                  WhatsApp link sharing          views in Month 1

  Listings        Onboard verified local         50+ active listings
                  property listings              within 60 days

  Connections     Drive buyer-agent contact      100+ call/WhatsApp clicks
                  actions                        per month

  Trust           Build credibility in a         80%+ listings with
                  low-trust market               Verified badge

  Visits          Enable site visit coordination 30+ site visits scheduled
                  through the platform           in Month 2

  Retention       Bring buyers back for new      25%+ return visit rate
                  listings                       
  --------------- ------------------------------ -------------------------

## **Anti-Goals (Phase 1)**

-   No online payments, booking, or token collection

-   No buyer KYC or identity verification

-   No in-app chat or messaging system

-   No loan or financing integration

-   No buyer-to-seller direct connection (all routed via agent)

-   No native iOS or Android app

  --------- -------------------------------------------------------------
  **03**    **Target Users & Personas**

  --------- -------------------------------------------------------------

**Persona 1: The Buyer --- Raju Patil, 34, Govt. employee in Bidar
looking for a 2 BHK within Rs. 20L**

-   Needs: Find options without multiple brokers, see photos before
    visiting, contact someone without pressure

-   Behaviours: Uses WhatsApp heavily, low digital literacy, trusts
    photos over descriptions, prefers calling

**Persona 2: The Seller --- Ramesh Kulkarni, 52, owns 2 plots in
Humnabad wanting to sell**

-   Needs: Reach serious buyers, control listing info, know when buyers
    have viewed or enquired

-   Pain points: Complex existing platforms, no visibility on who
    called, privacy concerns about phone number

**Persona 3: The Agent --- Suresh Patil, 28, local property agent
managing 15+ listings across Bidar**

-   Needs: All assigned leads in one place, visit schedule at a glance,
    quick status updates, WhatsApp routing

  -------- --------------------------------------------------------------
  **04**   **Product Scope & Core Rules**

  -------- --------------------------------------------------------------

## **Phase 1 Platform Rules (Non-Negotiable)**

  --------------- ------------------------ -------------------------------
  **Rule**        **Policy**               **Reason**

  Buyer KYC       NO --- zero identity     Remove all friction. Buyers
                  required for buyers      must browse and contact in
                                           under 60 seconds.

  Payments        NO --- platform handles  Trust and legal complexity. All
                  zero money               transactions happen offline.

  Direct Contact  NO --- seller number     All contact routes via assigned
                  never shown publicly     agent for tracking and quality
                                           control.

  WA Routing      Always to assigned       Platform controls lead quality
                  agent, not seller        and protects seller privacy.

  Login (Buyer)   Not required for         Friction reduction with smart
                  browsing. OTP required   engagement gate. Anonymous
                  for Notify Me and Save   browsing is default.
                  (after 3+ views).        

  Login (Seller)  OTP-based only           Simple phone-number login. No
                                           passwords.

  Login (Agent)   OTP-based only           Same simplicity principle.

  Login (Admin)   OTP or email+password    Super-user access. Can manage
                                           all users, listings, agents.
                                           Can create listings on behalf
                                           of sellers.
  --------------- ------------------------ -------------------------------

  ----------------- -----------------------------------------------------
  **05**            **User Flows**

  ----------------- -----------------------------------------------------

## **Flow 1: Buyer Journey**

  ---------- ---------------------- ------------------------------------------
  **Step**   **Action**             **System Response**

  1          Lands on Homepage via  Loads fast, shows city filter + featured
             WhatsApp link or       listings. No pop-ups, no login prompt.
             Google search          

  2          Selects city or        Filters listings. URL updates for
             browses featured       shareability.
             listings               

  3          Taps property type     Filters grid. Shows result count.
             chip                   

  4          Taps a property card   Opens Property Detail Page with carousel,
                                    specs, map pin, and activity stats.

  5a         Taps Call Now          Initiates tel: call to assigned agent.
                                    Action logged anonymously.

  5b         Taps WhatsApp          Opens WhatsApp. Wati captures buyer WA
                                    number via webhook automatically.

  5c         Taps Schedule Visit    Opens visit scheduler. Phone number is
                                    REQUIRED. Agent calls 1hr before to
                                    confirm.

  5d         Views 3+ properties    Bottom sheet appears once: \'New
             without contacting     properties in Bidar every week --- Get
                                    notified on WhatsApp\'. OTP required to
                                    opt in.

  6          Confirms visit         Visit record created. Agent notified via
                                    FCM. Post-visit Wati template
                                    auto-triggers after agent marks Visited.

  7          Exits                  No forced conversion. Session data
                                    captured anonymously.
  ---------- ---------------------- ------------------------------------------

## **Flow 2: Seller Journey**

  ---------- ---------------------- ------------------------------------------
  **Step**   **Action**             **System Response**

  1          Taps \'Add Property\'  Prompts for phone number + OTP. No
                                    password.

  2          Fills listing form     Simple form with dropdowns, minimal
                                    typing.

  3          Uploads photos (min 4) Photos stored in Supabase. Listing enters
             from device            Pending Review.

  4          Submits listing        Agent assigned by city/pincode. Agent
                                    notified to verify.

  5          Agent verifies         Listing goes Active. Verified badge
                                    granted.

  6          Seller views dashboard Sees listing status, view count, enquiry
                                    count, visit count.

  7          Seller manages listing Can edit, pause, or mark as Sold.

  8          30 days ---            System sends: \'Has your listing sold?
             auto-notification      \[Keep Active\] \[Mark as Sold\]\'

  9          45 days --- no         Listing auto-marked as Inactive. Seller
             response               can reactivate.
  ---------- ---------------------- ------------------------------------------

## **Flow 3: Agent Journey**

  ---------- ---------------------- ------------------------------------------
  **Step**   **Action**             **System Response**

  1          Receives push          Opens agent dashboard. Lead shown with
             notification           property details and source.

  2          Reviews lead           Sees buyer contact, property ID, visit
                                    date/time if applicable.

  3          Calls buyer or opens   One-tap action from lead card.
             WhatsApp               

  4          Confirms visit         Visit record updated.

  5          Marks visit as Visited Wati post-visit template auto-triggered to
                                    buyer for intent classification.

  6          Updates lead status    Lead moves to appropriate state. Seller
                                    dashboard updates.
  ---------- ---------------------- ------------------------------------------

**Flow 4: Admin Journey** covering: login → view all listings (any
status) → manage agents (assign cities, activate/deactivate) → manage
sellers (create/edit) → create listing on behalf of seller
(impersonation) → review GPS-flagged photos → resolve reported listings.

  --------- -------------------------------------------------------------
  **06**    **Functional Requirements**

  --------- -------------------------------------------------------------

## **FR-01: Homepage**

-   Display top navigation with ListMyNest logo and notification/menu
    icons

-   Hero section with city-based filter chips (horizontal scroll, sticky
    to search)

-   Search bar with placeholder: \'Search area, locality, property ID\'

-   Direct Enquiry Banner: \'Can\'t find what you need?\' with Call Us +
    WhatsApp Us buttons

-   Property type category chips: All, Residential, Plots, Commercial,
    Agricultural

-   Featured Listings grid: price range, title, location, area chips,
    verified badge, photo count

-   Bottom navigation: Home, Search, Saved, Account

## **FR-02: Property Listing Page**

-   Sticky filter bar: Location, Budget, Type, Size, More

-   Result count: \'X properties found in \[City\]\'

-   Grid/list toggle

-   Each card: image thumbnail, price range, title, location, specs
    chips, verified badge

-   Sold properties show a \'Sold\' badge and are greyed out for 7 days
    then hidden

-   Inactive properties are hidden from public listing

-   Load more / infinite scroll

## **FR-03: Property Detail Page**

-   Image carousel with dot indicators and photo count badge

-   Share button on carousel

-   Price range display (NOT exact price) with \'Negotiable\' note

-   Property ID displayed prominently for WhatsApp reference

-   Trust badges: Verified Listing, Listed X days ago, Property Type

-   Specs grid: area (sq ft), configuration (BHK), bathrooms, possession
    status

-   Map placeholder with \'View on Map\' --- shows area, not exact
    address

-   Activity stats: views, enquiries, visits this week

-   Sticky bottom CTA bar: \[Call Now\] \[WhatsApp\] \[Schedule Visit\]

## **FR-04: WhatsApp Contact Capture --- 4 Moments Strategy**

  -----------------------------------------------------------------------
  ***Strategy: Capture buyer phone numbers across 4 natural moments. No
  forms. No walls. Buyers share contact as a natural consequence of their
  own actions.***

  -----------------------------------------------------------------------

**Moment 1 --- WhatsApp Tap (Automatic, Zero Friction)**

When buyer taps WhatsApp on any listing, they open a chat with the
agent. The moment they send any message, Wati delivers their WhatsApp
number via webhook --- automatically stored against that property lead.

-   Buyer effort: Zero

-   Platform gets: Phone number, timestamp, property ID, city

-   Covers: \~40% of interested buyers with no UX change

**Moment 2 --- Schedule Visit (One Required Field)**

  -----------------------------------------------------------------------
  ***Form label: Your number --- Agent will call 1 hour before to confirm
  your visit***

  -----------------------------------------------------------------------

Phone number is REQUIRED on the visit form. Buyer sees it as
confirmation, not data capture. 100% of visit schedulers will complete
this.

-   Buyer effort: 10 seconds

-   Platform gets: Verified phone of highest-intent buyers

**Moment 3 --- Post-Visit WhatsApp (Wati Template)**

After agent marks visit as complete, a Wati template auto-fires to the
buyer:

  -----------------------------------------------------------------------
  ***Hi! Hope your visit to \[Property Name\] in Bidar went well Reply 1
  --- Interested Reply 2 --- Need more options Reply 3 --- Not for me***

  -----------------------------------------------------------------------

-   Buyer replies → confirmed active WA number

-   Intent signal captured: hot / warm / cold

-   Opens 24-hour WhatsApp conversation window

**Moment 4 --- Notify Me After 3+ Property Views (Soft Opt-in)**

  -----------------------------------------------------------------------
  ***New properties in Bidar every week Get notified on WhatsApp --- no
  spam, just matches \[Your WhatsApp number\] \[Notify Me\]***

  -----------------------------------------------------------------------

-   Shown once per session. Dismiss is prominent. No guilt.

-   OTP required to activate --- verifies number before saving

-   Platform gets: Phone of highest re-marketing value segment

## **FR-05: Schedule Visit**

-   Access via \'Schedule Visit\' CTA on property detail page

-   Mini property card at top of sheet (name, ID, price)

-   Horizontal date picker showing next 7 days

-   Time slot grid: 9 AM, 10 AM, 11 AM, 12 PM, 2 PM, 4 PM

-   Phone number field is REQUIRED. Label: \'Your number --- Agent will
    call 1 hour before to confirm\'

-   Primary CTA: Confirm Visit

-   Secondary option: Call to Schedule Instead (tel: link)

-   On confirm: visit record created, agent notified via FCM

## **FR-06: Saved Listings (Functional in Phase 1)**

-   Saved tab in bottom navigation is fully functional in Phase 1

-   Buyer must verify phone via OTP to save a listing (one-time per
    device)

-   Saved listings stored against verified phone number

-   Buyer can access saved listings from Saved tab

-   Saved listings display real-time status: Active, Sold, Inactive

-   Buyer notified if a saved listing changes status

## **FR-07: Seller Dashboard**

-   OTP login via phone number (MSG91)

-   Stats row: total listings, total enquiries, total visits

-   My Listings: thumbnail, name, price, location, ID, status tag

-   Per listing actions: Edit, View, Pause, Mark as Sold

-   Recent Enquiries feed: type (WA/Call/Visit), property, time, Reply +
    Call Back buttons

-   Add New Property button

-   Auto-notification at Day 30: \'Has this property sold? \[Keep
    Active\] \[Mark as Sold\]\'

-   Auto-inactive at Day 45 if no response. Seller can reactivate from
    dashboard.

## **FR-08: Add Property Form**

-   Fields: Property Title, Type, City, Locality/Area, Price Min/Max,
    Area sqft, BHK, Bathrooms, Possession, Description

-   Photo upload: minimum 4 photos required

-   Gallery uploads accepted. No GPS photo validation in Phase 1.

-   Submission creates listing in Pending Review status

-   Agent auto-assigned based on city/pincode

## **FR-09: Agent Dashboard**

-   OTP login via phone number

-   Active/Inactive status toggle

-   Stats: New Leads, Today\'s Visits, Total Visits Done, WA Leads

-   Today\'s Visit Schedule: buyer contact, property, date/time,
    location

-   Per visit: Visited / Not Visited / Reschedule action buttons

-   Incoming WA Leads: property, message preview, Open WA / Call / Book
    Visit actions

-   Marking visit as Visited auto-triggers Wati post-visit template to
    buyer

## **FR-10: Anonymous Tracking**

-   Track events WITHOUT user login: property_view, call_click,
    wa_click, visit_request, search_query, city_filter_tap,
    notify_me_shown, notify_me_submitted

-   Identifier: session_hash derived from IP + user-agent + timestamp
    (no PII stored)

-   All events stored with: property_id, event_type, city, session_hash,
    timestamp

-   PostHog dashboard for analytics

**FR-11: Admin Panel**

-   Listing management: view all statuses including PENDING_REVIEW,
    > force-activate or reject, resolve 3+ report flags

-   Agent management: create agents, assign cities, toggle
    > active/inactive, view missed lead count

-   Seller management: create seller record, view listings per seller,
    > impersonate seller for listing creation

-   Buyer management: view verified buyers, see saved listings and
    > Notify Me subscriptions

-   Audit log: every admin action logged with admin_id, action,
    > timestamp

  -------- --------------------------------------------------------------
  **07**   **Non-Functional Requirements**

  -------- --------------------------------------------------------------

  ------------------ -------------------------- -------------------------
  **Category**       **Requirement**            **Target**

  Performance        First Contentful Paint     \< 2 seconds on 4G, \< 4
                     (FCP)                      seconds on 3G

  Performance        Time to Interactive (TTI)  \< 4 seconds on mid-range
                                                Android device

  Performance        Listing page load          \< 1.5 seconds with
                                                cached city data

  Availability       Platform uptime            99.5%+ (Vercel + Supabase
                                                SLA)

  Scalability        Concurrent users           1,000 concurrent without
                                                degradation (Phase 1)

  Images             Max photo size             200KB per photo
                                                (compressed on upload)

  PWA                Add to Home Screen         Supported on Chrome
                                                Android (primary browser)

  PWA                Offline fallback           Cached listings viewable
                                                without internet

  Security           Seller/Agent auth          OTP-based, 5-min expiry,
                                                Redis-stored hash

  Security           Rate limiting              Max 10 contact actions
                                                per session per hour

  Privacy            Buyer data                 No PII collected. Session
                                                hash only. DPDP Act
                                                compliant.

  Accessibility      Font sizes                 Minimum 14px body, 18px+
                                                for CTAs

  Accessibility      Touch targets              Minimum 48x48px for all
                                                buttons

  Language           UI language                English (Phase 1).
                                                Kannada support in Phase
                                                2.
  ------------------ -------------------------- -------------------------

  -------- ---------------------------------------------------------------
  **08**   **Listing Lifecycle & System States**

  -------- ---------------------------------------------------------------

  --------------- --------------- ---------------------- -----------------
  **Status**      **Who Sets It** **Trigger**            **Buyer
                                                         Visibility**

  New             System          Seller submits listing Not visible
                                  form                   

  Pending Review  System          Listing awaits agent   Not visible
                                  verification           

  Active          Agent           Agent verifies listing Visible with
                                                         Verified badge

  Enquiry         System          Any contact action     No change to
  Received                        logged                 buyer view

  Visit Scheduled System          Visit confirmed        No change to
                                                         buyer view

  Visit Completed Agent           Agent taps \'Visited\' No change to
                                  on dashboard           buyer view

  Paused          Seller          Seller pauses from     Hidden from
                                  dashboard              listings

  Sold            Seller or       Seller marks as Sold   Sold badge shown
                  System                                 7 days, then
                                                         hidden

  Inactive        System          45 days without seller Hidden. Seller
                                  response               can reactivate.

  Update          Agent/admin     currently only agents  With admin panel,
  \"Active\" row                  can set this.          admin can also
                                                         force-activate
                                                         (e.g. if agent is
                                                         unresponsive).
  --------------- --------------- ---------------------- -----------------

## **Sold / Inactive Auto-Management Rules**

-   Day 30: Auto-notification to seller: \'Your listing \[Property
    Name\] is still active. Has it been sold? \[Keep Active\] \[Mark as
    Sold\]\'

-   Day 45: Listing auto-set to Inactive if no seller response. Seller
    can reactivate from dashboard at any time.

-   When marked Sold: \'Sold\' badge displayed on listing for 7 days for
    recent visitors, then listing hidden from public search.

  -------- ---------------------------------------------------------------
  **09**   **Trust, Safety & Anti-Abuse Design**

  -------- ---------------------------------------------------------------

## **Trust Without KYC**

  ------------------ -------------------------- -------------------------
  **Mechanism**      **How It Works**           **User Benefit**

  Tiered             New → Unverified → Agent   Buyers can instantly
  Verification       Verified → Document        gauge listing quality at
  Badges             Verified. Each tier        a glance.
                     unlocks a trust badge.     

  Agent Physical     Agent must call/visit      Reduces fake or abandoned
  Verification       seller before listing goes properties reaching
                     Active. Minimum 4 photos   buyers.
                     required.                  

  Live Activity      Show \'47 views · 8        Social proof builds trust
  Stats              enquiries this week\' on   without identity
                     every detail page.         verification.

  Post-Visit         After visit completion,    Crowd-sourced trust
  Feedback (Wati)    Wati auto-template sent.   signal. Confirms buyer
                     Buyer reply = intent       engagement.
                     signal + confirmed WA      
                     number.                    

  Property ID System Every listing gets a       Reduces confusion,
                     unique ID (RS-BDR-00142).  enables tracking and
                     Referenced in all WhatsApp dispute resolution.
                     messages.                  
  ------------------ -------------------------- -------------------------

## **Fake Listing Prevention**

  ------------------ -------------------------- -------------------------
  **Method**         **Implementation**         **Blocks**

  Agent Pre-Approval All listings enter Pending Completely fake or
  Queue              Review. Agent must verify  non-existent properties
                     before going live.         

  Photo Validation   Minimum 4 photos required. Spam submissions with no
                     GPS tagging removed from   real photos
                     Phase 1. Agent physical    
                     verification is primary    
                     trust layer.               

  Duplicate          Flag listings with same    Same property listed
  Detection          address, phone number, or  multiple times
                     photo hash. Auto-hold for  
                     agent review.              

  1-Tap Report       Visible on every detail    Community policing of
  Button             page. 3+ reports           misleading listings
                     auto-suspend listing       
                     pending review.            

  Price Range Only   Platform never shows exact Bait-and-switch listings
                     price --- only min-max     and fake deals
                     range.                     
  ------------------ -------------------------- -------------------------

  -----------------------------------------------------------------------
  ***Core Anti-Bypass Rule: Sellers NEVER see buyer contact details.
  Buyers NEVER see seller phone numbers. All contact is routed through
  the assigned agent. This is enforced at the platform level, not just
  policy.***

  -----------------------------------------------------------------------

-   Call Now button dials the assigned agent\'s/admin number, not the
    seller\'s

-   WhatsApp link opens with agent\'s/admin WhatsApp number as the
    recipient

-   All leads are logged before the contact action completes

-   Session hash used to detect and rate-limit contact flooding

  --------- -------------------------------------------------------------
  **10**    **Agent Lead Routing Logic**

  --------- -------------------------------------------------------------

  ------------------ ----------------------------------------------------
  **Rule**           **Logic**

  Assignment         Each property is assigned to exactly one agent at
                     listing creation. Round-robin among active agents
                     for that city.

  Fallback           If assigned agent is marked inactive, system
                     auto-reassigns to next active agent in same city.

  Response SLA       Agent must respond to a lead within 2 hours. If not,
                     lead is flagged and team lead is notified.

  Re-assignment      If agent misses 3 consecutive leads, temporarily
                     removed from rotation pending review.

  WA Routing         WhatsApp click-to-chat link always uses agent\'s
                     WhatsApp number. Message includes Property ID.

  Visit Assignment   Agent who owns the listing handles all visits. If
                     unavailable, they must manually reassign.

  Lead Dedup         Multiple clicks on same property by same session
                     within 1 hour = single lead event.
  ------------------ ----------------------------------------------------

  -------- ---------------------------------------------------------------
  **11**   **UX Principles & Design Guidelines**

  -------- ---------------------------------------------------------------

  ---------------- ---------------------- -------------------------------
  **Principle**    **Guideline**          **Implementation**

  Zero Friction    Buyer must reach a     Home → Property Card → CTA. No
                   contact action in 3    intermediate screens.
                   taps or fewer          

  Large Touch      All primary CTAs       Call, WhatsApp, Schedule Visit
  Targets          minimum 48px height    buttons full-width.

  Minimal Typing   Prefer dropdowns,      Listing form uses dropdowns for
                   chips, and date        City, Type, Config, Possession.
                   pickers over free-text 

  No Login Walls   Buyers never see a     All browsing and contact
                   login prompt during    actions accessible without
                   browsing               account. OTP only for Notify
                                          Me + Save.

  Trust-First      Verified badges        Green checkmark badge on
  Visual           prominently displayed  thumbnail. Repeated on detail
                                          page header.

  Price            Show price range       Rs. 18L -- 22L in large red
  Transparency     clearly in INR Lakh    font as first data point.
                   notation               

  WhatsApp         Use official WhatsApp  No rebranding or recolouring.
  Familiarity      green and icon         

  Soft Engagement  Notify Me and Save     Bottom sheet + OTP flow. Clean
  Gate             require OTP, not full  and fast.
                   account                

  Activity as      Show views/enquiries   47 views this week is social
  Proof            count on all listings  proof without KYC.

  Low Literacy     Icons accompany all    Emoji icons on CTAs. Short
  Friendly         labels. No jargon.     labels.
  ---------------- ---------------------- -------------------------------

  -------- --------------------------------------------------------------
  **12**   **Open Questions & Decisions**

  -------- --------------------------------------------------------------

  -------- ---------------------- --------------------------------------------
  **\#**   **Question**           **Decision / Notes**

  Q1       How many agents to     Recommend 2--3 agents covering Bidar city
           onboard at launch?     first. Expand to other cities in Month 2.

  Q2       What is the listing    Phase 1: Free listings to drive supply.
           fee model for sellers? Phase 2: Paid featured listings or
                                  lead-based fee.

  Q3       WhatsApp Business API  For \< 50 leads/day, personal WA works.
           vs personal number for Switch to Wati Business API at scale. Wati
           launch?                webhook required for Moment 1 phone capture.

  Q4       Kannada language       Phase 2. Phase 1 in English to reduce dev
           support for UI?        time.

  Q5       What is the agent      Out of scope for PRD. Platform tracks enough
           commission/incentive   data to support any model.
           model?                 

  Q6       Wati template approval Apply for Moment 3 template early. Takes
           timeline?              24--72 hours. Required for post-visit intent
                                  capture.

  Q7       Saved listings when    Notify buyer on Saved tab. Show status
           property goes          badge. Keep in saved view 7 days after going
           inactive?              inactive.

  Q8                              Admin-assisted listing resolved via seller
                                  impersonation from admin panel. No separate
                                  listing form needed
  -------- ---------------------- --------------------------------------------

  -------- --------------------------------------------------------------
  **13**   **Phase 2 Roadmap (Post-MVP)**

  -------- --------------------------------------------------------------

  ------------------ -------------------------- -------------------------
  **Feature**        **Description**            **Dependency on Phase 1**

  Kannada Language   Full UI translation to     i18n setup in Next.js
  UI                 Kannada                    from Day 1

  Agent Native PWA   Lightweight Android app    Agent dashboard stable in
                     with offline visit status  Phase 1 first

  Seller Analytics   Traffic, enquiry funnel,   PostHog events from Phase
  Dashboard          conversion rate per        1
                     listing                    

  City Expansion     Gulbarga, Latur, Solapur.  City filter and routing
                     City-based agent           from Phase 1
                     onboarding.                

  Featured Listing   Paid tier to boost listing Listing rank logic from
  Product            visibility                 Phase 1

  Loan Partner       NBFC/HFC partner referral  No platform involvement
  Integration        link on property detail    in transaction
                     page                       

  Buyer Account &    Full buyer account with    OTP verification from
  History            saved history and search   Phase 1 Notify Me / Save
                     alerts                     

  Post-Visit Buyer   1-tap rating after visit.  Visits table and
  Feedback           Builds seller trust score. completion flow in Phase
                                                1
  ------------------ -------------------------- -------------------------

  -------- ---------------------------------------------------------------
  **14**   **Appendix --- Tech Stack & Glossary**

  -------- ---------------------------------------------------------------

## **Tech Stack Summary**

  ------------------ ----------------------------------------------------
  **Layer**          **Technology**

  Frontend           Next.js 14 (React) + Tailwind CSS + PWA (next-pwa)

  Backend            Java 17 + Spring Boot 3.x + Spring Data JPA

  Database           PostgreSQL hosted on Supabase

  Cache              Redis via Upstash (OTP, rate limiting, city cache)

  Storage            Supabase Storage (S3-backed, CDN-served)

  WhatsApp           Wati.io --- Indian vendor, INR billing, pre-approved
                     templates, webhook for phone capture

  OTP / SMS          MSG91 --- Rs. 0.10--0.16 per OTP, Jio/Airtel/BSNL
                     reliable

  Maps               Google Maps Platform (JS API + Places Autocomplete +
                     Geocoding)

  Analytics          PostHog --- anonymous event tracking, no login
                     required

  Push Alerts        Firebase Cloud Messaging (FCM) --- Java Admin SDK

  Hosting FE         Vercel --- auto-deploy, free CDN, SSR support

  Hosting BE         Railway or Render --- Spring Boot JAR, free tier

  DNS + CDN          Cloudflare --- free, adds speed for rural
                     connections
  ------------------ ----------------------------------------------------

## **Glossary**

  ------------------ ----------------------------------------------------
  **Term**           **Definition**

  CTA                Call to Action --- a button that prompts the user to
                     take an action

  PWA                Progressive Web App --- a web app that behaves like
                     a native mobile app

  OTP                One Time Password --- a 4--6 digit code sent via SMS
                     for verification

  FCM                Firebase Cloud Messaging --- Google\'s push
                     notification service

  SSR                Server-Side Rendering --- page HTML generated on
                     server for fast load and SEO

  Session Hash       Anonymous identifier derived from device data (no
                     personal info stored)

  Lead               Any recorded contact action by a buyer: call click,
                     WA click, or visit request

  Agent Routing      System that directs all buyer contact to the
                     assigned agent, never the seller

  Verified Badge     Trust marker shown on listings confirmed by a
                     ListMyNest agent

  Property ID        Unique alphanumeric code (e.g., RS-BDR-00142)
                     assigned to each listing

  Tier-3 City        Indian cities with population 50,000--500,000, low
                     app penetration, high WhatsApp usage

  Wati Webhook       HTTP callback from Wati.io that fires when buyer
                     sends any WA message, delivering buyer\'s WA number

  4-Moment Strategy  WA Tap + Schedule Visit + Post-Visit WA + Notify Me
                     --- zero-friction contact capture across the buyer
                     journey
  ------------------ ----------------------------------------------------

+-----------------------------------------------------------------------+
| **Document End --- ListMyNest PRD v1.1**                               |
|                                                                       |
| *This PRD covers the full scope of ListMyNest Phase 1 MVP. Refer to    |
| the TRD for technical specifications.*                                |
+-----------------------------------------------------------------------+
