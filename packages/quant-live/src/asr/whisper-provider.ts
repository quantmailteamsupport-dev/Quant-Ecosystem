import type { ASRProvider, ASRResult, AudioChunk, TranscriptSegment } from '../types.js';

export interface WhisperServerConfig {
  endpoint: string;
  apiKey?: string;
  model?: string;
  language?: string;
  /** Interval in ms to batch audio chunks before sending (default: 500) */
  batchIntervalMs?: number;
  /** Maximum concurrent in-flight requests (default: 2) */
  maxConcurrency?: number;
}

/**
 * Builds a WAV file header for PCM audio data.
 * WAV format: 44-byte RIFF header + raw PCM samples.
 */
function buildWavBlob(samples: Float32Array, sampleRate: number, channels: number): Blob {
  const numSamples = samples.length;
  const bytesPerSample = 2; // 16-bit PCM
  const dataSize = numSamples * bytesPerSample;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true); // byte rate
  view.setUint16(32, channels * bytesPerSample, true); // block align
  view.setUint16(34, bytesPerSample * 8, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Convert float32 samples to int16
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(headerSize + i * bytesPerSample, int16, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export class WhisperServerProvider implements ASRProvider {
  private config: WhisperServerConfig;
  private resultCallbacks: ((result: ASRResult) => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];
  private running = false;
  private segmentId = 0;

  // Backpressure: audio buffering
  private audioBuffer: AudioChunk[] = [];
  private batchTimer: ReturnType<typeof setInterval> | null = null;
  private inFlightCount = 0;
  private readonly batchIntervalMs: number;
  private readonly maxConcurrency: number;

  constructor(config: WhisperServerConfig) {
    this.config = config;
    this.batchIntervalMs = config.batchIntervalMs ?? 500;
    this.maxConcurrency = config.maxConcurrency ?? 2;
  }

  start(): void {
    this.running = true;
    this.batchTimer = setInterval(() => {
      this.flushBuffer();
    }, this.batchIntervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.batchTimer !== null) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    // Flush any remaining buffered audio
    this.flushBuffer();
  }

  feedAudio(chunk: AudioChunk): void {
    if (!this.running) return;
    this.audioBuffer.push(chunk);
  }

  onResult(cb: (result: ASRResult) => void): void {
    this.resultCallbacks.push(cb);
  }

  onError(cb: (error: Error) => void): void {
    this.errorCallbacks.push(cb);
  }

  /** Flush accumulated audio buffer as a single batched request. */
  private flushBuffer(): void {
    if (this.audioBuffer.length === 0) return;
    if (this.inFlightCount >= this.maxConcurrency) return;

    const chunks = this.audioBuffer.splice(0);
    this.processBatch(chunks).catch((err) => {
      for (const cb of this.errorCallbacks) {
        cb(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private async processBatch(chunks: AudioChunk[]): Promise<void> {
    this.inFlightCount++;
    try {
      const startTime = performance.now();
      const formData = this.buildFormData(chunks);

      const headers: Record<string, string> = {};
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`ASR request failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        text?: string;
        segments?: Array<{ text: string }>;
      };
      const latencyMs = performance.now() - startTime;

      const firstChunk = chunks[0]!;
      const lastChunk = chunks[chunks.length - 1]!;

      const segments: TranscriptSegment[] = [
        {
          id: `seg-${this.segmentId++}`,
          speaker: 'user',
          text: data.text ?? '',
          startTime: firstChunk.timestamp,
          endTime: lastChunk.timestamp + lastChunk.duration,
          confidence: 0.9,
          isFinal: true,
        },
      ];

      const result: ASRResult = { segments, isFinal: true, latencyMs };
      for (const cb of this.resultCallbacks) {
        cb(result);
      }
    } finally {
      this.inFlightCount--;
    }
  }

  private buildFormData(chunks: AudioChunk[]): FormData {
    // Concatenate all chunks into a single Float32Array
    const totalLength = chunks.reduce((sum, c) => sum + c.data.length, 0);
    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk.data, offset);
      offset += chunk.data.length;
    }

    const firstChunk = chunks[0]!;
    const wavBlob = buildWavBlob(combined, firstChunk.sampleRate, firstChunk.channels);

    const formData = new FormData();
    formData.append('file', wavBlob, 'audio.wav');
    formData.append('model', this.config.model ?? 'whisper-1');
    formData.append('language', this.config.language ?? 'en');

    return formData;
  }
}
