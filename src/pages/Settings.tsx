import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { localStorageDb } from "@/lib/db/localStorageDb";
import type { SessionRecord, ApiConfig } from "@/lib/db/localStorageDb";
import { useDevicePermissions } from "@/hooks/useDevicePermissions";
import {
  ArrowLeft, Shield, Mic, Camera, Bell, Moon,
  HelpCircle, FileText, Trash2, LogOut, BookOpen, Star, Settings as SettingsIcon, Save
} from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Permissions state from hook
  const { cameraStatus, micStatus, requestPermissions } = useDevicePermissions();
  const [cameraSwitch, setCameraSwitch] = useState(cameraStatus === "granted");
  const [micSwitch, setMicSwitch] = useState(micStatus === "granted");

  // Local state for preferences
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // API Configurations from LocalStorage
  const [apiConfig] = useState<ApiConfig>(() => localStorageDb.getApiConfig());
  const [apiKey, setApiKey] = useState(apiConfig.apiKey || "");
  const [apiType, setApiType] = useState<"gemini" | "openai">(apiConfig.apiType || "gemini");
  const [saveStatus, setSaveStatus] = useState("");

  // Fetch recent sessions from local database
  const [recentSessions] = useState<SessionRecord[]>(() => localStorageDb.getSessions());

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setCameraSwitch(cameraStatus === "granted");
    setMicSwitch(micStatus === "granted");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [cameraStatus, micStatus]);

  // Handle hash scroll for #history
  useEffect(() => {
    if (window.location.hash === "#history") {
      const el = document.getElementById("history");
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, 200);
      }
    }
  }, []);

  const handleCameraToggle = async (checked: boolean) => {
    if (checked) {
      const res = await requestPermissions();
      setCameraSwitch(res.camera);
    } else {
      setCameraSwitch(false);
    }
  };

  const handleMicToggle = async (checked: boolean) => {
    if (checked) {
      const res = await requestPermissions();
      setMicSwitch(res.mic);
    } else {
      setMicSwitch(false);
    }
  };

  const handleSaveApi = () => {
    localStorageDb.setApiConfig({
      apiKey: apiKey.trim(),
      apiType
    });
    setSaveStatus("API Config saved successfully!");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  const handleClearDb = () => {
    if (window.confirm("Are you sure you want to delete all local practice data, badges, and progress? This action is irreversible.")) {
      localStorageDb.clearAll();
      logout();
    }
  };

  return (
    <div className="w-full text-black dark:text-white space-y-6">
      
      {/* Header card */}
      <div className="bg-[#FFFDF0] dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
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
              <SettingsIcon className="w-7 h-7 text-zinc-700" />
              App Settings & History
            </h1>
            <p className="text-zinc-650 dark:text-zinc-300 font-bold text-xs md:text-sm">
              Configure device access, manage preferences, and review your practice logs.
            </p>
          </div>
        </div>
      </div>

      {/* Grid layout for Desktop vs Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
        
        {/* Left Column (Col span 5): Preferences & Switches */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Account Profile Card */}
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <h2 className="text-sm font-black uppercase tracking-wider mb-4 border-b-2 pb-2">Account</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 border-2 border-black flex items-center justify-center text-black font-black text-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {user?.name?.[0]?.toUpperCase() || "G"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-base truncate">{user?.name || "Guest Speaker"}</p>
                <p className="text-xs font-bold text-zinc-550 dark:text-zinc-400">Playing as Local User</p>
              </div>
            </div>
            <button
              onClick={handleClearDb}
              className="w-full py-2.5 px-4 bg-red-100 hover:bg-red-200 text-red-650 rounded-xl border-2 border-black font-extrabold text-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-transform"
            >
              <LogOut className="w-4 h-4" />
              <span>Reset Profile & Sign Out</span>
            </button>
          </div>

          {/* AI API Configuration Card */}
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <h2 className="text-sm font-black uppercase tracking-wider mb-4 border-b-2 pb-2">AI API Configuration</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-extrabold text-xs block">AI Provider Type</label>
                <select
                  value={apiType}
                  onChange={(e) => setApiType(e.target.value as "gemini" | "openai")}
                  className="w-full px-3 py-2 bg-[#FFFDF0] dark:bg-zinc-800 border-2 border-black rounded-lg text-xs font-bold focus:outline-none"
                >
                  <option value="gemini">Google Gemini AI</option>
                  <option value="openai">OpenAI ChatGPT</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-extrabold text-xs block">Custom Developer API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API secret key..."
                  className="w-full px-3 py-2 bg-[#FFFDF0] dark:bg-zinc-800 border-2 border-black rounded-lg text-xs font-bold placeholder:text-zinc-400 focus:outline-none"
                />
              </div>

              {saveStatus && (
                <p className="text-green-600 dark:text-green-400 font-extrabold text-[11px] text-center">{saveStatus}</p>
              )}

              <button
                onClick={handleSaveApi}
                className="w-full py-2 bg-primary text-black font-black text-xs rounded-xl border-2 border-black flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save API Configuration</span>
              </button>
            </div>
          </div>

          {/* Device Permissions */}
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <h2 className="text-sm font-black uppercase tracking-wider mb-4 border-b-2 pb-2">Permissions</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Camera className="w-5 h-5 text-blue-500" />
                  <span className="font-extrabold text-sm">Enable Camera</span>
                </div>
                <Switch checked={cameraSwitch} onCheckedChange={handleCameraToggle} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Mic className="w-5 h-5 text-green-500" />
                  <span className="font-extrabold text-sm">Enable Microphone</span>
                </div>
                <Switch checked={micSwitch} onCheckedChange={handleMicToggle} />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <h2 className="text-sm font-black uppercase tracking-wider mb-4 border-b-2 pb-2">Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-5 h-5 text-yellow-500" />
                  <span className="font-extrabold text-sm">System Notifications</span>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Moon className="w-5 h-5 text-purple-500" />
                  <span className="font-extrabold text-sm">High Contrast Mode</span>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>
            </div>
          </div>

          {/* Privacy Card */}
          <div className="bg-[#EBF5FF] dark:bg-zinc-800 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black dark:text-white">
            <div className="flex gap-3 items-start mb-3">
              <Shield className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-sm">Local Speech Processing</h3>
                <p className="text-xs font-bold text-zinc-650 dark:text-zinc-400 mt-1 leading-relaxed">
                  All vocal analyses and transcriber modules execute inside your web browser. No raw audio samples are transmitted or stored remotely.
                </p>
              </div>
            </div>
            <button 
              onClick={handleClearDb}
              className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl border-2 border-black font-extrabold text-xs flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Local Storage Database</span>
            </button>
          </div>

        </div>

        {/* Right Column (Col span 7): Practice History Logs */}
        <div className="md:col-span-7 space-y-6">
          
          {/* History Card anchor */}
          <div 
            id="history"
            className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
          >
            <h2 className="text-lg font-black flex items-center gap-2 mb-4 border-b-2 pb-3">
              <BookOpen className="w-5 h-5 text-primary-foreground fill-primary" />
              Comprehensive Practice History
            </h2>

            {recentSessions && recentSessions.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-[#FFFDF0] dark:bg-zinc-800 p-4 rounded-xl border-2 border-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">Level {session.levelId}</span>
                        <span className="text-[10px] font-black bg-secondary px-1.5 py-0.5 rounded border border-black">
                          {session.wordCount} words
                        </span>
                      </div>
                      <p className="text-zinc-500 text-[11px] font-bold mt-1">
                        Pace: {session.wpm} WPM | Fillers: {session.fillerCount} | Quality: {session.overallScore}%
                      </p>
                    </div>
                    <div className="text-left sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                      <div className="flex gap-0.5 bg-white px-2 py-0.5 rounded border border-black mb-1">
                        {[1, 2, 3].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${s <= session.stars ? "text-yellow-400 fill-yellow-400" : "text-zinc-200"}`}
                          />
                        ))}
                      </div>
                      <p className="text-green-600 dark:text-green-400 font-extrabold text-[11px]">+{session.xpEarned} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-zinc-300 mx-auto mb-2" />
                <p className="text-zinc-500 font-bold">No sessions found in history logs.</p>
              </div>
            )}
          </div>

          {/* FAQ & Support links */}
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <h2 className="text-sm font-black uppercase tracking-wider mb-4 border-b-2 pb-2">Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => navigate("/dashboard")}
                className="p-4 bg-[#FFFDF0] hover:bg-gray-50 rounded-xl border-2 border-black flex flex-col items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <HelpCircle className="w-6 h-6 text-blue-500" />
                <span className="font-extrabold text-xs">Help & FAQ</span>
              </button>
              <button className="p-4 bg-[#FFFDF0] hover:bg-gray-50 rounded-xl border-2 border-black flex flex-col items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <FileText className="w-6 h-6 text-green-500" />
                <span className="font-extrabold text-xs">Privacy Policy</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      <p className="text-center text-zinc-500 text-xs font-bold pt-4">MirrorUp Client App Version 1.0.0</p>
    </div>
  );
}
