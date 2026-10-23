import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { MetricsModule } from '../metrics/metrics.module.js';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), MetricsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
