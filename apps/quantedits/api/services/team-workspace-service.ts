// ============================================================================
// QuantEdits - Team Workspace Service
// Team collaboration, permissions, file locking, activity tracking, reviews
// ============================================================================

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  members: WorkspaceMember[];
  projects: SharedProject[];
  activity: ActivityEntry[];
  createdAt: string;
  updatedAt: string;
  plan: 'free' | 'pro' | 'enterprise';
  storageUsed: number;
  storageLimit: number;
}

interface WorkspaceMember {
  userId: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: WorkspacePermission[];
  joinedAt: string;
  lastActive: string;
}

type WorkspacePermission = 'edit' | 'comment' | 'export' | 'invite' | 'delete' | 'manage_members' | 'billing';

interface SharedProject {
  id: string;
  name: string;
  workspaceId: string;
  createdBy: string;
  assignedTo: string[];
  status: 'active' | 'archived' | 'completed';
  lockedBy?: string;
  lockedAt?: string;
  version: number;
  comments: ProjectComment[];
  createdAt: string;
  updatedAt: string;
}

interface ProjectComment {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
  type: 'text' | 'annotation' | 'approval' | 'revision_request';
  resolved: boolean;
  createdAt: string;
}

interface ActivityEntry {
  id: string;
  userId: string;
  action: 'edit' | 'comment' | 'upload' | 'export' | 'share' | 'review' | 'lock' | 'unlock';
  projectId: string;
  details: string;
  timestamp: string;
}

interface ReviewResult {
  id: string;
  projectId: string;
  reviewerId: string;
  status: 'approved' | 'changes_requested' | 'pending';
  comments: ProjectComment[];
  createdAt: string;
}

class TeamWorkspaceService {
  private workspaces: Map<string, Workspace> = new Map();
  private userWorkspaces: Map<string, string[]> = new Map();
  private counter: number = 0;

