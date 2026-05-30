import { NextResponse } from 'next/server';

export async function GET() {
  const data = {
    pool: {
      size: 20,
      maxSize: 50,
      active: 14,
      idle: 6,
      waitQueue: 0,
    },
    totalSize: '5.4 GB',
    tables: [
      { name: 'users', rowCount: '24,891', size: '128 MB' },
      { name: 'messages', rowCount: '1,245,670', size: '2.1 GB' },
      { name: 'files', rowCount: '456,230', size: '890 MB' },
      { name: 'sessions', rowCount: '8,432', size: '45 MB' },
      { name: 'notifications', rowCount: '890,120', size: '456 MB' },
      { name: 'audit_logs', rowCount: '2,340,000', size: '1.8 GB' },
      { name: 'api_keys', rowCount: '1,205', size: '12 MB' },
      { name: 'workspaces', rowCount: '3,456', size: '28 MB' },
    ],
    slowQueries: [
      { query: 'SELECT * FROM messages WHERE ...', avgDuration: '245ms', calls: 1200 },
      { query: 'JOIN users ON ... WHERE role IN ...', avgDuration: '189ms', calls: 890 },
      { query: 'SELECT COUNT(*) FROM audit_logs ...', avgDuration: '156ms', calls: 450 },
    ],
    migrations: {
      latest: '20240115_add_workspace_settings',
      pending: 0,
      totalApplied: 47,
    },
  };

  return NextResponse.json({ success: true, data });
}
