'use client';

import { Card, Badge } from '@quant/shared-ui';

interface TableInfo {
  name: string;
  rowCount: string;
  size: string;
}

interface SlowQuery {
  query: string;
  avgDuration: string;
  calls: number;
}

const tables: TableInfo[] = [
  { name: 'users', rowCount: '24,891', size: '128 MB' },
  { name: 'messages', rowCount: '1,245,670', size: '2.1 GB' },
  { name: 'files', rowCount: '456,230', size: '890 MB' },
  { name: 'sessions', rowCount: '8,432', size: '45 MB' },
  { name: 'notifications', rowCount: '890,120', size: '456 MB' },
  { name: 'audit_logs', rowCount: '2,340,000', size: '1.8 GB' },
  { name: 'api_keys', rowCount: '1,205', size: '12 MB' },
  { name: 'workspaces', rowCount: '3,456', size: '28 MB' },
];

const slowQueries: SlowQuery[] = [
  { query: 'SELECT * FROM messages WHERE ...', avgDuration: '245ms', calls: 1200 },
  { query: 'JOIN users ON ... WHERE role IN ...', avgDuration: '189ms', calls: 890 },
  { query: 'SELECT COUNT(*) FROM audit_logs ...', avgDuration: '156ms', calls: 450 },
];

export default function DatabasePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Database</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Connection pool, migrations, and table overview
        </p>
      </div>

      {/* Connection Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Pool Size</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">20/50</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Active Connections</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">14</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Idle Connections</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">6</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--quant-muted-foreground)]">Total DB Size</p>
            <p className="mt-2 text-2xl font-bold text-[var(--quant-foreground)]">5.4 GB</p>
          </div>
        </Card>
      </div>

      {/* Migration Status */}
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--quant-foreground)]">Migration Status</h3>
            <Badge variant="default">Up to date</Badge>
          </div>
          <div className="mt-3 text-sm text-[var(--quant-muted-foreground)]">
            <p>Latest: 20240115_add_workspace_settings</p>
            <p>Pending migrations: 0</p>
            <p>Total applied: 47</p>
          </div>
        </div>
      </Card>

      {/* Tables */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">
          Table Overview
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--quant-border)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Table
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Row Count
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Size
                  </th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => (
                  <tr
                    key={table.name}
                    className="border-b border-[var(--quant-border)] last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-[var(--quant-foreground)]">
                      {table.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                      {table.rowCount}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">{table.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Slow Queries */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--quant-foreground)] mb-4">Slow Queries</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--quant-border)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Query
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Avg Duration
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                    Calls
                  </th>
                </tr>
              </thead>
              <tbody>
                {slowQueries.map((q, i) => (
                  <tr key={i} className="border-b border-[var(--quant-border)] last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--quant-foreground)]">
                      {q.query}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                      {q.avgDuration}
                    </td>
                    <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">{q.calls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
