// ============================================================================
// QuantChat API - Backup Routes
// Chat backup, restore, export endpoints
// ============================================================================

import { backupController } from '../controllers/backup-controller';
import type { RouteDefinition } from './auth';

export const backupRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/backups',
    handler: (req, res) => backupController.listBackups(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/backups',
    handler: (req, res) => backupController.createBackup(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/backups/size',
    handler: (req, res) => backupController.getBackupSize(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/backups/schedule',
    handler: (req, res) => backupController.scheduleAutoBackup(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/backups/:backupId/restore',
    handler: (req, res) => backupController.restoreBackup(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/backups/:backupId',
    handler: (req, res) => backupController.deleteBackup(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/chats/:chatId/export',
    handler: (req, res) => backupController.exportChat(req, res),
    requiresAuth: true,
  },
];
