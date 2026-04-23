-- ListMyNest — V17: seller preferred agent mapping

ALTER TABLE sellers
    ADD COLUMN preferred_agent_id UUID NULL;

ALTER TABLE sellers
    ADD CONSTRAINT fk_sellers_preferred_agent
    FOREIGN KEY (preferred_agent_id)
    REFERENCES agents(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sellers_preferred_agent_id
    ON sellers(preferred_agent_id);

