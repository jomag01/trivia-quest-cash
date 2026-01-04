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
    const { topic, tone = 'professional', type = 'article' } = await req.json();

    if (!topic) {
      throw new Error('Topic is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const toneInstructions = {
      professional: 'Use a professional, authoritative tone. Be informative and credible.',
      casual: 'Use a casual, friendly tone. Be conversational and engaging.',
      educational: 'Use an educational tone. Explain concepts clearly with examples.',
      news: 'Use a journalistic, news-style tone. Be factual and objective.',
      technical: 'Use a technical tone. Include code examples and technical details where relevant.'
    };

    const typeInstructions = {
      article: 'Write a comprehensive article with introduction, main points, and conclusion.',
      news: 'Write a news article with the most important information first (inverted pyramid style).',
      tutorial: 'Write a step-by-step tutorial with clear instructions and examples.',
      review: 'Write a balanced review with pros, cons, and recommendations.'
    };

    const systemPrompt = `You are an expert blog content writer specializing in technology topics. 
${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional}
${typeInstructions[type as keyof typeof typeInstructions] || typeInstructions.article}

Create content that is:
- SEO-optimized with proper keyword usage
- Google AdSense compliant (original, valuable, no prohibited content)
- Well-structured with headings (use ## for H2, ### for H3)
- Engaging and informative
- Between 800-1500 words
- Include a compelling introduction and conclusion

IMPORTANT: Return your response as valid JSON with this exact structure:
{
  "title": "SEO-optimized title under 60 characters",
  "excerpt": "Compelling summary under 160 characters",
  "content": "Full article content with markdown formatting",
  "meta_title": "SEO title tag under 60 chars",
  "meta_description": "Meta description under 160 chars",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;

    const userPrompt = `Write a ${type} about: ${topic}

Make sure the content is:
1. Original and valuable for readers
2. Well-researched with accurate information
3. Properly formatted with headings and paragraphs
4. SEO-friendly with natural keyword integration
5. AdSense compliant (no prohibited content, proper length, quality content)

Return ONLY valid JSON, no additional text.`;

    console.log('Generating blog content for topic:', topic);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated');
    }

    console.log('Raw AI response:', content.substring(0, 200));

    // Parse the JSON response
    let parsedContent;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Fallback: create structured response from raw content
      parsedContent = {
        title: topic,
        excerpt: content.substring(0, 160),
        content: content,
        meta_title: topic.substring(0, 60),
        meta_description: content.substring(0, 160),
        keywords: topic.split(' ').filter((w: string) => w.length > 3).slice(0, 5)
      };
    }

    console.log('Successfully generated blog content');

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating blog content:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to generate content' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});