  private genId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${(++this.counter).toString(36)}`;
  }

  async create(name: string, ownerId: string, plan: Workspace['plan'] = 'free'): Promise<Workspace> {
    if (name.length < 2 || name.length > 50) throw new Error('Name must be 2-50 characters');

    const workspace: Workspace = {
      id: this.genId('ws'),
      name: name.trim(),
      ownerId,
      members: [{
        userId: ownerId, email: `${ownerId}@quant.edits`, role: 'owner',
        permissions: ['edit', 'comment', 'export', 'invite', 'delete', 'manage_members', 'billing'],
        joinedAt: new Date().toISOString(), lastActive: new Date().toISOString(),
      }],
      projects: [],
      activity: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan,
      storageUsed: 0,
      storageLimit: plan === 'enterprise' ? 1000000000000 : plan === 'pro' ? 100000000000 : 5000000000,
    };

    this.workspaces.set(workspace.id, workspace);
    const userWs = this.userWorkspaces.get(ownerId) || [];
    userWs.push(workspace.id);
    this.userWorkspaces.set(ownerId, userWs);
    return workspace;
  }

  async invite(workspaceId: string, email: string, role: WorkspaceMember['role'] = 'editor'): Promise<WorkspaceMember> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    if (workspace.members.find(m => m.email === email)) throw new Error('User already in workspace');

    const maxMembers = workspace.plan === 'enterprise' ? 100 : workspace.plan === 'pro' ? 20 : 5;
    if (workspace.members.length >= maxMembers) throw new Error(`Maximum ${maxMembers} members for ${workspace.plan} plan`);

    const permissions = this.getPermissionsForRole(role);
    const member: WorkspaceMember = {
      userId: this.genId('user'), email, role, permissions,
      joinedAt: new Date().toISOString(), lastActive: new Date().toISOString(),
    };

    workspace.members.push(member);
    workspace.updatedAt = new Date().toISOString();
    return member;
  }

  private getPermissionsForRole(role: WorkspaceMember['role']): WorkspacePermission[] {
    switch (role) {
      case 'owner': return ['edit', 'comment', 'export', 'invite', 'delete', 'manage_members', 'billing'];
      case 'admin': return ['edit', 'comment', 'export', 'invite', 'delete', 'manage_members'];
      case 'editor': return ['edit', 'comment', 'export'];
      case 'viewer': return ['comment'];
    }
  }

  async setPermissions(workspaceId: string, userId: string, permissions: WorkspacePermission[]): Promise<WorkspaceMember> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    const member = workspace.members.find(m => m.userId === userId);
    if (!member) throw new Error('Member not found');
    if (member.role === 'owner') throw new Error('Cannot change owner permissions');
    member.permissions = permissions;
    return member;
  }

  async removeUser(workspaceId: string, userId: string): Promise<boolean> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    if (workspace.ownerId === userId) throw new Error('Cannot remove workspace owner');
    const idx = workspace.members.findIndex(m => m.userId === userId);
    if (idx === -1) throw new Error('Member not found');
    workspace.members.splice(idx, 1);
    return true;
  }

  async getActivity(workspaceId: string, limit: number = 50): Promise<ActivityEntry[]> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    return workspace.activity.slice(-limit).reverse();
  }

  async shareProject(workspaceId: string, projectName: string, creatorId: string, assignedTo: string[] = []): Promise<SharedProject> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');

    const project: SharedProject = {
      id: this.genId('proj'), name: projectName, workspaceId, createdBy: creatorId,
      assignedTo, status: 'active', version: 1, comments: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    workspace.projects.push(project);
    this.logActivity(workspace, creatorId, 'share', project.id, `Shared project "${projectName}"`);
    return project;
  }

  async lockFile(workspaceId: string, projectId: string, userId: string): Promise<SharedProject> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    const project = workspace.projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    if (project.lockedBy && project.lockedBy !== userId) throw new Error(`File locked by another user`);

    project.lockedBy = userId;
    project.lockedAt = new Date().toISOString();
    this.logActivity(workspace, userId, 'lock', projectId, `Locked project "${project.name}"`);
    return project;
  }

  async unlockFile(workspaceId: string, projectId: string, userId: string): Promise<SharedProject> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    const project = workspace.projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    if (project.lockedBy !== userId) throw new Error('Not locked by this user');

    project.lockedBy = undefined;
    project.lockedAt = undefined;
    this.logActivity(workspace, userId, 'unlock', projectId, `Unlocked project "${project.name}"`);
    return project;
  }

  async reviewEdit(workspaceId: string, projectId: string, reviewerId: string, status: ReviewResult['status'], comments: string[] = []): Promise<ReviewResult> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    const project = workspace.projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    const reviewComments: ProjectComment[] = comments.map(c => ({
      id: this.genId('cmt'), userId: reviewerId, content: c,
      timestamp: project.version, type: status === 'approved' ? 'approval' as const : 'revision_request' as const,
      resolved: false, createdAt: new Date().toISOString(),
    }));

    project.comments.push(...reviewComments);
    this.logActivity(workspace, reviewerId, 'review', projectId, `Reviewed: ${status}`);

    return { id: this.genId('rev'), projectId, reviewerId, status, comments: reviewComments, createdAt: new Date().toISOString() };
  }

  async addComment(workspaceId: string, projectId: string, userId: string, content: string, type: ProjectComment['type'] = 'text'): Promise<ProjectComment> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    const project = workspace.projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    const comment: ProjectComment = {
      id: this.genId('cmt'), userId, content, timestamp: project.version,
      type, resolved: false, createdAt: new Date().toISOString(),
    };

    project.comments.push(comment);
    this.logActivity(workspace, userId, 'comment', projectId, `Added comment on "${project.name}"`);
    return comment;
  }

  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    return workspace.members;
  }

  private logActivity(workspace: Workspace, userId: string, action: ActivityEntry['action'], projectId: string, details: string): void {
    workspace.activity.push({ id: this.genId('act'), userId, action, projectId, details, timestamp: new Date().toISOString() });
    if (workspace.activity.length > 200) workspace.activity.shift();
  }
}

export const teamWorkspaceService = new TeamWorkspaceService();
export { TeamWorkspaceService };
