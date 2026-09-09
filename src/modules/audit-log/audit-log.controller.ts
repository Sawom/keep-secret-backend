import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service.js';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) { }

  /**
   * [GET /audit-logs]
   * ইউজারের নিজের সব সিকিউরিটি অ্যাক্টিভিটি লগ নিয়ে আসবে।
   */
  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: number,
  ) {
    return this.auditLogService.findAllByUser(req.user.id, limit ?? 50);
  }
}