// ============================================================================
// QuantMail - Import Service
// Email import from Gmail, Outlook, Yahoo, MBOX, EML with progress tracking
// ============================================================================

interface ImportJob {
  id: string;
  userId: string;
  source: 'gmail' | 'outlook' | 'yahoo' | 'mbox' | 'eml';
  status: 'pending' | 'authenticating' | 'scanning' | 'importing' | 'completed' | 'failed' | 'cancelled';
  totalMessages: number;
  importedMessages: number;
  failedMessages: number;
  skippedMessages: number;
  folderMapping: Record<string, string>;
  conflicts: ImportConflict[];
  startedAt: Date;
  completedAt: Date | null;
  estimatedTimeRemaining: number | null;
  errorMessage: string | null;
  options: ImportOptions;
}

interface ImportOptions {
  includeAttachments: boolean;
  includeLabels: boolean;
  includeDrafts: boolean;
  includeTrash: boolean;
  deduplication: boolean;
  dateRange?: { start: Date; end: Date };
  maxMessages?: number;
}

interface ImportConflict {
  id: string;
  messageId: string;
  type: 'duplicate' | 'folder_mismatch' | 'encoding_error' | 'size_limit';
  description: string;
  resolution: 'skip' | 'overwrite' | 'rename' | 'pending';
  sourceInfo: string;
}

interface FolderMapping {
  sourceFolder: string;
  destinationFolder: string;
  messageCount: number;
  autoMapped: boolean;
}

export class ImportService {
  private jobs: Map<string, ImportJob> = new Map();
  private userJobIndex: Map<string, string[]> = new Map();

  async importFromGmail(userId: string, authToken: string, options?: Partial<ImportOptions>): Promise<ImportJob> {
    if (!authToken) throw new Error('Gmail authentication token required');

    const job = this.createJob(userId, 'gmail', options);
    job.status = 'authenticating';

    // Simulate Gmail API connection
    const verified = authToken.length > 10;
    if (!verified) {
      job.status = 'failed';
      job.errorMessage = 'Invalid Gmail authentication token';
      return job;
    }

    job.status = 'scanning';
    job.totalMessages = Math.floor(Math.random() * 5000) + 500;
    job.folderMapping = {
      'INBOX': 'Inbox',
      '[Gmail]/Sent Mail': 'Sent',
      '[Gmail]/Drafts': 'Drafts',
      '[Gmail]/Trash': 'Trash',
      '[Gmail]/Spam': 'Spam',
      '[Gmail]/Starred': 'Starred',
    };

    this.startImportProcess(job);
    return job;
  }

  async importFromOutlook(userId: string, authToken: string, options?: Partial<ImportOptions>): Promise<ImportJob> {
    if (!authToken) throw new Error('Outlook authentication token required');

    const job = this.createJob(userId, 'outlook', options);
    job.status = 'authenticating';

    const verified = authToken.length > 10;
    if (!verified) {
      job.status = 'failed';
      job.errorMessage = 'Invalid Outlook authentication token';
      return job;
    }

    job.status = 'scanning';
    job.totalMessages = Math.floor(Math.random() * 3000) + 200;
    job.folderMapping = {
      'Inbox': 'Inbox',
      'Sent Items': 'Sent',
      'Drafts': 'Drafts',
      'Deleted Items': 'Trash',
      'Junk Email': 'Spam',
      'Archive': 'Archive',
    };

    this.startImportProcess(job);
    return job;
  }

  async importFromYahoo(userId: string, authToken: string, options?: Partial<ImportOptions>): Promise<ImportJob> {
    if (!authToken) throw new Error('Yahoo authentication token required');

    const job = this.createJob(userId, 'yahoo', options);
    job.status = 'authenticating';

    const verified = authToken.length > 8;
    if (!verified) {
      job.status = 'failed';
      job.errorMessage = 'Invalid Yahoo authentication token';
      return job;
    }

    job.status = 'scanning';
    job.totalMessages = Math.floor(Math.random() * 2000) + 100;
    job.folderMapping = {
      'Inbox': 'Inbox',
      'Sent': 'Sent',
      'Draft': 'Drafts',
      'Trash': 'Trash',
      'Bulk Mail': 'Spam',
    };

    this.startImportProcess(job);
    return job;
  }

  async importMbox(userId: string, fileContent: string, options?: Partial<ImportOptions>): Promise<ImportJob> {
    if (!fileContent || fileContent.length === 0) {
      throw new Error('MBOX file content is required');
    }

    const job = this.createJob(userId, 'mbox', options);
    job.status = 'scanning';

    // Parse MBOX format - count messages by "From " separator
    const messageCount = (fileContent.match(/^From /gm) || []).length;
    job.totalMessages = messageCount || 1;
    job.folderMapping = { 'mbox': 'Imported' };

    this.startImportProcess(job);
    return job;
  }

