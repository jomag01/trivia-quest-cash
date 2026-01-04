-- Allow newsletters to be marked as failed
ALTER TABLE public.newsletters
  DROP CONSTRAINT IF EXISTS newsletters_status_check;

ALTER TABLE public.newsletters
  ADD CONSTRAINT newsletters_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'draft'::text,
        'scheduled'::text,
        'sending'::text,
        'sent'::text,
        'failed'::text
      ]
    )
  );

-- Fix campaigns stuck in 'sending' when delivery attempts already failed
UPDATE public.newsletters n
SET status = 'failed',
    sent_at = COALESCE(n.sent_at, now())
WHERE n.status = 'sending'
  AND EXISTS (
    SELECT 1
    FROM public.newsletter_sends ns
    WHERE ns.newsletter_id = n.id
      AND ns.status = 'failed'
  );
