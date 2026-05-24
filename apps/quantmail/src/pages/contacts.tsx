// ============================================================================
// QuantMail - Contacts Page
// ============================================================================

import React, { useState } from 'react';
import type { Contact, ContactGroup, QuantApp } from '../types';

export interface ContactsPageProps {
  contacts: Contact[];
  groups: ContactGroup[];
  totalCount: number;
  isLoading: boolean;
  onCreateContact: (data: Partial<Contact>) => Promise<void>;
  onUpdateContact: (id: string, data: Partial<Contact>) => Promise<void>;
  onDeleteContact: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onSearch: (query: string) => void;
  onSync: (app: QuantApp) => Promise<void>;
  onImport: (data: Array<{ email: string; name: string }>) => Promise<void>;
}

export function ContactsPage(props: ContactsPageProps): React.ReactElement {
  const { contacts, groups, totalCount, isLoading, onCreateContact, onUpdateContact, onDeleteContact, onToggleFavorite, onSearch, onSync } = props;

  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [filter, setFilter] = useState<'all' | 'favorites' | string>('all');
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '', company: '', title: '' });

  const filteredContacts = contacts.filter((c) => {
    if (filter === 'favorites') return c.isFavorite;
    if (filter !== 'all') return c.tags.includes(filter);
    return true;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.email) return;
    await onCreateContact(newContact);
    setShowCreateModal(false);
    setNewContact({ name: '', email: '', phone: '', company: '', title: '' });
  };

  return (
    <div className="contacts-page">
      <div className="page-header">
        <h1>Contacts</h1>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={() => onSync('quantchat')}>Sync</button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>Add Contact</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="contacts-toolbar">
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); onSearch(e.target.value); }}
          />
        </form>
        <div className="filter-tabs">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All ({totalCount})</button>
          <button className={`filter-btn ${filter === 'favorites' ? 'active' : ''}`} onClick={() => setFilter('favorites')}>Favorites</button>
          {groups.map((g) => (
            <button key={g.id} className={`filter-btn ${filter === g.name ? 'active' : ''}`} onClick={() => setFilter(g.name)}>
              {g.name} ({g.contacts.length})
            </button>
          ))}
        </div>
      </div>

      {/* Contact List */}
      <div className="contacts-layout">
        <div className="contacts-list">
          {isLoading && <div className="loading-indicator">Loading contacts...</div>}
          {!isLoading && filteredContacts.length === 0 && (
            <div className="empty-state">
              <p>No contacts found</p>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>Add your first contact</button>
            </div>
          )}
          {filteredContacts.map((contact) => (
            <div key={contact.id} className={`contact-row ${selectedContact?.id === contact.id ? 'selected' : ''}`} onClick={() => setSelectedContact(contact)}>
              <div className="contact-avatar">
                {contact.avatarUrl
                  ? <img src={contact.avatarUrl} alt={contact.name} />
                  : <span className="avatar-placeholder">{contact.name.charAt(0).toUpperCase()}</span>
                }
              </div>
              <div className="contact-info">
                <h4>{contact.name}</h4>
                <p className="contact-email">{contact.email}</p>
                {contact.company && <p className="contact-company">{contact.company}{contact.title ? ` - ${contact.title}` : ''}</p>}
              </div>
              <div className="contact-actions">
                <button className={`btn-icon ${contact.isFavorite ? 'favorited' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleFavorite(contact.id); }}>
                  {contact.isFavorite ? '\u2605' : '\u2606'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Detail Panel */}
        {selectedContact && (
          <div className="contact-detail">
            <div className="detail-header">
              <div className="contact-avatar-large">
                <span className="avatar-placeholder-large">{selectedContact.name.charAt(0).toUpperCase()}</span>
              </div>
              <h2>{selectedContact.name}</h2>
              {selectedContact.title && <p className="detail-title">{selectedContact.title}</p>}
              {selectedContact.company && <p className="detail-company">{selectedContact.company}</p>}
            </div>
            <div className="detail-info">
              <div className="info-row"><label>Email</label><span>{selectedContact.email}</span></div>
              {selectedContact.phone && <div className="info-row"><label>Phone</label><span>{selectedContact.phone}</span></div>}
              {selectedContact.birthday && <div className="info-row"><label>Birthday</label><span>{selectedContact.birthday}</span></div>}
              {selectedContact.tags.length > 0 && (
                <div className="info-row">
                  <label>Tags</label>
                  <div className="tags">{selectedContact.tags.map((t) => <span key={t} className="tag-badge">{t}</span>)}</div>
                </div>
              )}
              {selectedContact.notes && <div className="info-row"><label>Notes</label><p>{selectedContact.notes}</p></div>}
              <div className="info-row">
                <label>Synced with</label>
                <div className="synced-apps">{selectedContact.syncedApps.map((app) => <span key={app} className="app-badge">{app}</span>)}</div>
              </div>
            </div>
            <div className="detail-actions">
              <button className="btn btn-outline" onClick={() => onDeleteContact(selectedContact.id)}>Delete</button>
            </div>
          </div>
        )}
      </div>

      {/* Create Contact Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Contact</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>Name *</label><input type="text" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} required /></div>
              <div className="form-group"><label>Email *</label><input type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} required /></div>
              <div className="form-group"><label>Phone</label><input type="tel" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} /></div>
              <div className="form-group"><label>Company</label><input type="text" value={newContact.company} onChange={(e) => setNewContact({ ...newContact, company: e.target.value })} /></div>
              <div className="form-group"><label>Title</label><input type="text" value={newContact.title} onChange={(e) => setNewContact({ ...newContact, title: e.target.value })} /></div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Contact</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactsPage;
