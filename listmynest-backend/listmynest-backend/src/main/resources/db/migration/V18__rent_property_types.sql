-- ListMyNest — V18: Add rent property types
-- We extended PropertyType enum with RENT_HOME and RENT_COMMERCIAL.
-- The DB enforces allowed types via chk_properties_type, so we must update it.

ALTER TABLE properties
    DROP CONSTRAINT IF EXISTS chk_properties_type;

ALTER TABLE properties
    ADD CONSTRAINT chk_properties_type
        CHECK (type IN (
            'RESIDENTIAL',
            'PLOT',
            'COMMERCIAL',
            'AGRICULTURAL',
            'RENT_HOME',
            'RENT_COMMERCIAL'
        ));

