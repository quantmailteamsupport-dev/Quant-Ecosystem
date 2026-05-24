// ============================================================================
// QuantTube - Live Service
// Live stream management, WebRTC ingest, stream key management
// ============================================================================

interface StreamSession {
  id: string;
  streamKey: string;
  ingestProtocol: 'rtmp' | 'webrtc' | 'srt';
  status: 'connecting' | 'live' | 'reconnecting' | 'ended';
  bitrate: number;
  fps: number;
  resolution: string;
  audioCodec: string;
  videoCodec: string;
  startedAt: string;
  health: StreamHealth;
}

interface StreamHealth {
  droppedFrames: number;
  bitrate: number;
  fps: number;
  latency: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface WebRTCOffer {
  sdp: string;
  type: 'offer';
  iceServers: ICEServer[];
}

interface ICEServer {
  urls: string[];
  username?: string;
  credential?: string;
}

class LiveService {
  private sessions: Map<string, StreamSession> = new Map();
  private streamKeys: Map<string, string> = new Map();

  generateStreamKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'live_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  getPlaybackUrl(streamId: string, streamKey: string): string {
    return `https://live.cdn.quant.app/play/${streamId}/index.m3u8?token=${Buffer.from(streamKey).toString('base64url').substring(0, 16)}`;
  }

  createIngestSession(streamKey: string, protocol: 'rtmp' | 'webrtc' | 'srt'): StreamSession {
    const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const session: StreamSession = {
      id: sessionId,
      streamKey,
      ingestProtocol: protocol,
      status: 'connecting',
      bitrate: 0,
      fps: 0,
      resolution: '1920x1080',
      audioCodec: 'aac',
      videoCodec: protocol === 'webrtc' ? 'vp8' : 'h264',
      startedAt: new Date().toISOString(),
      health: { droppedFrames: 0, bitrate: 0, fps: 0, latency: 0, quality: 'good' },
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getWebRTCOffer(streamId: string): WebRTCOffer {
    return {
      sdp: `v=0\r\no=- ${Date.now()} 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=rtpmap:96 VP8/90000\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=rtpmap:111 opus/48000/2\r\n`,
      type: 'offer',
      iceServers: [
        { urls: ['stun:stun.quant.app:3478'] },
        { urls: ['turn:turn.quant.app:3478'], username: 'quantube', credential: `cred_${Date.now().toString(36)}` },
      ],
    };
  }

  updateStreamHealth(sessionId: string, metrics: Partial<StreamHealth>): StreamHealth {
    const session = this.sessions.get(sessionId);
    if (!session) return { droppedFrames: 0, bitrate: 0, fps: 0, latency: 0, quality: 'poor' };

    if (metrics.bitrate !== undefined) session.health.bitrate = metrics.bitrate;
    if (metrics.fps !== undefined) session.health.fps = metrics.fps;
    if (metrics.droppedFrames !== undefined) session.health.droppedFrames = metrics.droppedFrames;
    if (metrics.latency !== undefined) session.health.latency = metrics.latency;

    // Calculate quality based on metrics
    const bitrateOk = session.health.bitrate > 2000000;
    const fpsOk = session.health.fps >= 25;
    const latencyOk = session.health.latency < 2000;
    const framesOk = session.health.droppedFrames < 100;

    const score = [bitrateOk, fpsOk, latencyOk, framesOk].filter(Boolean).length;
    session.health.quality = score >= 4 ? 'excellent' : score >= 3 ? 'good' : score >= 2 ? 'fair' : 'poor';

    return session.health;
  }

  getTranscodeTargets(sourceBitrate: number, sourceResolution: string): string[] {
    const targets: string[] = [];
    if (sourceBitrate >= 16000000) targets.push('4k', '1080p', '720p', '480p');
    else if (sourceBitrate >= 5000000) targets.push('1080p', '720p', '480p');
    else if (sourceBitrate >= 2800000) targets.push('720p', '480p');
    else targets.push('480p', '360p');
    return targets;
  }

  getLowLatencyConfig(): { chunkDuration: number; playlistSize: number; targetLatency: number } {
    return { chunkDuration: 1, playlistSize: 3, targetLatency: 2 };
  }
}

export const liveService = new LiveService();
