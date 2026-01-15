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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { niche, industry, location, companySize, keywords } = await req.json();

    if (!niche) {
      throw new Error("Business niche is required");
    }

    // Use Firecrawl to search for relevant businesses if available
    let scrapedData: any[] = [];
    
    if (FIRECRAWL_API_KEY) {
      try {
        // Search for businesses using Firecrawl
        const searchQuery = `${niche} ${industry || ""} ${location || ""} companies businesses`;
        
        const firecrawlResponse = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 10,
            scrapeOptions: {
              formats: ["markdown"],
            },
          }),
        });

        if (firecrawlResponse.ok) {
          const firecrawlData = await firecrawlResponse.json();
          scrapedData = firecrawlData.data || [];
          console.log(`Firecrawl found ${scrapedData.length} results`);
        }
      } catch (err) {
        console.error("Firecrawl search error:", err);
        // Continue without Firecrawl data
      }
    }

    // Use AI to generate/enrich leads based on the niche and any scraped data
    const scrapedContext = scrapedData.length > 0 
      ? `\n\nHere are some real businesses found from web search that match the criteria:\n${scrapedData.slice(0, 5).map((d: any) => `- ${d.title}: ${d.url} - ${d.description || ''}`).join('\n')}\n\nUse these as inspiration and enrich with realistic details.`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are a B2B lead generation expert. Generate realistic, actionable business leads that match the user's target market. 
            Each lead should have believable company details and contact information.
            Return ONLY valid JSON without any markdown formatting.`,
          },
          {
            role: "user",
            content: `Generate 10 high-quality business leads for this target market:

Target Niche: ${niche}
Industry: ${industry || "Any"}
Location: ${location || "Global"}
Company Size: ${companySize || "Any"}
Keywords: ${keywords || "None"}
${scrapedContext}

For each lead, provide:
1. Company name (realistic, professional)
2. Website URL (realistic format)
3. Industry category
4. Location (city, country)
5. Brief description of the company
6. Employee count estimate
7. Contact person name (realistic)
8. Contact person title
9. Contact email (realistic format based on company domain)
10. Contact phone (realistic format for the location)
11. LinkedIn profile URL (realistic format)
12. Relevance score (70-100, how well they match the target criteria)

Make the leads diverse but all relevant to the niche. Prioritize quality over quantity.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_leads",
              description: "Generate business leads matching the criteria",
              parameters: {
                type: "object",
                properties: {
                  leads: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        company_name: { type: "string" },
                        website: { type: "string" },
                        industry: { type: "string" },
                        location: { type: "string" },
                        description: { type: "string" },
                        employee_count: { type: "string" },
                        contact_name: { type: "string" },
                        contact_title: { type: "string" },
                        contact_email: { type: "string" },
                        contact_phone: { type: "string" },
                        linkedin_url: { type: "string" },
                        relevance_score: { type: "number" },
                      },
                      required: [
                        "id",
                        "company_name",
                        "website",
                        "industry",
                        "location",
                        "description",
                        "employee_count",
                        "relevance_score",
                      ],
                    },
                  },
                },
                required: ["leads"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_leads" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API Error:", response.status, errorText);
      throw new Error("Failed to generate leads");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      
      // Sort leads by relevance score
      const sortedLeads = parsed.leads.sort((a: any, b: any) => b.relevance_score - a.relevance_score);
      
      return new Response(JSON.stringify({ leads: sortedLeads }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
