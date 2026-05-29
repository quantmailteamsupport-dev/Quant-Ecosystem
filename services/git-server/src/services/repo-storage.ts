import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, rm, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const execFileAsync = promisify(execFile);

const INVALID_PATH_PATTERN = /[/\\]|\.\.|[\x00]/;

export class RepoStorageService {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  getRepoPath(owner: string, name: string): string {
    if (INVALID_PATH_PATTERN.test(owner)) {
      throw new Error(`Invalid owner: "${owner}"`);
    }
    if (INVALID_PATH_PATTERN.test(name)) {
      throw new Error(`Invalid repository name: "${name}"`);
    }

    const repoPath = resolve(join(this.basePath, owner, `${name}.git`));
    const resolvedBase = resolve(this.basePath);

    if (!repoPath.startsWith(resolvedBase + '/') && repoPath !== resolvedBase) {
      throw new Error('Path traversal detected');
    }

    return repoPath;
  }

  async initBareRepo(owner: string, name: string): Promise<string> {
    const repoPath = this.getRepoPath(owner, name);
    await mkdir(repoPath, { recursive: true });
    await execFileAsync('git', ['init', '--bare', repoPath]);
    return repoPath;
  }

  async deleteRepo(owner: string, name: string): Promise<void> {
    const repoPath = this.getRepoPath(owner, name);
    await rm(repoPath, { recursive: true, force: true });
  }

  async repoExists(owner: string, name: string): Promise<boolean> {
    const repoPath = this.getRepoPath(owner, name);
    try {
      await access(repoPath);
      return true;
    } catch {
      return false;
    }
  }
}
