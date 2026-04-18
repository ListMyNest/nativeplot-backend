-- ListMyNest — V2: Properties table
-- TODO: Add all columns per TRD.md schema — last_activity_at, sold_at required

CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(30) NOT NULL,
    city VARCHAR(100) NOT NULL,
    locality VARCHAR(200),
    area_sqft NUMERIC(10,2),
    price_min NUMERIC(15,2) NOT NULL,
    price_max NUMERIC(15,2) NOT NULL,
    configuration VARCHAR(20),
    bathrooms INT,
    possession VARCHAR(30),
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    status VARCHAR(30) NOT NULL DEFAULT 'NEW',
    verified BOOLEAN DEFAULT FALSE,
    agent_id UUID REFERENCES agents(id),
    seller_id UUID REFERENCES sellers(id),
    impersonated_by_admin_id UUID,
    view_count INT DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    sold_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT chk_properties_type CHECK (type IN ('RESIDENTIAL', 'PLOT', 'COMMERCIAL', 'AGRICULTURAL')),
    CONSTRAINT chk_properties_configuration CHECK (configuration IS NULL OR configuration IN ('_1BHK', '_2BHK', '_3BHK', 'OPEN')),
    CONSTRAINT chk_properties_possession CHECK (possession IS NULL OR possession IN ('READY', 'UNDER_CONSTRUCTION', 'BARE_SHELL')),
    CONSTRAINT chk_properties_status CHECK (status IN ('NEW', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'SOLD', 'INACTIVE'))
);
