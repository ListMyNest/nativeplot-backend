-- ListMyNest — V11: Track which admin created listing via impersonation

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS impersonated_by_admin_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_properties_impersonated_by_admin'
    ) THEN
        ALTER TABLE properties
            ADD CONSTRAINT fk_properties_impersonated_by_admin
            FOREIGN KEY (impersonated_by_admin_id) REFERENCES admins(id);
    END IF;
END
$$;
