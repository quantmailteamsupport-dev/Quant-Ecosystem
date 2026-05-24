// ============================================================================
// QuantTube - LiveChat Component
// Real-time live stream chat with super chats and moderation
// ============================================================================

import type { ChatMessage } from '../types';

interface LiveChatProps {
  messages: ChatMessage[];
  streamId: string;
  isConnected: boolean;
  viewerCount: number;
  onSendMessage: (message: string) => void;
  onSuperChat: (message: string, amount: number) => void;
}

export function LiveChat({ messages, streamId, isConnected, viewerCount, onSendMessage, onSuperChat }: LiveChatProps) {
  return {
    type: 'div',
    props: { className: 'live-chat' },
    children: [
      { type: 'div', props: { className: 'chat-header' }, children: [
        { type: 'h3', props: {}, children: ['Live Chat'] },
        { type: 'span', props: { className: `connection-status ${isConnected ? 'connected' : 'disconnected'}` }, children: [isConnected ? 'Connected' : 'Reconnecting...'] },
        { type: 'span', props: { className: 'viewer-count' }, children: [`${viewerCount} watching`] },
      ]},
      { type: 'div', props: { className: 'chat-messages' }, children: messages.slice(-100).map(msg => renderChatMessage(msg)) },
      { type: 'div', props: { className: 'chat-input' }, children: [
        { type: 'input', props: { type: 'text', placeholder: 'Send a message...', className: 'message-input' }, children: [] },
        { type: 'button', props: { className: 'send-btn' }, children: ['Send'] },
        { type: 'button', props: { className: 'superchat-btn' }, children: ['$ Super Chat'] },
      ]},
    ],
  };
}

function renderChatMessage(msg: ChatMessage) {
  const className = `chat-msg chat-msg--${msg.type}`;
  return {
    type: 'div',
    props: { className, 'data-id': msg.id },
    children: [
      msg.type === 'superchat' ? { type: 'span', props: { className: 'superchat-badge' }, children: [`$${msg.amount}`] } : null,
      { type: 'span', props: { className: 'msg-username' }, children: [msg.username] },
      { type: 'span', props: { className: 'msg-text' }, children: [msg.message] },
      { type: 'span', props: { className: 'msg-time' }, children: [new Date(msg.timestamp).toLocaleTimeString()] },
    ].filter(Boolean),
  };
}

export default LiveChat;
