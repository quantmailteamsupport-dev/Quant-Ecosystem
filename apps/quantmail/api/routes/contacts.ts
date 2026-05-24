// ============================================================================
// QuantMail API - Contacts Routes
// Contact management with sync across ecosystem
// ============================================================================

import { ContactsController } from '../controllers/contacts-controller';
import type { RouteDefinition } from './auth';

// Initialize
const contactsController = new ContactsController();

export const contactRoutes: RouteDefinition[] = [
  // Contact CRUD
  {
    method: 'GET',
    path: '/contacts',
    handler: (req, res) => contactsController.listContacts(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/contacts/:id',
    handler: (req, res) => contactsController.getContact(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/contacts',
    handler: (req, res) => contactsController.createContact(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/contacts/:id',
    handler: (req, res) => contactsController.updateContact(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/contacts/:id',
    handler: (req, res) => contactsController.deleteContact(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/contacts/:id/favorite',
    handler: (req, res) => contactsController.toggleFavorite(req, res),
    requiresAuth: true,
  },

  // Contact Groups
  {
    method: 'GET',
    path: '/contacts/groups',
    handler: (req, res) => contactsController.listGroups(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/contacts/groups',
    handler: (req, res) => contactsController.createGroup(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/contacts/groups/:groupId/add',
    handler: (req, res) => contactsController.addToGroup(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/contacts/groups/:groupId/contacts/:contactId',
    handler: (req, res) => contactsController.removeFromGroup(req, res),
    requiresAuth: true,
  },

  // Ecosystem Sync
  {
    method: 'POST',
    path: '/contacts/sync',
    handler: (req, res) => contactsController.syncContacts(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/contacts/import',
    handler: (req, res) => contactsController.importContacts(req, res),
    requiresAuth: true,
  },
];

export { contactsController };
