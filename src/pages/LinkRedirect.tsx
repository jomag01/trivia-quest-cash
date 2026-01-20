import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function LinkRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirect = async () => {
      if (!code) {
        setError('Invalid link');
        return;
      }

      try {
        // Use the increment function to get URL and track click
        const { data, error } = await supabase.rpc('increment_link_clicks', {
          p_short_code: code
        });

        if (error || !data) {
          setError('Link not found');
          return;
        }

        // Redirect to the original URL
        window.location.href = data;
      } catch (err) {
        console.error('Redirect error:', err);
        setError('Failed to redirect');
      }
    };

    redirect();
  }, [code]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Link Error</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="text-primary hover:underline"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
