// ============================================================================
// QuantMail API - Git Service
// Git operations, diff engine, merge conflict resolution
// ============================================================================

import type {
  Repository,
  Branch,
  Commit,
  CommitFile,
  PullRequest,
  Issue,
  CodeReview,
  ReviewComment,
  GitUser,
  RepoVisibility,
  PRStatus,
  IssueStatus,
  ReviewStatus,
} from '../../src/types';

// ----------------------------------------------------------------------------
// Git Service
// ----------------------------------------------------------------------------

export class GitService {
  private repos: Map<string, Repository> = new Map();
  private branches: Map<string, Branch[]> = new Map();
  private commits: Map<string, Commit[]> = new Map();
  private pullRequests: Map<string, PullRequest> = new Map();
  private issues: Map<string, Issue> = new Map();
  private reviews: Map<string, CodeReview> = new Map();
  private files: Map<string, Map<string, string>> = new Map(); // repoId -> (path -> content)

  // --------------------------------------------------------------------------
  // Repository Management
  // --------------------------------------------------------------------------

  async createRepository(userId: string, options: {
    name: string;
    description: string;
    visibility: RepoVisibility;
    defaultBranch?: string;
    isTemplate?: boolean;
    license?: string;
    topics?: string[];
    initReadme?: boolean;
  }): Promise<Repository> {
    // Validate name
    if (!/^[a-zA-Z0-9_.-]+$/.test(options.name)) {
      throw new Error('Invalid repository name. Use alphanumeric characters, hyphens, underscores, and dots.');
    }

    // Check for duplicate name
    for (const repo of this.repos.values()) {
      if (repo.ownerId === userId && repo.name === options.name) {
        throw new Error(`Repository "${options.name}" already exists`);
      }
    }

    const repoId = this.generateId('repo');
    const repo: Repository = {
      id: repoId,
      ownerId: userId,
      name: options.name,
      fullName: `${userId}/${options.name}`,
      description: options.description,
      visibility: options.visibility,
      defaultBranch: options.defaultBranch || 'main',
      language: '',
      languages: {},
      stars: 0,
      forks: 0,
      openIssues: 0,
      size: 0,
      isTemplate: options.isTemplate || false,
      isFork: false,
      topics: options.topics || [],
      license: options.license,
      cloneUrl: `https://git.quant.app/${userId}/${options.name}.git`,
      sshUrl: `git@git.quant.app:${userId}/${options.name}.git`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.repos.set(repoId, repo);

    // Initialize default branch
    const initialCommit: Commit = {
      sha: this.generateSha(),
      message: 'Initial commit',
      author: { name: userId, email: `${userId}@quantmail.app` },
      committer: { name: userId, email: `${userId}@quantmail.app` },
      timestamp: new Date(),
      parents: [],
      stats: { additions: options.initReadme ? 3 : 0, deletions: 0, total: options.initReadme ? 3 : 0 },
      files: options.initReadme ? [{ filename: 'README.md', status: 'added', additions: 3, deletions: 0 }] : [],
    };

    this.commits.set(repoId, [initialCommit]);
    this.branches.set(repoId, [{
      name: options.defaultBranch || 'main',
      sha: initialCommit.sha,
      isProtected: true,
      protection: 'none',
      aheadBy: 0,
      behindBy: 0,
      lastCommit: initialCommit,
    }]);

    // Initialize file store
    const fileStore = new Map<string, string>();
    if (options.initReadme) {
      fileStore.set('README.md', `# ${options.name}\n\n${options.description}\n`);
    }
    this.files.set(repoId, fileStore);

    return repo;
  }

  async getRepository(repoId: string): Promise<Repository | null> {
    return this.repos.get(repoId) || null;
  }

  async listRepositories(userId: string, options: {
    visibility?: RepoVisibility;
    sort?: 'name' | 'created' | 'updated' | 'stars';
    page?: number;
    pageSize?: number;
  } = {}): Promise<{ repos: Repository[]; total: number }> {
    let results: Repository[] = [];

    for (const repo of this.repos.values()) {
      if (repo.ownerId === userId) {
        if (options.visibility && repo.visibility !== options.visibility) continue;
        results.push(repo);
      }
    }

    // Sort
    switch (options.sort) {
      case 'name': results.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'stars': results.sort((a, b) => b.stars - a.stars); break;
      case 'updated': results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); break;
      default: results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); break;
    }

