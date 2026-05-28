import type { ASRProvider, ASRResult, AudioChunk, TranscriptSegment } from '../types.js';

export interface WhisperServerConfig {
  endpoint: string;
  apiKey?: string;
  model?: string;
  language?: string;
}

export class WhisperServerProvider implements ASRProvider {
  private config: WhisperServerConfig;
  private resultCallbacks: ((result: ASRResult) => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];
  private running = false;
  private segmentId = 0;

  constructor(config: WhisperServerConfig) {
    this.config = config;
  }

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  feedAudio(chunk: AudioChunk): void {
    if (!this.running) return;

    // Simulate async processing via streaming endpoint
    this.processChunk(chunk).catch((err) => {
      for (const cb of this.errorCallbacks) {
        cb(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  onResult(cb: (result: ASRResult) => void): void {
    this.resultCallbacks.push(cb);
  }

  onError(cb: (error: Error) => void): void {
    this.errorCallbacks.push(cb);
  }

  private async processChunk(chunk: AudioChunk): Promise<void> {
    const startTime = performance.now();
    const body = this.buildRequestBody(chunk);

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`ASR request failed: ${response.status}`);
    }

    const data = (await response.json()) as { text?: string; segments?: Array<{ text: string }> };
    const latencyMs = performance.now() - startTime;

    const segments: TranscriptSegment[] = [
      {
        id: `seg-${this.segmentId++}`,
        speaker: 'user',
        text: data.text ?? '',
        startTime: chunk.timestamp,
        endTime: chunk.timestamp + chunk.duration,
        confidence: 0.9,
        isFinal: true,
      },
    ];

    const result: ASRResult = { segments, isFinal: true, latencyMs };
    for (const cb of this.resultCallbacks) {
      cb(result);
    }
  }

  private buildRequestBody(chunk: AudioChunk): object {
    return {
      audio: Array.from(chunk.data),
      sample_rate: chunk.sampleRate,
      model: this.config.model ?? 'whisper-1',
      language: this.config.language ?? 'en',
    };
  }
}
