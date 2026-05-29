-- ============================================================
-- STEP 1: Xem user nao da dang ky nhung chua co profile
-- ============================================================
SELECT
  u.id,
  u.email,
  u.created_at,
  u.raw_user_meta_data->>'username' as meta_username,
  u.raw_user_meta_data->>'company_id' as meta_company_id,
  p.id as profile_id
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC;

-- ============================================================
-- STEP 2: Tao profile cho cac user chua co (chay sau STEP 1)
-- ============================================================
INSERT INTO profiles (id, username, company_id, role)
SELECT
  u.id,
  COALESCE(NULLIF(TRIM(u.raw_user_meta_data->>'username'), ''), split_part(u.email, '@', 1)),
  CASE
    WHEN u.raw_user_meta_data->>'company_id' IS NOT NULL
     AND u.raw_user_meta_data->>'company_id' != ''
    THEN (u.raw_user_meta_data->>'company_id')::UUID
    ELSE (SELECT id FROM companies LIMIT 1)
  END,
  'user'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 3: Them fake data cho profile hien tai de test leaderboard
-- (Thay email@cua.ban bang email thuc cua ban)
-- ============================================================
UPDATE profiles SET
  total_correct = 5,
  total_wrong   = 3,
  total_money   = 30000
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email NOT LIKE 'testuser%@fake.com'
  LIMIT 5
);

-- ============================================================
-- STEP 4: Kiem tra ket qua
-- ============================================================
SELECT
  p.username,
  c.name as company,
  p.total_correct,
  p.total_wrong,
  p.total_money,
  p.role
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
ORDER BY p.total_money ASC;
