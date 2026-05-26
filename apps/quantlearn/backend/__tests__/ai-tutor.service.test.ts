import { describe, it, expect, beforeEach } from 'vitest';
import { AITutorService } from '../services/ai-tutor.service';

describe('AITutorService', () => {
  let service: AITutorService;

  beforeEach(() => {
    service = new AITutorService();
  });

  describe('askQuestion', () => {
    it('returns a tutor response with answer', () => {
      const response = service.askQuestion('student-1', 'What is a closure?');

      expect(response.id).toBeDefined();
      expect(response.studentId).toBe('student-1');
      expect(response.question).toBe('What is a closure?');
      expect(response.answer).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.createdAt).toBeInstanceOf(Date);
    });

    it('includes context when provided', () => {
      const response = service.askQuestion('student-1', 'Explain this', 'JavaScript context');

      expect(response.context).toBe('JavaScript context');
    });

    it('sets context to null when not provided', () => {
      const response = service.askQuestion('student-1', 'General question');

      expect(response.context).toBeNull();
    });
  });

  describe('generateQuiz', () => {
    it('generates a quiz with correct number of questions', () => {
      const quiz = service.generateQuiz('JavaScript', 'beginner', 5);

      expect(quiz.id).toBeDefined();
      expect(quiz.topic).toBe('JavaScript');
      expect(quiz.difficulty).toBe('beginner');
      expect(quiz.questions).toHaveLength(5);
    });

    it('each question has options and correct index', () => {
      const quiz = service.generateQuiz('TypeScript', 'intermediate', 3);

      for (const question of quiz.questions) {
        expect(question.id).toBeDefined();
        expect(question.options).toHaveLength(4);
        expect(question.correctIndex).toBeGreaterThanOrEqual(0);
        expect(question.correctIndex).toBeLessThan(4);
      }
    });

    it('generates unique question IDs', () => {
      const quiz = service.generateQuiz('Python', 'advanced', 10);
      const ids = quiz.questions.map((q) => q.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('evaluateAnswer', () => {
    it('evaluates correct answer', () => {
      const quiz = service.generateQuiz('Math', 'beginner', 1);
      const question = quiz.questions[0]!;

      const evaluation = service.evaluateAnswer(question.id, question.correctIndex);

      expect(evaluation.correct).toBe(true);
      expect(evaluation.score).toBe(100);
    });

    it('evaluates incorrect answer', () => {
      const quiz = service.generateQuiz('Math', 'beginner', 1);
      const question = quiz.questions[0]!;
      const wrongAnswer = (question.correctIndex + 1) % 4;

      const evaluation = service.evaluateAnswer(question.id, wrongAnswer);

      expect(evaluation.correct).toBe(false);
      expect(evaluation.score).toBe(0);
    });

    it('throws for non-existent question', () => {
      expect(() => service.evaluateAnswer('nonexistent', 0)).toThrow('Question not found');
    });
  });

  describe('getPersonalizedPath', () => {
    it('generates a learning path with steps for each goal', () => {
      const path = service.getPersonalizedPath('student-1', ['JavaScript', 'React', 'Node.js']);

      expect(path.id).toBeDefined();
      expect(path.studentId).toBe('student-1');
      expect(path.goals).toEqual(['JavaScript', 'React', 'Node.js']);
      expect(path.steps).toHaveLength(3);
      expect(path.estimatedHours).toBeGreaterThan(0);
    });

    it('assigns ordered steps', () => {
      const path = service.getPersonalizedPath('student-1', ['HTML', 'CSS']);

      expect(path.steps[0]!.order).toBe(1);
      expect(path.steps[1]!.order).toBe(2);
    });
  });

  describe('explainConcept', () => {
    it('explains a concept at the specified level', () => {
      const explanation = service.explainConcept('recursion', 'beginner');

      expect(explanation.id).toBeDefined();
      expect(explanation.concept).toBe('recursion');
      expect(explanation.level).toBe('beginner');
      expect(explanation.content).toBeDefined();
      expect(explanation.examples.length).toBeGreaterThan(0);
    });
  });

  describe('adaptDifficulty', () => {
    it('increases difficulty for high performance', () => {
      service.adaptDifficulty('student-1', 95);
      const level = service.adaptDifficulty('student-1', 92);

      expect(level).toBe('expert');
    });

    it('decreases difficulty for low performance', () => {
      const level = service.adaptDifficulty('student-1', 30);

      expect(level).toBe('beginner');
    });

    it('sets intermediate for moderate performance', () => {
      const level = service.adaptDifficulty('student-1', 60);

      expect(level).toBe('intermediate');
    });

    it('tracks performance over time', () => {
      service.adaptDifficulty('student-1', 50);
      service.adaptDifficulty('student-1', 80);
      const level = service.adaptDifficulty('student-1', 90);

      // Average is (50+80+90)/3 = 73.3 -> intermediate
      expect(level).toBe('intermediate');
    });
  });

  describe('generateExercise', () => {
    it('generates an exercise with correct properties', () => {
      const exercise = service.generateExercise('algorithms', 'coding', 'advanced');

      expect(exercise.id).toBeDefined();
      expect(exercise.topic).toBe('algorithms');
      expect(exercise.type).toBe('coding');
      expect(exercise.difficulty).toBe('advanced');
      expect(exercise.prompt).toBeDefined();
      expect(exercise.hints.length).toBeGreaterThan(0);
    });
  });

  describe('provideFeedback', () => {
    it('provides feedback for a submission', () => {
      const feedback = service.provideFeedback('submission-1');

      expect(feedback.id).toBeDefined();
      expect(feedback.submissionId).toBe('submission-1');
      expect(feedback.score).toBeGreaterThanOrEqual(70);
      expect(feedback.comments.length).toBeGreaterThan(0);
      expect(feedback.suggestions.length).toBeGreaterThan(0);
    });
  });
});
