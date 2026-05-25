// ============================================================================
// QuantMail - Template Service
// Email template creation, rendering, mail merge, variable substitution
// ============================================================================

interface TemplateVariable {
  name: string;
  defaultValue?: string;
  required: boolean;
  type: 'text' | 'html' | 'number' | 'date' | 'url';
}

interface EmailTemplate {
  id: string;
  userId: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  category: string;
  variables: TemplateVariable[];
  tags: string[];
  usageCount: number;
  lastUsedAt: Date | null;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MailMergeRecipient {
  email: string;
  name: string;
  variables: Record<string, string>;
}

interface MailMergeResult {
  id: string;
  templateId: string;
  totalRecipients: number;
  sent: number;
  failed: number;
  pending: number;
  results: Array<{ email: string; status: 'sent' | 'failed' | 'pending'; error?: string }>;
  startedAt: Date;
  completedAt: Date | null;
}

interface RenderResult {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  missingVariables: string[];
}

export class TemplateService {
  private templates: Map<string, EmailTemplate> = new Map();
  private userTemplateIndex: Map<string, string[]> = new Map();
  private mergeJobs: Map<string, MailMergeResult> = new Map();

  async create(userId: string, config: {
    name: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    category?: string;
    variables?: TemplateVariable[];
    tags?: string[];
  }): Promise<EmailTemplate> {
    if (!config.name || !config.subject || !config.bodyHtml) {
      throw new Error('Name, subject, and body HTML are required');
    }

    const detectedVars = this.detectVariables(config.bodyHtml + ' ' + config.subject);
    const variables = config.variables || detectedVars.map(name => ({
      name, required: true, type: 'text' as const, defaultValue: undefined,
    }));

    const templateId = `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const template: EmailTemplate = {
      id: templateId,
      userId,
      name: config.name.trim(),
      subject: config.subject,
      bodyHtml: config.bodyHtml,
      bodyText: config.bodyText || this.stripHtml(config.bodyHtml),
      category: config.category || 'general',
      variables,
      tags: config.tags || [],
      usageCount: 0,
      lastUsedAt: null,
      isShared: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.templates.set(templateId, template);
    const userTemplates = this.userTemplateIndex.get(userId) || [];
    userTemplates.push(templateId);
    this.userTemplateIndex.set(userId, userTemplates);

    return template;
  }

  async update(templateId: string, userId: string, updates: Partial<Pick<EmailTemplate, 'name' | 'subject' | 'bodyHtml' | 'bodyText' | 'category' | 'variables' | 'tags'>>): Promise<EmailTemplate> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');
    if (template.userId !== userId) throw new Error('Access denied');

    if (updates.name !== undefined) template.name = updates.name;
    if (updates.subject !== undefined) template.subject = updates.subject;
    if (updates.bodyHtml !== undefined) {
      template.bodyHtml = updates.bodyHtml;
      if (!updates.bodyText) template.bodyText = this.stripHtml(updates.bodyHtml);
    }
    if (updates.bodyText !== undefined) template.bodyText = updates.bodyText;
    if (updates.category !== undefined) template.category = updates.category;
    if (updates.variables !== undefined) template.variables = updates.variables;
    if (updates.tags !== undefined) template.tags = updates.tags;
    template.updatedAt = new Date();

    return template;
  }

  async delete(templateId: string, userId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');
    if (template.userId !== userId) throw new Error('Access denied');

    this.templates.delete(templateId);
    const userTemplates = this.userTemplateIndex.get(userId) || [];
    this.userTemplateIndex.set(userId, userTemplates.filter(id => id !== templateId));
  }

  async list(userId: string, options?: { category?: string; tag?: string; search?: string }): Promise<EmailTemplate[]> {
    const userTemplateIds = this.userTemplateIndex.get(userId) || [];
    let templates = userTemplateIds
      .map(id => this.templates.get(id))
      .filter((t): t is EmailTemplate => t !== undefined);

    if (options?.category) {
      templates = templates.filter(t => t.category === options.category);
    }
    if (options?.tag) {
      templates = templates.filter(t => t.tags.includes(options.tag!));
    }
    if (options?.search) {
      const query = options.search.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query)
      );
    }

    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async render(templateId: string, variables: Record<string, string>): Promise<RenderResult> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');

    const missingVariables: string[] = [];
    for (const v of template.variables) {
      if (v.required && !variables[v.name] && !v.defaultValue) {
        missingVariables.push(v.name);
      }
    }

    const resolvedVars: Record<string, string> = {};
    for (const v of template.variables) {
      resolvedVars[v.name] = variables[v.name] || v.defaultValue || '';
    }

    const subject = this.substituteVariables(template.subject, resolvedVars);
    const bodyHtml = this.substituteVariables(template.bodyHtml, resolvedVars);
    const bodyText = this.substituteVariables(template.bodyText, resolvedVars);

    template.usageCount++;
    template.lastUsedAt = new Date();

    return { subject, bodyHtml, bodyText, missingVariables };
  }

  async mailMerge(templateId: string, userId: string, recipients: MailMergeRecipient[]): Promise<MailMergeResult> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');
    if (template.userId !== userId) throw new Error('Access denied');
    if (recipients.length === 0) throw new Error('At least one recipient is required');
    if (recipients.length > 500) throw new Error('Maximum 500 recipients per merge');

    const jobId = `merge_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const job: MailMergeResult = {
      id: jobId,
      templateId,
      totalRecipients: recipients.length,
      sent: 0,
      failed: 0,
      pending: recipients.length,
      results: [],
      startedAt: new Date(),
      completedAt: null,
    };

    for (const recipient of recipients) {
      try {
        const vars = { ...recipient.variables, name: recipient.name, email: recipient.email };
        await this.render(templateId, vars);
        job.sent++;
        job.pending--;
        job.results.push({ email: recipient.email, status: 'sent' });
      } catch (error) {
        job.failed++;
        job.pending--;
        const msg = error instanceof Error ? error.message : 'Unknown error';
        job.results.push({ email: recipient.email, status: 'failed', error: msg });
      }
    }

    job.completedAt = new Date();
    this.mergeJobs.set(jobId, job);
    return job;
  }

  async preview(templateId: string, sampleData?: Record<string, string>): Promise<RenderResult> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');

    const previewVars: Record<string, string> = {};
    for (const v of template.variables) {
      previewVars[v.name] = sampleData?.[v.name] || v.defaultValue || `[${v.name}]`;
    }

    return this.render(templateId, previewVars);
  }

  async duplicate(templateId: string, userId: string, newName?: string): Promise<EmailTemplate> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');

    return this.create(userId, {
      name: newName || `${template.name} (copy)`,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
      category: template.category,
      variables: [...template.variables],
      tags: [...template.tags],
    });
  }

  async categorize(templateId: string, userId: string, category: string): Promise<EmailTemplate> {
    return this.update(templateId, userId, { category });
  }

  async getUsageStats(userId: string): Promise<{ totalTemplates: number; totalUsage: number; topTemplate: string | null; categoryCounts: Record<string, number> }> {
    const templates = await this.list(userId);
    const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);
    const topTemplate = templates.sort((a, b) => b.usageCount - a.usageCount)[0]?.name || null;
    const categoryCounts: Record<string, number> = {};
    for (const t of templates) {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    }

    return { totalTemplates: templates.length, totalUsage, topTemplate, categoryCounts };
  }

  private substituteVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? variables[varName] : match;
    });
  }

  private detectVariables(text: string): string[] {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    const varNames = matches.map(m => m.replace(/\{\{|\}\}/g, ''));
    return [...new Set(varNames)];
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

export const templateService = new TemplateService();
