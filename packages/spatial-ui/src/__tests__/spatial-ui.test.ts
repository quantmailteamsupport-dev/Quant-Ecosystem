import { XRSessionManager } from '../xr/xr-session.js';
import { SpatialPanelManager } from '../panels/spatial-panel.js';
import { HandTracker } from '../input/hand-tracking.js';
import { SpatialAudio } from '../audio/spatial-audio.js';
import { EyeTracker } from '../eye/eye-tracking.js';
import { SpatialLayoutManager } from '../layout/spatial-layout-manager.js';

describe('XRSessionManager', () => {
  it('start/end sessions and device caps', () => {
    const m = new XRSessionManager();
    const id = m.startSession({ mode: 'immersive-vr', features: ['hand-tracking'] });
    expect(id).toMatch(/^xr-/);
    expect(m.endSession(id)).toBe(true);
    expect(m.endSession(id)).toBe(false);
    expect(m.getDeviceCaps('default')!.type).toBe('generic');
    expect(m.getDeviceCaps('x')).toBeNull();
  });

  it('transitions through session states', () => {
    const m = new XRSessionManager();
    const id = m.startSession({ mode: 'immersive-ar', features: [] });
    expect(m.getSessionState(id)).toBe('active');
    expect(m.suspendSession(id)).toBe(true);
    expect(m.getSessionState(id)).toBe('suspended');
    expect(m.resumeSession(id)).toBe(true);
    expect(m.getSessionState(id)).toBe('active');
    m.endSession(id);
    expect(m.getSessionState(id)).toBe('ended');
  });

  it('negotiates features based on device capabilities', () => {
    const m = new XRSessionManager();
    const id = m.startSession({
      mode: 'immersive-vr',
      features: ['hand-tracking', 'eye-tracking'],
    });
    const negotiated = m.getNegotiatedFeatures(id);
    expect(negotiated).toContain('hand-tracking');
    expect(negotiated).not.toContain('eye-tracking');
  });

  it('manages frame loop callbacks', () => {
    const m = new XRSessionManager();
    const id = m.startSession({ mode: 'immersive-vr', features: [] });
    let frameTime = 0;
    m.requestAnimationFrame(id, (t) => {
      frameTime = t;
    });
    const count = m.runFrame(id, 16.67);
    expect(count).toBe(1);
    expect(frameTime).toBe(16.67);
  });

  it('handoff transfers session to new device', () => {
    const m = new XRSessionManager();
    const id = m.startSession({ mode: 'immersive-vr', features: ['hand-tracking'] });
    const newId = m.handoffSession(id, 'default');
    expect(newId).toMatch(/^xr-/);
    expect(m.getSessionState(id)).toBe('ended');
    expect(m.getSessionState(newId!)).toBe('active');
  });

  it('emits state change events', () => {
    const m = new XRSessionManager();
    const events: unknown[] = [];
    m.on('stateChange', (d) => events.push(d));
    const id = m.startSession({ mode: 'inline', features: [] });
    m.suspendSession(id);
    expect(events.length).toBeGreaterThanOrEqual(2);
  });
});

describe('SpatialPanelManager', () => {
  it('create, move, resize, anchor, remove', () => {
    const m = new SpatialPanelManager();
    const p = m.createPanel({
      position: { x: 0, y: 1, z: -2 },
      size: { w: 100, h: 80 },
      anchor: 'room',
    });
    expect(p.id).toMatch(/^panel-/);
    expect(m.movePanel(p.id, { x: 1, y: 2, z: 3 })).toBe(true);
    expect(m.movePanel('x', { x: 0, y: 0, z: 0 })).toBe(false);
    expect(m.resizePanel(p.id, { w: 200, h: 150 })).toBe(true);
    expect(m.anchorPanel(p.id, 'hand')).toBe(true);
    expect(m.removePanel(p.id)).toBe(true);
    expect(m.removePanel(p.id)).toBe(false);
  });

  it('snaps panels to grid', () => {
    const m = new SpatialPanelManager();
    const p = m.createPanel({
      position: { x: 0.3, y: 1.1, z: -2.6 },
      size: { w: 100, h: 80 },
      anchor: 'room',
    });
    m.snapToGrid(p.id);
    const panel = m.getPanel(p.id);
    expect(panel?.position.x).toBe(0.25);
    expect(panel?.position.y).toBe(1);
    expect(panel?.position.z).toBe(-2.5);
  });

  it('groups panels together', () => {
    const m = new SpatialPanelManager();
    const p1 = m.createPanel({
      position: { x: 0, y: 0, z: 0 },
      size: { w: 50, h: 50 },
      anchor: 'room',
    });
    const p2 = m.createPanel({
      position: { x: 1, y: 0, z: 0 },
      size: { w: 50, h: 50 },
      anchor: 'room',
    });
    expect(m.groupPanels('g1', [p1.id, p2.id])).toBe(true);
    expect(m.getGroup('g1')).toHaveLength(2);
    expect(m.getPanel(p1.id)?.group).toBe('g1');
  });

  it('focuses panels exclusively', () => {
    const m = new SpatialPanelManager();
    const p1 = m.createPanel({
      position: { x: 0, y: 0, z: 0 },
      size: { w: 50, h: 50 },
      anchor: 'room',
    });
    const p2 = m.createPanel({
      position: { x: 1, y: 0, z: 0 },
      size: { w: 50, h: 50 },
      anchor: 'room',
    });
    m.focusPanel(p1.id);
    expect(m.getFocusedPanel()?.id).toBe(p1.id);
    m.focusPanel(p2.id);
    expect(m.getFocusedPanel()?.id).toBe(p2.id);
    expect(m.getPanel(p1.id)?.focused).toBe(false);
  });

  it('applies layout presets', () => {
    const m = new SpatialPanelManager();
    const panels = m.applyPreset('meeting-grid');
    expect(panels).toHaveLength(4);
    const theater = m.applyPreset('theater');
    expect(theater).toHaveLength(1);
    expect(theater[0]!.size.w).toBe(300);
  });
});

