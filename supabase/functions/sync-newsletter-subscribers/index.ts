import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Syncing all users as newsletter subscribers...');

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw new Error('Failed to fetch profiles');
    }

    console.log(`Found ${profiles?.length || 0} profiles`);

    // Get existing subscribers
    const { data: existingSubscribers } = await supabase
      .from('newsletter_subscribers')
      .select('email');

    const existingEmails = new Set((existingSubscribers || []).map(s => s.email));

    // Filter out profiles that are already subscribers
    const newProfiles = (profiles || []).filter(p => p.email && !existingEmails.has(p.email));

    console.log(`${newProfiles.length} new subscribers to add`);

    if (newProfiles.length > 0) {
      const subscribersToInsert = newProfiles.map(profile => ({
        user_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        is_subscribed: true,
        source: 'app_sync'
      }));

      const { error: insertError } = await supabase
        .from('newsletter_subscribers')
        .insert(subscribersToInsert);

      if (insertError) {
        console.error('Error inserting subscribers:', insertError);
        throw new Error('Failed to insert subscribers');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: newProfiles.length,
        total: profiles?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in sync-newsletter-subscribers:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
