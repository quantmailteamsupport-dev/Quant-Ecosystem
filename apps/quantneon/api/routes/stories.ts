// ============================================================================
// QuantNeon API - Stories Routes
// 24hr stories, interactive stickers (polls, questions, sliders, countdowns, quizzes, music)
// ============================================================================

import { storiesController } from '../controllers/stories-controller';
import type { Request, Response, NextFunction } from '../middleware';
import type { RouteDefinition } from './posts';

export const storyRoutes: RouteDefinition[] = [
  { method: 'POST', path: '/stories', handler: (req, res) => storiesController.createStory(req, res), requiresAuth: true },
  { method: 'GET', path: '/stories/feed', handler: (req, res) => storiesController.getStoriesFeed(req, res), requiresAuth: true },
  { method: 'GET', path: '/stories/:userId', handler: (req, res) => storiesController.getUserStories(req, res), requiresAuth: true },
  { method: 'GET', path: '/stories/item/:id', handler: (req, res) => storiesController.getStory(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/stories/:id', handler: (req, res) => storiesController.deleteStory(req, res), requiresAuth: true },
  { method: 'POST', path: '/stories/:id/view', handler: (req, res) => storiesController.markViewed(req, res), requiresAuth: true },
  { method: 'POST', path: '/stories/:id/reply', handler: (req, res) => storiesController.replyToStory(req, res), requiresAuth: true },
  { method: 'POST', path: '/stories/:id/react', handler: (req, res) => storiesController.reactToStory(req, res), requiresAuth: true },
  { method: 'POST', path: '/stories/:id/poll/vote', handler: (req, res) => storiesController.votePoll(req, res), requiresAuth: true },
  { method: 'POST', path: '/stories/:id/question/answer', handler: (req, res) => storiesController.answerQuestion(req, res), requiresAuth: true },
  { method: 'POST', path: '/stories/:id/slider/respond', handler: (req, res) => storiesController.respondSlider(req, res), requiresAuth: true },
  { method: 'POST', path: '/stories/:id/quiz/answer', handler: (req, res) => storiesController.answerQuiz(req, res), requiresAuth: true },
  { method: 'POST', path: '/stories/highlight', handler: (req, res) => storiesController.createHighlight(req, res), requiresAuth: true },
  { method: 'GET', path: '/stories/highlights/:userId', handler: (req, res) => storiesController.getHighlights(req, res), requiresAuth: false },
];
