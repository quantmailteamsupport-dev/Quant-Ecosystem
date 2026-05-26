import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';

export interface BuilderModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  lessons: Lesson[];
  exercises: BuilderExercise[];
  assessments: Assessment[];
  order: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  type: 'video' | 'text' | 'interactive' | 'slides';
  content: string;
  order: number;
  media: Media[];
}

export interface BuilderExercise {
  id: string;
  moduleId: string;
  config: ExerciseConfig;
  order: number;
}

export interface ExerciseConfig {
  type: 'coding' | 'quiz' | 'project';
  title: string;
  instructions: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Assessment {
  id: string;
  moduleId: string;
  questions: AssessmentQuestion[];
  passingScore: number;
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'coding';
  options?: string[];
  correctAnswer: string;
}

export interface CoursePreview {
  courseId: string;
  modules: BuilderModule[];
  totalLessons: number;
  totalExercises: number;
  totalAssessments: number;
}

export interface Media {
  id: string;
  lessonId: string;
  mediaType: 'image' | 'video' | 'audio' | 'document';
  url: string;
  createdAt: Date;
}

export const CreateModuleSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
});

export const AddLessonSchema = z.object({
  moduleId: z.string().min(1),
  type: z.enum(['video', 'text', 'interactive', 'slides']),
  content: z.string().min(1),
});

export const AddExerciseSchema = z.object({
  moduleId: z.string().min(1),
  config: z.object({
    type: z.enum(['coding', 'quiz', 'project']),
    title: z.string().min(1),
    instructions: z.string().min(1),
    difficulty: z.enum(['easy', 'medium', 'hard']),
  }),
});

export const AddAssessmentSchema = z.object({
  moduleId: z.string().min(1),
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        type: z.enum(['multiple-choice', 'short-answer', 'coding']),
        options: z.array(z.string()).optional(),
        correctAnswer: z.string().min(1),
      }),
    )
    .min(1),
});

export const AddMediaSchema = z.object({
  lessonId: z.string().min(1),
  mediaType: z.enum(['image', 'video', 'audio', 'document']),
  url: z.string().url(),
});

export class CourseBuilderService {
  private readonly modules = new Map<string, BuilderModule>();
  private readonly lessons = new Map<string, Lesson>();
  private readonly courseModules = new Map<string, string[]>();

  createModule(courseId: string, title: string, description: string): BuilderModule {
    const parsed = CreateModuleSchema.parse({ courseId, title, description });

    const existingModuleIds = this.courseModules.get(parsed.courseId) ?? [];
    const order = existingModuleIds.length + 1;

    const module: BuilderModule = {
      id: randomUUID(),
      courseId: parsed.courseId,
      title: parsed.title,
      description: parsed.description,
      lessons: [],
      exercises: [],
      assessments: [],
      order,
    };

    this.modules.set(module.id, module);
    existingModuleIds.push(module.id);
    this.courseModules.set(parsed.courseId, existingModuleIds);

    return module;
  }

  addLesson(moduleId: string, type: Lesson['type'], content: string): Lesson {
    const parsed = AddLessonSchema.parse({ moduleId, type, content });
    const module = this.getModule(parsed.moduleId);

    const lesson: Lesson = {
      id: randomUUID(),
      moduleId: parsed.moduleId,
      type: parsed.type,
      content: parsed.content,
      order: module.lessons.length + 1,
      media: [],
    };

    module.lessons.push(lesson);
    this.lessons.set(lesson.id, lesson);
    return lesson;
  }

  addExercise(moduleId: string, config: ExerciseConfig): BuilderExercise {
    AddExerciseSchema.parse({ moduleId, config });
    const module = this.getModule(moduleId);

    const exercise: BuilderExercise = {
      id: randomUUID(),
      moduleId,
      config,
      order: module.exercises.length + 1,
    };

    module.exercises.push(exercise);
    return exercise;
  }

  addAssessment(moduleId: string, questions: Omit<AssessmentQuestion, 'id'>[]): Assessment {
    AddAssessmentSchema.parse({ moduleId, questions });
    const module = this.getModule(moduleId);

    const assessment: Assessment = {
      id: randomUUID(),
      moduleId,
      questions: questions.map((q) => ({ ...q, id: randomUUID() })),
      passingScore: 70,
    };

    module.assessments.push(assessment);
    return assessment;
  }

  reorderContent(moduleId: string, order: string[]): void {
    const module = this.getModule(moduleId);

    module.lessons = order
      .map((id, idx) => {
        const lesson = module.lessons.find((l) => l.id === id);
        if (lesson) {
          lesson.order = idx + 1;
        }
        return lesson;
      })
      .filter((l): l is Lesson => l !== undefined);
  }

  previewCourse(courseId: string): CoursePreview {
    const moduleIds = this.courseModules.get(courseId) ?? [];
    const modules = moduleIds
      .map((id) => this.modules.get(id))
      .filter((m): m is BuilderModule => m !== undefined);

    return {
      courseId,
      modules,
      totalLessons: modules.reduce((sum, m) => sum + m.lessons.length, 0),
      totalExercises: modules.reduce((sum, m) => sum + m.exercises.length, 0),
      totalAssessments: modules.reduce((sum, m) => sum + m.assessments.length, 0),
    };
  }

  addMedia(lessonId: string, mediaType: Media['mediaType'], url: string): Media {
    AddMediaSchema.parse({ lessonId, mediaType, url });

    const lesson = this.lessons.get(lessonId);
    if (!lesson) {
      throw createAppError('Lesson not found', 404, 'LESSON_NOT_FOUND');
    }

    const media: Media = {
      id: randomUUID(),
      lessonId,
      mediaType,
      url,
      createdAt: new Date(),
    };

    lesson.media.push(media);
    return media;
  }

  private getModule(moduleId: string): BuilderModule {
    const module = this.modules.get(moduleId);
    if (!module) {
      throw createAppError('Module not found', 404, 'MODULE_NOT_FOUND');
    }
    return module;
  }
}
