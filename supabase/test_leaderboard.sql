-- ============================================================
-- TEST LEADERBOARD - Fake profiles cung cong ty
-- Chay trong Supabase SQL Editor
-- ============================================================

-- Xoa fake profiles cu neu co
DELETE FROM profiles WHERE username LIKE 'TestUser_%';

-- Lay company_id dau tien co user thuc
DO $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE company_id IS NOT NULL
  LIMIT 1;

  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM companies LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Khong tim thay company nao. Hay chay seed.sql truoc.';
  END IF;

  -- Them 7 fake profiles vao cung cong ty
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES
    ('bbbb0001-0000-0000-0000-000000000001', 'testuser1@fake.com', 'fake', NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    ('bbbb0002-0000-0000-0000-000000000002', 'testuser2@fake.com', 'fake', NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    ('bbbb0003-0000-0000-0000-000000000003', 'testuser3@fake.com', 'fake', NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    ('bbbb0004-0000-0000-0000-000000000004', 'testuser4@fake.com', 'fake', NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    ('bbbb0005-0000-0000-0000-000000000005', 'testuser5@fake.com', 'fake', NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    ('bbbb0006-0000-0000-0000-000000000006', 'testuser6@fake.com', 'fake', NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
    ('bbbb0007-0000-0000-0000-000000000007', 'testuser7@fake.com', 'fake', NOW(), NOW(), NOW(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, username, company_id, role, total_correct, total_wrong, total_money, hope_stars)
  VALUES
    ('bbbb0001-0000-0000-0000-000000000001', 'TestUser_Minh',   v_company_id, 'user', 10, 2,  20000, 3),
    ('bbbb0002-0000-0000-0000-000000000002', 'TestUser_Lan',    v_company_id, 'user', 8,  4,  40000, 4),
    ('bbbb0003-0000-0000-0000-000000000003', 'TestUser_Hung',   v_company_id, 'user', 6,  6,  60000, 5),
    ('bbbb0004-0000-0000-0000-000000000004', 'TestUser_Trang',  v_company_id, 'user', 5,  7,  70000, 2),
    ('bbbb0005-0000-0000-0000-000000000005', 'TestUser_Duc',    v_company_id, 'user', 3,  9,  90000, 5),
    ('bbbb0006-0000-0000-0000-000000000006', 'TestUser_Thu',    v_company_id, 'user', 2,  10, 100000, 1),
    ('bbbb0007-0000-0000-0000-000000000007', 'TestUser_Quan',   v_company_id, 'user', 0,  12, 120000, 5)
  ON CONFLICT (id) DO UPDATE SET
    username      = EXCLUDED.username,
    company_id    = EXCLUDED.company_id,
    total_correct = EXCLUDED.total_correct,
    total_wrong   = EXCLUDED.total_wrong,
    total_money   = EXCLUDED.total_money,
    hope_stars    = EXCLUDED.hope_stars;

  RAISE NOTICE 'Da them 7 fake profiles vao company_id: %', v_company_id;
END $$;

-- Xem ket qua bang xep hang
SELECT
  ROW_NUMBER() OVER (ORDER BY p.total_money ASC) AS rank,
  p.username,
  c.name AS company,
  p.total_correct,
  p.total_wrong,
  p.total_money,
  p.hope_stars,
  CASE WHEN (p.total_correct + p.total_wrong) = 0 THEN 0
       ELSE ROUND(p.total_correct * 100.0 / (p.total_correct + p.total_wrong))
  END AS accuracy_pct
FROM profiles p
JOIN companies c ON c.id = p.company_id
WHERE p.role = 'user'
ORDER BY p.total_money ASC;
