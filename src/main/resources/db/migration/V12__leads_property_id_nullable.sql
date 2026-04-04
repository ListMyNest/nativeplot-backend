-- NOTIFY_ME leads may not be tied to a single listing

ALTER TABLE leads ALTER COLUMN property_id DROP NOT NULL;
