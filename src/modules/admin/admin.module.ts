import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { MetricsModule } from '../metrics/metrics.module.js';

@Module({
  imports: [
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    MetricsModule,
  ],
  controllers: [
    AdminController,
  ],
  // Register the guard so NestJS can resolve it.
  providers: [
    AdminService,
    AdminGuard,
  ],
})
export class AdminModule { }