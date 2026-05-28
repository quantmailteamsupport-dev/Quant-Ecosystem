import type { AudioChunk, VADConfig, VADEvent } from '../types.js';

const DEFAULT_CONFIG: VADConfig = {
  threshold: 0.01,
  silenceDuration: 500,
  minSpeechDuration: 100,
};

export class VoiceActivityDetector {
  private config: VADConfig;
  private eventCallbacks: ((event: VADEvent) => void)[] = [];
  private running = false;
  private isSpeaking = false;
  private speechStartTime: number | null = null;
  private lastSpeechTime: number | null = null;

  constructor(config?: Partial<VADConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    this.running = true;
    this.isSpeaking = false;
    this.speechStartTime = null;
    this.lastSpeechTime = null;
  }

  stop(): void {
    this.running = false;
    if (this.isSpeaking) {
      this.emitEvent({
        type: 'speech-end',
        timestamp: Date.now(),
        confidence: 1.0,
      });
      this.isSpeaking = false;
    }
  }

  feedAudio(chunk: AudioChunk): void {
    if (!this.running) return;

    const energy = this.computeRMS(chunk.data);
    const now = chunk.timestamp;

    if (energy >= this.config.threshold) {
      this.lastSpeechTime = now;

      if (!this.isSpeaking) {
        if (this.speechStartTime === null) {
          this.speechStartTime = now;
        }

        const speechDuration = now - this.speechStartTime;
        if (speechDuration >= this.config.minSpeechDuration) {
          this.isSpeaking = true;
          this.emitEvent({
            type: 'speech-start',
            timestamp: this.speechStartTime,
            confidence: Math.min(energy / this.config.threshold, 1.0),
          });
        }
      }
    } else {
      // Below threshold - potential silence
      if (this.isSpeaking && this.lastSpeechTime !== null) {
        const silenceLength = now - this.lastSpeechTime;
        if (silenceLength >= this.config.silenceDuration) {
          this.isSpeaking = false;
          this.speechStartTime = null;
          this.emitEvent({
            type: 'speech-end',
            timestamp: now,
            confidence: 1.0,
          });
        }
      } else if (!this.isSpeaking) {
        // Reset speech start if we haven't hit the minimum duration yet
        this.speechStartTime = null;
        this.emitEvent({
          type: 'silence',
          timestamp: now,
          confidence: 1.0 - energy / this.config.threshold,
        });
      }
    }
  }

  onEvent(cb: (event: VADEvent) => void): void {
    this.eventCallbacks.push(cb);
  }

  private computeRMS(data: Float32Array): number {
    if (data.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const sample = data[i] ?? 0;
      sum += sample * sample;
    }
    return Math.sqrt(sum / data.length);
  }

  private emitEvent(event: VADEvent): void {
    for (const cb of this.eventCallbacks) {
      cb(event);
    }
  }
}
