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
      format = "ILAW",
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
You produce classroom-ready lesson plans that strictly follow current Philippine DepEd standards:
- DepEd Order No. 016, s. 2026 (Guidelines on Lesson Planning and Learning Design), which prescribes the ILAW Framework — I: Intentions, L: Learning Experience, A: Assessing Learning, W: Ways Forward — and repeals DO 42, s. 2016
- The MATATAG Curriculum: use MATATAG Curriculum Guide content standards, performance standards and learning competencies with their official codes (e.g. EN7LC-I-1), NOT the old MELC lists, whenever the grade level is covered by MATATAG
- Values integration (Makabansa / Edukasyon sa Pagpapakatao), 21st-century skills, GMRC, and Inclusive Education
Use Philippine classroom context: local examples, Filipino names, barangay/community references, low-cost improvised instructional materials, large class sizes, limited technology.
Note in a short footer that the plan is an AI-assisted draft and, per Section 23 of DO 016, s. 2026, the teacher must review, contextualize and exercise professional judgment before use.`;

    const ilawStructure = `Produce a lesson plan following the ILAW Framework of DepEd Order No. 016, s. 2026, using exactly these four main sections and sub-parts:

**I — INTENTIONS**
- Learning Competency (with official MATATAG curriculum code)
- Learning Objectives (unpacked, focused, manageable, observable; aligned to learner readiness and available time)
- Learner Context (readiness, prior knowledge, class profile, language and cultural context)

**L — LEARNING EXPERIENCE**
- Pre-Lesson (activating prior knowledge, setting the purpose, short review/diagnostic)
- Lesson Flow / Lesson Proper (During-Lesson) — organized with the ${strategy} approach, with clear teacher moves, learner tasks, key questions, and estimated timing per part
- Learning Resources (MATATAG Teacher's Guide / Learner's Material pages, textbooks, LR Portal, improvised materials)
- Integration Opportunities (values, GMRC, cross-curricular, ICT, real-life/community application)

**A — ASSESSING LEARNING**
- Formative Assessment aligned to each objective (what evidence of learning will be gathered and how)
- Criteria / rubric and how results will inform the next lesson

**W — WAYS FORWARD**
- Extended Learning Opportunities (remediation, reinforcement, enrichment, home/community tasks)
- Reflections (teacher reflection prompts on learner progress, what worked, and adjustments)`;

    const structure = format === "DLL"
      ? `Produce a Daily Lesson Log (DLL) covering the week with the official DepEd parts: I. Objectives (Content Standards, Performance Standards, Learning Competencies/Objectives with curriculum code), II. Content, III. Learning Resources, IV. Procedures (A–J), V. Remarks, VI. Reflection (all 6 standard reflection items). Note that DLL is a legacy format allowed only until the end of Term 1, SY 2026–2027.`
      : format === "DLP"
      ? `Produce a Detailed Lesson Plan (DLP) with: I. Objectives (Knowledge, Skills, Attitude in SMART form with curriculum code), II. Subject Matter, III. Procedure using the ${strategy} approach with detailed teacher and learner activities and timing, IV. Evaluation, V. Assignment/Agreement. Note that DLP is a legacy format allowed only until the end of Term 1, SY 2026–2027.`
      : format === "ILAW-WEEKLY"
      ? `${ilawStructure}\n\nCover a whole week (5 daily sessions). Repeat the L (Learning Experience) and A (Assessing Learning) sections per day (Day 1–Day 5) under one shared set of Intentions, and close with a single Ways Forward section for the week.`
      : ilawStructure;

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
Learning Competency (MATATAG): ${competency || "identify the most appropriate MATATAG learning competency and its official code"}
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
