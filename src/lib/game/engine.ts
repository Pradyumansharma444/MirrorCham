import type { SessionMetrics, SessionResult, FeedbackItem, TierInfo, Prompt } from "@/types/game";
import nlp from "compromise";

// Filler words list
const FILLER_WORDS = [
  "um", "uh", "like", "you know", "actually", "basically", "literally",
  "so", "well", "i mean", "right", "okay", "kind of", "sort of",
  "honestly", "seriously", "totally", "definitely", "probably",
  "maybe", "perhaps", "supposedly", "arguably", "essentially",
  "practically", "virtually", "obviously", "clearly", "apparently",
  "presumably", "presumable", "allegedly", "reportedly", "supposedly",
  "roughly", "approximately", "relatively", "fairly", "pretty",
  "quite", "rather", "somewhat", "somehow", "anyway", "anyhow",
  "whatever", "whenever", "wherever", "however", "whoever",
  "thing", "stuff", "something", "someone", "somebody",
  "whatever", "whatsoever", "anyways", "ok", "hmm", "er", "ah",
];

// Load advanced words from dataset
let advancedWords: string[] = [];

async function loadAdvancedWords(): Promise<string[]> {
  if (advancedWords.length > 0) return advancedWords;
  try {
    const res = await fetch("/datasets/advanced_words.json");
    advancedWords = await res.json();
  } catch {
    // Fallback list
    advancedWords = [
      "accomplish", "accumulate", "accurate", "achievement", "acknowledge",
      "acquire", "adequate", "adjust", "administration", "advocate",
      "aggregate", "allocate", "alter", "ambiguous", "ambition",
      "analysis", "analyze", "anticipate", "apparent", "approach",
      "appropriate", "approximate", "arbitrary", "assemble", "assess",
      "assign", "assist", "assume", "assure", "attach", "attempt",
      "attribute", "audience", "authority", "automatic", "aware",
      "benefit", "bias", "breach", "capable", "capacity", "category",
      "cease", "challenge", "channel", "characteristic", "cite",
      "civil", "clarify", "classic", "code", "coherent", "collapse",
      "colleague", "commence", "commission", "commitment", "communicate",
      "compatible", "compensate", "compile", "complex", "component",
      "compound", "comprehensive", "comprise", "compute", "conceive",
      "concentrate", "concept", "conclude", "conduct", "confer",
      "confirm", "conform", "confront", "conscious", "consent",
      "consequence", "consistent", "constant", "constitute", "constrain",
      "construct", "consult", "consume", "contemporary", "context",
      "contract", "contradict", "contrary", "contrast", "contribute",
      "controversy", "convene", "convert", "convince", "cooperate",
      "coordinate", "core", "corporate", "correspond", "couple",
      "create", "credible", "crucial", "cumulative", "debate", "decline",
      "deduce", "define", "definite", "demonstrate", "denote", "deny",
      "depress", "derive", "designate", "detect", "deviate", "devote",
      "differentiate", "dimension", "diminish", "discrete", "display",
      "dispose", "distinct", "distort", "distribute", "diverse",
      "document", "domain", "domestic", "dominate", "draft", "dramatic",
      "duration", "dynamic", "economy", "edit", "element", "eliminate",
      "emerge", "emphasis", "empirical", "enable", "encounter", "enforce",
      "enhance", "enormous", "ensure", "entity", "environment", "equate",
      "equivalent", "erode", "establish", "estimate", "evaluate",
      "eventual", "evident", "evolve", "exact", "exaggerate", "exceed",
      "exclude", "execute", "exhibit", "expand", "expert", "explicit",
      "exploit", "expose", "external", "extract", "facilitate", "factor",
      "feature", "federal", "fee", "file", "final", "finance", "finite",
      "flexible", "fluctuate", "focus", "format", "formula", "foundation",
      "framework", "function", "fundamental", "furthermore", "gap",
      "generate", "generation", "globe", "goal", "grade", "grant",
      "guarantee", "guideline", "hence", "hierarchy", "highlight",
      "hypothesis", "identical", "identify", "ideology", "illustrate",
      "image", "impact", "implement", "imply", "impose", "incentive",
      "incidence", "income", "incorporate", "index", "indicate",
      "individual", "induce", "inevitable", "infer", "infrastructure",
      "initial", "initiate", "injure", "innovate", "input", "insight",
      "inspect", "instance", "instruct", "integral", "integrate",
      "integrity", "intelligence", "intense", "interact", "intermediate",
      "internal", "interpret", "interval", "intervene", "intrinsic",
      "investigate", "invoke", "involve", "isolate", "issue", "item",
      "job", "journal", "judge", "justify", "label", "labor", "layer",
      "lecture", "legal", "legislate", "levy", "liberal", "license",
      "likewise", "link", "locate", "logic", "maintain", "major",
      "manipulate", "manual", "margin", "mature", "maximize",
      "mechanism", "mediate", "medium", "mental", "method", "migrate",
      "military", "minimal", "minimize", "minimum", "minor", "mode",
      "modify", "monitor", "motive", "mutual", "negate", "network",
      "neutral", "nevertheless", "nonetheless", "norm", "notion",
      "notwithstanding", "nuclear", "objective", "obtain", "obvious",
      "occupy", "occur", "odd", "offset", "ongoing", "option", "organize",
      "orient", "outcome", "output", "overall", "overlap", "overseas",
      "panel", "paradigm", "paragraph", "parallel", "parameter",
      "participate", "partner", "passive", "perceive", "percent",
      "period", "persist", "perspective", "phase", "phenomenon",
      "philosophy", "physical", "policy", "portion", "pose", "positive",
      "potential", "practitioner", "precede", "precise", "predict",
      "predominant", "preliminary", "presume", "previous", "primary",
      "prime", "principal", "principle", "prior", "priority", "proceed",
      "process", "professional", "prohibit", "project", "promote",
      "proportion", "propose", "prospect", "protocol", "psychology",
      "publication", "publish", "purchase", "pursue", "qualitative",
      "quote", "radical", "random", "range", "ratio", "rational",
      "react", "recover", "reduce", "refer", "refine", "regime",
      "region", "register", "regulate", "reinforce", "reject", "relax",
      "release", "relevant", "reluctant", "rely", "remove", "require",
      "research", "reside", "resolve", "resource", "respond", "restore",
      "restrain", "restrict", "retain", "reveal", "revenue", "reverse",
      "revise", "revolution", "rigid", "role", "route", "scenario",
      "schedule", "scheme", "scope", "section", "sector", "secure",
      "seek", "select", "sequence", "series", "server", "service",
      "settle", "shift", "significant", "similar", "simulate", "site",
      "source", "specific", "specify", "sphere", "stable", "state",
      "status", "statistic", "stereotype", "stimulate", "strategy",
      "stress", "structure", "style", "submit", "subordinate",
      "subsequent", "subsidy", "substitute", "successor", "sufficient",
      "sum", "summary", "supplement", "survey", "survive", "sustain",
      "symbol", "symptom", "synthetic", "system", "tactic", "target",
      "task", "team", "technical", "technique", "technology",
      "temporary", "tense", "terminate", "text", "theme", "theory",
      "thereby", "thesis", "topic", "trace", "tradition", "transfer",
      "transform", "transit", "transmit", "transport", "trend",
      "trigger", "ultimate", "undergo", "underlie", "undertake",
      "uniform", "unify", "unique", "unit", "universal", "unlike",
      "update", "utility", "utilize", "valid", "vary", "vehicle",
      "version", "via", "violate", "virtual", "visible", "vision",
      "visual", "volume", "voluntary", "welfare", "whereas", "widespread",
    ];
  }
  return advancedWords;
}

