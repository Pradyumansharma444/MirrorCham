import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { localStorageDb } from "@/lib/db/localStorageDb";
import { useAuth } from "@/hooks/useAuth";
import { getTierForLevel } from "@/lib/game/engine";
import {
  ArrowLeft, Trophy, Medal, Award, Star,
  Flame, Crown, Gem, Sparkles, AlertCircle
} from "lucide-react";

const tierIconMap: Record<string, React.ReactNode> = {
  bronze: <Award className="w-5 h-5 text-[#CD7F32]" />,
  silver: <Medal className="w-5 h-5 text-[#C0C0C0]" />,
  gold: <Trophy className="w-5 h-5 text-[#FFD700]" />,
  platinum: <Gem className="w-5 h-5 text-[#E5E4E2]" />,
  diamond: <Sparkles className="w-5 h-5 text-[#B9F2FF]" />,
  crown: <Crown className="w-5 h-5 text-[#FFD700]" />,
};

const rankBadgeColors: Record<number, string> = {
  1: "bg-yellow-100 text-yellow-600 border-yellow-400",
  2: "bg-gray-100 text-gray-600 border-gray-400",
  3: "bg-orange-100 text-orange-600 border-orange-400",
};

interface LeaderboardEntry {
  id: string;
  username: string;
  currentLevel: number;
  totalXP: number;
  streakDays: number;
  rank: number;
  isCurrentUser?: boolean;
}

// Static mock competitors
const MOCK_COMPETITORS: Omit<LeaderboardEntry, "rank">[] = [
  { id: "comp_1", username: "VocalVirtuoso", currentLevel: 45, totalXP: 2450, streakDays: 14 },
  { id: "comp_2", username: "SpeechMaster", currentLevel: 32, totalXP: 1850, streakDays: 7 },
  { id: "comp_3", username: "ClarityPro", currentLevel: 28, totalXP: 1420, streakDays: 9 },
  { id: "comp_4", username: "FluentSophia", currentLevel: 21, totalXP: 1100, streakDays: 4 },
  { id: "comp_5", username: "EchoOrator", currentLevel: 15, totalXP: 820, streakDays: 5 },
  { id: "comp_6", username: "PaceKeeper", currentLevel: 12, totalXP: 610, streakDays: 2 },
  { id: "comp_7", username: "DebateLord", currentLevel: 8, totalXP: 450, streakDays: 0 },
  { id: "comp_8", username: "ConfidenceKing", currentLevel: 5, totalXP: 280, streakDays: 3 },
  { id: "comp_9", username: "SpeechBeginner", currentLevel: 3, totalXP: 150, streakDays: 1 },
];

export default function Leaderboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const leaderboard = useMemo(() => {
    const progress = localStorageDb.getProgress();
    const currentUserName = user?.name || "You";

    // 1. Build list with static competitors + current user
    const combined: Omit<LeaderboardEntry, "rank">[] = [
      ...MOCK_COMPETITORS,
      {
        id: "current_user",
        username: `${currentUserName} (You)`,
        currentLevel: progress.currentLevel,
        totalXP: progress.totalXP,
        streakDays: progress.streakDays,
        isCurrentUser: true,
      },
    ];

    // 2. Sort by total XP descending
    combined.sort((a, b) => b.totalXP - a.totalXP);

    // 3. Map ranks
    return combined.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  }, [user]);

  return (
    <div className="w-full text-black dark:text-white space-y-6">
      
      {/* Header card */}
      <div className="bg-[#FFFDF0] dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              size="icon"
              className="border-2 border-black bg-white text-black hover:bg-gray-100 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black mb-1 flex items-center gap-2">
                <Trophy className="w-7 h-7 text-yellow-500 fill-current" />
                Global Leaderboard
              </h1>
              <p className="text-zinc-650 dark:text-zinc-300 font-bold text-xs md:text-sm">
                Ranked by total experience points (XP) earned from sessions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
        
        {/* Info Column (Desktop side banner) */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-[#EBF5FF] dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <h2 className="text-lg font-black mb-3">Compete Globally</h2>
            <p className="text-xs font-bold leading-relaxed text-zinc-700 dark:text-zinc-300">
              Practice every day to maintain your streak and accumulate XP. Top rankers earn custom recognition and exclusive achievements.
            </p>
            <div className="mt-4 p-3 bg-white dark:bg-zinc-800 rounded-xl border-2 border-black flex gap-2 items-start">
              <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold text-zinc-500">
                Leaderboard updates in real-time. Practice sessions must earn at least 1 star to count towards XP.
              </p>
            </div>
          </div>

          {/* Podiums preview card */}
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-center hidden md:block">
            <h3 className="font-black text-sm mb-4">Rank #1 Medal</h3>
            <div className="inline-flex w-16 h-16 rounded-full bg-yellow-100 border-2 border-yellow-500 text-yellow-600 items-center justify-center font-black text-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              1st
            </div>
            <p className="text-xs font-bold mt-3 text-zinc-500">The crown belongs to the active talkers!</p>
          </div>
        </div>

        {/* List Column (Desktop col span 8) */}
        <div className="md:col-span-8">
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="space-y-3">
              {leaderboard.map((entry) => {
                const tier = getTierForLevel(entry.currentLevel);
                const isTopThree = entry.rank <= 3;
                
                return (
                  <div
                    key={entry.id}
                    className={`p-4 rounded-xl border-2 border-black flex items-center gap-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                      entry.isCurrentUser 
                        ? "bg-primary border-primary-foreground text-black border-4" 
                        : "bg-[#FFFDF0] dark:bg-zinc-800"
                    } ${
                      isTopThree && !entry.isCurrentUser ? "border-l-8" : ""
                    } ${
                      entry.rank === 1 && !entry.isCurrentUser ? "border-l-yellow-400" :
                      entry.rank === 2 && !entry.isCurrentUser ? "border-l-gray-400" :
                      entry.rank === 3 && !entry.isCurrentUser ? "border-l-orange-400" : ""
                    }`}
                  >
                    {/* Rank badge */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border-2 border-black shrink-0 shadow-sm ${
                      rankBadgeColors[entry.rank] || "bg-white text-zinc-500"
                    }`}>
                      {entry.rank}
                    </div>

                    {/* User metadata */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">{entry.username}</p>
                      <div className={`flex items-center gap-2 text-xs font-bold mt-0.5 ${entry.isCurrentUser ? 'text-black/80' : 'text-zinc-500'}`}>
                        <span className="flex items-center gap-1">
                          {tierIconMap[tier.badge] || <Star className="w-3.5 h-3.5" />}
                          {tier.name}
                        </span>
                        <span>|</span>
                        <span>Lv.{entry.currentLevel}</span>
                        {entry.streakDays > 0 && (
                          <>
                            <span>|</span>
                            <span className="flex items-center gap-0.5 text-orange-500 fill-current">
                              <Flame className="w-3.5 h-3.5 fill-current" />
                              {entry.streakDays}d
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Score XP */}
                    <div className="text-right shrink-0">
                      <p className="text-primary-foreground bg-white dark:bg-zinc-900 px-2 py-0.5 rounded border border-black font-extrabold text-xs shadow-sm">
                        {entry.totalXP.toLocaleString()}
                      </p>
                      <p className={`text-[10px] font-bold mt-1 ${entry.isCurrentUser ? 'text-black/80' : 'text-zinc-400'}`}>XP</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
