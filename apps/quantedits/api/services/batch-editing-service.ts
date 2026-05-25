// ============================================================================
// QuantEdits - Batch Editing Service
// Batch operations, presets, queue processing, progress tracking
// ============================================================================

interface BatchJob {
  id: string;
  userId: string;
  files: BatchFile[];
  operations: EditOperation[];
  preset?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  processedCount: number;
  failedCount: number;
  results: BatchResult[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedTimeMs: number;
}

interface BatchFile {
  id: string;
  filename: string;
  url: string;
  size: number;
  type: 'image' | 'video' | 'audio';
  dimensions?: { width: number; height: number };
  duration?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface EditOperation {
  type: 'resize' | 'crop' | 'filter' | 'watermark' | 'format_convert' | 'compress' | 'color_adjust' | 'trim' | 'rotate';
  params: Record<string, any>;
  order: number;
}

interface BatchResult {
  fileId: string;
  outputUrl: string;
  outputSize: number;
  processingTimeMs: number;
  appliedOperations: string[];
  success: boolean;
  error?: string;
}

interface BatchPreset {
  id: string;
  name: string;
  description: string;
  operations: EditOperation[];
  category: 'social' | 'web' | 'print' | 'video' | 'custom';
  usageCount: number;
}

class BatchEditingService {
  private jobs: Map<string, BatchJob> = new Map();
  private presets: Map<string, BatchPreset> = new Map();
  private userJobs: Map<string, string[]> = new Map();
  private counter: number = 0;

  constructor() {
    this.initPresets();
  }

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  private initPresets(): void {
    const presetData: Omit<BatchPreset, 'id' | 'usageCount'>[] = [
      { name: 'Instagram Square', description: 'Resize to 1080x1080, apply vibrant filter', category: 'social', operations: [{ type: 'resize', params: { width: 1080, height: 1080 }, order: 0 }, { type: 'filter', params: { name: 'vibrant' }, order: 1 }] },
      { name: 'Twitter Banner', description: 'Resize to 1500x500', category: 'social', operations: [{ type: 'resize', params: { width: 1500, height: 500 }, order: 0 }] },
      { name: 'Web Optimize', description: 'Compress and convert to WebP', category: 'web', operations: [{ type: 'compress', params: { quality: 80 }, order: 0 }, { type: 'format_convert', params: { format: 'webp' }, order: 1 }] },
      { name: 'Print Ready', description: 'High res with CMYK conversion', category: 'print', operations: [{ type: 'resize', params: { width: 3000, height: 4000, dpi: 300 }, order: 0 }, { type: 'color_adjust', params: { profile: 'cmyk' }, order: 1 }] },
    ];

    presetData.forEach(p => {
      const preset: BatchPreset = { id: this.genId('preset'), ...p, usageCount: Math.floor(Math.random() * 1000) };
      this.presets.set(preset.id, preset);
    });
  }

  async createBatch(userId: string, files: Omit<BatchFile, 'id' | 'status'>[]): Promise<BatchJob> {
    if (files.length === 0) throw new Error('No files provided');
    if (files.length > 100) throw new Error('Maximum 100 files per batch');

    const batchFiles: BatchFile[] = files.map(f => ({
      ...f,
      id: this.genId('file'),
      status: 'pending' as const,
    }));

    const job: BatchJob = {
      id: this.genId('batch'),
      userId,
      files: batchFiles,
      operations: [],
      status: 'queued',
      progress: 0,
      processedCount: 0,
      failedCount: 0,
      results: [],
      createdAt: new Date().toISOString(),
      estimatedTimeMs: files.length * 500,
    };

    this.jobs.set(job.id, job);
    const userJobList = this.userJobs.get(userId) || [];
    userJobList.push(job.id);
    this.userJobs.set(userId, userJobList);

    return job;
  }

  async applyToAll(batchId: string, operation: Omit<EditOperation, 'order'>): Promise<BatchJob> {
    const job = this.jobs.get(batchId);
    if (!job) throw new Error('Batch not found');
    if (job.status === 'processing') throw new Error('Cannot modify while processing');

    const op: EditOperation = { ...operation, order: job.operations.length };
    job.operations.push(op);
    return job;
  }