describe('HandTracker', () => {
  it('validates gestures and fires callbacks only when active', () => {
    const t = new HandTracker();
    expect(t.detect({ type: 'pinch', confidence: 0.9, hand: 'right' })!.type).toBe('pinch');
    expect(t.detect(null)).toBeNull();
    expect(t.detect({})).toBeNull();
    expect(t.detect({ type: 'bad', confidence: 0.5, hand: 'left' })).toBeNull();
    expect(t.detect({ type: 'pinch', confidence: 2, hand: 'left' })).toBeNull();
    const gs: unknown[] = [];
    t.onGesture((g) => gs.push(g));
    t.start();
    t.detect({ type: 'grab', confidence: 0.8, hand: 'left' });
    expect(gs).toHaveLength(1);
    t.stop();
    t.detect({ type: 'swipe', confidence: 0.9, hand: 'left' });
    expect(gs).toHaveLength(1);
  });

  it('detects two-hand gestures', () => {
    const t = new HandTracker();
    const left = { type: 'pinch' as const, confidence: 0.9, hand: 'left' as const };
    const right = { type: 'pinch' as const, confidence: 0.9, hand: 'right' as const };
    expect(t.detectTwoHand(left, right)).toBe('scale');
    const leftGrab = { type: 'grab' as const, confidence: 0.9, hand: 'left' as const };
    const rightGrab = { type: 'grab' as const, confidence: 0.9, hand: 'right' as const };
    expect(t.detectTwoHand(leftGrab, rightGrab)).toBe('rotate');
    expect(t.detectTwoHand(null, right)).toBeNull();
  });

  it('recognizes gesture sequences', () => {
    const t = new HandTracker();
    t.registerSequence({
      id: 'move',
      steps: [
        { type: 'pinch', hand: 'right' },
        { type: 'swipe', hand: 'right' },
      ],
      action: 'move-panel',
    });
    t.start();
    t.detect({ type: 'pinch', confidence: 0.9, hand: 'right' });
    t.detect({ type: 'swipe', confidence: 0.8, hand: 'right' });
    expect(t.checkSequence()).toBe('move-panel');
  });

  it('resolves conflicts with first-match priority', () => {
    const t = new HandTracker();
    expect(t.resolveConflict(['move', 'scale'])).toBe('move');
    expect(t.resolveConflict([])).toBeNull();
  });
});

describe('SpatialAudio', () => {
  it('adds sources and computes effective volume by distance', () => {
    const audio = new SpatialAudio();
    const s = audio.addSource({
      position: { x: 5, y: 0, z: 0 },
      volume: 1,
      directional: false,
      maxDistance: 10,
      tracking: 'static',
    });
    expect(s.id).toMatch(/^audio-/);
    const vol = audio.getEffectiveVolume(s.id);
    expect(vol).toBe(0.5);
  });

  it('returns 0 volume when source is beyond maxDistance', () => {
    const audio = new SpatialAudio();
    const s = audio.addSource({
      position: { x: 20, y: 0, z: 0 },
      volume: 1,
      directional: false,
      maxDistance: 10,
      tracking: 'static',
    });
    expect(audio.getEffectiveVolume(s.id)).toBe(0);
  });

  it('moves sources and updates volume accordingly', () => {
    const audio = new SpatialAudio();
    const s = audio.addSource({
      position: { x: 10, y: 0, z: 0 },
      volume: 1,
      directional: false,
      maxDistance: 10,
      tracking: 'static',
    });
    expect(audio.getEffectiveVolume(s.id)).toBe(0);
    audio.moveSource(s.id, { x: 5, y: 0, z: 0 });
    expect(audio.getEffectiveVolume(s.id)).toBe(0.5);
  });

  it('sets HRTF profile', () => {
    const audio = new SpatialAudio();
    audio.setHRTFProfile('wide');
    expect(audio.getHRTFProfile()).toBe('wide');
  });

  it('filters active sources by effective volume', () => {
    const audio = new SpatialAudio();
    audio.addSource({
      position: { x: 3, y: 0, z: 0 },
      volume: 1,
      directional: false,
      maxDistance: 10,
      tracking: 'static',
    });
    audio.addSource({
      position: { x: 100, y: 0, z: 0 },
      volume: 1,
      directional: false,
      maxDistance: 10,
      tracking: 'static',
    });
    expect(audio.getActiveSources()).toHaveLength(1);
  });
});

