import { describe, it, expect, vi } from 'vitest';
import { ASRProviderFactory } from '../asr/streaming-asr.js';
import { WhisperServerProvider } from '../asr/whisper-provider.js';
import { WebGPUWhisperProvider } from '../asr/webgpu-whisper-provider.js';
import type { AudioChunk } from '../types.js';

const config = { endpoint: 'http://localhost:8080/v1/audio/transcriptions' };

describe('ASRProviderFactory', () => {
  it('creates a WhisperServerProvider for whisper-server type', () => {
    const provider = ASRProviderFactory.create('whisper-server', config);
    expect(provider).toBeInstanceOf(WhisperServerProvider);
  });

  it('creates a WebGPUWhisperProvider for whisper-webgpu type', () => {
    const provider = ASRProviderFactory.create('whisper-webgpu', config);
    expect(provider).toBeInstanceOf(WebGPUWhisperProvider);
  });

  it('throws for unknown provider type', () => {
    expect(() => ASRProviderFactory.create('unknown' as any, config)).toThrow(
      'Unknown ASR provider type',
    );
  });
});

describe('WhisperServerProvider', () => {
  it('starts and stops without errors', () => {
    const provider = new WhisperServerProvider(config);
    provider.start();
    provider.stop();
  });

  it('does not process audio when stopped', () => {
    const provider = new WhisperServerProvider(config);
    const chunk: AudioChunk = {
      data: new Float32Array([0.1, 0.2]),
      sampleRate: 16000,
      channels: 1,
      timestamp: 0,
      duration: 100,
    };
    // Should not throw when not running
    provider.feedAudio(chunk);
  });

  it('calls result callbacks when processing audio', async () => {
    const mockResponse = { text: 'hello world' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }),
    );

    const provider = new WhisperServerProvider(config);
    const resultCb = vi.fn();
    provider.onResult(resultCb);
    provider.start();

    const chunk: AudioChunk = {
      data: new Float32Array([0.1, 0.2]),
      sampleRate: 16000,
      channels: 1,
      timestamp: 0,
      duration: 100,
    };
    provider.feedAudio(chunk);

    // Wait for async processing
    await new Promise((r) => setTimeout(r, 50));

    expect(resultCb).toHaveBeenCalledTimes(1);
    expect(resultCb.mock.calls[0]?.[0].segments[0]?.text).toBe('hello world');
    expect(resultCb.mock.calls[0]?.[0].isFinal).toBe(true);

    vi.unstubAllGlobals();
  });

  it('calls error callbacks on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    const provider = new WhisperServerProvider(config);
    const errorCb = vi.fn();
    provider.onError(errorCb);
    provider.start();

    const chunk: AudioChunk = {
      data: new Float32Array([0.1]),
      sampleRate: 16000,
      channels: 1,
      timestamp: 0,
      duration: 50,
    };
    provider.feedAudio(chunk);

    await new Promise((r) => setTimeout(r, 50));

    expect(errorCb).toHaveBeenCalledTimes(1);
    expect(errorCb.mock.calls[0]?.[0].message).toContain('500');

    vi.unstubAllGlobals();
  });
});

describe('WebGPUWhisperProvider', () => {
  it('reports WebGPU as not supported', () => {
    expect(WebGPUWhisperProvider.isSupported()).toBe(false);
  });

  it('falls back to server provider', () => {
    const provider = new WebGPUWhisperProvider(config);
    // Should be able to start/stop (delegated to fallback)
    provider.start();
    provider.stop();
  });
});
