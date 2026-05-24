// ============================================================================
// QuantMail API - Contacts Controller
// Business logic for contact management with ecosystem sync
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Contact, ContactGroup, ContactAddress, QuantApp } from '../../src/types';

// In-memory stores
const contacts = new Map<string, Contact>();
const contactGroups = new Map<string, ContactGroup>();

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
}

export class ContactsController {
  // --------------------------------------------------------------------------
  // Contact CRUD
  // --------------------------------------------------------------------------

  async listContacts(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const tag = req.query['tag'] as string;
    const search = req.query['q'] as string;
    const favoriteOnly = req.query['favorites'] === 'true';
    const page = Number(req.query['page']) || 1;
    const pageSize = Math.min(Number(req.query['page_size']) || 50, 200);

    let results: Contact[] = [];
    for (const contact of contacts.values()) {
      if (contact.userId !== userId) continue;
      if (tag && !contact.tags.includes(tag)) continue;
      if (favoriteOnly && !contact.isFavorite) continue;
      if (search) {
        const query = search.toLowerCase();
        const matches = contact.name.toLowerCase().includes(query) ||
          contact.email.toLowerCase().includes(query) ||
          contact.company?.toLowerCase().includes(query) ||
          contact.phone?.includes(query);
        if (!matches) continue;
      }
      results.push(contact);
    }

    results.sort((a, b) => a.name.localeCompare(b.name));
    const total = results.length;
    results = results.slice((page - 1) * pageSize, page * pageSize);

    res.status(200).json({ success: true, data: results, metadata: { total, page, pageSize } });
  }

