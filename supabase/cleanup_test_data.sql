-- Xoa predictions cua tran test
DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE external_id LIKE 'test_%');

-- Xoa tran test
DELETE FROM matches WHERE external_id LIKE 'test_%';

-- Xoa fake profiles
DELETE FROM profiles WHERE username LIKE 'TestUser_%';

-- Xoa fake auth users (neu co)
DELETE FROM auth.users WHERE email LIKE 'testuser%@fake.com';

-- Kiem tra lai
SELECT 'matches' as tbl, COUNT(*) as remaining FROM matches WHERE external_id LIKE 'test_%'
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles WHERE username LIKE 'TestUser_%'
UNION ALL
SELECT 'auth.users', COUNT(*) FROM auth.users WHERE email LIKE 'testuser%@fake.com';
