-- Allow anyone to insert reservations (for guest reservations)
CREATE POLICY "Anyone can create reservations"
ON public.restaurant_reservations
FOR INSERT
WITH CHECK (true);

-- Create activation_requests table for blocked users to request reactivation
CREATE TABLE IF NOT EXISTS public.activation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_response TEXT,
    responded_by UUID,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activation_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own activation requests"
ON public.activation_requests
FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own activation requests
CREATE POLICY "Users can create their own activation requests"
ON public.activation_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_activation_requests_user_id ON public.activation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_activation_requests_status ON public.activation_requests(status) WHERE status = 'pending';