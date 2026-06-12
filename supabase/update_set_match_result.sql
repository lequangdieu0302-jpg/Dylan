-- =========================================================================
-- SQL PATCH: Allow 'none' prediction and auto-penalize missed votes (10k)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- =========================================================================

-- 1. Cập nhật Check Constraint để cho phép giá trị 'none' (không dự đoán)
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_prediction_check;
ALTER TABLE predictions ADD CONSTRAINT predictions_prediction_check CHECK (prediction IN ('home', 'draw', 'away', 'none'));

-- 2. Cập nhật hàm set_match_result để tự động phạt và ghi lịch sử cho user không vote
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
  -- Cập nhật thông tin trận đấu
  UPDATE matches
  SET home_score = p_home_score,
      away_score = p_away_score,
      result     = p_result,
      status     = 'finished'
  WHERE id = p_match_id;

  -- Chấm điểm các dự đoán hiện có
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
        v_money_change := -10000;  -- Thắng dùng sao: giảm trừ 10k quỹ
      ELSE
        v_money_change := 0;       -- Thắng thường: không đóng quỹ
      END IF;
    ELSE
      IF pred.used_hope_star THEN
        v_money_change := 20000;   -- Thua dùng sao: đóng quỹ 20k
      ELSE
        v_money_change := 10000;   -- Thua thường: đóng quỹ 10k
      END IF;
    END IF;

    -- Cập nhật kết quả dự đoán
    UPDATE predictions
    SET is_correct   = v_is_correct,
        money_change = v_money_change
    WHERE id = pred.id;

    -- Cập nhật chỉ số của user đã dự đoán
    UPDATE profiles
    SET
      total_correct = total_correct + CASE WHEN v_is_correct THEN 1 ELSE 0 END,
      total_wrong   = total_wrong   + CASE WHEN v_is_correct THEN 0 ELSE 1 END,
      total_money   = total_money   + v_money_change,
      hope_stars    = GREATEST(0, hope_stars - CASE WHEN pred.used_hope_star THEN 1 ELSE 0 END)
    WHERE id = pred.user_id;
  END LOOP;

  -- Phạt các user lười KHÔNG dự đoán trận này (đóng 10k quỹ, cộng 1 trận sai)
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

    -- Cập nhật profile của user lười
    UPDATE profiles
    SET
      total_wrong = total_wrong + 1,
      total_money = total_money + 10000
    WHERE id = user_prof.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
