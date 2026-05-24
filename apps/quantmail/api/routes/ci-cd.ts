// ============================================================================
// QuantMail API - CI/CD Routes
// CI/CD pipeline: workflows, builds, deployments, logs, artifacts
// ============================================================================

import { CICDController } from '../controllers/ci-cd-controller';
import type { RouteDefinition } from './auth';

// Initialize
const cicdController = new CICDController();

export const cicdRoutes: RouteDefinition[] = [
  // Workflows
  {
    method: 'GET',
    path: '/ci/workflows',
    handler: (req, res) => cicdController.listWorkflows(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/ci/workflows/:id',
    handler: (req, res) => cicdController.getWorkflow(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ci/workflows',
    handler: (req, res) => cicdController.createWorkflow(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/ci/workflows/:id',
    handler: (req, res) => cicdController.updateWorkflow(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/ci/workflows/:id',
    handler: (req, res) => cicdController.deleteWorkflow(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ci/workflows/:id/trigger',
    handler: (req, res) => cicdController.triggerWorkflow(req, res),
    requiresAuth: true,
  },

  // Builds
  {
    method: 'GET',
    path: '/ci/builds',
    handler: (req, res) => cicdController.listBuilds(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/ci/builds/:id',
    handler: (req, res) => cicdController.getBuild(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ci/builds/:id/cancel',
    handler: (req, res) => cicdController.cancelBuild(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ci/builds/:id/retry',
    handler: (req, res) => cicdController.retryBuild(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/ci/builds/:id/logs',
    handler: (req, res) => cicdController.getBuildLogs(req, res),
    requiresAuth: true,
  },

  // Deployments
  {
    method: 'GET',
    path: '/ci/deployments',
    handler: (req, res) => cicdController.listDeployments(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ci/deployments',
    handler: (req, res) => cicdController.createDeployment(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ci/deployments/:id/rollback',
    handler: (req, res) => cicdController.rollbackDeployment(req, res),
    requiresAuth: true,
  },

  // Artifacts
  {
    method: 'GET',
    path: '/ci/builds/:buildId/artifacts',
    handler: (req, res) => cicdController.listArtifacts(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/ci/artifacts/:id',
    handler: (req, res) => cicdController.getArtifact(req, res),
    requiresAuth: true,
  },
];

export { cicdController };
