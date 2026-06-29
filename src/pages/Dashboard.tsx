import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { localStorageDb } from "@/lib/db/localStorageDb";
import { getTierForLevel } from "@/lib/game/engine";
import { Progress } from "@/components/ui/progress";
import {
  Play, Trophy, Flame, Star, Target, Mic,
  Award, Zap, Crown, Gem, Sparkles, Clock
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load progress, badges, and sessions from local storage
  const [progress] = useState(() => localStorageDb.getProgress());
  const [myBadges] = useState(() => localStorageDb.getBadges());
  const [recentSessions] = useState(() => localStorageDb.getSessions().slice(0, 5));

  const tier = getTierForLevel(progress.currentLevel);
  const xpToNext = Math.floor(progress.currentLevel * 50);
  const currentXP = progress.totalXP;

  // Calculate relative XP within the current level
  let previousLevelsXP = 0;
  for (let i = 1; i < progress.currentLevel; i++) {
    previousLevelsXP += i * 50;
  }
  const relativeXP = Math.max(0, currentXP - previousLevelsXP);
  const xpProgress = Math.min(100, Math.round((relativeXP / xpToNext) * 100));

  const tierBgColors: Record<string, string> = {
    bronze: "bg-[#CD7F32]/20 text-[#CD7F32]",
    silver: "bg-[#C0C0C0]/20 text-[#C0C0C0]",
    gold: "bg-[#FFD700]/20 text-[#FFD700] border-yellow-500",
    platinum: "bg-[#E5E4E2]/20 text-[#E5E4E2]",
    diamond: "bg-[#B9F2FF]/20 text-[#60E0FF] border-[#60E0FF]",
    crown: "bg-[#FFD700]/20 text-[#FF9E00] border-[#FF9E00]",
  };

  const tierIcons: Record<string, React.ReactNode> = {
    bronze: <Award className="w-10 h-10 text-[#CD7F32]" />,
    silver: <Star className="w-10 h-10 text-[#C0C0C0]" />,
    gold: <Trophy className="w-10 h-10 text-[#FFD700]" />,
    platinum: <Gem className="w-10 h-10 text-[#E5E4E2]" />,
    diamond: <Sparkles className="w-10 h-10 text-[#B9F2FF]" />,
    crown: <Crown className="w-10 h-10 text-[#FFD700]" />,
  };

  return (
    <div className="w-full text-black dark:text-white">
      
      {/* Welcome Banner */}
      <div className="bg-[#EBF5FF] dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black mb-1">
              Welcome Back, {user?.name || "Guest Speaker"}!
            </h1>
            <p className="text-zinc-700 dark:text-zinc-300 font-bold text-sm">
              Keep practicing to master public speaking. You are currently in the <span className="underline decoration-2">{tier.name}</span> tier.
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-800 border-[3px] border-black px-4 py-2 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-center font-black shrink-0">
            Level {progress.currentLevel}
          </div>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
        
        {/* Left Column on Desktop (Col span 4) */}
        <div className="md:col-span-4 space-y-6">
          
          {/* Tier and XP Progress Card */}
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl border-2 border-black mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${tierBgColors[tier.badge] || 'bg-primary/20'}`}>
              {tierIcons[tier.badge] || <Award className="w-10 h-10 text-primary" />}
            </div>
            
            <h2 className="text-xl font-black mb-1">{tier.name}</h2>
            <p className="text-zinc-500 font-bold text-xs mb-4">Tier Level Rank</p>

            <div className="bg-[#FFFDF0] dark:bg-zinc-800 rounded-xl p-4 border-2 border-black">
              <div className="flex justify-between text-xs font-black mb-2">
                <span className="text-primary-foreground bg-primary px-2 py-0.5 rounded border border-black font-extrabold">{currentXP} XP</span>
                <span className="text-zinc-500">{xpToNext} XP to next level</span>
              </div>
              <Progress 
                value={xpProgress} 
                className="h-4 bg-zinc-200 dark:bg-zinc-800 border-2 border-black rounded-full overflow-hidden" 
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Streak", val: `${progress.streakDays}d`, icon: <Flame className="w-5 h-5 text-orange-500 fill-current" />, color: "bg-orange-100" },
              { label: "Sessions", val: progress.totalSessions, icon: <Mic className="w-5 h-5 text-blue-500" />, color: "bg-blue-100" },
              { label: "Peak Level", val: progress.highestLevel || progress.currentLevel, icon: <Target className="w-5 h-5 text-green-500" />, color: "bg-green-100" },
              { label: "Total XP", val: currentXP, icon: <Zap className="w-5 h-5 text-yellow-500 fill-current" />, color: "bg-yellow-100" },
            ].map((stat, idx) => (
              <div 
                key={idx} 
                className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] neo-interactive"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-1.5 rounded-lg border border-black ${stat.color} text-black shrink-0`}>
                    {stat.icon}
                  </div>
                  <span className="text-zinc-500 font-bold text-xs">{stat.label}</span>
                </div>
                <p className="text-2xl font-black text-black dark:text-white leading-none">{stat.val}</p>
              </div>
            ))}
          </div>

        </div>

        {/* Right Column on Desktop (Col span 8) */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Quick Actions / Start Practice (Neon Green Button style) */}
          <button
            onClick={() => navigate("/mirror")}
            className="w-full h-20 bg-primary text-black font-black text-xl rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex items-center justify-center gap-4 cursor-pointer"
          >
            <div className="bg-white p-2 rounded-xl border-2 border-black">
              <Play className="w-6 h-6 fill-current text-black" />
            </div>
            <span>Start Practice Session</span>
          </button>

          {/* Badges Section */}
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="flex items-center justify-between mb-4 border-b-2 border-zinc-100 dark:border-zinc-800 pb-3">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Award className="w-5 h-5 text-primary-foreground fill-primary" />
                Achievements & Badges
              </h2>
              <span className="bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg border-2 border-black text-xs font-black">
                {myBadges?.length || 0} earned
              </span>
            </div>

            {myBadges && myBadges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {myBadges.slice(0, 8).map((badge) => (
                  <div 
                    key={badge.badgeId} 
                    className="text-center p-3 bg-[#FFFDF0] dark:bg-zinc-800 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    title={badge.name}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-black flex items-center justify-center mx-auto mb-2 text-black">
                      <Award className="w-6 h-6 text-primary-foreground fill-primary" />
                    </div>
                    <p className="font-extrabold text-xs text-black dark:text-white truncate">{badge.name}</p>
                    <p className="text-[9px] text-zinc-500 truncate mt-0.5">{badge.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="w-12 h-12 text-zinc-300 mx-auto mb-2" />
                <p className="text-zinc-500 font-bold text-sm">Complete practice sessions to earn badges!</p>
              </div>
            )}
          </div>

          {/* Recent Activity Section */}
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <h2 className="text-lg font-black flex items-center gap-2 mb-4 border-b-2 border-zinc-100 dark:border-zinc-800 pb-3">
              <Clock className="w-5 h-5 text-secondary-foreground" />
              Recent Practice History
            </h2>

            {recentSessions && recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-[#FFFDF0] dark:bg-zinc-850 p-4 rounded-xl border-2 border-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 transition-transform"
                  >
                    <div>
                      <p className="font-black text-sm text-black dark:text-white">Level {session.levelId}</p>
                      <p className="text-zinc-500 text-xs font-bold mt-1">
                        {session.wordCount} words | {session.wpm} WPM | {session.fillerCount} fillers
                      </p>
                    </div>
                    <div className="text-left sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                      <div className="flex gap-0.5 mb-1 bg-white px-2 py-1 rounded border-2 border-black">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= session.stars ? "text-yellow-400 fill-yellow-400" : "text-zinc-200"}`}
                          />
                        ))}
                      </div>
                      <p className="text-green-600 dark:text-green-400 font-extrabold text-xs">+{session.xpEarned} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Mic className="w-12 h-12 text-zinc-300 mx-auto mb-2" />
                <p className="text-zinc-500 font-bold text-sm">No speaking sessions recorded yet.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
