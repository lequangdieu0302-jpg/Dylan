DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE external_id LIKE 'test_%');
DELETE FROM matches WHERE external_id LIKE 'test_%';

INSERT INTO matches (id, home_team_id, away_team_id, match_time, status, round, venue, external_id) VALUES
  ('aaaa0001-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000009','22222222-0000-0000-0000-000000000037', NOW() + INTERVAL '30 minutes', 'upcoming', 'Test Matchday 1', 'San My Dinh',      'test_upcoming_soon'),
  ('aaaa0002-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000033','22222222-0000-0000-0000-000000000017', NOW() + INTERVAL '1 day',       'upcoming', 'Test Matchday 2', 'San Thong Nhat',   'test_upcoming_tomorrow'),
  ('aaaa0003-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000029','22222222-0000-0000-0000-000000000045', NOW() - INTERVAL '45 minutes',  'live',     'Test Matchday 3', 'San Hang Day',     'test_live'),
  ('aaaa0004-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000041','22222222-0000-0000-0000-000000000021', NOW() - INTERVAL '3 hours',     'finished', 'Test Matchday 4', 'San Can Tho',      'test_finished_home'),
  ('aaaa0005-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000025','22222222-0000-0000-0000-000000000001', NOW() - INTERVAL '6 hours',     'finished', 'Test Matchday 5', 'San Pleiku',       'test_finished_draw')
ON CONFLICT (external_id) DO UPDATE SET match_time = EXCLUDED.match_time, status = EXCLUDED.status;

SELECT set_match_result('aaaa0004-0000-0000-0000-000000000004', 2, 1, 'home');
SELECT set_match_result('aaaa0005-0000-0000-0000-000000000005', 1, 1, 'draw');

SELECT ht.name AS home, at.name AS away, m.status, m.home_score, m.away_score, m.result
FROM matches m
JOIN teams ht ON ht.id = m.home_team_id
JOIN teams at ON at.id = m.away_team_id
WHERE m.external_id LIKE 'test_%'
ORDER BY m.match_time;
