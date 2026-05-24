// ============================================================================
// QuantMail - Email Composer Component
// Rich text editor with AI suggestions
// ============================================================================

import React, { useState, useRef } from 'react';
import type { EmailAddress, EmailPriority } from '../types';

export interface EmailComposerProps {
  initialTo?: EmailAddress[];
  initialSubject?: string;
  initialBody?: string;
  inReplyTo?: string;
  onSend: (data: { to: EmailAddress[]; cc: EmailAddress[]; bcc: EmailAddress[]; subject: string; bodyText: string; bodyHtml: string; priority: EmailPriority }) => Promise<void>;
  onSaveDraft: () => void;
  onDiscard: () => void;
  onAIAssist: (action: 'compose' | 'improve' | 'shorten' | 'formalize', text: string) => Promise<string>;
  onAttach: (file: { name: string; size: number; type: string }) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function EmailComposer(props: EmailComposerProps): React.ReactElement {
  const { initialTo, initialSubject, initialBody, onSend, onSaveDraft, onDiscard, onAIAssist, onAttach, isMinimized, onToggleMinimize } = props;

  const [to, setTo] = useState(initialTo?.map((a) => a.email).join(', ') || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(initialSubject || '');
  const [body, setBody] = useState(initialBody || '');
  const [priority, setPriority] = useState<EmailPriority>('normal');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [formatting, setFormatting] = useState({ bold: false, italic: false, underline: false });
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const parseEmails = (str: string): EmailAddress[] => {
    return str.split(',').map((s) => s.trim()).filter((s) => s).map((email) => ({ email }));
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) return;
    setIsSending(true);
    try {
      await onSend({
        to: parseEmails(to),
        cc: parseEmails(cc),
        bcc: parseEmails(bcc),
        subject,
        bodyText: body,
        bodyHtml: `<div>${body.replace(/\n/g, '<br>')}</div>`,
        priority,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleAIAction = async (action: 'compose' | 'improve' | 'shorten' | 'formalize') => {
    setAiLoading(true);
    setShowAIMenu(false);
    try {
      const result = await onAIAssist(action, body);
      setBody(result);
    } finally {
      setAiLoading(false);
    }
  };

  const handleKeyboardShortcut = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'Enter': e.preventDefault(); handleSend(); break;
        case 'b': e.preventDefault(); setFormatting((f) => ({ ...f, bold: !f.bold })); break;
        case 'i': e.preventDefault(); setFormatting((f) => ({ ...f, italic: !f.italic })); break;
        case 'u': e.preventDefault(); setFormatting((f) => ({ ...f, underline: !f.underline })); break;
        case 's': e.preventDefault(); onSaveDraft(); break;
      }
    }
  };

  if (isMinimized) {
    return (
      <div className="composer-minimized" onClick={onToggleMinimize}>
        <span className="composer-minimized-title">
          {subject || 'New Message'} - {to || 'No recipients'}
        </span>
        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onDiscard(); }}>X</button>
      </div>
    );
  }

  return (
    <div className="email-composer" onKeyDown={handleKeyboardShortcut}>
      {/* Header */}
      <div className="composer-header">
        <span className="composer-title">New Message</span>
        <div className="composer-header-actions">
          {onToggleMinimize && <button className="btn-icon" onClick={onToggleMinimize} title="Minimize">_</button>}
          <button className="btn-icon" onClick={onDiscard} title="Discard">X</button>
        </div>
      </div>

      {/* Recipients */}
      <div className="composer-fields">
        <div className="composer-field">
          <label>To</label>
          <input type="text" value={to} onChange={(e) => setTo(e.target.value)} placeholder="Recipients" />
          <button className="btn-link" onClick={() => setShowCcBcc(!showCcBcc)}>{showCcBcc ? 'Hide Cc/Bcc' : 'Cc Bcc'}</button>
        </div>
        {showCcBcc && (
          <>
            <div className="composer-field"><label>Cc</label><input type="text" value={cc} onChange={(e) => setCc(e.target.value)} /></div>
            <div className="composer-field"><label>Bcc</label><input type="text" value={bcc} onChange={(e) => setBcc(e.target.value)} /></div>
          </>
        )}
        <div className="composer-field">
          <label>Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="composer-toolbar">
        <button className={`toolbar-btn ${formatting.bold ? 'active' : ''}`} onClick={() => setFormatting((f) => ({ ...f, bold: !f.bold }))} title="Bold (Cmd+B)">B</button>
        <button className={`toolbar-btn ${formatting.italic ? 'active' : ''}`} onClick={() => setFormatting((f) => ({ ...f, italic: !f.italic }))} title="Italic (Cmd+I)"><em>I</em></button>
        <button className={`toolbar-btn ${formatting.underline ? 'active' : ''}`} onClick={() => setFormatting((f) => ({ ...f, underline: !f.underline }))} title="Underline (Cmd+U)"><u>U</u></button>
        <span className="toolbar-divider" />
        <button className="toolbar-btn" title="Bullet list">List</button>
        <button className="toolbar-btn" title="Numbered list">1.</button>
        <button className="toolbar-btn" title="Insert link">Link</button>
        <span className="toolbar-divider" />
        <button className="toolbar-btn" onClick={() => onAttach({ name: 'file.pdf', size: 0, type: 'application/pdf' })} title="Attach file">Attach</button>
        <span className="toolbar-divider" />
        <div className="ai-menu-container">
          <button className={`toolbar-btn ai-btn ${aiLoading ? 'loading' : ''}`} onClick={() => setShowAIMenu(!showAIMenu)} title="AI Assist">
            {aiLoading ? '...' : 'AI'}
          </button>
          {showAIMenu && (
            <div className="ai-dropdown">
              <button onClick={() => handleAIAction('compose')}>Write for me</button>
              <button onClick={() => handleAIAction('improve')}>Improve writing</button>
              <button onClick={() => handleAIAction('shorten')}>Make shorter</button>
              <button onClick={() => handleAIAction('formalize')}>More formal</button>
            </div>
          )}
        </div>
        <div className="toolbar-right">
          <select className="priority-select" value={priority} onChange={(e) => setPriority(e.target.value as EmailPriority)}>
            <option value="low">Low priority</option>
            <option value="normal">Normal</option>
            <option value="high">High priority</option>
          </select>
        </div>
      </div>

      {/* Body */}
      <textarea
        ref={textareaRef}
        className="composer-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Compose your email..."
        rows={12}
      />

      {/* Footer */}
      <div className="composer-footer">
        <button className="btn btn-primary" onClick={handleSend} disabled={isSending || !to.trim()}>
          {isSending ? 'Sending...' : 'Send'} <span className="shortcut">Cmd+Enter</span>
        </button>
        <button className="btn btn-outline" onClick={onSaveDraft}>Save draft</button>
        <button className="btn btn-outline btn-icon" onClick={onDiscard} title="Discard">Discard</button>
      </div>
    </div>
  );
}

export default EmailComposer;
