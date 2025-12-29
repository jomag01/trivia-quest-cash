-- Add new conversion settings to treasure_admin_settings
INSERT INTO public.treasure_admin_settings (setting_key, setting_value, description)
VALUES 
  -- Credit to Diamond conversion
  ('credit_to_diamond_rate', '10', 'Number of credits required to convert to 1 diamond'),
  -- Diamond to Credit conversion  
  ('diamond_to_credit_rate', '10', 'Number of credits received when converting 1 diamond'),
  -- AI Credit conversions
  ('ai_credit_to_cash_rate', '0.10', 'Cash value in peso per AI credit when converting to cash'),
  ('ai_credit_to_diamond_conversion_rate', '5', 'Number of AI credits required to convert to 1 diamond'),
  ('ai_credit_to_game_credit_rate', '1', 'Number of game credits received per AI credit'),
  -- Conversion fees/taxes
  ('conversion_fee_percent', '5', 'Percentage fee charged on conversions'),
  -- Enable/disable conversions
  ('enable_credit_to_diamond', 'true', 'Enable credit to diamond conversion'),
  ('enable_diamond_to_credit', 'true', 'Enable diamond to credit conversion'),
  ('enable_ai_credit_to_cash', 'true', 'Enable AI credit to cash conversion'),
  ('enable_ai_credit_to_diamond', 'true', 'Enable AI credit to diamond conversion'),
  ('enable_ai_credit_to_game_credit', 'true', 'Enable AI credit to game credit conversion')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;