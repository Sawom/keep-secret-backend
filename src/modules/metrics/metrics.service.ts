import { Injectable } from '@nestjs/common';

interface ApiMetric {
  timestamp: number;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}

@Injectable()
export class MetricsService {
  // Keep only a bounded sample so traffic cannot grow process memory indefinitely.
  private readonly maxSamples = 1000;
  private readonly samples: ApiMetric[] = [];

  record(metric: ApiMetric): void {
    this.samples.push(metric);
    if (this.samples.length > this.maxSamples) {
      this.samples.splice(0, this.samples.length - this.maxSamples);
    }
  }

  // BACKEND: summarize recent API requests without storing request bodies, cookies, or query values.
  getSummary(hours = 24) {
    const since = Date.now() - hours * 60 * 60 * 1000;
    const recent = this.samples.filter((item) => item.timestamp >= since);
    const totalRequests = recent.length;
    const totalDuration = recent.reduce((sum, item) => sum + item.durationMs, 0);
    const errorRequests = recent.filter((item) => item.statusCode >= 500).length;

    const byEndpoint = new Map<string, { requests: number; totalDuration: number; errors: number; statuses: Record<string, number> }>();
    for (const item of recent) {
      const key = `${item.method} ${item.path}`;
      const current = byEndpoint.get(key) ?? { requests: 0, totalDuration: 0, errors: 0, statuses: {} };
      current.requests += 1;
      current.totalDuration += item.durationMs;
      if (item.statusCode >= 500) current.errors += 1;
      current.statuses[String(item.statusCode)] = (current.statuses[String(item.statusCode)] ?? 0) + 1;
      byEndpoint.set(key, current);
    }

    return {
      windowHours: hours,
      sampleCount: totalRequests,
      totalRequests,
      averageResponseTimeMs: totalRequests ? Math.round((totalDuration / totalRequests) * 100) / 100 : 0,
      errorRequests,
      errorRatePercent: totalRequests ? Math.round((errorRequests / totalRequests) * 10000) / 100 : 0,
      endpoints: [...byEndpoint.entries()]
        .map(([endpoint, data]) => ({
          endpoint,
          requests: data.requests,
          averageResponseTimeMs: Math.round((data.totalDuration / data.requests) * 100) / 100,
          errors: data.errors,
          statuses: data.statuses,
        }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 20),
      note: 'Metrics are an in-memory sample for this running backend instance; server restarts and separate serverless instances do not share history.',
    };
  }
}
