import { describe, it, expect, beforeEach } from 'vitest';
import { CourseService } from '../services/course.service';

describe('CourseService', () => {
  let service: CourseService;

  beforeEach(() => {
    service = new CourseService();
  });

  describe('createCourse', () => {
    it('creates a course with correct properties', () => {
      const course = service.createCourse(
        'instructor-1',
        'TypeScript Basics',
        'Learn TS',
        'programming',
      );

      expect(course.id).toBeDefined();
      expect(course.instructorId).toBe('instructor-1');
      expect(course.title).toBe('TypeScript Basics');
      expect(course.description).toBe('Learn TS');
      expect(course.category).toBe('programming');
      expect(course.status).toBe('draft');
      expect(course.modules).toEqual([]);
      expect(course.enrollments).toEqual([]);
      expect(course.createdAt).toBeInstanceOf(Date);
    });

    it('generates unique IDs for multiple courses', () => {
      const course1 = service.createCourse('inst-1', 'Course 1', 'Desc', 'cat');
      const course2 = service.createCourse('inst-1', 'Course 2', 'Desc', 'cat');

      expect(course1.id).not.toBe(course2.id);
    });
  });

  describe('updateCourse', () => {
    it('updates course title', () => {
      const course = service.createCourse('inst-1', 'Old Title', 'Desc', 'cat');
      const updated = service.updateCourse(course.id, { title: 'New Title' });

      expect(updated.title).toBe('New Title');
      expect(updated.description).toBe('Desc');
    });

    it('throws for non-existent course', () => {
      expect(() => service.updateCourse('nonexistent', { title: 'X' })).toThrow('Course not found');
    });
  });

  describe('publishCourse', () => {
    it('publishes a draft course', () => {
      const course = service.createCourse('inst-1', 'Course', 'Desc', 'cat');
      const published = service.publishCourse(course.id);

      expect(published.status).toBe('published');
    });

    it('throws if course is already published', () => {
      const course = service.createCourse('inst-1', 'Course', 'Desc', 'cat');
      service.publishCourse(course.id);

      expect(() => service.publishCourse(course.id)).toThrow('Course is already published');
    });
  });

  describe('enrollStudent', () => {
    it('enrolls a student in a published course', () => {
      const course = service.createCourse('inst-1', 'Course', 'Desc', 'cat');
      service.publishCourse(course.id);

      const enrollment = service.enrollStudent(course.id, 'student-1');

      expect(enrollment.id).toBeDefined();
      expect(enrollment.courseId).toBe(course.id);
      expect(enrollment.studentId).toBe('student-1');
      expect(enrollment.progress).toBe(0);
    });

    it('throws if course is not published', () => {
      const course = service.createCourse('inst-1', 'Course', 'Desc', 'cat');

      expect(() => service.enrollStudent(course.id, 'student-1')).toThrow(
        'Course is not published',
      );
    });

    it('throws if student is already enrolled', () => {
      const course = service.createCourse('inst-1', 'Course', 'Desc', 'cat');
      service.publishCourse(course.id);
      service.enrollStudent(course.id, 'student-1');

      expect(() => service.enrollStudent(course.id, 'student-1')).toThrow(
        'Student already enrolled',
      );
    });
  });

  describe('progress and completion', () => {
    it('tracks lecture completion and progress', () => {
      const course = service.createCourse('inst-1', 'Course', 'Desc', 'cat');
      const module = service.addModule(course.id, 'Module 1', 0);
      const lecture = service.addLecture(module.id, 'Lecture 1', 'Content', 'text');

      service.publishCourse(course.id);
      service.enrollStudent(course.id, 'student-1');

      const progress = service.completeLecture(course.id, 'student-1', lecture.id);

      expect(progress.completedLectures).toContain(lecture.id);
      expect(progress.progress).toBe(100);
    });

    it('returns correct progress with multiple lectures', () => {
      const course = service.createCourse('inst-1', 'Course', 'Desc', 'cat');
      const module = service.addModule(course.id, 'Module 1', 0);
      const lecture1 = service.addLecture(module.id, 'Lecture 1', 'Content 1', 'text');
      service.addLecture(module.id, 'Lecture 2', 'Content 2', 'video');

      service.publishCourse(course.id);
      service.enrollStudent(course.id, 'student-1');

      const progress = service.completeLecture(course.id, 'student-1', lecture1.id);

      expect(progress.progress).toBe(50);
      expect(progress.totalLectures).toBe(2);
    });

    it('throws for non-enrolled student', () => {
      const course = service.createCourse('inst-1', 'Course', 'Desc', 'cat');

      expect(() => service.getProgress(course.id, 'student-1')).toThrow('Student not enrolled');
    });
  });

  describe('getCertificate', () => {
    it('issues a certificate when course is fully completed', () => {
      const course = service.createCourse('inst-1', 'Course', 'Desc', 'cat');
      const module = service.addModule(course.id, 'Module 1', 0);
      const lecture = service.addLecture(module.id, 'Lecture 1', 'Content', 'text');

      service.publishCourse(course.id);
      service.enrollStudent(course.id, 'student-1');
      service.completeLecture(course.id, 'student-1', lecture.id);

      const cert = service.getCertificate(course.id, 'student-1');

      expect(cert.id).toBeDefined();
      expect(cert.courseId).toBe(course.id);
      expect(cert.studentId).toBe('student-1');
      expect(cert.courseTitle).toBe('Course');
      expect(cert.issuedAt).toBeInstanceOf(Date);
    });

    it('throws if course is not completed', () => {
      const course = service.createCourse('inst-1', 'Course', 'Desc', 'cat');
      const module = service.addModule(course.id, 'Module 1', 0);
      service.addLecture(module.id, 'Lecture 1', 'Content', 'text');

      service.publishCourse(course.id);
      service.enrollStudent(course.id, 'student-1');

      expect(() => service.getCertificate(course.id, 'student-1')).toThrow('Course not completed');
    });
  });

  describe('listCourses and searchCourses', () => {
    it('lists courses with category filter', () => {
      service.createCourse('inst-1', 'TS Course', 'Desc', 'programming');
      service.createCourse('inst-1', 'Art Course', 'Desc', 'art');

      const programming = service.listCourses({ category: 'programming' });
      expect(programming).toHaveLength(1);
      expect(programming[0]!.title).toBe('TS Course');
    });

    it('searches courses by title', () => {
      service.createCourse('inst-1', 'Advanced TypeScript', 'Desc', 'programming');
      service.createCourse('inst-1', 'Python Basics', 'Desc', 'programming');

      const results = service.searchCourses('typescript');
      expect(results).toHaveLength(1);
      expect(results[0]!.title).toBe('Advanced TypeScript');
    });
  });

  describe('addModule and addLecture', () => {
    it('adds a module to a course', () => {
      const course = service.createCourse('inst-1', 'Course', 'Desc', 'cat');
      const module = service.addModule(course.id, 'Module 1', 0);

      expect(module.id).toBeDefined();
      expect(module.courseId).toBe(course.id);
      expect(module.title).toBe('Module 1');
      expect(module.lectures).toEqual([]);
    });

    it('adds a lecture to a module', () => {
      const course = service.createCourse('inst-1', 'Course', 'Desc', 'cat');
      const module = service.addModule(course.id, 'Module 1', 0);
      const lecture = service.addLecture(module.id, 'Lecture 1', 'Content here', 'video');

      expect(lecture.id).toBeDefined();
      expect(lecture.moduleId).toBe(module.id);
      expect(lecture.title).toBe('Lecture 1');
      expect(lecture.type).toBe('video');
    });

    it('throws when adding lecture to non-existent module', () => {
      expect(() => service.addLecture('fake-module', 'L1', 'Content', 'text')).toThrow(
        'Module not found',
      );
    });
  });
});
