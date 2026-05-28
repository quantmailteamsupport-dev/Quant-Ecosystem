export type ExportFormat =
  | 'markdown'
  | 'ics'
  | 'vcard'
  | 'mbox'
  | 'opml'
  | 'json'
  | 'csv'
  | 'parquet';
export interface DataQuery {
  id: string;
  naturalLanguage: string;
  parsed: ParsedQuery | null;
}
export interface ParsedQuery {
  metric: string;
  period: string;
  intent: QueryIntent;
  filters: QueryFilter[];
  timeRange: TimeRange | null;
}
export type QueryIntent = 'count' | 'sum' | 'avg' | 'max' | 'min' | 'list';
export interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'contains';
  value: string;
}
export interface TimeRange {
  start: number;
  end: number;
}
export interface QueryResult {
  queryId: string;
  data: unknown[];
  summary: string;
  executedAt: number;
}
export interface DataExport {
  id: string;
  format: ExportFormat;
  appId: string | null;
  status: 'pending' | 'ready' | 'expired';
  createdAt: number;
  sizeBytes: number | null;
}
export interface DataResidency {
  recordId: string;
  region: string;
  shard: string;
  encrypted: boolean;
  movedAt: number | null;
}
export interface StorageRegion {
  id: string;
  name: string;
  country: string;
  available: boolean;
}

export interface SelectQuery {
  intent: QueryIntent;
  metric: string;
  filters: QueryFilter[];
  timeRange: TimeRange | null;
  groupBy?: string;
}

export interface TimeSeriesPoint {
  timestamp: number;
  app: string;
  action: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface DataInspectorResult {
  userId: string;
  locations: DataLocation[];
  totalSize: number;
  oldestRecord: number;
  newestRecord: number;
}

export interface DataLocation {
  region: string;
  shard: string;
  recordCount: number;
  sizeBytes: number;
  encrypted: boolean;
  retentionDays: number;
}

export interface ColumnSchema {
  name: string;
  type: 'string' | 'number' | 'timestamp' | 'boolean';
  nullable: boolean;
}
