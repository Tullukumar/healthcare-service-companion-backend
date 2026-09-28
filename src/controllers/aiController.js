const Groq = require("groq-sdk");

// ==========================================
// GROQ CLIENT
// ==========================================

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


if (!process.env.GROQ_API_KEY) {
  return res.status(500).json({
    success: false,
    message: "GROQ_API_KEY is missing from .env",
  });
}

// ==========================================
// AI ASSISTANT
// POST /api/ai/chat
// ==========================================

const askAI = async (req, res) => {
  try {
    // ==========================================
    // GET REQUEST DATA
    // ==========================================

    const { message } = req.body;

    // ==========================================
    // VALIDATE MESSAGE
    // ==========================================

    if (
      !message ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a question.",
      });
    }

    // ==========================================
    // USER ROLE
    // ==========================================

    const userRole =
      req.user?.role || "patient";

    // ==========================================
    // SYSTEM PROMPT
    // ==========================================

    const systemPrompt = `
You are HealthCompanion AI, an assistant inside a healthcare service platform.

The current user's role is: ${userRole}.

Your purpose is to provide helpful, safe, practical and easy-to-understand healthcare guidance.

PATIENT GUIDANCE:
- Explain general health information.
- Help patients prepare questions for doctors.
- Explain medical terms in simple language.
- Do not diagnose diseases.
- Do not prescribe medicines.
- Do not provide medication dosages.
- Encourage professional medical consultation when appropriate.

DOCTOR GUIDANCE:
- Help with consultation preparation.
- Provide general clinical checklists.
- Help organize patient discussions.
- Support healthcare workflow.
- Do not replace professional clinical judgment.
- Do not make definitive diagnoses.

AMBULANCE GUIDANCE:
- Provide general emergency-response preparation.
- Encourage following approved emergency protocols.
- Provide general safety and transport guidance.
- Do not replace trained emergency professionals or local protocols.

ADMIN GUIDANCE:
- Help with healthcare-service management.
- Help with workflow and organization.
- Help with general platform-related questions.

IMPORTANT SAFETY RULES:
- Never claim to be a doctor.
- Never provide a definitive diagnosis.
- Never prescribe medication.
- Never provide medication dosage instructions.
- Never tell users to ignore serious symptoms.
- For emergencies, advise contacting appropriate emergency medical services or qualified healthcare professionals.
- Keep answers relevant to the user's role.
- Use simple, professional language.

RESPONSE FORMAT:

Return ONLY valid JSON.

Do not return Markdown.
Do not return HTML.
Do not return code blocks.
Do not return text outside the JSON object.

Use exactly this structure:

{
  "title": "Short title",
  "summary": "Short 1-2 sentence explanation.",
  "sections": [
    {
      "heading": "Section heading",
      "points": [
        "Point 1",
        "Point 2",
        "Point 3"
      ]
    }
  ],
  "warning": "Safety note."
}

FORMAT RULES:

1. title:
   - Keep it short.
   - Maximum approximately 80 characters.

2. summary:
   - 1-2 sentences.
   - Clearly summarize the answer.

3. sections:
   - Create 2-5 useful sections.
   - Each section should have a heading.
   - Each section should contain 2-5 concise points.

4. warning:
   - Include a relevant safety note.
   - If no special warning is needed, use:
     "This information is for general guidance and does not replace professional medical advice."

5. Return ONLY valid JSON.
6. Make sure the response can be parsed using JSON.parse().
`;

    // ==========================================
    // CALL GROQ
    // ==========================================

    const completion =
      await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message.trim(),
          },
        ],

        temperature: 0.3,

        max_completion_tokens: 800,

        include_reasoning: false,

        response_format: {
          type: "json_object",
        },
      });

    // ==========================================
    // GET AI CONTENT
    // ==========================================

    const content =
      completion.choices?.[0]?.message?.content;

    if (!content) {
      console.error(
        "❌ AI returned an empty response"
      );

      return res.status(500).json({
        success: false,
        message:
          "The AI returned an empty response.",
      });
    }

    // ==========================================
    // PARSE JSON
    // ==========================================

    let aiResponse;

    try {
      aiResponse = JSON.parse(content);
    } catch (error) {
      console.error(
        "❌ AI JSON parsing error:",
        error.message
      );

      console.error(
        "Raw AI response:",
        content
      );

      return res.status(500).json({
        success: false,
        message:
          "The AI returned an invalid response format.",
      });
    }

    // ==========================================
    // VALIDATE RESPONSE
    // ==========================================

    if (
      !aiResponse ||
      typeof aiResponse !== "object"
    ) {
      return res.status(500).json({
        success: false,
        message: "Invalid AI response.",
      });
    }

    // ==========================================
    // NORMALIZE SECTIONS
    // ==========================================

    const sections =
      Array.isArray(aiResponse.sections)
        ? aiResponse.sections.map(
            (section) => ({
              heading:
                typeof section?.heading ===
                "string"
                  ? section.heading
                  : "Information",

              points:
                Array.isArray(
                  section?.points
                )
                  ? section.points.filter(
                      (point) =>
                        typeof point ===
                        "string"
                    )
                  : [],
            })
          )
        : [];

    // ==========================================
    // FORMAT FINAL RESPONSE
    // ==========================================

    const formattedResponse = {
      title:
        typeof aiResponse.title === "string"
          ? aiResponse.title
          : "HealthCompanion AI",

      summary:
        typeof aiResponse.summary ===
        "string"
          ? aiResponse.summary
          : "",

      sections,

      warning:
        typeof aiResponse.warning ===
        "string"
          ? aiResponse.warning
          : "This information is for general guidance and does not replace professional medical advice.",
    };

    // ==========================================
    // SEND RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      // Keep answer for structured frontend use
      answer: formattedResponse,

      // Also provide message so your current
      // AIHealthCompanion.jsx can display it.
      message:
        formattedResponse.summary,

      role: userRole,
    });
  } catch (error) {
    // ==========================================
    // ERROR HANDLING
    // ==========================================

    console.error(
      "❌ AI assistant error:",
      error.message
    );

    if (error.response) {
      console.error(
        "Groq response:",
        error.response
      );
    }

    return res.status(500).json({
      success: false,
      message:
        "Unable to generate an AI response.",
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  askAI,
};