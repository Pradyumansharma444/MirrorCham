import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useDevicePermissions } from "@/hooks/useDevicePermissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mic, Video, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Use our permission hook
  const { cameraStatus, micStatus, requestPermissions } = useDevicePermissions();
  const [hasPrompted, setHasPrompted] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Request permissions at startup
  useEffect(() => {
    const autoPrompt = async () => {
      if (!hasPrompted) {
        setHasPrompted(true);
        await requestPermissions();
      }
    };
    autoPrompt();
  }, [hasPrompted, requestPermissions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg("Please enter a name to start.");
      return;
    }
    
    // Ensure permissions are verified
    const result = await requestPermissions();
    if (!result.camera || !result.mic) {
      setErrorMsg("Camera and microphone permissions are required to start practice.");
      return;
    }

    login(username);
  };

  const isPermissionsGranted = cameraStatus === "granted" && micStatus === "granted";

  return (
    <div className="min-h-screen bg-[#FFFDF0] dark:bg-zinc-950 flex flex-col items-center justify-center p-6 font-sans">
      <Card className="w-full max-w-md bg-white dark:bg-zinc-900 border-[4px] border-black dark:border-white rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
        <CardHeader className="text-center pb-4 border-b-2 border-zinc-150 dark:border-zinc-800">
          <div className="w-16 h-16 bg-primary text-black rounded-2xl border-2 border-black flex items-center justify-center mx-auto mb-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Mic className="w-8 h-8 fill-current" />
          </div>
          <CardTitle className="text-2xl font-black">Get Started on MirrorUp</CardTitle>
          <CardDescription className="font-bold text-zinc-550 dark:text-zinc-400 mt-1">
            Analyze your speech to master public speaking.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          
          {/* Permission Status Box */}
          <div className="bg-[#EBF5FF] dark:bg-zinc-800 border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="font-black text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Device Access Setup
            </h3>
            <p className="text-[11px] font-bold text-zinc-650 dark:text-zinc-400 mb-3">
              MirrorUp needs camera and microphone access to perform speech audits.
            </p>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-700 p-2.5 rounded-lg border border-black text-xs font-bold">
                <Video className="w-4 h-4 text-blue-500" />
                <span className="flex-1">Camera</span>
                <span className={`w-2 h-2 rounded-full ${cameraStatus === "granted" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-700 p-2.5 rounded-lg border border-black text-xs font-bold">
                <Mic className="w-4 h-4 text-green-500" />
                <span className="flex-1">Microphone</span>
                <span className={`w-2 h-2 rounded-full ${micStatus === "granted" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              </div>
            </div>

            {!isPermissionsGranted && (
              <button
                onClick={() => requestPermissions()}
                type="button"
                className="w-full py-2 bg-white hover:bg-gray-50 border border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5"
              >
                <span>Request Permission Access</span>
              </button>
            )}

            {isPermissionsGranted && (
              <div className="text-[10px] text-green-600 dark:text-green-400 font-extrabold flex items-center gap-1 justify-center mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                <span>Media device clearance check successful!</span>
              </div>
            )}
          </div>

          {/* User Profile Creation Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name-input" className="font-extrabold text-sm block">Enter Your Name</label>
              <input
                id="name-input"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg("");
                }}
                placeholder="e.g., Rohit"
                className="w-full px-4 py-3 bg-[#FFFDF0] dark:bg-zinc-800 border-2 border-black rounded-xl font-bold placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black dark:text-white"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-100 text-red-700 border-2 border-red-500 rounded-xl text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-primary text-black font-black text-base rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start Practice Booth</span>
              <ArrowRight className="w-4 h-4 stroke-[3px]" />
            </button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
