// ============================================================================
// QuantMail API - Repos Routes
// Git repository management: create, clone, branches, commits, PRs, issues, code review
// ============================================================================

import { ReposController } from '../controllers/repos-controller';
import { GitService } from '../services/git-service';
import type { RouteDefinition } from './auth';

// Initialize
const gitService = new GitService();
const reposController = new ReposController(gitService);

export const repoRoutes: RouteDefinition[] = [
  // Repository CRUD
  {
    method: 'GET',
    path: '/repos',
    handler: (req, res) => reposController.listRepos(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/repos/:id',
    handler: (req, res) => reposController.getRepo(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/repos',
    handler: (req, res) => reposController.createRepo(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/repos/:id',
    handler: (req, res) => reposController.deleteRepo(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/repos/:id/fork',
    handler: (req, res) => reposController.forkRepo(req, res),
    requiresAuth: true,
  },

  // Branches
  {
    method: 'GET',
    path: '/repos/:id/branches',
    handler: (req, res) => reposController.listBranches(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/repos/:id/branches',
    handler: (req, res) => reposController.createBranch(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/repos/:id/branches/:branch',
    handler: (req, res) => reposController.deleteBranch(req, res),
    requiresAuth: true,
  },

  // Commits
  {
    method: 'GET',
    path: '/repos/:id/commits',
    handler: (req, res) => reposController.listCommits(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/repos/:id/commits',
    handler: (req, res) => reposController.createCommit(req, res),
    requiresAuth: true,
  },

  // Pull Requests
  {
    method: 'GET',
    path: '/repos/:id/pulls',
    handler: (req, res) => reposController.listPullRequests(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/repos/:id/pulls',
    handler: (req, res) => reposController.createPullRequest(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/repos/:id/pulls/:prId',
    handler: (req, res) => reposController.getPullRequest(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/repos/:id/pulls/:prId/merge',
    handler: (req, res) => reposController.mergePullRequest(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/repos/:id/pulls/:prId/close',
    handler: (req, res) => reposController.closePullRequest(req, res),
    requiresAuth: true,
  },

  // Issues
  {
    method: 'GET',
    path: '/repos/:id/issues',
    handler: (req, res) => reposController.listIssues(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/repos/:id/issues',
    handler: (req, res) => reposController.createIssue(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/repos/:id/issues/:issueId/close',
    handler: (req, res) => reposController.closeIssue(req, res),
    requiresAuth: true,
  },

  // Code Review
  {
    method: 'GET',
    path: '/repos/:id/pulls/:prId/reviews',
    handler: (req, res) => reposController.getReviews(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/repos/:id/pulls/:prId/reviews',
    handler: (req, res) => reposController.createReview(req, res),
    requiresAuth: true,
  },

  // File browser
  {
    method: 'GET',
    path: '/repos/:id/tree',
    handler: (req, res) => reposController.getFileTree(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/repos/:id/file',
    handler: (req, res) => reposController.getFileContent(req, res),
    requiresAuth: true,
  },
];

export { gitService, reposController };
