import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, visitorEmail, visitorName, message, conversationHistory, inquiryId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "chat") {
      // AI chat with visitor
      const systemPrompt = `You are a helpful customer service AI assistant for our platform. Your role is to:
1. Answer visitor questions about our services, features, and offerings
2. Help visitors understand how to use our platform
3. Collect contact information when appropriate
4. Escalate complex issues to human support when needed

Key information about our platform:
- We offer AI-powered content creation tools (image, video, music generation)
- We have an affiliate program where users can earn commissions
- We offer food delivery, booking services, and marketplace features
- Premium features include Website Builder, Analytics, and Social Media tools

Be friendly, professional, and helpful. If you cannot answer a question, suggest the visitor leave a message for our team.

Always end complex inquiries by encouraging the visitor to submit their email so we can follow up.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role,
          content: msg.content
        })),
        { role: "user", content: message }
      ];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || "I apologize, I couldn't process your request.";

      return new Response(JSON.stringify({ response: aiResponse }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "submit") {
      // Submit inquiry to database
      const fullConversation = [
        ...conversationHistory,
        { role: "user", content: message }
      ];

      // Generate AI recommended actions
      const actionsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Analyze this customer inquiry and suggest 3-5 recommended actions for the admin to take. 
Return a JSON array of action objects with 'action', 'priority' (high/medium/low), and 'reason' fields.
Example: [{"action": "Send pricing information", "priority": "high", "reason": "Customer asked about pricing"}]`
            },
            {
              role: "user",
              content: `Customer: ${visitorName || "Anonymous"} (${visitorEmail})\n\nConversation:\n${fullConversation.map(m => `${m.role}: ${m.content}`).join("\n")}`
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "recommend_actions",
                description: "Recommend actions for admin to take",
                parameters: {
                  type: "object",
                  properties: {
                    actions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          action: { type: "string" },
                          priority: { type: "string", enum: ["high", "medium", "low"] },
                          reason: { type: "string" }
                        },
                        required: ["action", "priority", "reason"]
                      }
                    }
                  },
                  required: ["actions"]
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "recommend_actions" } }
        }),
      });

      let recommendedActions: any[] = [];
      if (actionsResponse.ok) {
        const actionsData = await actionsResponse.json();
        const toolCall = actionsData.choices[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments);
            recommendedActions = parsed.actions || [];
          } catch (e) {
            console.error("Failed to parse actions:", e);
          }
        }
      }

      // Extract subject from first message
      const firstMessage = fullConversation.find(m => m.role === "user")?.content || message;
      const subject = firstMessage.length > 50 ? firstMessage.substring(0, 50) + "..." : firstMessage;

      // Save to database
      const { data: inquiry, error } = await supabase
        .from("contact_inquiries")
        .insert({
          visitor_email: visitorEmail,
          visitor_name: visitorName,
          subject,
          message: firstMessage,
          conversation_history: fullConversation,
          ai_recommended_actions: recommendedActions,
          status: "pending"
        })
        .select()
        .single();

      if (error) {
        console.error("Database error:", error);
        throw new Error("Failed to save inquiry");
      }

      return new Response(JSON.stringify({ 
        success: true, 
        inquiryId: inquiry.id,
        message: "Your inquiry has been submitted. We'll respond to your email soon!" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (action === "admin-reply") {
      // Admin replying to inquiry - send email via Resend
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      
      if (!RESEND_API_KEY) {
        // Just update the database if no email service
        const { error } = await supabase
          .from("contact_inquiries")
          .update({
            admin_response: message,
            status: "resolved",
            responded_at: new Date().toISOString()
          })
          .eq("id", inquiryId);

        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true, 
          emailSent: false,
          message: "Response saved (email service not configured)" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get inquiry details
      const { data: inquiry } = await supabase
        .from("contact_inquiries")
        .select("*")
        .eq("id", inquiryId)
        .single();

      if (!inquiry) throw new Error("Inquiry not found");

      // Send email
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Support <onboarding@resend.dev>",
          to: [inquiry.visitor_email],
          subject: `Re: ${inquiry.subject || "Your Inquiry"}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Response to Your Inquiry</h2>
              <p>Hello ${inquiry.visitor_name || "there"},</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${message.replace(/\n/g, "<br>")}
              </div>
              <p>Thank you for contacting us!</p>
              <p style="color: #666; font-size: 12px;">This is a response to your inquiry submitted on ${new Date(inquiry.created_at).toLocaleDateString()}</p>
            </div>
          `,
        }),
      });

      const emailSent = emailResponse.ok;

      // Update database
      const { error } = await supabase
        .from("contact_inquiries")
        .update({
          admin_response: message,
          status: "resolved",
          responded_at: new Date().toISOString()
        })
        .eq("id", inquiryId);

      if (error) throw error;

      return new Response(JSON.stringify({ 
        success: true, 
        emailSent,
        message: emailSent ? "Response sent via email" : "Response saved (email failed)" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");

  } catch (error: unknown) {
    console.error("Error in contact-assistant:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
