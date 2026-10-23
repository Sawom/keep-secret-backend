import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { AdminService } from './admin.service.js';

// BACKEND: both guards are required; valid login alone does not grant admin access.
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /admin/health: available only to users whose current DB role is ADMIN.
  @Get('health')
  getHealthReport() {
    return this.adminService.getHealthReport();
  }
}
