export interface Prompt {
  id: number;
  text: string;
  difficulty: number;
  category: string;
  constraints: string[];
  duration: number;
}

export interface Constraint {
  id: string;
  name: string;
  description: string;
  minLevel: number;
  difficulty: number;
}

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: number;
  icon: string;
}

export interface FeedbackRule {
  id: string;
  metric: string;
  condition: string;
  severity: "success" | "info" | "warning" | "danger";
  message: string;
  tip: string;
  badgeCheck: string | null;
}

export interface SessionMetrics {
  wordCount: number;
  wpm: number;
  fillerCount: number;
  fillerWords: string[];
  advancedWordCount: number;
  advancedWordsUsed: string[];
  paceScore: number;
  clarityScore: number;
  vocabScore: number;
  confidenceScore: number;
  toneScore: number;
  overallScore: number;
  pauseCount: number;
  avgVolume: number;
  pitchVariation: number;
  transcript: string;
  duration: number;
}

export interface SessionResult {
  metrics: SessionMetrics;
  xpEarned: number;
  stars: number;
  constraintMet: boolean;
  feedback: FeedbackItem[];
}

export interface FeedbackItem {
  metric: string;
  severity: "success" | "info" | "warning" | "danger";
  message: string;
  tip: string;
}

export interface TierInfo {
  name: string;
  badge: string;
  color: string;
  xpBonus: number;
  stars?: number;
}

export interface UserProgress {
  currentLevel: number;
  highestLevel: number;
  totalXP: number;
  streakDays: number;
  lastPracticeDate: string | null;
  longestStreak: number;
  totalSessions: number;
  totalSpeakingTime: number;
  tier: TierInfo;
}
