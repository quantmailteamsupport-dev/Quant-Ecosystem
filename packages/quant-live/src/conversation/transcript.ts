import type { TranscriptSegment } from '../types.js';

export class TranscriptManager {
  private segments: TranscriptSegment[] = [];

  addSegment(segment: TranscriptSegment): void {
    this.segments.push(segment);
  }

  getFullTranscript(): TranscriptSegment[] {
    return [...this.segments];
  }

  getRecentSegments(n: number): TranscriptSegment[] {
    return this.segments.slice(-n);
  }

  getByTimestamp(start: number, end: number): TranscriptSegment[] {
    return this.segments.filter((s) => s.startTime >= start && s.endTime <= end);
  }

  getSpeakerSegments(speaker: 'user' | 'assistant'): TranscriptSegment[] {
    return this.segments.filter((s) => s.speaker === speaker);
  }

  clear(): void {
    this.segments = [];
  }
}
