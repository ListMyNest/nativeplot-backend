-- ListMyNest — V9: Admins table

CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(150) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
