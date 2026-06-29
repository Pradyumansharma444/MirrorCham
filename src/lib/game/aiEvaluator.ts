import { localStorageDb } from "@/lib/db/localStorageDb";
import { analyzeTranscript, getPromptForLevel } from "./engine";

export interface EvaluatorResult {
  feedback: Array<{ message: string; tip: string; severity: "success" | "warning" | "danger" | "info" }>;
  nextTopic: string;
  nextPromptText: string;
}

// Built-in advanced algorithm works like an AI if API is unconfigured/offline
async function evaluateLocalBuiltIn(
  fillerCount: number,
  wpm: number,
  advancedWordCount: number,
  levelId: number
): Promise<EvaluatorResult> {
  let nextTopic = "General Communication Masterclass";
  let nextPromptText = "Describe your vision of the future of human communication in 2 minutes.";

  // Determine user weaknesses from metrics
  const feedback: EvaluatorResult["feedback"] = [];

  // Pacing issues
  if (wpm < 115) {
    nextTopic = "Vocal Energy & Pacing Control";
    feedback.push({
      message: `Built-in Coach: Speaking pace is slow (${wpm} WPM). listener attention might fade.`,
      tip: "Try the 'sprint method': read a paragraph out loud as fast as possible to build faster neural articulation pathways.",
      severity: "warning",
    });
  } else if (wpm > 175) {
    nextTopic = "Cadence Control & Pause Power";
    feedback.push({
      message: `Built-in Coach: Speaking pace is rushed (${wpm} WPM). Audience will miss critical details.`,
      tip: "Try the 'period pause' rule: force a silent swallow at the end of every sentence before proceeding.",
      severity: "warning",
    });
  }

  // Filler words issues
  if (fillerCount > 3) {
    nextTopic = "Silence Power & Filler Word Elimination";
    feedback.push({
      message: `Built-in Coach: Identified high filler count (${fillerCount} fillers). It weakens your stance.`,
      tip: "Practice the 3-second transition pause. Take a deep breath instead of vocalizing 'um' or 'like'.",
      severity: "danger",
    });
  }

  // Vocabulary issues
  if (advancedWordCount < 2) {
    nextTopic = "Vocal Descriptor Expansion & Synonyms";
    feedback.push({
      message: "Built-in Coach: Simple vocabulary detected. Elevate your word diversity.",
      tip: "Choose common adjectives like 'good' or 'bad' and research 3 advanced synonyms to replace them.",
      severity: "info",
    });
  }

  // Fetch next prompt based on next recommended topic
  try {
    const nextPrompt = await getPromptForLevel(levelId + 1);
    if (nextPrompt) {
      nextPromptText = nextPrompt.text;
    }
  } catch {
    // Ignore fallback to default
  }

  // Default success feedback if no issues
  if (feedback.length === 0) {
    feedback.push({
      message: "Built-in Coach: Excellent speech metrics. Balance WPM and clarity verified.",
      tip: "Increase prompt complexity to level up. Speak with higher vocabulary weights.",
      severity: "success",
    });
  }

  return {
    feedback,
    nextTopic,
    nextPromptText,
  };
}

export async function evaluateSessionSpeech(
  transcript: string,
  durationSec: number,
  levelId: number,
  promptText: string
): Promise<EvaluatorResult> {
  const apiConfig = localStorageDb.getApiConfig();
  const textAnalysis = analyzeTranscript(transcript, durationSec);
  const wpm = textAnalysis.wpm;
  const fillerCount = textAnalysis.fillerCount;
  const advancedWordCount = textAnalysis.advancedWordCount;

  // Local built-in analysis runs ALWAYS to calculate base recommendations
  const localAnalysis = await evaluateLocalBuiltIn(
    fillerCount,
    wpm,
    advancedWordCount,
    levelId
  );

  // If no API key, return local built-in metrics immediately
  if (!apiConfig.apiKey) {
    return localAnalysis;
  }

  // AI API Request
  const systemPrompt = `You are a professional AI Communication Coach. Analyze this user's speech session and recommend the next training steps.
Transcript: "${transcript}"
Current Level Prompt: "${promptText}"
Metrics: ${wpm} WPM, ${fillerCount} Fillers, ${advancedWordCount} Advanced Words.

Provide output in clean JSON format matching this exact type:
{
  "feedback": [
    {
      "message": "Qualitative critique regarding their vocabulary or clarity...",
      "tip": "Practical exercise or advice to improve...",
      "severity": "success" | "warning" | "danger" | "info"
    }
  ],
  "nextTopic": "Name of the topic path to practice next...",
  "nextPromptText": "A custom speaking prompt targeting their weakness..."
}`;

  try {
    let responseText = "";
    if (apiConfig.apiType === "openai") {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: systemPrompt }],
        }),
      });
      if (!resp.ok) throw new Error("OpenAI API call failed");
      const json = await resp.json();
      responseText = json.choices[0].message.content;
    } else {
      // Default: Gemini
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt + " (Respond in raw JSON format, do not wrap in markdown code blocks)" }] }],
          }),
        }
      );
      if (!resp.ok) throw new Error("Gemini API call failed");
      const json = await resp.json();
      responseText = json.candidates[0].content.parts[0].text;
    }

    // Parse AI result
    const aiResult = JSON.parse(responseText.trim()) as EvaluatorResult;

    // AI + Built-in working together: Merge local built-in metrics with AI qualitative analysis
    return {
      feedback: [...localAnalysis.feedback, ...aiResult.feedback],
      nextTopic: aiResult.nextTopic || localAnalysis.nextTopic,
      nextPromptText: aiResult.nextPromptText || localAnalysis.nextPromptText,
    };

  } catch (err) {
    console.error("AI API failed, falling back to built-in local algorithm:", err);
    // Graceful fallback to built-in algorithm
    return {
      feedback: [
        {
          message: "⚠️ AI evaluation service offline. Fallback to Local AI Coach active.",
          tip: "Verify your API Key in Settings if you intended to use Google Gemini/OpenAI.",
          severity: "info",
        },
        ...localAnalysis.feedback,
      ],
      nextTopic: localAnalysis.nextTopic,
      nextPromptText: localAnalysis.nextPromptText,
    };
  }
}
