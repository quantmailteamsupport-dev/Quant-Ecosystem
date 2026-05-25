// ============================================================================
// QuantTube - Premiere Service
// Video premieres, countdowns, waiting rooms, reminders, live chat during premiere
// ============================================================================

interface Premiere {
  id: string;
  videoId: string;
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  premiereDate: string;
  status: 'scheduled' | 'countdown' | 'live' | 'ended' | 'cancelled';
  chatEnabled: boolean;
  countdownStarted: boolean;
  countdownDuration: number;
  waitingRoom: WaitingRoom;
  rsvps: RSVP[];
  reminders: Reminder[];
  createdAt: string;
  updatedAt: string;
}

interface WaitingRoom {
  isOpen: boolean;
  currentViewers: number;
  peakViewers: number;
  chatMessages: PremiereChat[];
  theme: 'default' | 'celebration' | 'mystery' | 'gaming';
}

interface PremiereChat {
  id: string;
  userId: string;
  username: string;
  message: string;
  type: 'text' | 'superchat' | 'emote' | 'system';
  amount?: number;
  timestamp: string;
}

interface RSVP {
  userId: string;
  status: 'attending' | 'maybe' | 'declined';
  notifyBefore: number;
  rsvpAt: string;
}

interface Reminder {
  id: string;
  userId: string;
  type: 'email' | 'push' | 'sms';
  minutesBefore: number;
  sent: boolean;
  sentAt?: string;
}

interface CountdownConfig {
  duration: number;
  showTrailer: boolean;
  trailerUrl?: string;
  musicEnabled: boolean;
  customMessage?: string;
  effects: ('confetti' | 'fireworks' | 'spotlight')[];
}

