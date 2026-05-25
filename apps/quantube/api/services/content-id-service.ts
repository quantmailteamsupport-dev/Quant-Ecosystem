// ============================================================================
// QuantTube - Content ID Service
// Audio/visual fingerprinting, matching, claims, disputes, monetization
// ============================================================================

interface ContentFingerprint {
  id: string;
  videoId: string;
  ownerId: string;
  audioHash: string;
  visualHash: string;
  duration: number;
  segments: FingerprintSegment[];
  createdAt: string;
  status: 'active' | 'revoked';
}

interface FingerprintSegment {
  startTime: number;
  endTime: number;
  audioSignature: string;
  visualSignature: string;
  confidence: number;
}

interface ContentMatch {
  id: string;
  originalFingerprintId: string;
  matchedVideoId: string;
  matchPercentage: number;
  matchedSegments: { original: [number, number]; matched: [number, number]; confidence: number }[];
  detectedAt: string;
  status: 'pending' | 'claimed' | 'disputed' | 'resolved' | 'released';
  action: 'monetize' | 'block' | 'track' | 'none';
}

interface ContentClaim {
  id: string;
  matchId: string;
  claimantId: string;
  videoId: string;
  reason: string;
  action: 'monetize' | 'block' | 'track';
  status: 'active' | 'disputed' | 'released' | 'expired';
  revenueShare: number;
  createdAt: string;
  expiresAt: string;
}

interface Dispute {
  id: string;
  claimId: string;
  disputantId: string;
  reason: 'fair_use' | 'license' | 'public_domain' | 'misidentification' | 'other';
  evidence: string;
  status: 'pending' | 'upheld' | 'overturned' | 'expired';
  createdAt: string;
  resolvedAt?: string;
}

