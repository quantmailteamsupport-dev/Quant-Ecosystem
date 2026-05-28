import type { DeviceIntent, GrammarPattern } from './types.js';

const patterns: GrammarPattern[] = [
  // Hindi/Hinglish patterns (must come before generic "call" to avoid false matches)
  {
    id: 'hindi-call',
    type: 'regex',
    pattern: '^call kar\\s+(.+)$',
    capability: 'phone',
    action: 'place',
    extract: (t) => ({ target: t.match(/^call kar\s+(.+)$/i)![1] }),
  },
  {
    id: 'hindi-message',
    type: 'regex',
    pattern: '^message bhej\\s+(.+)$',
    capability: 'sms',
    action: 'send',
    extract: (t) => ({ target: t.match(/^message bhej\s+(.+)$/i)![1] }),
  },
  {
    id: 'hindi-navigate',
    type: 'exact',
    pattern: '^ghar le chal$',
    capability: 'location',
    action: 'navigate',
    extract: () => ({ destination: 'home' }),
  },
  {
    id: 'hindi-alarm',
    type: 'regex',
    pattern: '^alarm laga\\s+(.+)$',
    capability: 'alarm',
    action: 'set',
    extract: (t) => ({ time: t.match(/^alarm laga\s+(.+)$/i)![1] }),
  },
  {
    id: 'call',
    type: 'regex',
    pattern: '^call\\s+(.+)$',
    capability: 'phone',
    action: 'place',
    extract: (t) => ({ target: t.match(/^call\s+(.+)$/i)![1] }),
  },
  {
    id: 'text',
    type: 'regex',
    pattern: '^(?:text|message)\\s+(\\S+)\\s+(.+)$',
    capability: 'sms',
    action: 'send',
    extract: (t) => {
      const m = t.match(/^(?:text|message)\s+(\S+)\s+(.+)$/i)!;
      return { target: m[1], message: m[2] };
    },
  },
  {
    id: 'text-short',
    type: 'regex',
    pattern: '^(?:text|message)\\s+(\\S+)$',
    capability: 'sms',
    action: 'send',
    extract: (t) => ({ target: t.match(/^(?:text|message)\s+(\S+)$/i)![1] }),
  },
  {
    id: 'alarm',
    type: 'regex',
    pattern: '^(?:set alarm|alarm)\\s+(.+)$',
    capability: 'alarm',
    action: 'set',
    extract: (t) => ({ time: t.match(/^(?:set alarm|alarm)\s+(.+)$/i)![1] }),
  },
  {
    id: 'navigate',
    type: 'regex',
    pattern: '^(?:navigate to|take me to|directions to)\\s+(.+)$',
    capability: 'location',
    action: 'navigate',
    extract: (t) => ({
      destination: t.match(/^(?:navigate to|take me to|directions to)\s+(.+)$/i)![1],
    }),
  },
  {
    id: 'toggle-on',
    type: 'regex',
    pattern: '^turn on\\s+(.+)$',
    capability: 'iot',
    action: 'toggle',
    extract: (t) => ({ device: t.match(/^turn on\s+(.+)$/i)![1], state: 'on' }),
  },
  {
    id: 'toggle-off',
    type: 'regex',
    pattern: '^turn off\\s+(.+)$',
    capability: 'iot',
    action: 'toggle',
    extract: (t) => ({ device: t.match(/^turn off\s+(.+)$/i)![1], state: 'off' }),
  },
  {
    id: 'open',
    type: 'regex',
    pattern: '^open\\s+(.+)$',
    capability: 'app',
    action: 'open',
    extract: (t) => ({ app: t.match(/^open\s+(.+)$/i)![1] }),
  },
  {
    id: 'play',
    type: 'regex',
    pattern: '^play\\s+(.+)$',
    capability: 'media',
    action: 'play',
    extract: (t) => ({ media: t.match(/^play\s+(.+)$/i)![1] }),
  },
  {
    id: 'stop',
    type: 'exact',
    pattern: '^(?:stop|pause)$',
    capability: 'media',
    action: 'pause',
    extract: () => ({}),
  },
  {
    id: 'search',
    type: 'regex',
    pattern: '^(?:search|look up)\\s+(.+)$',
    capability: 'search',
    action: 'query',
    extract: (t) => ({ query: t.match(/^(?:search|look up)\s+(.+)$/i)![1] }),
  },
  {
    id: 'remind',
    type: 'regex',
    pattern: '^remind me\\s+(.+)$',
    capability: 'reminder',
    action: 'set',
    extract: (t) => ({ task: t.match(/^remind me\s+(.+)$/i)![1] }),
  },
  {
    id: 'email',
    type: 'regex',
    pattern: '^send email to\\s+(.+)$',
    capability: 'email',
    action: 'compose',
    extract: (t) => ({ to: t.match(/^send email to\s+(.+)$/i)![1] }),
  },
  {
    id: 'check',
    type: 'regex',
    pattern: '^check\\s+(.+)$',
    capability: 'info',
    action: 'check',
    extract: (t) => ({ thing: t.match(/^check\s+(.+)$/i)![1] }),
  },
  {
    id: 'show',
    type: 'regex',
    pattern: '^show\\s+(.+)$',
    capability: 'display',
    action: 'show',
    extract: (t) => ({ thing: t.match(/^show\s+(.+)$/i)![1] }),
  },
];

export class CommandGrammar {
  match(text: string): DeviceIntent | null {
    const normalized = text.trim().toLowerCase();
    for (const p of patterns) {
      const regex = new RegExp(p.pattern, 'i');
      if (regex.test(normalized)) {
        const params = p.extract ? p.extract(normalized) : {};
        return { capability: p.capability, action: p.action, params };
      }
    }
    return null;
  }
}
