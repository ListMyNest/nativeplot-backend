-- ListMyNest — V8: Saved Listings (buyer <-> property)

CREATE TABLE saved_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(buyer_id, property_id)
);

CREATE INDEX idx_saved_buyer ON saved_listings(buyer_id);
CREATE INDEX idx_saved_property ON saved_listings(property_id);
