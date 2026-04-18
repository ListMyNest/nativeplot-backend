-- V16: Idempotent demo data for fresh Supabase / team onboarding.
-- Admin: only if admins table is empty (admin@listmynest.in / Admin@123).
-- Agent / seller: ON CONFLICT (phone) DO NOTHING (keeps admin-created UUIDs).
-- Properties: ON CONFLICT (id) DO NOTHING; agent_id/seller_id resolved by phone.

INSERT INTO admins (id, name, email, password_hash, phone)
SELECT gen_random_uuid(),
       'System Admin',
       'admin@listmynest.in',
       '$2a$10$GwDXfLeFzrxgccveNKtuuOM2DlISvGWTVa58KfUCK2ujVdFxkdosC',
       NULL
WHERE NOT EXISTS (SELECT 1 FROM admins LIMIT 1);

INSERT INTO agents (id, name, phone, whatsapp_number, assigned_cities, active, password_hash)
VALUES (
           'a0000001-0001-4001-8001-000000000001'::uuid,
           'Suresh Patil',
           '+919876543210',
           '+919876543210',
           ARRAY ['Bidar', 'Humnabad', 'Basavakalyan']::text[],
           TRUE,
           '$2a$10$Yv2Sam6YCqZOZpgfOyi6/uAhd8cAcA2Ksq5E9oAanB7uxxsj/k2ui'
       )
ON CONFLICT (phone) DO NOTHING;

INSERT INTO sellers (id, name, phone, password_hash)
VALUES (
           'b0000001-0001-4001-8001-000000000001'::uuid,
           'Ramesh Kulkarni',
           '+917760123456',
           '$2a$10$duhm7Lro7AIwmxqXJSJJMOvlwmxqYi79dMdY81vM3MPVhAztG29X2'
       )
ON CONFLICT (phone) DO NOTHING;

INSERT INTO properties (id, title, description, type, city, locality, area_sqft, price_min, price_max, configuration,
                        bathrooms, possession, status, verified, agent_id, seller_id, view_count, last_activity_at)
SELECT v.id,
       v.title,
       v.description,
       v.type::varchar,
       v.city,
       v.locality,
       v.area_sqft,
       v.price_min,
       v.price_max,
       v.configuration::varchar,
       v.bathrooms,
       v.possession::varchar,
       v.status::varchar,
       v.verified,
       a.id,
       s.id,
       v.view_count,
       NOW()
FROM (VALUES ('c0000001-0001-4001-8001-000000000001'::uuid,
              'Spacious 2 BHK near Gandhi Chowk, Bidar'::varchar(200),
              'East-facing flat with good ventilation. Close to schools and bus stand.'::text,
              'RESIDENTIAL'::varchar(30),
              'Bidar'::varchar(100),
              'Gandhi Chowk'::varchar(200),
              1150.00::numeric,
              4200000.00::numeric,
              4800000.00::numeric,
              '_2BHK'::varchar(20),
              2::int,
              'READY'::varchar(30),
              'ACTIVE'::varchar(30),
              TRUE::boolean,
              12::int),
             ('c0000001-0001-4001-8001-000000000002'::uuid,
              'Corner plot for sale — Humnabad Road'::varchar(200),
              'Clear title, 40 ft road frontage. Ideal for residential build.'::text,
              'PLOT'::varchar(30),
              'Bidar'::varchar(100),
              'Humnabad Road'::varchar(200),
              2400.00::numeric,
              18500000.00::numeric,
              22000000.00::numeric,
              'OPEN'::varchar(20),
              NULL::int,
              'BARE_SHELL'::varchar(30),
              'ACTIVE'::varchar(30),
              TRUE::boolean,
              8::int),
             ('c0000001-0001-4001-8001-000000000003'::uuid,
              '3 BHK duplex with terrace, Basavakalyan view'::varchar(200),
              'Premium finish, covered parking, solar-ready.'::text,
              'RESIDENTIAL'::varchar(30),
              'Bidar'::varchar(100),
              'Station Road'::varchar(200),
              1650.00::numeric,
              7200000.00::numeric,
              7800000.00::numeric,
              '_3BHK'::varchar(20),
              3::int,
              'READY'::varchar(30),
              'ACTIVE'::varchar(30),
              TRUE::boolean,
              20::int),
             ('c0000001-0001-4001-8001-000000000004'::uuid,
              'Commercial shop on main market street'::varchar(200),
              'High footfall location. Suitable for retail or clinic.'::text,
              'COMMERCIAL'::varchar(30),
              'Bidar'::varchar(100),
              'Main Market'::varchar(200),
              650.00::numeric,
              5500000.00::numeric,
              6200000.00::numeric,
              'OPEN'::varchar(20),
              2::int,
              'READY'::varchar(30),
              'ACTIVE'::varchar(30),
              TRUE::boolean,
              5::int),
             ('c0000001-0001-4001-8001-000000000005'::uuid,
              'Affordable 1 BHK starter home near ring road'::varchar(200),
              'Good for first-time buyers. Negotiable.'::text,
              'RESIDENTIAL'::varchar(30),
              'Bidar'::varchar(100),
              'Ring Road'::varchar(200),
              580.00::numeric,
              2600000.00::numeric,
              2900000.00::numeric,
              '_1BHK'::varchar(20),
              1::int,
              'UNDER_CONSTRUCTION'::varchar(30),
              'ACTIVE'::varchar(30),
              TRUE::boolean,
              3::int)) AS v(id, title, description, type, city, locality, area_sqft, price_min, price_max, configuration,
                          bathrooms, possession, status, verified, view_count)
         CROSS JOIN LATERAL (SELECT id FROM agents WHERE phone = '+919876543210' LIMIT 1) a
         CROSS JOIN LATERAL (SELECT id FROM sellers WHERE phone = '+917760123456' LIMIT 1) s
ON CONFLICT (id) DO NOTHING;
