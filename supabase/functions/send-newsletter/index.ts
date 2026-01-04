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
    let fatalError: string | null = null;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Send sequentially to respect Resend rate limits (2 requests/sec)
    for (const subscriber of subscribers || []) {
      const nowIso = new Date().toISOString();

      try {
        // Create personalized content
        const personalizedContent = newsletter.content
          .replace(/\{\{name\}\}/g, subscriber.full_name || "Friend")
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
      <h1>🐝 TriviaBees</h1>
    </div>
    <div class="content">
      ${personalizedContent
        .split('\n')
        .map((line: string) => `<p>${line}</p>`)
        .join('')}
      <p style="text-align: center;">
        <a href="https://triviabees.com" class="cta-button">Visit TriviaBees →</a>
      </p>
    </div>
    <div class="footer">
      <p>You're receiving this because you subscribed to TriviaBees updates.</p>
      <p>
        <a href="mailto:support@triviabees.com?subject=Unsubscribe">Unsubscribe</a>
        |
        <a href="https://triviabees.com">View in browser</a>
      </p>
    </div>
  </div>
</body>
</html>`;

        const sendResult = await resend.emails.send({
          from: "TriviaBees <no-reply@triviabees.com>",
          reply_to: "support@triviabees.com",
          to: [subscriber.email],
          subject: newsletter.subject,
          html: emailHtml,
          text: personalizedContent,
        });

        console.log("Resend send result:", sendResult);

        if ((sendResult as any)?.error) {
          const message = (sendResult as any).error?.message || "Email provider returned an error";
          throw new Error(message);
        }

        // Record the send
        await supabase.from("newsletter_sends").insert({
          newsletter_id: newsletter.id,
          subscriber_id: subscriber.id,
          status: "sent",
          sent_at: nowIso,
        });

        sentCount++;
      } catch (error: any) {
        const message = error?.message ? String(error.message) : String(error);
        console.error(`Failed to send to ${subscriber.email}:`, message);

        failedCount++;

        // Record the failure
        await supabase.from("newsletter_sends").insert({
          newsletter_id: newsletter.id,
          subscriber_id: subscriber.id,
          status: "failed",
          sent_at: nowIso,
        });

        // If domain isn't verified, continuing will never succeed.
        if (message.toLowerCase().includes("domain is not verified")) {
          fatalError =
            "Email sending is blocked because the sending domain is not verified with the email provider. Please verify triviabees.com, then resend the campaign.";
          break;
        }
      }

      // Resend free tier default: 2 req/sec
      await sleep(600);
    }

    // Update newsletter status
    const newsletterStatus = failedCount > 0 ? "failed" : "sent";

    await supabase
      .from("newsletters")
      .update({
        status: newsletterStatus,
        sent_at: new Date().toISOString(),
        total_recipients: sentCount,
      })
      .eq("id", newsletter_id);

    console.log(`Newsletter send finished: ${sentCount} success, ${failedCount} failed`);

    if (fatalError) {
      return new Response(
        JSON.stringify({
          error: fatalError,
          total_sent: sentCount,
          total_failed: failedCount,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: failedCount === 0,
        total_sent: sentCount,
        total_failed: failedCount,
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
