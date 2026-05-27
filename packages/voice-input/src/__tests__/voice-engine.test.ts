import { describe, expect, it } from 'vitest';
import { createVoiceEngine } from '../voice-engine.js';

describe('VoiceEngine', () => {
  it('creates with default config', () => {
    const engine = createVoiceEngine();
    const config = engine.getConfig();

    expect(config.language).toBe('en-US');
    expect(config.noiseCancellation).toBe(true);
    expect(config.vadEnabled).toBe(true);
    expect(config.continuous).toBe(true);
    expect(config.interimResults).toBe(true);
  });

  it('is a first-class input method', () => {
    const engine = createVoiceEngine();
    expect(engine.isFirstClassInput()).toBe(true);
  });

  it('supports multiple languages', () => {
    const engine = createVoiceEngine();
    const languages = engine.getSupportedLanguages();

    expect(languages.length).toBeGreaterThan(5);
    expect(engine.isLanguageSupported('en-US')).toBe(true);
    expect(engine.isLanguageSupported('es-ES')).toBe(true);
    expect(engine.isLanguageSupported('ja-JP')).toBe(true);
    expect(engine.isLanguageSupported('xx-XX')).toBe(false);
  });

  it('changes language', () => {
    const engine = createVoiceEngine();
    expect(engine.setLanguage('fr-FR')).toBe(true);
    expect(engine.getConfig().language).toBe('fr-FR');

    expect(engine.setLanguage('xx-XX')).toBe(false);
  });

  it('registers voice commands', () => {
    const engine = createVoiceEngine();
    const cmd = engine.registerCommand({
      phrase: 'send message',
      aliases: ['send it', 'submit'],
      action: 'sendMessage',
      language: 'en-US',
      confidence: 0.8,
      enabled: true,
    });

    expect(cmd.id).toBeTruthy();
    expect(engine.getCommands()).toHaveLength(1);
  });

  it('matches voice commands by phrase or alias', () => {
    const engine = createVoiceEngine();
    engine.registerCommand({
      phrase: 'new note',
      aliases: ['create note', 'add note'],
      action: 'createNote',
      language: 'en-US',
      confidence: 0.8,
      enabled: true,
    });

    expect(engine.matchCommand('new note')).not.toBeNull();
    expect(engine.matchCommand('create note')).not.toBeNull();
    expect(engine.matchCommand('add note')).not.toBeNull();
    expect(engine.matchCommand('delete note')).toBeNull();
  });

  it('starts and manages voice sessions', () => {
    const engine = createVoiceEngine();
    const session = engine.startSession();

    expect(session.status).toBe('listening');
    expect(session.language).toBe('en-US');
    expect(engine.getActiveSession()).not.toBeNull();
  });

  it('starts sessions with different languages', () => {
    const engine = createVoiceEngine();
    const session = engine.startSession('ja-JP');
    expect(session.language).toBe('ja-JP');
  });

  it('pauses and resumes sessions', () => {
    const engine = createVoiceEngine();
    const session = engine.startSession();

    expect(engine.pauseSession(session.id)).toBe(true);
    expect(engine.getSession(session.id)!.status).toBe('paused');

    expect(engine.resumeSession(session.id)).toBe(true);
    expect(engine.getSession(session.id)!.status).toBe('listening');
  });

  it('ends sessions', () => {
    const engine = createVoiceEngine();
    const session = engine.startSession();

    const ended = engine.endSession(session.id);
    expect(ended!.status).toBe('ended');
    expect(ended!.endedAt).toBeInstanceOf(Date);
    expect(ended!.duration).toBeGreaterThanOrEqual(0);
    expect(engine.getActiveSession()).toBeNull();
  });

  it('performs real-time transcription', () => {
    const engine = createVoiceEngine();
    const session = engine.startSession();

    const result = engine.transcribe(session.id, 'Hello world');
    expect(result.text).toBe('Hello world');
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.isFinal).toBe(true);
    expect(result.words).toHaveLength(2);
    expect(result.language).toBe('en-US');
  });

  it('detects commands during transcription', () => {
    const engine = createVoiceEngine();
    engine.registerCommand({
      phrase: 'send message',
      aliases: [],
      action: 'sendMessage',
      language: 'en-US',
      confidence: 0.8,
      enabled: true,
    });

    const session = engine.startSession();
    engine.transcribe(session.id, 'send message');

    const updated = engine.getSession(session.id)!;
    expect(updated.commands).toHaveLength(1);
    expect(updated.commands[0]!.action).toBe('sendMessage');
  });

  it('accumulates transcriptions in session', () => {
    const engine = createVoiceEngine();
    const session = engine.startSession();

    engine.transcribe(session.id, 'First sentence');
    engine.transcribe(session.id, 'Second sentence');

    const updated = engine.getSession(session.id)!;
    expect(updated.transcriptions).toHaveLength(2);
  });

  it('throws when transcribing on non-listening session', () => {
    const engine = createVoiceEngine();
    const session = engine.startSession();
    engine.pauseSession(session.id);

    expect(() => engine.transcribe(session.id, 'test')).toThrow('not listening');
  });

  it('removes commands', () => {
    const engine = createVoiceEngine();
    const cmd = engine.registerCommand({
      phrase: 'test',
      aliases: [],
      action: 'test',
      language: 'en-US',
      confidence: 0.8,
      enabled: true,
    });

    expect(engine.removeCommand(cmd.id)).toBe(true);
    expect(engine.getCommands()).toHaveLength(0);
  });
});
