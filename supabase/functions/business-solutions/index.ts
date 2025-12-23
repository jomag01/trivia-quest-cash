import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateImageForSlide(prompt: string, apiKey: string): Promise<string | null> {
  try {
    console.log('Generating image for:', prompt.substring(0, 50));
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: `Generate a professional, high-quality business presentation image for: ${prompt}. The image should be clean, modern, suitable for corporate presentations. Ultra high resolution, professional quality.`
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      console.error('Image generation failed:', response.status);
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (imageUrl) {
      console.log('Image generated successfully');
      return imageUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Image generation error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, ...params } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Processing business solution: ${type}`);

    if (type === 'generate-powerpoint') {
      const { mode, document, topic, slideCount, design } = params;
      
      let contentPrompt = '';
      
      if (mode === 'document' && document) {
        const base64Content = document.split(',')[1] || document;
        contentPrompt = `Based on the following document content, create a professional presentation:\n\nDocument: ${base64Content.substring(0, 5000)}...`;
      } else if (mode === 'topic' && topic) {
        contentPrompt = `Create a comprehensive presentation about: ${topic}`;
      }

      const designInstructions = {
        professional: 'Use a clean corporate style with blue and white colors, minimal graphics, professional fonts.',
        creative: 'Use bold, vibrant colors, creative layouts, modern design elements, engaging visuals.',
        minimal: 'Use minimalist design, lots of white space, simple typography, clean layouts.',
        modern: 'Use contemporary design trends, subtle gradients, modern typography, sleek layouts.',
        dark: 'Use dark backgrounds with light text, subtle accents, professional dark theme.',
        gradient: 'Use beautiful gradient backgrounds, modern color transitions, visually striking design.',
      };

      const systemPrompt = `You are a professional presentation designer. Create detailed slide content for a ${slideCount}-slide presentation.
      
Design Style: ${designInstructions[design as keyof typeof designInstructions] || designInstructions.professional}

IMPORTANT: For each slide, provide a detailed "imagePrompt" that describes a relevant, professional image to accompany the slide content. This will be used to generate AI images.

Return a JSON object with this structure:
{
  "title": "Presentation Title",
  "slides": [
    {
      "slideNumber": 1,
      "title": "Slide Title",
      "type": "title|content|bullets|chart|image|conclusion",
      "content": "Main content or description",
      "bulletPoints": ["point 1", "point 2"],
      "speakerNotes": "Notes for the presenter",
      "imagePrompt": "Detailed description for generating a relevant professional image"
    }
  ],
  "designNotes": "Overall design recommendations"
}`;

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
            { role: 'user', content: contentPrompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content returned from AI');
      }

      // Parse JSON from response
      let presentation;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          presentation = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
        presentation = {
          title: topic || 'Presentation',
          slides: content.split('\n\n').slice(0, slideCount).map((text: string, idx: number) => ({
            slideNumber: idx + 1,
            title: `Slide ${idx + 1}`,
            type: idx === 0 ? 'title' : 'content',
            content: text.trim(),
            speakerNotes: '',
            imagePrompt: `Professional business image for: ${text.substring(0, 100)}`
          })),
          designNotes: `Style: ${design}`
        };
      }

      // Generate AI images for each slide (limit to first 5 slides to avoid timeout)
      console.log('Generating images for slides...');
      const slidesToProcess = Math.min(presentation.slides?.length || 0, 5);
      
      for (let i = 0; i < slidesToProcess; i++) {
        const slide = presentation.slides[i];
        if (slide.imagePrompt || slide.suggestedVisual) {
          const prompt = slide.imagePrompt || slide.suggestedVisual || slide.title;
          const imageUrl = await generateImageForSlide(prompt, LOVABLE_API_KEY);
          if (imageUrl) {
            presentation.slides[i].imageUrl = imageUrl;
          }
        }
      }

      return new Response(
        JSON.stringify({ presentation }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'process-excel') {
      const { excelData, operation, customInstructions } = params;
      
      const operationPrompts: Record<string, string> = {
        report: 'Generate a comprehensive business report with sections for overview, key metrics, detailed analysis, and conclusions.',
        analysis: 'Perform detailed data analysis identifying trends, patterns, anomalies, and correlations in the data.',
        charts: 'Recommend appropriate chart types and configurations to visualize this data effectively.',
        summary: 'Create an executive summary highlighting the most important findings and actionable insights.',
        forecast: 'Based on the data patterns, provide forecasting insights and predictions for future trends.',
        comparison: 'Create a comparison analysis identifying differences, changes, and growth patterns across data periods.',
      };

      const systemPrompt = `You are a business intelligence analyst. Analyze the provided data and ${operationPrompts[operation] || operationPrompts.report}

${customInstructions ? `Additional instructions: ${customInstructions}` : ''}

Return a JSON object with this structure:
{
  "summary": "Executive summary of findings",
  "insights": ["Key insight 1", "Key insight 2", "Key insight 3"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "metrics": {
    "key_metric_1": "value",
    "key_metric_2": "value"
  },
  "chartRecommendations": [
    {
      "type": "bar|line|pie|scatter",
      "title": "Chart title",
      "description": "What this chart shows"
    }
  ],
  "fullReport": "Detailed report content in markdown format"
}`;

      const base64Content = excelData.split(',')[1] || excelData;
      const dataPrompt = `Analyze this Excel/CSV data (base64 encoded, first 3000 chars shown):\n${base64Content.substring(0, 3000)}`;

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
            { role: 'user', content: dataPrompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content returned from AI');
      }

      let result;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
        result = {
          summary: content.substring(0, 500),
          insights: ['Analysis completed - see full report for details'],
          recommendations: ['Review the detailed findings'],
          fullReport: content
        };
      }

      return new Response(
        JSON.stringify({ result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type === 'generate-document') {
      const { serviceType, serviceName, content, instructions } = params;
      
      const documentPrompts: Record<string, string> = {
        resume: `Create a professional, ATS-friendly resume/CV. Include sections for:
- Contact Information header
- Professional Summary (3-4 impactful sentences)
- Work Experience (with bullet points highlighting achievements, quantified where possible)
- Education
- Skills (technical and soft skills)
- Optional sections as relevant: Certifications, Projects, Languages, Awards

Format it professionally with clear section headers and consistent formatting.`,
        
        pitch: `Create a compelling pitch document that includes:
- Executive Summary / Hook
- Problem Statement (pain points addressed)
- Solution / Product Description
- Unique Value Proposition
- Target Market / Customer Segments
- Business Model / How it works
- Competitive Advantage
- Traction / Milestones (if applicable)
- Team Overview (if provided)
- Call to Action / Next Steps

Make it persuasive, professional, and investor/client-ready.`,
        
        resolution: `Create a formal resolution document that includes:
- Document Header (Resolution Number, Date)
- Title of Resolution
- Preamble / Whereas Clauses (background and justification)
- Resolved Clauses (specific actions or decisions)
- Effective Date
- Signatures / Authorization section

Use formal legal language appropriate for official documentation.`,
        
        proposal: `Create a comprehensive business proposal that includes:
- Cover Page
- Executive Summary
- Project Overview / Scope
- Objectives and Goals
- Methodology / Approach
- Timeline / Milestones
- Deliverables
- Budget / Pricing
- Team / Qualifications
- Terms and Conditions
- Call to Action

Make it professional, detailed, and persuasive.`,
        
        'cover-letter': `Create a compelling cover letter that includes:
- Professional header with contact info
- Date and recipient information
- Engaging opening paragraph (why this role/company)
- Body paragraphs highlighting relevant experience and achievements
- Demonstration of company knowledge and cultural fit
- Strong closing with call to action
- Professional sign-off

Keep it concise (one page), personalized, and impactful.`,
        
        academic: `Create a well-structured academic paper that includes:
- Title and Author Information
- Abstract (150-250 words)
- Introduction (background, objectives, thesis statement)
- Literature Review / Background
- Methodology (if applicable)
- Main Body / Analysis
- Discussion of Findings
- Conclusion
- References section

Use academic language, proper citations format, and logical flow.`,
      };

      const systemPrompt = `You are a professional document writer specializing in ${serviceName}. ${documentPrompts[serviceType] || 'Create a professional document based on the provided information.'}

${instructions ? `Additional requirements: ${instructions}` : ''}

Create a polished, professional document that is ready for immediate use. Use appropriate formatting with clear sections and headers.`;

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
            { role: 'user', content: `Create a ${serviceName} based on the following information:\n\n${content}` }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const document = data.choices?.[0]?.message?.content;

      if (!document) {
        throw new Error('No content returned from AI');
      }

      return new Response(
        JSON.stringify({ document }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown operation type: ${type}`);

  } catch (error) {
    console.error('Business solutions error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});