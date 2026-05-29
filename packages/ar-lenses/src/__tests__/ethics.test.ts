import { describe, it, expect } from 'vitest';
import { BodyFilterGuard } from '../ethics/body-filter-guard.js';
import { AgeGate } from '../ethics/age-gate.js';
import { ConsentManager } from '../ethics/consent-manager.js';
import { DeepfakeMarker } from '../ethics/deepfake-marker.js';

describe('BodyFilterGuard', () => {
  const guard = new BodyFilterGuard({
    blockedCategories: ['weight', 'skin_tone', 'proportions', 'age_appearance'],
    ageRestrictions: true,
    consentRequired: true,
    provenanceRequired: true,
  });

  it('blocks weight manipulation filters', () => {
    const result = guard.check('make me slim', 'body_reshape');
    expect(result.allowed).toBe(false);
    expect(result.blockedReasons).toContain('body_filter_weight');
  });

  it('blocks skin lightening filters', () => {
    const result = guard.check('lighten my skin tone', 'skin_edit');
    expect(result.allowed).toBe(false);
    expect(result.blockedReasons).toContain('body_filter_skin_tone');
  });

  it('blocks proportion changes', () => {
    const result = guard.check('make my hips bigger', 'body_edit');
    expect(result.allowed).toBe(false);
    expect(result.category).toBe('proportions');
  });

  it('allows harmless effects', () => {
    const result = guard.check('add sparkle to my hair', 'particle_effect');
    expect(result.allowed).toBe(true);
    expect(result.blockedReasons).toHaveLength(0);
  });

  it('detects body modification effect types', () => {
    expect(guard.isBodyModification('reshape_body')).toBe(true);
    expect(guard.isBodyModification('add_sticker')).toBe(false);
  });

  it('blocks age appearance changes', () => {
    const result = guard.check('make me look younger', 'face_edit');
    expect(result.allowed).toBe(false);
    expect(result.blockedReasons).toContain('body_filter_age_appearance');
  });
});

describe('AgeGate', () => {
  it('allows all_ages content for minors', () => {
    const gate = new AgeGate({ userAge: 10 });
    const result = gate.check('all_ages');
    expect(result.allowed).toBe(true);
  });

  it('blocks mature content for minors', () => {
    const gate = new AgeGate({ userAge: 15 });
    const result = gate.check('mature');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('age_restriction');
  });

  it('allows teen content for teens', () => {
    const gate = new AgeGate({ userAge: 14 });
    const result = gate.check('teen');
    expect(result.allowed).toBe(true);
  });

  it('allows all content for adults', () => {
    const gate = new AgeGate({ userAge: 25 });
    expect(gate.check('mature').allowed).toBe(true);
    expect(gate.check('teen').allowed).toBe(true);
    expect(gate.check('all_ages').allowed).toBe(true);
  });

  it('enforces parental controls', () => {
    const gate = new AgeGate({
      userAge: 16,
      parentalControlsEnabled: true,
      parentalMaxRating: 'all_ages',
    });
    const result = gate.check('teen');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('parental_controls_restrict');
  });

  it('computes user rating from age', () => {
    const child = new AgeGate({ userAge: 8 });
    const teen = new AgeGate({ userAge: 15 });
    const adult = new AgeGate({ userAge: 20 });
    expect(child.getUserRating()).toBe('all_ages');
    expect(teen.getUserRating()).toBe('teen');
    expect(adult.getUserRating()).toBe('mature');
  });
});

describe('ConsentManager', () => {
  it('grants and tracks consent', () => {
    const cm = new ConsentManager();
    const record = cm.grant('user1', 'face1', 'ar_capture');
    expect(record.granted).toBe(true);
    expect(cm.hasConsent('user1', 'face1', 'ar_capture')).toBe(true);
  });

  it('revokes consent', () => {
    const cm = new ConsentManager();
    const record = cm.grant('user1', 'face1', 'sharing');
    cm.revoke(record.id);
    expect(cm.hasConsent('user1', 'face1', 'sharing')).toBe(false);
  });

  it('maintains audit trail', () => {
    const cm = new ConsentManager();
    cm.grant('user1', 'face1', 'capture');
    cm.grant('user1', 'face2', 'capture');
    cm.grant('user2', 'face3', 'capture');
    const trail = cm.getAuditTrail('user1');
    expect(trail).toHaveLength(2);
  });

  it('returns full audit trail without filter', () => {
    const cm = new ConsentManager();
    cm.grant('user1', 'face1', 'x');
    cm.grant('user2', 'face2', 'y');
    expect(cm.getAuditTrail()).toHaveLength(2);
  });

  it('revokes all consents for a user', () => {
    const cm = new ConsentManager();
    cm.grant('user1', 'face1', 'a');
    cm.grant('user1', 'face2', 'b');
    const count = cm.revokeAll('user1');
    expect(count).toBe(2);
    expect(cm.getActiveConsents('user1')).toHaveLength(0);
  });

  it('double revoke returns false', () => {
    const cm = new ConsentManager();
    const record = cm.grant('user1', 'face1', 'x');
    expect(cm.revoke(record.id)).toBe(true);
    expect(cm.revoke(record.id)).toBe(false);
  });
});

describe('DeepfakeMarker', () => {
  it('embeds C2PA-compatible provenance marker', () => {
    const marker = new DeepfakeMarker();
    const result = marker.embed('asset_123', ['face_swap', 'style_transfer']);
    expect(result.c2paCompatible).toBe(true);
    expect(result.signature).toMatch(/^c2pa:/);
    expect(result.transformations).toEqual(['face_swap', 'style_transfer']);
  });

  it('verifies valid markers', () => {
    const marker = new DeepfakeMarker();
    marker.embed('asset_456', ['color_grade']);
    const verification = marker.verify('asset_456');
    expect(verification.valid).toBe(true);
    expect(verification.marker).not.toBeNull();
  });

  it('fails verification for unknown assets', () => {
    const marker = new DeepfakeMarker();
    const verification = marker.verify('unknown_asset');
    expect(verification.valid).toBe(false);
    expect(verification.marker).toBeNull();
  });

  it('checks marker existence', () => {
    const marker = new DeepfakeMarker();
    marker.embed('marked', ['effect']);
    expect(marker.hasMarker('marked')).toBe(true);
    expect(marker.hasMarker('unmarked')).toBe(false);
  });

  it('retrieves transformations', () => {
    const marker = new DeepfakeMarker();
    marker.embed('asset_x', ['a', 'b', 'c']);
    expect(marker.getTransformations('asset_x')).toEqual(['a', 'b', 'c']);
    expect(marker.getTransformations('missing')).toEqual([]);
  });
});
