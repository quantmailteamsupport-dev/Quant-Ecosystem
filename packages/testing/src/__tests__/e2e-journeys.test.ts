import { describe, it, expect } from 'vitest';
import { journeys } from '../e2e/journeys';

const ALL_APPS = [
  'quantchat',
  'quantmail',
  'quantai',
  'quantads',
  'quantube',
  'quantneon',
  'quantsync',
  'quantdocs',
  'quantdrive',
  'quantmeet',
  'quantcalendar',
  'quantedits',
  'quantmax',
];

describe('E2E User Journeys', () => {
  it('defines exactly 30 journeys', () => {
    expect(journeys.length).toBe(30);
  });

  it('each journey has at least 3 steps', () => {
    for (const journey of journeys) {
      expect(journey.steps.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('each journey has valid step types', () => {
    const validTypes = new Set(['given', 'when', 'then']);
    for (const journey of journeys) {
      for (const step of journey.steps) {
        expect(validTypes.has(step.type)).toBe(true);
      }
    }
  });

  it('no duplicate journey names', () => {
    const names = journeys.map((j) => j.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(30);
  });

  it('all 13 apps have at least one journey', () => {
    const coveredApps = new Set(journeys.flatMap((j) => j.tags));
    for (const app of ALL_APPS) {
      expect(coveredApps.has(app)).toBe(true);
    }
  });

  it('each journey has proper tags', () => {
    for (const journey of journeys) {
      expect(journey.tags.length).toBeGreaterThan(0);
    }
  });
});
