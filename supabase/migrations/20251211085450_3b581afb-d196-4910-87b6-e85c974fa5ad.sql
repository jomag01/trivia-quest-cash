-- Fix function search paths for security
CREATE OR REPLACE FUNCTION calculate_player_level(total_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(SQRT(total_xp / 100))::INTEGER + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION update_player_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.player_level := calculate_player_level(NEW.total_xp);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;