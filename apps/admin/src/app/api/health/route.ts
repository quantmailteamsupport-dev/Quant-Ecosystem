import { NextResponse } from 'next/server';

interface AppHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  port: number;
  uptime: number;
  lastCheck: string;
}

interface ServiceHealth {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  lastRestart: string;
}

interface HealthResponse {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'down';
  apps: AppHealth[];
  services: ServiceHealth[];
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const apps: AppHealth[] = [
    {
      name: 'QuantMail',
      status: 'healthy',
      port: 3000,
      uptime: 99.99,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantChat',
      status: 'healthy',
      port: 3001,
      uptime: 99.98,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantDrive',
      status: 'healthy',
      port: 3002,
      uptime: 99.97,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantCalendar',
      status: 'healthy',
      port: 3003,
      uptime: 99.99,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantMeet',
      status: 'healthy',
      port: 3004,
      uptime: 99.95,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantNotes',
      status: 'healthy',
      port: 3005,
      uptime: 99.99,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantTasks',
      status: 'healthy',
      port: 3006,
      uptime: 99.98,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantCode',
      status: 'degraded',
      port: 3007,
      uptime: 98.5,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantCI',
      status: 'healthy',
      port: 3008,
      uptime: 99.9,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantSocial',
      status: 'healthy',
      port: 3009,
      uptime: 99.96,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantAI',
      status: 'healthy',
      port: 3010,
      uptime: 99.97,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantPay',
      status: 'healthy',
      port: 3011,
      uptime: 99.99,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantGames',
      status: 'healthy',
      port: 3012,
      uptime: 99.94,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantForms',
      status: 'healthy',
      port: 3013,
      uptime: 99.98,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantAnalytics',
      status: 'healthy',
      port: 3014,
      uptime: 99.97,
      lastCheck: new Date().toISOString(),
    },
    {
      name: 'QuantAdmin',
      status: 'healthy',
      port: 3100,
      uptime: 99.99,
      lastCheck: new Date().toISOString(),
    },
  ];

  const services: ServiceHealth[] = [
    { name: 'ws-gateway', status: 'running', uptime: 99.98, lastRestart: '2024-01-10T03:00:00Z' },
    { name: 'smtp-inbound', status: 'running', uptime: 99.95, lastRestart: '2024-01-12T06:00:00Z' },
    { name: 'cdc-relay', status: 'running', uptime: 99.99, lastRestart: '2024-01-08T02:00:00Z' },
    { name: 'ci-runner', status: 'running', uptime: 99.9, lastRestart: '2024-01-14T12:00:00Z' },
    { name: 'git-server', status: 'running', uptime: 99.99, lastRestart: '2024-01-05T04:00:00Z' },
    { name: 'matchmaking', status: 'running', uptime: 99.92, lastRestart: '2024-01-13T08:00:00Z' },
    {
      name: 'moderation-worker',
      status: 'running',
      uptime: 99.96,
      lastRestart: '2024-01-11T10:00:00Z',
    },
    {
      name: 'search-indexer',
      status: 'running',
      uptime: 99.97,
      lastRestart: '2024-01-09T05:00:00Z',
    },
  ];

  const hasDegraded = apps.some((a) => a.status === 'degraded');
  const hasDown = apps.some((a) => a.status === 'down');

  const response: HealthResponse = {
    timestamp: new Date().toISOString(),
    overall: hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy',
    apps,
    services,
  };

  return NextResponse.json(response);
}
