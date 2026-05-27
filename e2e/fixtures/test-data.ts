export const TEST_USERS = {
  primary: {
    email: 'testuser@quant.test',
    password: 'TestPass123!',
    displayName: 'Test User',
    username: 'testuser',
  },
  secondary: {
    email: 'testuser2@quant.test',
    password: 'TestPass456!',
    displayName: 'Test User 2',
    username: 'testuser2',
  },
  admin: {
    email: 'admin@quant.test',
    password: 'AdminPass789!',
    displayName: 'Admin User',
    username: 'adminuser',
  },
  advertiser: {
    email: 'advertiser@quant.test',
    password: 'AdPass321!',
    displayName: 'Ad Manager',
    username: 'admanager',
  },
} as const;

export const TEST_CONVERSATIONS = {
  directMessage: {
    participants: ['testuser', 'testuser2'],
    messages: [
      { from: 'testuser', text: 'Hello! Testing direct message.' },
      { from: 'testuser2', text: 'Hi! Got your message.' },
    ],
  },
  groupChat: {
    name: 'Test Group Chat',
    participants: ['testuser', 'testuser2', 'adminuser'],
    messages: [
      { from: 'testuser', text: 'Welcome to the group!' },
      { from: 'adminuser', text: 'Thanks for adding me.' },
    ],
  },
} as const;

export const TEST_EMAILS = {
  basic: {
    from: 'testuser@quant.test',
    to: 'testuser2@quant.test',
    subject: 'Test Email Subject',
    body: 'This is a test email body for E2E testing.',
  },
  withAttachment: {
    from: 'testuser@quant.test',
    to: 'testuser2@quant.test',
    subject: 'Email with Attachment',
    body: 'Please find the attached file.',
    attachmentName: 'test-document.pdf',
  },
  reply: {
    from: 'testuser2@quant.test',
    to: 'testuser@quant.test',
    subject: 'Re: Test Email Subject',
    body: 'Thanks for the email!',
  },
} as const;

export const TEST_AI_SESSIONS = {
  basic: {
    title: 'Test AI Session',
    messages: [
      { role: 'user' as const, content: 'What is the capital of France?' },
      { role: 'assistant' as const, content: 'The capital of France is Paris.' },
    ],
  },
  withTool: {
    title: 'AI Tool Use Session',
    messages: [{ role: 'user' as const, content: 'Search for recent news about AI' }],
    tools: ['web_search', 'summarize'],
  },
} as const;

export const TEST_VIDEOS = {
  upload: {
    title: 'Test Video Upload',
    description: 'A test video for E2E testing.',
    tags: ['test', 'e2e', 'automation'],
    fileName: 'test-video.mp4',
  },
} as const;

export const TEST_POSTS = {
  text: {
    content: 'This is a test post for QuantNeon E2E testing!',
    visibility: 'public' as const,
  },
  withMedia: {
    content: 'Check out this image!',
    visibility: 'public' as const,
    mediaType: 'image' as const,
  },
} as const;

export const TEST_FILES = {
  document: {
    name: 'test-document.txt',
    content: 'Test file content for QuantSync.',
    mimeType: 'text/plain',
  },
  image: {
    name: 'test-image.png',
    mimeType: 'image/png',
  },
} as const;

export const TEST_CAMPAIGNS = {
  basic: {
    name: 'Test Ad Campaign',
    budget: 1000,
    currency: 'USD',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    targetAudience: {
      ageRange: [18, 45],
      interests: ['technology', 'gaming'],
    },
  },
} as const;

export const TEST_FOLDERS = {
  inbox: { name: 'Inbox', type: 'system' as const },
  sent: { name: 'Sent', type: 'system' as const },
  custom: { name: 'Test Folder', type: 'custom' as const },
} as const;
