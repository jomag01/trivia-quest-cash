-- Remove existing constraint first
ALTER TABLE public.questions 
DROP CONSTRAINT IF EXISTS questions_difficulty_check;

-- Update questions to have progressive difficulty levels (1-15)
DO $$
DECLARE
  cat_record RECORD;
  question_record RECORD;
  question_num INTEGER;
  new_difficulty INTEGER;
BEGIN
  -- Process each category separately to ensure progressive difficulty within categories
  FOR cat_record IN 
    SELECT DISTINCT category_id FROM public.questions
  LOOP
    question_num := 0;
    
    -- Get questions for this category, ordered by current difficulty
    FOR question_record IN 
      SELECT id
      FROM public.questions
      WHERE category_id = cat_record.category_id
      ORDER BY difficulty ASC, created_at ASC
    LOOP
      question_num := question_num + 1;
      
      -- Assign difficulty 1-15 based on position, cycling if more than 15 questions
      new_difficulty := ((question_num - 1) % 15) + 1;
      
      UPDATE public.questions
      SET difficulty = new_difficulty
      WHERE id = question_record.id;
    END LOOP;
  END LOOP;
END $$;

-- Add constraint back to ensure difficulty is between 1 and 15
ALTER TABLE public.questions
ADD CONSTRAINT questions_difficulty_check 
CHECK (difficulty >= 1 AND difficulty <= 15);