describe('EyeTracker', () => {
  it('requires calibration state tracking', () => {
    const eye = new EyeTracker();
    expect(eye.isCalibrated()).toBe(false);
    eye.calibrate();
    expect(eye.isCalibrated()).toBe(true);
  });

  it('detects dwell on target after threshold', () => {
    const eye = new EyeTracker(500);
    const now = 1000;
    eye.trackGaze({
      gazePoint: { x: 0, y: 0, z: 0 },
      timestamp: now,
      confidence: 0.9,
      targetId: 'btn1',
    });
    expect(eye.checkDwell(now + 400)).toBeNull();
    expect(eye.checkDwell(now + 600)).toBe('btn1');
  });

  it('resets dwell when target changes', () => {
    const eye = new EyeTracker(500);
    eye.trackGaze({
      gazePoint: { x: 0, y: 0, z: 0 },
      timestamp: 1000,
      confidence: 0.9,
      targetId: 'a',
    });
    eye.trackGaze({
      gazePoint: { x: 1, y: 0, z: 0 },
      timestamp: 1300,
      confidence: 0.9,
      targetId: 'b',
    });
    expect(eye.checkDwell(1600)).toBeNull();
    expect(eye.checkDwell(1800)).toBe('b');
  });

  it('generates heat map from gaze data', () => {
    const eye = new EyeTracker();
    eye.trackGaze({
      gazePoint: { x: 0, y: 0, z: 0 },
      timestamp: 100,
      confidence: 0.9,
      targetId: 'x',
    });
    eye.trackGaze({
      gazePoint: { x: 0, y: 0, z: 0 },
      timestamp: 200,
      confidence: 0.9,
      targetId: 'x',
    });
    eye.trackGaze({
      gazePoint: { x: 0, y: 0, z: 0 },
      timestamp: 300,
      confidence: 0.9,
      targetId: 'y',
    });
    const map = eye.getHeatMap();
    expect(map.get('x')).toBe(2);
    expect(map.get('y')).toBe(1);
  });

  it('data is always local (privacy)', () => {
    const eye = new EyeTracker();
    expect(eye.isDataLocal()).toBe(true);
  });
});

describe('SpatialLayoutManager', () => {
  it('saves and retrieves layouts', () => {
    const lm = new SpatialLayoutManager();
    lm.saveLayout({ id: 'l1', name: 'Work', panels: [] });
    expect(lm.getLayout('l1')?.name).toBe('Work');
    expect(lm.getLayout('x')).toBeNull();
  });

  it('activates and retrieves active layout', () => {
    const lm = new SpatialLayoutManager();
    lm.saveLayout({ id: 'l1', name: 'Work', panels: [] });
    expect(lm.activateLayout('l1')).toBe(true);
    expect(lm.getActiveLayout()?.id).toBe('l1');
    expect(lm.activateLayout('nonexist')).toBe(false);
  });

  it('sets defaults for tasks', () => {
    const lm = new SpatialLayoutManager();
    lm.saveLayout({ id: 'l1', name: 'Code', panels: [] });
    expect(lm.setDefault('coding', 'l1')).toBe(true);
    expect(lm.getDefault('coding')?.id).toBe('l1');
    expect(lm.getDefault('gaming')).toBeNull();
  });

  it('switches workspace', () => {
    const lm = new SpatialLayoutManager();
    lm.saveLayout({ id: 'a', name: 'A', panels: [] });
    lm.saveLayout({ id: 'b', name: 'B', panels: [] });
    lm.activateLayout('a');
    const result = lm.switchWorkspace('b');
    expect(result?.id).toBe('b');
    expect(lm.getActiveLayout()?.id).toBe('b');
  });

  it('deletes layouts and clears active if needed', () => {
    const lm = new SpatialLayoutManager();
    lm.saveLayout({ id: 'l1', name: 'X', panels: [] });
    lm.activateLayout('l1');
    lm.deleteLayout('l1');
    expect(lm.getActiveLayout()).toBeNull();
    expect(lm.getLayout('l1')).toBeNull();
  });
});
