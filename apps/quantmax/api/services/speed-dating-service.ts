// ============================================================================
// QuantMax - Speed Dating Service
// Session creation with time slots, pair matching (no repeats), 3-minute timer,
// extension handling (max 2, +60s), contact exchange on mutual thumbs-up,
// post-date rating, session analytics, waitlist management
// ============================================================================

interface SpeedDateSession {
  id: string;
  hostId: string;
  title: string;
  startTime: number;
  endTime: number;
  maxParticipants: number;
  participants: string[];
  waitlist: string[];
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  pairDuration: number; // seconds (default 180)
  maxExtensions: number;
  extensionDuration: number; // seconds per extension
  createdAt: number;
}

interface DatePair {
  id: string;
  sessionId: string;
  user1Id: string;
  user2Id: string;
  startTime: number;
  endTime: number;
  extensionsUsed: number;
  status: 'active' | 'completed' | 'skipped';
  user1Rating: 'thumbs_up' | 'thumbs_down' | null;
  user2Rating: 'thumbs_up' | 'thumbs_down' | null;
  contactExchanged: boolean;
}

interface TimeSlot {
  id: string;
  sessionId: string;
  startTime: number;
  endTime: number;
  pairings: DatePair[];
  round: number;
}

interface DateRating {
  pairId: string;
  raterId: string;
  ratedId: string;
  rating: 'thumbs_up' | 'thumbs_down';
  feedback?: string;
  timestamp: number;
}

interface SessionAnalytics {
  sessionId: string;
  totalParticipants: number;
  totalPairings: number;
  mutualMatches: number;
  averageExtensions: number;
  contactExchanges: number;
  completionRate: number;
  averageRating: number;
}

interface WaitlistEntry {
  userId: string;
  sessionId: string;
  joinedAt: number;
  position: number;
  notified: boolean;
}

const DEFAULT_PAIR_DURATION = 180; // 3 minutes
const MAX_EXTENSIONS = 2;
const EXTENSION_DURATION = 60; // 1 minute

class SpeedDatingService {
  private sessions: Map<string, SpeedDateSession> = new Map();
  private pairs: Map<string, DatePair> = new Map();
  private timeSlots: Map<string, TimeSlot[]> = new Map();
  private ratings: DateRating[] = [];
  private waitlists: Map<string, WaitlistEntry[]> = new Map();
  private pairHistory: Map<string, Set<string>> = new Map();

  // Create a new speed dating session
  createSession(params: {
    hostId: string;
    title: string;
    startTime: number;
    durationMinutes: number;
    maxParticipants: number;
    pairDuration?: number;
  }): SpeedDateSession {
    const session: SpeedDateSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      hostId: params.hostId,
      title: params.title,
      startTime: params.startTime,
      endTime: params.startTime + (params.durationMinutes * 60000),
      maxParticipants: params.maxParticipants,
      participants: [params.hostId],
      waitlist: [],
      status: 'scheduled',
      pairDuration: params.pairDuration || DEFAULT_PAIR_DURATION,
      maxExtensions: MAX_EXTENSIONS,
      extensionDuration: EXTENSION_DURATION,
      createdAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    this.waitlists.set(session.id, []);
    return session;
  }

  // Join a session
  joinSession(sessionId: string, userId: string): { success: boolean; position?: number; error?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    if (session.status === 'completed' || session.status === 'cancelled') {
      return { success: false, error: 'Session is no longer available' };
    }
    if (session.participants.includes(userId)) {
      return { success: false, error: 'Already joined' };
    }

    if (session.participants.length >= session.maxParticipants) {
      // Add to waitlist
      const waitlist = this.waitlists.get(sessionId) || [];
      const entry: WaitlistEntry = {
        userId,
        sessionId,
        joinedAt: Date.now(),
        position: waitlist.length + 1,
        notified: false,
      };
      waitlist.push(entry);
      this.waitlists.set(sessionId, waitlist);
      session.waitlist.push(userId);
      return { success: true, position: entry.position };
    }

    session.participants.push(userId);
    this.sessions.set(sessionId, session);
    return { success: true };
  }

  // Generate pairings for a round (no repeat pairs within session)
  generatePairings(sessionId: string, round: number): DatePair[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const participants = [...session.participants];
    const sessionHistory = this.pairHistory.get(sessionId) || new Set();
    const pairs: DatePair[] = [];

    // Shuffle participants
    for (let i = participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [participants[i], participants[j]] = [participants[j], participants[i]];
    }

    // Generate pairs avoiding repeats
    const paired = new Set<string>();
    for (let i = 0; i < participants.length; i++) {
      if (paired.has(participants[i])) continue;

      for (let j = i + 1; j < participants.length; j++) {
        if (paired.has(participants[j])) continue;

        const pairKey = [participants[i], participants[j]].sort().join('_');
        if (sessionHistory.has(pairKey)) continue;

        const pair: DatePair = {
          id: `pair_${Date.now()}_${pairs.length}`,
          sessionId,
          user1Id: participants[i],
          user2Id: participants[j],
          startTime: Date.now(),
          endTime: Date.now() + (session.pairDuration * 1000),
          extensionsUsed: 0,
          status: 'active',
          user1Rating: null,
          user2Rating: null,
          contactExchanged: false,
        };

        pairs.push(pair);
        this.pairs.set(pair.id, pair);
        paired.add(participants[i]);
        paired.add(participants[j]);
        sessionHistory.add(pairKey);
        break;
      }
    }

    this.pairHistory.set(sessionId, sessionHistory);

    // Create time slot
    const slot: TimeSlot = {
      id: `slot_${round}_${sessionId}`,
      sessionId,
      startTime: Date.now(),
      endTime: Date.now() + (session.pairDuration * 1000),
      pairings: pairs,
      round,
    };

    const slots = this.timeSlots.get(sessionId) || [];
    slots.push(slot);
    this.timeSlots.set(sessionId, slots);

    return pairs;
  }

