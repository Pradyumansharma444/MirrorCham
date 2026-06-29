import React from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { 
  Home, Trophy, Mic, User, LogOut, Flame, Video
} from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { localStorageDb } from "@/lib/db/localStorageDb";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const currentPath = location.pathname;

  const progress = localStorageDb.getProgress();
  const streak = progress.streakDays || 0;

  const menuItems = [
    { label: "Home", path: "/dashboard", icon: Home },
    { label: "Board", path: "/leaderboard", icon: Trophy },
    { label: "Practice", path: "/mirror", icon: Mic, isCenter: true },
    { label: "Live", path: "/live", icon: Video },
    { label: "Profile", path: "/settings", icon: User },
  ];

  const handleNav = (path: string) => {
    if (path.includes("#")) {
      const [basePath, hash] = path.split("#");
      navigate(basePath);
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      navigate(path);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF0] dark:bg-zinc-950 flex flex-col font-sans selection:bg-primary/30">
      
      {/* Desktop Header */}
      <header className="hidden md:flex sticky top-0 z-40 bg-[#FFFDF0] dark:bg-zinc-950 border-b-[4px] border-black dark:border-white px-8 py-4 items-center justify-between">
        <div className="flex items-center gap-6">
          <div 
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 cursor-pointer select-none bg-primary text-black px-4 py-2 rounded-xl border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all duration-200"
          >
            <Mic className="w-5 h-5 fill-current" />
            <span className="font-extrabold text-xl tracking-tight">MirrorUp</span>
          </div>

          <nav className="flex items-center gap-2">
            {menuItems.map((item) => {
              const isActive = currentPath === item.path.split("#")[0];
              return (
                <button
                  key={item.label}
                  onClick={() => handleNav(item.path)}
                  className={`px-4 py-2 font-bold text-sm rounded-lg border-2 transition-all duration-200 ${
                    isActive
                      ? "bg-secondary text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-x-0.5 -translate-y-0.5"
                      : "border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-lg border-2 border-black dark:border-orange-500 font-extrabold text-sm neo-shadow-sm">
              <Flame className="w-4 h-4 fill-current" />
              <span>{streak}D Streak</span>
            </div>
          )}

          <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 px-4 py-1.5 rounded-xl border-[3px] border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
            <Avatar className="h-8 w-8 border-2 border-black">
              <AvatarFallback className="bg-primary text-black font-black text-xs">
                {user?.name?.charAt(0).toUpperCase() || "G"}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-xs font-black truncate max-w-[120px]">
                {user?.name || "Guest User"}
              </p>
              <p className="text-[10px] font-bold text-gray-500">
                Level {progress?.currentLevel || 1}
              </p>
            </div>
          </div>

          {user && (
            <button
              onClick={logout}
              className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg border-2 border-black transition-all hover:scale-105 active:scale-95"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile Top Bar */}
      <header className="flex md:hidden sticky top-0 z-40 bg-[#FFFDF0] dark:bg-zinc-950 border-b-[3px] border-black dark:border-white px-4 py-3 items-center justify-between">
        <div className="flex items-center gap-2" onClick={() => navigate("/dashboard")}>
          <div className="bg-primary text-black p-1.5 rounded-lg border-2 border-black">
            <Mic className="w-4 h-4 fill-current" />
          </div>
          <span className="font-black text-lg tracking-tight">MirrorUp</span>
        </div>

        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-orange-100 text-orange-600 px-2.5 py-1 rounded-lg border-2 border-black font-extrabold text-xs">
              <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
              <span>{streak}D</span>
            </div>
          )}
          <div className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center font-black text-xs text-black">
            {user?.name?.charAt(0).toUpperCase() || "G"}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col pb-20 md:pb-6 max-w-7xl w-full mx-auto p-4 md:p-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar (matches second image layout) */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-18 bg-[#FFFDF0] dark:bg-zinc-950 border-t-[3px] border-black dark:border-white z-50 items-center justify-around px-4 pb-safe">
        {menuItems.map((item) => {
          const isActive = currentPath === item.path.split("#")[0];
          
          if (item.isCenter) {
            return (
              <button
                key={item.label}
                onClick={() => handleNav(item.path)}
                className="relative -translate-y-4 flex items-center justify-center w-14 h-14 bg-[#0B354C] text-white rounded-2xl border-[3px] border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:scale-105 active:scale-95 transition-all duration-200"
                aria-label="Practice Speaking"
              >
                <item.icon className="w-7 h-7" />
              </button>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => handleNav(item.path)}
              className="flex flex-col items-center justify-center py-2 px-3 text-black dark:text-white"
            >
              <item.icon 
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? "scale-110 stroke-[2.5px] text-primary" : "opacity-75"
                }`} 
              />
              <span className={`text-[10px] mt-1 font-bold ${
                isActive ? "font-black text-black dark:text-white" : "text-gray-500"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
