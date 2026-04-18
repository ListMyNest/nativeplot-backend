-- ListMyNest — V15: Add password auth for agents/sellers

ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE sellers
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

