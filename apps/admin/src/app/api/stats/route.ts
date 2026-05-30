import { NextResponse } from 'next/server';

interface EcosystemStats {
  timestamp: string;
  users: {
    total: number;
    active: number;
    newToday: number;
    online: number;
  };
  requests: {
    perMinute: number;
    totalToday: number;
    avgLatency: number;
    p99Latency: number;
  };
  errors: {
    rate: number;
    totalToday: number;
    criticalCount: number;
  };
  storage: {
    totalUsed: string;
    filesCount: number;
    uploadsToday: number;
  };
}

export async function GET(): Promise<NextResponse<EcosystemStats>> {
  const stats: EcosystemStats = {
    timestamp: new Date().toISOString(),
    users: {
      total: 24891,
      active: 18432,
      newToday: 127,
      online: 1284,
    },
    requests: {
      perMinute: 8432,
      totalToday: 4250000,
      avgLatency: 45,
      p99Latency: 230,
    },
    errors: {
      rate: 0.0012,
      totalToday: 5100,
      criticalCount: 2,
    },
    storage: {
      totalUsed: '2.4 TB',
      filesCount: 456230,
      uploadsToday: 3421,
    },
  };

  return NextResponse.json(stats);
}