  async importEml(userId: string, emlFiles: Array<{ filename: string; content: string }>, options?: Partial<ImportOptions>): Promise<ImportJob> {
    if (!emlFiles || emlFiles.length === 0) {
      throw new Error('At least one EML file is required');
    }

    const job = this.createJob(userId, 'eml', options);
    job.status = 'scanning';
    job.totalMessages = emlFiles.length;
    job.folderMapping = { 'eml': 'Imported' };

    // Validate EML files
    for (const file of emlFiles) {
      if (!file.content.includes('From:') || !file.content.includes('Subject:')) {
        job.conflicts.push({
          id: `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          messageId: file.filename,
          type: 'encoding_error',
          description: `Invalid EML format: ${file.filename}`,
          resolution: 'skip',
          sourceInfo: file.filename,
        });
        job.skippedMessages++;
      }
    }

    this.startImportProcess(job);
    return job;
  }

  async getProgress(jobId: string, userId: string): Promise<{ status: string; progress: number; imported: number; total: number; estimated: number | null; errors: number }> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Import job not found');
    if (job.userId !== userId) throw new Error('Access denied');

    const progress = job.totalMessages > 0
      ? Math.round((job.importedMessages / job.totalMessages) * 100)
      : 0;

    return {
      status: job.status,
      progress,
      imported: job.importedMessages,
      total: job.totalMessages,
      estimated: job.estimatedTimeRemaining,
      errors: job.failedMessages,
    };
  }

  async mapFolders(jobId: string, userId: string, mapping: Record<string, string>): Promise<FolderMapping[]> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Import job not found');
    if (job.userId !== userId) throw new Error('Access denied');
    if (job.status !== 'scanning' && job.status !== 'pending') {
      throw new Error('Can only map folders before import starts');
    }

    job.folderMapping = { ...job.folderMapping, ...mapping };

    return Object.entries(job.folderMapping).map(([source, dest]) => ({
      sourceFolder: source,
      destinationFolder: dest,
      messageCount: Math.floor(job.totalMessages / Object.keys(job.folderMapping).length),
      autoMapped: !mapping[source],
    }));
  }

  async resolveConflicts(jobId: string, userId: string, resolutions: Array<{ conflictId: string; resolution: 'skip' | 'overwrite' | 'rename' }>): Promise<ImportConflict[]> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Import job not found');
    if (job.userId !== userId) throw new Error('Access denied');

    for (const res of resolutions) {
      const conflict = job.conflicts.find(c => c.id === res.conflictId);
      if (conflict) {
        conflict.resolution = res.resolution;
      }
    }

    return job.conflicts;
  }

  async estimateTime(jobId: string): Promise<{ estimatedMinutes: number; factors: Record<string, number> }> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Import job not found');

    const remaining = job.totalMessages - job.importedMessages;
    const messagesPerMinute = job.source === 'gmail' ? 100 : job.source === 'outlook' ? 80 : 120;
    const attachmentFactor = job.options.includeAttachments ? 1.5 : 1.0;
    const estimatedMinutes = Math.ceil((remaining / messagesPerMinute) * attachmentFactor);

    return {
      estimatedMinutes,
      factors: {
        remainingMessages: remaining,
        ratePerMinute: messagesPerMinute,
        attachmentMultiplier: attachmentFactor,
      },
    };
  }

  async cancelImport(jobId: string, userId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Import job not found');
    if (job.userId !== userId) throw new Error('Access denied');
    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error('Cannot cancel finished job');
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
  }

  private createJob(userId: string, source: ImportJob['source'], options?: Partial<ImportOptions>): ImportJob {
    const jobId = `import_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const job: ImportJob = {
      id: jobId,
      userId,
      source,
      status: 'pending',
      totalMessages: 0,
      importedMessages: 0,
      failedMessages: 0,
      skippedMessages: 0,
      folderMapping: {},
      conflicts: [],
      startedAt: new Date(),
      completedAt: null,
      estimatedTimeRemaining: null,
      errorMessage: null,
      options: {
        includeAttachments: options?.includeAttachments ?? true,
        includeLabels: options?.includeLabels ?? true,
        includeDrafts: options?.includeDrafts ?? false,
        includeTrash: options?.includeTrash ?? false,
        deduplication: options?.deduplication ?? true,
        dateRange: options?.dateRange,
        maxMessages: options?.maxMessages,
      },
    };

    this.jobs.set(jobId, job);
    const userJobs = this.userJobIndex.get(userId) || [];
    userJobs.push(jobId);
    this.userJobIndex.set(userId, userJobs);

    return job;
  }

  private startImportProcess(job: ImportJob): void {
    job.status = 'importing';
    // Simulate progressive import
    const batchSize = Math.min(50, job.totalMessages);
    job.importedMessages = batchSize;
    job.estimatedTimeRemaining = Math.ceil((job.totalMessages - batchSize) / 100) * 60;

    if (job.importedMessages >= job.totalMessages) {
      job.status = 'completed';
      job.completedAt = new Date();
      job.estimatedTimeRemaining = 0;
    }
  }
}

export const importService = new ImportService();
