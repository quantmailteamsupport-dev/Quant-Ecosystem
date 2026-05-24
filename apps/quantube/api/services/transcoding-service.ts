// ============================================================================
// QuantTube - Transcoding Service
// Video/audio transcoding pipeline, multi-resolution encoding
// ============================================================================

interface TranscodeJob {
  id: string;
  videoId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  sourceUrl: string;
  outputFormats: string[];
  outputs: TranscodeOutput[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface TranscodeOutput {
  format: string;
  resolution: string;
  bitrate: number;
  codec: string;
  url: string;
  size: number;
  status: 'pending' | 'encoding' | 'done';
}

interface TranscodeOptions {
  sourceUrl: string;
  outputFormats: string[];
  priority?: 'low' | 'normal' | 'high';
  enableHDR?: boolean;
  audioCodec?: string;
  audioBitrate?: number;
}

const formatProfiles: Record<string, { resolution: string; bitrate: number; codec: string }> = {
  '360p': { resolution: '640x360', bitrate: 800000, codec: 'h264' },
  '480p': { resolution: '854x480', bitrate: 1400000, codec: 'h264' },
  '720p': { resolution: '1280x720', bitrate: 2800000, codec: 'h264' },
  '1080p': { resolution: '1920x1080', bitrate: 5000000, codec: 'h264' },
  '1440p': { resolution: '2560x1440', bitrate: 8000000, codec: 'h265' },
  '4k': { resolution: '3840x2160', bitrate: 16000000, codec: 'h265' },
};

class TranscodingService {
  private jobs: Map<string, TranscodeJob> = new Map();
  private queue: string[] = [];
  private maxConcurrent: number = 5;
  private activeJobs: number = 0;

  startTranscoding(videoId: string, options: TranscodeOptions): TranscodeJob {
    const jobId = `tj_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

    const outputs: TranscodeOutput[] = options.outputFormats.map(format => {
      const profile = formatProfiles[format] || formatProfiles['720p'];
      return {
        format,
        resolution: profile.resolution,
        bitrate: profile.bitrate,
        codec: options.enableHDR && ['1440p', '4k'].includes(format) ? 'h265' : profile.codec,
        url: `/encoded/${videoId}/${format}/playlist.m3u8`,
        size: 0,
        status: 'pending',
      };
    });

    const job: TranscodeJob = {
      id: jobId,
      videoId,
      status: 'queued',
      progress: 0,
      sourceUrl: options.sourceUrl,
      outputFormats: options.outputFormats,
      outputs,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, job);
    this.queue.push(jobId);
    this.processQueue();

    return job;
  }

  getJobStatus(jobId: string): TranscodeJob | null {
    return this.jobs.get(jobId) || null;
  }

  getJobsByVideo(videoId: string): TranscodeJob[] {
    return Array.from(this.jobs.values()).filter(j => j.videoId === videoId);
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed') return false;
    job.status = 'failed';
    job.error = 'Cancelled by user';
    const queueIdx = this.queue.indexOf(jobId);
    if (queueIdx > -1) this.queue.splice(queueIdx, 1);
    return true;
  }

  private processQueue(): void {
    while (this.activeJobs < this.maxConcurrent && this.queue.length > 0) {
      const jobId = this.queue.shift()!;
      const job = this.jobs.get(jobId);
      if (!job) continue;
      this.activeJobs++;
      job.status = 'processing';
      job.startedAt = new Date().toISOString();
      this.simulateTranscoding(job);
    }
  }

  private simulateTranscoding(job: TranscodeJob): void {
    // Simulate progressive encoding of each format
    let completedOutputs = 0;
    for (const output of job.outputs) {
      output.status = 'encoding';
      // Calculate estimated file size based on bitrate and assumed 10-minute video
      output.size = (output.bitrate * 600) / 8;
      output.status = 'done';
      completedOutputs++;
      job.progress = (completedOutputs / job.outputs.length) * 100;
    }
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    this.activeJobs--;
  }

  getEncodingPipeline(sourceCodec: string, targetCodec: string): string[] {
    const pipeline: string[] = [];
    pipeline.push(`demux:${sourceCodec}`);
    pipeline.push('decode:raw_frames');
    if (sourceCodec !== targetCodec) {
      pipeline.push(`scale:resolution`);
      pipeline.push(`encode:${targetCodec}`);
    }
    pipeline.push('segment:hls');
    pipeline.push('manifest:m3u8');
    return pipeline;
  }

  estimateTranscodeTime(durationSeconds: number, formats: string[]): number {
    // Rough estimate: encoding is about 2x realtime per format for h264, 4x for h265
    let totalTime = 0;
    for (const format of formats) {
      const profile = formatProfiles[format];
      const multiplier = profile?.codec === 'h265' ? 4 : 2;
      totalTime += durationSeconds * multiplier;
    }
    return totalTime / this.maxConcurrent;
  }
}

export const transcodingService = new TranscodingService();
