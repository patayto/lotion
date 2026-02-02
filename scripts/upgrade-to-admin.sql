-- Upgrade specific users to ADMIN role
-- Run this in Supabase SQL Editor

-- Update lorna@lotion.so to ADMIN
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'lorna@lotion.so';

-- Update patrick@lotion.so to ADMIN
UPDATE "User"
SET role = 'ADMIN'
WHERE email = 'patrick@lotion.so';

-- Verify the updates
SELECT id, name, email, role
FROM "User"
WHERE email IN ('lorna@lotion.so', 'patrick@lotion.so');
