-- ListMyNest — V1: agents + sellers tables (TRD §02)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL UNIQUE,
    whatsapp_number VARCHAR(15) NOT NULL,
    assigned_cities TEXT[],
    fcm_token TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100),
    phone VARCHAR(15) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