// Get prompt for a level
export async function getPromptForLevel(levelId: number): Promise<Prompt | null> {
  try {
    const res = await fetch("/datasets/prompts.json");
    const prompts: Prompt[] = await res.json();
    return prompts[(levelId - 1) % prompts.length] || null;
  } catch {
    return null;
  }
}

// Get constraint for a level
export async function getConstraintForLevel(levelId: number): Promise<string | null> {
  try {
    const res = await fetch("/datasets/constraints.json");
    const constraints: Array<{ id: string; minLevel: number; difficulty: number }> = await res.json();
    const applicable = constraints.filter((c) => c.minLevel <= levelId);
    if (applicable.length === 0) return null;
    // Pick based on level progression
    const idx = (levelId - 1) % applicable.length;
    return applicable[idx].id;
  } catch {
    return null;
  }
}

// Analyze transcript using compromise.js
export function analyzeTranscript(transcript: string, durationSec: number): {
  wordCount: number;
  wpm: number;
  fillerCount: number;
  fillerWords: string[];
  advancedWordCount: number;
  advancedWordsUsed: string[];
} {
  const doc = nlp(transcript);
  const words = doc.json().reduce((acc: string[], term: { terms: Array<{ text: string; normal: string }> }) => {
    term.terms.forEach((t) => acc.push(t.normal || t.text.toLowerCase()));
    return acc;
  }, []);

  const wordCount = words.length;
  const durationMin = durationSec / 60;
  const wpm = durationMin > 0 ? Math.round(wordCount / durationMin) : 0;

  // Find filler words
  const foundFillers: string[] = [];
  const textLower = transcript.toLowerCase();
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = textLower.match(regex);
    if (matches) {
      foundFillers.push(...matches);
    }
  }

  // Find advanced words
  const foundAdvanced: string[] = [];
  const advWords = advancedWords.length > 0 ? advancedWords : [
    "accomplish", "accumulate", "accurate", "achievement", "acknowledge",
    "acquire", "adequate", "adjust", "administration", "advocate",
  ];
  for (const word of words) {
    if (advWords.includes(word.toLowerCase()) && !foundAdvanced.includes(word.toLowerCase())) {
      foundAdvanced.push(word.toLowerCase());
    }
  }

  return {
    wordCount,
    wpm,
    fillerCount: foundFillers.length,
    fillerWords: foundFillers,
    advancedWordCount: foundAdvanced.length,
    advancedWordsUsed: foundAdvanced,
  };
}

