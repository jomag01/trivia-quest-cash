-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  reference_id UUID,
  order_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to notify admins of new signups
CREATE OR REPLACE FUNCTION notify_admins_new_signup()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  country_name TEXT;
BEGIN
  -- Get country name, default to 'Unknown' if null
  country_name := COALESCE(NEW.country, 'Unknown');
  
  -- Insert notification for all admin users
  FOR admin_record IN 
    SELECT DISTINCT ur.user_id 
    FROM public.user_roles ur 
    WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      reference_id
    ) VALUES (
      admin_record.user_id,
      'signup',
      'New User Registration',
      'New user ' || COALESCE(NEW.full_name, NEW.email) || ' signed up from ' || country_name,
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS notify_admins_on_signup ON public.profiles;
CREATE TRIGGER notify_admins_on_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_signup();

COMMENT ON FUNCTION notify_admins_new_signup() IS 'Notifies all admin users when a new user signs up, including their country';
COMMENT ON TABLE public.notifications IS 'Stores user notifications including signup alerts for admins';