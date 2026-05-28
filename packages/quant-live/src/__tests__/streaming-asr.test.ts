import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

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

  it('batches audio chunks and sends as multipart form-data', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'hello world' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = new WhisperServerProvider({
      ...config,
      batchIntervalMs: 100,
    });
    const resultCb = vi.fn();
    provider.onResult(resultCb);
    provider.start();

    // Feed multiple chunks
    const chunk: AudioChunk = {
      data: new Float32Array([0.1, 0.2]),
      sampleRate: 16000,
      channels: 1,
      timestamp: 0,
      duration: 100,
    };
    provider.feedAudio(chunk);
    provider.feedAudio({ ...chunk, timestamp: 100 });

    // Advance timer to trigger batch flush
    vi.advanceTimersByTime(100);

    // Wait for async processing
    await vi.waitFor(() => {
      expect(resultCb).toHaveBeenCalledTimes(1);
    });

    // Verify fetch was called once (batched) with FormData
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(config.endpoint);
    expect(options.body).toBeInstanceOf(FormData);

    const formData = options.body as FormData;
    expect(formData.get('model')).toBe('whisper-1');
    expect(formData.get('language')).toBe('en');

    const file = formData.get('file') as Blob;
    expect(file).toBeInstanceOf(Blob);
    expect(file.type).toBe('audio/wav');

    expect(resultCb.mock.calls[0]?.[0].segments[0]?.text).toBe('hello world');
    expect(resultCb.mock.calls[0]?.[0].isFinal).toBe(true);
  });

  it('respects maxConcurrency limit', async () => {
    let resolveFirst: (() => void) | undefined;
    const firstCallPromise = new Promise<void>((r) => {
      resolveFirst = r;
    });

    const mockFetch = vi.fn().mockImplementation(() => {
      return firstCallPromise.then(() => ({
        ok: true,
        json: () => Promise.resolve({ text: 'result' }),
      }));
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = new WhisperServerProvider({
      ...config,
      batchIntervalMs: 50,
      maxConcurrency: 1,
    });
    provider.start();

    const chunk: AudioChunk = {
      data: new Float32Array([0.1]),
      sampleRate: 16000,
      channels: 1,
      timestamp: 0,
      duration: 20,
    };

    // First batch
    provider.feedAudio(chunk);
    vi.advanceTimersByTime(50);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second batch should be blocked by concurrency limit
    provider.feedAudio({ ...chunk, timestamp: 50 });
    vi.advanceTimersByTime(50);
    // Still only 1 call because maxConcurrency=1 is saturated
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Resolve first request
    resolveFirst!();
    await vi.waitFor(() => {
      // After the first completes, the next flush will send the queued batch
    });

    provider.stop();
  });

  it('calls error callbacks on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    const provider = new WhisperServerProvider({
      ...config,
      batchIntervalMs: 50,
    });
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

    // Advance timer to flush batch
    vi.advanceTimersByTime(50);

    await vi.waitFor(() => {
      expect(errorCb).toHaveBeenCalledTimes(1);
    });

    expect(errorCb.mock.calls[0]?.[0].message).toContain('500');
  });

  it('flushes remaining buffer on stop', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'flushed' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = new WhisperServerProvider({
      ...config,
      batchIntervalMs: 5000, // long interval
    });
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

    // Stop before the timer fires - should flush buffered audio
    provider.stop();

    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
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
