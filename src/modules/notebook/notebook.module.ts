import { Module } from '@nestjs/common';
import { NotebookService } from './notebook.service';
import { NotebookController } from './notebook.controller';
import { PrismaModule } from './../prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AuthService } from '../auth/auth.service';
import { AuthController } from '../auth/auth.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

/**
 * NotebookModule: নোটবুক সম্পর্কিত Controller, Service এবং Prisma Dependency একসাথে যুক্ত করে।
 */

@Module({
  imports: [
    PrismaModule,
    AuditLogModule, // inject auditlog
    PassportModule.register({ defaultStrategy: 'jwt' }), // <--- imports-এ PassportModule থাকতে হবে
  ],
  controllers: [NotebookController],
  providers: [NotebookService],
  exports: [NotebookService],
})

export class NotebookModule { }