CREATE TABLE public.live_selling_access (
  user_id uuid PRIMARY KEY,
  is_approved boolean NOT NULL DEFAULT false,
  approved_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_selling_access TO authenticated;
GRANT ALL ON public.live_selling_access TO service_role;
ALTER TABLE public.live_selling_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own live access" ON public.live_selling_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage live access" ON public.live_selling_access FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE OR REPLACE FUNCTION public.can_go_live(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.live_selling_access WHERE user_id = _user_id AND is_approved)
$$;