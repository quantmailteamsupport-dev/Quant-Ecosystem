import { describe, expect, it } from 'vitest';
import { createCaptureBar } from '../capture-bar.js';

describe('UniversalCaptureBar', () => {
  it('creates a capture bar with defaults', () => {
    const bar = createCaptureBar();
    const state = bar.getBar();

    expect(state.visible).toBe(true);
    expect(state.position).toBe('top');
    expect(state.recentCaptures).toHaveLength(0);
  });

  it('creates with custom position', () => {
    const bar = createCaptureBar({ position: 'floating' });
    expect(bar.getPosition()).toBe('floating');
  });

  it('toggles visibility', () => {
    const bar = createCaptureBar();
    expect(bar.isVisible()).toBe(true);

    bar.hide();
    expect(bar.isVisible()).toBe(false);

    bar.show();
    expect(bar.isVisible()).toBe(true);

    bar.toggle();
    expect(bar.isVisible()).toBe(false);
  });

  it('captures text notes', () => {
    const bar = createCaptureBar();
    const item = bar.capture({ content: 'Remember to buy groceries' });

    expect(item.id).toBeTruthy();
    expect(item.type).toBe('text');
    expect(item.content).toBe('Remember to buy groceries');
    expect(item.source.type).toBe('capture-bar');
    expect(item.source.device).toBe('desktop');
  });

  it('captures links with auto-detection', () => {
    const bar = createCaptureBar();
    const item = bar.capture({ content: 'https://example.com/article' });

    expect(item.type).toBe('link');
    expect(item.metadata.url).toBe('https://example.com/article');
  });

  it('captures with explicit type', () => {
    const bar = createCaptureBar();
    const item = bar.capture({
      content: 'Voice note about project',
      type: 'voice',
      metadata: { voiceTranscript: 'Voice note about project' },
    });

    expect(item.type).toBe('voice');
    expect(item.metadata.voiceTranscript).toBe('Voice note about project');
  });

  it('auto-routes captures to correct app', () => {
    const bar = createCaptureBar();

    const link = bar.capture({ content: 'Check out https://example.com' });
    expect(link.routedTo).toBe('quant-bookmarks');

    const task = bar.capture({ content: 'todo: finish report by Friday' });
    expect(task.routedTo).toBe('quant-tasks');

    const meeting = bar.capture({ content: 'meeting with John at 3pm' });
    expect(meeting.routedTo).toBe('quant-calendar');

    const note = bar.capture({ content: 'note: interesting idea about AI' });
    expect(note.routedTo).toBe('quant-notes');
  });

  it('creates quick notes from anywhere', () => {
    const bar = createCaptureBar();
    const note = bar.quickNote('Quick thought about the design');

    expect(note.id).toBeTruthy();
    expect(note.content).toBe('Quick thought about the design');
    expect(note.app).toBe('quant-notes');
    expect(note.createdAt).toBeInstanceOf(Date);
  });

  it('retrieves captures by id', () => {
    const bar = createCaptureBar();
    const item = bar.capture({ content: 'Test capture' });

    const retrieved = bar.getCapture(item.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.content).toBe('Test capture');
  });

  it('lists all captures', () => {
    const bar = createCaptureBar();
    bar.capture({ content: 'Capture 1' });
    bar.capture({ content: 'Capture 2' });
    bar.capture({ content: 'Capture 3' });

    expect(bar.getCaptures()).toHaveLength(3);
  });

  it('maintains recent captures list', () => {
    const bar = createCaptureBar({ maxRecent: 3 });
    bar.capture({ content: 'First' });
    bar.capture({ content: 'Second' });
    bar.capture({ content: 'Third' });
    bar.capture({ content: 'Fourth' });

    const recent = bar.getRecentCaptures();
    expect(recent).toHaveLength(3);
    expect(recent[0]!.content).toBe('Fourth');
  });

  it('deletes captures', () => {
    const bar = createCaptureBar();
    const item = bar.capture({ content: 'To delete' });

    expect(bar.deleteCapture(item.id)).toBe(true);
    expect(bar.getCapture(item.id)).toBeNull();
    expect(bar.getRecentCaptures()).toHaveLength(0);
  });

  it('adds and removes custom routes', () => {
    const bar = createCaptureBar();
    bar.addRoute({ pattern: 'code|bug|pr', targetApp: 'quant-code', confidence: 0.8, priority: 0 });

    const item = bar.capture({ content: 'Found a bug in the auth module' });
    expect(item.routedTo).toBe('quant-code');

    bar.removeRoute('code|bug|pr');
    const item2 = bar.capture({ content: 'Found a bug again' });
    expect(item2.routedTo).not.toBe('quant-code');
  });

  it('routes capture with rich metadata', () => {
    const bar = createCaptureBar();
    const item = bar.capture({
      content: 'Check out this image photo.png',
      source: { type: 'extension', app: 'chrome' },
      metadata: { title: 'Screenshot' },
      tags: ['screenshot', 'reference'],
    });

    expect(item.type).toBe('image');
    expect(item.source.type).toBe('extension');
    expect(item.source.app).toBe('chrome');
    expect(item.metadata.title).toBe('Screenshot');
    expect(item.tags).toContain('screenshot');
  });

  it('sets position', () => {
    const bar = createCaptureBar();
    bar.setPosition('bottom');
    expect(bar.getPosition()).toBe('bottom');
  });

  it('lists quick notes', () => {
    const bar = createCaptureBar();
    bar.quickNote('Note 1');
    bar.quickNote('Note 2');

    expect(bar.getQuickNotes()).toHaveLength(2);
  });
});
