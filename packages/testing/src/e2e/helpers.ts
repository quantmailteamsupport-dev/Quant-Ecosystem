import type { E2EStep, E2EScenario } from '../types';

export function navigateTo(url: string): E2EStep {
  return { type: 'given', action: 'navigate', value: url };
}

export function clickElement(selector: string): E2EStep {
  return { type: 'when', action: 'click', selector };
}

export function typeText(selector: string, text: string): E2EStep {
  return { type: 'when', action: 'type', selector, value: text };
}

export function assertVisible(selector: string): E2EStep {
  return { type: 'then', action: 'assert_visible', selector };
}

export function assertText(selector: string, text: string): E2EStep {
  return { type: 'then', action: 'assert_text', selector, value: text };
}

export function assertUrl(url: string): E2EStep {
  return { type: 'then', action: 'assert_url', value: url };
}

export function waitFor(ms: number): E2EStep {
  return { type: 'when', action: 'wait', timeout: ms };
}

export function selectOption(selector: string, value: string): E2EStep {
  return { type: 'when', action: 'select', selector, value };
}

export function createJourney(
  name: string,
  opts: { tags: string[]; steps: E2EStep[]; retries?: number },
): E2EScenario {
  return {
    name,
    steps: opts.steps,
    tags: opts.tags,
    retries: opts.retries ?? 0,
  };
}
