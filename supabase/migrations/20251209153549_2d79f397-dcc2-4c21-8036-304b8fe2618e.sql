-- Insert default unilevel percentage settings for each level
INSERT INTO treasure_admin_settings (setting_key, setting_value, description)
VALUES 
  ('unilevel_level_1_percent', '4', 'Unilevel commission percentage for Level 1 (direct referral)'),
  ('unilevel_level_2_percent', '3', 'Unilevel commission percentage for Level 2'),
  ('unilevel_level_3_percent', '2', 'Unilevel commission percentage for Level 3'),
  ('unilevel_level_4_percent', '1.5', 'Unilevel commission percentage for Level 4'),
  ('unilevel_level_5_percent', '1', 'Unilevel commission percentage for Level 5'),
  ('unilevel_level_6_percent', '0.75', 'Unilevel commission percentage for Level 6'),
  ('unilevel_level_7_percent', '0.5', 'Unilevel commission percentage for Level 7')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;