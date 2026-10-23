import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MetricsService } from '../metrics/metrics.service.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  // BACKEND: aggregate counts from the actual Prisma schema plus the recent API performance sample.
  async getHealthReport() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      newUsersLast7Days,
      activeNotes,
      trashedNotes,
      activeNotebooks,
      trashedNotebooks,
      auditEventsLast7Days,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.note.count({ where: { isDeleted: false } }),
      this.prisma.note.count({ where: { isDeleted: true } }),
      this.prisma.notebook.count({ where: { isDeleted: false } }),
      this.prisma.notebook.count({ where: { isDeleted: true } }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    return {
      generatedAt: now.toISOString(),
      counts: {
        totalUsers,
        newUsersToday,
        newUsersLast7Days,
        activeNotes,
        trashedNotes,
        activeNotebooks,
        trashedNotebooks,
        auditEventsLast7Days,
      },
      api: this.metricsService.getSummary(24),
    };
  }
}
