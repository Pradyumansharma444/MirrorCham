export interface UserProfile {
  name: string;
}

export interface UserProgress {
  currentLevel: number;
  totalXP: number;
  streakDays: number;
  highestLevel: number;
  totalSessions: number;
}

export interface SessionRecord {
  id: string;
  levelId: number;
  promptId: number;
  duration: number;
  targetDuration: number;
  transcript: string;
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
  constraintMet: boolean;
  stars: number;
  xpEarned: number;
  createdAt: string;
}

export interface BadgeRecord {
  badgeId: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tier: number;
  unlockedAt: string;
}

export interface ApiConfig {
  apiKey?: string;
  apiType?: "gemini" | "openai";
}

export interface LiveRoomRecord {
  roomId: string;
  title: string;
  category: string;
  maxSize: number;
  currentSize: number;
  isPrivate: boolean;
  password?: string;
  hostName: string;
  createdAt: string;
}

const KEYS = {
  USER: "mirrorup_user",
  PROGRESS: "mirrorup_progress",
  SESSIONS: "mirrorup_sessions",
  BADGES: "mirrorup_badges",
  API_CONFIG: "mirrorup_api_config",
  LIVE_ROOMS: "mirrorup_live_rooms",
};

export const localStorageDb = {
  // User Profile
  getUser(): UserProfile | null {
    const data = localStorage.getItem(KEYS.USER);
    return data ? JSON.parse(data) : null;
  },
  setUser(user: UserProfile | null) {
    if (user) {
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.USER);
    }
  },

  // Progress
  getProgress(): UserProgress {
    const data = localStorage.getItem(KEYS.PROGRESS);
    if (data) return JSON.parse(data);
    const defaultProgress: UserProgress = {
      currentLevel: 1,
      totalXP: 0,
      streakDays: 0,
      highestLevel: 1,
      totalSessions: 0,
    };
    this.setProgress(defaultProgress);
    return defaultProgress;
  },
  setProgress(progress: UserProgress) {
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(progress));
  },

  // Sessions
  getSessions(): SessionRecord[] {
    const data = localStorage.getItem(KEYS.SESSIONS);
    return data ? JSON.parse(data) : [];
  },
  saveSession(session: Omit<SessionRecord, "id" | "createdAt">) {
    const sessions = this.getSessions();
    const newSession: SessionRecord = {
      ...session,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    sessions.unshift(newSession); // Newest first
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));

    // Update Progress stats
    const progress = this.getProgress();
    progress.totalSessions += 1;
    progress.totalXP += session.xpEarned;
    
    // Level up calculation: e.g. level * 50 XP required per level
    let currentXPTemp = progress.totalXP;
    let level = 1;
    while (currentXPTemp >= level * 50) {
      currentXPTemp -= level * 50;
      level += 1;
    }
    progress.currentLevel = level;
    if (level > progress.highestLevel) {
      progress.highestLevel = level;
    }

    // Check streak
    if (sessions.length === 1) {
      progress.streakDays = 1;
    } else {
      const prevSession = sessions[1];
      const prevDate = new Date(prevSession.createdAt).toDateString();
      const currDate = new Date(newSession.createdAt).toDateString();
      if (prevDate !== currDate) {
        const diffMs = new Date(currDate).getTime() - new Date(prevDate).getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          progress.streakDays += 1;
        } else if (diffDays > 1) {
          progress.streakDays = 1;
        }
      }
    }

    this.setProgress(progress);
    this.evaluateBadges(newSession);
    return newSession;
  },

  // Badges
  getBadges(): BadgeRecord[] {
    const data = localStorage.getItem(KEYS.BADGES);
    return data ? JSON.parse(data) : [];
  },
  saveBadge(badge: BadgeRecord) {
    const badges = this.getBadges();
    if (!badges.some(b => b.badgeId === badge.badgeId)) {
      badges.push(badge);
      localStorage.setItem(KEYS.BADGES, JSON.stringify(badges));
    }
  },

  // API Config
  getApiConfig(): ApiConfig {
    const data = localStorage.getItem(KEYS.API_CONFIG);
    return data ? JSON.parse(data) : { apiType: "gemini" };
  },
  setApiConfig(config: ApiConfig) {
    localStorage.setItem(KEYS.API_CONFIG, JSON.stringify(config));
  },

  // Reset database
  clearAll() {
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.PROGRESS);
    localStorage.removeItem(KEYS.SESSIONS);
    localStorage.removeItem(KEYS.BADGES);
    localStorage.removeItem(KEYS.API_CONFIG);
  },

  // Automatic badge checker
  evaluateBadges(session: SessionRecord) {
    const progress = this.getProgress();
    const badges = this.getBadges();

    const unlock = (badgeId: string, name: string, desc: string, cat: string, icon: string, tier: number) => {
      if (!badges.some((b) => b.badgeId === badgeId)) {
        this.saveBadge({
          badgeId,
          name,
          description: desc,
          category: cat,
          icon,
          tier,
          unlockedAt: new Date().toISOString(),
        });
      }
    };

    // First Talk badge
    if (progress.totalSessions >= 1) {
      unlock("first_talk", "First Talk", "Complete your first speaking session.", "milestone", "mic", 1);
    }
    // Pace Setter: WPM in sweet spot (120-160)
    if (session.wpm >= 120 && session.wpm <= 160) {
      unlock("pace_setter", "Pace Setter", "Reach WPM sweet spot (120-160) in a session.", "skill", "gauge", 2);
    }
    // Filler Slayer: zero filler words
    if (session.fillerCount === 0 && session.wordCount >= 15) {
      unlock("filler_slayer", "Filler Slayer", "Complete a session with zero filler words.", "skill", "sword", 3);
    }
    // Streak Week: 7 days streak
    if (progress.streakDays >= 7) {
      unlock("streak_week", "Week Warrior", "Maintain a 7-day practice streak.", "milestone", "flame", 2);
    }
    // Streak Guardian: 30 days streak
    if (progress.streakDays >= 30) {
      unlock("streak_guardian", "Streak Guardian", "Maintain a 30-day practice streak.", "milestone", "flame", 4);
    }
    // Level achievements
    if (progress.currentLevel >= 10) {
      unlock("level_10", "Bronze Graduate", "Reach Level 10.", "rank", "award", 1);
    }
    if (progress.currentLevel >= 20) {
      unlock("level_20", "Silver Star", "Reach Level 20.", "rank", "star", 2);
    }
    if (progress.currentLevel >= 50) {
      unlock("level_50", "Golden Voice", "Reach Level 50.", "rank", "trophy", 3);
    }
  },

  // Live Rooms WebRTC database methods
  getLiveRooms(): LiveRoomRecord[] {
    const data = localStorage.getItem(KEYS.LIVE_ROOMS);
    if (!data) return [];
    const rooms: LiveRoomRecord[] = JSON.parse(data);
    const now = new Date().getTime();
    // Keep active rooms created within the last 2 hours
    const activeRooms = rooms.filter((r) => {
      const created = new Date(r.createdAt).getTime();
      return now - created < 2 * 60 * 60 * 1000;
    });
    localStorage.setItem(KEYS.LIVE_ROOMS, JSON.stringify(activeRooms));
    return activeRooms;
  },

  hostRoom(room: Omit<LiveRoomRecord, "currentSize" | "createdAt">): LiveRoomRecord {
    const rooms = this.getLiveRooms();
    const newRoom: LiveRoomRecord = {
      ...room,
      currentSize: 1,
      createdAt: new Date().toISOString(),
    };
    rooms.unshift(newRoom);
    localStorage.setItem(KEYS.LIVE_ROOMS, JSON.stringify(rooms));
    return newRoom;
  },

  updateRoomSize(roomId: string, sizeChange: number) {
    const rooms = this.getLiveRooms();
    const room = rooms.find((r) => r.roomId === roomId);
    if (room) {
      room.currentSize = Math.max(0, Math.min(room.maxSize, room.currentSize + sizeChange));
      localStorage.setItem(KEYS.LIVE_ROOMS, JSON.stringify(rooms));
    }
  },

  removeRoom(roomId: string) {
    const rooms = this.getLiveRooms();
    const filtered = rooms.filter((r) => r.roomId !== roomId);
    localStorage.setItem(KEYS.LIVE_ROOMS, JSON.stringify(filtered));
  },
};
