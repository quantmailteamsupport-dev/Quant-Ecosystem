import type { ElderModeConfig } from '../types.js';

interface MedicationReminder {
  id: string;
  name: string;
  timeOfDay: string;
  taken: boolean;
}

interface CheckIn {
  id: string;
  timestamp: number;
  mood: string;
  notes: string;
}

interface FamilyLogEntry {
  id: string;
  action: string;
  timestamp: number;
  detail: string;
}

export class ElderMode {
  private cfg: ElderModeConfig | null = null;
  private medications: MedicationReminder[] = [];
  private checkIns: CheckIn[] = [];
  private familyLog: FamilyLogEntry[] = [];
  private simplifiedCommands: string[] = ['call', 'help', 'weather', 'time', 'music', 'lights'];

  enable(c: ElderModeConfig): void {
    this.cfg = { ...c, enabled: true };
  }
  disable(): void {
    this.cfg = null;
  }
  isEnabled(): boolean {
    return this.cfg?.enabled ?? false;
  }
  getConfig(): ElderModeConfig | null {
    return this.cfg;
  }
  triggerEmergency(): string | null {
    return this.cfg?.emergencyContact ?? null;
  }

  updateFamilyConfig(s: Partial<ElderModeConfig>): void {
    if (this.cfg) Object.assign(this.cfg, s);
  }

  getFallbackUI() {
    return this.cfg ? { mode: 'large-buttons' as const, fontSize: this.cfg.fontSize } : null;
  }

  addMedication(name: string, timeOfDay: string): string {
    const id = crypto.randomUUID();
    this.medications.push({ id, name, timeOfDay, taken: false });
    this.logFamily('medication_added', `Added ${name} at ${timeOfDay}`);
    return id;
  }

  getMedications(): MedicationReminder[] {
    return [...this.medications];
  }

  takeMedication(id: string): boolean {
    const med = this.medications.find((m) => m.id === id);
    if (!med) return false;
    med.taken = true;
    this.logFamily('medication_taken', `Took ${med.name}`);
    return true;
  }

  resetMedications(): void {
    for (const med of this.medications) med.taken = false;
  }

  getDueMedications(currentTime: string): MedicationReminder[] {
    return this.medications.filter((m) => !m.taken && m.timeOfDay === currentTime);
  }

  dailyCheckIn(mood: string, notes: string): string {
    const id = crypto.randomUUID();
    this.checkIns.push({ id, timestamp: Date.now(), mood, notes });
    this.logFamily('check_in', `Mood: ${mood}`);
    return id;
  }

  getCheckIns(): CheckIn[] {
    return [...this.checkIns];
  }

  getSimplifiedCommands(): string[] {
    return [...this.simplifiedCommands];
  }

  setSimplifiedCommands(commands: string[]): void {
    this.simplifiedCommands = [...commands];
  }

  isSimplifiedCommand(cmd: string): boolean {
    return this.simplifiedCommands.some((s) => cmd.toLowerCase().startsWith(s));
  }

  getFamilyLog(): FamilyLogEntry[] {
    return [...this.familyLog];
  }

  private logFamily(action: string, detail: string): void {
    this.familyLog.push({ id: crypto.randomUUID(), action, timestamp: Date.now(), detail });
  }
}
