import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newsletter_id } = await req.json();
    
    console.log('Sending newsletter:', newsletter_id);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get newsletter
    const { data: newsletter, error: newsletterError } = await supabase
      .from('newsletters')
      .select('*')
      .eq('id', newsletter_id)
      .single();

    if (newsletterError || !newsletter) {
      throw new Error('Newsletter not found');
    }

    // Get all active subscribers
    const { data: subscribers, error: subscribersError } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('is_subscribed', true);

    if (subscribersError) {
      throw new Error('Failed to fetch subscribers');
    }

    console.log(`Found ${subscribers?.length || 0} subscribers`);

    let sentCount = 0;
    let failedCount = 0;
    const batchSize = 50; // Send in batches to avoid rate limits

    // Process in batches
    for (let i = 0; i < (subscribers?.length || 0); i += batchSize) {
      const batch = subscribers!.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (subscriber) => {
        try {
          // Create personalized content
          const personalizedContent = newsletter.content
            .replace(/\{\{name\}\}/g, subscriber.full_name || 'Friend')
            .replace(/\{\{email\}\}/g, subscriber.email);

          const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .content { padding: 32px; line-height: 1.6; color: #18181b; }
    .content p { margin: 0 0 16px; }
    .cta-button { display: inline-block; background: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .footer { padding: 24px 32px; text-align: center; color: #71717a; font-size: 12px; background: #f4f4f5; }
    .footer a { color: #6366f1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐝 BeeHive</h1>
    </div>
    <div class="content">
      ${personalizedContent.split('\n').map((line: string) => `<p>${line}</p>`).join('')}
      <p style="text-align: center;">
        <a href="${supabaseUrl.replace('/v1', '')}" class="cta-button">Start Earning Now →</a>
      </p>
    </div>
    <div class="footer">
      <p>You're receiving this because you're part of BeeHive.</p>
      <p><a href="#">Unsubscribe</a> | <a href="#">View in browser</a></p>
    </div>
  </div>
</body>
</html>`;

          await resend.emails.send({
            from: "TriviaBees <support@triviabees.com>",
            to: [subscriber.email],
            subject: newsletter.subject,
            html: emailHtml,
          });

          // Record the send
          await supabase.from('newsletter_sends').insert({
            newsletter_id: newsletter.id,
            subscriber_id: subscriber.id,
            status: 'sent'
          });

          sentCount++;
          return { success: true };
        } catch (error) {
          console.error(`Failed to send to ${subscriber.email}:`, error);
          failedCount++;
          
          // Record the failure
          await supabase.from('newsletter_sends').insert({
            newsletter_id: newsletter.id,
            subscriber_id: subscriber.id,
            status: 'failed'
          });
          
          return { success: false, error };
        }
      });

      await Promise.all(emailPromises);
      
      // Small delay between batches
      if (i + batchSize < (subscribers?.length || 0)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update newsletter status
    await supabase
      .from('newsletters')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_recipients: sentCount
      })
      .eq('id', newsletter_id);

    console.log(`Newsletter sent: ${sentCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        total_sent: sentCount, 
        total_failed: failedCount 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-newsletter:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
