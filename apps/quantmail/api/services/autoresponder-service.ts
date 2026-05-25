// ============================================================================
// QuantMail - Autoresponder Service
// Out-of-office replies, scheduled responses, exceptions, response history
// ============================================================================

interface AutoresponderConfig {
  id: string;
  userId: string;
  isEnabled: boolean;
  message: string;
  subject: string;
  htmlMessage: string | null;
  startDate: Date | null;
  endDate: Date | null;
  schedule: WeeklySchedule | null;
  exceptions: AutoresponderException[];
  customRules: AutoresponderRule[];
  respondOnce: boolean;
  respondedTo: Set<string>;
  includeOriginal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface WeeklySchedule {
  monday: { start: string; end: string } | null;
  tuesday: { start: string; end: string } | null;
  wednesday: { start: string; end: string } | null;
  thursday: { start: string; end: string } | null;
  friday: { start: string; end: string } | null;
  saturday: { start: string; end: string } | null;
  sunday: { start: string; end: string } | null;
}

interface AutoresponderException {
  type: 'contact' | 'domain' | 'keyword';
  value: string;
  action: 'skip' | 'custom_message';
  customMessage?: string;
}

interface AutoresponderRule {
  id: string;
  condition: { field: 'from' | 'subject' | 'to'; operator: 'contains' | 'equals'; value: string };
  message: string;
  priority: number;
}

interface ResponseLog {
  id: string;
  configId: string;
  sentTo: string;
  originalSubject: string;
  responseSent: string;
  sentAt: Date;
  ruleMatched: string | null;
}

export class AutoresponderService {
  private configs: Map<string, AutoresponderConfig> = new Map();
  private userConfigIndex: Map<string, string> = new Map();
  private responseLogs: Map<string, ResponseLog[]> = new Map();

  async enable(userId: string): Promise<AutoresponderConfig> {
    let config = this.getOrCreateConfig(userId);
    config.isEnabled = true;
    config.updatedAt = new Date();
    return config;
  }

  async disable(userId: string): Promise<AutoresponderConfig> {
    const config = this.getOrCreateConfig(userId);
    config.isEnabled = false;
    config.respondedTo.clear();
    config.updatedAt = new Date();
    return config;
  }

  async setSchedule(userId: string, startDate: Date, endDate: Date): Promise<AutoresponderConfig> {
    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    const config = this.getOrCreateConfig(userId);
    config.startDate = startDate;
    config.endDate = endDate;
    config.updatedAt = new Date();
    return config;
  }

  async setWeeklySchedule(userId: string, schedule: Partial<WeeklySchedule>): Promise<AutoresponderConfig> {
    const config = this.getOrCreateConfig(userId);
    config.schedule = {
      monday: schedule.monday || null,
      tuesday: schedule.tuesday || null,
      wednesday: schedule.wednesday || null,
      thursday: schedule.thursday || null,
      friday: schedule.friday || null,
      saturday: schedule.saturday || null,
      sunday: schedule.sunday || null,
    };
    config.updatedAt = new Date();
    return config;
  }

  async setMessage(userId: string, subject: string, message: string, htmlMessage?: string): Promise<AutoresponderConfig> {
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }
    if (message.length > 5000) {
      throw new Error('Message too long (max 5000 characters)');
    }

    const config = this.getOrCreateConfig(userId);
    config.subject = subject || 'Re: {{original_subject}}';
    config.message = message;
    config.htmlMessage = htmlMessage || null;
    config.updatedAt = new Date();
    return config;
  }

  async setExceptions(userId: string, exceptions: AutoresponderException[]): Promise<AutoresponderConfig> {
    const config = this.getOrCreateConfig(userId);

    // Validate exceptions
    for (const exc of exceptions) {
      if (!exc.value || exc.value.trim().length === 0) {
        throw new Error('Exception value cannot be empty');
      }
      if (exc.action === 'custom_message' && !exc.customMessage) {
        throw new Error('Custom message required for custom_message action');
      }
    }

    config.exceptions = exceptions;
    config.updatedAt = new Date();
    return config;
  }

  async getStatus(userId: string): Promise<{
    enabled: boolean;
    active: boolean;
    message: string;
    startDate: Date | null;
    endDate: Date | null;
    responsesCount: number;
    lastResponse: Date | null;
  }> {
    const config = this.getOrCreateConfig(userId);
    const logs = this.responseLogs.get(config.id) || [];
    const lastLog = logs[logs.length - 1];
    const active = config.isEnabled && this.isCurrentlyActive(config);

    return {
      enabled: config.isEnabled,
      active,
      message: config.message,
      startDate: config.startDate,
      endDate: config.endDate,
      responsesCount: logs.length,
      lastResponse: lastLog?.sentAt || null,
    };
  }

