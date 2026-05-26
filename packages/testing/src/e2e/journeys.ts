import type { E2EScenario } from '../types';
import {
  navigateTo,
  clickElement,
  typeText,
  assertVisible,
  assertText,
  assertUrl,
  waitFor,
  selectOption,
  createJourney,
} from './helpers';

export const journeys: E2EScenario[] = [
  // QuantChat (1-3)
  createJourney('Chat: Send direct message', {
    tags: ['quantchat'],
    steps: [
      navigateTo('/chat'),
      clickElement("[data-testid='conversation-list'] li:first-child"),
      typeText("[data-testid='message-input']", 'Hello, how are you?'),
      clickElement("[data-testid='send-button']"),
      assertVisible("[data-testid='message-bubble']:last-child"),
      assertText("[data-testid='message-bubble']:last-child", 'Hello, how are you?'),
    ],
  }),
  createJourney('Chat: Create group conversation', {
    tags: ['quantchat'],
    steps: [
      navigateTo('/chat'),
      clickElement("[data-testid='new-group-button']"),
      clickElement("[data-testid='contact-item']:nth-child(1)"),
      clickElement("[data-testid='contact-item']:nth-child(2)"),
      typeText("[data-testid='group-name-input']", 'Project Team'),
      clickElement("[data-testid='create-group-confirm']"),
      assertVisible("[data-testid='group-header']"),
    ],
  }),
  createJourney('Chat: Share file in conversation', {
    tags: ['quantchat'],
    steps: [
      navigateTo('/chat'),
      clickElement("[data-testid='conversation-list'] li:first-child"),
      clickElement("[data-testid='attach-button']"),
      clickElement("[data-testid='file-picker'] input"),
      clickElement("[data-testid='send-button']"),
      assertVisible("[data-testid='file-preview']"),
    ],
  }),

  // QuantMail (4-6)
  createJourney('Mail: Compose and send email', {
    tags: ['quantmail'],
    steps: [
      navigateTo('/mail'),
      clickElement("[data-testid='compose-button']"),
      typeText("[data-testid='to-field']", 'user@example.com'),
      typeText("[data-testid='subject-field']", 'Meeting Tomorrow'),
      typeText("[data-testid='body-editor']", "Let's meet at 10am."),
      clickElement("[data-testid='send-email-button']"),
      assertVisible("[data-testid='sent-confirmation']"),
    ],
  }),
  createJourney('Mail: Manage folders', {
    tags: ['quantmail'],
    steps: [
      navigateTo('/mail'),
      clickElement("[data-testid='create-folder-button']"),
      typeText("[data-testid='folder-name-input']", 'Important'),
      clickElement("[data-testid='confirm-folder']"),
      clickElement("[data-testid='email-item']:first-child [data-testid='move-button']"),
      selectOption("[data-testid='folder-select']", 'Important'),
      assertVisible("[data-testid='folder-Important'] [data-testid='email-item']"),
    ],
  }),
  createJourney('Mail: Search emails', {
    tags: ['quantmail'],
    steps: [
      navigateTo('/mail'),
      typeText("[data-testid='search-input']", 'quarterly report'),
      clickElement("[data-testid='search-submit']"),
      waitFor(500),
      assertVisible("[data-testid='search-results']"),
    ],
  }),

  // QuantAI (7-9)
  createJourney('AI: Start new chat session', {
    tags: ['quantai'],
    steps: [
      navigateTo('/ai'),
      clickElement("[data-testid='new-chat-button']"),
      typeText("[data-testid='prompt-input']", 'Explain quantum computing'),
      clickElement("[data-testid='send-prompt-button']"),
      waitFor(1000),
      assertVisible("[data-testid='ai-response']"),
    ],
  }),
  createJourney('AI: Use tool in conversation', {
    tags: ['quantai'],
    steps: [
      navigateTo('/ai'),
      clickElement("[data-testid='new-chat-button']"),
      typeText("[data-testid='prompt-input']", 'Search for latest news'),
      clickElement("[data-testid='send-prompt-button']"),
      waitFor(1500),
      assertVisible("[data-testid='tool-output']"),
    ],
  }),
  createJourney('AI: Manage chat history', {
    tags: ['quantai'],
    steps: [
      navigateTo('/ai'),
      clickElement("[data-testid='history-button']"),
      assertVisible("[data-testid='history-list']"),
      clickElement("[data-testid='history-item']:first-child [data-testid='delete-button']"),
      clickElement("[data-testid='confirm-delete']"),
      assertText("[data-testid='history-list']", 'No sessions'),
    ],
  }),

  // QuantAds (10-12)
  createJourney('Ads: Create new campaign', {
    tags: ['quantads'],
    steps: [
      navigateTo('/ads'),
      clickElement("[data-testid='create-campaign-button']"),
      typeText("[data-testid='campaign-name']", 'Summer Sale 2024'),
      typeText("[data-testid='campaign-budget']", '5000'),
      selectOption("[data-testid='campaign-target']", 'awareness'),
      clickElement("[data-testid='launch-campaign']"),
      assertVisible("[data-testid='campaign-active-badge']"),
    ],
  }),
  createJourney('Ads: Review campaign analytics', {
    tags: ['quantads'],
    steps: [
      navigateTo('/ads'),
      clickElement("[data-testid='campaign-list'] li:first-child"),
      assertVisible("[data-testid='analytics-chart']"),
      assertVisible("[data-testid='metric-impressions']"),
      assertVisible("[data-testid='metric-clicks']"),
    ],
  }),
  createJourney('Ads: Manage budget allocation', {
    tags: ['quantads'],
    steps: [
      navigateTo('/ads'),
      clickElement("[data-testid='campaign-list'] li:first-child"),
      clickElement("[data-testid='edit-budget-button']"),
      typeText("[data-testid='budget-input']", '7500'),
      clickElement("[data-testid='save-budget']"),
      assertText("[data-testid='current-budget']", '7500'),
    ],
  }),

  // QuantTube (13-15)
  createJourney('Tube: Upload video', {
    tags: ['quantube'],
    steps: [
      navigateTo('/tube'),
      clickElement("[data-testid='upload-button']"),
      clickElement("[data-testid='file-input']"),
      typeText("[data-testid='video-title']", 'My First Video'),
      typeText("[data-testid='video-description']", 'A great video'),
      clickElement("[data-testid='publish-button']"),
      assertVisible("[data-testid='upload-success']"),
    ],
  }),
  createJourney('Tube: Browse video feed', {
    tags: ['quantube'],
    steps: [
      navigateTo('/tube'),
      assertVisible("[data-testid='video-feed']"),
      assertVisible("[data-testid='video-card']:first-child"),
      clickElement("[data-testid='video-card']:first-child"),
      assertVisible("[data-testid='video-player']"),
    ],
  }),
  createJourney('Tube: Post comment on video', {
    tags: ['quantube'],
    steps: [
      navigateTo('/tube/video/1'),
      assertVisible("[data-testid='comments-section']"),
      typeText("[data-testid='comment-input']", 'Great video!'),
      clickElement("[data-testid='post-comment-button']"),
      assertText("[data-testid='comment-list'] li:last-child", 'Great video!'),
    ],
  }),

  // QuantNeon (16-18)
  createJourney('Neon: Create new post', {
    tags: ['quantneon'],
    steps: [
      navigateTo('/neon'),
      clickElement("[data-testid='new-post-button']"),
      typeText("[data-testid='post-content']", 'Hello Neon world!'),
      clickElement("[data-testid='add-media-button']"),
      clickElement("[data-testid='publish-post']"),
      assertVisible("[data-testid='post-published']"),
    ],
  }),
  createJourney('Neon: Like and share post', {
    tags: ['quantneon'],
    steps: [
      navigateTo('/neon'),
      assertVisible("[data-testid='feed-post']:first-child"),
      clickElement("[data-testid='feed-post']:first-child [data-testid='like-button']"),
      clickElement("[data-testid='feed-post']:first-child [data-testid='share-button']"),
      assertVisible("[data-testid='share-confirmation']"),
    ],
  }),
  createJourney('Neon: Explore feed', {
    tags: ['quantneon'],
    steps: [
      navigateTo('/neon/explore'),
      assertVisible("[data-testid='explore-feed']"),
      assertVisible("[data-testid='explore-post']:first-child"),
      clickElement("[data-testid='explore-post']:first-child [data-testid='like-button']"),
      assertVisible("[data-testid='like-confirmed']"),
    ],
  }),

  // QuantSync (19-20)
  createJourney('Sync: Sync file across devices', {
    tags: ['quantsync'],
    steps: [
      navigateTo('/sync'),
      clickElement("[data-testid='upload-file-button']"),
      clickElement("[data-testid='file-input']"),
      waitFor(1000),
      assertVisible("[data-testid='sync-status-complete']"),
    ],
  }),
  createJourney('Sync: Share folder with team', {
    tags: ['quantsync'],
    steps: [
      navigateTo('/sync'),
      clickElement("[data-testid='folder-list'] li:first-child"),
      clickElement("[data-testid='share-folder-button']"),
      typeText("[data-testid='share-email-input']", 'teammate@example.com'),
      selectOption("[data-testid='permission-select']", 'editor'),
      clickElement("[data-testid='confirm-share']"),
      assertVisible("[data-testid='share-success']"),
    ],
  }),

  // QuantDocs (21-22)
  createJourney('Docs: Create new document', {
    tags: ['quantdocs'],
    steps: [
      navigateTo('/docs'),
      clickElement("[data-testid='new-doc-button']"),
      typeText("[data-testid='doc-editor']", 'Meeting notes for Q4 planning'),
      clickElement("[data-testid='save-doc-button']"),
      assertVisible("[data-testid='doc-saved-indicator']"),
    ],
  }),
  createJourney('Docs: Collaborate on document', {
    tags: ['quantdocs'],
    steps: [
      navigateTo('/docs/shared/doc-123'),
      assertVisible("[data-testid='doc-editor']"),
      assertVisible("[data-testid='collaborator-cursor']"),
      typeText("[data-testid='doc-editor']", 'Adding my section'),
      assertVisible("[data-testid='realtime-indicator']"),
    ],
  }),

  // QuantDrive (23-24)
  createJourney('Drive: Upload and organize files', {
    tags: ['quantdrive'],
    steps: [
      navigateTo('/drive'),
      clickElement("[data-testid='upload-button']"),
      clickElement("[data-testid='file-input']"),
      clickElement("[data-testid='new-folder-button']"),
      typeText("[data-testid='folder-name-input']", 'Work'),
      clickElement("[data-testid='confirm-folder']"),
      assertVisible("[data-testid='folder-Work']"),
    ],
  }),
  createJourney('Drive: Manage storage quota', {
    tags: ['quantdrive'],
    steps: [
      navigateTo('/drive/settings'),
      assertVisible("[data-testid='storage-usage']"),
      clickElement("[data-testid='file-list'] li:first-child [data-testid='delete-button']"),
      clickElement("[data-testid='confirm-delete']"),
      assertVisible("[data-testid='quota-updated']"),
    ],
  }),

  // QuantMeet (25-26)
  createJourney('Meet: Start video meeting', {
    tags: ['quantmeet'],
    steps: [
      navigateTo('/meet'),
      clickElement("[data-testid='new-meeting-button']"),
      assertVisible("[data-testid='video-preview']"),
      assertVisible("[data-testid='audio-indicator']"),
      assertVisible("[data-testid='meeting-link']"),
    ],
  }),
  createJourney('Meet: Join existing meeting', {
    tags: ['quantmeet'],
    steps: [
      navigateTo('/meet'),
      typeText("[data-testid='meeting-code-input']", 'abc-defg-hij'),
      clickElement("[data-testid='join-meeting-button']"),
      waitFor(1000),
      assertVisible("[data-testid='meeting-connected']"),
    ],
  }),

  // QuantCalendar (27-28)
  createJourney('Calendar: Create event', {
    tags: ['quantcalendar'],
    steps: [
      navigateTo('/calendar'),
      clickElement("[data-testid='day-cell-15']"),
      typeText("[data-testid='event-title']", 'Team Standup'),
      typeText("[data-testid='event-time']", '09:00'),
      clickElement("[data-testid='save-event-button']"),
      assertVisible("[data-testid='event-Team-Standup']"),
    ],
  }),
  createJourney('Calendar: Manage weekly schedule', {
    tags: ['quantcalendar'],
    steps: [
      navigateTo('/calendar'),
      clickElement("[data-testid='week-view-button']"),
      assertVisible("[data-testid='week-view']"),
      clickElement("[data-testid='event-item']:first-child"),
      assertVisible("[data-testid='event-detail-popup']"),
    ],
  }),

  // QuantEdits (29)
  createJourney('Edits: Create video project', {
    tags: ['quantedits'],
    steps: [
      navigateTo('/edits'),
      clickElement("[data-testid='new-project-button']"),
      clickElement("[data-testid='import-media-button']"),
      clickElement("[data-testid='media-item']:first-child"),
      clickElement("[data-testid='add-to-timeline']"),
      assertVisible("[data-testid='timeline-clip']"),
    ],
  }),

  // QuantMax (30)
  createJourney('Max: Multi-app workflow', {
    tags: ['quantmax'],
    steps: [
      navigateTo('/max'),
      clickElement("[data-testid='create-workspace-button']"),
      clickElement("[data-testid='add-widget-chat']"),
      clickElement("[data-testid='add-widget-mail']"),
      clickElement("[data-testid='add-widget-calendar']"),
      assertVisible("[data-testid='workspace-widgets']"),
    ],
  }),
];
