import { describe, it, expect } from 'vitest';
import { VoiceActivityDetector } from '../asr/vad.js';
import type { AudioChunk, VADEvent } from '../types.js';

function createChunk(samples: number[], timestamp: number): AudioChunk {
  return {
    data: new Float32Array(samples),
    sampleRate: 16000,
    channels: 1,
    timestamp,
    duration: 20,
  };
}

describe('VoiceActivityDetector', () => {
  it('emits speech-start when energy exceeds threshold for minSpeechDuration', () => {
    const vad = new VoiceActivityDetector({
      threshold: 0.01,
      silenceDuration: 200,
      minSpeechDuration: 40,
    });
    const events: VADEvent[] = [];
    vad.onEvent((e) => events.push(e));
    vad.start();

    // Feed loud chunks to trigger speech start (timestamp spacing >= minSpeechDuration)
    vad.feedAudio(createChunk([0.5, 0.5, 0.5, 0.5], 0));
    vad.feedAudio(createChunk([0.5, 0.5, 0.5, 0.5], 20));
    vad.feedAudio(createChunk([0.5, 0.5, 0.5, 0.5], 40));

    const speechStart = events.find((e) => e.type === 'speech-start');
    expect(speechStart).toBeDefined();
    expect(speechStart?.timestamp).toBe(0);
  });

  it('emits speech-end after silence duration exceeded', () => {
    const vad = new VoiceActivityDetector({
      threshold: 0.01,
      silenceDuration: 100,
      minSpeechDuration: 0,
    });
    const events: VADEvent[] = [];
    vad.onEvent((e) => events.push(e));
    vad.start();

    // Loud chunk triggers speech start
    vad.feedAudio(createChunk([0.5, 0.5, 0.5, 0.5], 0));

    // Silent chunks after silence duration
    vad.feedAudio(createChunk([0.0001, 0.0001], 150));

    const speechEnd = events.find((e) => e.type === 'speech-end');
    expect(speechEnd).toBeDefined();
  });

  it('emits silence events for quiet audio when not speaking', () => {
    const vad = new VoiceActivityDetector({ threshold: 0.1 });
    const events: VADEvent[] = [];
    vad.onEvent((e) => events.push(e));
    vad.start();

    vad.feedAudio(createChunk([0.001, 0.001], 0));

    const silenceEvents = events.filter((e) => e.type === 'silence');
    expect(silenceEvents.length).toBeGreaterThan(0);
  });

  it('does not emit events when stopped', () => {
    const vad = new VoiceActivityDetector();
    const events: VADEvent[] = [];
    vad.onEvent((e) => events.push(e));

    // Not started, should not emit
    vad.feedAudio(createChunk([0.5, 0.5], 0));
    expect(events).toHaveLength(0);
  });

  it('does not detect very short speech below minSpeechDuration', () => {
    const vad = new VoiceActivityDetector({
      threshold: 0.01,
      silenceDuration: 200,
      minSpeechDuration: 1000, // very long requirement
    });
    const events: VADEvent[] = [];
    vad.onEvent((e) => events.push(e));
    vad.start();

    // Only 20ms of speech - below 1000ms threshold
    vad.feedAudio(createChunk([0.5, 0.5, 0.5, 0.5], 0));

    const speechStart = events.find((e) => e.type === 'speech-start');
    expect(speechStart).toBeUndefined();
  });

  it('emits speech-end on stop if currently speaking', () => {
    const vad = new VoiceActivityDetector({
      threshold: 0.01,
      minSpeechDuration: 0,
    });
    const events: VADEvent[] = [];
    vad.onEvent((e) => events.push(e));
    vad.start();

    vad.feedAudio(createChunk([0.5, 0.5, 0.5], 0));
    vad.stop();

    const speechEnd = events.find((e) => e.type === 'speech-end');
    expect(speechEnd).toBeDefined();
  });
});
