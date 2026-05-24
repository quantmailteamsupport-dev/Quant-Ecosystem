// ============================================================================
// QuantTube - Creator Studio Dashboard
// Analytics, content management, monetization overview
// ============================================================================

interface StudioPageProps {
  channelId: string;
  analytics: { views: number; watchTime: number; subscribers: number; revenue: number };
  recentVideos: { id: string; title: string; views: number; status: string }[];
  notifications: { message: string; type: string }[];
}

export function StudioPage({ channelId, analytics, recentVideos, notifications }: StudioPageProps) {
  return {
    type: 'div',
    props: { className: 'studio-page' },
    children: [
      { type: 'header', props: { className: 'studio-header' }, children: [
        { type: 'h1', props: {}, children: ['Creator Studio'] },
        { type: 'button', props: { className: 'upload-btn' }, children: ['+ Upload'] },
      ]},
      { type: 'div', props: { className: 'analytics-overview' }, children: [
        renderStatCard('Views', analytics.views, 'Last 28 days'),
        renderStatCard('Watch Time (hrs)', Math.round(analytics.watchTime / 3600), 'Last 28 days'),
        renderStatCard('Subscribers', analytics.subscribers, 'Total'),
        renderStatCard('Revenue', analytics.revenue, 'This month', true),
      ]},
      { type: 'section', props: { className: 'content-list' }, children: [
        { type: 'h2', props: {}, children: ['Recent Content'] },
        { type: 'table', props: { className: 'videos-table' }, children: [
          { type: 'thead', props: {}, children: [{ type: 'tr', props: {}, children: [{ type: 'th', props: {}, children: ['Title'] }, { type: 'th', props: {}, children: ['Views'] }, { type: 'th', props: {}, children: ['Status'] }] }] },
          { type: 'tbody', props: {}, children: recentVideos.map(v => ({ type: 'tr', props: {}, children: [{ type: 'td', props: {}, children: [v.title] }, { type: 'td', props: {}, children: [String(v.views)] }, { type: 'td', props: {}, children: [v.status] }] })) },
        ]},
      ]},
      { type: 'section', props: { className: 'notifications' }, children: [
        { type: 'h2', props: {}, children: ['Notifications'] },
        { type: 'ul', props: {}, children: notifications.map(n => ({ type: 'li', props: { className: `notif-${n.type}` }, children: [n.message] })) },
      ]},
    ],
  };
}

function renderStatCard(label: string, value: number, period: string, isCurrency?: boolean) {
  return { type: 'div', props: { className: 'stat-card' }, children: [{ type: 'h3', props: {}, children: [label] }, { type: 'p', props: { className: 'stat-value' }, children: [isCurrency ? `$${value.toFixed(2)}` : formatNumber(value)] }, { type: 'span', props: { className: 'stat-period' }, children: [period] }] };
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export default StudioPage;
