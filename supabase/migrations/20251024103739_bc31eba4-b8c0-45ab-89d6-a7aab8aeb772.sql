-- Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.game_categories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  difficulty INTEGER DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table to track answered questions per user
CREATE TABLE IF NOT EXISTS public.user_answered_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  was_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, question_id)
);

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answered_questions ENABLE ROW LEVEL SECURITY;

-- Questions policies - anyone can view active questions
CREATE POLICY "Anyone can view active questions"
ON public.questions
FOR SELECT
USING (is_active = true);

-- Admins can manage questions
CREATE POLICY "Admins can manage questions"
ON public.questions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- User answered questions policies
CREATE POLICY "Users can view their own answered questions"
ON public.user_answered_questions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own answered questions"
ON public.user_answered_questions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_user_answered_user_id ON public.user_answered_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answered_question_id ON public.user_answered_questions(question_id);

-- Trigger for updated_at
CREATE TRIGGER update_questions_updated_at
BEFORE UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();