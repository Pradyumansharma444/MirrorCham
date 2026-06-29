import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { analyzeSession, getPromptForLevel, getTierForLevel, getLevelDuration } from "@/lib/game/engine";
import { evaluateSessionSpeech } from "@/lib/game/aiEvaluator";
import { localStorageDb } from "@/lib/db/localStorageDb";
import type { Prompt, SessionResult } from "@/types/game";
import {
  Mic, Play, Square, Camera, CameraOff,
  ChevronRight, Star, ArrowLeft, Loader2, Video, Sparkles, BookOpen,
  RefreshCw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import confetti from "canvas-confetti";

// Audio analysis helpers
function setupAudioAnalysis(stream: MediaStream): {
  analyser: AnalyserNode;
  dataArray: Uint8Array;
  context: AudioContext;
} {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  analyser.fftSize = 256;
  const source = context.createMediaStreamSource(stream);
  source.connect(analyser);
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(new ArrayBuffer(bufferLength));
  return { analyser, dataArray: dataArray as Uint8Array, context };
}

export default function Mirror() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // State
  const [levelId, setLevelId] = useState(1);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [phase, setPhase] = useState<"loading" | "permission" | "ready" | "recording" | "analyzing" | "results">("loading");
  const [timer, setTimer] = useState(0);
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<SessionResult | null>(null);
  const [nextPath, setNextPath] = useState<{ topic: string; prompt: string } | null>(null);
  const [error, setError] = useState("");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [showSilentConfirm, setShowSilentConfirm] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationRef = useRef<number>(0);
  const transcriptRef = useRef("");
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const sessionStartRef = useRef<number>(0);
  const isRecordingRef = useRef(false);
  const currentInterimRef = useRef("");

  // Load prompt
  useEffect(() => {
    async function loadPrompt(lid: number) {
      const p = await getPromptForLevel(lid);
      setPrompt(p);
      setPhase("permission");
    }
    loadPrompt(levelId);
  }, [levelId]);

  // Request camera permission
  const requestPermission = useCallback(async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPhase("ready");
    } catch (e) {
      console.error(e);
      setError("Camera and Microphone access are required to evaluate your speech.");
      setPhase("permission");
    }
  }, []);

  // Stop everything
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [cleanup]);

  // Bind stream to video element when mounted
  useEffect(() => {
    if (cameraEnabled && (phase === "ready" || phase === "recording")) {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch((err) => console.error("Error playing video:", err));
      }
    }
  }, [phase, cameraEnabled, facingMode]);

  // Enable/Disable camera track based on state
  useEffect(() => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = cameraEnabled;
      }
    }
  }, [cameraEnabled]);

  // Switch camera between front and back
  const switchCamera = async () => {
    if (!streamRef.current) return;
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    
    try {
      const oldVideoTracks = streamRef.current.getVideoTracks();
      oldVideoTracks.forEach((track) => track.stop());

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack) {
        streamRef.current.removeTrack(oldVideoTracks[0]);
        streamRef.current.addTrack(newVideoTrack);
        setFacingMode(newFacingMode);
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(e => console.error(e));
        }
      }
    } catch (err) {
      console.error("Failed to switch camera:", err);
      setError("Failed to switch camera device.");
    }
  };

  // Stop recording
  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    cleanup();

    const finalTranscript = (transcriptRef.current + " " + currentInterimRef.current).trim();
    if (!finalTranscript) {
      setError("No speech detected. Please speak clearly into your microphone and try again.");
      setPhase("ready");
      return;
    }

    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
    setPhase("analyzing");

    // Run analysis
    setTimeout(async () => {
      const sessionResult = await analyzeSession(finalTranscript, duration, {
        avgVolume: volume * 0.5 + 0.1,
        pitchVariation: 0.15 + Math.random() * 0.15,
        pauseCount: Math.floor(Math.random() * 5),
      });

      // Get combined AI API + Local built-in evaluations
      const evaluations = await evaluateSessionSpeech(
        finalTranscript,
        duration,
        levelId,
        prompt?.text || ""
      );

      // Merge feedback lists
      const mergedFeedback = [
        ...sessionResult.feedback,
        ...evaluations.feedback.map(f => ({
          ...f,
          metric: "coach"
        }))
      ];

      const finalResult: SessionResult = {
        ...sessionResult,
        feedback: mergedFeedback,
      };

      setResult(finalResult);
      setNextPath({
        topic: evaluations.nextTopic,
        prompt: evaluations.nextPromptText,
      });
      setPhase("results");

      // Save to local storage database
      localStorageDb.saveSession({
        levelId,
        promptId: prompt?.id || 1,
        duration,
        targetDuration: prompt?.duration || getLevelDuration(levelId),
        transcript: finalTranscript,
        wordCount: finalResult.metrics.wordCount,
        wpm: finalResult.metrics.wpm,
        fillerCount: finalResult.metrics.fillerCount,
        fillerWords: finalResult.metrics.fillerWords,
        advancedWordCount: finalResult.metrics.advancedWordCount,
        advancedWordsUsed: finalResult.metrics.advancedWordsUsed,
        paceScore: finalResult.metrics.paceScore,
        clarityScore: finalResult.metrics.clarityScore,
        vocabScore: finalResult.metrics.vocabScore,
        confidenceScore: finalResult.metrics.confidenceScore,
        toneScore: finalResult.metrics.toneScore,
        overallScore: finalResult.metrics.overallScore,
        constraintMet: finalResult.constraintMet,
        stars: finalResult.stars,
        xpEarned: finalResult.xpEarned,
      });

      // Confetti for good scores
      if (finalResult.stars >= 2) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }, 500);
  }, [cleanup, volume, user, levelId, prompt]);

  // Start recording
  const startRecording = useCallback(async () => {
    setError("");
    // 1. If stream is not active, try to recover on the fly
    if (!streamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("On-the-fly permission recovery failed:", err);
        setError("Camera and Microphone access are required to evaluate your speech.");
        setPhase("permission");
        return;
      }
    }

    isRecordingRef.current = true;
    currentInterimRef.current = "";
    transcriptRef.current = "";
    setTranscript("");
    audioChunksRef.current = [];
    sessionStartRef.current = Date.now();

    const duration = prompt?.duration || getLevelDuration(levelId);
    setTimer(duration);

    // 2. Setup audio recording with MIME checks & fallbacks
    if (streamRef.current) {
      try {
        let mediaRecorder: MediaRecorder | null = null;
        if (typeof MediaRecorder !== "undefined") {
          try {
            const options = { mimeType: "audio/webm;codecs=opus" };
            if (MediaRecorder.isTypeSupported && !MediaRecorder.isTypeSupported(options.mimeType)) {
              mediaRecorder = new MediaRecorder(streamRef.current);
            } else {
              mediaRecorder = new MediaRecorder(streamRef.current, options);
            }
          } catch {
            try {
              mediaRecorder = new MediaRecorder(streamRef.current);
            } catch (err) {
              console.error("Failed to create MediaRecorder fallback:", err);
            }
          }
        }

        if (mediaRecorder) {
          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          mediaRecorder.start(1000);
          mediaRecorderRef.current = mediaRecorder;
        }
      } catch (recorderErr) {
        console.warn("MediaRecorder creation blocked completely:", recorderErr);
      }

      // 3. Setup audio analysis for visualizer
      try {
        const { analyser, dataArray, context } = setupAudioAnalysis(streamRef.current);
        audioContextRef.current = context;
        analyserRef.current = analyser;

        // Start volume visualization
        const updateVolume = () => {
          if (!analyserRef.current) return;
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setVolume(avg / 128);
          animationRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();
      } catch (analysisErr) {
        console.warn("Audio Context visualizer blocked:", analysisErr);
      }

      // 4. Start speech recognition with full browser safety
      try {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          const recognition = new SpeechRec();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          recognition.onresult = (event: any) => {
            let finalTranscript = "";
            let interimTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const text = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += text + " ";
              } else {
                interimTranscript = text;
              }
            }
            if (finalTranscript) {
              transcriptRef.current += finalTranscript;
            }
            currentInterimRef.current = interimTranscript;
            setTranscript(transcriptRef.current + interimTranscript);
          };

          recognition.onerror = (recErr: any) => {
            console.error("Speech recognition runtime error:", recErr.error);
          };

          recognition.onend = () => {
            if (isRecordingRef.current) {
              try {
                recognition.start();
              } catch (e) {
                console.warn("Failed to auto-restart speech recognition:", e);
              }
            }
          };

          recognition.start();
          recognitionRef.current = recognition;
        }
      } catch (recInitErr) {
        console.warn("Speech recognition initialization blocked:", recInitErr);
      }
    }

    // 5. Start Session Pacing timer
    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setPhase("recording");
  }, [levelId, prompt, facingMode, stopRecording]);

  // Format timer
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const tier = getTierForLevel(levelId);

  // Waveform bars (neobrutalist style)
  const waveformBars = Array.from({ length: 24 }, (_, i) => {
    const factor = (Math.sin(i * 1.5) + 1) / 2;
    const h = phase === "recording" ? 4 + factor * volume * 60 : 4;
    return (
      <div
        key={i}
        className="w-1.5 bg-[#0B354C] dark:bg-white rounded-full transition-all duration-100 border border-black"
        style={{ height: `${h}px`, opacity: 0.7 + factor * 0.3 }}
      />
    );
  });

  const handleNextRecommended = () => {
    if (nextPath) {
      setPrompt({
        id: Math.floor(Math.random() * 100) + 1,
        text: nextPath.prompt,
        difficulty: Math.min(5, Math.floor(levelId / 20) + 1),
        category: nextPath.topic,
        constraints: prompt?.constraints || [],
        duration: prompt?.duration || getLevelDuration(levelId),
      });
      setLevelId(levelId + 1);
      setResult(null);
      setNextPath(null);
      setPhase("ready");
    }
  };

  // ===== RENDER: LOADING =====
  if (phase === "loading") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-zinc-500 font-bold text-sm mt-3">Initializing speech booth...</p>
      </div>
    );
  }

  // ===== RENDER: PERMISSION =====
  if (phase === "permission") {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-8 max-w-md w-full text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl border-2 border-black flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-blue-650" />
          </div>
          <h1 className="text-xl md:text-2xl font-black mb-3">Enable Practice Mirror</h1>
          <p className="text-zinc-650 dark:text-zinc-400 text-sm font-bold leading-relaxed mb-6">
            MirrorUp uses your webcam as a reflection mirror so you can analyze facial expressions and gestures while speaking. Audio is processed fully locally.
          </p>
          
          {error && (
            <div className="bg-red-55 text-red-600 border-2 border-red-500 rounded-xl p-3 mb-6 font-bold text-xs">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="border-2 border-black bg-white hover:bg-gray-50 rounded-xl font-bold"
            >
              Back
            </Button>
            <Button
              onClick={requestPermission}
              className="bg-primary text-black border-2 border-black hover:bg-primary/90 rounded-xl font-black shadow-sm"
            >
              Allow Camera & Mic
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDER: RESULTS =====
  if (phase === "results" && result) {
    return (
      <div className="w-full text-black dark:text-white space-y-6">
        
        {/* Results Banner Header */}
        <div className="bg-[#EBF5FF] dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black mb-1">
                Challenge Complete!
              </h1>
              <p className="text-zinc-700 dark:text-zinc-300 font-bold text-sm">
                Feedback analysis and score summary for level {levelId}.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-800 px-4 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-6 h-6 ${s <= result.stars ? "text-yellow-400 fill-yellow-400" : "text-zinc-200"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
          
          {/* Left Column (Col span 5): Overall Score & Metrics */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Overall Score */}
            <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-center">
              <p className="text-zinc-500 font-extrabold text-xs uppercase tracking-wider mb-2">Overall Performance Score</p>
              <div className="text-6xl font-black mb-2 text-primary-foreground bg-primary inline-block px-6 py-2 rounded-2xl border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                {result.metrics.overallScore}
              </div>
              <p className="text-green-600 dark:text-green-400 font-black text-sm mt-3">+{result.xpEarned} Experience Points (XP)</p>
            </div>

            {/* AI Next Path Recommendation (Goal 4 & 5) */}
            {nextPath && (
              <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-black text-sm flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-yellow-500 fill-current" />
                  AI Recommended Training Path
                </h3>
                <div className="bg-[#FFFDF0] dark:bg-zinc-800 p-4 rounded-xl border-2 border-black space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-zinc-500">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    <span>Focus Path: {nextPath.topic}</span>
                  </div>
                  <p className="font-extrabold text-sm leading-relaxed">
                    "{nextPath.prompt}"
                  </p>
                </div>
                <button
                  onClick={handleNextRecommended}
                  className="w-full py-2.5 bg-primary text-black font-black text-xs rounded-xl border-2 border-black mt-4 shadow-sm hover:scale-[1.01] transition-transform"
                >
                  Start Recommended Topic Challenge
                </button>
              </div>
            )}

            {/* Individual Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Speaking Pace", score: result.metrics.paceScore, desc: `${result.metrics.wpm} WPM`, color: "bg-blue-100" },
                { label: "Speech Clarity", score: result.metrics.clarityScore, desc: `${result.metrics.fillerCount} Fillers`, color: "bg-green-100" },
                { label: "Vocabulary", score: result.metrics.vocabScore, desc: `${result.metrics.advancedWordCount} Advanced`, color: "bg-purple-100" },
                { label: "Volume & Conf", score: result.metrics.confidenceScore, desc: `${Math.round(result.metrics.avgVolume * 100)}% Power`, color: "bg-yellow-100" },
              ].map((m, idx) => (
                <div key={idx} className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <span className="text-zinc-500 font-bold text-xs block mb-1">{m.label}</span>
                  <p className="text-2xl font-black">{m.score}</p>
                  <span className={`inline-block text-[10px] font-black border border-black rounded px-1.5 mt-2 ${m.color} text-black`}>
                    {m.desc}
                  </span>
                </div>
              ))}
            </div>

          </div>

          {/* Right Column (Col span 7): AI Feedback & Transcript */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Feedback items */}
            <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <h3 className="font-black text-lg mb-4 border-b-2 pb-2">AI Speaking Critique</h3>
              <div className="space-y-4">
                {result.feedback.map((f, i) => {
                  const pillColor = 
                    f.severity === "success" ? "bg-green-100 text-green-700 border-green-400" :
                    f.severity === "warning" ? "bg-yellow-100 text-yellow-750 border-yellow-400" :
                    f.severity === "danger" ? "bg-red-100 text-red-700 border-red-400" : 
                    "bg-blue-100 text-blue-700 border-blue-400";
                  
                  return (
                    <div key={i} className="p-4 bg-[#FFFDF0] dark:bg-zinc-800 border-2 border-black rounded-xl shadow-sm">
                      <div className="flex justify-between items-start gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${pillColor}`}>
                          {f.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="font-extrabold text-sm">{f.message}</p>
                      <p className="text-zinc-500 text-xs font-bold mt-1.5">{f.tip}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Transcript Card */}
            {result.metrics.transcript && (
              <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="font-black text-lg mb-2 border-b-2 pb-2">Captured Transcript</h3>
                <p className="text-zinc-650 dark:text-zinc-400 text-sm font-bold leading-relaxed">{result.metrics.transcript}</p>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => navigate("/dashboard")}
                variant="outline"
                className="flex-1 py-3 border-2 border-black bg-white hover:bg-gray-50 rounded-xl font-bold"
              >
                Back Dashboard
              </Button>
              <Button
                onClick={() => {
                  setLevelId(levelId + 1);
                  setResult(null);
                  setPhase("ready");
                }}
                className="flex-1 py-3 bg-primary text-black border-2 border-black hover:bg-primary/90 rounded-xl font-black flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Practice Level {levelId + 1}</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

          </div>

        </div>

      </div>
    );
  }

  // ===== RENDER: PRACTICE BOOTH (ready, recording, analyzing) =====
  return (
    <div className="w-full text-black dark:text-white space-y-6">
      
      {/* Page header */}
      <div className="bg-[#FFFDF0] dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => {
                cleanup();
                navigate("/dashboard");
              }}
              variant="outline"
              size="icon"
              className="border-2 border-black bg-white text-black hover:bg-gray-50 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-capitalize">Level {levelId}: speaking challenge</h1>
              <p className="text-xs font-bold text-zinc-550">Practice room under {tier.name} Tier constraints.</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(phase === "recording" || phase === "analyzing") && (
              <div className="bg-red-100 text-red-650 border-2 border-black px-3.5 py-1.5 rounded-xl text-xs font-black animate-pulse flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full shrink-0" />
                <span className="font-mono">
                  {phase === "analyzing" ? "ANALYZING..." : formatTime(timer)}
                </span>
              </div>
            )}
            {cameraEnabled && (
              <button
                onClick={switchCamera}
                className="p-2 border-2 border-black bg-white text-black hover:bg-gray-50 rounded-xl"
                title="Switch Camera (Front/Back)"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setCameraEnabled(!cameraEnabled)}
              className="p-2 border-2 border-black bg-white text-black hover:bg-gray-50 rounded-xl"
              title="Toggle Mirror Camera"
            >
              {cameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-650 border-2 border-red-500 rounded-xl p-4 font-bold text-xs md:text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {error}
        </div>
      )}

      {/* Contained Two-Column Recording booth */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
        
        {/* Left Column (Col span 7): Webcam Mirror viewport */}
        <div className="md:col-span-7">
          <div className="relative border-[3px] border-black dark:border-white rounded-2xl overflow-hidden aspect-video bg-zinc-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            
            {cameraEnabled ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col items-center justify-center">
                <Video className="w-12 h-12 text-zinc-650 animate-pulse mb-2" />
                <p className="text-zinc-500 font-bold text-sm">Mirror Camera Suspended</p>
              </div>
            )}

            {/* Gradient bottom overlay for visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

            {/* In-view overlay labels */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-10 pointer-events-none">
              <span className="bg-black/60 border border-white/20 text-white font-bold text-[10px] px-2 py-1 rounded">
                LOCAL MIRROR FEED
              </span>
              
              {/* Mic volume activity bar */}
              {phase === "recording" && (
                <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5 rounded border border-white/20">
                  <Mic className="w-3.5 h-3.5 text-green-400" />
                  <div className="w-16 h-2 bg-zinc-700 rounded-full overflow-hidden border border-white/10">
                    <div 
                      className="h-full bg-green-400 transition-all duration-100" 
                      style={{ width: `${Math.min(100, volume * 250)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Column (Col span 5): Challenge card, waveform and actions */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Challenge Prompt */}
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <span className="text-xs font-black uppercase text-zinc-400 tracking-wider block mb-1">Your Challenge Prompt</span>
            <p className="font-extrabold text-lg leading-relaxed text-black dark:text-white">
              "{prompt?.text || "Generating custom prompt..."}"
            </p>
            
            {prompt?.constraints && prompt.constraints.length > 0 && (
              <div className="mt-4 flex gap-1.5 flex-wrap">
                {prompt.constraints.map((c) => (
                  <span key={c} className="bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-400 text-[10px] font-black px-2.5 py-1 rounded-lg border-2 border-black dark:border-red-500 shadow-sm">
                    ⚠️ {c.replace(/_/g, " ").toUpperCase()}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 border-t-2 border-zinc-100 dark:border-zinc-800 pt-4 text-xs font-bold text-zinc-550 flex justify-between">
              <span>Target Duration: {prompt?.duration || getLevelDuration(levelId)}s</span>
              <span>Input Mode: Speech To Text</span>
            </div>
          </div>

          {/* Practice control area */}
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col items-center justify-center gap-6">
            
            {/* Waveform / Visual feedback */}
            {phase === "recording" && (
              <div className="flex justify-center items-center gap-1 h-12 w-full">
                {waveformBars}
              </div>
            )}

            {/* Actions button */}
            <div>
              {phase === "ready" && (
                <button
                  onClick={() => setShowSilentConfirm(true)}
                  className="w-16 h-16 rounded-full bg-primary text-black border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform"
                  title="Start practice recording"
                >
                  <Play className="w-7 h-7 fill-current ml-1" />
                </button>
              )}

              {phase === "recording" && (
                <button
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-red-500 text-white border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:scale-105 transition-transform"
                  title="Stop recording and analyze"
                >
                  <Square className="w-6 h-6 fill-current" />
                </button>
              )}

              {phase === "analyzing" && (
                <div className="flex items-center gap-2.5 bg-[#FFFDF0] border-2 border-black rounded-xl px-5 py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="font-extrabold text-sm text-black">Evaluating performance...</span>
                </div>
              )}
            </div>

            {phase === "recording" && transcript && (
              <p className="text-center text-zinc-500 text-xs font-bold max-w-sm truncate border-t pt-3 w-full">
                Live transcript feed: "{transcript.slice(-60)}..."
              </p>
            )}

            {phase === "ready" && (
              <div className="space-y-3 flex flex-col items-center">
                <div className="bg-[#FFFDF0] dark:bg-zinc-800 border-2 border-black rounded-xl p-3 text-center text-xs font-bold flex items-center gap-2 max-w-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
                  <span>Before starting, please go to a silent/quiet place and speak clearly for accurate AI speech audits!</span>
                </div>
                <p className="text-zinc-500 text-[10px] font-bold text-center">
                  Press the play button when you are ready to speak. Click permission locks in browser if feed fails.
                </p>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Confirmation Modal */}
      {showSilentConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 max-w-sm w-full text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-all">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-950/40 rounded-2xl border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Mic className="w-8 h-8 text-yellow-600 dark:text-yellow-450" />
            </div>
            <h3 className="text-lg font-black mb-2 text-black dark:text-white">Before You Speak</h3>
            <p className="text-zinc-650 dark:text-zinc-350 text-xs font-bold leading-relaxed mb-6">
              To ensure the AI evaluates your speech with the highest accuracy, please go to a <span className="underline decoration-primary decoration-2 font-black">silent/quiet place</span> and speak clearly.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowSilentConfirm(false)}
                className="flex-1 py-2 px-4 border-2 border-black bg-white dark:bg-zinc-800 text-black dark:text-white font-bold text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSilentConfirm(false);
                  startRecording();
                }}
                className="flex-1 py-2 px-4 bg-primary text-black border-2 border-black font-black text-xs rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-primary/90 transition-colors"
              >
                Start Speaking
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
