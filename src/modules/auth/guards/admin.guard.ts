import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';

interface AdminRequest extends Request {
    user?: { id: string; role?: string };
}

@Injectable()
export class AdminGuard implements CanActivate {
    // BACKEND: JWT authentication runs first; this guard then checks the DB role attached by JwtStrategy.
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<AdminRequest>();

        if (request.user?.role !== 'ADMIN') {
            throw new ForbiddenException('Admin access required');
        }

        return true;
    }
}
