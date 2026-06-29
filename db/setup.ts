import { getDb } from "../api/queries/connection";
import { users, userProfiles, sessions, badges, userBadges, leaderboardEntries } from "./schema";
import * as schema from "./schema";

async function setup() {
  const db = getDb();
  console.log("Setting up database...");

  // Drop tables in reverse dependency order
  try {
    await db.delete(leaderboardEntries);
    console.log("Cleared leaderboard_entries");
  } catch { /* ignore */ }
  try {
    await db.delete(userBadges);
    console.log("Cleared user_badges");
  } catch { /* ignore */ }
  try {
    await db.delete(sessions);
    console.log("Cleared sessions");
  } catch { /* ignore */ }
  try {
    await db.delete(userProfiles);
    console.log("Cleared user_profiles");
  } catch { /* ignore */ }
  try {
    await db.delete(badges);
    console.log("Cleared badges");
  } catch { /* ignore */ }

  // Insert default badges
  const badgeData = [
    { badgeId: "first_talk", name: "First Talk", description: "Complete your first speaking session.", category: "milestone", icon: "mic", tier: 1 },
    { badgeId: "pace_setter", name: "Pace Setter", description: "Maintain 130-150 WPM for 10 consecutive sessions.", category: "skill", icon: "gauge", tier: 2 },
    { badgeId: "filler_slayer", name: "Filler Slayer", description: "Complete a 2-minute talk with zero filler words.", category: "skill", icon: "sword", tier: 3 },
    { badgeId: "vocab_king", name: "Vocab King/Queen", description: "Use 10+ advanced words in a single session.", category: "skill", icon: "crown", tier: 3 },
    { badgeId: "unshakable", name: "Unshakable", description: "Speak for 3 minutes without pauses longer than 1 second.", category: "skill", icon: "shield", tier: 3 },
    { badgeId: "streak_guardian", name: "Streak Guardian", description: "Maintain a 30-day practice streak.", category: "milestone", icon: "flame", tier: 4 },
    { badgeId: "streak_week", name: "Week Warrior", description: "Maintain a 7-day practice streak.", category: "milestone", icon: "flame", tier: 2 },
    { badgeId: "level_10", name: "Bronze Graduate", description: "Reach Level 10.", category: "rank", icon: "award", tier: 1 },
    { badgeId: "level_20", name: "Silver Star", description: "Reach Level 20.", category: "rank", icon: "star", tier: 2 },
    { badgeId: "level_50", name: "Golden Voice", description: "Reach Level 50.", category: "rank", icon: "trophy", tier: 3 },
    { badgeId: "level_100", name: "Platinum Speaker", description: "Reach Level 100.", category: "rank", icon: "gem", tier: 4 },
    { badgeId: "level_150", name: "Diamond Orator", description: "Reach Level 150.", category: "rank", icon: "diamond", tier: 4 },
    { badgeId: "level_200", name: "Crown of Clarity", description: "Reach Level 200.", category: "rank", icon: "crown", tier: 5 },
    { badgeId: "perfect_3_star", name: "Triple Threat", description: "Earn 3 stars on 3 consecutive levels.", category: "skill", icon: "star", tier: 3 },
    { badgeId: "no_filler_5", name: "Clean Speaker", description: "Complete 5 sessions with zero filler words.", category: "skill", icon: "sparkles", tier: 2 },
    { badgeId: "vocab_5_session", name: "Word Weaver", description: "Use 5+ advanced words in 5 consecutive sessions.", category: "skill", icon: "book", tier: 2 },
    { badgeId: "speed_demon", name: "Speed Demon", description: "Speak at 180+ WPM while maintaining clarity above 80.", category: "skill", icon: "zap", tier: 3 },
    { badgeId: "slow_steady", name: "Slow and Steady", description: "Speak at 90-110 WPM for a full 5-minute session with no fillers.", category: "skill", icon: "turtle", tier: 3 },
    { badgeId: "marathon", name: "Marathon Speaker", description: "Complete a 5-minute session without stopping.", category: "milestone", icon: "timer", tier: 3 },
    { badgeId: "comeback_kid", name: "Comeback Kid", description: "Improve your score by 20+ points on a replayed level.", category: "skill", icon: "trending-up", tier: 2 },
    { badgeId: "night_owl", name: "Night Owl", description: "Practice after 10 PM.", category: "fun", icon: "moon", tier: 1 },
    { badgeId: "early_bird", name: "Early Bird", description: "Practice before 7 AM.", category: "fun", icon: "sun", tier: 1 },
    { badgeId: "weekend_warrior", name: "Weekend Warrior", description: "Practice on both Saturday and Sunday.", category: "fun", icon: "calendar", tier: 1 },
    { badgeId: "centurion", name: "Centurion", description: "Complete 100 total sessions.", category: "milestone", icon: "target", tier: 4 },
    { badgeId: "xp_10k", name: "XP Hoarder", description: "Accumulate 10,000 total XP.", category: "milestone", icon: "coins", tier: 3 },
  ];

  for (const badge of badgeData) {
    try {
      await db.insert(badges).values(badge);
    } catch (e) {
      console.log(`Badge ${badge.badgeId} may already exist`);
    }
  }

  console.log("Setup complete!");
}

setup().catch(console.error);
