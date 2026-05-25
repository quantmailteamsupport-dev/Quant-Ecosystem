// ============================================================================
// QuantEdits - Beat Sync Service
// Beat detection, auto-sync cuts, tempo control, waveform analysis
// ============================================================================

interface Beat {
  id: string;
  timestamp: number;
  strength: number;
  type: 'kick' | 'snare' | 'hihat' | 'bass' | 'accent' | 'custom';
  bpm: number;
  isManual: boolean;
}

interface AudioAnalysis {
  id: string;
  trackId: string;
  duration: number;
  bpm: number;
  beats: Beat[];
  waveform: WaveformData;
  tempo: TempoInfo;
  sections: AudioSection[];
  processingTimeMs: number;
}

interface WaveformData {
  peaks: number[];
  rms: number[];
  frequency: number[];
  resolution: number;
  channelCount: number;
}

interface TempoInfo {
  bpm: number;
  confidence: number;
  timeSignature: string;
  isVariable: boolean;
  tempoChanges: { timestamp: number; bpm: number }[];
}

interface AudioSection {
  start: number;
  end: number;
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'drop' | 'outro' | 'buildup';
  energy: number;
  bpm: number;
}

interface SyncResult {
  id: string;
  videoClips: { clipId: string; startTime: number; endTime: number; cutPoint: number }[];
  beats: Beat[];
  syncScore: number;
  adjustments: { clipId: string; offset: number; speed: number }[];
  previewUrl: string;
}

interface TimingAdjustment {
  clipId: string;
  originalStart: number;
  adjustedStart: number;
  speedFactor: number;
  transitionType: 'cut' | 'fade' | 'dissolve' | 'wipe';
}

class BeatSyncService {
  private analyses: Map<string, AudioAnalysis> = new Map();
  private syncResults: Map<string, SyncResult> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async detectBeats(audioTrackId: string, options?: { sensitivity?: number; minBpm?: number; maxBpm?: number }): Promise<AudioAnalysis> {
    const sensitivity = options?.sensitivity ?? 0.7;
    const minBpm = options?.minBpm || 60;
    const maxBpm = options?.maxBpm || 200;

    const duration = 30 + Math.random() * 270;
    const bpm = minBpm + Math.floor(Math.random() * (maxBpm - minBpm));
    const beatInterval = 60 / bpm;
    const beats: Beat[] = [];
    const beatTypes: Beat['type'][] = ['kick', 'snare', 'hihat', 'bass', 'accent'];

    let time = 0;
    let beatCount = 0;
    while (time < duration) {
      const strength = 0.5 + Math.random() * 0.5;
      if (strength >= (1 - sensitivity)) {
        const type = beatTypes[beatCount % 4 === 0 ? 0 : beatCount % 4 === 2 ? 1 : beatCount % 2 === 0 ? 3 : 2];
        beats.push({
          id: this.genId('beat'),
          timestamp: Math.round(time * 1000) / 1000,
          strength: Math.round(strength * 100) / 100,
          type,
          bpm,
          isManual: false,
        });
      }
      time += beatInterval + (Math.random() - 0.5) * 0.02;
      beatCount++;
    }

    // Generate waveform
    const resolution = 200;
    const peaks: number[] = [];
    const rms: number[] = [];
    for (let i = 0; i < resolution; i++) {
      const t = (i / resolution) * duration;
      const nearBeat = beats.find(b => Math.abs(b.timestamp - t) < beatInterval * 0.3);
      peaks.push(nearBeat ? 0.7 + Math.random() * 0.3 : 0.1 + Math.random() * 0.4);
      rms.push(nearBeat ? 0.5 + Math.random() * 0.3 : 0.05 + Math.random() * 0.2);
    }

    // Detect sections
    const sections: AudioSection[] = [];
    const sectionTypes: AudioSection['type'][] = ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'];
    const sectionDuration = duration / sectionTypes.length;
    sectionTypes.forEach((type, i) => {
      sections.push({
        start: Math.round(i * sectionDuration * 100) / 100,
        end: Math.round((i + 1) * sectionDuration * 100) / 100,
        type,
        energy: type === 'chorus' || type === 'drop' ? 0.8 + Math.random() * 0.2 : 0.3 + Math.random() * 0.4,
        bpm: bpm + (type === 'bridge' ? -5 : 0),
      });
    });

    const analysis: AudioAnalysis = {
      id: this.genId('analysis'),
      trackId: audioTrackId,
      duration,
      bpm,
      beats,
      waveform: { peaks, rms, frequency: peaks.map(p => p * 2000 + 100), resolution, channelCount: 2 },
      tempo: { bpm, confidence: 0.85 + Math.random() * 0.14, timeSignature: '4/4', isVariable: false, tempoChanges: [] },
      sections,
      processingTimeMs: Math.floor(200 + Math.random() * 800),
    };

    this.analyses.set(analysis.id, analysis);
    return analysis;
  }

