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
    const { prompt, type } = await req.json();
    
    console.log('Generating newsletter content for:', type, 'with prompt:', prompt);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert email marketing copywriter specializing in affiliate marketing and motivational content. Your task is to create compelling email content that motivates users to take action and earn money by promoting their referral links.

WRITING STYLE:
- Engaging and conversational
- Action-oriented with clear CTAs
- Motivational without being pushy
- Professional yet friendly

OUTPUT FORMAT:
You must return a valid JSON object with these fields:
{
  "title": "Internal campaign name",
  "subject": "Catchy email subject line (max 60 chars)",
  "preview_text": "Preview text for inbox (max 100 chars)",
  "content": "The full email body content in plain text with line breaks"
}

The content should include:
- A compelling opening hook
- Value proposition or motivational message
- Clear call-to-action encouraging users to share their referral link
- A friendly sign-off

Keep the email concise but impactful. Around 150-300 words is ideal.`;

    const userPrompt = `Create ${type === 'automation' ? 'an automated email' : 'a newsletter email'} based on this request:

${prompt}

Remember to make it motivating and encourage users to share their referral link to earn commissions. Return the response as a JSON object.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    
    console.log('Raw AI response:', rawContent);

    // Parse the JSON response
    let result;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedContent = rawContent.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.slice(7);
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.slice(3);
      }
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3);
      }
      cleanedContent = cleanedContent.trim();
      
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback: try to extract content manually
      result = {
        title: 'New Campaign',
        subject: 'Exciting opportunity awaits!',
        preview_text: 'Check out how you can earn more...',
        content: rawContent
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-newsletter-content:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
