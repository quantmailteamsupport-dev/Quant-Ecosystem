import type { ASRProvider, ASRResult, AudioChunk } from '../types.js';
import { WhisperServerProvider, type WhisperServerConfig } from './whisper-provider.js';

export class WebGPUWhisperProvider implements ASRProvider {
  private fallback: WhisperServerProvider;

  constructor(config: WhisperServerConfig) {
    this.fallback = new WhisperServerProvider(config);
  }

  static isSupported(): boolean {
    // WebGPU is not available in non-browser environments
    return false;
  }

  start(): void {
    this.fallback.start();
  }

  stop(): void {
    this.fallback.stop();
  }

  feedAudio(chunk: AudioChunk): void {
    this.fallback.feedAudio(chunk);
  }

  onResult(cb: (result: ASRResult) => void): void {
    this.fallback.onResult(cb);
  }

  onError(cb: (error: Error) => void): void {
    this.fallback.onError(cb);
  }
}
