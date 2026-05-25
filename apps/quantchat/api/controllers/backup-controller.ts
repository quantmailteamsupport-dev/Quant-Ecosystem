// ============================================================================
// QuantChat API - Backup Controller
// Backup creation, restoration, export, and schedule management
// ============================================================================

import type { Request, Response } from '../middleware';
import { backupService } from '../services/backup-service';

export class BackupController {
  async createBackup(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { includeMedia?: boolean; encryption?: boolean; selectedChats?: string[] };

    try {
      const backup = await backupService.createBackup(userId, body);
      res.status(201).json({ success: true, data: backup });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create backup';
      res.status(400).json({ success: false, error: { code: 'BACKUP_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async restoreBackup(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const backupId = req.params['backupId'];
    const body = req.body as { conflictResolution?: 'skip' | 'overwrite' | 'merge' };

    try {
      const result = await backupService.restoreBackup(userId, backupId, body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to restore backup';
      res.status(400).json({ success: false, error: { code: 'RESTORE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async listBackups(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const backups = await backupService.listBackups(userId);
    res.status(200).json({ success: true, data: backups, metadata: { count: backups.length } });
  }

  async deleteBackup(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const backupId = req.params['backupId'];

    try {
      await backupService.deleteBackup(userId, backupId);
      res.status(200).json({ success: true, data: { message: 'Backup deleted' } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to delete backup';
      res.status(400).json({ success: false, error: { code: 'DELETE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async exportChat(req: Request, res: Response): Promise<void> {
    const chatId = req.params['chatId'];
    const format = (req.query['format'] as 'text' | 'html' | 'pdf' | 'json') || 'text';

    try {
      const result = await backupService.exportChat(chatId, format);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to export chat';
      res.status(400).json({ success: false, error: { code: 'EXPORT_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getBackupSize(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const stats = await backupService.getBackupSize(userId);
    res.status(200).json({ success: true, data: stats });
  }

  async scheduleAutoBackup(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { frequency: 'daily' | 'weekly' | 'monthly'; time: string; config?: any };

    if (!body.frequency || !body.time) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Frequency and time are required', statusCode: 400 } });
      return;
    }

    try {
      const scheduled = await backupService.scheduleAutoBackup(userId, body.frequency, body.time, body.config);
      res.status(201).json({ success: true, data: scheduled });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to schedule backup';
      res.status(400).json({ success: false, error: { code: 'SCHEDULE_FAILED', message: msg, statusCode: 400 } });
    }
  }
}

export const backupController = new BackupController();