class ContentIDService {
  private fingerprints: Map<string, ContentFingerprint> = new Map();
  private matches: Map<string, ContentMatch> = new Map();
  private claims: Map<string, ContentClaim> = new Map();
  private disputes: Map<string, Dispute> = new Map();
  private videoFingerprints: Map<string, string> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  private generateHash(data: string, length: number = 64): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    let result = '';
    for (let i = 0; i < length; i++) {
      result += hex[i % hex.length];
      if (i % 4 === 3) result += (Math.floor(Math.random() * 16)).toString(16);
    }
    return result.substring(0, length);
  }

  async fingerprint(videoId: string, ownerId: string): Promise<ContentFingerprint> {
    const existing = this.videoFingerprints.get(videoId);
    if (existing) {
      const fp = this.fingerprints.get(existing);
      if (fp) return fp;
    }

    const duration = 60 + Math.floor(Math.random() * 600);
    const segmentLength = 10;
    const numSegments = Math.ceil(duration / segmentLength);
    const segments: FingerprintSegment[] = [];

    for (let i = 0; i < numSegments; i++) {
      segments.push({
        startTime: i * segmentLength,
        endTime: Math.min((i + 1) * segmentLength, duration),
        audioSignature: this.generateHash(`audio_${videoId}_${i}`, 32),
        visualSignature: this.generateHash(`visual_${videoId}_${i}`, 32),
        confidence: 0.85 + Math.random() * 0.15,
      });
    }

    const fp: ContentFingerprint = {
      id: this.genId('fp'),
      videoId,
      ownerId,
      audioHash: this.generateHash(`full_audio_${videoId}`),
      visualHash: this.generateHash(`full_visual_${videoId}`),
      duration,
      segments,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    this.fingerprints.set(fp.id, fp);
    this.videoFingerprints.set(videoId, fp.id);
    return fp;
  }

  async match(fingerprintId: string): Promise<ContentMatch[]> {
    const fp = this.fingerprints.get(fingerprintId);
    if (!fp) throw new Error('Fingerprint not found');

    const allFps = Array.from(this.fingerprints.values()).filter(f => f.id !== fingerprintId && f.status === 'active');
    const matches: ContentMatch[] = [];

    for (const other of allFps) {
      const similarity = this.computeSimilarity(fp, other);
      if (similarity > 0.3) {
        const matchedSegments = this.findMatchingSegments(fp, other);
        const match: ContentMatch = {
          id: this.genId('match'),
          originalFingerprintId: fingerprintId,
          matchedVideoId: other.videoId,
          matchPercentage: Math.round(similarity * 100),
          matchedSegments,
          detectedAt: new Date().toISOString(),
          status: 'pending',
          action: 'none',
        };
        this.matches.set(match.id, match);
        matches.push(match);
      }
    }
    return matches;
  }

  private computeSimilarity(fp1: ContentFingerprint, fp2: ContentFingerprint): number {
    let matchCount = 0;
    const minSegments = Math.min(fp1.segments.length, fp2.segments.length);
    for (let i = 0; i < minSegments; i++) {
      const audioSim = this.hashSimilarity(fp1.segments[i].audioSignature, fp2.segments[i].audioSignature);
      const visualSim = this.hashSimilarity(fp1.segments[i].visualSignature, fp2.segments[i].visualSignature);
      if (audioSim > 0.7 || visualSim > 0.7) matchCount++;
    }
    return minSegments > 0 ? matchCount / minSegments : 0;
  }

  private hashSimilarity(h1: string, h2: string): number {
    let same = 0;
    const len = Math.min(h1.length, h2.length);
    for (let i = 0; i < len; i++) { if (h1[i] === h2[i]) same++; }
    return same / len;
  }

  private findMatchingSegments(fp1: ContentFingerprint, fp2: ContentFingerprint): { original: [number, number]; matched: [number, number]; confidence: number }[] {
    const result: { original: [number, number]; matched: [number, number]; confidence: number }[] = [];
    const minSeg = Math.min(fp1.segments.length, fp2.segments.length);
    for (let i = 0; i < minSeg; i++) {
      const sim = this.hashSimilarity(fp1.segments[i].audioSignature, fp2.segments[i].audioSignature);
      if (sim > 0.6) {
        result.push({ original: [fp1.segments[i].startTime, fp1.segments[i].endTime], matched: [fp2.segments[i].startTime, fp2.segments[i].endTime], confidence: sim });
      }
    }
    return result;
  }

  async claimContent(matchId: string, claimantId: string, action: 'monetize' | 'block' | 'track'): Promise<ContentClaim> {
    const match = this.matches.get(matchId);
    if (!match) throw new Error('Match not found');
    if (match.status === 'claimed') throw new Error('Already claimed');

    const claim: ContentClaim = {
      id: this.genId('claim'), matchId, claimantId, videoId: match.matchedVideoId,
      reason: 'Content ID match detected', action, status: 'active',
      revenueShare: action === 'monetize' ? 100 : 0,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    };

    match.status = 'claimed';
    match.action = action;
    this.claims.set(claim.id, claim);
    return claim;
  }

  async resolveDispute(disputeId: string, decision: 'upheld' | 'overturned'): Promise<Dispute> {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) throw new Error('Dispute not found');
    dispute.status = decision;
    dispute.resolvedAt = new Date().toISOString();
    if (decision === 'overturned') {
      const claim = this.claims.get(dispute.claimId);
      if (claim) { claim.status = 'released'; const match = this.matches.get(claim.matchId); if (match) match.status = 'resolved'; }
    }
    return dispute;
  }

  async releaseClaim(claimId: string): Promise<ContentClaim> {
    const claim = this.claims.get(claimId);
    if (!claim) throw new Error('Claim not found');
    claim.status = 'released';
    const match = this.matches.get(claim.matchId);
    if (match) { match.status = 'released'; match.action = 'none'; }
    return claim;
  }

  async getMatchHistory(videoId: string): Promise<ContentMatch[]> {
    return Array.from(this.matches.values()).filter(m => m.matchedVideoId === videoId);
  }

  async monetize(claimId: string, revenueShare: number): Promise<ContentClaim> {
    const claim = this.claims.get(claimId);
    if (!claim) throw new Error('Claim not found');
    claim.action = 'monetize';
    claim.revenueShare = Math.max(0, Math.min(100, revenueShare));
    return claim;
  }

  async block(claimId: string): Promise<ContentClaim> {
    const claim = this.claims.get(claimId);
    if (!claim) throw new Error('Claim not found');
    claim.action = 'block';
    return claim;
  }

  async getOwners(videoId: string): Promise<{ ownerId: string; fingerprintId: string }[]> {
    const fpId = this.videoFingerprints.get(videoId);
    if (!fpId) return [];
    const fp = this.fingerprints.get(fpId);
    return fp ? [{ ownerId: fp.ownerId, fingerprintId: fp.id }] : [];
  }
}

export const contentIDService = new ContentIDService();
export { ContentIDService };