// Calculate pace score (0-100)
function calculatePaceScore(wpm: number): number {
  const targetWPM = 135;
  const deviation = Math.abs(wpm - targetWPM);
  if (deviation <= 10) return 95 + Math.floor(Math.random() * 6);
  if (deviation <= 20) return 80 + Math.floor((20 - deviation) * 0.75);
  if (deviation <= 40) return 60 + Math.floor((40 - deviation));
  if (deviation <= 60) return 40 + Math.floor((60 - deviation) * 0.5);
  return Math.max(20, 60 - deviation);
}

// Calculate clarity score (0-100) - based on filler word density
function calculateClarityScore(wordCount: number, fillerCount: number): number {
  if (wordCount === 0) return 0;
  const fillerDensity = fillerCount / wordCount;
  if (fillerDensity === 0) return 100;
  if (fillerDensity <= 0.02) return 90 + Math.floor((0.02 - fillerDensity) * 500);
  if (fillerDensity <= 0.05) return 70 + Math.floor((0.05 - fillerDensity) * 667);
  if (fillerDensity <= 0.1) return 50 + Math.floor((0.1 - fillerDensity) * 400);
  return Math.max(20, 60 - Math.floor(fillerDensity * 400));
}

// Calculate vocabulary score (0-100)
function calculateVocabScore(wordCount: number, advancedWordCount: number): number {
  if (wordCount === 0) return 0;
  const ratio = advancedWordCount / wordCount;
  if (ratio >= 0.15) return 100;
  if (ratio >= 0.1) return 85 + Math.floor((ratio - 0.1) * 300);
  if (ratio >= 0.05) return 65 + Math.floor((ratio - 0.05) * 400);
  if (ratio >= 0.02) return 45 + Math.floor((ratio - 0.02) * 667);
  return Math.max(20, 40 + Math.floor(ratio * 1000));
}

// Calculate confidence score from audio metrics
function calculateConfidenceScore(avgVolume: number, pauseCount: number): number {
  let score = 50;
  // Volume contributes 0-40 points
  score += Math.min(40, Math.floor(avgVolume * 200));
  // Pauses deduct 0-30 points
  score -= Math.min(30, pauseCount * 3);
  return Math.max(20, Math.min(100, score));
}

// Calculate tone score from pitch variation
function calculateToneScore(pitchVariation: number): number {
  if (pitchVariation >= 0.3) return 95 + Math.floor(Math.random() * 6);
  if (pitchVariation >= 0.2) return 80 + Math.floor(pitchVariation * 75);
  if (pitchVariation >= 0.1) return 60 + Math.floor(pitchVariation * 200);
  if (pitchVariation >= 0.05) return 40 + Math.floor(pitchVariation * 400);
  return Math.max(25, 40 + Math.floor(pitchVariation * 300));
}

