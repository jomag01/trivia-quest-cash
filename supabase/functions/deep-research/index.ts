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
    const isGpt5 = model === 'gpt-5';
    const selectedModel = isGpt5 ? 'openai/gpt-5' : 'google/gemini-2.5-pro';

    console.log(`Deep research using model: ${selectedModel}`);

    // Build system prompt for deep research
    // NOTE: GPT-5 can spend the entire completion budget on hidden reasoning and return empty `content`
    // if the prompt strongly requests "show your thinking". Keep prompts concise and output-focused.
    const systemPrompt = isGpt5
      ? `You are a research assistant. Return your answer as visible text (do not output empty responses).

Provide:
- **Key Findings** (3–6 bullets)
- **Answer** (structured, practical)
- **Next Steps** (3 bullets)

Keep it concise and action-oriented. Do NOT include hidden chain-of-thought; summarize reasoning briefly in the Answer.`
      : `You are an advanced AI research assistant with deep analytical capabilities. Your role is to:

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

    // GPT-5 currently only supports the default temperature (1). Sending any other value causes a 400.
    // So we only set temperature for non-GPT-5 models.
    const requestBody: any = {
      model: selectedModel,
      messages,
    };

    if (!isGpt5) {
      requestBody.temperature = 0.4;
    }


    if (isGpt5) {
      // Keep this lower to reduce the chance GPT-5 uses the entire budget on hidden reasoning.
      requestBody.max_completion_tokens = 2000;
    } else {
      requestBody.max_tokens = 4000;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
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
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("AI response structure:", JSON.stringify(data).substring(0, 500));
    
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Empty content. Full response:", JSON.stringify(data));
      throw new Error("No response from AI - empty content received");
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
