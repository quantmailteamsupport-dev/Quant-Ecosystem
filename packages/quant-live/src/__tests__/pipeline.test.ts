import { describe, it, expect, vi } from 'vitest';
import { LivePipeline } from '../core/pipeline.js';
import { LatencyTracker } from '../core/latency-tracker.js';
import type { ASRProvider, ASRResult, AudioChunk, LiveSession } from '../types.js';

function createMockSession(): LiveSession {
  return {
    id: 'test-session',
    state: 'listening',
    createdAt: Date.now(),
    config: {
      asrProvider: 'whisper-server',
      vadConfig: { threshold: 0.01, silenceDuration: 500, minSpeechDuration: 100 },
      enableInterruption: true,
      maxSessionDuration: 300000,
      language: 'en',
    },
    transcript: [],
  };
}

function createMockProvider(): ASRProvider & { triggerResult: (r: ASRResult) => void } {
  let resultCb: ((r: ASRResult) => void) | null = null;
  return {
    start: vi.fn(),
    stop: vi.fn(),
    feedAudio: vi.fn(),
    onResult(cb) {
      resultCb = cb;
    },
    onError: vi.fn(),
    triggerResult(r: ASRResult) {
      resultCb?.(r);
    },
  };
}

describe('LivePipeline', () => {
  it('starts and registers with the ASR provider', () => {
    const pipeline = new LivePipeline();
    const provider = createMockProvider();
    const session = createMockSession();

    pipeline.start(session, provider);
    expect(provider.start).toHaveBeenCalled();
    expect(pipeline.isRunning()).toBe(true);
  });

  it('stops the pipeline and provider', () => {
    const pipeline = new LivePipeline();
    const provider = createMockProvider();
    pipeline.start(createMockSession(), provider);
    pipeline.stop();
    expect(provider.stop).toHaveBeenCalled();
    expect(pipeline.isRunning()).toBe(false);
  });

  it('feeds audio to the ASR provider', () => {
    const pipeline = new LivePipeline();
    const provider = createMockProvider();
    pipeline.start(createMockSession(), provider);

    const chunk: AudioChunk = {
      data: new Float32Array([0.1, 0.2]),
      sampleRate: 16000,
      channels: 1,
      timestamp: 0,
      duration: 20,
    };
    pipeline.feedAudio(chunk);
    expect(provider.feedAudio).toHaveBeenCalledWith(chunk);
  });

  it('does not feed audio when not running', () => {
    const pipeline = new LivePipeline();
    const provider = createMockProvider();
    pipeline.start(createMockSession(), provider);
    pipeline.stop();

    const chunk: AudioChunk = {
      data: new Float32Array([0.1]),
      sampleRate: 16000,
      channels: 1,
      timestamp: 0,
      duration: 10,
    };
    (provider.feedAudio as ReturnType<typeof vi.fn>).mockClear();
    pipeline.feedAudio(chunk);
    expect(provider.feedAudio).not.toHaveBeenCalled();
  });

  it('calls transcript callbacks when ASR produces results', () => {
    const pipeline = new LivePipeline();
    const provider = createMockProvider();
    const transcriptCb = vi.fn();
    pipeline.onTranscript(transcriptCb);
    pipeline.start(createMockSession(), provider);

    const result: ASRResult = {
      segments: [
        {
          id: 'seg-1',
          speaker: 'user',
          text: 'hello',
          startTime: 0,
          endTime: 100,
          confidence: 0.95,
          isFinal: true,
        },
      ],
      isFinal: true,
      latencyMs: 50,
    };
    provider.triggerResult(result);
    expect(transcriptCb).toHaveBeenCalledWith(result.segments);
  });

  it('tracks latency when feeding audio', () => {
    const tracker = new LatencyTracker();
    const pipeline = new LivePipeline(tracker);
    const provider = createMockProvider();
    pipeline.start(createMockSession(), provider);

    const chunk: AudioChunk = {
      data: new Float32Array([0.1]),
      sampleRate: 16000,
      channels: 1,
      timestamp: 0,
      duration: 10,
    };
    pipeline.feedAudio(chunk);

    // End the measurement manually to verify it was started
    const duration = tracker.endMeasure('asr', 'chunk-0');
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});
