// ============================================================================
// QuantMail - Compose Page
// Rich email composer with AI assist
// ============================================================================

import React, { useState } from 'react';
import type { EmailAddress, EmailPriority } from '../types';

export interface ComposePageProps {
  onSend: (data: { to: EmailAddress[]; cc: EmailAddress[]; bcc: EmailAddress[]; subject: string; body: string; priority: EmailPriority; isDraft: boolean }) => Promise<void>;
  onSaveDraft: (data: { to: EmailAddress[]; subject: string; body: string }) => Promise<void>;
  onDiscard: () => void;
  onAICompose: (instructions: string, tone: string) => Promise<{ subject: string; body: string }>;
  onAIAutocomplete: (text: string) => Promise<string[]>;
  replyTo?: { from: EmailAddress; subject: string; body: string };
  isLoading?: boolean;
}

export function ComposePage(props: ComposePageProps): React.ReactElement {
  const { onSend, onSaveDraft, onDiscard, onAICompose, onAIAutocomplete, replyTo, isLoading } = props;

  const [to, setTo] = useState<string>(replyTo ? replyTo.from.email : '');
  const [cc, setCc] = useState<string>('');
  const [bcc, setBcc] = useState<string>('');
  const [subject, setSubject] = useState<string>(replyTo ? `Re: ${replyTo.subject}` : '');
  const [body, setBody] = useState<string>(replyTo ? `\n\n---\nOn ${new Date().toLocaleDateString()}, ${replyTo.from.email} wrote:\n> ${replyTo.body}` : '');
  const [priority, setPriority] = useState<EmailPriority>('normal');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiInstructions, setAIInstructions] = useState('');
  const [aiTone, setAITone] = useState('professional');
  const [aiSuggestions, setAISuggestions] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const parseRecipients = (value: string): EmailAddress[] => {
    return value.split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((email) => ({ email }));
  };

  const handleSend = async () => {
    if (!to.trim()) return;
    setIsSending(true);
    try {
      await onSend({
        to: parseRecipients(to),
        cc: parseRecipients(cc),
        bcc: parseRecipients(bcc),
        subject,
        body,
        priority,
        isDraft: false,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    await onSaveDraft({
      to: parseRecipients(to),
      subject,
      body,
    });
  };

  const handleAICompose = async () => {
    if (!aiInstructions.trim()) return;
    const result = await onAICompose(aiInstructions, aiTone);
    if (result.subject && !subject) setSubject(result.subject);
    if (result.body) setBody(result.body);
    setShowAI(false);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && body.length > 10) {
      e.preventDefault();
      const suggestions = await onAIAutocomplete(body);
      setAISuggestions(suggestions);
    }
  };

  const applySuggestion = (suggestion: string) => {
    setBody(body + ' ' + suggestion);
    setAISuggestions([]);
  };

  return (
    <div className="compose-page">
      <div className="compose-header">
        <h2>{replyTo ? 'Reply' : 'New Message'}</h2>
        <div className="compose-actions">
          <button className="btn btn-sm btn-outline" onClick={() => setShowAI(!showAI)}>
            AI Assist
          </button>
          <button className="btn btn-sm btn-outline" onClick={handleSaveDraft} disabled={isLoading}>
            Save Draft
          </button>
          <button className="btn btn-sm btn-outline" onClick={onDiscard}>
            Discard
          </button>
          <button className="btn btn-primary" onClick={handleSend} disabled={isSending || !to.trim()}>
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* AI Compose Panel */}
      {showAI && (
        <div className="ai-compose-panel">
          <h3>AI Compose Assistant</h3>
          <div className="form-group">
            <label>What would you like to write?</label>
            <textarea
              value={aiInstructions}
              onChange={(e) => setAIInstructions(e.target.value)}
              placeholder="e.g., Write a follow-up email about the project deadline..."
              rows={3}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tone</label>
              <select value={aiTone} onChange={(e) => setAITone(e.target.value)}>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="friendly">Friendly</option>
              </select>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleAICompose}>
              Generate
            </button>
          </div>
        </div>
      )}

      {/* Compose Form */}
      <div className="compose-form">
        <div className="compose-field">
          <label>To</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com, another@example.com"
          />
          <button className="btn-link btn-sm" onClick={() => setShowCcBcc(!showCcBcc)}>
            {showCcBcc ? 'Hide' : 'Cc/Bcc'}
          </button>
        </div>

        {showCcBcc && (
          <>
            <div className="compose-field">
              <label>Cc</label>
              <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@example.com" />
            </div>
            <div className="compose-field">
              <label>Bcc</label>
              <input type="text" value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="bcc@example.com" />
            </div>
          </>
        )}

        <div className="compose-field">
          <label>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
          />
        </div>

        <div className="compose-field compose-field-priority">
          <label>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as EmailPriority)}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="compose-body">
          <div className="editor-toolbar">
            <button className="btn-icon" title="Bold">B</button>
            <button className="btn-icon" title="Italic">I</button>
            <button className="btn-icon" title="Underline">U</button>
            <span className="divider" />
            <button className="btn-icon" title="List">List</button>
            <button className="btn-icon" title="Link">Link</button>
            <button className="btn-icon" title="Attach">Attach</button>
          </div>
          <textarea
            className="compose-textarea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your message here... (Press Tab for AI suggestions)"
            rows={15}
          />
        </div>

        {/* AI Autocomplete Suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="ai-suggestions">
            <p className="suggestions-label">AI Suggestions:</p>
            {aiSuggestions.map((suggestion, i) => (
              <button key={i} className="suggestion-chip" onClick={() => applySuggestion(suggestion)}>
                {suggestion}
              </button>
            ))}
            <button className="btn-link btn-sm" onClick={() => setAISuggestions([])}>Dismiss</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComposePage;