  // Extend time for a pair
  extendTime(pairId: string, userId: string): { success: boolean; newEndTime?: number; extensionsRemaining?: number; error?: string } {
    const pair = this.pairs.get(pairId);
    if (!pair) return { success: false, error: 'Pair not found' };
    if (pair.status !== 'active') return { success: false, error: 'Date is not active' };
    if (pair.user1Id !== userId && pair.user2Id !== userId) {
      return { success: false, error: 'Not a participant' };
    }

    const session = this.sessions.get(pair.sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    if (pair.extensionsUsed >= session.maxExtensions) {
      return { success: false, error: 'Maximum extensions reached' };
    }

    pair.extensionsUsed++;
    pair.endTime += session.extensionDuration * 1000;
    this.pairs.set(pairId, pair);

    return {
      success: true,
      newEndTime: pair.endTime,
      extensionsRemaining: session.maxExtensions - pair.extensionsUsed,
    };
  }

  // Submit rating for a date
  ratePair(pairId: string, raterId: string, rating: 'thumbs_up' | 'thumbs_down', feedback?: string): { success: boolean; contactExchanged?: boolean } {
    const pair = this.pairs.get(pairId);
    if (!pair) return { success: false };

    // Record rating
    if (pair.user1Id === raterId) {
      pair.user1Rating = rating;
    } else if (pair.user2Id === raterId) {
      pair.user2Rating = rating;
    } else {
      return { success: false };
    }

    const dateRating: DateRating = {
      pairId,
      raterId,
      ratedId: pair.user1Id === raterId ? pair.user2Id : pair.user1Id,
      rating,
      feedback,
      timestamp: Date.now(),
    };
    this.ratings.push(dateRating);

    // Check for mutual thumbs-up (contact exchange)
    let contactExchanged = false;
    if (pair.user1Rating === 'thumbs_up' && pair.user2Rating === 'thumbs_up') {
      pair.contactExchanged = true;
      contactExchanged = true;
    }

    pair.status = 'completed';
    this.pairs.set(pairId, pair);

    return { success: true, contactExchanged };
  }

  // Get session analytics
  getSessionAnalytics(sessionId: string): SessionAnalytics {
    const session = this.sessions.get(sessionId);
    const slots = this.timeSlots.get(sessionId) || [];

    const allPairs = slots.flatMap(s => s.pairings);
    const completedPairs = allPairs.filter(p => p.status === 'completed');
    const mutualMatches = completedPairs.filter(p => p.contactExchanged);
    const totalExtensions = allPairs.reduce((sum, p) => sum + p.extensionsUsed, 0);
    const sessionRatings = this.ratings.filter(r => {
      const pair = this.pairs.get(r.pairId);
      return pair && pair.sessionId === sessionId;
    });
    const thumbsUp = sessionRatings.filter(r => r.rating === 'thumbs_up').length;

    return {
      sessionId,
      totalParticipants: session?.participants.length || 0,
      totalPairings: allPairs.length,
      mutualMatches: mutualMatches.length,
      averageExtensions: allPairs.length > 0 ? totalExtensions / allPairs.length : 0,
      contactExchanges: mutualMatches.length,
      completionRate: allPairs.length > 0 ? completedPairs.length / allPairs.length : 0,
      averageRating: sessionRatings.length > 0 ? thumbsUp / sessionRatings.length : 0,
    };
  }

  // List available sessions
  listSessions(filters?: { status?: string; upcoming?: boolean }): SpeedDateSession[] {
    const sessions = Array.from(this.sessions.values());
    return sessions.filter(s => {
      if (filters?.status && s.status !== filters.status) return false;
      if (filters?.upcoming && s.startTime < Date.now()) return false;
      return true;
    });
  }

  // Get session history for a user
  getUserHistory(userId: string): { session: SpeedDateSession; pairs: DatePair[] }[] {
    const result: { session: SpeedDateSession; pairs: DatePair[] }[] = [];
    for (const session of this.sessions.values()) {
      if (!session.participants.includes(userId)) continue;
      const userPairs = Array.from(this.pairs.values()).filter(
        p => p.sessionId === session.id && (p.user1Id === userId || p.user2Id === userId)
      );
      if (userPairs.length > 0) {
        result.push({ session, pairs: userPairs });
      }
    }
    return result;
  }

  // Manage waitlist (promote from waitlist when spot opens)
  promoteFromWaitlist(sessionId: string): WaitlistEntry | null {
    const session = this.sessions.get(sessionId);
    const waitlist = this.waitlists.get(sessionId);
    if (!session || !waitlist || waitlist.length === 0) return null;

    if (session.participants.length >= session.maxParticipants) return null;

    const next = waitlist.shift()!;
    session.participants.push(next.userId);
    session.waitlist = session.waitlist.filter(id => id !== next.userId);
    this.sessions.set(sessionId, session);
    this.waitlists.set(sessionId, waitlist);
    next.notified = true;

    return next;
  }

  // Get pair by ID
  getPair(pairId: string): DatePair | null {
    return this.pairs.get(pairId) || null;
  }

  // Get session by ID
  getSession(sessionId: string): SpeedDateSession | null {
    return this.sessions.get(sessionId) || null;
  }
}

export const speedDatingService = new SpeedDatingService();
export default speedDatingService;
