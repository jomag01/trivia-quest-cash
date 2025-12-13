import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, model = 'gemini-pro', conversationHistory = [] } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!query) {
      throw new Error("Query is required");
    }

    // Select model based on request
    const selectedModel = model === 'gpt-5' 
      ? 'openai/gpt-5' 
      : 'google/gemini-2.5-pro';

    console.log(`Deep research using model: ${selectedModel}`);

    // Build system prompt for deep research
    const systemPrompt = `You are an advanced AI research assistant with deep analytical capabilities. Your role is to:

1. **Analyze queries thoroughly** - Break down complex questions into components
2. **Provide comprehensive research** - Give detailed, well-structured responses
3. **Use multi-step reasoning** - Show your thinking process step by step
4. **Cite knowledge areas** - Reference relevant domains and concepts
5. **Summarize findings** - End with clear conclusions and actionable insights

Format your responses with:
- **Key Findings** section at the top
- Numbered steps for your analysis process
- Bullet points for supporting details
- A **Conclusion** section with recommendations

Be thorough, accurate, and provide expert-level analysis. If the topic requires multiple perspectives, present them fairly.`;

    // Build messages array with conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-6).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: query }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        max_tokens: 4000,
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
        return new Response(JSON.stringify({ error: "Credits required. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    console.log("Deep research completed successfully");

    return new Response(JSON.stringify({ 
      result: content,
      model: selectedModel,
      tokens: data.usage?.total_tokens || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Deep research error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Research failed" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
