import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  /**
   * [GET /users/me]
   * লগইন থাকা ইউজারের নিজের প্রোফাইল দেখাবে
   */
  @Get('me')
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.userService.getProfile(req.user.id);
  }

  /**
   * [PATCH /users/me]
   * লগইন থাকা ইউজারের নাম আপডেট করবে
   */
  @Patch('me')
  updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(req.user.id, dto);
  }
}