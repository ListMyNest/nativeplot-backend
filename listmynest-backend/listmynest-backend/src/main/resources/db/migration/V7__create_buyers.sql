-- ListMyNest — V7: Buyers table (OTP-verified phones)

CREATE TABLE buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) NOT NULL UNIQUE,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads
    ADD CONSTRAINT fk_leads_buyer
    FOREIGN KEY (buyer_id) REFERENCES buyers(id);
