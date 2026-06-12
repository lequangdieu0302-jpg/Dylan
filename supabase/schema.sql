-- ============================================================
-- World Cup Prediction App - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Companies ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  logo_url   TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Profiles (extends auth.users) ──────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  username      TEXT NOT NULL,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'banned')),
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_wrong   INTEGER NOT NULL DEFAULT 0,
  total_money   INTEGER NOT NULL DEFAULT 0,   -- VNĐ, positive = owe money
  hope_stars    INTEGER NOT NULL DEFAULT 5,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Teams ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  logo_url     TEXT,
  group_code   TEXT,
  country_code TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Matches ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  match_time   TIMESTAMPTZ NOT NULL,
  home_score   INTEGER,
  away_score   INTEGER,
  result       TEXT CHECK (result IN ('home', 'draw', 'away')),
  status       TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished', 'cancelled')),
  round        TEXT,
  venue        TEXT,
  external_id  TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Predictions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id       UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  prediction     TEXT NOT NULL CHECK (prediction IN ('home', 'draw', 'away', 'none')),
  used_hope_star BOOLEAN NOT NULL DEFAULT FALSE,
  is_correct     BOOLEAN,
  money_change   INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE companies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: get current user company_id
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── Companies policies ─────────────────────────────────────
CREATE POLICY "companies_public_read" ON companies
  FOR SELECT USING (is_active = TRUE OR get_my_role() = 'admin');

CREATE POLICY "companies_admin_all" ON companies
  FOR ALL USING (get_my_role() = 'admin');

-- ── Profiles policies ──────────────────────────────────────
-- Users can read profiles in same company
CREATE POLICY "profiles_same_company_read" ON profiles
  FOR SELECT USING (
    company_id = get_my_company_id()
    OR id = auth.uid()
    OR get_my_role() = 'admin'
  );

-- Users can update own profile
CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Admin can update any profile
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (get_my_role() = 'admin');

-- Allow profile insert (called by trigger)
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid() OR get_my_role() = 'admin');

-- ── Teams policies ─────────────────────────────────────────
CREATE POLICY "teams_public_read" ON teams FOR SELECT USING (TRUE);
CREATE POLICY "teams_admin_all" ON teams FOR ALL USING (get_my_role() = 'admin');

-- ── Matches policies ───────────────────────────────────────
CREATE POLICY "matches_public_read" ON matches FOR SELECT USING (TRUE);
CREATE POLICY "matches_admin_all" ON matches FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "matches_public_update" ON matches FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- ── Predictions policies ───────────────────────────────────
-- Users can only read their own predictions
CREATE POLICY "predictions_own_read" ON predictions
  FOR SELECT USING (user_id = auth.uid() OR get_my_role() = 'admin');

-- Users can insert/update own prediction before match starts
CREATE POLICY "predictions_own_insert" ON predictions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (SELECT match_time FROM matches WHERE id = match_id) > NOW()
  );

CREATE POLICY "predictions_own_update" ON predictions
  FOR UPDATE USING (
    user_id = auth.uid()
    AND (SELECT match_time FROM matches WHERE id = match_id) > NOW()
  );

-- Admin can do anything with predictions
CREATE POLICY "predictions_admin_all" ON predictions
  FOR ALL USING (get_my_role() = 'admin');

-- ============================================================
-- TRIGGER: auto-create profile on sign up
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_username   TEXT;
BEGIN
  -- Lấy username từ metadata, fallback là phần trước @ của email
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1)
  );

  -- Lấy company_id, an toàn với giá trị rỗng hoặc không hợp lệ
  BEGIN
    v_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  EXCEPTION WHEN others THEN
    v_company_id := NULL;
  END;

  INSERT INTO public.profiles (id, username, company_id, role)
  VALUES (
    NEW.id,
    v_username,
    v_company_id,
    CASE WHEN NEW.email = 'lequangdieu0302@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO NOTHING;  -- tránh lỗi nếu profile đã tồn tại

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- RPC: set_match_result — scores all predictions for a match
-- ============================================================
CREATE OR REPLACE FUNCTION set_match_result(
  p_match_id  UUID,
  p_home_score INTEGER,
  p_away_score INTEGER,
  p_result    TEXT
)
RETURNS VOID AS $$
DECLARE
  pred RECORD;
  v_is_correct BOOLEAN;
  v_money_change INTEGER;
  user_prof RECORD;
BEGIN
  -- Update match record
  UPDATE matches
  SET home_score = p_home_score,
      away_score = p_away_score,
      result     = p_result,
      status     = 'finished'
  WHERE id = p_match_id;

  -- Score each prediction
  FOR pred IN
    SELECT p.*, pr.hope_stars
    FROM predictions p
    JOIN profiles pr ON pr.id = p.user_id
    WHERE p.match_id = p_match_id
      AND p.is_correct IS NULL
  LOOP
    v_is_correct := (pred.prediction = p_result);

    IF v_is_correct THEN
      IF pred.used_hope_star THEN
        v_money_change := -10000;  -- reward: reduce fund by 10k
      ELSE
        v_money_change := 0;
      END IF;
    ELSE
      IF pred.used_hope_star THEN
        v_money_change := 20000;   -- penalty: 20k
      ELSE
        v_money_change := 10000;   -- penalty: 10k
      END IF;
    END IF;

    -- Update prediction
    UPDATE predictions
    SET is_correct   = v_is_correct,
        money_change = v_money_change
    WHERE id = pred.id;

    -- Update profile stats
    UPDATE profiles
    SET
      total_correct = total_correct + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
      total_wrong   = total_wrong   + CASE WHEN v_is_correct THEN 0 ELSE 1 END,
      total_money   = total_money   + v_money_change,
      hope_stars    = GREATEST(0, hope_stars - CASE WHEN pred.used_hope_star THEN 1 ELSE 0 END)
    WHERE id = pred.user_id;
  END LOOP;

  -- Phạt các user KHÔNG dự đoán trận này (tính là sai và đóng 10k)
  FOR user_prof IN
    SELECT id
    FROM profiles
    WHERE role = 'user'
      AND id NOT IN (
        SELECT user_id 
        FROM predictions 
        WHERE match_id = p_match_id
      )
  LOOP
    -- Thêm dòng dự đoán ảo 'none' để lưu lịch sử
    INSERT INTO predictions (user_id, match_id, prediction, used_hope_star, is_correct, money_change)
    VALUES (user_prof.id, p_match_id, 'none', FALSE, FALSE, 10000)
    ON CONFLICT (user_id, match_id) DO NOTHING;

    -- Cập nhật profile của user lười vote
    UPDATE profiles
    SET
      total_wrong = total_wrong + 1,
      total_money = total_money + 10000
    WHERE id = user_prof.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STORAGE BUCKETS (run separately or in Supabase dashboard)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('team-logos', 'team-logos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for public read
-- CREATE POLICY "public_read_logos" ON storage.objects FOR SELECT USING (bucket_id IN ('company-logos', 'team-logos', 'avatars'));
-- CREATE POLICY "auth_upload_logos" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
