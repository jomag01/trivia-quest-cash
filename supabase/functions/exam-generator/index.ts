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
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service is not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      term = "1st Term",
      examType = "Summative / Term Examination",
      gradeLevel,
      subject,
      topics = "",
      competencies = "",
      totalItems = 50,
      language = "English",
      itemTypes = ["Multiple Choice"],
      bloomsDistribution = "Remembering 15%, Understanding 20%, Applying 25%, Analyzing 20%, Evaluating 10%, Creating 10%",
      includeTOS = true,
      includeAnswerKey = true,
      includeRubric = true,
      includeItemAnalysisSheet = false,
      teacherName = "",
      schoolName = "",
    } = await req.json();

    if (!topics && !competencies) {
      return new Response(JSON.stringify({ error: "Topics or learning competencies are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert Philippine DepEd master teacher, test-construction specialist and assessment writer.
You build classroom-ready examinations that follow current Philippine DepEd standards:
- DepEd Order No. 016, s. 2026 (Lesson Planning and Learning Design) and the MATATAG Curriculum, which uses THREE (3) TERMS per school year instead of four quarters
- MATATAG Curriculum Guide content standards, performance standards and learning competencies with their official codes (e.g. EN7LC-I-1)
- DO 8, s. 2015 classroom assessment principles (written works, performance tasks, quarterly/term assessment)
- Table of Specification (TOS) construction: content areas, number of teaching days/hours, weight/percentage, cognitive levels (Bloom's Revised Taxonomy: Remembering, Understanding, Applying, Analyzing, Evaluating, Creating), item placement (item numbers) and total items — the TOS rows must sum exactly to the required total number of items.
Use Philippine classroom context, Filipino names, local and community-based examples, and age-appropriate language.
Add a short footer noting the exam is an AI-assisted draft that the teacher must review, validate and contextualize before administering.`;

    const userPrompt = `Create a complete ${term} ${examType} for a Philippine school under the MATATAG curriculum (3-term school year).

School: ${schoolName || "(leave a blank line for the school name)"}
Teacher: ${teacherName || "(leave a blank line for the teacher's name)"}
Grade Level: ${gradeLevel || "not specified"}
Learning Area / Subject: ${subject || "not specified"}
Term: ${term} (of 3 terms)
Total Items: ${totalItems}
Item Types to use: ${(Array.isArray(itemTypes) ? itemTypes : [itemTypes]).join(", ")}
Language: ${language}
Topics / Content covered this term: ${topics || "derive from the competencies"}
Learning Competencies (MATATAG codes): ${competencies || "identify the most appropriate MATATAG competencies and their official codes"}
Cognitive level distribution: ${bloomsDistribution}

Produce the output in this exact order using clean Markdown:

1. **EXAMINATION HEADER** — Republic of the Philippines / Department of Education, school, teacher, subject, grade & section, term, school year, date, total points, and a Name/Score line.
${includeTOS ? `2. **TABLE OF SPECIFICATION (TOS)** — a Markdown table with columns: Content / Topic | Learning Competency (MATATAG code) | No. of Days/Hours | % Weight | Remembering | Understanding | Applying | Analyzing | Evaluating | Creating | Total Items | Item Placement (item numbers). Add a TOTAL row. The Total Items column MUST sum to exactly ${totalItems}, item numbers must be unique and cover 1–${totalItems}, and the cognitive spread must match the requested distribution.` : ""}
3. **GENERAL DIRECTIONS** for learners.
4. **THE EXAMINATION ITEMS** — grouped by part (Part I, Part II, …) per item type, each part with its own directions and point value. Number items continuously from 1 to ${totalItems} exactly matching the TOS item placement. Multiple-choice items need 4 plausible options (A–D) with no obvious giveaways.
${includeRubric ? `5. **RUBRIC** for essay / performance-based items with criteria, level descriptors and points.` : ""}
${includeAnswerKey ? `6. **ANSWER KEY** — complete, numbered 1 to ${totalItems}, with brief justifications for higher-order items.` : ""}
${includeItemAnalysisSheet ? `7. **ITEM ANALYSIS SHEET** — a blank Markdown table for recording item number, competency, cognitive level, number of correct responses, difficulty index, discrimination index and remarks.` : ""}

Write everything in ${language}.

FORMATTING RULES (must be followed exactly, like an official DepEd printed test paper):
- Output clean GitHub-flavored Markdown only. No code fences, no commentary.
- Start with an "# " title line, then a two-column Markdown table with the columns: Item | Details \u2014 School, Teacher, Learning Area, Grade Level & Section, Term, School Year, Date, Total Points, Time Allotment.
- Immediately after it, add a learner information table with the columns: Name | Grade & Section | Date | Score, each cell containing a blank underscore line.
- Use "## " for every major section (Table of Specification, General Directions, Part I, Part II, Rubric, Answer Key, Item Analysis Sheet) and "### " for sub-parts. Never bold text in place of a heading.
- The Table of Specification MUST be a Markdown table with the required columns and a bold TOTAL row.
- Each exam part starts with a "## " heading that states the item type, the item range and the points, followed by an italic Directions line, then the numbered items. Multiple-choice options go on one line as: A. \u2026  B. \u2026  C. \u2026  D. \u2026
- The Answer Key MUST be a compact table with the columns: Item No. | Answer | Cognitive Level, covering items 1\u2013${totalItems}.
- The rubric MUST be a table with the columns: Criteria | Excellent (4) | Good (3) | Fair (2) | Needs Improvement (1) | Points.
- Keep every table cell short and single-line; use "<br>" if a cell truly needs two lines. Never leave a table cell empty \u2014 write a dash.
- End with a signature block table with the columns: Prepared by: | Checked by: | Noted by: with blank underscore lines, followed by the AI-assisted draft note.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact the administrator." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to generate the examination." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const exam = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ exam }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Exam generator error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
