// ============================================================================
// QuantMail - Inbox Page
// Main inbox view with categories, search, and filters
// ============================================================================

import React, { useState, useEffect } from 'react';
import type { Email, EmailCategory } from '../types';

export interface InboxPageProps {
  emails: Email[];
  totalCount: number;
  unreadCount: number;
  currentCategory: EmailCategory | 'all';
  currentLabel?: string;
  isLoading: boolean;
  onSelectEmail: (email: Email) => void;
  onArchive: (emailId: string) => void;
  onDelete: (emailId: string) => void;
  onToggleStar: (emailId: string) => void;
  onCategoryChange: (category: EmailCategory | 'all') => void;
  onSearch: (query: string) => void;
  onCompose: () => void;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  pageSize: number;
}

const categories: Array<{ id: EmailCategory | 'all'; label: string; icon: string }> = [
  { id: 'all', label: 'All Mail', icon: 'inbox' },
  { id: 'primary', label: 'Primary', icon: 'inbox' },
  { id: 'social', label: 'Social', icon: 'users' },
  { id: 'promotions', label: 'Promotions', icon: 'tag' },
  { id: 'updates', label: 'Updates', icon: 'bell' },
  { id: 'forums', label: 'Forums', icon: 'message-circle' },
];

export function InboxPage(props: InboxPageProps): React.ReactElement {
  const {
    emails, totalCount, unreadCount, currentCategory, isLoading,
    onSelectEmail, onArchive, onDelete, onToggleStar, onCategoryChange,
    onSearch, onCompose, onRefresh, onPageChange, currentPage, pageSize,
  } = props;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const toggleEmailSelection = (emailId: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) next.delete(emailId);
      else next.add(emailId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map((e) => e.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkArchive = () => {
    selectedEmails.forEach((id) => onArchive(id));
    setSelectedEmails(new Set());
  };

  const handleBulkDelete = () => {
    selectedEmails.forEach((id) => onDelete(id));
    setSelectedEmails(new Set());
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const emailDate = new Date(date);
    const diffDays = Math.floor((now.getTime() - emailDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return emailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return emailDate.toLocaleDateString([], { weekday: 'short' });
    return emailDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="inbox-page">
      {/* Toolbar */}
      <div className="inbox-toolbar">
        <div className="toolbar-left">
          <label className="checkbox-inline">
            <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
          </label>
          {selectedEmails.size > 0 && (
            <div className="bulk-actions">
              <button className="btn btn-sm btn-icon" onClick={handleBulkArchive} title="Archive">Archive</button>
              <button className="btn btn-sm btn-icon" onClick={handleBulkDelete} title="Delete">Delete</button>
              <span className="selected-count">{selectedEmails.size} selected</span>
            </div>
          )}
          <button className="btn btn-sm btn-icon" onClick={onRefresh} title="Refresh" disabled={isLoading}>
            Refresh
          </button>
        </div>

        <form className="toolbar-search" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={onCompose}>Compose</button>
          <span className="inbox-count">{unreadCount} unread of {totalCount}</span>
        </div>
      </div>

      {/* Category tabs */}
      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`category-tab ${currentCategory === cat.id ? 'active' : ''}`}
            onClick={() => onCategoryChange(cat.id)}
          >
            <span className="tab-icon">{cat.icon}</span>
            <span className="tab-label">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Email list */}
      <div className="email-list">
        {isLoading && <div className="loading-indicator">Loading emails...</div>}
        {!isLoading && emails.length === 0 && (
          <div className="empty-state">
            <p>No emails found</p>
            <button className="btn btn-primary" onClick={onCompose}>Compose your first email</button>
          </div>
        )}
        {emails.map((email) => (
          <div
            key={email.id}
            className={`email-row ${!email.isRead ? 'unread' : ''} ${selectedEmails.has(email.id) ? 'selected' : ''}`}
            onClick={() => onSelectEmail(email)}
          >
            <div className="email-checkbox" onClick={(e) => { e.stopPropagation(); toggleEmailSelection(email.id); }}>
              <input type="checkbox" checked={selectedEmails.has(email.id)} readOnly />
            </div>
            <button
              className={`email-star ${email.isStarred ? 'starred' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleStar(email.id); }}
            >
              {email.isStarred ? '\u2605' : '\u2606'}
            </button>
            <div className="email-sender">
              <span className={!email.isRead ? 'font-bold' : ''}>
                {email.from.name || email.from.email}
              </span>
            </div>
            <div className="email-content">
              <span className={`email-subject ${!email.isRead ? 'font-bold' : ''}`}>
                {email.subject}
              </span>
              <span className="email-snippet"> - {email.snippet}</span>
            </div>
            {email.attachments.length > 0 && <span className="email-attachment-icon" title="Has attachments">📎</span>}
            {email.priority === 'high' && <span className="priority-badge priority-high">!</span>}
            <div className="email-labels">
              {email.labels.filter((l) => !['inbox', 'sent', 'archive'].includes(l)).map((label) => (
                <span key={label} className="label-badge">{label}</span>
              ))}
            </div>
            <span className="email-date">{formatDate(email.receivedAt)}</span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn btn-sm" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button className="btn btn-sm" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default InboxPage;
