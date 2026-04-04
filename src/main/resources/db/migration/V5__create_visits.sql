-- ListMyNest — V5: Visits table
-- buyer_phone NOT NULL — required at scheduling time
-- post_visit_wa_sent tracks Wati template delivery

CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id),
    agent_id UUID REFERENCES agents(id),
    buyer_phone VARCHAR(15) NOT NULL,
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL,
    status VARCHAR(30) DEFAULT 'SCHEDULED',
    post_visit_wa_sent BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_visits_status CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'VISITED', 'NOT_VISITED', 'RESCHEDULED', 'CANCELLED'))
);
