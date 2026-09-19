import {
    Controller,
    Delete,
    Get,
    Req,
    UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { TrashService } from './trash.service.js';
import { JwtAuthGuard } from './../modules/auth/guards/jwt-auth.guard.js';

interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        email: string;
    };
}

@UseGuards(JwtAuthGuard)
@Controller('trash')
export class TrashController {
    constructor(
        private readonly trashService: TrashService,
    ) {}

    /**
     * [GET /trash]
     * User-এর সব trashed notes এবং notebooks দেখাবে।
     */
    @Get()
    getTrash(@Req() req: AuthenticatedRequest) {
        return this.trashService.getTrash(req.user.id);
    }

    /**
     * [DELETE /trash/empty]
     * User-এর সব trashed notes এবং notebooks permanently delete করবে।
     */
    @Delete('empty')
    emptyTrash(@Req() req: AuthenticatedRequest) {
        return this.trashService.emptyTrash(req.user.id);
    }
}