// Main analysis function
export async function analyzeSession(
  transcript: string,
  durationSec: number,
  audioMetrics: {
    avgVolume: number;
    pitchVariation: number;
    pauseCount: number;
  }
): Promise<SessionResult> {
  // Load advanced words
  await loadAdvancedWords();

  // Analyze transcript
  const textAnalysis = analyzeTranscript(transcript, durationSec);

  // Calculate individual scores
  const paceScore = calculatePaceScore(textAnalysis.wpm);
  const clarityScore = calculateClarityScore(textAnalysis.wordCount, textAnalysis.fillerCount);
  const vocabScore = calculateVocabScore(textAnalysis.wordCount, textAnalysis.advancedWordCount);
  const confidenceScore = calculateConfidenceScore(audioMetrics.avgVolume, audioMetrics.pauseCount);
  const toneScore = calculateToneScore(audioMetrics.pitchVariation);

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    paceScore * 0.25 +
    clarityScore * 0.25 +
    vocabScore * 0.2 +
    confidenceScore * 0.15 +
    toneScore * 0.15
  );

  const metrics: SessionMetrics = {
    ...textAnalysis,
    paceScore,
    clarityScore,
    vocabScore,
    confidenceScore,
    toneScore,
    overallScore,
    pauseCount: audioMetrics.pauseCount,
    avgVolume: audioMetrics.avgVolume,
    pitchVariation: audioMetrics.pitchVariation,
    transcript,
    duration: durationSec,
  };

  // Generate stars
  let stars = 1; // Completing the session = 1 star
  if (clarityScore >= 80) stars = 2;
  if (overallScore >= 90) stars = 3;

  // Calculate XP
  const xpEarned = calculateXP(1, overallScore, stars, true, textAnalysis.fillerCount);

  // Generate feedback
  const feedback = generateFeedback(metrics);

  return {
    metrics,
    xpEarned,
    stars,
    constraintMet: textAnalysis.fillerCount === 0,
    feedback,
  };
}

// Generate feedback based on metrics
function generateFeedback(metrics: SessionMetrics): FeedbackItem[] {
  const feedback: FeedbackItem[] = [];

  // Pace feedback
  if (metrics.wpm < 100) {
    feedback.push({
      metric: "pace",
      severity: "warning",
      message: `Your pace was slow at ${metrics.wpm} WPM. Try speaking with more energy.`,
      tip: "Practice timed sprints: set a 30-second timer and speak as fast as you can while staying clear.",
    });
  } else if (metrics.wpm > 180) {
    feedback.push({
      metric: "pace",
      severity: "warning",
      message: `You spoke very fast at ${metrics.wpm} WPM. Slow down to let your message land.`,
      tip: "Try the 'pause power' technique: stop for 1 second after every key point.",
    });
  } else if (metrics.wpm >= 120 && metrics.wpm <= 160) {
    feedback.push({
      metric: "pace",
      severity: "success",
      message: `Excellent pace at ${metrics.wpm} WPM! You're in the sweet spot.`,
      tip: "Keep practicing at this pace to make it your natural rhythm.",
    });
  } else {
    feedback.push({
      metric: "pace",
      severity: "info",
      message: `Good pace at ${metrics.wpm} WPM. Close to the ideal range of 120-160.`,
      tip: "Try adjusting slightly toward 130-140 WPM for maximum impact.",
    });
  }

  // Filler words feedback
  if (metrics.fillerCount >= 5) {
    feedback.push({
      metric: "fillers",
      severity: "danger",
      message: `You used ${metrics.fillerCount} filler words. This undermines credibility.`,
      tip: "Replace fillers with intentional pauses. Silence shows confidence.",
    });
  } else if (metrics.fillerCount >= 2) {
    feedback.push({
      metric: "fillers",
      severity: "warning",
      message: `You used ${metrics.fillerCount} filler words. Aim for zero.`,
      tip: "Record yourself for 30 seconds daily and consciously eliminate one filler.",
    });
  } else if (metrics.fillerCount === 0) {
    feedback.push({
      metric: "fillers",
      severity: "success",
      message: "Zero filler words! Your speech was clean and confident.",
      tip: "You're building excellent habits. Maintain this in longer sessions.",
    });
  }

  // Vocabulary feedback
  if (metrics.advancedWordCount >= 8) {
    feedback.push({
      metric: "vocabulary",
      severity: "success",
      message: `Outstanding vocabulary! You used ${metrics.advancedWordCount} advanced words.`,
      tip: "You're a word master. Keep challenging yourself with complex prompts.",
    });
  } else if (metrics.advancedWordCount >= 4) {
    feedback.push({
      metric: "vocabulary",
      severity: "info",
      message: `Good vocabulary with ${metrics.advancedWordCount} advanced words.`,
      tip: "Try to use 1-2 more advanced words in your next session.",
    });
  } else {
    feedback.push({
      metric: "vocabulary",
      severity: "warning",
      message: "Your vocabulary was basic. Challenge yourself with more sophisticated words.",
      tip: "Pick 3 words from our advanced list and intentionally use them next time.",
    });
  }

  // Confidence feedback
  if (metrics.avgVolume < 0.15) {
    feedback.push({
      metric: "confidence",
      severity: "warning",
      message: "Your volume was low. Speak louder to project confidence.",
      tip: "Stand up straight, take a deep breath, and imagine speaking to someone 20 feet away.",
    });
  } else if (metrics.avgVolume >= 0.35) {
    feedback.push({
      metric: "confidence",
      severity: "success",
      message: "Strong vocal presence! Your volume commands attention.",
      tip: "You have great vocal power. Now focus on varying your tone.",
    });
  } else {
    feedback.push({
      metric: "confidence",
      severity: "info",
      message: "Good vocal presence. Your volume shows moderate confidence.",
      tip: "Project just a bit more to command the room completely.",
    });
  }

  // Tone feedback
  if (metrics.pitchVariation < 0.1) {
    feedback.push({
      metric: "tone",
      severity: "warning",
      message: "Your tone was flat. Varying your pitch makes speech more engaging.",
      tip: "Try the 'siren' exercise: slide your voice from low to high pitch for 30 seconds daily.",
    });
  } else if (metrics.pitchVariation >= 0.2) {
    feedback.push({
      metric: "tone",
      severity: "success",
      message: "Excellent vocal variety! Your dynamic tone keeps listeners engaged.",
      tip: "You have great tonal range. Maintain this while controlling your pace.",
    });
  } else {
    feedback.push({
      metric: "tone",
      severity: "info",
      message: "Decent tonal variety. Your voice had some natural variation.",
      tip: "Emphasize key words by slightly raising your pitch on them.",
    });
  }

  return feedback;
}

