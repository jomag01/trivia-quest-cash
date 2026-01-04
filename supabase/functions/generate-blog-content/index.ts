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

    const systemPrompt = `You are an expert blog content writer. Write high-quality, engaging blog content.
${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional}
${typeInstructions[type as keyof typeof typeInstructions] || typeInstructions.article}

CRITICAL INSTRUCTIONS:
1. Write the ACTUAL blog article content directly - NOT JSON format
2. Use markdown formatting: ## for H2 headings, ### for H3, **bold**, *italic*
3. Write 800-1500 words of real, valuable content
4. Include a compelling introduction and strong conclusion
5. Be SEO-optimized with natural keyword usage`;

    const userPrompt = `Write a complete ${type} about: ${topic}

Write the full article NOW. Start with the article content directly.
Use markdown formatting for headings and emphasis.
Do NOT return JSON - write the actual article text.`;

    console.log('Generating blog content for topic:', topic);

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
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      throw new Error('No content generated');
    }

    console.log('Raw AI response length:', rawContent.length);

    // Clean the content - remove any JSON wrapper or code blocks
    let cleanContent = rawContent.trim();
    
    // Remove markdown code blocks if present
    cleanContent = cleanContent.replace(/^```(?:json|markdown)?\s*\n?/i, '');
    cleanContent = cleanContent.replace(/\n?```\s*$/i, '');
    
    // Check if response is JSON and extract content
    let finalContent = cleanContent;
    let extractedTitle = topic;
    let extractedExcerpt = '';
    
    try {
      // Try to parse as JSON in case AI returned JSON despite instructions
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.content && typeof parsed.content === 'string') {
          // AI returned JSON, extract the actual content
          finalContent = parsed.content;
          extractedTitle = parsed.title || topic;
          extractedExcerpt = parsed.excerpt || '';
          console.log('Extracted content from JSON response');
        }
      }
    } catch (e) {
      // Not JSON, use as-is (this is the expected path)
      console.log('Content is plain text/markdown (expected)');
    }

    // Generate title from topic if not extracted
    const title = extractedTitle.length > 60 ? extractedTitle.substring(0, 57) + '...' : extractedTitle;
    
    // Generate excerpt from content if not extracted
    const excerpt = extractedExcerpt || finalContent
      .replace(/^#+\s+.+\n?/gm, '') // Remove headings
      .replace(/\*\*|__|\*|_/g, '') // Remove bold/italic markers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
      .trim()
      .substring(0, 160);

    // Extract keywords from topic and content
    const keywords = topic
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
      .slice(0, 5);

    const result = {
      title,
      excerpt,
      content: finalContent,
      meta_title: title,
      meta_description: excerpt,
      keywords
    };

    console.log('Successfully processed blog content');

    console.log('Successfully generated blog content');

    return new Response(JSON.stringify(result), {
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