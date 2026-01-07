import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userInterests, matchInterests, userName, matchName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const commonInterests = userInterests?.filter((i: string) => matchInterests?.includes(i)) || [];

    const systemPrompt = `You are a friendly conversation starter for a chat mate finder app (NOT a dating app). 
Generate a natural, warm icebreaker message that:
- Is appropriate for casual/business networking
- References shared interests if any
- Is brief (1-2 sentences max)
- Is culturally appropriate for Philippines/global audience
- Encourages genuine conversation
- Avoids anything romantic or flirty

Keep it friendly, professional, and welcoming.`;

    const userPrompt = `Generate an icebreaker message for ${userName || 'a user'} to send to ${matchName || 'their new chat mate'}.
${commonInterests.length > 0 ? `They share these interests: ${commonInterests.join(", ")}` : "They don't have specific shared interests listed yet."}

Just respond with the icebreaker message itself, nothing else.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const icebreaker = data.choices?.[0]?.message?.content || "Hey! I'd love to chat and get to know you better. What are you passionate about?";

    console.log("Generated icebreaker:", icebreaker);

    return new Response(JSON.stringify({ icebreaker }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("chatmate-icebreaker error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      icebreaker: "Hey there! 👋 I noticed we might have some things in common. What's been the highlight of your week?"
    }), {
      status: 200, // Return fallback instead of error
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
