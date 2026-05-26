import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface LiveClass {
  id: string;
  courseId: string;
  instructorId: string;
  title: string;
  startTime: Date;
  duration: number;
  status: 'scheduled' | 'live' | 'ended';
  participants: ClassParticipant[];
  recording: Recording | null;
  whiteboard: Whiteboard | null;
  createdAt: Date;
}

export interface ClassParticipant {
  id: string;
  classId: string;
  studentId: string;
  joinedAt: Date;
}

export interface Recording {
  id: string;
  classId: string;
  url: string;
  duration: number;
  createdAt: Date;
}

export interface Attendance {
  studentId: string;
  joinedAt: Date;
  leftAt: Date | null;
}

export interface Whiteboard {
  id: string;
  classId: string;
  enabled: boolean;
  createdAt: Date;
}

export const ScheduleClassSchema = z.object({
  courseId: z.string().min(1),
  instructorId: z.string().min(1),
  startTime: z.coerce.date(),
  duration: z.number().int().min(15).max(480),
});

export const JoinClassSchema = z.object({
  classId: z.string().min(1),
  studentId: z.string().min(1),
});

export class LiveClassService {
  private readonly classes = new Map<string, LiveClass>();

  scheduleClass(
    courseId: string,
    instructorId: string,
    startTime: Date,
    duration: number,
  ): LiveClass {
    const parsed = ScheduleClassSchema.parse({ courseId, instructorId, startTime, duration });

    const liveClass: LiveClass = {
      id: randomUUID(),
      courseId: parsed.courseId,
      instructorId: parsed.instructorId,
      title: `Live class for course ${parsed.courseId}`,
      startTime: parsed.startTime,
      duration: parsed.duration,
      status: 'scheduled',
      participants: [],
      recording: null,
      whiteboard: null,
      createdAt: new Date(),
    };

    this.classes.set(liveClass.id, liveClass);
    return liveClass;
  }

  startClass(classId: string): LiveClass {
    const liveClass = this.getClass(classId);

    if (liveClass.status === 'live') {
      throw createAppError('Class is already live', 400, 'CLASS_ALREADY_LIVE');
    }

    if (liveClass.status === 'ended') {
      throw createAppError('Class has already ended', 400, 'CLASS_ENDED');
    }

    liveClass.status = 'live';
    return liveClass;
  }

  endClass(classId: string): LiveClass {
    const liveClass = this.getClass(classId);

    if (liveClass.status === 'ended') {
      throw createAppError('Class has already ended', 400, 'CLASS_ENDED');
    }

    liveClass.status = 'ended';
    return liveClass;
  }

  joinClass(classId: string, studentId: string): ClassParticipant {
    const liveClass = this.getClass(classId);

    if (liveClass.status !== 'live') {
      throw createAppError('Class is not live', 400, 'CLASS_NOT_LIVE');
    }

    const existing = liveClass.participants.find((p) => p.studentId === studentId);
    if (existing) {
      throw createAppError('Student already in class', 409, 'ALREADY_IN_CLASS');
    }

    JoinClassSchema.parse({ classId, studentId });

    const participant: ClassParticipant = {
      id: randomUUID(),
      classId,
      studentId,
      joinedAt: new Date(),
    };

    liveClass.participants.push(participant);
    return participant;
  }

  recordClass(classId: string): Recording {
    const liveClass = this.getClass(classId);

    if (liveClass.recording) {
      return liveClass.recording;
    }

    const recording: Recording = {
      id: randomUUID(),
      classId,
      url: `https://recordings.quantlearn.io/${classId}`,
      duration: liveClass.duration,
      createdAt: new Date(),
    };

    liveClass.recording = recording;
    return recording;
  }

  getAttendance(classId: string): Attendance[] {
    const liveClass = this.getClass(classId);

    return liveClass.participants.map((p) => ({
      studentId: p.studentId,
      joinedAt: p.joinedAt,
      leftAt: liveClass.status === 'ended' ? new Date() : null,
    }));
  }

  getClassReplay(classId: string): Recording | null {
    const liveClass = this.getClass(classId);
    return liveClass.recording;
  }

  enableWhiteboard(classId: string): Whiteboard {
    const liveClass = this.getClass(classId);

    if (liveClass.whiteboard) {
      return liveClass.whiteboard;
    }

    const whiteboard: Whiteboard = {
      id: randomUUID(),
      classId,
      enabled: true,
      createdAt: new Date(),
    };

    liveClass.whiteboard = whiteboard;
    return whiteboard;
  }

  private getClass(classId: string): LiveClass {
    const liveClass = this.classes.get(classId);
    if (!liveClass) {
      throw createAppError('Class not found', 404, 'CLASS_NOT_FOUND');
    }
    return liveClass;
  }
}
