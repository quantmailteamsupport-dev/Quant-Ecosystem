// ============================================================================
// QuantMail API - CI/CD Controller
// Business logic for CI/CD pipeline management
// ============================================================================

import type { Request, Response } from '../middleware';
import type {
  Workflow,
  Build,
  Deployment,
  Artifact,
  WorkflowStatus,
  WorkflowJob,
  WorkflowStep,
  WorkflowTrigger,
  DeploymentEnv,
  GitUser,
} from '../../src/types';

// In-memory stores
const workflows = new Map<string, Workflow>();
const builds = new Map<string, Build>();
const deployments = new Map<string, Deployment>();
const artifacts = new Map<string, Artifact>();

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

export class CICDController {
  // --------------------------------------------------------------------------
  // Workflows
  // --------------------------------------------------------------------------

  async listWorkflows(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const repoId = req.params['repoId'] || req.query['repo_id'] as string;
    const results: Workflow[] = [];

    for (const wf of workflows.values()) {
      if (!repoId || wf.repoId === repoId) {
        results.push(wf);
      }
    }

    res.status(200).json({ success: true, data: results });
  }

  async getWorkflow(req: Request, res: Response): Promise<void> {
    const workflowId = req.params['id'];
    const workflow = workflows.get(workflowId);
    if (!workflow) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found', statusCode: 404 } });
      return;
    }
    res.status(200).json({ success: true, data: workflow });
  }

  async createWorkflow(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { repoId, name, filename, trigger, jobs } = req.body as {
      repoId: string; name: string; filename: string;
      trigger: WorkflowTrigger; jobs?: WorkflowJob[];
    };

    if (!repoId || !name || !filename) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'repoId, name, and filename are required', statusCode: 400 } });
      return;
    }

    const workflow: Workflow = {
      id: generateId('wf'),
      repoId,
      name,
      filename,
      isEnabled: true,
      trigger: trigger || { events: ['push'], branches: ['main'] },
      jobs: jobs || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    workflows.set(workflow.id, workflow);
    res.status(201).json({ success: true, data: workflow });
  }

  async updateWorkflow(req: Request, res: Response): Promise<void> {
    const workflowId = req.params['id'];
    const workflow = workflows.get(workflowId);
    if (!workflow) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found', statusCode: 404 } });
      return;
    }

    const updates = req.body as Partial<Workflow>;
    if (updates.name) workflow.name = updates.name;
    if (updates.isEnabled !== undefined) workflow.isEnabled = updates.isEnabled;
    if (updates.trigger) workflow.trigger = updates.trigger;
    if (updates.jobs) workflow.jobs = updates.jobs;
    workflow.updatedAt = new Date();

    res.status(200).json({ success: true, data: workflow });
  }

  async deleteWorkflow(req: Request, res: Response): Promise<void> {
    const workflowId = req.params['id'];
    if (!workflows.has(workflowId)) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found', statusCode: 404 } });
      return;
    }
    workflows.delete(workflowId);
    res.status(200).json({ success: true, data: { message: 'Workflow deleted' } });
  }

  async triggerWorkflow(req: Request, res: Response): Promise<void> {
    const workflowId = req.params['id'];
    const workflow = workflows.get(workflowId);
    if (!workflow) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Workflow not found', statusCode: 404 } });
      return;
    }

    if (!workflow.isEnabled) {
      res.status(400).json({ success: false, error: { code: 'WORKFLOW_DISABLED', message: 'Workflow is disabled', statusCode: 400 } });
      return;
    }

    const { branch, commit } = req.body as { branch?: string; commit?: string };

    // Create a build from this workflow run
    const build = this.createBuildFromWorkflow(workflow, {
      branch: branch || 'main',
      commit: commit || generateId('sha'),
      author: { name: req.user?.username || 'user', email: req.user?.email || 'user@quantmail.app' },
    });

    workflow.lastRunAt = new Date();
    workflow.lastRunStatus = 'running';
    workflow.updatedAt = new Date();

    res.status(200).json({ success: true, data: { buildId: build.id, message: 'Workflow triggered' } });
  }

  // --------------------------------------------------------------------------
  // Builds
  // --------------------------------------------------------------------------

  async listBuilds(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const repoId = req.query['repo_id'] as string;
    const status = req.query['status'] as WorkflowStatus | undefined;
    let results: Build[] = [];

    for (const build of builds.values()) {
      if (repoId && build.repoId !== repoId) continue;
      if (status && build.status !== status) continue;
      results.push(build);
    }

    results.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    const page = Number(req.query['page']) || 1;
    const pageSize = Math.min(Number(req.query['page_size']) || 20, 100);
    const total = results.length;
    results = results.slice((page - 1) * pageSize, page * pageSize);

    res.status(200).json({ success: true, data: results, metadata: { total, page, pageSize } });
  }

  async getBuild(req: Request, res: Response): Promise<void> {
    const buildId = req.params['id'];
    const build = builds.get(buildId);
    if (!build) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Build not found', statusCode: 404 } });
      return;
    }
    res.status(200).json({ success: true, data: build });
  }

  async cancelBuild(req: Request, res: Response): Promise<void> {
    const buildId = req.params['id'];
    const build = builds.get(buildId);
    if (!build) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Build not found', statusCode: 404 } });
      return;
    }

    if (build.status !== 'running' && build.status !== 'pending') {
      res.status(400).json({ success: false, error: { code: 'INVALID_STATE', message: 'Can only cancel pending or running builds', statusCode: 400 } });
      return;
    }

    build.status = 'cancelled';
    build.completedAt = new Date();
    build.duration = build.completedAt.getTime() - build.startedAt.getTime();

    res.status(200).json({ success: true, data: { message: 'Build cancelled' } });
  }

  async retryBuild(req: Request, res: Response): Promise<void> {
    const buildId = req.params['id'];
    const build = builds.get(buildId);
    if (!build) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Build not found', statusCode: 404 } });
      return;
    }

    // Create a new build based on the old one
    const newBuild: Build = {
      ...build,
      id: generateId('build'),
      number: builds.size + 1,
      status: 'pending',
      startedAt: new Date(),
      completedAt: undefined,
      duration: undefined,
      jobs: build.jobs.map((j) => ({ ...j, status: 'pending' as WorkflowStatus, startedAt: undefined, completedAt: undefined })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    builds.set(newBuild.id, newBuild);
    res.status(200).json({ success: true, data: newBuild });
  }

  async getBuildLogs(req: Request, res: Response): Promise<void> {
    const buildId = req.params['id'];
    const build = builds.get(buildId);
    if (!build) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Build not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: { buildId, logs: build.logs || 'No logs available' } });
  }

  // --------------------------------------------------------------------------
  // Deployments
  // --------------------------------------------------------------------------

  async listDeployments(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const repoId = req.query['repo_id'] as string;
    const environment = req.query['environment'] as DeploymentEnv | undefined;
    let results: Deployment[] = [];

    for (const deployment of deployments.values()) {
      if (repoId && deployment.repoId !== repoId) continue;
      if (environment && deployment.environment !== environment) continue;
      results.push(deployment);
    }

    results.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    res.status(200).json({ success: true, data: results });
  }

  async createDeployment(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { buildId, repoId, environment, version } = req.body as {
      buildId: string; repoId: string; environment: DeploymentEnv; version: string;
    };

    if (!buildId || !repoId || !environment || !version) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'buildId, repoId, environment, and version are required', statusCode: 400 } });
      return;
    }

    // Verify build exists and succeeded
    const build = builds.get(buildId);
    if (!build) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Build not found', statusCode: 404 } });
      return;
    }

    if (build.status !== 'success') {
      res.status(400).json({ success: false, error: { code: 'INVALID_BUILD', message: 'Can only deploy successful builds', statusCode: 400 } });
      return;
    }

    const deployment: Deployment = {
      id: generateId('deploy'),
      buildId,
      repoId,
      environment,
      status: 'running',
      version,
      deployer: { name: req.user?.username || 'user', email: req.user?.email || 'user@quantmail.app' },
      startedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    deployments.set(deployment.id, deployment);

    // Simulate deployment completion
    setTimeout(() => {
      deployment.status = 'success';
      deployment.completedAt = new Date();
      deployment.url = `https://${environment === 'production' ? '' : environment + '.'}${repoId}.quant.app`;
      deployment.healthCheck = { status: 'healthy', checkedAt: new Date() };
    }, 100);

    res.status(201).json({ success: true, data: deployment });
  }

  async rollbackDeployment(req: Request, res: Response): Promise<void> {
    const deploymentId = req.params['id'];
    const deployment = deployments.get(deploymentId);
    if (!deployment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Deployment not found', statusCode: 404 } });
      return;
    }

    const { targetVersion } = req.body as { targetVersion: string };
    if (!targetVersion) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Target version is required for rollback', statusCode: 400 } });
      return;
    }

    // Create a rollback deployment
    const rollback: Deployment = {
      id: generateId('deploy'),
      buildId: deployment.buildId,
      repoId: deployment.repoId,
      environment: deployment.environment,
      status: 'success',
      version: targetVersion,
      deployer: { name: req.user?.username || 'user', email: req.user?.email || 'user@quantmail.app' },
      startedAt: new Date(),
      completedAt: new Date(),
      rollbackVersion: deployment.version,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    deployments.set(rollback.id, rollback);
    res.status(200).json({ success: true, data: rollback });
  }

  // --------------------------------------------------------------------------
  // Artifacts
  // --------------------------------------------------------------------------

  async listArtifacts(req: Request, res: Response): Promise<void> {
    const buildId = req.params['buildId'] || req.query['build_id'] as string;
    const results: Artifact[] = [];

    for (const artifact of artifacts.values()) {
      if (!buildId || artifact.buildId === buildId) {
        results.push(artifact);
      }
    }

    res.status(200).json({ success: true, data: results });
  }

  async getArtifact(req: Request, res: Response): Promise<void> {
    const artifactId = req.params['id'];
    const artifact = artifacts.get(artifactId);
    if (!artifact) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Artifact not found', statusCode: 404 } });
      return;
    }
    res.status(200).json({ success: true, data: artifact });
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private createBuildFromWorkflow(workflow: Workflow, context: { branch: string; commit: string; author: GitUser }): Build {
    const buildJobs: WorkflowJob[] = workflow.jobs.length > 0
      ? workflow.jobs.map((j) => ({ ...j, status: 'pending' as WorkflowStatus }))
      : [{
          id: generateId('job'),
          name: 'build',
          status: 'pending' as WorkflowStatus,
          steps: [
            { name: 'Checkout', status: 'pending' as WorkflowStatus },
            { name: 'Install dependencies', status: 'pending' as WorkflowStatus },
            { name: 'Build', status: 'pending' as WorkflowStatus },
            { name: 'Test', status: 'pending' as WorkflowStatus },
          ],
          runner: 'ubuntu-latest',
        }];

    const build: Build = {
      id: generateId('build'),
      workflowId: workflow.id,
      repoId: workflow.repoId,
      number: builds.size + 1,
      status: 'pending',
      branch: context.branch,
      commit: context.commit,
      commitMessage: 'Triggered manually',
      author: context.author,
      trigger: 'manual',
      startedAt: new Date(),
      jobs: buildJobs,
      artifacts: [],
      logs: `[${new Date().toISOString()}] Build started\n[${new Date().toISOString()}] Running workflow: ${workflow.name}\n`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    builds.set(build.id, build);
    return build;
  }
}
