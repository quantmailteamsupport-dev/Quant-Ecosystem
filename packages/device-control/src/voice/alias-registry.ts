import type { UserAlias } from './types.js';

export class AliasRegistry {
  private aliases = new Map<string, UserAlias>();

  add(trigger: string, value: string, category?: string): void {
    this.aliases.set(trigger.toLowerCase(), { trigger, value, category });
  }

  remove(trigger: string): boolean {
    return this.aliases.delete(trigger.toLowerCase());
  }

  resolve(text: string): string {
    let result = text;
    for (const alias of this.aliases.values()) {
      const regex = new RegExp(alias.trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(regex, alias.value);
    }
    return result;
  }

  getAll(): UserAlias[] {
    return [...this.aliases.values()];
  }

  clear(): void {
    this.aliases.clear();
  }
}