  async getContact(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const contactId = req.params['id'];
    const contact = contacts.get(contactId);
    if (!contact || contact.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Contact not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: contact });
  }

  async createContact(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const body = req.body as Partial<Contact>;

    if (!body.email || !body.name) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and name are required', statusCode: 400 } });
      return;
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid email format', statusCode: 400 } });
      return;
    }

    // Check for duplicates
    for (const existing of contacts.values()) {
      if (existing.userId === userId && existing.email === body.email) {
        res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Contact with this email already exists', statusCode: 409 } });
        return;
      }
    }

    const contact: Contact = {
      id: generateId('contact'),
      userId,
      email: body.email,
      name: body.name,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      company: body.company,
      title: body.title,
      avatarUrl: body.avatarUrl,
      addresses: body.addresses || [],
      tags: body.tags || [],
      notes: body.notes,
      birthday: body.birthday,
      socialLinks: body.socialLinks || {},
      isFavorite: body.isFavorite || false,
      source: 'manual',
      syncedApps: ['quantmail'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    contacts.set(contact.id, contact);
    res.status(201).json({ success: true, data: contact });
  }

  async updateContact(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const contactId = req.params['id'];
    const contact = contacts.get(contactId);
    if (!contact || contact.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Contact not found', statusCode: 404 } });
      return;
    }

    const updates = req.body as Partial<Contact>;

    if (updates.name) contact.name = updates.name;
    if (updates.firstName !== undefined) contact.firstName = updates.firstName;
    if (updates.lastName !== undefined) contact.lastName = updates.lastName;
    if (updates.email) contact.email = updates.email;
    if (updates.phone !== undefined) contact.phone = updates.phone;
    if (updates.company !== undefined) contact.company = updates.company;
    if (updates.title !== undefined) contact.title = updates.title;
    if (updates.avatarUrl !== undefined) contact.avatarUrl = updates.avatarUrl;
    if (updates.addresses) contact.addresses = updates.addresses;
    if (updates.tags) contact.tags = updates.tags;
    if (updates.notes !== undefined) contact.notes = updates.notes;
    if (updates.birthday !== undefined) contact.birthday = updates.birthday;
    if (updates.socialLinks) contact.socialLinks = updates.socialLinks;
    if (updates.isFavorite !== undefined) contact.isFavorite = updates.isFavorite;
    contact.updatedAt = new Date();

    res.status(200).json({ success: true, data: contact });
  }

  async deleteContact(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const contactId = req.params['id'];
    const contact = contacts.get(contactId);
    if (!contact || contact.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Contact not found', statusCode: 404 } });
      return;
    }

    contacts.delete(contactId);
    // Remove from groups
    for (const group of contactGroups.values()) {
      group.contacts = group.contacts.filter((id) => id !== contactId);
    }

    res.status(200).json({ success: true, data: { message: 'Contact deleted' } });
  }

  async toggleFavorite(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const contactId = req.params['id'];
    const contact = contacts.get(contactId);
    if (!contact || contact.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Contact not found', statusCode: 404 } });
      return;
    }

    contact.isFavorite = !contact.isFavorite;
    contact.updatedAt = new Date();
    res.status(200).json({ success: true, data: contact });
  }

  // --------------------------------------------------------------------------
  // Contact Groups
  // --------------------------------------------------------------------------

  async listGroups(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const results: ContactGroup[] = [];
    for (const group of contactGroups.values()) {
      if (group.userId === userId) results.push(group);
    }

    res.status(200).json({ success: true, data: results });
  }

  async createGroup(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { name, contacts: contactIds, color } = req.body as { name: string; contacts?: string[]; color?: string };
    if (!name) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Group name is required', statusCode: 400 } });
      return;
    }

    const group: ContactGroup = {
      id: generateId('group'),
      userId,
      name,
      contacts: contactIds || [],
      color,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    contactGroups.set(group.id, group);
    res.status(201).json({ success: true, data: group });
  }

  async addToGroup(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const groupId = req.params['groupId'];
    const { contactId } = req.body as { contactId: string };
    const group = contactGroups.get(groupId);
    if (!group || group.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found', statusCode: 404 } });
      return;
    }

    if (!group.contacts.includes(contactId)) {
      group.contacts.push(contactId);
      group.updatedAt = new Date();
    }

    res.status(200).json({ success: true, data: group });
  }

  async removeFromGroup(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const groupId = req.params['groupId'];
    const contactId = req.params['contactId'];
    const group = contactGroups.get(groupId);
    if (!group || group.userId !== userId) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found', statusCode: 404 } });
      return;
    }

    group.contacts = group.contacts.filter((id) => id !== contactId);
    group.updatedAt = new Date();
    res.status(200).json({ success: true, data: group });
  }

  // --------------------------------------------------------------------------
  // Ecosystem Sync
  // --------------------------------------------------------------------------

  async syncContacts(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { app, action } = req.body as { app: QuantApp; action: 'push' | 'pull' | 'both' };
    if (!app || !action) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'App and action are required', statusCode: 400 } });
      return;
    }

    // Mark contacts as synced with the target app
    let syncedCount = 0;
    for (const contact of contacts.values()) {
      if (contact.userId === userId) {
        if (!contact.syncedApps.includes(app)) {
          contact.syncedApps.push(app);
          syncedCount++;
        }
      }
    }

    res.status(200).json({
      success: true,
      data: { app, action, syncedCount, message: `Synced ${syncedCount} contacts with ${app}` },
    });
  }

  async importContacts(req: Request, res: Response): Promise<void> {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 } }); return; }

    const { source, data } = req.body as { source: string; data: Array<{ email: string; name: string; phone?: string }> };
    if (!source || !data || !Array.isArray(data)) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Source and data array are required', statusCode: 400 } });
      return;
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const item of data) {
      if (!item.email || !item.name) { skippedCount++; continue; }

      // Check duplicates
      let exists = false;
      for (const existing of contacts.values()) {
        if (existing.userId === userId && existing.email === item.email) {
          exists = true;
          break;
        }
      }
      if (exists) { skippedCount++; continue; }

      const contact: Contact = {
        id: generateId('contact'),
        userId,
        email: item.email,
        name: item.name,
        phone: item.phone,
        addresses: [],
        tags: ['imported'],
        socialLinks: {},
        isFavorite: false,
        source: 'import',
        syncedApps: ['quantmail'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      contacts.set(contact.id, contact);
      importedCount++;
    }

    res.status(200).json({
      success: true,
      data: { imported: importedCount, skipped: skippedCount, total: data.length },
    });
  }
}
