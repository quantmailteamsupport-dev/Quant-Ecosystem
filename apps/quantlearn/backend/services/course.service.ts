import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface Course {
  id: string;
  instructorId: string;
  title: string;
  description: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  modules: CourseModule[];
  enrollments: Enrollment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  order: number;
  lectures: Lecture[];
}

export interface Lecture {
  id: string;
  moduleId: string;
  title: string;
  content: string;
  type: 'video' | 'text' | 'interactive' | 'quiz';
}

export interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: Date;
  completedLectures: string[];
  progress: number;
}

export interface CourseProgress {
  courseId: string;
  studentId: string;
  completedLectures: string[];
  totalLectures: number;
  progress: number;
}

export interface Certificate {
  id: string;
  courseId: string;
  studentId: string;
  courseTitle: string;
  issuedAt: Date;
}

export const CreateCourseSchema = z.object({
  instructorId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.string().min(1).max(100),
});

export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;

export const UpdateCourseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  category: z.string().min(1).max(100).optional(),
});

export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;

export const AddModuleSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(200),
  order: z.number().int().min(0),
});

export const AddLectureSchema = z.object({
  moduleId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  type: z.enum(['video', 'text', 'interactive', 'quiz']),
});

export class CourseService {
  private readonly courses = new Map<string, Course>();
  private readonly modules = new Map<string, CourseModule>();
  private readonly certificates = new Map<string, Certificate>();

  createCourse(instructorId: string, title: string, description: string, category: string): Course {
    const input = CreateCourseSchema.parse({ instructorId, title, description, category });

    const course: Course = {
      id: randomUUID(),
      instructorId: input.instructorId,
      title: input.title,
      description: input.description,
      category: input.category,
      status: 'draft',
      modules: [],
      enrollments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.courses.set(course.id, course);
    return course;
  }

  updateCourse(courseId: string, updates: UpdateCourseInput): Course {
    const course = this.getCourse(courseId);
    const parsed = UpdateCourseSchema.parse(updates);

    if (parsed.title !== undefined) course.title = parsed.title;
    if (parsed.description !== undefined) course.description = parsed.description;
    if (parsed.category !== undefined) course.category = parsed.category;
    course.updatedAt = new Date();

    return course;
  }

  publishCourse(courseId: string): Course {
    const course = this.getCourse(courseId);

    if (course.status === 'published') {
      throw createAppError('Course is already published', 400, 'ALREADY_PUBLISHED');
    }

    course.status = 'published';
    course.updatedAt = new Date();
    return course;
  }

  enrollStudent(courseId: string, studentId: string): Enrollment {
    const course = this.getCourse(courseId);

    if (course.status !== 'published') {
      throw createAppError('Course is not published', 400, 'COURSE_NOT_PUBLISHED');
    }

    const existing = course.enrollments.find((e) => e.studentId === studentId);
    if (existing) {
      throw createAppError('Student already enrolled', 409, 'ALREADY_ENROLLED');
    }

    const enrollment: Enrollment = {
      id: randomUUID(),
      courseId,
      studentId,
      enrolledAt: new Date(),
      completedLectures: [],
      progress: 0,
    };

    course.enrollments.push(enrollment);
    return enrollment;
  }

  getProgress(courseId: string, studentId: string): CourseProgress {
    const course = this.getCourse(courseId);
    const enrollment = course.enrollments.find((e) => e.studentId === studentId);

    if (!enrollment) {
      throw createAppError('Student not enrolled', 404, 'NOT_ENROLLED');
    }

    const totalLectures = course.modules.reduce((sum, m) => sum + m.lectures.length, 0);

    return {
      courseId,
      studentId,
      completedLectures: enrollment.completedLectures,
      totalLectures,
      progress: totalLectures > 0 ? (enrollment.completedLectures.length / totalLectures) * 100 : 0,
    };
  }

  completeLecture(courseId: string, studentId: string, lectureId: string): CourseProgress {
    const course = this.getCourse(courseId);
    const enrollment = course.enrollments.find((e) => e.studentId === studentId);

    if (!enrollment) {
      throw createAppError('Student not enrolled', 404, 'NOT_ENROLLED');
    }

    const lectureExists = course.modules.some((m) => m.lectures.some((l) => l.id === lectureId));

    if (!lectureExists) {
      throw createAppError('Lecture not found', 404, 'LECTURE_NOT_FOUND');
    }

    if (!enrollment.completedLectures.includes(lectureId)) {
      enrollment.completedLectures.push(lectureId);
    }

    const totalLectures = course.modules.reduce((sum, m) => sum + m.lectures.length, 0);
    enrollment.progress =
      totalLectures > 0 ? (enrollment.completedLectures.length / totalLectures) * 100 : 0;

    return this.getProgress(courseId, studentId);
  }

  getCertificate(courseId: string, studentId: string): Certificate {
    const course = this.getCourse(courseId);
    const enrollment = course.enrollments.find((e) => e.studentId === studentId);

    if (!enrollment) {
      throw createAppError('Student not enrolled', 404, 'NOT_ENROLLED');
    }

    const totalLectures = course.modules.reduce((sum, m) => sum + m.lectures.length, 0);
    if (totalLectures === 0 || enrollment.completedLectures.length < totalLectures) {
      throw createAppError('Course not completed', 400, 'COURSE_NOT_COMPLETED');
    }

    const existingCert = Array.from(this.certificates.values()).find(
      (c) => c.courseId === courseId && c.studentId === studentId,
    );
    if (existingCert) return existingCert;

    const certificate: Certificate = {
      id: randomUUID(),
      courseId,
      studentId,
      courseTitle: course.title,
      issuedAt: new Date(),
    };

    this.certificates.set(certificate.id, certificate);
    return certificate;
  }

  listCourses(filters?: { category?: string; status?: string }): Course[] {
    let courses = Array.from(this.courses.values());

    if (filters?.category) {
      courses = courses.filter((c) => c.category === filters.category);
    }
    if (filters?.status) {
      courses = courses.filter((c) => c.status === filters.status);
    }

    return courses;
  }

  searchCourses(query: string): Course[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.courses.values()).filter(
      (c) =>
        c.title.toLowerCase().includes(lowerQuery) ||
        c.description.toLowerCase().includes(lowerQuery) ||
        c.category.toLowerCase().includes(lowerQuery),
    );
  }

  addModule(courseId: string, title: string, order: number): CourseModule {
    const course = this.getCourse(courseId);
    AddModuleSchema.parse({ courseId, title, order });

    const module: CourseModule = {
      id: randomUUID(),
      courseId,
      title,
      order,
      lectures: [],
    };

    course.modules.push(module);
    this.modules.set(module.id, module);
    return module;
  }

  addLecture(moduleId: string, title: string, content: string, type: Lecture['type']): Lecture {
    AddLectureSchema.parse({ moduleId, title, content, type });
    const module = this.modules.get(moduleId);

    if (!module) {
      throw createAppError('Module not found', 404, 'MODULE_NOT_FOUND');
    }

    const lecture: Lecture = {
      id: randomUUID(),
      moduleId,
      title,
      content,
      type,
    };

    module.lectures.push(lecture);
    return lecture;
  }

  private getCourse(courseId: string): Course {
    const course = this.courses.get(courseId);
    if (!course) {
      throw createAppError('Course not found', 404, 'COURSE_NOT_FOUND');
    }
    return course;
  }
}