// Calculate XP for a session
export function calculateXP(
  levelId: number,
  overallScore: number,
  stars: number,
  constraintMet: boolean,
  fillerCount: number
): number {
  const baseXP = 10;
  const levelMultiplier = 1 + levelId * 0.05;
  const scoreBonus = Math.floor((overallScore / 100) * 20);
  const constraintBonus = constraintMet ? 5 : 0;
  const noFillerBonus = fillerCount === 0 ? 5 : 0;
  const starBonus = stars * 3;
  const tierBonus = getTierForLevel(levelId).xpBonus;
  return Math.floor((baseXP + scoreBonus + constraintBonus + noFillerBonus + starBonus) * levelMultiplier) + tierBonus;
}

// Get tier info for a level
export function getTierForLevel(level: number): TierInfo {
  const tiers = [
    { min: 1, max: 19, name: "Bronze", badge: "bronze", color: "#CD7F32", xpBonus: 0 },
    { min: 20, max: 49, name: "Silver", badge: "silver", color: "#C0C0C0", xpBonus: 50 },
    { min: 50, max: 99, name: "Gold", badge: "gold", color: "#FFD700", xpBonus: 100 },
    { min: 100, max: 149, name: "Platinum", badge: "platinum", color: "#E5E4E2", xpBonus: 150 },
    { min: 150, max: 199, name: "Diamond", badge: "diamond", color: "#B9F2FF", xpBonus: 200 },
    { min: 200, max: 249, name: "Crown", badge: "crown", color: "#FFD700", xpBonus: 250 },
    { min: 250, max: 299, name: "Ace", badge: "ace", color: "#FF4444", xpBonus: 300 },
    { min: 300, max: 349, name: "Conqueror", badge: "conqueror", color: "#8B0000", xpBonus: 350 },
    { min: 350, max: 399, name: "Master", badge: "master", color: "#4169E1", xpBonus: 400 },
    { min: 400, max: 449, name: "Elite Master", badge: "elite", color: "#9400D3", xpBonus: 450 },
    { min: 450, max: 499, name: "Grandmaster", badge: "grandmaster", color: "#FF4500", xpBonus: 500 },
  ];

  if (level >= 500) {
    const stars = Math.min(Math.floor((level - 400) / 100), 6);
    return {
      name: `Grandmaster ${"\u2605".repeat(stars)}`,
      badge: `grandmaster_star_${stars}`,
      color: "#FFD700",
      xpBonus: 500 + stars * 50,
      stars,
    };
  }

  return tiers.find((t) => level >= t.min && level <= t.max) || tiers[0];
}

// Get level duration based on level ID
export function getLevelDuration(levelId: number): number {
  if (levelId <= 5) return 30;
  if (levelId <= 10) return 45;
  if (levelId <= 20) return 60;
  if (levelId <= 35) return 90;
  if (levelId <= 50) return 120;
  if (levelId <= 75) return 150;
  if (levelId <= 100) return 180;
  if (levelId <= 200) return 240;
  return 300;
}

// Get target WPM based on level
export function getTargetWPM(levelId: number): number {
  if (levelId <= 10) return 100;
  if (levelId <= 25) return 120;
  if (levelId <= 50) return 130;
  if (levelId <= 100) return 140;
  return 150;
}
