// ============================================================================
// QuantMail API - Repos Controller
// Business logic for repository management endpoints
// ============================================================================

import type { Request, Response } from '../middleware';
import { GitService } from '../services/git-service';
import type { RepoVisibility, PRStatus, IssueStatus, ReviewStatus, GitUser } from '../../src/types';

export class ReposController {
  private gitService: GitService;

  constructor(gitService: GitService) {
    this.gitService = gitService;
  }

  private getUserFromReq(req: Request): GitUser {
    return {
      name: req.user?.username || 'unknown',
      email: req.user?.email || 'unknown@quantmail.app',
      username: req.user?.username,
    };
  }

  async listRepos(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const result = await this.gitService.listRepositories(userId, {
      visibility: req.query['visibility'] as RepoVisibility | undefined,
      sort: req.query['sort'] as 'name' | 'created' | 'updated' | 'stars' | undefined,
      page: Number(req.query['page']) || 1,
      pageSize: Math.min(Number(req.query['page_size']) || 20, 100),
    });

    res.status(200).json({ success: true, data: result.repos, metadata: { total: result.total } });
  }

  async getRepo(req: Request, res: Response): Promise<void> {
    const repoId = req.params['id'];
    const repo = await this.gitService.getRepository(repoId);
    if (!repo) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Repository not found', statusCode: 404 } });
      return;
    }
    res.status(200).json({ success: true, data: repo });
  }

  async createRepo(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { name, description, visibility, defaultBranch, isTemplate, license, topics, initReadme } = req.body as {
      name: string; description: string; visibility: RepoVisibility; defaultBranch?: string;
      isTemplate?: boolean; license?: string; topics?: string[]; initReadme?: boolean;
    };

    if (!name) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Repository name is required', statusCode: 400 } });
      return;
    }

    try {
      const repo = await this.gitService.createRepository(userId, {
        name, description: description || '', visibility: visibility || 'private',
        defaultBranch, isTemplate, license, topics, initReadme: initReadme !== false,
      });
      res.status(201).json({ success: true, data: repo });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: (err as Error).message, statusCode: 400 } });
    }
  }

  async deleteRepo(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const repoId = req.params['id'];
    const success = await this.gitService.deleteRepository(repoId, userId);
    if (!success) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Repository not found or access denied', statusCode: 404 } });
      return;
    }
    res.status(200).json({ success: true, data: { message: 'Repository deleted' } });
  }

  async forkRepo(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const repoId = req.params['id'];
    const fork = await this.gitService.forkRepository(repoId, userId);
    if (!fork) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Repository not found', statusCode: 404 } });
      return;
    }
    res.status(201).json({ success: true, data: fork });
  }

  // Branches
  async listBranches(req: Request, res: Response): Promise<void> {
    const repoId = req.params['id'];
    const branches = await this.gitService.getBranches(repoId);
    res.status(200).json({ success: true, data: branches });
  }

  async createBranch(req: Request, res: Response): Promise<void> {
    const repoId = req.params['id'];
    const { name, source } = req.body as { name: string; source: string };

    if (!name || !source) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Branch name and source are required', statusCode: 400 } });
      return;
    }

    try {
      const branch = await this.gitService.createBranch(repoId, name, source);
      if (!branch) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Repository or source branch not found', statusCode: 404 } });
        return;
      }
      res.status(201).json({ success: true, data: branch });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: (err as Error).message, statusCode: 400 } });
    }
  }

  async deleteBranch(req: Request, res: Response): Promise<void> {
    const repoId = req.params['id'];
    const branchName = req.params['branch'];

    try {
      const success = await this.gitService.deleteBranch(repoId, branchName);
      if (!success) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Branch not found', statusCode: 404 } });
        return;
      }
      res.status(200).json({ success: true, data: { message: `Branch "${branchName}" deleted` } });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'DELETE_FAILED', message: (err as Error).message, statusCode: 400 } });
    }
  }

  // Commits
  async listCommits(req: Request, res: Response): Promise<void> {
    const repoId = req.params['id'];
    const branch = req.query['branch'] as string | undefined;
    const result = await this.gitService.getCommits(repoId, branch, {
      page: Number(req.query['page']) || 1,
      pageSize: Math.min(Number(req.query['page_size']) || 30, 100),
    });
    res.status(200).json({ success: true, data: result.commits, metadata: { total: result.total } });
  }

  async createCommit(req: Request, res: Response): Promise<void> {
    const repoId = req.params['id'];
    const { branch, message, files } = req.body as { branch: string; message: string; files: any[] };

    if (!branch || !message || !files) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Branch, message, and files are required', statusCode: 400 } });
      return;
    }

    const commit = await this.gitService.createCommit(repoId, branch, message, files, this.getUserFromReq(req));
    if (!commit) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Repository or branch not found', statusCode: 404 } });
      return;
    }
    res.status(201).json({ success: true, data: commit });
  }

  // Pull Requests
  async listPullRequests(req: Request, res: Response): Promise<void> {
    const repoId = req.params['id'];
    const status = req.query['status'] as PRStatus | undefined;
    const prs = await this.gitService.listPullRequests(repoId, status);
    res.status(200).json({ success: true, data: prs });
  }

  async getPullRequest(req: Request, res: Response): Promise<void> {
    const prId = req.params['prId'];
    const pr = await this.gitService.getPullRequest(prId);
    if (!pr) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Pull request not found', statusCode: 404 } });
      return;
    }
    res.status(200).json({ success: true, data: pr });
  }

  async createPullRequest(req: Request, res: Response): Promise<void> {
    const repoId = req.params['id'];
    const { title, body, sourceBranch, targetBranch, isDraft, reviewers, labels } = req.body as {
      title: string; body: string; sourceBranch: string; targetBranch: string;
      isDraft?: boolean; reviewers?: GitUser[]; labels?: string[];
    };

    if (!title || !sourceBranch || !targetBranch) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title, sourceBranch, and targetBranch are required', statusCode: 400 } });
      return;
    }

    try {
      const pr = await this.gitService.createPullRequest(repoId, {
        title, body: body || '', sourceBranch, targetBranch,
        author: this.getUserFromReq(req), isDraft, reviewers, labels,
      });
      res.status(201).json({ success: true, data: pr });
    } catch (err) {
      res.status(400).json({ success: false, error: { code: 'CREATE_FAILED', message: (err as Error).message, statusCode: 400 } });
    }
  }

  async mergePullRequest(req: Request, res: Response): Promise<void> {
    const prId = req.params['prId'];
    const { strategy } = req.body as { strategy?: 'merge' | 'squash' | 'rebase' };
    const result = await this.gitService.mergePullRequest(prId, this.getUserFromReq(req), strategy);
    if (!result.success) {
      res.status(400).json({ success: false, error: { code: 'MERGE_FAILED', message: result.error!, statusCode: 400 } });
      return;
    }
    res.status(200).json({ success: true, data: { message: 'Pull request merged' } });
  }

  async closePullRequest(req: Request, res: Response): Promise<void> {
    const prId = req.params['prId'];
    const success = await this.gitService.closePullRequest(prId);
    if (!success) {
      res.status(400).json({ success: false, error: { code: 'CLOSE_FAILED', message: 'Cannot close pull request', statusCode: 400 } });
      return;
    }
    res.status(200).json({ success: true, data: { message: 'Pull request closed' } });
  }

  // Issues
  async listIssues(req: Request, res: Response): Promise<void> {
    const repoId = req.params['id'];
    const status = req.query['status'] as IssueStatus | undefined;
    const issues = await this.gitService.listIssues(repoId, status);
    res.status(200).json({ success: true, data: issues });
  }

  async createIssue(req: Request, res: Response): Promise<void> {
    const repoId = req.params['id'];
    const { title, body, assignees, labels, milestone } = req.body as {
      title: string; body: string; assignees?: GitUser[]; labels?: string[]; milestone?: string;
    };

    if (!title) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Title is required', statusCode: 400 } });
      return;
    }

    const issue = await this.gitService.createIssue(repoId, {
      title, body: body || '', author: this.getUserFromReq(req), assignees, labels, milestone,
    });
    res.status(201).json({ success: true, data: issue });
  }

  async closeIssue(req: Request, res: Response): Promise<void> {
    const issueId = req.params['issueId'];
    const success = await this.gitService.closeIssue(issueId, this.getUserFromReq(req));
    if (!success) {
      res.status(400).json({ success: false, error: { code: 'CLOSE_FAILED', message: 'Cannot close issue', statusCode: 400 } });
      return;
    }
    res.status(200).json({ success: true, data: { message: 'Issue closed' } });
  }

  // Code Review
  async createReview(req: Request, res: Response): Promise<void> {
    const prId = req.params['prId'];
    const { status, body, comments } = req.body as { status: ReviewStatus; body: string; comments?: any[] };

    if (!status || !body) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Status and body are required', statusCode: 400 } });
      return;
    }

    const review = await this.gitService.createReview(prId, this.getUserFromReq(req), status, body, comments);
    res.status(201).json({ success: true, data: review });
  }

  async getReviews(req: Request, res: Response): Promise<void> {
    const prId = req.params['prId'];
    const reviews = await this.gitService.getReviews(prId);
    res.status(200).json({ success: true, data: reviews });
  }

  // File tree
  async getFileTree(req: Request, res: Response): Promise<void> {
    const repoId = req.params['id'];
    const files = await this.gitService.getFileTree(repoId);
    res.status(200).json({ success: true, data: files });
  }

  async getFileContent(req: Request, res: Response): Promise<void> {
    const repoId = req.params['id'];
    const path = req.query['path'] as string;
    if (!path) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File path is required', statusCode: 400 } });
      return;
    }

    const content = await this.gitService.getFileContent(repoId, path);
    if (content === null) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File not found', statusCode: 404 } });
      return;
    }
    res.status(200).json({ success: true, data: { path, content } });
  }
}