  async setPreset(batchId: string, presetId: string): Promise<BatchJob> {
    const job = this.jobs.get(batchId);
    if (!job) throw new Error('Batch not found');
    const preset = this.presets.get(presetId);
    if (!preset) throw new Error('Preset not found');

    job.operations = [...preset.operations];
    job.preset = preset.name;
    preset.usageCount++;
    return job;
  }

  async processQueue(batchId: string): Promise<BatchJob> {
    const job = this.jobs.get(batchId);
    if (!job) throw new Error('Batch not found');
    if (job.operations.length === 0) throw new Error('No operations defined');
    if (job.status === 'processing') throw new Error('Already processing');

    job.status = 'processing';
    job.startedAt = new Date().toISOString();

    for (let i = 0; i < job.files.length; i++) {
      const file = job.files[i];
      file.status = 'processing';

      try {
        const startTime = Date.now();
        // Simulate processing with random success rate
        const success = Math.random() > 0.05;

        if (success) {
          const result: BatchResult = {
            fileId: file.id,
            outputUrl: `https://cdn.quant.edits/batch/${job.id}/${file.id}_output.${file.type === 'image' ? 'jpg' : 'mp4'}`,
            outputSize: Math.floor(file.size * (0.5 + Math.random() * 0.8)),
            processingTimeMs: Date.now() - startTime + Math.floor(Math.random() * 200),
            appliedOperations: job.operations.map(o => o.type),
            success: true,
          };
          job.results.push(result);
          file.status = 'completed';
          job.processedCount++;
        } else {
          file.status = 'failed';
          file.error = 'Processing failed - unsupported format';
          job.results.push({ fileId: file.id, outputUrl: '', outputSize: 0, processingTimeMs: 0, appliedOperations: [], success: false, error: file.error });
          job.failedCount++;
        }
      } catch (err: any) {
        file.status = 'failed';
        file.error = err.message;
        job.failedCount++;
      }

      job.progress = Math.round(((i + 1) / job.files.length) * 100);
    }

    job.status = job.failedCount === job.files.length ? 'failed' : 'completed';
    job.completedAt = new Date().toISOString();
    return job;
  }

  async getProgress(batchId: string): Promise<{ progress: number; status: string; processedCount: number; failedCount: number; total: number }> {
    const job = this.jobs.get(batchId);
    if (!job) throw new Error('Batch not found');
    return { progress: job.progress, status: job.status, processedCount: job.processedCount, failedCount: job.failedCount, total: job.files.length };
  }

  async cancelBatch(batchId: string): Promise<BatchJob> {
    const job = this.jobs.get(batchId);
    if (!job) throw new Error('Batch not found');
    if (job.status === 'completed') throw new Error('Cannot cancel completed batch');
    job.status = 'cancelled';
    return job;
  }

  async retryFailed(batchId: string): Promise<BatchJob> {
    const job = this.jobs.get(batchId);
    if (!job) throw new Error('Batch not found');
    const failedFiles = job.files.filter(f => f.status === 'failed');
    if (failedFiles.length === 0) throw new Error('No failed files to retry');

    for (const file of failedFiles) {
      file.status = 'pending';
      file.error = undefined;
    }
    job.failedCount = 0;
    job.status = 'queued';
    return job;
  }

  async exportAll(batchId: string): Promise<{ downloadUrl: string; totalFiles: number; totalSize: number }> {
    const job = this.jobs.get(batchId);
    if (!job) throw new Error('Batch not found');
    if (job.status !== 'completed') throw new Error('Batch not completed');

    const totalSize = job.results.filter(r => r.success).reduce((s, r) => s + r.outputSize, 0);
    return { downloadUrl: `https://cdn.quant.edits/batch/${batchId}/export.zip`, totalFiles: job.processedCount, totalSize };
  }

  async getResults(batchId: string): Promise<BatchResult[]> {
    const job = this.jobs.get(batchId);
    if (!job) throw new Error('Batch not found');
    return job.results;
  }
}

export const batchEditingService = new BatchEditingService();
export { BatchEditingService };
