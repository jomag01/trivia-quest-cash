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
      format = "DLP",
      gradeLevel,
      subject,
      topic,
      competency,
      quarter,
      duration = "60 minutes",
      strategy = "4As",
      language = "English",
      learners = "",
      values = "",
      materials = "",
      includeIMs = true,
      includeDifferentiation = true,
      includeAssessment = true,
      includeHomework = true,
    } = await req.json();

    if (!topic && !competency) {
      return new Response(JSON.stringify({ error: "Topic or learning competency is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert Philippine DepEd master teacher and curriculum writer.
You produce classroom-ready lesson plans that strictly follow Philippine DepEd standards:
- DepEd Order No. 42, s. 2016 (Policy Guidelines on Daily Lesson Preparation) for DLP/DLL structure
- MATATAG Curriculum and MELCs (Most Essential Learning Competencies) coding, e.g. EN7RC-I-a-1
- K to 12 Basic Education Program content and performance standards
- Values integration (Makabansa / Edukasyon sa Pagpapakatao), 21st-century skills, and Inclusive Education
Use Philippine classroom context: local examples, Filipino names, barangay/community references, low-cost improvised instructional materials, large class sizes, limited technology.`;

    const structure = format === "DLL"
      ? `Produce a Daily Lesson Log (DLL) covering the week with the official DepEd parts: I. Objectives (Content Standards, Performance Standards, Learning Competencies/Objectives with MELC code), II. Content, III. Learning Resources (References: Teacher's Guide pages, Learner's Material pages, Textbook pages, LR portal, Other resources), IV. Procedures (A. Reviewing previous lesson/presenting the new lesson, B. Establishing a purpose, C. Presenting examples/instances, D. Discussing new concepts and practicing new skills #1, E. Discussing new concepts and practicing new skills #2, F. Developing mastery, G. Finding practical applications, H. Making generalizations and abstractions, I. Evaluating learning, J. Additional activities for application or remediation), V. Remarks, VI. Reflection (all 6 standard reflection items).`
      : `Produce a Detailed Lesson Plan (DLP) with: I. Objectives (Knowledge, Skills, Attitude - written in SMART form with MELC code), II. Subject Matter (Topic, References, Materials, Values Integration), III. Procedure using the ${strategy} approach with detailed teacher and learner activities and estimated timing per part, IV. Evaluation, V. Assignment/Agreement.`;

    const extras = [
      includeIMs && "Suggest low-cost, improvised instructional materials available in Philippine public schools.",
      includeDifferentiation && "Add a Differentiated Instruction section for advanced, average, and struggling learners, plus learners with special needs.",
      includeAssessment && "Add a 10-item formative assessment with an answer key and a simple rubric with criteria and points.",
      includeHomework && "Add a meaningful, home-doable assignment that does not require internet access.",
      "Add a Remedial/Enrichment activity.",
      "Add ICT/Integration notes and cross-curricular links.",
    ].filter(Boolean).join("\n");

    const userPrompt = `Create a ${format} lesson plan.

Grade Level: ${gradeLevel || "not specified"}
Learning Area / Subject: ${subject || "not specified"}
Quarter: ${quarter || "not specified"}
Topic: ${topic || "derive from the competency"}
Learning Competency / MELC: ${competency || "identify the most appropriate MELC and its official code"}
Class Duration: ${duration}
Teaching Strategy: ${strategy}
Language of Instruction: ${language}
Learner Profile / Class Context: ${learners || "typical Philippine public school class of 40-50 learners"}
Values / Core Values to integrate: ${values || "choose the most appropriate DepEd core value"}
Available Materials: ${materials || "chalkboard, manila paper, marker, printed handouts"}

${structure}

${extras}

Write everything in ${language}. Format the output as clean, well-structured Markdown with clear headings, tables where useful, and ready-to-say teacher scripts in the procedure. Do not add commentary outside the lesson plan.`;

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
      return new Response(JSON.stringify({ error: "Failed to generate the lesson plan." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const lessonPlan = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ lessonPlan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Lesson plan generator error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
