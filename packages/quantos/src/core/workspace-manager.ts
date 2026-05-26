// ============================================================================
// QuantOS - Workspace Manager
// ============================================================================

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Workspace } from '../types';

// ============================================================================
// Validation Schemas
// ============================================================================

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(128),
});

// ============================================================================
// WorkspaceManager Class
// ============================================================================

export class WorkspaceManager {
  private workspaces: Map<string, Workspace> = new Map();

  createWorkspace(name: string): Workspace {
    CreateWorkspaceSchema.parse({ name });

    const workspace: Workspace = {
      id: randomUUID(),
      name,
      windows: [],
      isActive: this.workspaces.size === 0,
      createdAt: Date.now(),
    };

    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  switchWorkspace(workspaceId: string): Workspace {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    // Deactivate all workspaces
    for (const ws of this.workspaces.values()) {
      ws.isActive = false;
    }

    workspace.isActive = true;
    return workspace;
  }

  deleteWorkspace(workspaceId: string): void {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    if (workspace.isActive && this.workspaces.size > 1) {
      // Switch to another workspace before deleting
      for (const ws of this.workspaces.values()) {
        if (ws.id !== workspaceId) {
          ws.isActive = true;
          break;
        }
      }
    }

    this.workspaces.delete(workspaceId);
  }

  listWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values());
  }

  getActiveWorkspace(): Workspace | null {
    for (const workspace of this.workspaces.values()) {
      if (workspace.isActive) {
        return workspace;
      }
    }
    return null;
  }

  moveWindowToWorkspace(windowId: string, workspaceId: string): void {
    const targetWorkspace = this.workspaces.get(workspaceId);
    if (!targetWorkspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    // Remove from all workspaces
    for (const ws of this.workspaces.values()) {
      ws.windows = ws.windows.filter((id) => id !== windowId);
    }

    // Add to target workspace
    targetWorkspace.windows.push(windowId);
  }
}