    const total = results.length;
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    results = results.slice((page - 1) * pageSize, page * pageSize);

    return { repos: results, total };
  }

  async deleteRepository(repoId: string, userId: string): Promise<boolean> {
    const repo = this.repos.get(repoId);
    if (!repo || repo.ownerId !== userId) return false;
    this.repos.delete(repoId);
    this.branches.delete(repoId);
    this.commits.delete(repoId);
    this.files.delete(repoId);
    return true;
  }

  async forkRepository(repoId: string, userId: string): Promise<Repository | null> {
    const original = this.repos.get(repoId);
    if (!original) return null;

    const fork = await this.createRepository(userId, {
      name: original.name,
      description: `Fork of ${original.fullName}`,
      visibility: original.visibility,
      defaultBranch: original.defaultBranch,
    });

    fork.isFork = true;
    fork.forkedFrom = repoId;
    original.forks++;

    // Copy files
    const originalFiles = this.files.get(repoId);
    if (originalFiles) {
      this.files.set(fork.id, new Map(originalFiles));
    }

    return fork;
  }

  // --------------------------------------------------------------------------
  // Branch Management
  // --------------------------------------------------------------------------

  async getBranches(repoId: string): Promise<Branch[]> {
    return this.branches.get(repoId) || [];
  }

  async createBranch(repoId: string, name: string, sourceBranch: string): Promise<Branch | null> {
    const repoBranches = this.branches.get(repoId);
    if (!repoBranches) return null;

    const source = repoBranches.find((b) => b.name === sourceBranch);
    if (!source) return null;

    // Check if branch already exists
    if (repoBranches.some((b) => b.name === name)) {
      throw new Error(`Branch "${name}" already exists`);
    }

    const branch: Branch = {
      name,
      sha: source.sha,
      isProtected: false,
      protection: 'none',
      aheadBy: 0,
      behindBy: 0,
      lastCommit: source.lastCommit,
    };

    repoBranches.push(branch);
    return branch;
  }

  async deleteBranch(repoId: string, branchName: string): Promise<boolean> {
    const repoBranches = this.branches.get(repoId);
    if (!repoBranches) return false;

    const repo = this.repos.get(repoId);
    if (repo && repo.defaultBranch === branchName) {
      throw new Error('Cannot delete the default branch');
    }

    const idx = repoBranches.findIndex((b) => b.name === branchName);
    if (idx === -1) return false;
    if (repoBranches[idx].isProtected) {
      throw new Error('Cannot delete a protected branch');
    }

    repoBranches.splice(idx, 1);
    return true;
  }

  // --------------------------------------------------------------------------
  // Commits
  // --------------------------------------------------------------------------

  async getCommits(repoId: string, branch?: string, options: { page?: number; pageSize?: number } = {}): Promise<{ commits: Commit[]; total: number }> {
    const repoCommits = this.commits.get(repoId) || [];
    const page = options.page || 1;
    const pageSize = options.pageSize || 30;
    const total = repoCommits.length;
    const paged = repoCommits.slice((page - 1) * pageSize, page * pageSize);
    return { commits: paged, total };
  }

  async createCommit(repoId: string, branch: string, message: string, files: CommitFile[], author: GitUser): Promise<Commit | null> {
    const repoBranches = this.branches.get(repoId);
    const repoCommits = this.commits.get(repoId);
    if (!repoBranches || !repoCommits) return null;

    const branchRef = repoBranches.find((b) => b.name === branch);
    if (!branchRef) return null;

    const commit: Commit = {
      sha: this.generateSha(),
      message,
      author,
      committer: author,
      timestamp: new Date(),
      parents: [branchRef.sha],
      stats: {
        additions: files.reduce((sum, f) => sum + f.additions, 0),
        deletions: files.reduce((sum, f) => sum + f.deletions, 0),
        total: files.reduce((sum, f) => sum + f.additions + f.deletions, 0),
      },
      files,
    };

    repoCommits.unshift(commit);
    branchRef.sha = commit.sha;
    branchRef.lastCommit = commit;

    // Update file store
    const fileStore = this.files.get(repoId) || new Map();
    for (const file of files) {
      if (file.status === 'deleted') {
        fileStore.delete(file.filename);
      } else {
        fileStore.set(file.filename, file.patch || '');
      }
    }
    this.files.set(repoId, fileStore);

    return commit;
  }

  // --------------------------------------------------------------------------
  // Pull Requests
  // --------------------------------------------------------------------------

  async createPullRequest(repoId: string, options: {
    title: string;
    body: string;
    sourceBranch: string;
    targetBranch: string;
    author: GitUser;
    isDraft?: boolean;
    reviewers?: GitUser[];
    labels?: string[];
  }): Promise<PullRequest> {
    const prId = this.generateId('pr');
    const number = this.pullRequests.size + 1;

    // Validate branches exist
    const branches = this.branches.get(repoId) || [];
    if (!branches.some((b) => b.name === options.sourceBranch)) {
      throw new Error(`Source branch "${options.sourceBranch}" not found`);
    }
    if (!branches.some((b) => b.name === options.targetBranch)) {
      throw new Error(`Target branch "${options.targetBranch}" not found`);
    }

    const pr: PullRequest = {
      id: prId,
      repoId,
      number,
      title: options.title,
      body: options.body,
      author: options.author,
      status: options.isDraft ? 'draft' : 'open',
      sourceBranch: options.sourceBranch,
      targetBranch: options.targetBranch,
      isDraft: options.isDraft || false,
      isMergeable: true,
      mergeConflicts: false,
      reviewers: (options.reviewers || []).map((user) => ({
        user,
        status: 'pending' as ReviewStatus,
      })),
      labels: options.labels || [],
      commits: 1,
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pullRequests.set(prId, pr);
    return pr;
  }

  async getPullRequest(prId: string): Promise<PullRequest | null> {
    return this.pullRequests.get(prId) || null;
  }

  async listPullRequests(repoId: string, status?: PRStatus): Promise<PullRequest[]> {
    const results: PullRequest[] = [];
    for (const pr of this.pullRequests.values()) {
      if (pr.repoId === repoId) {
        if (status && pr.status !== status) continue;
        results.push(pr);
      }
    }
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async mergePullRequest(prId: string, mergedBy: GitUser, strategy: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<{ success: boolean; error?: string }> {
    const pr = this.pullRequests.get(prId);
    if (!pr) return { success: false, error: 'Pull request not found' };
    if (pr.status !== 'open') return { success: false, error: 'Pull request is not open' };
    if (pr.mergeConflicts) return { success: false, error: 'Cannot merge: conflicts exist' };

    pr.status = 'merged';
    pr.mergedAt = new Date();
    pr.mergedBy = mergedBy;
    pr.updatedAt = new Date();

    return { success: true };
  }

  async closePullRequest(prId: string): Promise<boolean> {
    const pr = this.pullRequests.get(prId);
    if (!pr || pr.status !== 'open') return false;
    pr.status = 'closed';
    pr.closedAt = new Date();
    pr.updatedAt = new Date();
    return true;
  }

  // --------------------------------------------------------------------------
  // Issues
  // --------------------------------------------------------------------------

  async createIssue(repoId: string, options: {
    title: string;
    body: string;
    author: GitUser;
    assignees?: GitUser[];
    labels?: string[];
    milestone?: string;
  }): Promise<Issue> {
    const issueId = this.generateId('issue');
    const number = this.issues.size + 1;

    const issue: Issue = {
      id: issueId,
      repoId,
      number,
      title: options.title,
      body: options.body,
      author: options.author,
      status: 'open',
      assignees: options.assignees || [],
      labels: options.labels || [],
      milestone: options.milestone,
      comments: 0,
      reactions: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.issues.set(issueId, issue);
    const repo = this.repos.get(repoId);
    if (repo) repo.openIssues++;

    return issue;
  }

  async getIssue(issueId: string): Promise<Issue | null> {
    return this.issues.get(issueId) || null;
  }

  async listIssues(repoId: string, status?: IssueStatus): Promise<Issue[]> {
    const results: Issue[] = [];
    for (const issue of this.issues.values()) {
      if (issue.repoId === repoId) {
        if (status && issue.status !== status) continue;
        results.push(issue);
      }
    }
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async closeIssue(issueId: string, closedBy: GitUser): Promise<boolean> {
    const issue = this.issues.get(issueId);
    if (!issue || issue.status === 'closed') return false;
    issue.status = 'closed';
    issue.closedAt = new Date();
    issue.closedBy = closedBy;
    issue.updatedAt = new Date();
    const repo = this.repos.get(issue.repoId);
    if (repo && repo.openIssues > 0) repo.openIssues--;
    return true;
  }

  // --------------------------------------------------------------------------
  // Code Review
  // --------------------------------------------------------------------------

  async createReview(prId: string, reviewer: GitUser, status: ReviewStatus, body: string, comments: ReviewComment[] = []): Promise<CodeReview> {
    const reviewId = this.generateId('review');
    const review: CodeReview = {
      id: reviewId,
      pullRequestId: prId,
      reviewer,
      status,
      body,
      comments,
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reviews.set(reviewId, review);

    // Update PR reviewer status
    const pr = this.pullRequests.get(prId);
    if (pr) {
      const reviewerEntry = pr.reviewers.find((r) => r.user.email === reviewer.email);
      if (reviewerEntry) {
        reviewerEntry.status = status;
        reviewerEntry.reviewedAt = new Date();
      }
    }

    return review;
  }

  async getReviews(prId: string): Promise<CodeReview[]> {
    const results: CodeReview[] = [];
    for (const review of this.reviews.values()) {
      if (review.pullRequestId === prId) results.push(review);
    }
    return results.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  }

  // --------------------------------------------------------------------------
  // File Operations
  // --------------------------------------------------------------------------

  async getFileTree(repoId: string): Promise<string[]> {
    const fileStore = this.files.get(repoId);
    if (!fileStore) return [];
    return Array.from(fileStore.keys()).sort();
  }

  async getFileContent(repoId: string, path: string): Promise<string | null> {
    const fileStore = this.files.get(repoId);
    if (!fileStore) return null;
    return fileStore.get(path) || null;
  }

  // --------------------------------------------------------------------------
  // Diff Engine
  // --------------------------------------------------------------------------

  generateDiff(oldContent: string, newContent: string): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const diff: string[] = [];

    diff.push(`@@ -1,${oldLines.length} +1,${newLines.length} @@`);

    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= oldLines.length) {
        diff.push(`+${newLines[i]}`);
      } else if (i >= newLines.length) {
        diff.push(`-${oldLines[i]}`);
      } else if (oldLines[i] !== newLines[i]) {
        diff.push(`-${oldLines[i]}`);
        diff.push(`+${newLines[i]}`);
      } else {
        diff.push(` ${oldLines[i]}`);
      }
    }

    return diff.join('\n');
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateSha(): string {
    const chars = '0123456789abcdef';
    let sha = '';
    for (let i = 0; i < 40; i++) {
      sha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return sha;
  }
}
