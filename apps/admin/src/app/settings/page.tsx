'use client';

import { Card, Button } from '@quant/shared-ui';
import { useState } from 'react';

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const initialFlags: FeatureFlag[] = [
  {
    id: 'ai_chat',
    name: 'AI Chat',
    description: 'Enable AI-powered chat assistant across apps',
    enabled: true,
  },
  {
    id: 'video_calls',
    name: 'Video Calls',
    description: 'Enable WebRTC video calling in QuantMeet',
    enabled: true,
  },
  {
    id: 'dark_mode',
    name: 'Dark Mode',
    description: 'Allow users to toggle dark mode',
    enabled: true,
  },
  {
    id: 'beta_features',
    name: 'Beta Features',
    description: 'Show beta features to opted-in users',
    enabled: false,
  },
  {
    id: 'maintenance_mode',
    name: 'Maintenance Mode',
    description: 'Put ecosystem in maintenance mode',
    enabled: false,
  },
  {
    id: 'signup_enabled',
    name: 'Public Signup',
    description: 'Allow new user registrations',
    enabled: true,
  },
];

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        enabled ? 'bg-green-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5.5 left-[1.375rem]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [flags, setFlags] = useState(initialFlags);

  const toggleFlag = (id: string) => {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Settings</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Feature flags, notifications, API keys, and ecosystem configuration
        </p>
      </div>

      {/* Feature Flags */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">Feature Flags</h2>
        <Card>
          <div className="divide-y divide-[var(--quant-border)]">
            {flags.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium text-[var(--quant-foreground)]">{flag.name}</p>
                  <p className="text-xs text-[var(--quant-muted-foreground)]">{flag.description}</p>
                </div>
                <Toggle enabled={flag.enabled} onToggle={() => toggleFlag(flag.id)} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Notification Settings */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">
          Notification Settings
        </h2>
        <Card>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--quant-foreground)]">
                  Email Notifications
                </p>
                <p className="text-xs text-[var(--quant-muted-foreground)]">
                  Receive email alerts for critical events
                </p>
              </div>
              <Toggle enabled={true} onToggle={() => {}} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--quant-foreground)]">
                  Slack Integration
                </p>
                <p className="text-xs text-[var(--quant-muted-foreground)]">
                  Post alerts to #ops-alerts channel
                </p>
              </div>
              <Toggle enabled={true} onToggle={() => {}} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--quant-foreground)]">SMS Alerts</p>
                <p className="text-xs text-[var(--quant-muted-foreground)]">
                  Send SMS for P0 incidents only
                </p>
              </div>
              <Toggle enabled={false} onToggle={() => {}} />
            </div>
          </div>
        </Card>
      </div>

      {/* API Keys */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">API Keys</h2>
        <Card>
          <div className="divide-y divide-[var(--quant-border)]">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-[var(--quant-foreground)]">Production Key</p>
                <p className="font-mono text-xs text-[var(--quant-muted-foreground)]">
                  qk_prod_****...****8f2a
                </p>
              </div>
              <Button>Rotate</Button>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-[var(--quant-foreground)]">Staging Key</p>
                <p className="font-mono text-xs text-[var(--quant-muted-foreground)]">
                  qk_stg_****...****3c1b
                </p>
              </div>
              <Button>Rotate</Button>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-[var(--quant-foreground)]">
                  Development Key
                </p>
                <p className="font-mono text-xs text-[var(--quant-muted-foreground)]">
                  qk_dev_****...****7e4d
                </p>
              </div>
              <Button>Rotate</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Ecosystem Config */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">
          Ecosystem Configuration
        </h2>
        <Card>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--quant-foreground)] mb-1">
                Ecosystem Name
              </label>
              <input
                type="text"
                defaultValue="Quant Ecosystem"
                className="w-full rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--quant-foreground)] mb-1">
                Support Email
              </label>
              <input
                type="email"
                defaultValue="support@quant.dev"
                className="w-full rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--quant-foreground)] mb-1">
                Max Users
              </label>
              <input
                type="number"
                defaultValue="100000"
                className="w-full rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>
            <Button>Save Configuration</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
