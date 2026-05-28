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
  private lastTimestamp: number | null = null;

  constructor(config?: Partial<VADConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    this.running = true;
    this.isSpeaking = false;
    this.speechStartTime = null;
    this.lastSpeechTime = null;
    this.lastTimestamp = null;
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

  /**
   * Feed an audio chunk for voice activity analysis.
   *
   * **Timestamp contract:** Callers MUST provide monotonically non-decreasing
   * `chunk.timestamp` values. The VAD uses these timestamps (not wall-clock
   * time) to measure speech duration and silence gaps. If a chunk arrives with
   * a timestamp earlier than the previous chunk, it is ignored (out-of-order
   * audio cannot be meaningfully analyzed for temporal speech patterns).
   *
   * @param chunk - Audio chunk with PCM samples and a non-decreasing timestamp.
   */
  feedAudio(chunk: AudioChunk): void {
    if (!this.running) return;

    // Validate monotonically non-decreasing timestamps
    if (this.lastTimestamp !== null && chunk.timestamp < this.lastTimestamp) {
      // Out-of-order chunk; ignore it silently since temporal analysis
      // requires ordered timestamps.
      return;
    }
    this.lastTimestamp = chunk.timestamp;

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
