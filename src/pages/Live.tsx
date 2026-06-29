import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDevicePermissions } from "@/hooks/useDevicePermissions";
import { localStorageDb } from "@/lib/db/localStorageDb";
import type { LiveRoomRecord } from "@/lib/db/localStorageDb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Video, VideoOff, Mic, MicOff, LogOut, Send, Plus, 
  Users, Lock, Globe, AlertCircle, Copy, Check, ShieldAlert,
  RefreshCw, Trash2
} from "lucide-react";
import Peer from "peerjs";
import type { MediaConnection, DataConnection } from "peerjs";

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
}

interface PeerConnectionRecord {
  peerId: string;
  name: string;
  mediaCall?: MediaConnection;
  dataConn?: DataConnection;
  stream?: MediaStream;
}

export default function Live() {
  const { user } = useAuth();
  const { requestPermissions } = useDevicePermissions();

  // Active room state
  const [activeRoom, setActiveRoom] = useState<LiveRoomRecord | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  
  // Grid of active participants (real WebRTC streams!)
  const [participants, setParticipants] = useState<PeerConnectionRecord[]>([]);
  const participantsRef = useRef<PeerConnectionRecord[]>([]);

  // Sync ref with state to prevent stale closures in callbacks
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // Setup tabs: Host vs Join
  const [setupTab, setSetupTab] = useState<"join" | "host">("join");
  
  // Host Form States
  const [hostTitle, setHostTitle] = useState("");
  const [hostCategory, setHostCategory] = useState("Group Discussion");
  const [hostMaxSize, setHostMaxSize] = useState<number>(4);
  const [hostPrivacy, setHostPrivacy] = useState<"public" | "private">("public");
  const [hostPassword, setHostPassword] = useState("");
  
  // Join List States
  const [liveRoomsList, setLiveRoomsList] = useState<LiveRoomRecord[]>(() => localStorageDb.getLiveRooms());
  const [manualCode, setManualCode] = useState("");
  const [joinPasswordPrompt, setJoinPasswordPrompt] = useState<{ room: LiveRoomRecord; input: string } | null>(null);
  const [joinError, setJoinError] = useState("");
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);

  // Conference Controls
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState(false);

  // Video elements references
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantsRefs = useRef<Record<string, HTMLVideoElement>>({});

  // Fetch rooms list periodically for joiners
  useEffect(() => {
    if (!activeRoom) {
      const timer = setInterval(() => {
        setLiveRoomsList(localStorageDb.getLiveRooms());
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [activeRoom]);

  // Bind local video stream to video element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, cameraOff]);

  // Cleanup connections on leave
  const leaveRoom = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    participantsRef.current.forEach((p) => {
      p.mediaCall?.close();
      p.dataConn?.close();
    });
    setParticipants([]);
    setChatMessages([]);
    setIsConfirmingLeave(false);
    setDeletingRoomId(null);

    if (peer) {
      peer.destroy();
      setPeer(null);
    }

    if (activeRoom) {
      if (isHost) {
        localStorageDb.removeRoom(activeRoom.roomId);
      } else {
        localStorageDb.updateRoomSize(activeRoom.roomId, -1);
      }
      setActiveRoom(null);
    }
  }, [activeRoom, isHost, peer, localStream]);

  const handleDeleteRoom = (roomId: string) => {
    localStorageDb.removeRoom(roomId);
    setLiveRoomsList(localStorageDb.getLiveRooms());
    setDeletingRoomId(null);
  };

  // Handle page unloading / navigations
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, []);

  // WebRTC mesh coordination functions
  const setupPeerEvents = (newPeer: Peer, stream: MediaStream, roomIsHost: boolean) => {
    // 1. Handle incoming WebRTC video/audio call
    newPeer.on("call", (call) => {
      // Answer the call with local stream
      call.answer(stream);
      
      call.on("stream", (remoteStream) => {
        // Update matching participant stream in grid
        setParticipants((prev) => 
          prev.map((p) => p.peerId === call.peer ? { ...p, mediaCall: call, stream: remoteStream } : p)
        );
      });
    });

    const handleConn = (conn: DataConnection) => {
      conn.on("open", () => {
        // Send our name to the peer
        conn.send({ type: "handshake", name: user?.name || "Speaker" });
      });

      conn.on("data", (data: any) => {
        if (!data || typeof data !== "object") return;

        if (data.type === "handshake") {
          const record: PeerConnectionRecord = {
            peerId: conn.peer,
            name: data.name,
            dataConn: conn,
          };
          
          setParticipants((prev) => {
            if (prev.some((p) => p.peerId === conn.peer)) return prev;
            return [...prev, record];
          });

          // Host coordinates mesh: sends list of all other participants to the joiner
          if (roomIsHost) {
            // Update database room size
            localStorageDb.updateRoomSize(newPeer.id, 1);
            
            // Broadcast new participant list to everyone
            const activePeers = participantsRef.current.map((p) => ({ peerId: p.peerId, name: p.name }));
            conn.send({ type: "peer_list", peers: [...activePeers, { peerId: newPeer.id, name: user?.name || "Host" }] });
          }
        }

        if (data.type === "peer_list") {
          // The Joiner receives the current participants from Host and calls them
          const peerList = data.peers as Array<{ peerId: string; name: string }>;
          peerList.forEach((p) => {
            if (p.peerId === newPeer.id) return; // don't connect to ourselves
            
            // Start WebRTC media call to this participant
            const call = newPeer.call(p.peerId, stream);
            call.on("stream", (remoteStream) => {
              setParticipants((prev) => {
                if (prev.some((entry) => entry.peerId === p.peerId)) {
                  return prev.map((entry) => entry.peerId === p.peerId ? { ...entry, mediaCall: call, stream: remoteStream } : entry);
                }
                return [...prev, { peerId: p.peerId, name: p.name, mediaCall: call, stream: remoteStream }];
              });
            });

            // Start Data connection for chat
            const dataConn = newPeer.connect(p.peerId);
            handleConn(dataConn);
          });
        }

        if (data.type === "chat") {
          setChatMessages((prev) => [
            ...prev,
            { sender: data.sender, text: data.text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          ]);
        }

        if (data.type === "leave") {
          setParticipants((prev) => prev.filter((p) => p.peerId !== conn.peer));
          if (roomIsHost) {
            localStorageDb.updateRoomSize(newPeer.id, -1);
          }
        }
      });

      conn.on("close", () => {
        setParticipants((prev) => prev.filter((p) => p.peerId !== conn.peer));
      });

      conn.on("error", (err) => {
        console.error("Data connection error:", err);
      });
    };

    // 2. Handle incoming Data Connection (handshake + chat)
    newPeer.on("connection", (conn) => {
      handleConn(conn);
    });

    return handleConn;
  };

  // Switch camera between front and back dynamically
  const switchCamera = async () => {
    if (!localStream) return;
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    
    try {
      // Get new video stream with the new facingMode
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack) {
        // Stop old video track
        const oldVideoTracks = localStream.getVideoTracks();
        oldVideoTracks.forEach((track) => track.stop());
        
        // Replace video track in localStream
        localStream.removeTrack(oldVideoTracks[0]);
        localStream.addTrack(newVideoTrack);
        
        // Update state
        setFacingMode(newFacingMode);
        
        // Re-bind to local video element
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play().catch(e => console.error("Error starting video playback:", e));
        }
        
        // Update track on all active peer connections dynamically using replaceTrack
        participantsRef.current.forEach((p) => {
          if (p.mediaCall && p.mediaCall.peerConnection) {
            const senders = p.mediaCall.peerConnection.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === "video");
            if (videoSender) {
              videoSender.replaceTrack(newVideoTrack).catch((err) => {
                console.error("Error replacing track for peer:", p.peerId, err);
              });
            }
          }
        });
      }
    } catch (err) {
      console.error("Failed to switch camera:", err);
      setJoinError("Failed to switch camera device. Please check permissions.");
    }
  };

  // Host Action: Create a room
  const handleHostRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostTitle.trim()) {
      setJoinError("Please enter a room title.");
      return;
    }

    const perms = await requestPermissions();
    if (!perms.camera || !perms.mic) {
      setJoinError("Camera and Microphone permissions are required to host a live session.");
      return;
    }

    try {
      setJoinError("");
      
      // Request local stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setLocalStream(stream);

      // Initialize Host Peer
      const newPeer = new Peer();
      
      newPeer.on("open", (id) => {
        setPeer(newPeer);
        setIsHost(true);

        const room = localStorageDb.hostRoom({
          roomId: id,
          title: hostTitle,
          category: hostCategory,
          maxSize: hostMaxSize,
          isPrivate: hostPrivacy === "private",
          password: hostPrivacy === "private" ? hostPassword : "",
          hostName: user?.name || "Host",
        });

        setActiveRoom(room);
        setupPeerEvents(newPeer, stream, true);
      });

      newPeer.on("error", (err) => {
        console.error(err);
        setJoinError("Failed to initialize P2P WebRTC networking.");
        stream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      });

    } catch (err) {
      console.error(err);
      setJoinError("Failed to get local camera/microphone media streams.");
    }
  };

  // Join Action: Connect to hosted Peer
  const handleJoinRoom = async (room: LiveRoomRecord) => {
    if (room.currentSize >= room.maxSize) {
      setJoinError("This practice room is full.");
      return;
    }

    const perms = await requestPermissions();
    if (!perms.camera || !perms.mic) {
      setJoinError("Camera and Microphone permissions are required to join live sessions.");
      return;
    }

    try {
      setJoinError("");

      // Request media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setLocalStream(stream);

      // Initialize Joiner Peer
      const newPeer = new Peer();

      newPeer.on("open", (_id) => {
        setPeer(newPeer);
        setIsHost(false);

        // 1. Establish signaling data connection with the Host
        const dataConn = newPeer.connect(room.roomId);
        
        // 2. Setup Peer events and bind handleConn to the outbound connection
        const handleConn = setupPeerEvents(newPeer, stream, false);
        handleConn(dataConn);

        setActiveRoom(room);
        localStorageDb.updateRoomSize(room.roomId, 1);
      });

      newPeer.on("error", (err) => {
        console.error(err);
        setJoinError("Failed to connect to the session host. They might be offline.");
        stream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      });

    } catch (err) {
      console.error(err);
      setJoinError("Failed to get local camera/microphone media streams.");
    }
  };

  const handleJoinPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinPasswordPrompt) return;

    if (joinPasswordPrompt.input === joinPasswordPrompt.room.password) {
      const targetRoom = joinPasswordPrompt.room;
      setJoinPasswordPrompt(null);
      handleJoinRoom(targetRoom);
    } else {
      setJoinError("Incorrect private room password.");
    }
  };

  const handleManualCodeJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setJoinError("Please enter a valid Session ID.");
      return;
    }

    // Attempt to locate in active list, else mock a temporary room record to connect
    const room = liveRoomsList.find((r) => r.roomId === manualCode) || {
      roomId: manualCode,
      title: "Manual WebRTC Connection",
      category: "Group Practice",
      maxSize: 4,
      currentSize: 1,
      isPrivate: false,
      hostName: "Host",
      createdAt: new Date().toISOString(),
    };

    handleJoinRoom(room);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !peer) return;

    const msg: ChatMessage = {
      sender: user?.name || "Speaker",
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, msg]);

    // Send to everyone in the room via P2P data channels
    participants.forEach((p) => {
      p.dataConn?.send({
        type: "chat",
        sender: msg.sender,
        text: msg.text
      });
    });

    setChatInput("");
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraOff(!videoTrack.enabled);
      }
    }
  };

  const handleCopyCode = () => {
    if (activeRoom) {
      navigator.clipboard.writeText(activeRoom.roomId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Render video streams inside grid refs
  useEffect(() => {
    participants.forEach((p) => {
      if (p.stream && participantsRefs.current[p.peerId]) {
        participantsRefs.current[p.peerId].srcObject = p.stream;
      }
    });
  }, [participants]);

  // ===== RENDER: active meeting room layout =====
  if (activeRoom) {
    return (
      <div className="w-full text-black dark:text-white space-y-6">
        
        {/* Meet header */}
        <div className="bg-[#FFFDF0] dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="bg-secondary px-2.5 py-0.5 rounded border border-black text-[10px] font-black uppercase mb-1.5 inline-block">
                Category: {activeRoom.category}
              </span>
              <h1 className="text-xl md:text-2xl font-black">{activeRoom.title}</h1>
              <p className="text-zinc-550 font-bold text-xs mt-1">Host: {activeRoom.hostName}</p>
            </div>
            
            {/* Session ID sharing */}
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="bg-white dark:bg-zinc-800 border-2 border-black rounded-xl px-3 py-1.5 flex items-center justify-between gap-3 text-xs font-black w-full sm:w-auto">
                <span className="text-zinc-400">ID:</span>
                <span className="font-mono truncate max-w-[120px]">{activeRoom.roomId}</span>
                <button 
                  onClick={handleCopyCode} 
                  className="text-zinc-500 hover:text-black dark:hover:text-white"
                  title="Copy session link ID"
                >
                  {copiedId ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {isHost ? (
                isConfirmingLeave ? (
                  <div className="flex gap-2">
                    <button
                      onClick={leaveRoom}
                      className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white border-2 border-black rounded-xl font-black text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setIsConfirmingLeave(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-black border-2 border-black rounded-xl font-black text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingLeave(true)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 border-2 border-black rounded-xl font-black text-xs flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                    title="Delete Session"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Session</span>
                  </button>
                )
              ) : (
                <button
                  onClick={leaveRoom}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 border-2 border-black rounded-xl font-black text-xs flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  title="Leave Room"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Leave</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Meet grid & chat layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
          
          {/* Left Grid Card: Video Streams (Col span 8) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950 border-[3px] border-black rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] min-h-[420px] items-center">
              
              {/* Local Participant Frame */}
              <div className="relative border-2 border-zinc-700 bg-zinc-900 rounded-xl overflow-hidden aspect-video shadow-sm">
                {!cameraOff ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-550">
                    <VideoOff className="w-10 h-10 mb-2" />
                    <span className="text-xs font-bold">Your Video Blocked</span>
                  </div>
                )}
                
                <div className="absolute bottom-3 left-3 bg-black/60 border border-white/20 text-white font-extrabold text-[10px] px-2 py-0.5 rounded flex items-center gap-1">
                  <span>{user?.name || "You"} ({isHost ? "Host" : "Joiner"})</span>
                  {micMuted && <MicOff className="w-3 h-3 text-red-400" />}
                </div>
              </div>

              {/* Connected Remote Participants WebRTC feeds */}
              {participants.map((p) => (
                <div 
                  key={p.peerId} 
                  className="relative border-2 border-zinc-700 bg-zinc-900 rounded-xl overflow-hidden aspect-video shadow-sm"
                >
                  <video
                    ref={(el) => {
                      if (el) participantsRefs.current[p.peerId] = el;
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/60 border border-white/20 text-white font-extrabold text-[10px] px-2 py-0.5 rounded">
                    <span>{p.name}</span>
                  </div>
                </div>
              ))}

              {/* Empty slot indicators for meet size */}
              {Array.from({ length: Math.max(0, activeRoom.maxSize - 1 - participants.length) }).map((_, idx) => (
                <div 
                  key={idx} 
                  className="border-2 border-dashed border-zinc-800 bg-zinc-950/40 rounded-xl overflow-hidden aspect-video flex flex-col items-center justify-center text-zinc-700"
                >
                  <Users className="w-8 h-8 mb-1.5" />
                  <span className="text-[10px] font-black uppercase">Open Seat Slot</span>
                </div>
              ))}

            </div>

            {/* Conference control panel */}
            <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-4">
              <button
                onClick={toggleMic}
                className={`p-3 border-2 border-black rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  micMuted ? "bg-red-100 text-red-650 hover:bg-red-200" : "bg-primary text-black hover:bg-primary/90"
                }`}
                title={micMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {micMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <button
                onClick={toggleCamera}
                className={`p-3 border-2 border-black rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  cameraOff ? "bg-red-100 text-red-650 hover:bg-red-200" : "bg-primary text-black hover:bg-primary/90"
                }`}
                title={cameraOff ? "Enable camera" : "Disable camera"}
              >
                {cameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {!cameraOff && (
                <button
                  onClick={switchCamera}
                  className="p-3 border-2 border-black rounded-xl transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-primary text-black hover:bg-primary/90"
                  title="Switch Camera (Front/Back)"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
            </div>

          </div>

          {/* Right Column: Chat board (Col span 4) */}
          <div className="lg:col-span-4">
            <div className="bg-white dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[480px]">
              <h2 className="text-base font-black flex items-center gap-2 border-b-2 pb-3 mb-3">
                <Users className="w-5 h-5 text-primary" />
                Live Chat Forum
              </h2>
              
              {/* Message scroll container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {chatMessages.length === 0 ? (
                  <p className="text-center text-zinc-405 text-xs font-bold py-12">No messages sent yet.</p>
                ) : (
                  chatMessages.map((m, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border-2 border-black text-xs shadow-sm bg-[#FFFDF0] dark:bg-zinc-800`}
                    >
                      <div className="flex justify-between font-black text-[10px] text-zinc-550 border-b pb-1 mb-1">
                        <span>{m.sender}</span>
                        <span>{m.time}</span>
                      </div>
                      <p className="font-extrabold break-all">{m.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="mt-4 pt-3 border-t-2 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-[#FFFDF0] dark:bg-zinc-800 border-2 border-black rounded-lg text-xs font-bold placeholder:text-zinc-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="p-2 bg-primary text-black border-2 border-black rounded-lg hover:scale-105 transition-transform"
                >
                  <Send className="w-4 h-4 fill-current" />
                </button>
              </form>
            </div>
          </div>

        </div>

      </div>
    );
  }

  // ===== RENDER: setup join / host tabs =====
  return (
    <div className="w-full text-black dark:text-white space-y-6">
      
      {/* Title Header Card */}
      <div className="bg-[#FFFDF0] dark:bg-zinc-900 border-[3px] border-black dark:border-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="text-2xl md:text-3xl font-black mb-1 flex items-center gap-2">
          <Users className="w-7 h-7 text-primary" />
          Live Practice Rooms
        </h1>
        <p className="text-zinc-650 dark:text-zinc-300 font-bold text-xs md:text-sm">
          Connect with real users using WebRTC. Join an active room or host your own group session.
        </p>
      </div>

      {joinError && (
        <div className="bg-red-50 text-red-650 border-2 border-red-500 rounded-xl p-4 font-bold text-xs md:text-sm">
          {joinError}
        </div>
      )}

      {/* Tabs switches */}
      <div className="flex gap-4">
        <button
          onClick={() => setSetupTab("join")}
          className={`flex-1 py-3 font-black text-sm border-[3px] border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${
            setupTab === "join" 
              ? "bg-secondary text-black" 
              : "bg-white text-zinc-500 hover:bg-gray-50"
          }`}
        >
          Join Existing Room
        </button>
        <button
          onClick={() => setSetupTab("host")}
          className={`flex-1 py-3 font-black text-sm border-[3px] border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${
            setupTab === "host" 
              ? "bg-secondary text-black" 
              : "bg-white text-zinc-500 hover:bg-gray-50"
          }`}
        >
          Host Practice Session
        </button>
      </div>

      {/* RENDER: Host tab view */}
      {setupTab === "host" && (
        <div className="max-w-xl mx-auto">
          <Card className="border-[3px] border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white dark:bg-zinc-900 rounded-2xl">
            <CardHeader className="border-b-2 pb-3 mb-4">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Configure Room Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleHostRoom} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="font-extrabold text-xs block">Room Title</label>
                  <input
                    type="text"
                    required
                    value={hostTitle}
                    onChange={(e) => setHostTitle(e.target.value)}
                    placeholder="e.g. UX/UI Presentation GD"
                    className="w-full px-4 py-2 bg-[#FFFDF0] dark:bg-zinc-800 border-2 border-black rounded-xl font-bold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-xs block">Category</label>
                    <select
                      value={hostCategory}
                      onChange={(e) => setHostCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FFFDF0] dark:bg-zinc-800 border-2 border-black rounded-xl font-bold focus:outline-none"
                    >
                      <option value="Group Discussion">Group Discussion</option>
                      <option value="Interview Mock">Interview Mock</option>
                      <option value="Debate Practice">Debate Practice</option>
                      <option value="General Conversation">General Conversation</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-extrabold text-xs block">Room Size Limit</label>
                    <select
                      value={hostMaxSize}
                      onChange={(e) => setHostMaxSize(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#FFFDF0] dark:bg-zinc-800 border-2 border-black rounded-xl font-bold focus:outline-none"
                    >
                      <option value="2">2 Speakers (1v1)</option>
                      <option value="4">4 Speakers (GD Panel)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-extrabold text-xs block">Room Privacy</label>
                    <select
                      value={hostPrivacy}
                      onChange={(e) => setHostPrivacy(e.target.value as "public" | "private")}
                      className="w-full px-3 py-2 bg-[#FFFDF0] dark:bg-zinc-800 border-2 border-black rounded-xl font-bold focus:outline-none"
                    >
                      <option value="public">Public (Open Join)</option>
                      <option value="private">Private (Password Locked)</option>
                    </select>
                  </div>

                  {hostPrivacy === "private" && (
                    <div className="space-y-1.5">
                      <label className="font-extrabold text-xs block">Join Password</label>
                      <input
                        type="password"
                        required
                        value={hostPassword}
                        onChange={(e) => setHostPassword(e.target.value)}
                        placeholder="Enter short password..."
                        className="w-full px-3 py-2 bg-[#FFFDF0] dark:bg-zinc-800 border-2 border-black rounded-xl font-bold focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-primary text-black font-black text-sm rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.01] transition-transform flex items-center justify-center gap-1.5 cursor-pointer mt-4"
                >
                  <Video className="w-4 h-4" />
                  <span>Start Practice Session Room</span>
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* RENDER: Join tab view */}
      {setupTab === "join" && (
        <div className="space-y-6">
          
          {/* Manual input panel */}
          <div className="bg-white dark:bg-zinc-900 border-[3px] border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-xl mx-auto">
            <h2 className="text-sm font-black uppercase tracking-wider mb-3">Join Session Manually</h2>
            <form onSubmit={handleManualCodeJoin} className="flex gap-3">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Paste Session Host ID code here..."
                className="flex-1 px-4 py-2 bg-[#FFFDF0] dark:bg-zinc-800 border-2 border-black rounded-xl font-bold placeholder:text-zinc-400 focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-black border-2 border-black rounded-xl font-black text-xs hover:scale-105 active:scale-95 transition-transform"
              >
                Connect ID
              </button>
            </form>
          </div>

          {/* Active room lists */}
          <div className="space-y-4">
            <h2 className="text-lg font-black flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              Active Practice Groups Discovery
            </h2>

            {joinPasswordPrompt && (
              <div className="bg-white border-2 border-black p-4 rounded-xl shadow-md max-w-sm mx-auto space-y-3">
                <p className="font-extrabold text-xs text-red-650 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" />
                  Password Required: "{joinPasswordPrompt.room.title}"
                </p>
                <form onSubmit={handleJoinPasswordSubmit} className="flex gap-2">
                  <input
                    type="password"
                    required
                    value={joinPasswordPrompt.input}
                    onChange={(e) => setJoinPasswordPrompt({ ...joinPasswordPrompt, input: e.target.value })}
                    placeholder="Enter room password..."
                    className="flex-1 px-3 py-1.5 bg-[#FFFDF0] border-2 border-black rounded-lg text-xs font-bold focus:outline-none"
                  />
                  <button type="submit" className="px-4 py-1.5 bg-primary border-2 border-black rounded-lg font-black text-xs">Verify</button>
                </form>
                <button onClick={() => setJoinPasswordPrompt(null)} className="text-[10px] text-zinc-500 font-bold underline">Cancel</button>
              </div>
            )}

            {liveRoomsList.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border-[3px] border-black rounded-2xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <AlertCircle className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500 font-black text-sm">No active public sessions listed.</p>
                <p className="text-zinc-400 text-xs font-bold mt-1">Host a session to invite others to practice speaking!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {liveRoomsList.map((room) => (
                  <div
                    key={room.roomId}
                    className="bg-white dark:bg-zinc-900 border-[3px] border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 flex-wrap mb-2">
                        <span className="bg-secondary px-2 py-0.5 rounded border border-black text-[9px] font-black uppercase">
                          {room.category}
                        </span>
                        
                        <div className="flex gap-1.5 items-center">
                          <span className={`text-[9px] font-black border border-black rounded px-1.5 py-0.5 flex items-center gap-1 ${
                            room.isPrivate ? "bg-red-50 text-red-650" : "bg-green-50 text-green-650"
                          }`}>
                            {room.isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                            {room.isPrivate ? "Private" : "Public"}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500">
                            {room.currentSize}/{room.maxSize} Members
                          </span>
                        </div>
                      </div>

                      <h3 className="font-black text-base truncate mb-1">{room.title}</h3>
                      <p className="text-xs font-bold text-zinc-550 mb-4">Host: {room.hostName}</p>
                    </div>

                    <div className="mt-4">
                      {room.hostName === user?.name ? (
                        deletingRoomId === room.roomId ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteRoom(room.roomId)}
                              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.01] transition-transform flex items-center justify-center"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setDeletingRoomId(null)}
                              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.01] transition-transform"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingRoomId(room.roomId)}
                            className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-600 font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.01] transition-transform flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Session</span>
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => {
                            if (room.isPrivate) {
                              setJoinPasswordPrompt({ room, input: "" });
                            } else {
                              handleJoinRoom(room);
                            }
                          }}
                          disabled={room.currentSize >= room.maxSize}
                          className="w-full py-2 bg-primary text-black font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.01] transition-transform disabled:opacity-40 disabled:pointer-events-none"
                        >
                          {room.currentSize >= room.maxSize ? "Room Full" : "Join Practice Room"}
                        </button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
