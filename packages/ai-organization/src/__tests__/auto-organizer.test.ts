import { describe, expect, it } from 'vitest';
import { createAutoOrganizer } from '../auto-organizer.js';

describe('AutoOrganizer', () => {
  it('creates organizer with default config', () => {
    const organizer = createAutoOrganizer({ userId: 'user-1' });
    const config = organizer.getConfig();

    expect(config.userId).toBe('user-1');
    expect(config.enabled).toBe(true);
    expect(config.autoTag).toBe(true);
    expect(config.autoFolder).toBe(true);
    expect(config.patternLearning).toBe(true);
    expect(config.confidenceThreshold).toBe(0.7);
  });

  it('adds and manages organization rules', () => {
    const organizer = createAutoOrganizer({ userId: 'user-1' });
    const rule = organizer.addRule({
      name: 'Tag invoices',
      type: 'tag',
      condition: { field: 'content', operator: 'contains', value: 'invoice' },
      action: { type: 'add_tag', target: 'finance' },
      priority: 1,
      enabled: true,
      learned: false,
      confidence: 0.9,
    });

    expect(rule.id).toBeTruthy();
    expect(organizer.getRules()).toHaveLength(1);
    expect(organizer.getRule(rule.id)).not.toBeNull();
  });

  it('removes rules', () => {
    const organizer = createAutoOrganizer({ userId: 'user-1' });
    const rule = organizer.addRule({
      name: 'R1',
      type: 'tag',
      condition: { field: 'content', operator: 'contains', value: 'test' },
      action: { type: 'add_tag', target: 'test' },
      priority: 1,
      enabled: true,
      learned: false,
      confidence: 0.8,
    });

    expect(organizer.removeRule(rule.id)).toBe(true);
    expect(organizer.getRules()).toHaveLength(0);
  });

  it('enables and disables rules', () => {
    const organizer = createAutoOrganizer({ userId: 'user-1' });
    const rule = organizer.addRule({
      name: 'R1',
      type: 'tag',
      condition: { field: 'content', operator: 'contains', value: 'test' },
      action: { type: 'add_tag', target: 'test' },
      priority: 1,
      enabled: true,
      learned: false,
      confidence: 0.8,
    });

    organizer.disableRule(rule.id);
    expect(organizer.getRule(rule.id)!.enabled).toBe(false);

    organizer.enableRule(rule.id);
    expect(organizer.getRule(rule.id)!.enabled).toBe(true);
  });

  it('creates smart folders', () => {
    const organizer = createAutoOrganizer({ userId: 'user-1' });
    const folder = organizer.createSmartFolder({
      name: 'Finance',
      path: '/finance',
      description: 'All finance documents',
      autoCreated: true,
    });

    expect(folder.id).toBeTruthy();
    expect(folder.autoCreated).toBe(true);
    expect(organizer.getSmartFolders()).toHaveLength(1);
  });

  it('classifies items with auto-tagging', () => {
    const organizer = createAutoOrganizer({ userId: 'user-1' });
    organizer.addRule({
      name: 'Finance tag',
      type: 'tag',
      condition: { field: 'content', operator: 'contains', value: 'invoice' },
      action: { type: 'add_tag', target: 'finance' },
      priority: 1,
      enabled: true,
      learned: false,
      confidence: 0.9,
    });

    const classification = organizer.classify({
      id: 'doc-1',
      type: 'document',
      content: 'Please find attached invoice #1234',
    });

    expect(classification.itemId).toBe('doc-1');
    expect(classification.suggestedTags.some((t) => t.tag === 'finance')).toBe(true);
  });

  it('suggests priority based on content', () => {
    const organizer = createAutoOrganizer({ userId: 'user-1' });

    expect(organizer.suggestPriority('This is critical and needs attention now')).toBe('critical');
    expect(organizer.suggestPriority('Urgent: Please review ASAP')).toBe('high');
    expect(organizer.suggestPriority('When possible, could you check this')).toBe('low');
    expect(organizer.suggestPriority('Here are the meeting notes')).toBe('medium');
  });

  it('suggests tags from content keywords', () => {
    const organizer = createAutoOrganizer({ userId: 'user-1' });

    const tags = organizer.suggestTags('This is urgent! Need help ASAP');
    expect(tags.some((t) => t.tag === 'urgent')).toBe(true);
  });

  it('learns from user actions (pattern learning)', () => {
    const organizer = createAutoOrganizer({ userId: 'user-1' });

    const learned = organizer.learnFromAction(
      'Weekly team sync notes from Monday standup',
      'meeting-notes',
    );

    expect(learned.learned).toBe(true);
    expect(learned.action.target).toBe('meeting-notes');
    expect(organizer.getPatterns()).toHaveLength(1);
  });

  it('increases confidence as patterns match more', () => {
    const organizer = createAutoOrganizer({ userId: 'user-1' });
    organizer.learnFromAction('weekly meeting notes', 'meetings');

    const patternBefore = organizer.getPatterns()[0]!;
    expect(patternBefore.confidence).toBe(0.6);

    for (let i = 0; i < 6; i++) {
      organizer.classify({
        id: `item-${i}`,
        type: 'note',
        content: 'weekly meeting notes and updates',
      });
    }

    const patternAfter = organizer.getPatterns()[0]!;
    expect(patternAfter.confidence).toBeGreaterThan(0.6);
    expect(patternAfter.matches).toBeGreaterThan(1);
  });

  it('sorts rules by priority', () => {
    const organizer = createAutoOrganizer({ userId: 'user-1' });
    organizer.addRule({
      name: 'Low priority',
      type: 'tag',
      condition: { field: 'content', operator: 'contains', value: 'a' },
      action: { type: 'add_tag', target: 'a' },
      priority: 10,
      enabled: true,
      learned: false,
      confidence: 0.5,
    });
    organizer.addRule({
      name: 'High priority',
      type: 'tag',
      condition: { field: 'content', operator: 'contains', value: 'b' },
      action: { type: 'add_tag', target: 'b' },
      priority: 1,
      enabled: true,
      learned: false,
      confidence: 0.5,
    });

    const rules = organizer.getRules();
    expect(rules[0]!.name).toBe('High priority');
    expect(rules[1]!.name).toBe('Low priority');
  });

  it('removes smart folders', () => {
    const organizer = createAutoOrganizer({ userId: 'user-1' });
    const folder = organizer.createSmartFolder({
      name: 'Temp',
      path: '/temp',
      description: 'Temporary',
    });

    expect(organizer.removeSmartFolder(folder.id)).toBe(true);
    expect(organizer.getSmartFolders()).toHaveLength(0);
  });
});
