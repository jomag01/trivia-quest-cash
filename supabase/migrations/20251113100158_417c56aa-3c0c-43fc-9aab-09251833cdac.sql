-- Add symbols array field to treasure_hunt_levels table
ALTER TABLE treasure_hunt_levels 
ADD COLUMN symbols TEXT[] DEFAULT ARRAY[]::TEXT[];