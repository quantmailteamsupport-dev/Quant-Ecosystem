import type {
  ASRProvider,
  ASRResult,
  AudioChunk,
  LiveSession,
  TranscriptSegment,
} from '../types.js';
import { LatencyTracker } from './latency-tracker.js';

type TranscriptCallback = (segments: TranscriptSegment[]) => void;
type ResponseCallback = (text: string) => void;
type AudioOutCallback = (chunk: AudioChunk) => void;

export class LivePipeline {
  private asrProvider: ASRProvider | null = null;
  private transcriptCallbacks: TranscriptCallback[] = [];
  private responseCallbacks: ResponseCallback[] = [];
  private audioOutCallbacks: AudioOutCallback[] = [];
  private running = false;
  private chunkId = 0;
  readonly latencyTracker: LatencyTracker;

  constructor(latencyTracker?: LatencyTracker) {
    this.latencyTracker = latencyTracker ?? new LatencyTracker();
  }

  start(_session: LiveSession, provider: ASRProvider): void {
    this.asrProvider = provider;
    this.running = true;

    this.asrProvider.onResult((result: ASRResult) => {
      this.handleASRResult(result);
    });

    this.asrProvider.start();
  }

  stop(): void {
    if (this.asrProvider) {
      this.asrProvider.stop();
    }
    this.running = false;
    this.asrProvider = null;
  }

  feedAudio(chunk: AudioChunk): void {
    if (!this.running || !this.asrProvider) {
      return;
    }
    const measureId = `chunk-${this.chunkId++}`;
    this.latencyTracker.startMeasure('asr', measureId);
    this.asrProvider.feedAudio(chunk);
  }

  onTranscript(cb: TranscriptCallback): void {
    this.transcriptCallbacks.push(cb);
  }

  onResponse(cb: ResponseCallback): void {
    this.responseCallbacks.push(cb);
  }

  onAudioOut(cb: AudioOutCallback): void {
    this.audioOutCallbacks.push(cb);
  }

  isRunning(): boolean {
    return this.running;
  }

  getResponseCallbacks(): ResponseCallback[] {
    return this.responseCallbacks;
  }

  getAudioOutCallbacks(): AudioOutCallback[] {
    return this.audioOutCallbacks;
  }

  private handleASRResult(result: ASRResult): void {
    for (const cb of this.transcriptCallbacks) {
      cb(result.segments);
    }
  }
}
