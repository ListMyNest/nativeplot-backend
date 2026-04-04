-- ListMyNest — V4: Leads table
-- buyer_phone, wa_intent, buyer_id columns required

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id),
    agent_id UUID REFERENCES agents(id),
    buyer_id UUID, -- FK added in V7 after buyers table exists
    action_type VARCHAR(30) NOT NULL,
    buyer_phone VARCHAR(15),
    wa_intent VARCHAR(10),
    source VARCHAR(20),
    session_hash VARCHAR(64),
    city VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_leads_action_type CHECK (action_type IN ('CALL', 'WHATSAPP', 'VISIT_REQUEST', 'NOTIFY_ME', 'WHATSAPP_INBOUND', 'SAVE')),
    CONSTRAINT chk_leads_wa_intent CHECK (wa_intent IS NULL OR wa_intent IN ('HOT', 'WARM', 'COLD')),
    CONSTRAINT chk_leads_source CHECK (source IS NULL OR source IN ('WEB', 'PWA'))
);