  async logResponse(userId: string, sentTo: string, originalSubject: string, ruleMatched?: string): Promise<ResponseLog> {
    const config = this.getOrCreateConfig(userId);

    const log: ResponseLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      configId: config.id,
      sentTo,
      originalSubject,
      responseSent: config.message,
      sentAt: new Date(),
      ruleMatched: ruleMatched || null,
    };

    const logs = this.responseLogs.get(config.id) || [];
    logs.push(log);
    this.responseLogs.set(config.id, logs);

    config.respondedTo.add(sentTo);
    return log;
  }

  async getResponseHistory(userId: string, options?: { limit?: number; offset?: number }): Promise<{ logs: ResponseLog[]; total: number }> {
    const config = this.getOrCreateConfig(userId);
    const logs = this.responseLogs.get(config.id) || [];
    const sorted = logs.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());

    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    const paginated = sorted.slice(offset, offset + limit);

    return { logs: paginated, total: sorted.length };
  }

  async setCustomRules(userId: string, rules: Omit<AutoresponderRule, 'id'>[]): Promise<AutoresponderConfig> {
    const config = this.getOrCreateConfig(userId);

    config.customRules = rules.map((rule, index) => ({
      ...rule,
      id: `arule_${Date.now()}_${index}`,
      priority: rule.priority || index + 1,
    }));

    config.updatedAt = new Date();
    return config;
  }

  async shouldRespond(userId: string, email: { from: string; subject: string; to: string }): Promise<{
    shouldRespond: boolean;
    message: string | null;
    reason: string;
  }> {
    const config = this.getOrCreateConfig(userId);

    if (!config.isEnabled) {
      return { shouldRespond: false, message: null, reason: 'Autoresponder disabled' };
    }

    if (!this.isCurrentlyActive(config)) {
      return { shouldRespond: false, message: null, reason: 'Outside active schedule' };
    }

    if (config.respondOnce && config.respondedTo.has(email.from)) {
      return { shouldRespond: false, message: null, reason: 'Already responded to this sender' };
    }

    // Check exceptions
    for (const exc of config.exceptions) {
      let matches = false;
      switch (exc.type) {
        case 'contact':
          matches = email.from.toLowerCase().includes(exc.value.toLowerCase());
          break;
        case 'domain':
          matches = email.from.toLowerCase().endsWith(`@${exc.value.toLowerCase()}`);
          break;
        case 'keyword':
          matches = email.subject.toLowerCase().includes(exc.value.toLowerCase());
          break;
      }

      if (matches) {
        if (exc.action === 'skip') {
          return { shouldRespond: false, message: null, reason: `Exception matched: ${exc.type}=${exc.value}` };
        }
        if (exc.action === 'custom_message') {
          return { shouldRespond: true, message: exc.customMessage || config.message, reason: 'Custom exception message' };
        }
      }
    }

    // Check custom rules
    for (const rule of config.customRules.sort((a, b) => a.priority - b.priority)) {
      let fieldValue = '';
      switch (rule.condition.field) {
        case 'from': fieldValue = email.from; break;
        case 'subject': fieldValue = email.subject; break;
        case 'to': fieldValue = email.to; break;
      }

      let ruleMatches = false;
      if (rule.condition.operator === 'contains') {
        ruleMatches = fieldValue.toLowerCase().includes(rule.condition.value.toLowerCase());
      } else if (rule.condition.operator === 'equals') {
        ruleMatches = fieldValue.toLowerCase() === rule.condition.value.toLowerCase();
      }

      if (ruleMatches) {
        return { shouldRespond: true, message: rule.message, reason: `Custom rule: ${rule.id}` };
      }
    }

    // Default response
    const message = config.message.replace('{{original_subject}}', email.subject);
    return { shouldRespond: true, message, reason: 'Default autoresponder' };
  }

  private getOrCreateConfig(userId: string): AutoresponderConfig {
    const existingId = this.userConfigIndex.get(userId);
    if (existingId) {
      return this.configs.get(existingId)!;
    }

    const configId = `ar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const config: AutoresponderConfig = {
      id: configId,
      userId,
      isEnabled: false,
      message: 'Thank you for your email. I am currently out of office and will respond when I return.',
      subject: 'Re: {{original_subject}}',
      htmlMessage: null,
      startDate: null,
      endDate: null,
      schedule: null,
      exceptions: [],
      customRules: [],
      respondOnce: true,
      respondedTo: new Set(),
      includeOriginal: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.configs.set(configId, config);
    this.userConfigIndex.set(userId, configId);
    return config;
  }

  private isCurrentlyActive(config: AutoresponderConfig): boolean {
    const now = new Date();

    if (config.startDate && now < config.startDate) return false;
    if (config.endDate && now > config.endDate) return false;

    if (config.schedule) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
      const today = days[now.getDay()];
      const todaySchedule = config.schedule[today];
      if (!todaySchedule) return false;

      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      return currentTime >= todaySchedule.start && currentTime <= todaySchedule.end;
    }

    return true;
  }
}

export const autoresponderService = new AutoresponderService();