class PremiereService {
  private premieres: Map<string, Premiere> = new Map();
  private videoPremieres: Map<string, string> = new Map();
  private channelPremieres: Map<string, string[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async schedule(videoId: string, channelId: string, premiereDate: string, options?: { title?: string; description?: string; chatEnabled?: boolean }): Promise<Premiere> {
    const dateTime = new Date(premiereDate).getTime();
    if (dateTime <= Date.now()) throw new Error('Premiere date must be in the future');
    if (dateTime - Date.now() < 3600000) throw new Error('Must schedule at least 1 hour in advance');

    const existing = this.videoPremieres.get(videoId);
    if (existing) throw new Error('Video already has a premiere scheduled');

    const premiere: Premiere = {
      id: this.genId('prem'),
      videoId,
      channelId,
      title: options?.title || `Premiere - ${new Date(premiereDate).toLocaleDateString()}`,
      description: options?.description || '',
      thumbnailUrl: `https://cdn.quant.tube/premieres/${videoId}/thumb.jpg`,
      premiereDate,
      status: 'scheduled',
      chatEnabled: options?.chatEnabled ?? true,
      countdownStarted: false,
      countdownDuration: 120,
      waitingRoom: {
        isOpen: false,
        currentViewers: 0,
        peakViewers: 0,
        chatMessages: [],
        theme: 'default',
      },
      rsvps: [],
      reminders: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.premieres.set(premiere.id, premiere);
    this.videoPremieres.set(videoId, premiere.id);
    const cPremieres = this.channelPremieres.get(channelId) || [];
    cPremieres.push(premiere.id);
    this.channelPremieres.set(channelId, cPremieres);

    return premiere;
  }

  async createCountdown(premiereId: string, config: CountdownConfig): Promise<{ premiereId: string; countdownStartsAt: string; config: CountdownConfig }> {
    const premiere = this.premieres.get(premiereId);
    if (!premiere) throw new Error('Premiere not found');
    if (premiere.status !== 'scheduled') throw new Error('Premiere must be in scheduled state');

    premiere.countdownDuration = config.duration;
    premiere.countdownStarted = true;
    premiere.status = 'countdown';
    premiere.waitingRoom.isOpen = true;
    premiere.updatedAt = new Date().toISOString();

    const countdownStartsAt = new Date(new Date(premiere.premiereDate).getTime() - config.duration * 1000).toISOString();

    return { premiereId, countdownStartsAt, config };
  }

  async goLive(premiereId: string): Promise<Premiere> {
    const premiere = this.premieres.get(premiereId);
    if (!premiere) throw new Error('Premiere not found');
    if (premiere.status === 'ended' || premiere.status === 'cancelled') throw new Error('Cannot go live with this premiere');

    premiere.status = 'live';
    premiere.updatedAt = new Date().toISOString();

    // System announcement
    premiere.waitingRoom.chatMessages.push({
      id: this.genId('chat'),
      userId: 'system',
      username: 'System',
      message: 'The premiere is now live! Enjoy the video!',
      type: 'system',
      timestamp: new Date().toISOString(),
    });

    return premiere;
  }

  async enableChat(premiereId: string, enabled: boolean): Promise<Premiere> {
    const premiere = this.premieres.get(premiereId);
    if (!premiere) throw new Error('Premiere not found');
    premiere.chatEnabled = enabled;
    premiere.updatedAt = new Date().toISOString();
    return premiere;
  }

  async getWaitingRoom(premiereId: string): Promise<WaitingRoom> {
    const premiere = this.premieres.get(premiereId);
    if (!premiere) throw new Error('Premiere not found');

    // Simulate viewers
    if (premiere.status === 'countdown' || premiere.status === 'live') {
      premiere.waitingRoom.currentViewers = Math.floor(10 + Math.random() * 500);
      premiere.waitingRoom.peakViewers = Math.max(premiere.waitingRoom.peakViewers, premiere.waitingRoom.currentViewers);
    }

    return premiere.waitingRoom;
  }

  async sendReminder(premiereId: string, userId: string, type: Reminder['type'], minutesBefore: number): Promise<Reminder> {
    const premiere = this.premieres.get(premiereId);
    if (!premiere) throw new Error('Premiere not found');

    const existing = premiere.reminders.find(r => r.userId === userId && r.type === type);
    if (existing) throw new Error('Reminder already set');

    const reminder: Reminder = {
      id: this.genId('rem'),
      userId,
      type,
      minutesBefore,
      sent: false,
    };

    premiere.reminders.push(reminder);
    return reminder;
  }

  async cancelPremiere(premiereId: string): Promise<Premiere> {
    const premiere = this.premieres.get(premiereId);
    if (!premiere) throw new Error('Premiere not found');
    if (premiere.status === 'live') throw new Error('Cannot cancel a live premiere');
    if (premiere.status === 'ended') throw new Error('Premiere already ended');

    premiere.status = 'cancelled';
    premiere.updatedAt = new Date().toISOString();
    this.videoPremieres.delete(premiere.videoId);

    return premiere;
  }

  async getRSVPs(premiereId: string): Promise<{ total: number; attending: number; maybe: number; declined: number; rsvps: RSVP[] }> {
    const premiere = this.premieres.get(premiereId);
    if (!premiere) throw new Error('Premiere not found');

    const attending = premiere.rsvps.filter(r => r.status === 'attending').length;
    const maybe = premiere.rsvps.filter(r => r.status === 'maybe').length;
    const declined = premiere.rsvps.filter(r => r.status === 'declined').length;

    return { total: premiere.rsvps.length, attending, maybe, declined, rsvps: premiere.rsvps };
  }

  async rsvp(premiereId: string, userId: string, status: RSVP['status']): Promise<RSVP> {
    const premiere = this.premieres.get(premiereId);
    if (!premiere) throw new Error('Premiere not found');

    const existing = premiere.rsvps.find(r => r.userId === userId);
    if (existing) {
      existing.status = status;
      existing.rsvpAt = new Date().toISOString();
      return existing;
    }

    const rsvp: RSVP = { userId, status, notifyBefore: 15, rsvpAt: new Date().toISOString() };
    premiere.rsvps.push(rsvp);
    return rsvp;
  }

  async addChatMessage(premiereId: string, userId: string, username: string, message: string): Promise<PremiereChat> {
    const premiere = this.premieres.get(premiereId);
    if (!premiere) throw new Error('Premiere not found');
    if (!premiere.chatEnabled) throw new Error('Chat is disabled');

    const chatMsg: PremiereChat = {
      id: this.genId('chat'),
      userId,
      username,
      message: message.substring(0, 300),
      type: 'text',
      timestamp: new Date().toISOString(),
    };

    premiere.waitingRoom.chatMessages.push(chatMsg);
    if (premiere.waitingRoom.chatMessages.length > 1000) {
      premiere.waitingRoom.chatMessages = premiere.waitingRoom.chatMessages.slice(-500);
    }

    return chatMsg;
  }

  async getUpcoming(channelId: string): Promise<Premiere[]> {
    const ids = this.channelPremieres.get(channelId) || [];
    return ids
      .map(id => this.premieres.get(id))
      .filter((p): p is Premiere => !!p && (p.status === 'scheduled' || p.status === 'countdown'))
      .sort((a, b) => new Date(a.premiereDate).getTime() - new Date(b.premiereDate).getTime());
  }
}

export const premiereService = new PremiereService();
export { PremiereService };
