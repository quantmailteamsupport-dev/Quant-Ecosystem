import { Automation, AutomationAction, AutomationCondition, AutomationTrigger } from '../types.js';

export class AutomationEngine {
  private automations = new Map<string, Automation>();

  constructor(private actionHandler: (action: AutomationAction) => void) {}

  addAutomation(automation: Automation): void {
    this.automations.set(automation.id, automation);
  }

  removeAutomation(id: string): boolean {
    return this.automations.delete(id);
  }

  enableAutomation(id: string): void {
    const a = this.automations.get(id);
    if (a) a.enabled = true;
  }

  disableAutomation(id: string): void {
    const a = this.automations.get(id);
    if (a) a.enabled = false;
  }

  evaluateTrigger(trigger: AutomationTrigger): string[] {
    const fired: string[] = [];
    for (const [id, automation] of this.automations) {
      if (!automation.enabled) continue;
      const matchesTrigger = automation.triggers.some((t) => t.type === trigger.type);
      if (!matchesTrigger) continue;
      const conditionsMet = automation.conditions.every((c) => this.checkCondition(c));
      if (!conditionsMet) continue;
      for (const action of automation.actions) {
        this.actionHandler(action);
      }
      fired.push(id);
    }
    return fired;
  }

  checkCondition(condition: AutomationCondition): boolean {
    if (condition.type === 'time_range') {
      const { start, end, current } = condition.config as {
        start?: number;
        end?: number;
        current?: number;
      };
      if (start !== undefined && end !== undefined && current !== undefined) {
        return current >= start && current <= end;
      }
    }
    if (condition.type === 'device_state') {
      const { expected, actual } = condition.config as { expected?: unknown; actual?: unknown };
      return expected === actual;
    }
    return false;
  }

  getAutomation(id: string): Automation | undefined {
    return this.automations.get(id);
  }

  listAutomations(): Automation[] {
    return [...this.automations.values()];
  }
}
