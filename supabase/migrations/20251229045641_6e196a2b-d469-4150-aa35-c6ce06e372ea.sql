-- Create table to store hidden tabs per user (admin-controlled)
CREATE TABLE public.user_hidden_tabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hidden_tabs TEXT[] NOT NULL DEFAULT '{}',
  hidden_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_hidden_tabs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own hidden tabs
CREATE POLICY "Users can view their own hidden tabs"
ON public.user_hidden_tabs
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can manage all hidden tabs
CREATE POLICY "Admins can manage hidden tabs"
ON public.user_hidden_tabs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_user_hidden_tabs_updated_at
BEFORE UPDATE ON public.user_hidden_tabs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();