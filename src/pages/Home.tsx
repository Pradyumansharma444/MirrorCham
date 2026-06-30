import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Trophy, Mic, Shield, Zap, Star,
  Activity, Sparkles
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#FFFDF0] dark:bg-zinc-950 text-black dark:text-white flex flex-col font-sans">
      
      {/* Header / Top Navigation */}
      <header className="w-full border-b-[4px] border-black dark:border-white px-6 py-4 flex justify-between items-center bg-white dark:bg-zinc-900 sticky top-0 z-50">
        <div className="flex items-center gap-2" onClick={() => navigate("/")}>
          <div className="bg-primary text-black p-2 rounded-xl border-2 border-black">
            <Mic className="w-5 h-5 fill-current" />
          </div>
          <span className="font-extrabold text-xl tracking-tight">MirrorUp</span>
        </div>
        <div>
          <Button
            onClick={() => navigate(user ? "/dashboard" : "/login")}
            className="font-bold border-2 border-black dark:border-white bg-white dark:bg-zinc-900 text-black dark:text-white neo-shadow-sm neo-interactive-sm py-2 px-4 rounded-xl"
          >
            {user ? "My Dashboard" : "Sign In"}
          </Button>
        </div>
      </header>

      {/* Main Hero (Exactly matching the first image style) */}
      <section className="flex-1 py-12 md:py-20 px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
        


        {/* Floating badge */}
        <div className="bg-[#D0E7FF] text-black px-4 py-1.5 rounded-md border-2 border-black font-bold text-xs md:text-sm mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          We Analyze, You Master
        </div>

        {/* Title (matching first image gradient style) */}
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 max-w-2xl leading-[1.1] text-black dark:text-white">
          MirrorUp <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 bg-clip-text text-transparent">plus</span> so much more.
        </h1>

        {/* Description */}
        <p className="text-zinc-700 dark:text-zinc-300 text-base md:text-xl font-bold max-w-2xl mb-8 leading-relaxed">
          Pace and filler words? Analyzed. Clarity and volume? Tracked. We handle the metrics so you can focus on mastering your voice and speaking with confidence.
        </p>

        {/* Green Neobrutalist Button (matching first image button) */}
        <button
          onClick={() => navigate("/mirror")}
          className="w-full sm:w-auto px-8 py-4 bg-primary text-black font-black text-xl rounded-xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer"
        >
          <div className="bg-white p-1.5 rounded-lg border-2 border-black">
            <Mic className="w-5 h-5" />
          </div>
          <span>Start Practice</span>
        </button>

        <p className="text-zinc-500 text-xs font-bold mt-4">Free to use. No signup required.</p>
      </section>

      {/* How it Works / Features Section */}
      <section className="bg-white dark:bg-zinc-900 border-t-[4px] border-black dark:border-white py-12 md:py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Upgrade Your Speaking</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Mic className="w-6 h-6 text-black" />,
                bg: "bg-blue-200",
                title: "Speak to Your Reflection",
                desc: "Use your camera as a mirror. Gain critical confidence by watching your gestures and posture.",
              },
              {
                icon: <Activity className="w-6 h-6 text-black" />,
                bg: "bg-green-200",
                title: "Real-time AI Feedback",
                desc: "Get instant analytics on speed (WPM), clarity, vocabulary choices, and pause durations.",
              },
              {
                icon: <Zap className="w-6 h-6 text-black" />,
                bg: "bg-yellow-200",
                title: "Level Progression",
                desc: "Complete challenges, earn experience points, and climb through the leaderboard ranks.",
              },
              {
                icon: <Shield className="w-6 h-6 text-black" />,
                bg: "bg-purple-200",
                title: "100% Local & Private",
                desc: "All audio analysis runs directly on your local device. No data or voice files ever leave.",
              },
              {
                icon: <Star className="w-6 h-6 text-black" />,
                bg: "bg-pink-200",
                title: "1000+ Level Database",
                desc: "From short speech intros to expert debates, structured training helps you grow step-by-step.",
              },
              {
                icon: <Sparkles className="w-6 h-6 text-black" />,
                bg: "bg-teal-200",
                title: "Earn Achievement Badges",
                desc: "Unlock specific milestones like 'Filler Slayer' or 'Vocab King' as you improve.",
              },
            ].map((feature, i) => (
              <div 
                key={i} 
                className="bg-[#FFFDF0] dark:bg-zinc-800 p-6 rounded-2xl border-[3px] border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col items-start gap-4"
              >
                <div className={`p-3 rounded-xl border-2 border-black ${feature.bg} text-black`}>
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg mb-1">{feature.title}</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm font-bold leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rank Progression */}
      <section className="py-12 md:py-20 px-6 max-w-4xl mx-auto w-full">
        <div className="bg-[#EBF5FF] dark:bg-zinc-800 text-black dark:text-white p-8 rounded-2xl border-[3px] border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-black text-center mb-6">Rank Progression System</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { name: "Bronze", color: "bg-[#CD7F32]" },
              { name: "Silver", color: "bg-[#C0C0C0]" },
              { name: "Gold", color: "bg-[#FFD700]" },
              { name: "Platinum", color: "bg-[#E5E4E2]" },
              { name: "Diamond", color: "bg-[#B9F2FF]" },
              { name: "Crown", color: "bg-[#FFBB00]" },
            ].map((tier, i) => (
              <div key={i} className="text-center">
                <div className={`w-12 h-12 rounded-xl mx-auto mb-2 border-2 border-black ${tier.color} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`} />
                <p className="font-black text-xs">{tier.name}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center mt-6 gap-2 text-zinc-600 dark:text-zinc-400">
            <Trophy className="w-5 h-5" />
            <p className="text-sm font-bold">Reach Level 1000+ to become a Legendary Orator</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t-[4px] border-black dark:border-white py-6 bg-white dark:bg-zinc-900 text-center font-bold text-sm">
        <p className="text-zinc-600 dark:text-zinc-400">© 2026 MirrorUp. Developed for Maximum Speech Impact.</p>
      </footer>
    </div>
  );
}