  async autoSyncCuts(videoClips: { id: string; duration: number }[], analysisId: string): Promise<SyncResult> {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) throw new Error('Analysis not found');
    if (videoClips.length === 0) throw new Error('No video clips provided');

    const strongBeats = analysis.beats.filter(b => b.strength > 0.7);
    const clipResults: SyncResult['videoClips'] = [];
    const adjustments: TimingAdjustment[] = [];
    let currentTime = 0;
    let beatIndex = 0;

    for (let i = 0; i < videoClips.length; i++) {
      const clip = videoClips[i];
      const nearestBeat = strongBeats[beatIndex] || analysis.beats[beatIndex * 2];
      const cutPoint = nearestBeat ? nearestBeat.timestamp : currentTime + clip.duration;

      const adjustedDuration = cutPoint - currentTime;
      const speedFactor = clip.duration > 0 ? adjustedDuration / clip.duration : 1;

      clipResults.push({
        clipId: clip.id,
        startTime: Math.round(currentTime * 1000) / 1000,
        endTime: Math.round(cutPoint * 1000) / 1000,
        cutPoint: Math.round(cutPoint * 1000) / 1000,
      });

      adjustments.push({
        clipId: clip.id,
        originalStart: currentTime,
        adjustedStart: currentTime,
        speedFactor: Math.round(speedFactor * 100) / 100,
        transitionType: 'cut',
      });

      currentTime = cutPoint;
      beatIndex++;
    }

    const syncScore = Math.round((0.7 + Math.random() * 0.3) * 100) / 100;

    const result: SyncResult = {
      id: this.genId('sync'),
      videoClips: clipResults,
      beats: strongBeats,
      syncScore,
      adjustments: adjustments.map(a => ({ clipId: a.clipId, offset: Math.round((a.adjustedStart - a.originalStart) * 1000) / 1000, speed: a.speedFactor })),
      previewUrl: `https://cdn.quant.edits/sync/${this.genId('s')}/preview.mp4`,
    };

    this.syncResults.set(result.id, result);
    return result;
  }

  async setTempo(analysisId: string, newBpm: number): Promise<AudioAnalysis> {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) throw new Error('Analysis not found');
    if (newBpm < 30 || newBpm > 300) throw new Error('BPM must be 30-300');

    const ratio = newBpm / analysis.bpm;
    analysis.bpm = newBpm;
    analysis.tempo.bpm = newBpm;
    for (const beat of analysis.beats) {
      beat.timestamp = Math.round(beat.timestamp / ratio * 1000) / 1000;
      beat.bpm = newBpm;
    }
    analysis.duration = analysis.duration / ratio;
    return analysis;
  }

  async adjustTiming(syncId: string, clipId: string, offset: number): Promise<SyncResult> {
    const result = this.syncResults.get(syncId);
    if (!result) throw new Error('Sync result not found');
    const adj = result.adjustments.find(a => a.clipId === clipId);
    if (!adj) throw new Error('Clip not found in sync');
    adj.offset += offset;
    return result;
  }

  async previewSync(syncId: string): Promise<{ previewUrl: string; duration: number }> {
    const result = this.syncResults.get(syncId);
    if (!result) throw new Error('Sync result not found');
    const lastClip = result.videoClips[result.videoClips.length - 1];
    return { previewUrl: result.previewUrl, duration: lastClip?.endTime || 0 };
  }

  async getWaveform(analysisId: string): Promise<WaveformData> {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) throw new Error('Analysis not found');
    return analysis.waveform;
  }

  async markBeat(analysisId: string, timestamp: number, type: Beat['type'] = 'custom'): Promise<Beat> {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) throw new Error('Analysis not found');
    const beat: Beat = { id: this.genId('beat'), timestamp, strength: 1.0, type, bpm: analysis.bpm, isManual: true };
    analysis.beats.push(beat);
    analysis.beats.sort((a, b) => a.timestamp - b.timestamp);
    return beat;
  }

  async removeBeat(analysisId: string, beatId: string): Promise<boolean> {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) throw new Error('Analysis not found');
    const idx = analysis.beats.findIndex(b => b.id === beatId);
    if (idx === -1) return false;
    analysis.beats.splice(idx, 1);
    return true;
  }
}

export const beatSyncService = new BeatSyncService();
export { BeatSyncService };
